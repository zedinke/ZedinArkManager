import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ZedinArkAPI } from './api';

interface Model {
    id: string;
    name: string;
    provider: string;
    enabled: boolean;
}

export class SidebarChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'zedinarkChatView';
    private _view?: vscode.WebviewView;
    private api: ZedinArkAPI;
    private currentModel: string = 'default';
    private availableModels: Model[] = [];
    private conversationHistory: Array<{role: string, content: string}> = [];

    constructor(
        private readonly _extensionUri: vscode.Uri,
        api: ZedinArkAPI
    ) {
        this.api = api;
        this.loadModels();
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
                case 'switchModel':
                    this.currentModel = message.model;
                    this.updateModel();
                    break;
                case 'loadModels':
                    await this.loadModels();
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
            const models = await this.api.listModels();
            // Handle both string[] and object[] formats
            this.availableModels = models.map((m: any) => {
                if (typeof m === 'string') {
                    return {
                        id: m,
                        name: m,
                        provider: 'default',
                        enabled: true
                    };
                } else {
                    return {
                        id: m.id || m.name || 'default',
                        name: m.name || m.id || 'Default',
                        provider: m.provider || 'default',
                        enabled: m.enabled !== false
                    };
                }
            });
            
            if (this.availableModels.length === 0) {
                this.availableModels = [{ id: 'default', name: 'Default Model', provider: 'default', enabled: true }];
            }
            
            if (!this.currentModel || !this.availableModels.find(m => m.id === this.currentModel)) {
                this.currentModel = this.availableModels[0].id;
            }
            
            this._view?.webview.postMessage({
                command: 'modelsLoaded',
                models: this.availableModels,
                currentModel: this.currentModel
            });
        } catch (error) {
            console.error('Error loading models:', error);
            this.availableModels = [{ id: 'default', name: 'Default Model', provider: 'default', enabled: true }];
            this.currentModel = 'default';
            this._view?.webview.postMessage({
                command: 'modelsLoaded',
                models: this.availableModels,
                currentModel: this.currentModel
            });
        }
    }

    private updateModel() {
        this._view?.webview.postMessage({
            command: 'modelChanged',
            model: this.currentModel
        });
    }

    private async handleMessage(text: string, model?: string) {
        if (!this._view) return;

        const selectedModel = model || this.currentModel;
        this.conversationHistory.push({ role: 'user', content: text });

        try {
            // Show thinking
            this.postThinking('Elemezem a kérdést...');

            // Show plan
            setTimeout(() => {
                this.postPlan('1. Üzenet értelmezése\n2. Válasz generálása\n3. Eredmény visszaküldése');
            }, 500);

            this._view.webview.postMessage({
                command: 'loading',
                loading: true
            });

            const response = await this.api.chat(text, selectedModel);
            
            this.conversationHistory.push({ role: 'assistant', content: response });

            this._view.webview.postMessage({
                command: 'receiveMessage',
                response: response,
                model: selectedModel
            });

            // Extract and show code snippets if any
            this.extractAndShowCodeSnippets(response);

        } catch (error: any) {
            this.postFeedback(`Hiba történt: ${error.message}`, 'error');
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

    private extractAndShowCodeSnippets(response: string) {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;
        let index = 0;
        
        while ((match = codeBlockRegex.exec(response)) !== null) {
            const language = match[1] || 'text';
            const code = match[2].trim();
            if (code.length > 0) {
                this.postCodeSnippet(code, language, `snippet-${index++}.${language}`);
            }
        }
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

    private _getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZedinArk AI Chat</title>
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
            font-size: 14px;
        }

        .model-selector {
            margin-bottom: 8px;
        }

        .model-select {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
        }

        .action-buttons {
            display: flex;
            gap: 4px;
        }

        .action-btn {
            padding: 4px 8px;
            border: 1px solid var(--vscode-button-border);
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }

        .action-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            min-height: 0;
        }

        .message {
            display: flex;
            flex-direction: column;
            gap: 6px;
            animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .message.user {
            align-items: flex-end;
        }

        .message.assistant {
            align-items: flex-start;
        }

        .message-header {
            font-size: 11px;
            opacity: 0.7;
            font-weight: 500;
            padding: 0 4px;
        }

        .message-content {
            max-width: 90%;
            padding: 12px 16px;
            border-radius: 12px;
            word-wrap: break-word;
            line-height: 1.6;
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
            max-height: calc(1.5em * 10 + 24px);
            overflow-y: auto;
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
        }

        .message-content code:not(pre code) {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
            font-size: 0.9em;
        }

        .thinking-container {
            display: flex;
            gap: 10px;
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

        .feedback {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 12px;
            margin: 8px 0;
            border-radius: 6px;
            font-size: 13px;
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

        .input-container {
            padding: 12px;
            border-top: 1px solid var(--vscode-panel-border);
            background: var(--vscode-sideBar-background);
            flex-shrink: 0;
        }

        .input-wrapper {
            display: flex;
            gap: 8px;
            align-items: flex-end;
        }

        #messageInput {
            flex: 1;
            padding: 10px 12px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 6px;
            font-size: 13px;
            resize: none;
            min-height: 44px;
            max-height: 200px;
            font-family: inherit;
            line-height: 1.5;
        }

        #messageInput:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
        }

        .send-button {
            padding: 10px 20px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            min-width: 80px;
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
            padding: 12px;
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
        }

        .loading-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--vscode-descriptionForeground);
            animation: pulse 1.4s ease-in-out infinite;
        }

        .loading-dot:nth-child(2) { animation-delay: 0.2s; }
        .loading-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes pulse {
            0%, 80%, 100% { opacity: 0.3; }
            40% { opacity: 1; }
        }

        pre::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }

        pre::-webkit-scrollbar-track {
            background: var(--vscode-scrollbarSlider-background, transparent);
            border-radius: 4px;
        }

        pre::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-hoverBackground, var(--vscode-descriptionForeground));
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-top">
            <div class="header-title">ZedinArk AI</div>
            <div class="action-buttons">
                <button type="button" class="action-btn" id="clearBtn">🗑️ Törlés</button>
                <button type="button" class="action-btn" id="refreshBtn">🔄 Frissítés</button>
            </div>
        </div>
        <div class="model-selector">
            <select id="modelSelect" class="model-select">
                <option value="loading">Modellek betöltése...</option>
            </select>
        </div>
    </div>

    <div class="messages-container" id="messages"></div>

    <div class="input-container">
        <div class="input-wrapper">
            <textarea id="messageInput" placeholder="Írj üzenetet... (Shift+Enter új sor)"></textarea>
            <button type="button" class="send-button" id="sendButton">Küldés</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let messagesDiv, messageInput, sendButton, modelSelect, clearBtn, refreshBtn;
        let currentModel = 'default';
        let models = [];

        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
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

        let initialized = false;

        function initialize() {
            console.log('🔧 Initializing...');
            messagesDiv = document.getElementById('messages');
            messageInput = document.getElementById('messageInput');
            sendButton = document.getElementById('sendButton');
            modelSelect = document.getElementById('modelSelect');
            clearBtn = document.getElementById('clearBtn');
            refreshBtn = document.getElementById('refreshBtn');

            console.log('📦 Elements:', {
                messagesDiv: !!messagesDiv,
                messageInput: !!messageInput,
                sendButton: !!sendButton,
                modelSelect: !!modelSelect,
                clearBtn: !!clearBtn,
                refreshBtn: !!refreshBtn
            });

            if (!messagesDiv || !messageInput || !sendButton || !modelSelect || !clearBtn || !refreshBtn) {
                console.warn('⚠️ Some elements not found, retrying...');
                setTimeout(initialize, 100);
                return;
            }

            if (initialized) {
                console.log('⚠️ Already initialized');
                return;
            }

            // Remove old listeners by cloning elements
            const newSendButton = sendButton.cloneNode(true);
            sendButton.parentNode.replaceChild(newSendButton, sendButton);
            sendButton = newSendButton;

            const newMessageInput = messageInput.cloneNode(true);
            messageInput.parentNode.replaceChild(newMessageInput, messageInput);
            messageInput = newMessageInput;

            // Event listeners
            sendButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Send button clicked');
                sendMessage();
            });

            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('⌨️ Enter pressed');
                    sendMessage();
                }
            });

            messageInput.addEventListener('input', () => {
                messageInput.style.height = '44px';
                messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
            });

            modelSelect.addEventListener('change', (e) => {
                currentModel = e.target.value;
                console.log('🔄 Model changed to:', currentModel);
                vscode.postMessage({ command: 'switchModel', model: currentModel });
            });

            clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🗑️ Clear button clicked');
                if (confirm('Biztosan törölni szeretnéd a chat történetet?')) {
                    vscode.postMessage({ command: 'clearChat' });
                }
            });

            refreshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔄 Refresh button clicked');
                vscode.postMessage({ command: 'loadModels' });
            });

            initialized = true;
            console.log('✅ Initialization complete');

            // Request models
            vscode.postMessage({ command: 'loadModels' });
        }

        function sendMessage() {
            console.log('📤 sendMessage called');
            if (!messageInput || !sendButton) {
                console.error('❌ Elements not available:', { messageInput: !!messageInput, sendButton: !!sendButton });
                return;
            }
            
            const text = messageInput.value.trim();
            if (!text) {
                console.log('⚠️ Empty message');
                return;
            }

            console.log('📝 Sending message:', text.substring(0, 50));
            addMessage('user', text);
            messageInput.value = '';
            messageInput.style.height = '44px';
            sendButton.disabled = true;

            console.log('📨 Posting to vscode:', { command: 'sendMessage', text: text.substring(0, 50), model: currentModel });
            vscode.postMessage({
                command: 'sendMessage',
                text: text,
                model: currentModel
            });
            console.log('✅ Message posted');
        }

        function addMessage(role, content) {
            if (!messagesDiv) {
                messagesDiv = document.getElementById('messages');
                if (!messagesDiv) return;
            }

            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + role;
            
            const headerDiv = document.createElement('div');
            headerDiv.className = 'message-header';
            headerDiv.textContent = role === 'user' ? 'Te' : 'ZedinArk AI';
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.innerHTML = formatMarkdown(content);
            
            messageDiv.appendChild(headerDiv);
            messageDiv.appendChild(contentDiv);
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function addThinking(content) {
            if (!messagesDiv) return;
            const div = document.createElement('div');
            div.className = 'thinking-container';
            div.innerHTML = '<div class="thinking-icon">💭</div><div class="thinking-content">' + escapeHtml(content) + '</div>';
            messagesDiv.appendChild(div);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function addPlan(content) {
            if (!messagesDiv) return;
            const div = document.createElement('div');
            div.className = 'plan-container';
            div.innerHTML = '<div class="plan-header">📋 Terv</div><div class="plan-content">' + formatMarkdown(content) + '</div>';
            messagesDiv.appendChild(div);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function addFeedback(content, type) {
            if (!messagesDiv) return;
            const div = document.createElement('div');
            div.className = 'feedback feedback-' + type;
            const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
            div.innerHTML = '<span class="feedback-icon">' + (icons[type] || 'ℹ️') + '</span><span class="feedback-content">' + escapeHtml(content) + '</span>';
            messagesDiv.appendChild(div);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function addCodeSnippet(code, language, filePath) {
            if (!messagesDiv) return;
            const div = document.createElement('div');
            div.className = 'code-snippet-container';
            const header = filePath ? '<div class="code-snippet-header"><span class="code-file">📄 ' + escapeHtml(filePath) + '</span><span class="code-lang">' + escapeHtml(language) + '</span></div>' : '';
            div.innerHTML = header + '<pre><code>' + escapeHtml(code) + '</code></pre>';
            messagesDiv.appendChild(div);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
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
                    addFeedback('Hiba: ' + message.error, 'error');
                    if (sendButton) sendButton.disabled = false;
                    if (messageInput) messageInput.focus();
                    break;
                case 'loading':
                    if (!messagesDiv) messagesDiv = document.getElementById('messages');
                    if (message.loading) {
                        const div = document.createElement('div');
                        div.className = 'loading';
                        div.id = 'loading';
                        div.innerHTML = '<div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div><span>AI gondolkodik...</span>';
                        if (messagesDiv) {
                            messagesDiv.appendChild(div);
                            messagesDiv.scrollTop = messagesDiv.scrollHeight;
                        }
                    } else {
                        const loading = document.getElementById('loading');
                        if (loading) loading.remove();
                    }
                    break;
                case 'modelsLoaded':
                    models = message.models || [];
                    currentModel = message.currentModel || (models[0] && models[0].id) || 'default';
                    var optionsHtml = '';
                    for (var i = 0; i < models.length; i++) {
                        var m = models[i];
                        var selected = m.id === currentModel ? 'selected' : '';
                        var name = escapeHtml(m.name);
                        var provider = escapeHtml(m.provider);
                        optionsHtml += '<option value="' + m.id + '" ' + selected + '>' + name + ' (' + provider + ')</option>';
                    }
                    modelSelect.innerHTML = optionsHtml;
                    break;
                case 'modelChanged':
                    currentModel = message.model;
                    break;
                case 'chatCleared':
                    if (messagesDiv) messagesDiv.innerHTML = '';
                    break;
                case 'thinking':
                    addThinking(message.content);
                    break;
                case 'plan':
                    addPlan(message.content);
                    break;
                case 'feedback':
                    addFeedback(message.content, message.type || 'info');
                    break;
                case 'codeSnippet':
                    addCodeSnippet(message.code, message.language, message.filePath);
                    break;
            }
        });

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
        } else {
            initialize();
        }
        setTimeout(initialize, 100);
    </script>
</body>
</html>`;
    }
}
