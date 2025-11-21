import axios, { AxiosInstance } from 'axios';

export class ZedinArkAPI {
    private client: AxiosInstance;
    private apiKey: string;

    constructor(baseURL: string, apiKey: string = '') {
        this.apiKey = apiKey;
        this.client = axios.create({
            baseURL,
            timeout: 60000, // 60 másodperc timeout
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey && { 'X-API-Key': apiKey })
            }
        });
    }

    async healthCheck(): Promise<any> {
        try {
            const response = await this.client.get('/health');
            return response.data;
        } catch (error: any) {
            throw new Error(`Health check failed: ${error.message}`);
        }
    }

    async chat(message: string, model?: string): Promise<string> {
        try {
            const response = await this.client.post('/api/chat', {
                messages: [{ role: 'user', content: message }],
                model: model
            });
            return response.data.response || '';
        } catch (error: any) {
            throw new Error(`Chat failed: ${error.response?.data?.detail || error.message}`);
        }
    }

    async generateCode(prompt: string, language: string = 'python', model?: string): Promise<any> {
        try {
            const response = await this.client.post('/api/generate', {
                prompt,
                language,
                model: model,
                auto_save: false
            });
            return response.data;
        } catch (error: any) {
            throw new Error(`Code generation failed: ${error.response?.data?.detail || error.message}`);
        }
    }

    async explainCode(filePath: string, model?: string): Promise<any> {
        try {
            const response = await this.client.get(`/api/explain/${encodeURIComponent(filePath)}`, {
                params: { model }
            });
            return response.data;
        } catch (error: any) {
            throw new Error(`Explain failed: ${error.response?.data?.detail || error.message}`);
        }
    }

    async refactorCode(filePath: string, refactorType: string = 'clean', model?: string): Promise<any> {
        try {
            const response = await this.client.post('/api/refactor', {
                file_path: filePath,
                refactor_type: refactorType,
                model: model
            });
            return response.data;
        } catch (error: any) {
            throw new Error(`Refactor failed: ${error.response?.data?.detail || error.message}`);
        }
    }

    async editCode(filePath: string, instruction: string, model?: string): Promise<any> {
        try {
            const response = await this.client.post('/api/edit', {
                file_path: filePath,
                instruction,
                model: model
            });
            return response.data;
        } catch (error: any) {
            throw new Error(`Edit failed: ${error.response?.data?.detail || error.message}`);
        }
    }

    async listModels(): Promise<string[]> {
        try {
            const response = await this.client.get('/api/models');
            return response.data.models || [];
        } catch (error: any) {
            throw new Error(`List models failed: ${error.message}`);
        }
    }

    async chatWithHistory(messages: Array<{role: string, content: string}>, model?: string): Promise<string> {
        try {
            const response = await this.client.post('/api/chat', {
                messages: messages,
                model: model
            });
            return response.data.response || '';
        } catch (error: any) {
            throw new Error(`Chat failed: ${error.response?.data?.detail || error.message}`);
        }
    }

    async analyzeImage(imageData: string, prompt: string, model?: string): Promise<string> {
        try {
            const response = await this.client.post('/api/vision', {
                image: imageData,
                prompt: prompt,
                model: model || 'llava'
            });
            return response.data.response || '';
        } catch (error: any) {
            // Ha nincs vision endpoint, egyszerű válasz
            if (error.response?.status === 404) {
                return `Kép feltöltve. Vision model még nincs implementálva a backend-en.`;
            }
            throw new Error(`Image analysis failed: ${error.response?.data?.detail || error.message}`);
        }
    }

    setApiKey(apiKey: string) {
        this.apiKey = apiKey;
        this.client.defaults.headers['X-API-Key'] = apiKey;
    }
}

