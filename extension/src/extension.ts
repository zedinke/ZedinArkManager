import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { ZedinArkAPI } from './api';
import { ChatPanel } from './chatPanel';
import { SidebarChatViewProvider } from './sidebarChatView';

let api: ZedinArkAPI;

export function activate(context: vscode.ExtensionContext) {
    console.log('ZedinArk Manager extension is now active!');

    // API inicializálása
    const config = vscode.workspace.getConfiguration('zedinark');
    const apiUrl = config.get<string>('apiUrl', 'http://135.181.165.27:8000');
    const apiKey = config.get<string>('apiKey', '');
    
    api = new ZedinArkAPI(apiUrl, apiKey);

    // Sidebar chat view - regisztrálás azonnal
    console.log('Registering sidebar view provider...');
    try {
        const sidebarProvider = new SidebarChatViewProvider(context.extensionUri, api);
        const viewId = 'zedinarkChatView';
        console.log('View ID:', viewId);
        console.log('Provider:', sidebarProvider);
        
        const providerRegistration = vscode.window.registerWebviewViewProvider(
            viewId,
            sidebarProvider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                }
            }
        );
        context.subscriptions.push(providerRegistration);
        console.log('Sidebar view provider registered successfully:', viewId);
    } catch (error) {
        console.error('Error registering sidebar view provider:', error);
        vscode.window.showErrorMessage(`Failed to register sidebar view: ${error}`);
    }

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

    // Chat ablak megnyitása (sidebar pozícióban)
    const chatPanelCommand = vscode.commands.registerCommand('zedinark.chatPanel', () => {
        ChatPanel.createOrShow(api);
    });

    // Sidebar chat megnyitása (új command - ChatPanel-t használ)
    const sidebarChatCommand = vscode.commands.registerCommand('zedinark.sidebarChat', () => {
        // ChatPanel-t használunk, ami már működik
        ChatPanel.createOrShow(api, vscode.ViewColumn.Beside);
        vscode.window.showInformationMessage('ZedinArk Chat megnyitva!');
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

    // Update command
    const updateCommand = vscode.commands.registerCommand('zedinark.update', async () => {
        await checkAndUpdateExtension(context);
    });

    context.subscriptions.push(connectCommand, chatCommand, chatPanelCommand, sidebarChatCommand, generateCommand, explainCommand, refactorCommand, updateCommand);
}

async function checkAndUpdateExtension(context: vscode.ExtensionContext) {
    try {
        const extension = vscode.extensions.getExtension('zedinke.zedinark-manager');
        if (!extension) {
            vscode.window.showErrorMessage('Extension not found!');
            return;
        }

        const currentVersion = extension.packageJSON.version;
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "ZedinArk: Checking for Updates",
            cancellable: false
        }, async (progress) => {
            progress.report({ message: "Checking GitHub for latest version..." });

            try {
                // GitHub API - get latest release
                const response = await axios.get('https://api.github.com/repos/zedinke/ZedinArkManager/releases/latest', {
                    timeout: 10000
                });

                const latestVersion = response.data.tag_name.replace(/^v/, ''); // Remove 'v' prefix if exists
                const latestVsixUrl = response.data.assets.find((asset: any) => 
                    asset.name.endsWith('.vsix')
                )?.browser_download_url;

                if (!latestVsixUrl) {
                    vscode.window.showWarningMessage('No VSIX file found in latest release. Please update manually from GitHub.');
                    return;
                }

                // Compare versions
                const needsUpdate = compareVersions(latestVersion, currentVersion) > 0;

                if (!needsUpdate) {
                    vscode.window.showInformationMessage(`You are already using the latest version (${currentVersion})!`);
                    return;
                }

                // Ask user if they want to update
                const updateAction = await vscode.window.showInformationMessage(
                    `Update available!\nCurrent: ${currentVersion}\nLatest: ${latestVersion}\n\nDownload and install now?`,
                    'Yes, Update',
                    'Download Only',
                    'Cancel'
                );

                if (updateAction === 'Cancel') {
                    return;
                }

                progress.report({ message: "Downloading update..." });

                // Download VSIX to temp folder
                const tempDir = context.globalStorageUri.fsPath;
                const tempPath = path.join(tempDir, `zedinark-manager-${latestVersion}.vsix`);

                // Ensure temp directory exists
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }

                // Download file
                const fileResponse = await axios({
                    url: latestVsixUrl,
                    method: 'GET',
                    responseType: 'stream',
                    timeout: 60000
                });

                const writer = fs.createWriteStream(tempPath);
                fileResponse.data.pipe(writer);

                await new Promise<void>((resolve, reject) => {
                    writer.on('finish', () => resolve());
                    writer.on('error', (err: any) => reject(err));
                });

                if (updateAction === 'Download Only') {
                    vscode.window.showInformationMessage(
                        `VSIX downloaded to: ${tempPath}\n\nPlease install manually: Extensions → ⋮ → Install from VSIX...`,
                        'Open File Location'
                    ).then(action => {
                        if (action === 'Open File Location') {
                            vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(tempPath));
                        }
                    });
                    return;
                }

                // Install update
                progress.report({ message: "Installing update..." });

                // Open VSIX file (VS Code will handle installation)
                const uri = vscode.Uri.file(tempPath);
                await vscode.commands.executeCommand('revealFileInOS', uri);
                
                vscode.window.showInformationMessage(
                    `Update downloaded!\n\nTo install:\n1. Go to Extensions (Ctrl+Shift+X)\n2. Click ⋮ (three dots)\n3. Select "Install from VSIX..."\n4. Choose: ${path.basename(tempPath)}\n\nOr click below to open the file location.`,
                    'Open File Location',
                    'Install Now'
                ).then(action => {
                    if (action === 'Open File Location') {
                        vscode.commands.executeCommand('revealFileInOS', uri);
                    } else if (action === 'Install Now') {
                        // Try to install via command
                        vscode.window.showInformationMessage(
                            'Please install manually:\nExtensions → ⋮ → Install from VSIX...',
                            'Got it'
                        );
                    }
                });

            } catch (error: any) {
                console.error('Update check error:', error);
                if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
                    vscode.window.showErrorMessage('Could not check for updates: No internet connection or GitHub is unreachable.');
                } else {
                    vscode.window.showErrorMessage(`Error checking for updates: ${error.message}`);
                }
            }
        });
    } catch (error: any) {
        vscode.window.showErrorMessage(`Update error: ${error.message}`);
    }
}

function compareVersions(version1: string, version2: string): number {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
        const v1part = v1parts[i] || 0;
        const v2part = v2parts[i] || 0;
        
        if (v1part > v2part) return 1;
        if (v1part < v2part) return -1;
    }
    
    return 0;
}

export function deactivate() {}

