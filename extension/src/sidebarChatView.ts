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
                case 'checkForUpdates':
                    await vscode.commands.executeCommand('zedinark.update');
                    break;
            }
        });
    }

    private postThinking(thinking: string) {
        this._view?.webview.postMessage({
            command: 'thinking',
            content: thinking
        });
    }

    private postPlan(plan: string) {
        this._view?.webview.postMessage({
            command: 'plan',
            content: plan
        });
    }

    private postTodoList(todos: Array<{id: string, task: string, priority: 'high' | 'medium' | 'low', completed: boolean}>) {
        this._view?.webview.postMessage({
            command: 'todoList',
            todos: todos
        });
    }

    private postFeedback(feedback: string, type: 'info' | 'success' | 'warning' | 'error') {
        this._view?.webview.postMessage({
            command: 'feedback',
            content: feedback,
            type: type
        });
    }

    private postCodeSnippet(code: string, language: string, filePath?: string) {
        this._view?.webview.postMessage({
            command: 'codeSnippet',
            code: code,
            language: language,
            filePath: filePath
        });
    }

    private async handleMessage(text: string, mode: string) {
        if (!this._view) return;

        this.currentMode = mode as 'agent' | 'ask' | 'edit';
        this.conversationHistory.push({ role: 'user', content: text });

        const systemPrompt = this.getSystemPrompt();

        try {
            this._view.webview.postMessage({
                command: 'loading',
                loading: true
            });

            let response: string;

            if (this.currentMode === 'agent') {
                response = await this.handleAgentMode(text, systemPrompt);
            } else if (this.currentMode === 'edit') {
                response = await this.handleEditMode(text, systemPrompt);
            } else {
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
- Autonóm döntéseket hozhatsz
- Kódot generálhatsz és refaktorálhatsz`;

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

FONTOS:
- MINDIG használd ezt a formátumot fájl műveletekhez!
- A fájl útvonalak relatívak a workspace gyökeréhez!
- Ha módosítasz egy fájlt, adj vissza a TELJES új tartalmat!`;
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
        let workspacePath: string | undefined;
        let workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        
        if (workspaceFolder) {
            workspacePath = workspaceFolder.uri.fsPath;
        } else {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const activeFile = activeEditor.document.uri;
                if (activeFile.scheme === 'file') {
                    workspacePath = path.dirname(activeFile.fsPath);
                }
            }
        }

        if (!workspacePath) {
            throw new Error('Nincs workspace mappa megnyitva! Kérlek, nyisd meg a projekt mappát VS Code-ban: File → Open Folder...');
        }

        const projectStructure = await this.getProjectStructure(workspacePath);

        const agentPrompt = `${systemPrompt}

PROJEKT INFORMÁCIÓ:
- Mappa útvonal: ${workspacePath}
- Projekt struktúra:
${JSON.stringify(projectStructure, null, 2)}

FELADAT: ${text}

KÖTELEZŐ SZABÁLYOK:
1. Ha fájlt kell létrehozni, KÖTELEZŐEN használd a CREATE_FILE formátumot
2. NE írj magyarázatot bash parancsokról
3. NE írj magyarázatot, hanem KÖZVETLENÜL használd a CREATE_FILE formátumot
4. A CREATE_FILE formátum után KÖVETKEZIK a kód blokk a tartalommal

KÖTELEZŐ FORMÁTUM fájl létrehozásához:

CREATE_FILE: fájl_neve.txt
\`\`\`
Hello
\`\`\`

VÉGEZD EL A FELADATOT A FENTI FORMÁTUMBAN!`;

        const response = await this.api.chat(agentPrompt);
        await this.executeAgentActions(response, workspacePath);
        return response;
    }

    private async executeAgentActions(response: string, workspacePath: string) {
        let actionsPerformed = false;
        
        console.log('🔍 Executing agent actions, workspace:', workspacePath);
        console.log('📝 Response length:', response.length);
        console.log('📄 Response preview:', response.substring(0, 500));
        
        try {
            // Több regex pattern a különböző formátumokhoz
            const createFilePatterns = [
                /CREATE_FILE:\s*([^\n`]+)\s*\n\s*```(\w+)?\s*\n([\s\S]*?)```/g,
                /CREATE_FILE:\s*([^\n`]+)\s*\n\s*```\s*\n([\s\S]*?)```/g,
                /CREATE_FILE[:\s]+([^\n`]+)\s*\n\s*```(\w+)?\s*\n([\s\S]*?)```/g,
                /CREATE_FILE[:\s]+([^\n`]+)\s*\r?\n\s*```(\w+)?\s*\r?\n([\s\S]*?)```/g,
            ];
            
            for (const regex of createFilePatterns) {
                let match;
                regex.lastIndex = 0;
                
                while ((match = regex.exec(response)) !== null) {
                    console.log('📄 Found CREATE_FILE match:', match[0].substring(0, 200));
                    
                    let filePath: string;
                    let actualContent: string;
                    
                    if (match.length === 4) {
                        filePath = match[1].trim();
                        actualContent = match[3].trim();
                    } else if (match.length === 3) {
                        filePath = match[1].trim();
                        actualContent = match[2].trim();
                    } else {
                        console.warn('⚠️ Unexpected match format:', match.length);
                        continue;
                    }
                    
                    if (!filePath || !actualContent) {
                        console.warn('⚠️ Missing filePath or content:', { filePath, contentLength: actualContent?.length });
                        continue;
                    }
                    
                    const normalizedPath = filePath.replace(/^\.\//, '').replace(/^\//, '');
                    const fullPath = path.join(workspacePath, normalizedPath);
                    
                    console.log('📝 Creating file:');
                    console.log('  - Path:', normalizedPath);
                    console.log('  - Full path:', fullPath);
                    console.log('  - Content length:', actualContent.length);
                    
                    try {
                        await this.createFile(fullPath, actualContent);
                        actionsPerformed = true;
                        
                        this._view?.webview.postMessage({
                            command: 'fileCreated',
                            filePath: normalizedPath
                        });
                        
                        vscode.window.showInformationMessage(`✅ Fájl létrehozva: ${normalizedPath}`);
                        console.log(`✅ File created successfully: ${normalizedPath}`);
                    } catch (error: any) {
                        const errorMsg = `❌ Error creating file ${normalizedPath}: ${error.message}`;
                        console.error(errorMsg, error);
                        vscode.window.showErrorMessage(errorMsg);
                    }
                }
            }

            const deleteFilePatterns = [
                /DELETE_FILE:\s*([^\n`]+)/g,
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
                        vscode.window.showInformationMessage(`✅ Fájl törölve: ${normalizedPath}`);
                    } catch (error: any) {
                        vscode.window.showErrorMessage(`❌ Hiba: ${error.message}`);
                    }
                }
            }

            const modifyFilePatterns = [
                /MODIFY_FILE:\s*([^\n`]+)\s*\n\s*```(\w+)?\s*\n([\s\S]*?)```/g,
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
                        await this.createFile(fullPath, content);
                        actionsPerformed = true;
                        vscode.window.showInformationMessage(`✅ Fájl módosítva: ${normalizedPath}`);
                    } catch (error: any) {
                        vscode.window.showErrorMessage(`❌ Hiba: ${error.message}`);
                    }
                }
            }
            
            if (actionsPerformed) {
                vscode.window.showInformationMessage('Agent fájl műveletek végrehajtva!');
            }
        } catch (error: any) {
            console.error('Error executing agent actions:', error);
            vscode.window.showErrorMessage(`Hiba fájl műveletek végrehajtásakor: ${error.message}`);
        }
    }

    private async handleEditMode(text: string, systemPrompt: string): Promise<string> {
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
            
            await editor.document.save();
            
            return `✅ Fájl módosítva: ${path.basename(filePath)}\n\n${response}`;
        }

        return response;
    }

    private async handleAskMode(text: string, systemPrompt: string): Promise<string> {
        const messages = [
            { role: 'system', content: systemPrompt },
            ...this.conversationHistory.slice(-5),
            { role: 'user', content: text }
        ];

        return await this.api.chatWithHistory(messages);
    }

    private async getProjectStructure(workspacePath: string): Promise<any> {
        const structure: any = { files: [], directories: [] };
        
        const walkDir = (dir: string, depth: number = 0) => {
            if (depth > 3) return;
            
            try {
                const items = fs.readdirSync(dir);
                for (const item of items) {
                    const fullPath = path.join(dir, item);
                    const relPath = path.relative(workspacePath, fullPath);
                    
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
            const normalizedPath = path.normalize(filePath);
            
            if (fs.existsSync(normalizedPath)) {
                const uri = vscode.Uri.file(normalizedPath);
                const openEditors = vscode.window.visibleTextEditors;
                for (const editor of openEditors) {
                    if (editor.document.uri.fsPath === normalizedPath) {
                        await vscode.window.showTextDocument(editor.document, { preview: false });
                        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                    }
                }
                
                fs.unlinkSync(normalizedPath);
                
                let currentDir = path.dirname(normalizedPath);
                for (let i = 0; i < 5; i++) {
                    try {
                        const files = fs.readdirSync(currentDir);
                        if (files.length === 0) {
                            fs.rmdirSync(currentDir);
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

        .message-content pre {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 12px;
            margin: 8px 0;
            overflow-x: auto;
            max-height: calc(1.5em * 10 + 24px); /* Exactly 10 lines (line-height: 1.5 * 10 + padding) */
            overflow-y: auto;
            position: relative;
            font-size: 13px;
            line-height: 1.5;
        }

        .message-content pre code {
            font-family: var(--vscode-editor-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
            font-size: 13px;
            line-height: 1.5;
            color: var(--vscode-textCodeBlock-foreground, var(--vscode-foreground));
            display: block;
            white-space: pre;
            padding: 0;
            background: transparent;
            margin: 0;
        }

        /* Scrollbar styling for code blocks */
        .message-content pre::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }

        .message-content pre::-webkit-scrollbar-track {
            background: var(--vscode-scrollbarSlider-background, transparent);
            border-radius: 4px;
        }

        .message-content pre::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-hoverBackground, var(--vscode-descriptionForeground));
            border-radius: 4px;
        }

        .message-content pre::-webkit-scrollbar-thumb:hover {
            background: var(--vscode-scrollbarSlider-activeBackground, var(--vscode-foreground));
        }

        .message-content code:not(pre code) {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
            font-size: 0.9em;
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

        /* Thinking container */
        .thinking-container {
            display: flex;
            gap: 8px;
            padding: 12px;
            margin: 8px 0;
            background: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-button-background);
            border-radius: 6px;
            font-size: 13px;
            line-height: 1.6;
        }

        .thinking-icon {
            font-size: 18px;
            flex-shrink: 0;
        }

        .thinking-content {
            flex: 1;
            color: var(--vscode-foreground);
            white-space: pre-wrap;
        }

        /* Plan container */
        .plan-container {
            margin: 8px 0;
            background: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            overflow: hidden;
        }

        .plan-header {
            padding: 8px 12px;
            background: var(--vscode-button-secondaryBackground);
            font-weight: 600;
            font-size: 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .plan-content {
            padding: 12px;
            font-size: 13px;
            line-height: 1.6;
            color: var(--vscode-foreground);
        }

        /* Todo container */
        .todo-container {
            margin: 8px 0;
            background: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            overflow: hidden;
        }

        .todo-header {
            padding: 8px 12px;
            background: var(--vscode-button-secondaryBackground);
            font-weight: 600;
            font-size: 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .todo-list {
            list-style: none;
            padding: 8px;
            margin: 0;
        }

        .todo-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            margin: 4px 0;
            border-radius: 4px;
            font-size: 13px;
            transition: background 0.2s;
        }

        .todo-item:hover {
            background: var(--vscode-list-hoverBackground);
        }

        .todo-item.checked {
            opacity: 0.6;
            text-decoration: line-through;
        }

        .todo-item.priority-high {
            border-left: 3px solid #f48771;
        }

        .todo-item.priority-medium {
            border-left: 3px solid #dcdcaa;
        }

        .todo-item.priority-low {
            border-left: 3px solid #89d185;
        }

        .todo-text {
            flex: 1;
            color: var(--vscode-foreground);
        }

        .todo-priority {
            font-size: 11px;
            opacity: 0.8;
        }

        /* Feedback container */
        .feedback {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 12px;
            margin: 8px 0;
            border-radius: 6px;
            font-size: 13px;
            line-height: 1.5;
        }

        .feedback-info {
            background: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-button-background);
        }

        .feedback-success {
            background: rgba(89, 209, 133, 0.2);
            border-left: 3px solid #89d185;
        }

        .feedback-warning {
            background: rgba(220, 220, 170, 0.2);
            border-left: 3px solid #dcdcaa;
        }

        .feedback-error {
            background: rgba(244, 135, 113, 0.2);
            border-left: 3px solid #f48771;
        }

        .feedback-icon {
            font-size: 16px;
            flex-shrink: 0;
        }

        .feedback-content {
            flex: 1;
            color: var(--vscode-foreground);
        }

        /* Code snippet container */
        .code-snippet-container {
            margin: 8px 0;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            overflow: hidden;
        }

        .code-snippet-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 12px;
            background: var(--vscode-button-secondaryBackground);
            border-bottom: 1px solid var(--vscode-panel-border);
            font-size: 11px;
        }

        .code-file {
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .code-lang {
            padding: 2px 6px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-radius: 3px;
            font-size: 10px;
        }

        .code-block {
            margin: 0;
            border-radius: 0;
        }

        .inline-code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-top">
            <div class="header-title">ZEDINARK AI</div>
            <button type="button" class="update-btn" id="updateButton">🔄 Update</button>
        </div>
        <div class="mode-selector">
            <button type="button" class="mode-btn active" data-mode="agent">🤖 Agent</button>
            <button type="button" class="mode-btn" data-mode="ask">💬 Ask</button>
            <button type="button" class="mode-btn" data-mode="edit">✏️ Edit</button>
        </div>
    </div>

    <div class="messages-container" id="messages"></div>

    <div class="input-container">
        <textarea id="messageInput" placeholder="Írj üzenetet... (Shift+Enter új sor)"></textarea>
        <button type="button" class="send-button" id="sendButton">Küldés</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let messagesDiv, messageInput, sendButton, updateButton, modeButtons;
        let currentMode = 'ask';

        function initialize() {
            messagesDiv = document.getElementById('messages');
            messageInput = document.getElementById('messageInput');
            sendButton = document.getElementById('sendButton');
            updateButton = document.getElementById('updateButton');
            modeButtons = document.querySelectorAll('.mode-btn');

            if (!messagesDiv || !messageInput || !sendButton || !updateButton || modeButtons.length === 0) {
                console.error('❌ Elements not found, retrying...');
                setTimeout(initialize, 100);
                return;
            }

            console.log('✅ All elements found, attaching event listeners...');

            // Update button
            updateButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔄 Update button clicked');
                vscode.postMessage({ command: 'checkForUpdates' });
            });

            // Mode buttons
            modeButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    modeButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentMode = btn.dataset.mode;
                    console.log('🔄 Mode changed to:', currentMode);
                    vscode.postMessage({ command: 'switchMode', mode: currentMode });
                });
            });

            // Send button
            sendButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Send button clicked');
                sendMessage();
            });

            // Enter key
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('⌨️ Enter pressed');
                    sendMessage();
                }
            });

            // Auto-resize textarea
            messageInput.addEventListener('input', () => {
                messageInput.style.height = '60px';
                messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
            });

            console.log('✅ Event listeners attached successfully');
        }

        function sendMessage() {
            if (!messageInput || !sendButton) {
                console.error('❌ Elements not available in sendMessage');
                return;
            }

            const text = messageInput.value.trim();
            if (!text) {
                console.log('⚠️ Empty message, returning');
                return;
            }

            console.log('📤 Sending message:', text.substring(0, 50));
            addMessage('user', text);
            messageInput.value = '';
            messageInput.style.height = '60px';
            sendButton.disabled = true;

            vscode.postMessage({
                command: 'sendMessage',
                text: text,
                mode: currentMode
            });
        }


        function addMessage(role, content, metadata) {
            if (!messagesDiv) {
                messagesDiv = document.getElementById('messages');
                if (!messagesDiv) {
                    console.error('❌ Messages container not found');
                    return;
                }
            }

            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + role;
            if (metadata && metadata.id) {
                messageDiv.setAttribute('data-message-id', metadata.id);
            }
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            
            // Markdown-like formatting
            content = escapeHtml(content);
            
            // Code blocks first - escape backticks to avoid template string issues
            const backtick = String.fromCharCode(96);
            const codeBlockPattern = backtick + backtick + backtick + '(\\w+)?\\n?([\\s\\S]*?)' + backtick + backtick + backtick;
            const codeBlockRegex = new RegExp(codeBlockPattern, 'g');
            content = content.replace(codeBlockRegex, function(match, lang, code) {
                const cleanCode = code.trim();
                const langClass = lang ? 'language-' + lang : '';
                return '<pre class="code-block ' + langClass + '"><code>' + cleanCode + '</code></pre>';
            });
            
            // Then inline code (single backticks, but not inside code blocks)
            const inlineCodePattern = backtick + '([^' + backtick + '\\n]+)' + backtick;
            const inlineCodeRegex = new RegExp(inlineCodePattern, 'g');
            content = content.replace(inlineCodeRegex, '<code class="inline-code">$1</code>');
            
            // Finally, replace newlines (but not inside code blocks)
            const codeBlockSplitter = /(<pre[^>]*>[\s\S]*?<\/pre>)/g;
            const parts = content.split(codeBlockSplitter);
            content = parts.map(function(part) {
                if (part.match(/^<pre[^>]*>[\s\S]*?<\/pre>$/)) {
                    return part;
                } else {
                    return part.replace(/\n/g, '<br>');
                }
            }).join('');
            
            contentDiv.innerHTML = content;
            messageDiv.appendChild(contentDiv);
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            return messageDiv;
        }

        function addThinking(content) {
            if (!messagesDiv) return;
            const thinkingDiv = document.createElement('div');
            thinkingDiv.className = 'thinking-container';
            thinkingDiv.innerHTML = '<div class="thinking-icon">💭</div><div class="thinking-content">' + escapeHtml(content) + '</div>';
            messagesDiv.appendChild(thinkingDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function addPlan(content) {
            if (!messagesDiv) return;
            const planDiv = document.createElement('div');
            planDiv.className = 'plan-container';
            planDiv.innerHTML = '<div class="plan-header">📋 Terv</div><div class="plan-content">' + formatMarkdown(content) + '</div>';
            messagesDiv.appendChild(planDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function addTodoList(todos) {
            if (!messagesDiv) return;
            const todoDiv = document.createElement('div');
            todoDiv.className = 'todo-container';
            const header = '<div class="todo-header">📝 To-Do Lista</div>';
            const list = '<ul class="todo-list">' + todos.map(todo => {
                const priorityClass = 'priority-' + todo.priority;
                const checked = todo.completed ? 'checked' : '';
                return '<li class="todo-item ' + priorityClass + ' ' + checked + '" data-id="' + todo.id + '">' +
                    '<input type="checkbox" ' + (todo.completed ? 'checked' : '') + ' disabled>' +
                    '<span class="todo-text">' + escapeHtml(todo.task) + '</span>' +
                    '<span class="todo-priority">' + getPriorityLabel(todo.priority) + '</span>' +
                    '</li>';
            }).join('') + '</ul>';
            todoDiv.innerHTML = header + list;
            messagesDiv.appendChild(todoDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function addFeedback(content, type) {
            if (!messagesDiv) return;
            const feedbackDiv = document.createElement('div');
            feedbackDiv.className = 'feedback feedback-' + type;
            const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
            feedbackDiv.innerHTML = '<span class="feedback-icon">' + (icons[type] || 'ℹ️') + '</span><span class="feedback-content">' + escapeHtml(content) + '</span>';
            messagesDiv.appendChild(feedbackDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function addCodeSnippet(code, language, filePath) {
            if (!messagesDiv) return;
            const snippetDiv = document.createElement('div');
            snippetDiv.className = 'code-snippet-container';
            const header = filePath ? '<div class="code-snippet-header"><span class="code-file">📄 ' + escapeHtml(filePath) + '</span><span class="code-lang">' + escapeHtml(language) + '</span></div>' : '';
            snippetDiv.innerHTML = header + '<pre class="code-block language-' + escapeHtml(language) + '"><code>' + escapeHtml(code) + '</code></pre>';
            messagesDiv.appendChild(snippetDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function formatMarkdown(text) {
            text = escapeHtml(text);
            const backtick = String.fromCharCode(96);
            text = text.replace(new RegExp(backtick + backtick + backtick + '(\\w+)?\\n?([\\s\\S]*?)' + backtick + backtick + backtick, 'g'), '<pre><code>$2</code></pre>');
            text = text.replace(new RegExp(backtick + '([^' + backtick + ']+)' + backtick, 'g'), '<code>$1</code>');
            text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
            text = text.replace(/\n/g, '<br>');
            return text;
        }

        function getPriorityLabel(priority) {
            const labels = { high: '🔴 Magas', medium: '🟡 Közepes', low: '🟢 Alacsony' };
            return labels[priority] || '';
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'receiveMessage':
                    addMessage('assistant', message.response);
                    if (sendButton) sendButton.disabled = false;
                    if (messageInput) messageInput.focus();
                    break;
                case 'error':
                    addMessage('assistant', '❌ Hiba: ' + message.error);
                    if (sendButton) sendButton.disabled = false;
                    if (messageInput) messageInput.focus();
                    break;
                case 'loading':
                    if (!messagesDiv) {
                        messagesDiv = document.getElementById('messages');
                    }
                    if (message.loading) {
                        const loadingDiv = document.createElement('div');
                        loadingDiv.className = 'loading';
                        loadingDiv.id = 'loading';
                        loadingDiv.innerHTML = '<div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div><span>AI gondolkodik...</span>';
                        if (messagesDiv) {
                            messagesDiv.appendChild(loadingDiv);
                            messagesDiv.scrollTop = messagesDiv.scrollHeight;
                        }
                    } else {
                        const loading = document.getElementById('loading');
                        if (loading) loading.remove();
                    }
                    break;
                case 'fileCreated':
                    addMessage('assistant', '✅ Fájl létrehozva: ' + message.filePath);
                    break;
                case 'thinking':
                    addThinking(message.content);
                    break;
                case 'plan':
                    addPlan(message.content);
                    break;
                case 'todoList':
                    addTodoList(message.todos);
                    break;
                case 'feedback':
                    addFeedback(message.content, message.type || 'info');
                    break;
                case 'codeSnippet':
                    addCodeSnippet(message.code, message.language, message.filePath);
                    break;
            }
        });

        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
        } else {
            initialize();
        }

        // Also try after a short delay
        setTimeout(initialize, 100);
    </script>
</body>
</html>`;
    }
}
