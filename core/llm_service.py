"""
LLM Service - Ollama integráció helyi modellekhez
"""
import requests
import json
import os
import multiprocessing
import logging
from typing import List, Dict, Optional, AsyncGenerator
import asyncio
from enum import Enum

logger = logging.getLogger(__name__)


class ModelType(str, Enum):
    """Támogatott modellek"""
    CODELLAMA = "codellama"
    MISTRAL = "mistral"
    LLAMA3 = "llama3"
    LLAMA3_1 = "llama3.1"
    LLAMA3_1_8B = "llama3.1:8b"
    DEEPSEEK_CODER = "deepseek-coder"


class LLMService:
    """Helyi LLM szolgáltatás Ollama-val"""
    
    def __init__(self, base_url: str = "http://localhost:11434", 
                 default_model: str = "llama3.1:8b",
                 num_gpu_layers: Optional[int] = None,
                 num_threads: Optional[int] = None):
        self.base_url = base_url
        self.default_model = default_model
        self.api_url = f"{base_url}/api"
        
        # GPU layer splitting (None = automatikus, vagy konkrét szám)
        self.num_gpu_layers = num_gpu_layers
        
        # CPU thread szám (None = automatikus detektálás)
        # CPU OPTIMALIZÁLT: maximum 70% CPU erőforrás használata
        if num_threads is None:
            env_threads = os.getenv("OLLAMA_NUM_THREADS")
            if env_threads:
                self.num_threads = int(env_threads)
            else:
                # CPU optimalizált: 70% CPU erőforrás használata
                cpu_count = multiprocessing.cpu_count()
                # EPYC 7502P: 32 mag, 64 szál - 70% = ~45 szál
                self.num_threads = int(cpu_count * 0.7)  # 70% CPU erőforrás
                logger.info(f"CPU optimalizált mód: {self.num_threads} CPU thread használata (70% of {cpu_count} cores)")
        else:
            self.num_threads = num_threads
    
    def check_connection(self) -> bool:
        """Ellenőrzi az Ollama kapcsolatot"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return response.status_code == 200
        except Exception:
            return False
    
    def list_models(self) -> List[str]:
        """Listázza a telepített modelleket"""
        try:
            response = requests.get(f"{self.api_url}/tags", timeout=10)
            if response.status_code == 200:
                data = response.json()
                return [model["name"] for model in data.get("models", [])]
            return []
        except Exception:
            return []
    
    def generate(self, prompt: str, model: Optional[str] = None, 
                 context: Optional[str] = None, temperature: float = 0.5,
                 max_tokens: int = 1500) -> str:
        """Szöveg generálás a modellel"""
        model = model or self.default_model
        
        full_prompt = prompt
        if context:
            full_prompt = f"{context}\n\n{prompt}"
        
        # CPU optimalizált options - minden CPU magot használunk
        options = {
            "temperature": temperature,
            "num_predict": max_tokens,
            "num_thread": self.num_threads,  # Minden CPU magot használunk (CPU optimalizált)
        }
        
        # CPU optimalizált mód: GPU-t nem használunk
        if self.num_gpu_layers is not None and self.num_gpu_layers > 0:
            options["num_gpu"] = self.num_gpu_layers
        else:
            # CPU-only mód: GPU layer-ek kikapcsolva
            options["num_gpu"] = 0
        
        # Optimalizált memória beállítások
        options["use_mmap"] = True
        options["use_mlock"] = False  # False = gyorsabb
        options["num_ctx"] = 1024  # Optimalizált context méret
        
        payload = {
            "model": model,
            "prompt": full_prompt,
            "stream": False,
            "options": options
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/generate",
                json=payload,
                timeout=300
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("response", "")
            else:
                raise Exception(f"Ollama API error: {response.status_code}")
        
        except requests.exceptions.RequestException as e:
            raise Exception(f"Ollama connection error: {str(e)}")
    
    async def generate_stream(self, prompt: str, model: Optional[str] = None,
                             context: Optional[str] = None, 
                             temperature: float = 0.7) -> AsyncGenerator[str, None]:
        """Stream generálás (valós idejű válasz)"""
        model = model or self.default_model
        
        full_prompt = prompt
        if context:
            full_prompt = f"{context}\n\n{prompt}"
        
        options = {
            "temperature": temperature,
            "num_thread": self.num_threads,  # Minden CPU magot használunk (CPU optimalizált)
        }
        
        # CPU optimalizált mód: GPU-t nem használunk
        if self.num_gpu_layers is not None and self.num_gpu_layers > 0:
            options["num_gpu"] = self.num_gpu_layers
        else:
            # CPU-only mód: GPU layer-ek kikapcsolva
            options["num_gpu"] = 0
        
        options["use_mmap"] = True
        options["use_mlock"] = True
        
        payload = {
            "model": model,
            "prompt": full_prompt,
            "stream": True,
            "options": options
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/generate",
                json=payload,
                stream=True,
                timeout=300
            )
            
            if response.status_code == 200:
                for line in response.iter_lines():
                    if line:
                        try:
                            data = json.loads(line)
                            if "response" in data:
                                yield data["response"]
                            if data.get("done", False):
                                break
                        except json.JSONDecodeError:
                            continue
            else:
                raise Exception(f"Ollama API error: {response.status_code}")
        
        except Exception as e:
            raise Exception(f"Stream error: {str(e)}")
    
    def chat(self, messages: List[Dict[str, str]], model: Optional[str] = None,
             temperature: float = 0.5) -> str:
        """Chat API használata (több üzenet kontextussal)"""
        model = model or self.default_model
        
        # CPU optimalizált options - minden CPU magot használunk
        options = {
            "temperature": temperature,
            "num_thread": self.num_threads,  # Minden CPU magot használunk (CPU optimalizált)
        }
        
        # CPU optimalizált mód: GPU-t nem használunk
        if self.num_gpu_layers is not None and self.num_gpu_layers > 0:
            options["num_gpu"] = self.num_gpu_layers
        else:
            # CPU-only mód: GPU layer-ek kikapcsolva
            options["num_gpu"] = 0
        
        # Optimalizált memória beállítások
        options["use_mmap"] = True
        options["use_mlock"] = False  # False = gyorsabb, kevesebb memória lock
        options["numa"] = False
        options["low_vram"] = False
        options["num_ctx"] = 2048  # Nagyobb context window (300 sorhoz)
        options["num_predict"] = 2000  # ~300 sor válasz (~2000 token)
        
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": options
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/chat",
                json=payload,
                timeout=300
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "message" in data:
                    content = data["message"].get("content", "")
                    if content:
                        return content
                
                if "response" in data:
                    content = data["response"]
                    if content:
                        return content
                
                return ""
            else:
                error_text = response.text[:500] if response.text else "No error message"
                raise Exception(f"Ollama API error: {response.status_code} - {error_text}")
        
        except requests.exceptions.Timeout:
            raise Exception("Ollama timeout - a modell túl lassan válaszol.")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Ollama connection error: {str(e)}")
    
    async def chat_stream(self, messages: List[Dict[str, str]], 
                         model: Optional[str] = None,
                         temperature: float = 0.7) -> AsyncGenerator[str, None]:
        """Stream chat (valós idejű)"""
        model = model or self.default_model
        
        # Optimalizált options stream-hez (12 CPU mag, 300 sor válasz)
        options = {
            "temperature": temperature,
            "num_thread": self.num_threads,  # Minden CPU magot használunk (CPU optimalizált)
        }
        
        # CPU optimalizált mód: GPU-t nem használunk
        if self.num_gpu_layers is not None and self.num_gpu_layers > 0:
            options["num_gpu"] = self.num_gpu_layers
        else:
            # CPU-only mód: GPU layer-ek kikapcsolva
            options["num_gpu"] = 0
        
        # Optimalizált memória beállítások
        options["use_mmap"] = True
        options["use_mlock"] = False  # False = gyorsabb, kevesebb memória lock
        options["numa"] = False
        options["low_vram"] = False
        options["num_ctx"] = 2048  # Nagyobb context window (300 sorhoz)
        options["num_predict"] = 2000  # ~300 sor válasz (~2000 token)
        
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            "options": options
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/chat",
                json=payload,
                stream=True,
                timeout=300
            )
            
            if response.status_code == 200:
                for line in response.iter_lines():
                    if line:
                        try:
                            data = json.loads(line)
                            if "message" in data and "content" in data["message"]:
                                yield data["message"]["content"]
                            if data.get("done", False):
                                break
                        except (json.JSONDecodeError, KeyError):
                            continue
            else:
                raise Exception(f"Ollama API error: {response.status_code}")
        
        except Exception as e:
            raise Exception(f"Stream error: {str(e)}")

