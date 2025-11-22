import * as vscode from 'vscode';
import * as os from 'os';
import { ZedinArkAPI } from './api';
import { LocalOllamaAPI } from './localOllamaAPI';

interface Model {
    id: string;
    name: string;
    provider: string;
}

interface TodoItem {
    id: string;
    task: string;
    priority: 'high' | 'medium' | 'low';
    completed: boolean;
}

export class SidebarChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'zedinarkChatView';
    private _view?: vscode.WebviewView;
    private api: ZedinArkAPI;
    private localOllama?: LocalOllamaAPI;
    private useLocalOllama: boolean = false;
    private useHybridMode: boolean = false; // Mindkét erőforrást használja
    private useParallelMode: boolean = false; // Párhuzamos erőforrás használat
    private currentModel: string = 'default';
    private availableModels: string[] = [];
    private localModels: string[] = [];
    private remoteModels: string[] = [];
    private conversationHistory: Array<{role: string, content: string}> = [];
    private requestCounter: number = 0; // Load balancing számoló

    constructor(
        private readonly _extensionUri: vscode.Uri,
        api: ZedinArkAPI
    ) {
        this.api = api;
        this.initializeLocalOllama();
        this.loadModels();
    }

    private async initializeLocalOllama() {
        const config = vscode.workspace.getConfiguration('zedinark');
        const useLocal = config.get<boolean>('useLocalOllama', false);
        const useHybrid = config.get<boolean>('useHybridMode', true); // Alapértelmezetten hibrid mód
        const useParallel = config.get<boolean>('useParallelMode', false); // Párhuzamos mód
        const localOllamaUrl = config.get<string>('localOllamaUrl', 'http://localhost:11434');
        
        this.useHybridMode = useHybrid;
        this.useParallelMode = useParallel;
        
        // Mindig inicializáljuk a lokális Ollama-t, ha elérhető
        this.localOllama = new LocalOllamaAPI(localOllamaUrl);
        const isAvailable = await this.localOllama.checkConnection();
        
        if (isAvailable) {
            this.useLocalOllama = true;
            console.log('Local Ollama API available');
            
            // Automatikus regisztráció a distributed network-be
            await this.registerLocalNode();
            } else {
            console.warn('Local Ollama not available');
            this.useLocalOllama = false;
        }
        
        if (this.useParallelMode && this.useLocalOllama) {
            console.log('Parallel mode enabled: using both resources simultaneously for each request');
        } else if (this.useHybridMode && this.useLocalOllama) {
            console.log('Hybrid mode enabled: load balancing between local GPU and remote server');
        }
    }
    
    /**
     * Publikus IP cím lekérése külső szolgáltatástól
     * Fontos: ha a szerver és kliens különböző hálózatokban van (pl. Helsinki vs Magyarország),
     * akkor a publikus IP-t kell használni, nem a privát IP-t
     */
    private async detectPublicIP(): Promise<string | null> {
        try {
            console.log('🌐 Detecting public IP address...');
            
            // Több szolgáltatást próbálunk, ha az egyik nem elérhető
            const ipServices = [
                'https://api.ipify.org?format=json',
                'https://ifconfig.me/ip',
                'https://icanhazip.com',
                'https://api.ip.sb/ip'
            ];
            
            for (const serviceUrl of ipServices) {
                try {
                    const response = await fetch(serviceUrl, { 
                        method: 'GET',
                        headers: { 'Accept': 'application/json, text/plain' },
                        signal: AbortSignal.timeout(5000) // 5 másodperc timeout
                    });
                    
                    let ip: string;
                    if (serviceUrl.includes('ipify.org')) {
                        const data = await response.json();
                        ip = data.ip;
                    } else {
                        ip = (await response.text()).trim();
                    }
                    
                    // Validáljuk, hogy valódi IP cím-e
                    if (ip && /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
                        console.log(`✅ Public IP detected: ${ip} (from ${serviceUrl})`);
                        return ip;
                    }
                } catch (error) {
                    console.warn(`⚠️ Failed to get IP from ${serviceUrl}:`, error);
                    continue;
                }
            }
            
            console.warn('⚠️ Could not detect public IP from any service');
            return null;
        } catch (error) {
            console.error('❌ Public IP detection error:', error);
            return null;
        }
    }
    
    /**
     * Lokális IP cím detektálása (fallback, ha publikus IP nem elérhető)
     */
    private detectLocalIP(): string | null {
        try {
            const networkInterfaces = os.networkInterfaces();
            for (const interfaceName in networkInterfaces) {
                const addresses = networkInterfaces[interfaceName];
                if (addresses) {
                    for (const addr of addresses) {
                        // IPv4, nem localhost, nem internal
                        if (addr.family === 'IPv4' && !addr.internal && addr.address !== '127.0.0.1') {
                            console.log(`📡 Found local IP: ${addr.address} on interface ${interfaceName}`);
                            return addr.address;
                        }
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('IP detection error:', error);
            return null;
        }
    }
    
    /**
     * Helyi gép regisztrálása a distributed network-be
     */
    private async registerLocalNode() {
        try {
            if (!this.localOllama) {
                console.warn('⚠️ Cannot register local node: localOllama not initialized');
                return;
            }
            
            console.log('🔍 Registering local compute node...');
            
            const config = vscode.workspace.getConfiguration('zedinark');
            let localOllamaUrl = config.get<string>('localOllamaUrl', 'http://localhost:11434');
            
            // FONTOS: Ha localhost vagy privát IP van, akkor a szerver nem fogja tudni elérni a kliens gépet
            // Különösen, ha a szerver és kliens különböző hálózatokban van (pl. Helsinki vs Magyarország)
            // Automatikus publikus IP detektálás
            if (localOllamaUrl.includes('localhost') || localOllamaUrl.includes('127.0.0.1') || 
                localOllamaUrl.includes('192.168.') || localOllamaUrl.includes('10.') || 
                localOllamaUrl.includes('172.16.') || localOllamaUrl.includes('172.17.') ||
                localOllamaUrl.includes('172.18.') || localOllamaUrl.includes('172.19.') ||
                localOllamaUrl.includes('172.20.') || localOllamaUrl.includes('172.21.') ||
                localOllamaUrl.includes('172.22.') || localOllamaUrl.includes('172.23.') ||
                localOllamaUrl.includes('172.24.') || localOllamaUrl.includes('172.25.') ||
                localOllamaUrl.includes('172.26.') || localOllamaUrl.includes('172.27.') ||
                localOllamaUrl.includes('172.28.') || localOllamaUrl.includes('172.29.') ||
                localOllamaUrl.includes('172.30.') || localOllamaUrl.includes('172.31.')) {
                
                console.log('🔍 Detecting public IP address for distributed computing...');
                console.log('   (Server and client are in different networks, public IP required)');
                
                try {
                    // Először próbáljuk meg a publikus IP-t
                    const publicIP = await this.detectPublicIP();
                    if (publicIP) {
                        // Cseréljük le a localhost/privát IP-t a publikus IP-re
                        const urlParts = localOllamaUrl.split(':');
                        if (urlParts.length >= 2) {
                            const port = urlParts[urlParts.length - 1]; // Port (pl. 11434)
                            localOllamaUrl = `http://${publicIP}:${port}`;
                            console.log(`✅ Using public IP: ${localOllamaUrl}`);
                        } else {
                            localOllamaUrl = `http://${publicIP}:11434`;
                            console.log(`✅ Using public IP: ${localOllamaUrl}`);
                        }
                    } else {
                        // Fallback: lokális IP (csak akkor működik, ha ugyanazon a hálózaton vannak)
                        const localIP = this.detectLocalIP();
                        if (localIP) {
                            localOllamaUrl = localOllamaUrl.replace('localhost', localIP).replace('127.0.0.1', localIP);
                            console.warn(`⚠️ Using local IP (may not work if server is remote): ${localOllamaUrl}`);
                            console.warn('   Consider setting zedinark.localOllamaUrl to your public IP address manually.');
                        } else {
                            console.error('❌ Could not detect any IP address. Server will not be able to access your local Ollama.');
                            console.error('   Please set zedinark.localOllamaUrl to your public IP address manually.');
                        }
                    }
                } catch (error) {
                    console.error('❌ IP detection failed:', error);
                }
            }
            
            // Modellek lekérése
            const models = await this.localOllama.listModels();
            console.log(`📦 Found ${models.length} local models: ${models.join(', ')}`);
            
            // Gépadatok gyűjtése
            const hostname = os.hostname();
            const platform = os.platform();
            const arch = os.arch();
            const cpus = os.cpus();
            const cpuCores = cpus.length;
            
            // GPU detektálás (Windows: nvidia-smi, ha elérhető)
            let gpuCount = 0;
            let gpuMemory = 0;
            try {
                // Próbáljuk meg detektálni a GPU-t (Windows-on nvidia-smi)
                // Ez csak akkor működik, ha a PATH-ban van az nvidia-smi
                // TODO: jobb GPU detektálás implementálása
            } catch (e) {
                // GPU detektálás nem sikerült, marad 0
            }
            
            // Node ID generálása
            const nodeId = `user-${hostname}-${platform}`;
            const nodeName = `${hostname} (${platform} ${arch})`;
            
            console.log(`📝 Registering node: ${nodeId} (${nodeName})`);
            console.log(`   - Ollama URL: ${localOllamaUrl}`);
            console.log(`   - CPU cores: ${cpuCores}`);
            console.log(`   - GPU: ${gpuCount} (${gpuMemory} MB)`);
            
            // Regisztrálás
            const result = await this.api.registerComputeNode(
                nodeId,
                'user',
                nodeName,
                localOllamaUrl,
                gpuCount,
                gpuMemory,
                cpuCores
            );
            
            console.log(`✅ Local compute node registered successfully: ${nodeId}`);
            console.log(`   Result:`, result);
            
            // Értesítés a felhasználónak
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'feedback',
                    type: 'success',
                    content: `✅ Helyi gép regisztrálva: ${nodeName}`
                });
            }
                    } catch (error: any) {
            console.error('❌ Failed to register local node:', error);
            console.error('   Error details:', error.message, error.stack);
            
            // Hibajelzés a felhasználónak
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'feedback',
                    type: 'error',
                    content: `❌ Helyi gép regisztrálása sikertelen: ${error.message}`
                });
            }
        }
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'sendMessage':
                    await this.handleMessage(message.text, message.model);
                    break;
                case 'loadModels':
                    await this.loadModels();
                    break;
                case 'switchModel':
                    this.currentModel = message.model;
                    this.updateModel();
                    break;
                case 'clearChat':
                    this.conversationHistory = [];
                    this._view?.webview.postMessage({ command: 'chatCleared' });
                    break;
            }
        });
    }

    private async loadModels() {
        try {
            const allModels: Array<{id: string, name: string, provider: string}> = [];
            
            // Lokális modellek betöltése
            if (this.useLocalOllama && this.localOllama) {
                try {
                    this.localModels = await this.localOllama.listModels();
                    this.localModels.forEach(model => {
                        allModels.push({ id: model, name: model, provider: 'local-gpu' });
                    });
                    } catch (error: any) {
                    console.warn('Failed to load local models:', error);
                    this.localModels = [];
                }
            }
            
            // Távoli modellek betöltése
            try {
                this.remoteModels = await this.api.listModels();
                this.remoteModels.forEach(model => {
                    // Ha már nincs benne (duplikáció elkerülése)
                    if (!allModels.find(m => m.id === model)) {
                        allModels.push({ id: model, name: model, provider: 'remote-server' });
                    }
                });
                    } catch (error: any) {
                console.warn('Failed to load remote models:', error);
                this.remoteModels = [];
            }
            
            // Összes modell egyesítése
            this.availableModels = allModels.map(m => m.id);
            
            // Ha van modell és még nincs kiválasztva, vagy 'default' a jelenlegi
            if (this.availableModels.length > 0) {
                if (this.currentModel === 'default' || !this.availableModels.includes(this.currentModel)) {
                    this.currentModel = this.availableModels[0];
                }
            } else {
                // Ha nincs modell, töröljük a 'default' értéket
                this.currentModel = '';
            }

            if (this._view) {
            this._view.webview.postMessage({
                    command: 'modelsLoaded',
                    models: allModels,
                    currentModel: this.currentModel
                });
            }
        } catch (error: any) {
            console.error('Failed to load models:', error);
            this.availableModels = [];
            this.currentModel = '';
            if (this._view) {
            this._view.webview.postMessage({
                command: 'error',
                    error: 'Nem sikerült betölteni a modelleket: ' + error.message
            });
            this._view.webview.postMessage({
                    command: 'modelsLoaded',
                    models: [],
                    currentModel: ''
                });
            }
        }
    }

    private updateModel() {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'modelChanged',
                model: this.currentModel
            });
        }
    }

    private async handleMessage(text: string, model?: string) {
        if (!this._view) return;

        // Ellenőrizzük, hogy van-e érvényes modell
        const selectedModel = model || this.currentModel;
        
        // Ha nincs modell vagy 'default' a modell és nincs elérhető modell
        if (!selectedModel || selectedModel === 'default' || this.availableModels.length === 0) {
            this._view.webview.postMessage({
                command: 'error',
                error: 'Nincs modell kiválasztva. Kérlek válassz egy modellt a legördülő menüből, vagy várj a modellek betöltésére.'
            });
            return;
        }

        // Ellenőrizzük, hogy a kiválasztott modell létezik-e
        if (!this.availableModels.includes(selectedModel)) {
            this._view.webview.postMessage({
                command: 'error',
                error: `A kiválasztott modell (${selectedModel}) nem elérhető. Kérlek válassz egy másik modellt.`
            });
            return;
        }

        try {
            this._view.webview.postMessage({
                command: 'loading',
                loading: true
            });

            // Hozzáadjuk a felhasználó üzenetét a történethez
            this.conversationHistory.push({ role: 'user', content: text });

            // MINDIG a szervernek küldjük a kérést, hogy a distributed computing használhassa mindkét erőforrást párhuzamosan
            // A szerver oldali distributed computing automatikusan elosztja a kérést minden elérhető csomópontra
            // (szerver + helyi gép) párhuzamosan
            let response: string;
            
            // Távoli API használata - MINDIG distributed computing-et használ, ha elérhető
            // A szerver automatikusan elosztja a kérést minden elérhető csomópontra párhuzamosan
            // (szerver node + regisztrált kliens node-ok)
            response = await this.api.chatWithHistory(this.conversationHistory, selectedModel);
            console.log('✅ Response from distributed computing (server + local GPU in parallel)');

            // Hozzáadjuk az AI válaszát a történethez
            this.conversationHistory.push({ role: 'assistant', content: response });

            // Parsoljuk a választ és küldjük a különböző komponenseknek
            this.parseAndDisplayResponse(response);

        } catch (error: any) {
            // Ha hiba történt, távolítsuk el a felhasználó üzenetét a történetből
            if (this.conversationHistory.length > 0 && this.conversationHistory[this.conversationHistory.length - 1].role === 'user') {
                this.conversationHistory.pop();
            }
            
            this._view.webview.postMessage({
                command: 'error',
                error: error.message
            });
        } finally {
            this._view.webview.postMessage({
                command: 'loading',
                loading: false
            });
        }
    }

    /**
     * Párhuzamos kérés kezelése: mindkét erőforrást egyszerre használja
     * Visszaadja a kombinált vagy a legjobb választ
     */
    private async handleParallelRequest(model: string): Promise<string> {
        console.log('Parallel mode: sending request to both resources simultaneously');
        
        // Párhuzamos kérések indítása
        const [localResponse, remoteResponse] = await Promise.allSettled([
            this.localOllama!.chatWithHistory(this.conversationHistory, model),
            this.api.chatWithHistory(this.conversationHistory, model)
        ]);
        
        const localSuccess = localResponse.status === 'fulfilled';
        const remoteSuccess = remoteResponse.status === 'fulfilled';
        
        const localResult: string | null = localSuccess ? (localResponse.value as string) : null;
        const remoteResult: string | null = remoteSuccess ? (remoteResponse.value as string) : null;
        
        // Válasz kombinálása vagy választása
        if (localSuccess && remoteSuccess && localResult && remoteResult) {
            // Mindkét válasz sikeres - kombináljuk
            console.log('Both responses received, combining results');
            
            // Válasz hossz alapján döntés (hosszabb válasz = részletesebb)
            if (localResult.length > remoteResult.length * 1.2) {
                // Lokális válasz jelentősen hosszabb
                if (this._view) {
            this._view.webview.postMessage({
                        command: 'feedback',
                        type: 'info',
                        content: 'Párhuzamos válasz: lokális GPU válasza használva (részletesebb)'
                    });
                }
                return localResult;
            } else if (remoteResult.length > localResult.length * 1.2) {
                // Távoli válasz jelentősen hosszabb
                if (this._view) {
            this._view.webview.postMessage({
                        command: 'feedback',
                        type: 'info',
                        content: 'Párhuzamos válasz: távoli szerver válasza használva (részletesebb)'
                    });
                }
                return remoteResult;
        } else {
                // Hasonló hosszúság - kombináljuk
                const combined = this.combineResponses(localResult, remoteResult);
                if (this._view) {
                    this._view.webview.postMessage({
                        command: 'feedback',
                        type: 'success',
                        content: 'Párhuzamos válasz: mindkét erőforrás válasza kombinálva'
                    });
                }
                return combined;
            }
        } else if (localSuccess && localResult) {
            // Csak lokális válasz sikeres
            console.log('Only local response received');
            if (this._view) {
            this._view.webview.postMessage({
                    command: 'feedback',
                    type: 'warning',
                    content: 'Párhuzamos válasz: csak lokális GPU válasza érkezett'
                });
            }
            return localResult;
        } else if (remoteSuccess && remoteResult) {
            // Csak távoli válasz sikeres
            console.log('Only remote response received');
            if (this._view) {
            this._view.webview.postMessage({
                    command: 'feedback',
                    type: 'warning',
                    content: 'Párhuzamos válasz: csak távoli szerver válasza érkezett'
                });
            }
            return remoteResult;
        } else {
            // Mindkét válasz sikertelen
            const localError = localResponse.status === 'rejected' ? String(localResponse.reason) : 'Unknown error';
            const remoteError = remoteResponse.status === 'rejected' ? String(remoteResponse.reason) : 'Unknown error';
            throw new Error(`Both requests failed. Local: ${localError}, Remote: ${remoteError}`);
        }
    }

    /**
     * Két válasz kombinálása intelligensen
     */
    private combineResponses(localResponse: string, remoteResponse: string): string {
        // Ha a válaszok megegyeznek, csak egyet adunk vissza
        if (localResponse.trim() === remoteResponse.trim()) {
            return localResponse;
        }
        
        // Ha a válaszok eltérnek, kombináljuk
        // Először a lokális válasz (általában részletesebb GPU-val)
        // Aztán a távoli válasz kiegészítései
        
        // Egyszerű kombinálás: lokális válasz + távoli kiegészítések
        let combined = localResponse;
        
        // Ha a távoli válasz tartalmaz új információkat
        const localWords = new Set(localResponse.toLowerCase().split(/\s+/));
        const remoteWords = remoteResponse.toLowerCase().split(/\s+/);
        const newWords = remoteWords.filter(word => word.length > 3 && !localWords.has(word));
        
        if (newWords.length > 5) {
            // Van jelentős új információ a távoli válaszban
            combined += '\n\n--- További információ a távoli szerverről ---\n\n';
            combined += remoteResponse;
        }
        
        return combined;
    }

    /**
     * Intelligens döntés: melyik erőforrást használja
     * - Ha hibrid mód be van kapcsolva: váltakozva használja mindkettőt (load balancing)
     * - Ha a modell lokálisan elérhető: lokális GPU-t használ
     * - Ha csak távoli: távoli szervert használ
     */
    private shouldUseLocal(model: string): boolean {
        const config = vscode.workspace.getConfiguration('zedinark');
        const useLocalOnly = config.get<boolean>('useLocalOllama', false);
        
        // Ha csak lokális mód be van kapcsolva
        if (useLocalOnly) {
            return this.localModels.includes(model);
        }
        
        // Hibrid mód: intelligens választás
        if (this.useHybridMode && this.useLocalOllama) {
            // Ha a modell lokálisan elérhető, akkor lokális GPU-t használ
            if (this.localModels.includes(model)) {
                // Load balancing: váltakozva használja (70% lokális, 30% távoli)
                this.requestCounter++;
                return (this.requestCounter % 10) < 7; // 7/10 esetben lokális
            }
        }
        
        // Alapértelmezett: távoli szerver
        return false;
    }

    private parseAndDisplayResponse(response: string) {
        if (!this._view) return;
        const view = this._view;

        // Thinking/Reflection kinyerése
        const thinkingMatch = response.match(/<thinking>([\s\S]*?)<\/thinking>/i);
        if (thinkingMatch) {
            view.webview.postMessage({
                command: 'thinking',
                content: thinkingMatch[1].trim()
            });
        }

        // Plan kinyerése
        const planMatch = response.match(/<plan>([\s\S]*?)<\/plan>/i);
        if (planMatch) {
            view.webview.postMessage({
                command: 'plan',
                content: planMatch[1].trim()
            });
        }

        // Todo lista kinyerése
        const todoMatch = response.match(/<todo>([\s\S]*?)<\/todo>/i);
        if (todoMatch) {
            const todoText = todoMatch[1].trim();
            const todos = this.parseTodoList(todoText);
            if (todos.length > 0) {
                view.webview.postMessage({
                    command: 'todoList',
                    todos: todos
            });
        }
    }

        // Code snippets kinyerése
        const codeBlocks = response.match(/```(\w+)?\n?([\s\S]*?)```/g);
        if (codeBlocks) {
            codeBlocks.forEach(block => {
                const match = block.match(/```(\w+)?\n?([\s\S]*?)```/);
                if (match) {
                    const language = match[1] || 'text';
                    const code = match[2].trim();
                    view.webview.postMessage({
                        command: 'codeSnippet',
                        code: code,
                        language: language
                    });
                }
            });
        }

        // Feedback kinyerése
        const feedbackMatches = response.match(/<feedback type="(\w+)">([\s\S]*?)<\/feedback>/gi);
        if (feedbackMatches) {
            feedbackMatches.forEach(feedback => {
                const match = feedback.match(/<feedback type="(\w+)">([\s\S]*?)<\/feedback>/i);
                if (match) {
                    const type = match[1] as 'info' | 'success' | 'warning' | 'error';
                    const content = match[2].trim();
                    view.webview.postMessage({
                        command: 'feedback',
                        type: type,
                content: content
            });
                }
            });
        }

        // Végül a teljes válasz megjelenítése (thinking, plan, todo, feedback nélkül)
        let cleanResponse = response
            .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
            .replace(/<plan>[\s\S]*?<\/plan>/gi, '')
            .replace(/<todo>[\s\S]*?<\/todo>/gi, '')
            .replace(/<feedback[^>]*>[\s\S]*?<\/feedback>/gi, '')
            .trim();

        if (cleanResponse) {
            view.webview.postMessage({
                command: 'receiveMessage',
                response: cleanResponse
            });
        }
    }

    private parseTodoList(todoText: string): TodoItem[] {
        const todos: TodoItem[] = [];
        const lines = todoText.split('\n').filter(line => line.trim());
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (trimmed) {
                // Priorítás detektálása
                let priority: 'high' | 'medium' | 'low' = 'medium';
                if (trimmed.toLowerCase().includes('[high]') || trimmed.toLowerCase().includes('!!!')) {
                    priority = 'high';
                } else if (trimmed.toLowerCase().includes('[low]') || trimmed.toLowerCase().includes('?')) {
                    priority = 'low';
                }

                // Completed detektálása
                const completed = trimmed.startsWith('[x]') || trimmed.startsWith('[X]') || trimmed.startsWith('✓');

                // Task szöveg tisztítása
                let task = trimmed
                    .replace(/^[-*]\s*/, '')
                    .replace(/^\[x\]\s*/i, '')
                    .replace(/^\[X\]\s*/, '')
                    .replace(/^✓\s*/, '')
                    .replace(/\[high\]/gi, '')
                    .replace(/\[medium\]/gi, '')
                    .replace(/\[low\]/gi, '')
                    .replace(/!!!/, '')
                    .replace(/\?/, '')
                    .trim();

                todos.push({
                    id: `todo-${index}`,
                    task: task,
                    priority: priority,
                    completed: completed
                });
            }
        });

        return todos;
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZedinArk AI</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .header {
            padding: 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background: var(--vscode-sideBar-background);
        }
        .header-title {
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 8px;
        }
        .controls {
            display: flex;
            gap: 8px;
            align-items: center;
            margin-bottom: 8px;
        }
        .model-select {
            flex: 1;
            padding: 6px 8px;
            border: 1px solid var(--vscode-dropdown-border);
            background: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border-radius: 4px;
            font-size: 12px;
        }
        .control-btn {
            padding: 6px 10px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
        }
        .control-btn:hover {
            opacity: 0.9;
        }
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .message {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .message.user { align-items: flex-end; }
        .message.assistant { align-items: flex-start; }
        .message-content {
            max-width: 85%;
            padding: 10px 14px;
            border-radius: 8px;
            word-wrap: break-word;
            line-height: 1.5;
            white-space: pre-wrap;
        }
        .message.user .message-content {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .message.assistant .message-content {
            background: var(--vscode-textBlockQuote-background);
            color: var(--vscode-foreground);
        }
        .message-content pre {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 8px;
            margin: 4px 0;
            overflow-x: auto;
            max-height: 300px;
            overflow-y: auto;
        }
        .message-content code {
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
        }
        .thinking-container {
            display: flex;
            gap: 8px;
            padding: 10px;
            background: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
            border-radius: 4px;
            margin: 8px 0;
        }
        .thinking-icon {
            font-size: 18px;
            flex-shrink: 0;
        }
        .thinking-content {
            flex: 1;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
        .plan-container {
            background: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            margin: 8px 0;
            overflow: hidden;
        }
        .plan-header {
            padding: 8px 12px;
            background: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            font-weight: 600;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .plan-content {
            padding: 12px;
            font-size: 13px;
            line-height: 1.6;
            white-space: pre-wrap;
        }
        .todo-container {
            background: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            margin: 8px 0;
            overflow: hidden;
        }
        .todo-header {
            padding: 8px 12px;
            background: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            font-weight: 600;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .todo-list {
            padding: 8px;
        }
        .todo-item {
            padding: 6px 8px;
            margin: 4px 0;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
        }
        .todo-item.high {
            background: rgba(255, 100, 100, 0.1);
            border-left: 3px solid #ff6464;
        }
        .todo-item.medium {
            background: rgba(255, 200, 0, 0.1);
            border-left: 3px solid #ffc800;
        }
        .todo-item.low {
            background: rgba(100, 200, 255, 0.1);
            border-left: 3px solid #64c8ff;
        }
        .todo-item.completed {
            opacity: 0.6;
            text-decoration: line-through;
        }
        .todo-checkbox {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }
        .todo-priority {
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 600;
        }
        .todo-priority.high { background: #ff6464; color: white; }
        .todo-priority.medium { background: #ffc800; color: #333; }
        .todo-priority.low { background: #64c8ff; color: #333; }
        .feedback {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 12px;
            border-radius: 6px;
            margin: 8px 0;
            font-size: 12px;
        }
        .feedback-info {
            background: rgba(100, 150, 255, 0.15);
            border-left: 3px solid #6496ff;
        }
        .feedback-success {
            background: rgba(100, 200, 100, 0.15);
            border-left: 3px solid #64c864;
        }
        .feedback-warning {
            background: rgba(255, 200, 0, 0.15);
            border-left: 3px solid #ffc800;
        }
        .feedback-error {
            background: rgba(255, 100, 100, 0.15);
            border-left: 3px solid #ff6464;
        }
        .feedback-icon {
            font-size: 16px;
            flex-shrink: 0;
        }
        .code-snippet-container {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            margin: 8px 0;
            overflow: hidden;
        }
        .code-snippet-header {
            padding: 6px 10px;
            background: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
        }
        .code-file {
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
        }
        .code-lang {
            padding: 2px 6px;
            background: var(--vscode-textCodeBlock-background);
            border-radius: 3px;
            font-family: monospace;
        }
        .code-snippet-container pre {
            margin: 0;
            padding: 12px;
            overflow-x: auto;
            max-height: 400px;
            overflow-y: auto;
        }
        .input-area {
            padding: 12px;
            border-top: 1px solid var(--vscode-panel-border);
            background: var(--vscode-sideBar-background);
        }
        .input-wrapper {
            display: flex;
            gap: 8px;
        }
        #messageInput {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            font-size: 13px;
            resize: none;
            min-height: 40px;
            max-height: 150px;
            font-family: inherit;
        }
        #messageInput:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }
        #sendButton {
            padding: 8px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
        }
        #sendButton:hover:not(:disabled) {
            opacity: 0.9;
        }
        #sendButton:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .loading {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-title">ZedinArk AI Chat</div>
        <div class="controls">
            <select id="modelSelect" class="model-select">
                <option value="">Modellek betöltése...</option>
            </select>
            <button id="refreshBtn" class="control-btn" type="button" title="Modellek frissítése">🔄</button>
            <button id="clearBtn" class="control-btn" type="button" title="Chat törlése">🗑️</button>
        </div>
        </div>
    <div class="messages" id="messages"></div>
    <div class="input-area">
        <div class="input-wrapper">
            <textarea id="messageInput" placeholder="Írj üzenetet..."></textarea>
            <button id="sendButton" type="button">Küldés</button>
        </div>
    </div>
    <script>
        (function() {
        const vscode = acquireVsCodeApi();
            const messages = document.getElementById('messages');
            const input = document.getElementById('messageInput');
            const sendBtn = document.getElementById('sendButton');
            const modelSelect = document.getElementById('modelSelect');
            const clearBtn = document.getElementById('clearBtn');
            const refreshBtn = document.getElementById('refreshBtn');
            let currentModel = 'default';

        function escapeHtml(text) {
                if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

            function formatMarkdown(text) {
                text = escapeHtml(text);
                const backtick = String.fromCharCode(96);
                const codeBlockPattern = backtick + backtick + backtick + '(\\w+)?\\n?([\\s\\S]*?)' + backtick + backtick + backtick;
                text = text.replace(new RegExp(codeBlockPattern, 'g'), '<pre><code>$2</code></pre>');
                const inlineCodePattern = backtick + '([^' + backtick + ']+)' + backtick;
                text = text.replace(new RegExp(inlineCodePattern, 'g'), '<code>$1</code>');
                text = text.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
                text = text.replace(/\\*(.+?)\\*/g, '<em>$1</em>');
                text = text.replace(/\\n/g, '<br>');
                return text;
            }

            function send() {
                const text = input.value.trim();
                if (!text || sendBtn.disabled) return;
                
                // Ellenőrizzük, hogy van-e modell kiválasztva
                if (!currentModel || currentModel === '') {
                    addFeedback('Kérlek válassz egy modellt a legördülő menüből, mielőtt üzenetet küldenél.', 'warning');
                return;
            }

            addMessage('user', text);
                input.value = '';
                sendBtn.disabled = true;

            vscode.postMessage({
                command: 'sendMessage',
                text: text,
                    model: currentModel
                });
            }

            function addMessage(role, text) {
                const div = document.createElement('div');
                div.className = 'message ' + role;
                const content = document.createElement('div');
                content.className = 'message-content';
                content.innerHTML = formatMarkdown(text);
                div.appendChild(content);
                messages.appendChild(div);
                messages.scrollTop = messages.scrollHeight;
            }

            function addThinking(content) {
                const div = document.createElement('div');
                div.className = 'thinking-container';
                div.innerHTML = '<div class="thinking-icon">💭</div><div class="thinking-content">' + escapeHtml(content) + '</div>';
                messages.appendChild(div);
                messages.scrollTop = messages.scrollHeight;
            }

            function addPlan(content) {
                const div = document.createElement('div');
                div.className = 'plan-container';
                div.innerHTML = '<div class="plan-header">📋 Terv</div><div class="plan-content">' + formatMarkdown(content) + '</div>';
                messages.appendChild(div);
                messages.scrollTop = messages.scrollHeight;
            }

            function addTodoList(todos) {
                const div = document.createElement('div');
                div.className = 'todo-container';
                let html = '<div class="todo-header">📝 To-Do Lista</div><div class="todo-list">';
                todos.forEach(function(todo) {
                    const priorityClass = todo.priority || 'medium';
                    const completedClass = todo.completed ? 'completed' : '';
                    const priorityLabel = priorityClass === 'high' ? 'HIGH' : priorityClass === 'medium' ? 'MED' : 'LOW';
                    html += '<div class="todo-item ' + priorityClass + ' ' + completedClass + '">';
                    html += '<span class="todo-priority ' + priorityClass + '">' + priorityLabel + '</span>';
                    html += '<span>' + escapeHtml(todo.task) + '</span>';
                    html += '</div>';
                });
                html += '</div>';
                div.innerHTML = html;
                messages.appendChild(div);
                messages.scrollTop = messages.scrollHeight;
            }

            function addFeedback(content, type) {
                const div = document.createElement('div');
                div.className = 'feedback feedback-' + type;
                const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
                div.innerHTML = '<span class="feedback-icon">' + (icons[type] || 'ℹ️') + '</span><span>' + escapeHtml(content) + '</span>';
                messages.appendChild(div);
                messages.scrollTop = messages.scrollHeight;
            }

            function addCodeSnippet(code, language, filePath) {
                const div = document.createElement('div');
                div.className = 'code-snippet-container';
                const header = filePath ? '<div class="code-snippet-header"><span class="code-file">📄 ' + escapeHtml(filePath) + '</span><span class="code-lang">' + escapeHtml(language) + '</span></div>' : '<div class="code-snippet-header"><span class="code-lang">' + escapeHtml(language) + '</span></div>';
                div.innerHTML = header + '<pre><code>' + escapeHtml(code) + '</code></pre>';
                messages.appendChild(div);
                messages.scrollTop = messages.scrollHeight;
            }

            sendBtn.onclick = send;
            input.onkeydown = function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                }
            };
            input.oninput = function() {
                input.style.height = '40px';
                input.style.height = Math.min(input.scrollHeight, 150) + 'px';
            };
            modelSelect.onchange = function() {
                currentModel = modelSelect.value;
                vscode.postMessage({ command: 'switchModel', model: currentModel });
            };
            clearBtn.onclick = function() {
                if (confirm('Biztosan törölni szeretnéd a chat történetet?')) {
                    vscode.postMessage({ command: 'clearChat' });
                }
            };
            refreshBtn.onclick = function() {
                vscode.postMessage({ command: 'loadModels' });
            };

            window.addEventListener('message', function(e) {
                const msg = e.data;
                if (msg.command === 'receiveMessage') {
                    addMessage('assistant', msg.response);
                    sendBtn.disabled = false;
                    input.focus();
                } else if (msg.command === 'error') {
                    addFeedback('Hiba: ' + msg.error, 'error');
                    sendBtn.disabled = false;
                    input.focus();
                } else if (msg.command === 'loading') {
                    if (msg.loading) {
                        const div = document.createElement('div');
                        div.className = 'loading';
                        div.id = 'loading';
                        div.textContent = 'AI gondolkodik...';
                        messages.appendChild(div);
                    } else {
                        const loading = document.getElementById('loading');
                        if (loading) loading.remove();
                    }
                } else if (msg.command === 'modelsLoaded') {
                    modelSelect.innerHTML = '';
                    if (msg.models && msg.models.length > 0) {
                        msg.models.forEach(function(m) {
                            const option = document.createElement('option');
                            option.value = m.id;
                            option.textContent = m.name + (m.provider ? ' (' + m.provider + ')' : '');
                            if (m.id === msg.currentModel) {
                                option.selected = true;
                                currentModel = m.id;
                            }
                            modelSelect.appendChild(option);
                        });
                        if (!currentModel && msg.models.length > 0) {
                            currentModel = msg.models[0].id;
                            modelSelect.value = currentModel;
                        }
                    } else {
                        const option = document.createElement('option');
                        option.value = '';
                        option.textContent = 'Nincs elérhető modell';
                        modelSelect.appendChild(option);
                        currentModel = '';
                        addFeedback('Nincs elérhető modell. Kérlek ellenőrizd az API kapcsolatot.', 'warning');
                    }
                } else if (msg.command === 'modelChanged') {
                    currentModel = msg.model || '';
                    modelSelect.value = msg.model || '';
                } else if (msg.command === 'chatCleared') {
                    messages.innerHTML = '';
                } else if (msg.command === 'thinking') {
                    addThinking(msg.content);
                } else if (msg.command === 'plan') {
                    addPlan(msg.content);
                } else if (msg.command === 'todoList') {
                    addTodoList(msg.todos);
                } else if (msg.command === 'feedback') {
                    addFeedback(msg.content, msg.type || 'info');
                } else if (msg.command === 'codeSnippet') {
                    addCodeSnippet(msg.code, msg.language, msg.filePath);
                }
            });
        })();
    </script>
</body>
</html>`;
    }
}
