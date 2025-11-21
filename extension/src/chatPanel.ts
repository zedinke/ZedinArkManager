import * as vscode from 'vscode';
import { ZedinArkAPI } from './api';

export class ChatPanel {
    private static currentPanel: ChatPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private api: ZedinArkAPI;

    private constructor(panel: vscode.WebviewPanel, api: ZedinArkAPI) {
        this._panel = panel;
        this.api = api;

        this._panel.webview.html = this._getHtmlForWebview();

        this._panel.onDidDispose(() => ChatPanel.currentPanel = undefined, null);

        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'sendMessage':
                        await this.handleMessage(message.text);
                        return;
                }
            },
            null
        );
    }

    public static createOrShow(api: ZedinArkAPI, viewColumn?: vscode.ViewColumn) {
        const column = viewColumn || (vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined);

        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'zedinarkChat',
            'ZedinArk Chat',
            column || vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel, api);
    }

    private async handleMessage(message: string) {
        try {
            // Loading indicator
            this._panel.webview.postMessage({
                command: 'loading',
                loading: true
            });

            const response = await this.api.chat(message);
            
            this._panel.webview.postMessage({
                command: 'receiveMessage',
                response: response
            });
        } catch (error: any) {
            this._panel.webview.postMessage({
                command: 'error',
                error: error.message
            });
        } finally {
            this._panel.webview.postMessage({
                command: 'loading',
                loading: false
            });
        }
    }

    private _getHtmlForWebview(): string {
        return `<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZedinArk Chat</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
        }
        #messages {
            height: 400px;
            overflow-y: auto;
            border: 1px solid var(--vscode-input-border);
            padding: 10px;
            margin-bottom: 10px;
        }
        .message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 5px;
        }
        .user {
            background: var(--vscode-input-background);
            color: var(--vscode-foreground);
            text-align: right;
        }
        .assistant {
            background: var(--vscode-textBlockQuote-background);
            color: var(--vscode-foreground);
        }
        .loading {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
        #input {
            width: calc(100% - 20px);
            padding: 10px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-size: 14px;
        }
        button {
            padding: 10px 20px;
            margin-top: 10px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            cursor: pointer;
            font-size: 14px;
        }
        button:hover {
            opacity: 0.9;
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div id="messages"></div>
    <input type="text" id="input" placeholder="Írj üzenetet...">
    <button onclick="sendMessage()">Küldés</button>
    
    <script>
        const vscode = acquireVsCodeApi();
        const messagesDiv = document.getElementById('messages');
        const input = document.getElementById('input');
        
        function addMessage(role, text) {
            const div = document.createElement('div');
            div.className = 'message ' + role;
            const prefix = role === 'user' ? 'Te' : 'AI';
            div.innerHTML = '<strong>' + prefix + ':</strong> ' + escapeHtml(text);
            messagesDiv.appendChild(div);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function showLoading(show) {
            const loadingDiv = document.getElementById('loading');
            if (show) {
                if (!loadingDiv) {
                    const div = document.createElement('div');
                    div.id = 'loading';
                    div.className = 'message loading';
                    div.textContent = 'AI válaszol...';
                    messagesDiv.appendChild(div);
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }
            } else {
                if (loadingDiv) {
                    loadingDiv.remove();
                }
            }
        }
        
        function sendMessage() {
            const message = input.value.trim();
            if (message) {
                addMessage('user', message);
                input.value = '';
                input.disabled = true;
                showLoading(true);
                vscode.postMessage({ command: 'sendMessage', text: message });
            }
        }
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'receiveMessage':
                    showLoading(false);
                    addMessage('assistant', message.response);
                    input.disabled = false;
                    input.focus();
                    break;
                case 'error':
                    showLoading(false);
                    addMessage('assistant', '❌ Hiba: ' + message.error);
                    input.disabled = false;
                    input.focus();
                    break;
                case 'loading':
                    showLoading(message.loading);
                    if (!message.loading) {
                        input.disabled = false;
                        input.focus();
                    }
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}

