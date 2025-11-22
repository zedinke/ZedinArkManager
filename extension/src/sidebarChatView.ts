import * as vscode from 'vscode';
import { ZedinArkAPI } from './api';

export class SidebarChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'zedinarkChatView';
    private _view?: vscode.WebviewView;
    private api: ZedinArkAPI;

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
                    await this.handleMessage(message.text);
                    break;
            }
        });
    }

    private async handleMessage(text: string) {
        if (!this._view) return;

        try {
            this._view.webview.postMessage({
                command: 'loading',
                loading: true
            });

            const response = await this.api.chat(text);

            this._view.webview.postMessage({
                command: 'receiveMessage',
                response: response
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

            function send() {
                const text = input.value.trim();
                if (!text || sendBtn.disabled) return;
                
                addMessage('user', text);
                input.value = '';
                sendBtn.disabled = true;
                
                vscode.postMessage({ command: 'sendMessage', text: text });
            }

            function addMessage(role, text) {
                const div = document.createElement('div');
                div.className = 'message ' + role;
                const content = document.createElement('div');
                content.className = 'message-content';
                
                text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const backtick = String.fromCharCode(96);
                const codeBlockPattern = backtick + backtick + backtick + '([\\s\\S]*?)' + backtick + backtick + backtick;
                text = text.replace(new RegExp(codeBlockPattern, 'g'), '<pre><code>$1</code></pre>');
                const inlineCodePattern = backtick + '([^' + backtick + ']+)' + backtick;
                text = text.replace(new RegExp(inlineCodePattern, 'g'), '<code>$1</code>');
                text = text.replace(/\\n/g, '<br>');
                
                content.innerHTML = text;
                div.appendChild(content);
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

            window.addEventListener('message', function(e) {
                const msg = e.data;
                if (msg.command === 'receiveMessage') {
                    addMessage('assistant', msg.response);
                    sendBtn.disabled = false;
                    input.focus();
                } else if (msg.command === 'error') {
                    addMessage('assistant', 'Hiba: ' + msg.error);
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
                }
            });
        })();
    </script>
</body>
</html>`;
    }
}
