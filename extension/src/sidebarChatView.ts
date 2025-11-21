import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ZedinArkAPI } from './api';

export class SidebarChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'zedinarkChatView';
    private _view?: vscode.WebviewView;
    private api: ZedinArkAPI;
    private currentMode: 'agent' | 'ask' | 'edit' = 'ask';
    private conversationHistory: Array<{role: string, content: string}> = [];

    constructor(
        private readonly _extensionUri: vscode.Uri,
        api: ZedinArkAPI
    ) {
        this.api = api;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        console.log('SidebarChatViewProvider.resolveWebviewView called!');
        console.log('WebviewView:', webviewView);
        console.log('View ID:', SidebarChatViewProvider.viewType);
        
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'sendMessage':
                    await this.handleMessage(message.text, message.mode);
                    break;
                case 'switchMode':
                    this.currentMode = message.mode;
                    this.updateMode();
                    break;
                case 'uploadFile':
                    await this.handleFileUpload(message.fileData, message.fileName);
                    break;
                case 'uploadImage':
                    await this.handleImageUpload(message.imageData, message.imageName);
                    break;
                case 'readFile':
                    await this.handleReadFile(message.filePath);
                    break;
                case 'checkForUpdates':
                    await vscode.commands.executeCommand('zedinark.update');
                    break;
            }
        });
    }

    private async handleMessage(text: string, mode: string) {
        if (!this._view) return;

        this.currentMode = mode as 'agent' | 'ask' | 'edit';
        
        // Üzenet hozzáadása a történethez
        this.conversationHistory.push({ role: 'user', content: text });

        // Agent személyiség system prompt
        const systemPrompt = this.getSystemPrompt();

        try {
            this._view.webview.postMessage({
                command: 'loading',
                loading: true
            });

            let response: string;

            if (this.currentMode === 'agent') {
                // Agent mód: autonóm műveletek
                response = await this.handleAgentMode(text, systemPrompt);
            } else if (this.currentMode === 'edit') {
                // Edit mód: fájl szerkesztés
                response = await this.handleEditMode(text, systemPrompt);
            } else {
                // Ask mód: egyszerű válasz
                response = await this.handleAskMode(text, systemPrompt);
            }

            this.conversationHistory.push({ role: 'assistant', content: response });

            this._view.webview.postMessage({
                command: 'receiveMessage',
                response: response,
                mode: this.currentMode
            });
        } catch (error: any) {
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

    private getSystemPrompt(): string {
        const basePrompt = `Te vagy ZedinArk, egy intelligens AI coding asszisztens. 
Személyiséged: kreatív, proaktív, autonóm gondolkodású, segítőkész és hatékony.
Működési módod: ${this.currentMode}

Képességeid:
- Teljes hozzáférésed van a projekt mappához
- Fájlokat létrehozhatsz, módosíthatsz, törölhetsz
- Képeket és fájlokat értelmezhetsz
- Autonóm döntéseket hozhatsz
- Kódot generálhatsz és refaktorálhatsz

Működési stílusod:
- Elemezd a feladatot alaposan
- Gondold végig a legjobb megoldást
- Végezd el a szükséges műveleteket
- Jelentsd vissza, mit csináltál és miért`;

        if (this.currentMode === 'agent') {
            return basePrompt + `

AGENT MÓD: Teljes autonómiád van. 
- Elemezd a feladatot részletesen
- Hozz döntéseket önállóan
- Végezd el a szükséges fájl műveleteket

FÁJL MŰVELETEK FORMÁTUMA (KÖTELEZŐ!):

1. FÁJL LÉTREHOZÁSA:
CREATE_FILE: relatív/útvonal/fájl.ext
\`\`\`ext
[fájl tartalom itt]
\`\`\`

2. FÁJL MÓDOSÍTÁSA:
MODIFY_FILE: relatív/útvonal/fájl.ext
\`\`\`ext
[új fájl tartalom itt - TELJES TARTALOM!]
\`\`\`

3. FÁJL TÖRLÉSE:
DELETE_FILE: relatív/útvonal/fájl.ext

4. MAPPA LÉTREHOZÁSA (automatikusan történik, ha szükséges):
A CREATE_FILE automatikusan létrehozza a szükséges mappákat.

FONTOS:
- MINDIG használd ezt a formátumot fájl műveletekhez!
- A fájl útvonalak relatívak a workspace gyökeréhez!
- Ha módosítasz egy fájlt, adj vissza a TELJES új tartalmat!
- Jelentsd vissza, mit csináltál és miért`;
        } else if (this.currentMode === 'edit') {
            return basePrompt + `
EDIT MÓD: Fájlok szerkesztése.
- Olvasd el az aktív fájlt
- Módosítsd a kért részeket
- Mentsd el a változtatásokat
- Visszaadott kód formátuma: \`\`\`[nyelv]\n[kód]\n\`\`\``;
        } else {
            return basePrompt + `
ASK MÓD: Kérdés-válasz mód.
- Válaszolj a kérdésekre részletesen
- Segíts problémákat megoldani
- Adj tanácsokat és javaslatokat`;
        }
    }

    private async handleAgentMode(text: string, systemPrompt: string): Promise<string> {
        // Agent mód: teljes autonómia
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        // Projekt struktúra lekérése
        const projectStructure = await this.getProjectStructure(workspaceFolder.uri.fsPath);

        // Agent prompt
        const agentPrompt = `${systemPrompt}

Projekt struktúra:
${JSON.stringify(projectStructure, null, 2)}

Feladat: ${text}

Elemezd a feladatot és végezd el a szükséges műveleteket. 
Ha fájlokat kell létrehozni vagy módosítani, használd a file műveleteket.`;

        const response = await this.api.chat(agentPrompt);
        
        // Agent válaszban lehetnek fájl műveletek
        await this.executeAgentActions(response, workspaceFolder.uri.fsPath);

        return response;
    }

    private async executeAgentActions(response: string, workspacePath: string) {
        // Agent válaszban keresünk fájl műveleteket
        let actionsPerformed = false;
        
        try {
            // CREATE_FILE: path/to/file.py
            // ```ext
            // content
            // ```
            // Több verziót is támogatunk a regex-ben (rugalmasabb)
            const createFilePatterns = [
                /CREATE_FILE:\s*([^\n`]+)\s*\n\s*```(\w+)?\s*\n([\s\S]*?)```/g,
                /CREATE_FILE:\s*([^\n`]+)\s*\n\s*```\s*\n([\s\S]*?)```/g,
                /CREATE_FILE[:\s]+([^\n`]+)\s*\n\s*```(\w+)?\s*\n([\s\S]*?)```/g
            ];
            
            for (const regex of createFilePatterns) {
                let match;
                regex.lastIndex = 0; // Reset regex
                
                while ((match = regex.exec(response)) !== null) {
                    const filePath = match[1].trim();
                    const content = match[2] ? match[3].trim() : (match[2] !== undefined ? match[2].trim() : match[1]);
                    const actualContent = match.length === 4 ? match[3].trim() : content;
                    
                    // Népeld normalizáljuk az útvonalat
                    const normalizedPath = filePath.replace(/^\.\//, '').replace(/^\//, '');
                    const fullPath = path.join(workspacePath, normalizedPath);
                    
                    try {
                        await this.createFile(fullPath, actualContent);
                        actionsPerformed = true;
                        
                        // Visszajelzés a felhasználónak
                        this._view?.webview.postMessage({
                            command: 'fileCreated',
                            filePath: normalizedPath
                        });
                        
                        console.log(`✅ File created: ${normalizedPath}`);
                    } catch (error: any) {
                        console.error(`❌ Error creating file ${normalizedPath}:`, error);
                    }
                }
            }

            // DELETE_FILE: path/to/file.py
            const deleteFilePatterns = [
                /DELETE_FILE:\s*([^\n`]+)/g,
                /DELETE_FILE[:\s]+([^\n`]+)/g
            ];
            
            for (const regex of deleteFilePatterns) {
                let match;
                regex.lastIndex = 0;
                
                while ((match = regex.exec(response)) !== null) {
                    const filePath = match[1].trim();
                    const normalizedPath = filePath.replace(/^\.\//, '').replace(/^\//, '');
                    const fullPath = path.join(workspacePath, normalizedPath);
                    
                    try {
                        await this.deleteFile(fullPath);
                        actionsPerformed = true;
                        
                        this._view?.webview.postMessage({
                            command: 'fileDeleted',
                            filePath: normalizedPath
                        });
                        
                        console.log(`✅ File deleted: ${normalizedPath}`);
                    } catch (error: any) {
                        console.error(`❌ Error deleting file ${normalizedPath}:`, error);
                    }
                }
            }

            // MODIFY_FILE: path/to/file.py
            // ```ext
            // new content
            // ```
            const modifyFilePatterns = [
                /MODIFY_FILE:\s*([^\n`]+)\s*\n\s*```(\w+)?\s*\n([\s\S]*?)```/g,
                /MODIFY_FILE:\s*([^\n`]+)\s*\n\s*```\s*\n([\s\S]*?)```/g,
                /MODIFY_FILE[:\s]+([^\n`]+)\s*\n\s*```(\w+)?\s*\n([\s\S]*?)```/g
            ];
            
            for (const regex of modifyFilePatterns) {
                let match;
                regex.lastIndex = 0;
                
                while ((match = regex.exec(response)) !== null) {
                    const filePath = match[1].trim();
                    const content = match.length === 4 ? match[3].trim() : match[2].trim();
                    const normalizedPath = filePath.replace(/^\.\//, '').replace(/^\//, '');
                    const fullPath = path.join(workspacePath, normalizedPath);
                    
                    try {
                        // MODIFY_FILE is CREATE_FILE (overwrite)
                        await this.createFile(fullPath, content);
                        actionsPerformed = true;
                        
                        this._view?.webview.postMessage({
                            command: 'fileModified',
                            filePath: normalizedPath
                        });
                        
                        console.log(`✅ File modified: ${normalizedPath}`);
                    } catch (error: any) {
                        console.error(`❌ Error modifying file ${normalizedPath}:`, error);
                    }
                }
            }
            
            if (actionsPerformed) {
                // Visszajelzés a felhasználónak
                vscode.window.showInformationMessage('Agent fájl műveletek végrehajtva!');
            }
        } catch (error: any) {
            console.error('Error executing agent actions:', error);
            vscode.window.showErrorMessage(`Hiba fájl műveletek végrehajtásakor: ${error.message}`);
        }
    }

    private async handleEditMode(text: string, systemPrompt: string): Promise<string> {
        // Edit mód: fájl szerkesztés
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            throw new Error('No active editor. Please open a file to edit.');
        }

        const filePath = editor.document.uri.fsPath;
        const fileContent = editor.document.getText();
        const language = editor.document.languageId;

        const editPrompt = `${systemPrompt}

Fájl: ${filePath}
Nyelv: ${language}
Jelenlegi tartalom:
\`\`\`${language}
${fileContent}
\`\`\`

Utasítás: ${text}

Módosítsd a fájlt a kérés szerint. Visszaadott formátum:
\`\`\`${language}
[módosított kód]
\`\`\``;

        const response = await this.api.chat(editPrompt);
        
        // Kód kinyerése és fájl módosítása
        const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
        if (codeMatch) {
            const newContent = codeMatch[1].trim();
            await editor.edit(editBuilder => {
                const fullRange = new vscode.Range(
                    editor.document.positionAt(0),
                    editor.document.positionAt(editor.document.getText().length)
                );
                editBuilder.replace(fullRange, newContent);
            });
            
            // Fájl mentése
            await editor.document.save();
            
            return `✅ Fájl módosítva: ${path.basename(filePath)}\n\n${response}`;
        }

        return response;
    }

    private async handleAskMode(text: string, systemPrompt: string): Promise<string> {
        // Ask mód: egyszerű válasz
        const messages = [
            { role: 'system', content: systemPrompt },
            ...this.conversationHistory.slice(-5), // Utolsó 5 üzenet
            { role: 'user', content: text }
        ];

        return await this.api.chatWithHistory(messages);
    }

    private async handleFileUpload(fileData: string, fileName: string) {
        if (!this._view) return;

        try {
            // Fájl olvasása és értelmezése
            const content = Buffer.from(fileData, 'base64').toString('utf-8');
            
            // Fájl hozzáadása a chathez
            this._view.webview.postMessage({
                command: 'fileAttached',
                fileName: fileName,
                fileSize: content.length
            });
            
            const prompt = `Olvasd el és értelmezd ezt a fájlt: ${fileName}

Tartalom:
\`\`\`
${content.substring(0, 10000)}${content.length > 10000 ? '\n... (fájl csonkolva)' : ''}
\`\`\`

Elemezd a fájlt, magyarázd el, mit csinál, és adj javaslatokat.`;
            
            const response = await this.api.chat(prompt);
            
            this._view.webview.postMessage({
                command: 'fileInterpreted',
                fileName: fileName,
                interpretation: response
            });
        } catch (error: any) {
            this._view.webview.postMessage({
                command: 'error',
                error: `Fájl feldolgozási hiba: ${error.message}`
            });
        }
    }

    private async handleImageUpload(imageData: string, imageName: string) {
        if (!this._view) return;

        try {
            // Kép feltöltése és értelmezése (base64)
            this._view.webview.postMessage({
                command: 'imageAttached',
                imageName: imageName
            });
            
            const prompt = `Elemezd ezt a képet: ${imageName}
Írd le, mit látsz a képen, és adj releváns információkat.`;
            
            // Vision API hívás (ha van vision model)
            const response = await this.api.analyzeImage(imageData, prompt);
            
            this._view.webview.postMessage({
                command: 'imageInterpreted',
                imageName: imageName,
                interpretation: response
            });
        } catch (error: any) {
            // Ha nincs vision model, egyszerű válasz
            this._view.webview.postMessage({
                command: 'imageInterpreted',
                imageName: imageName,
                interpretation: `Kép feltöltve: ${imageName}\n\n(Vision model még nincs implementálva a backend-en)`
            });
        }
    }

    private async handleReadFile(filePath: string) {
        if (!this._view) return;

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return;

        const fullPath = path.join(workspaceFolder.uri.fsPath, filePath);
        
        try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            this._view.webview.postMessage({
                command: 'fileRead',
                filePath: filePath,
                content: content
            });
        } catch (error: any) {
            this._view.webview.postMessage({
                command: 'error',
                error: `Nem lehet olvasni a fájlt: ${error.message}`
            });
        }
    }

    private async getProjectStructure(workspacePath: string): Promise<any> {
        // Projekt struktúra lekérése
        const structure: any = { files: [], directories: [] };
        
        const walkDir = (dir: string, depth: number = 0) => {
            if (depth > 3) return; // Max 3 szint
            
            try {
                const items = fs.readdirSync(dir);
                for (const item of items) {
                    const fullPath = path.join(dir, item);
                    const relPath = path.relative(workspacePath, fullPath);
                    
                    // Ignore patterns
                    if (item.startsWith('.') || 
                        item === 'node_modules' || 
                        item === '__pycache__' ||
                        item === '.git' ||
                        item === 'venv' ||
                        item === '.venv') continue;
                    
                    try {
                        const stat = fs.statSync(fullPath);
                        if (stat.isDirectory()) {
                            structure.directories.push(relPath);
                            walkDir(fullPath, depth + 1);
                        } else {
                            structure.files.push(relPath);
                        }
                    } catch (statError) {
                        // Ignore permission errors
                    }
                }
            } catch (error) {
                // Ignore permission errors
            }
        };
        
        walkDir(workspacePath);
        return structure;
    }

    private async createFile(filePath: string, content: string) {
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, content, 'utf-8');
        } catch (error: any) {
            throw new Error(`Nem lehet létrehozni a fájlt: ${error.message}`);
        }
    }

    private async deleteFile(filePath: string) {
        try {
            // Normalizáljuk az útvonalat
            const normalizedPath = path.normalize(filePath);
            
            if (fs.existsSync(normalizedPath)) {
                // Ha a fájl meg van nyitva VS Code-ban, zárjuk be
                const uri = vscode.Uri.file(normalizedPath);
                const openEditors = vscode.window.visibleTextEditors;
                for (const editor of openEditors) {
                    if (editor.document.uri.fsPath === normalizedPath) {
                        await vscode.window.showTextDocument(editor.document, { preview: false });
                        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                    }
                }
                
                // Fájl törlése
                fs.unlinkSync(normalizedPath);
                console.log(`🗑️ File deleted: ${normalizedPath}`);
                
                // Próbáljuk meg törölni az üres mappákat is (max 5 szint)
                let currentDir = path.dirname(normalizedPath);
                for (let i = 0; i < 5; i++) {
                    try {
                        const files = fs.readdirSync(currentDir);
                        if (files.length === 0) {
                            fs.rmdirSync(currentDir);
                            console.log(`📁 Empty directory deleted: ${currentDir}`);
                            currentDir = path.dirname(currentDir);
                        } else {
                            break;
                        }
                    } catch {
                        break;
                    }
                }
            }
        } catch (error: any) {
            console.error(`Error deleting file ${filePath}:`, error);
            throw new Error(`Nem lehet törölni a fájlt: ${error.message}`);
        }
    }

    private updateMode() {
        this._view?.webview.postMessage({
            command: 'modeChanged',
            mode: this.currentMode
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Modern, letisztult design HTML
        return `<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZedinArk AI</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
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
            flex-shrink: 0;
        }

        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .header-title {
            font-weight: 600;
            font-size: 13px;
        }

        .update-btn {
            padding: 4px 8px;
            border: 1px solid var(--vscode-button-border);
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .update-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .mode-selector {
            display: flex;
            gap: 4px;
            margin-bottom: 8px;
        }

        .mode-btn {
            flex: 1;
            padding: 6px 12px;
            border: 1px solid var(--vscode-button-border);
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: pointer;
            border-radius: 4px;
            font-size: 12px;
            transition: all 0.2s;
            font-weight: 500;
        }

        .mode-btn.active {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-color: var(--vscode-button-background);
        }

        .mode-btn:hover {
            opacity: 0.9;
        }

        .upload-buttons {
            display: flex;
            gap: 4px;
            margin-top: 8px;
        }

        .upload-btn {
            flex: 1;
            padding: 6px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-foreground);
            cursor: pointer;
            border-radius: 4px;
            font-size: 11px;
            transition: background 0.2s;
        }

        .upload-btn:hover {
            background: var(--vscode-list-hoverBackground);
        }

        #fileInput, #imageInput {
            display: none;
        }

        .messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            min-height: 0;
        }

        .message {
            display: flex;
            flex-direction: column;
            gap: 4px;
            animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .message.user {
            align-items: flex-end;
        }

        .message.assistant {
            align-items: flex-start;
        }

        .message-content {
            max-width: 85%;
            padding: 10px 14px;
            border-radius: 12px;
            word-wrap: break-word;
            line-height: 1.5;
            white-space: pre-wrap;
        }

        .message.user .message-content {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-bottom-right-radius: 4px;
        }

        .message.assistant .message-content {
            background: var(--vscode-textBlockQuote-background);
            color: var(--vscode-foreground);
            border-bottom-left-radius: 4px;
        }

        .message-role {
            font-size: 11px;
            opacity: 0.7;
            font-weight: 500;
            padding: 0 4px;
        }

        .input-container {
            padding: 12px;
            border-top: 1px solid var(--vscode-panel-border);
            background: var(--vscode-sideBar-background);
            flex-shrink: 0;
        }

        #messageInput {
            width: 100%;
            padding: 10px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 6px;
            font-size: 13px;
            resize: none;
            min-height: 60px;
            max-height: 200px;
            font-family: inherit;
            line-height: 1.5;
        }

        #messageInput:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
        }

        .send-button {
            width: 100%;
            margin-top: 8px;
            padding: 10px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: opacity 0.2s;
        }

        .send-button:hover:not(:disabled) {
            opacity: 0.9;
        }

        .send-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .loading {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
        }

        .loading-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--vscode-descriptionForeground);
            animation: pulse 1.4s ease-in-out infinite;
        }

        .loading-dot:nth-child(2) {
            animation-delay: 0.2s;
        }

        .loading-dot:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes pulse {
            0%, 80%, 100% {
                opacity: 0.3;
            }
            40% {
                opacity: 1;
            }
        }

        .attached-file {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 10px;
            background: var(--vscode-textBlockQuote-background);
            border-radius: 6px;
            font-size: 11px;
            margin-top: 4px;
            max-width: 85%;
        }

        .attached-file-icon {
            width: 16px;
            height: 16px;
        }

        .file-action-notification {
            padding: 8px 12px;
            background: var(--vscode-textBlockQuote-background);
            border-radius: 6px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-top">
            <div class="header-title">ZEDINARK AI</div>
            <button class="update-btn" onclick="checkForUpdates()" title="Frissítés ellenőrzése">
                🔄 Update
            </button>
        </div>
        <div class="mode-selector">
            <button class="mode-btn active" data-mode="agent">🤖 Agent</button>
            <button class="mode-btn" data-mode="ask">💬 Ask</button>
            <button class="mode-btn" data-mode="edit">✏️ Edit</button>
        </div>
        <div class="upload-buttons">
            <button class="upload-btn" onclick="document.getElementById('fileInput').click()">📄 Fájl</button>
            <button class="upload-btn" onclick="document.getElementById('imageInput').click()">🖼️ Kép</button>
        </div>
        <input type="file" id="fileInput" accept="*/*">
        <input type="file" id="imageInput" accept="image/*">
    </div>

    <div class="messages-container" id="messages"></div>

    <div class="input-container">
        <textarea id="messageInput" placeholder="Írj üzenetet... (Shift+Enter új sor)"></textarea>
        <button class="send-button" id="sendButton" onclick="sendMessage()">Küldés</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        let currentMode = 'ask';
        let attachedFiles = [];

        // Mode selector
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentMode = btn.dataset.mode;
                vscode.postMessage({ command: 'switchMode', mode: currentMode });
                
                // Mode change notification
                const modeText = currentMode === 'agent' ? 'Agent (autonóm)' : currentMode === 'edit' ? 'Edit (szerkesztés)' : 'Ask (kérdés-válasz)';
                addSystemMessage('Mód váltva: ' + modeText);
            });
        });

        function addSystemMessage(text) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message assistant';
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.style.fontSize = '11px';
            contentDiv.style.opacity = '0.7';
            contentDiv.textContent = text;
            messageDiv.appendChild(contentDiv);
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        // File upload
        document.getElementById('fileInput').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target.result.split(',')[1];
                    attachedFiles.push({ name: file.name, type: 'file' });
                    vscode.postMessage({
                        command: 'uploadFile',
                        fileData: base64,
                        fileName: file.name
                    });
                    addSystemMessage('📄 Fájl feltöltve: ' + file.name);
                };
                reader.readAsDataURL(file);
            }
        });

        // Image upload
        document.getElementById('imageInput').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target.result.split(',')[1];
                    attachedFiles.push({ name: file.name, type: 'image' });
                    vscode.postMessage({
                        command: 'uploadImage',
                        imageData: base64,
                        imageName: file.name
                    });
                    addSystemMessage('🖼️ Kép feltöltve: ' + file.name);
                };
                reader.readAsDataURL(file);
            }
        });

        function addMessage(role, content) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + role;
            
            const roleDiv = document.createElement('div');
            roleDiv.className = 'message-role';
            roleDiv.textContent = role === 'user' ? 'Te' : 'ZedinArk AI';
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            
            // Markdown-like formatting
            content = escapeHtml(content);
            content = content.replace(/\\n/g, '<br>');
            const backtick = String.fromCharCode(96);
            const codeBlockPattern = backtick + backtick + backtick + '([\\s\\S]*?)' + backtick + backtick + backtick;
            const codeBlockRegex = new RegExp(codeBlockPattern, 'g');
            content = content.replace(codeBlockRegex, '<pre><code>$1</code></pre>');
            const inlineCodePattern = backtick + '([^' + backtick + ']+)' + backtick;
            const inlineCodeRegex = new RegExp(inlineCodePattern, 'g');
            content = content.replace(inlineCodeRegex, '<code>$1</code>');
            
            contentDiv.innerHTML = content;
            
            messageDiv.appendChild(roleDiv);
            messageDiv.appendChild(contentDiv);
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text) return;

            addMessage('user', text);
            messageInput.value = '';
            sendButton.disabled = true;
            messageInput.style.height = '60px';

            vscode.postMessage({
                command: 'sendMessage',
                text: text,
                mode: currentMode
            });
        }

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        messageInput.addEventListener('input', () => {
            messageInput.style.height = '60px';
            messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
        });

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'receiveMessage':
                    addMessage('assistant', message.response);
                    sendButton.disabled = false;
                    messageInput.focus();
                    break;
                case 'error':
                    addMessage('assistant', '❌ Hiba: ' + message.error);
                    sendButton.disabled = false;
                    messageInput.focus();
                    break;
                case 'loading':
                    if (message.loading) {
                        const loadingDiv = document.createElement('div');
                        loadingDiv.className = 'loading';
                        loadingDiv.id = 'loading';
                        loadingDiv.innerHTML = '<div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div><span>AI gondolkodik...</span>';
                        messagesDiv.appendChild(loadingDiv);
                        messagesDiv.scrollTop = messagesDiv.scrollHeight;
                    } else {
                        const loading = document.getElementById('loading');
                        if (loading) loading.remove();
                    }
                    break;
                case 'fileCreated':
                    addSystemMessage('✅ Fájl létrehozva: ' + message.filePath);
                    break;
                case 'fileDeleted':
                    addSystemMessage('🗑️ Fájl törölve: ' + message.filePath);
                    break;
                case 'fileModified':
                    addSystemMessage('✏️ Fájl módosítva: ' + message.filePath);
                    break;
                case 'fileInterpreted':
                    addMessage('assistant', '📄 Fájl elemzés: ' + message.fileName + '\\n\\n' + message.interpretation);
                    break;
                case 'imageInterpreted':
                    addMessage('assistant', '🖼️ Kép elemzés: ' + message.imageName + '\\n\\n' + message.interpretation);
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}

