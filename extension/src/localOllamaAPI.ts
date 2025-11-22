import axios, { AxiosInstance } from 'axios';

/**
 * Lokális Ollama API közvetlen hívásához
 * Ez lehetővé teszi, hogy a VS Code extension közvetlenül a lokális Ollama-t használja
 * a saját GPU-jával, nem pedig a távoli szerver GPU-ját.
 */
export class LocalOllamaAPI {
    private client: AxiosInstance;
    private baseURL: string;

    constructor(baseURL: string = 'http://localhost:11434') {
        this.baseURL = baseURL;
        this.client = axios.create({
            baseURL: `${baseURL}/api`,
            timeout: 300000, // 5 perc timeout (nagy modellek esetén)
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Ellenőrzi, hogy elérhető-e a lokális Ollama
     */
    async checkConnection(): Promise<boolean> {
        try {
            const response = await this.client.get('/tags', { timeout: 5000 });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    /**
     * Listázza a telepített modelleket
     */
    async listModels(): Promise<string[]> {
        try {
            const response = await this.client.get('/tags', { timeout: 10000 });
            if (response.status === 200) {
                const data = response.data;
                return (data.models || []).map((model: any) => model.name);
            }
            return [];
        } catch (error: any) {
            throw new Error(`Failed to list models: ${error.message}`);
        }
    }

    /**
     * Chat üzenet küldése történettel
     */
    async chatWithHistory(messages: Array<{role: string, content: string}>, model?: string): Promise<string> {
        if (!model) {
            throw new Error('Model is required for local Ollama');
        }

        try {
            // Ollama API formátum: /api/chat
            // Az Ollama automatikusan használja a GPU-t, ha elérhető
            const response = await this.client.post('/chat', {
                model: model,
                messages: messages,
                stream: false,
                options: {
                    // GPU használat automatikus (Ollama detektálja a CUDA-t)
                    // További optimalizálások:
                    num_ctx: 4096, // Context window
                    temperature: 0.7,
                    top_p: 0.9,
                    // GPU rétegek automatikus (Ollama dönt)
                    // Ha nincs GPU, CPU-t használ
                }
            }, {
                timeout: 300000 // 5 perc
            });

            if (response.status === 200) {
                const data = response.data;
                // Ollama API válasz formátum: { message: { role: 'assistant', content: '...' } }
                return data.message?.content || data.response || '';
            } else {
                throw new Error(`Ollama API error: ${response.status}`);
            }
        } catch (error: any) {
            if (error.response) {
                const status = error.response.status;
                const data = error.response.data;
                if (status === 404) {
                    throw new Error(`Model '${model}' not found. Install it with: ollama pull ${model}`);
                }
                throw new Error(`Ollama API error: ${status} - ${JSON.stringify(data)}`);
            }
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Ollama nem fut. Indítsd el: ollama serve');
            }
            throw new Error(`Ollama connection error: ${error.message}`);
        }
    }

    /**
     * Egyszerű chat üzenet (egy üzenet)
     */
    async chat(message: string, model?: string): Promise<string> {
        return this.chatWithHistory([{ role: 'user', content: message }], model);
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<any> {
        try {
            const response = await this.client.get('/tags', { timeout: 5000 });
            return {
                status: 'ok',
                ollama_available: response.status === 200
            };
        } catch (error: any) {
            return {
                status: 'error',
                ollama_available: false,
                error: error.message
            };
        }
    }
}

