import * as vscode from 'vscode';
import { ZedinArkAPI } from './api';
import { ChatPanel } from './chatPanel';

let api: ZedinArkAPI;

export function activate(context: vscode.ExtensionContext) {
    console.log('ZedinArk Manager extension is now active!');

    // API inicializálása
    const config = vscode.workspace.getConfiguration('zedinark');
    const apiUrl = config.get<string>('apiUrl', 'http://135.181.165.27:8000');
    const apiKey = config.get<string>('apiKey', '');
    
    api = new ZedinArkAPI(apiUrl, apiKey);

    // Commandok regisztrálása
    const connectCommand = vscode.commands.registerCommand('zedinark.connect', async () => {
        const url = await vscode.window.showInputBox({
            prompt: 'Enter ZedinArk API URL',
            value: apiUrl,
            placeHolder: 'http://localhost:8000'
        });
        
        if (url) {
            await config.update('apiUrl', url, vscode.ConfigurationTarget.Global);
            api = new ZedinArkAPI(url, apiKey);
            vscode.window.showInformationMessage(`Connected to: ${url}`);
        }
    });

    // Chat ablak megnyitása
    const chatPanelCommand = vscode.commands.registerCommand('zedinark.chatPanel', () => {
        ChatPanel.createOrShow(api);
    });

    const chatCommand = vscode.commands.registerCommand('zedinark.chat', async () => {
        const message = await vscode.window.showInputBox({
            prompt: 'Message to AI',
            placeHolder: 'Enter your message...'
        });
        
        if (message) {
            try {
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "ZedinArk",
                    cancellable: false
                }, async (progress) => {
                    progress.report({ message: "Sending message..." });
                    const response = await api.chat(message);
                    vscode.window.showInformationMessage(response);
                });
            } catch (error: any) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            }
        }
    });

    const generateCommand = vscode.commands.registerCommand('zedinark.generate', async () => {
        const prompt = await vscode.window.showInputBox({
            prompt: 'What code should I generate?',
            placeHolder: 'e.g., Python function to calculate factorial'
        });
        
        if (prompt) {
            const language = await vscode.window.showQuickPick(
                ['python', 'javascript', 'typescript', 'java', 'cpp', 'rust', 'go'],
                { placeHolder: 'Select language' }
            );
            
            if (language) {
                try {
                    vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: "ZedinArk",
                        cancellable: false
                    }, async (progress) => {
                        progress.report({ message: "Generating code..." });
                        const result = await api.generateCode(prompt, language);
                        
                        if (result.code) {
                            // Kód beillesztése aktív editorba
                            const editor = vscode.window.activeTextEditor;
                            if (editor) {
                                editor.edit(editBuilder => {
                                    editBuilder.insert(editor.selection.active, result.code);
                                });
                            } else {
                                // Új fájl létrehozása
                                const doc = await vscode.workspace.openTextDocument({
                                    content: result.code,
                                    language: language
                                });
                                await vscode.window.showTextDocument(doc);
                            }
                            vscode.window.showInformationMessage('Code generated!');
                        }
                    });
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Error: ${error.message}`);
                }
            }
        }
    });

    const explainCommand = vscode.commands.registerCommand('zedinark.explain', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const selection = editor.selection;
        const code = editor.document.getText(selection.isEmpty ? undefined : selection);
        
        if (!code) {
            vscode.window.showErrorMessage('No code selected');
            return;
        }

        try {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "ZedinArk",
                cancellable: false
            }, async (progress) => {
                progress.report({ message: "Explaining code..." });
                
                // Kód mentése temp fájlba
                const uri = editor.document.uri;
                const filePath = uri.fsPath;
                
                const result = await api.explainCode(filePath);
                
                // Új dokumentum megnyitása a magyarázattal
                const doc = await vscode.workspace.openTextDocument({
                    content: `# Code Explanation\n\n${result.explanation}`,
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    });

    const refactorCommand = vscode.commands.registerCommand('zedinark.refactor', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const refactorType = await vscode.window.showQuickPick(
            ['clean', 'optimize', 'modernize'],
            { placeHolder: 'Select refactor type' }
        );
        
        if (refactorType) {
            try {
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "ZedinArk",
                    cancellable: false
                }, async (progress) => {
                    progress.report({ message: "Refactoring code..." });
                    
                    const uri = editor.document.uri;
                    const filePath = uri.fsPath;
                    
                    const result = await api.refactorCode(filePath, refactorType);
                    
                    if (result.code) {
                        // Kód cseréje
                        const fullRange = new vscode.Range(
                            editor.document.positionAt(0),
                            editor.document.positionAt(editor.document.getText().length)
                        );
                        
                        editor.edit(editBuilder => {
                            editBuilder.replace(fullRange, result.code);
                        });
                        
                        vscode.window.showInformationMessage('Code refactored!');
                    }
                });
            } catch (error: any) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            }
        }
    });

    context.subscriptions.push(connectCommand, chatCommand, chatPanelCommand, generateCommand, explainCommand, refactorCommand);
}

export function deactivate() {}

