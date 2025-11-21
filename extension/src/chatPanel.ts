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

    public static createOrShow(api: ZedinArkAPI) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'zedinarkChat',
            'ZedinArk Chat',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel, api);
    }

    private async handleMessage(message: string) {
        try {
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
            margin-bottom: 10px;
        }
        .user {
            color: var(--vscode-textLink-foreground);
        }
        .assistant {
            color: var(--vscode-textLink-foreground);
        }
        #input {
            width: 100%;
            padding: 10px;
            border: 1px solid var(--vscode-input-border);
        }
        button {
            padding: 10px 20px;
            margin-top: 10px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            cursor: pointer;
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
            div.textContent = (role === 'user' ? 'Te: ' : 'AI: ') + text;
            messagesDiv.appendChild(div);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        function sendMessage() {
            const message = input.value;
            if (message) {
                addMessage('user', message);
                input.value = '';
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
                    addMessage('assistant', message.response);
                    break;
                case 'error':
                    addMessage('assistant', 'Hiba: ' + message.error);
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}

