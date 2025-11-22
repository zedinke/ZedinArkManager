"""
AI Coding Assistant - FastAPI Backend
Helyi LLM modellekkel működő kódolási asszisztens
"""
from fastapi import FastAPI, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uvicorn
import os
import logging
from pathlib import Path

from core.llm_service import LLMService
from core.file_manager import FileManager
from core.response_cache import ResponseCache
from core.project_manager import ProjectManager
from core.conversation_memory import ConversationMemory
from core.auth import api_key_manager, verify_api_key
from core.gpu_manager import gpu_manager
from core.distributed_computing import distributed_network, ComputeNode, NodeStatus
from modules.code_generator import CodeGenerator
from modules.project_context import ProjectContext
from modules.action_executor import ActionExecutor

# Logging beállítás
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Inicializálás
BASE_PATH = os.getenv("PROJECT_BASE_PATH", ".")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "llama3.1:8b")

# CPU OPTIMALIZÁLT MÓD: GPU-t nem használunk, csak CPU-t
NUM_GPU_LAYERS = 0  # GPU kikapcsolva - csak CPU használata

NUM_THREADS = os.getenv("OLLAMA_NUM_THREADS")
if NUM_THREADS:
    NUM_THREADS = int(NUM_THREADS)
else:
    # CPU optimalizált: maximum 70% CPU erőforrás használata
    import multiprocessing
    cpu_count = multiprocessing.cpu_count()
    NUM_THREADS = int(cpu_count * 0.7)  # 70% CPU erőforrás (EPYC 7502P: ~45 szál)
    logger.info(f"CPU optimalizált mód: {NUM_THREADS} CPU thread beállítva (70% of {cpu_count} cores)")

# Szolgáltatások inicializálása
llm_service = LLMService(
    base_url=OLLAMA_URL, 
    default_model=DEFAULT_MODEL,
    num_gpu_layers=NUM_GPU_LAYERS,
    num_threads=NUM_THREADS
)
file_manager = FileManager(base_path=BASE_PATH)
project_manager = ProjectManager(base_path="projects")
code_generator = CodeGenerator(llm_service, file_manager, project_manager)
action_executor = ActionExecutor(file_manager=file_manager, base_path=BASE_PATH)
project_context = ProjectContext(file_manager, base_path=BASE_PATH)
conversation_memory = ConversationMemory(project_name="global", storage_dir="./data/memory")
response_cache = ResponseCache(cache_dir="./data/cache", ttl=1800)

# Szerver automatikus regisztrálása a distributed hálózatba
def register_server_as_node():
    """Szerver automatikus regisztrálása compute node-ként"""
    try:
        import socket
        import multiprocessing
        
        # Szerver információk gyűjtése
        gpu_count = gpu_manager.get_gpu_count()
        gpu_info = gpu_manager.get_all_gpus_status() if gpu_count > 0 else []
        total_gpu_memory = sum(gpu.get("memory_total", 0) for gpu in gpu_info) if gpu_info else 0
        cpu_cores = multiprocessing.cpu_count()
        
        # Szerver modellek lekérése
        try:
            server_models = llm_service.list_models()
        except:
            server_models = []
        
        # Hostname vagy IP
        hostname = socket.gethostname()
        try:
            host_ip = socket.gethostbyname(hostname)
        except:
            host_ip = "localhost"
        
        # Node regisztrálása
        server_node = distributed_network.register_node(
            node_id=f"server-{hostname}",
            user_id="server",
            name=f"Server - {hostname} ({host_ip})",
            ollama_url=OLLAMA_URL,
            api_key=None,
            gpu_count=gpu_count,
            gpu_memory=total_gpu_memory,
            cpu_cores=cpu_cores
        )
        
        # Modellek frissítése
        if server_models:
            distributed_network.update_node_status(
                node_id=server_node.node_id,
                status=NodeStatus.ONLINE,
                available_models=server_models
            )
        
        logger.info(f"Server registered as compute node: {server_node.node_id} "
                   f"(GPU: {gpu_count}, CPU: {cpu_cores}, Models: {len(server_models)})")
        
        return server_node
    except Exception as e:
        logger.warning(f"Failed to register server as node: {e}")
        return None

# Szerver regisztrálása indításkor
server_node = register_server_as_node()

# Distributed network statisztikák kiírása indításkor
def print_distributed_network_info():
    """Kiírja a distributed network információkat indításkor"""
    try:
        stats = distributed_network.get_network_stats()
        available_nodes = distributed_network.get_available_nodes(ignore_model_filter=True)
        
        print("\n" + "="*60)
        print("🌐 DISTRIBUTED COMPUTING NETWORK")
        print("="*60)
        print(f"📊 Összes regisztrált csomópont: {stats['total_nodes']}")
        print(f"✅ Online csomópontok: {stats['online_nodes']}")
        print(f"💻 Összes GPU: {stats['total_gpu']}")
        print(f"🧠 Összes GPU memória: {stats['total_gpu_memory_gb']:.2f} GB")
        print(f"⚙️  Összes CPU mag: {stats['total_cpu_cores']}")
        print(f"🔄 Aktív feladatok: {stats['active_tasks']}")
        print(f"✅ Befejezett feladatok: {stats['completed_tasks']}")
        print("-"*60)
        
        if available_nodes:
            print(f"🚀 Egy kérés {len(available_nodes)} csomóponton lesz futtatva:")
            for i, node in enumerate(available_nodes, 1):
                models_info = f"{len(node.available_models)} modell" if node.available_models else "modell info nélkül"
                print(f"   {i}. {node.name}")
                print(f"      - ID: {node.node_id}")
                print(f"      - GPU: {node.gpu_count}, CPU: {node.cpu_cores}, {models_info}")
                print(f"      - Terhelés: {node.current_load*100:.1f}%, Válaszidő: {node.response_time:.0f}ms")
        else:
            print("⚠️  Nincs elérhető csomópont a distributed computing-hez")
            print("   (A kérések lokálisan lesznek feldolgozva)")
        
        print("="*60 + "\n")
    except Exception as e:
        logger.warning(f"Failed to print distributed network info: {e}")

# Network info kiírása indításkor
print_distributed_network_info()

# FastAPI app
app = FastAPI(
    title="AI Coding Assistant",
    description="Helyi LLM modellekkel működő kódolási asszisztens",
    version="1.0.0"
)

# CORS beállítás
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Éles környezetben korlátozd!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic modellek
class ChatMessage(BaseModel):
    role: str = Field(..., description="Üzenet szerepe: user, assistant, system")
    content: str = Field(..., description="Üzenet tartalma")


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., description="Chat üzenetek")
    model: Optional[str] = Field(None, description="LLM modell neve")
    temperature: float = Field(0.5, ge=0.0, le=2.0, description="Kreativitás")
    auto_save_code: bool = Field(True, description="Automatikus kód mentés")
    use_cache: bool = Field(True, description="Cache használata")


class GenerateCodeRequest(BaseModel):
    prompt: str = Field(..., description="Kód generálási prompt")
    language: str = Field("python", description="Programozási nyelv")
    context_files: Optional[List[str]] = Field(None, description="Kontextus fájlok")
    model: Optional[str] = Field(None, description="LLM modell neve")
    auto_save: bool = Field(True, description="Automatikus mentés fájlba")
    file_path: Optional[str] = Field(None, description="Fájl útvonal")
    use_cache: bool = Field(True, description="Cache használata")


class EditCodeRequest(BaseModel):
    file_path: str = Field(..., description="Szerkesztendő fájl")
    instruction: str = Field(..., description="Szerkesztési utasítás")
    model: Optional[str] = Field(None, description="LLM modell neve")


class RefactorRequest(BaseModel):
    file_path: str = Field(..., description="Refaktorálandó fájl")
    refactor_type: str = Field("clean", description="Refaktorálás típusa")
    model: Optional[str] = Field(None, description="LLM modell neve")


class WriteFileRequest(BaseModel):
    file_path: str = Field(..., description="Fájl útvonal")
    content: str = Field(..., description="Fájl tartalma")
    create_dirs: bool = Field(True, description="Könyvtárak létrehozása")


class CreateProjectRequest(BaseModel):
    name: str = Field(..., description="Projekt neve")
    type: str = Field("general", description="Projekt típus")
    description: str = Field("", description="Projekt leírás")


class SelectProjectRequest(BaseModel):
    name: str = Field(..., description="Projekt neve")


class VisionRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image")
    prompt: str = Field(..., description="Prompt for image analysis")
    model: Optional[str] = Field(None, description="Vision model name (e.g., llava)")


# API Endpoints
@app.get("/")
async def root():
    """Root endpoint (autentikáció nélkül)"""
    return {
        "message": "AI Coding Assistant API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "models": "/api/models",
            "chat": "/api/chat (POST only)",
            "generate": "/api/generate",
            "edit": "/api/edit",
            "explain": "/api/explain",
            "refactor": "/api/refactor",
            "files": "/api/files",
            "projects": "/api/projects",
            "auth": "/api/auth"
        },
        "auth_enabled": os.getenv("ENABLE_AUTH", "false").lower() == "true",
        "note": "A böngészőben használd a /docs oldalt az API teszteléséhez! Az /api/chat csak POST kérést fogad el."
    }


@app.get("/health")
async def health_check():
    """Health check endpoint (autentikáció nélkül)"""
    ollama_connected = llm_service.check_connection()
    gpu_count = gpu_manager.get_gpu_count()
    
    # Szerver node állapot frissítése
    if server_node:
        try:
            server_models = llm_service.list_models()
            distributed_network.update_node_status(
                node_id=server_node.node_id,
                status=NodeStatus.ONLINE if ollama_connected else NodeStatus.OFFLINE,
                available_models=server_models,
                current_load=0.0  # TODO: valós terhelés mérése
            )
        except:
            pass
    
    return {
        "status": "healthy" if ollama_connected else "degraded",
        "ollama_connected": ollama_connected,
        "base_path": BASE_PATH,
        "default_model": DEFAULT_MODEL,
        "auth_enabled": os.getenv("ENABLE_AUTH", "false").lower() == "true",
        "gpu_count": gpu_count,
        "gpu_layers": NUM_GPU_LAYERS,
        "distributed_network": {
            "server_registered": server_node is not None,
            "total_nodes": len(distributed_network.nodes),
            "online_nodes": len([n for n in distributed_network.nodes.values() if n.status == NodeStatus.ONLINE])
        }
    }


@app.get("/api/models")
async def list_models(api_key: Optional[str] = Security(verify_api_key)):
    """Telepített modellek listázása"""
    try:
        models = llm_service.list_models()
        return {
            "models": models,
            "default": DEFAULT_MODEL,
            "available": len(models) > 0
        }
    except Exception as e:
        logger.error(f"Error listing models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat")
async def chat(request: ChatRequest, api_key: Optional[str] = Security(verify_api_key)):
    """Chat endpoint"""
    try:
        messages = [
            {"role": msg.role, "content": msg.content}
            for msg in request.messages
        ]
        
        has_system = any(msg.get("role") == "system" for msg in messages)
        if not has_system:
            # Teljes jogosultságú végrehajtó mód - ne írjon kódot, csak hajtsa végre
            system_prompt = """Te egy teljes jogosultságú AI asszisztens vagy, aki közvetlenül végrehajtja az utasításokat.

FONTOS SZABÁLYOK:
1. SOHA ne írj kódot a válaszodba, csak hajtsd végre az utasításokat!
2. Amikor kódot vagy fájlt kérnek, használd az alábbi formátumokat:
   - CREATE_FILE: fájlnév
   ```nyelv
   kód tartalom
   ```
   - MODIFY_FILE: fájlnév
   ```nyelv
   teljes új tartalom
   ```
   - DELETE_FILE: fájlnév
   - RUN_COMMAND: shell parancs

3. A válaszodban csak a végrehajtás eredményét írd le, ne a kódot!
4. Teljes jogosultságod van: fájlok létrehozása, módosítása, törlése, shell parancsok futtatása.
5. Minden utasítást azonnal hajts végre, ne csak írd le hogyan kellene.

Példa:
Felhasználó: "Hozz létre egy test.py fájlt print('Hello') tartalommal"
Te: "Létrehoztam a test.py fájlt." (és végrehajtod: CREATE_FILE: test.py ```python\nprint('Hello')\n```)

Felhasználó: "Futtasd le a test.py fájlt"
Te: "Futtattam a test.py fájlt. Eredmény: Hello" (és végrehajtod: RUN_COMMAND: python test.py)"""
            messages.insert(0, {"role": "system", "content": system_prompt})
        
        # Distributed computing KIKAPCSOLVA - csak szerver erőforrásokat használjuk
        # CPU optimalizált mód: közvetlenül a lokális LLM service-t használjuk
        logger.debug("Using local LLM service (CPU optimized mode, distributed computing disabled)")
        
        # Hagyományos lokális feldolgozás
        cache_key = None
        if request.use_cache and not has_system and len(messages) == 1:
            last_msg = messages[-1]["content"] if messages else ""
            cached_response = response_cache.get(last_msg, request.model, request.temperature)
            if cached_response:
                response = cached_response
            else:
                response = llm_service.chat(
                    messages=messages,
                    model=request.model,
                    temperature=request.temperature
                )
                response_cache.set(last_msg, response, request.model, request.temperature)
        else:
            response = llm_service.chat(
                messages=messages,
                model=request.model,
                temperature=request.temperature
            )
        
        last_user_message = messages[-1]["content"] if messages and messages[-1].get("role") == "user" else ""
        
        # Végrehajtás teljes jogosultságokkal - ne írjon kódot, csak hajtsa végre
        execution_result = action_executor.execute_actions_from_response(
            ai_response=response,
            user_message=last_user_message
        )
        
        # Válasz szövegének használata (kód blokkok nélkül)
        clean_response = execution_result.get("response_text", response)
        
        # Ha nincs tiszta válasz, de van végrehajtás, összeállítjuk az eredményt
        if not clean_response.strip() and execution_result.get("actions_executed"):
            action_summaries = []
            if execution_result.get("files_created"):
                action_summaries.append(f"Létrehozott fájlok: {', '.join(execution_result['files_created'])}")
            if execution_result.get("files_modified"):
                action_summaries.append(f"Módosított fájlok: {', '.join(execution_result['files_modified'])}")
            if execution_result.get("files_deleted"):
                action_summaries.append(f"Törölt fájlok: {', '.join(execution_result['files_deleted'])}")
            if execution_result.get("commands_run"):
                for cmd_result in execution_result["commands_run"]:
                    if isinstance(cmd_result, dict) and cmd_result.get("success"):
                        action_summaries.append(f"Parancs végrehajtva: {cmd_result.get('command', 'N/A')}")
            
            if action_summaries:
                clean_response = "\n".join(action_summaries)
            else:
                clean_response = "Végrehajtva."
        
        result = {
            "response": clean_response,
            "model": request.model or DEFAULT_MODEL,
            "execution_result": {
                "actions_executed": len(execution_result.get("actions_executed", [])),
                "files_created": execution_result.get("files_created", []),
                "files_modified": execution_result.get("files_modified", []),
                "files_deleted": execution_result.get("files_deleted", []),
                "commands_run": len(execution_result.get("commands_run", [])),
                "errors": execution_result.get("errors", [])
            }
        }
        
        return result
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest, api_key: Optional[str] = Security(verify_api_key)):
    """Stream chat endpoint"""
    try:
        messages = [
            {"role": msg.role, "content": msg.content}
            for msg in request.messages
        ]
        
        async def generate():
            async for chunk in llm_service.chat_stream(
                messages=messages,
                model=request.model,
                temperature=request.temperature
            ):
                yield f"data: {chunk}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream"
        )
    except Exception as e:
        logger.error(f"Chat stream error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate")
async def generate_code(request: GenerateCodeRequest, api_key: Optional[str] = Security(verify_api_key)):
    """Kód generálás"""
    try:
        cached_code = None
        if request.use_cache and not request.context_files:
            cached_code = response_cache.get(request.prompt, request.model, 0.2)
        
        if cached_code:
            result = {
                "code": cached_code,
                "explanation": "Kód cache-ből",
                "file_path": None,
                "error": None,
                "cached": True
            }
        else:
            result = code_generator.generate_code(
                prompt=request.prompt,
                language=request.language,
                context_files=request.context_files,
                model=request.model,
                auto_save=request.auto_save,
                file_path=request.file_path
            )
            if result.get("code") and request.use_cache and not request.context_files:
                response_cache.set(request.prompt, result["code"], request.model, 0.2)
        
        if result.get("error"):
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "code": result["code"],
            "explanation": result.get("explanation"),
            "file_path": result.get("file_path"),
            "language": request.language,
            "saved": result.get("file_path") is not None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Generate code error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/edit")
async def edit_code(request: EditCodeRequest, api_key: Optional[str] = Security(verify_api_key)):
    """Kód szerkesztés"""
    try:
        result = code_generator.edit_code(
            file_path=request.file_path,
            instruction=request.instruction,
            model=request.model
        )
        
        if result.get("error"):
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "code": result["code"],
            "file_path": request.file_path
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Edit code error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/explain/{file_path:path}")
async def explain_code(file_path: str, model: Optional[str] = None, api_key: Optional[str] = Security(verify_api_key)):
    """Kód magyarázata"""
    try:
        result = code_generator.explain_code(
            file_path=file_path,
            model=model
        )
        
        if result.get("error"):
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "explanation": result["explanation"],
            "file_path": file_path
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Explain code error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/vision")
async def analyze_image(request: VisionRequest, api_key: Optional[str] = Security(verify_api_key)):
    """Kép értelmezése vision modellel (Ollama llava)"""
    try:
        import base64
        from io import BytesIO
        from PIL import Image
        import requests
        
        # Base64 kép dekódolása és validálás
        try:
            # Tisztítsuk a base64 stringet (eltávolítjuk a data:image prefix-et ha van)
            image_base64 = request.image
            if ',' in image_base64:
                image_base64 = image_base64.split(',', 1)[1]
            
            image_data = base64.b64decode(image_base64)
            image = Image.open(BytesIO(image_data))
            
            # Kép információ
            image_info = {
                "format": image.format,
                "size": image.size,
                "mode": image.mode
            }
            
            # Vision model (llava vagy más vision model)
            model = request.model or "llava"
            
            # Ollama vision API hívás
            # Az Ollama chat API támogatja a képeket images array-ben
            ollama_url = f"{OLLAMA_URL}/api/chat"
            
            # Prompt előkészítése
            prompt = request.prompt or "Elemezd ezt a képet részletesen. Írd le, mit látsz, milyen objektumok, színek, szövegek vannak rajta, és adj releváns információkat."
            
            # Ollama chat API formátum képekkel
            # Az Ollama API-ban az images array a message-en kívül van, vagy a content-ben lehet
            # Próbáljuk meg mindkét formátumot támogatni
            payload = {
                "model": model,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt,
                        "images": [image_base64]  # Base64 string array - ez az Ollama formátum
                    }
                ],
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_predict": 500,
                    "num_ctx": 4096  # Nagyobb context window a vision modellekre
                }
            }
            
            try:
                # Ollama API hívás
                response = requests.post(
                    ollama_url,
                    json=payload,
                    timeout=120  # Vision modellekre hosszabb timeout
                )
                
                if response.status_code == 200:
                    data = response.json()
                    vision_response = data.get("message", {}).get("content", "")
                    
                    if vision_response:
                        return {
                            "response": vision_response,
                            "image_info": image_info,
                            "model": model,
                            "success": True
                        }
                    else:
                        raise Exception("Ollama válasz üres")
                else:
                    # Ha a modell nincs telepítve, próbáljuk meg ellenőrizni
                    if response.status_code == 404:
                        error_msg = f"Vision model ({model}) nincs telepítve. Telepítsd: ollama pull {model}"
                        logger.warning(error_msg)
                        return {
                            "response": f"{error_msg}\n\nKép információ: {image_info['format']}, {image_info['size'][0]}x{image_info['size'][1]} pixel",
                            "image_info": image_info,
                            "model": model,
                            "success": False,
                            "error": "model_not_found"
                        }
                    else:
                        raise Exception(f"Ollama API error: {response.status_code} - {response.text}")
                        
            except requests.exceptions.RequestException as ollama_error:
                logger.error(f"Ollama vision API error: {ollama_error}")
                # Ha Ollama nem elérhető vagy a modell nincs, alapvető információt adunk vissza
                return {
                    "response": f"Ollama vision API nem elérhető vagy a {model} modell nincs telepítve.\n\nKép információ:\n- Formátum: {image_info['format']}\n- Méret: {image_info['size'][0]}x{image_info['size'][1]} pixel\n- Mód: {image_info['mode']}\n\nTelepítsd a vision modelt: ollama pull {model}",
                    "image_info": image_info,
                    "model": model,
                    "success": False,
                    "error": str(ollama_error)
                }
            
        except Exception as img_error:
            logger.error(f"Image processing error: {img_error}")
            return {
                "response": f"Kép feldolgozási hiba: {str(img_error)}",
                "error": str(img_error),
                "success": False
            }
    except Exception as e:
        logger.error(f"Vision analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/refactor")
async def refactor_code(request: RefactorRequest, api_key: Optional[str] = Security(verify_api_key)):
    """Kód refaktorálás"""
    try:
        result = code_generator.refactor_code(
            file_path=request.file_path,
            refactor_type=request.refactor_type,
            model=request.model
        )
        
        if result.get("error"):
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "code": result["code"],
            "changes": result.get("changes"),
            "refactor_type": request.refactor_type
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Refactor code error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Fájl műveletek
@app.get("/api/files/{file_path:path}")
async def read_file_endpoint(file_path: str, api_key: Optional[str] = Security(verify_api_key)):
    """Fájl olvasása"""
    try:
        result = file_manager.read_file(file_path)
        
        if not result.get("exists"):
            raise HTTPException(status_code=404, detail=result.get("error", "File not found"))
        
        if result.get("error"):
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "content": result["content"],
            "file_path": file_path,
            "size": result.get("size", 0),
            "lines": result.get("lines", 0)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Read file error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/files")
async def write_file_endpoint(request: WriteFileRequest, api_key: Optional[str] = Security(verify_api_key)):
    """Fájl írása"""
    try:
        result = file_manager.write_file(
            file_path=request.file_path,
            content=request.content,
            create_dirs=request.create_dirs
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Write failed"))
        
        return {
            "success": True,
            "file_path": result.get("path", request.file_path)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Write file error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/files/{file_path:path}")
async def delete_file_endpoint(file_path: str, api_key: Optional[str] = Security(verify_api_key)):
    """Fájl törlése"""
    try:
        result = file_manager.delete_file(file_path)
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Delete failed"))
        
        return {"success": True, "file_path": file_path}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete file error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/files")
async def list_files_endpoint(dir_path: str = ".", recursive: bool = False, api_key: Optional[str] = Security(verify_api_key)):
    """Könyvtár tartalmának listázása"""
    try:
        result = file_manager.list_directory(dir_path, recursive=recursive)
        
        if result.get("error"):
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "files": result["files"],
            "directories": result["directories"],
            "path": dir_path
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List files error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Projekt műveletek
@app.get("/api/projects")
async def list_projects(api_key: Optional[str] = Security(verify_api_key)):
    """Projektek listázása"""
    try:
        projects = project_manager.list_projects()
        return {
            "projects": projects,
            "count": len(projects),
            "current": project_manager.current_project
        }
    except Exception as e:
        logger.error(f"List projects error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/projects/create")
async def create_project(request: CreateProjectRequest, api_key: Optional[str] = Security(verify_api_key)):
    """Új projekt létrehozása"""
    try:
        result = project_manager.create_project(
            name=request.name,
            project_type=request.type,
            description=request.description
        )
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create project error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/projects/select")
async def select_project(request: SelectProjectRequest, api_key: Optional[str] = Security(verify_api_key)):
    """Projekt kiválasztása"""
    try:
        success = project_manager.set_current_project(request.name)
        if not success:
            raise HTTPException(status_code=404, detail=f"Projekt '{request.name}' nem található")
        return {
            "status": "selected",
            "project": request.name,
            "project_info": project_manager.get_current_project()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Select project error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/projects/current")
async def get_current_project(api_key: Optional[str] = Security(verify_api_key)):
    """Aktuális projekt lekérése"""
    try:
        current = project_manager.get_current_project()
        if not current:
            return {"current": None, "message": "Nincs kiválasztott projekt"}
        return {"current": current}
    except Exception as e:
        logger.error(f"Get current project error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/distributed/register")
async def register_compute_node(
    request: Dict[str, Any],
    api_auth: Optional[str] = Security(verify_api_key),
    client_ip: Optional[str] = None
):
    """Compute node regisztrálása a distributed network-be"""
    try:
        from fastapi import Request
        
        # Ha nincs client_ip paraméter, próbáljuk meg a request-ből
        if not client_ip:
            # A FastAPI Request objektumot használjuk, ha elérhető
            pass
        
        ollama_url = request.get("ollama_url")
        
        # Ha localhost van, cseréljük le a kliens IP-jére
        # A kliens IP-t a request header-ből kapjuk
        if ollama_url and ("localhost" in ollama_url or "127.0.0.1" in ollama_url):
            # A kliens IP-t a request-ből kellene kapni, de jelenleg nem elérhető
            # Ezért a kliens oldalon kell detektálni az IP-t
            logger.warning(f"⚠️ Node registered with localhost URL: {ollama_url}. Server cannot access this. Client should use its actual IP address.")
        
        node = distributed_network.register_node(
            node_id=request.get("node_id"),
            user_id=request.get("user_id", "user"),
            name=request.get("name"),
            ollama_url=ollama_url,
            api_key=request.get("api_key"),
            gpu_count=request.get("gpu_count", 0),
            gpu_memory=request.get("gpu_memory", 0),
            cpu_cores=request.get("cpu_cores", 0)
        )
        
        # Modellek lekérése (ha elérhető)
        # FONTOS: Ne blokkoljuk a regisztrációt, ha a modellek nem elérhetőek
        # A node regisztrálva marad, és később próbálhatjuk meg újra betölteni a modelleket
        try:
            import requests
            if ollama_url:
                # Ha localhost, ne próbáljuk meg elérni (nem fog működni)
                if "localhost" not in ollama_url and "127.0.0.1" not in ollama_url:
                    # Növeljük a timeout-ot távoli node-okhoz (pl. 10 másodperc)
                    response = requests.get(f"{ollama_url}/api/tags", timeout=10)
                    if response.status_code == 200:
                        data = response.json()
                        models = [m["name"] for m in data.get("models", [])]
                        distributed_network.update_node_status(
                            node_id=node.node_id,
                            status=NodeStatus.ONLINE,
                            available_models=models
                        )
                        logger.info(f"✅ Node {node.node_id} models loaded: {len(models)} models")
                    else:
                        logger.warning(f"⚠️ Could not load models from {ollama_url}: HTTP {response.status_code}")
                        # Node regisztrálva marad, de modellek nélkül (később újra próbálhatjuk)
                        distributed_network.update_node_status(
                            node_id=node.node_id,
                            status=NodeStatus.ONLINE,
                            available_models=[]  # Üres lista, de online marad
                        )
                else:
                    logger.warning(f"⚠️ Cannot verify models for localhost node {node.node_id}. Client should provide accessible URL.")
                    # Node regisztrálva marad, de modellek nélkül
                    distributed_network.update_node_status(
                        node_id=node.node_id,
                        status=NodeStatus.ONLINE,
                        available_models=[]  # Üres lista, de online marad
                    )
        except Exception as e:
            logger.warning(f"⚠️ Could not load models for node {node.node_id}: {e}")
            # Node regisztrálva marad, de modellek nélkül (később újra próbálhatjuk)
            distributed_network.update_node_status(
                node_id=node.node_id,
                status=NodeStatus.ONLINE,
                available_models=[]  # Üres lista, de online marad
            )
        
        logger.info(f"✅ Compute node registered: {node.node_id} ({request.get('name')}) from {ollama_url}")
        return {
            "success": True,
            "node_id": node.node_id,
            "message": f"Node {node.node_id} successfully registered"
        }
    except Exception as e:
        logger.error(f"Failed to register compute node: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/distributed/stats")
async def get_distributed_stats(api_key: Optional[str] = Security(verify_api_key)):
    """Distributed network statisztikák"""
    try:
        stats = distributed_network.get_network_stats()
        nodes = []
        for node in distributed_network.nodes.values():
            nodes.append({
                "node_id": node.node_id,
                "name": node.name,
                "status": node.status.value,
                "gpu_count": node.gpu_count,
                "cpu_cores": node.cpu_cores,
                "available_models": node.available_models,
                "current_load": node.current_load,
                "response_time": node.response_time
            })
        return {
            **stats,
            "nodes": nodes
        }
    except Exception as e:
        logger.error(f"Failed to get distributed stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/project/structure")
async def get_project_structure(max_depth: int = 3, api_key: Optional[str] = Security(verify_api_key)):
    """Projekt struktúra lekérése"""
    try:
        structure = project_context.get_project_structure(max_depth=max_depth)
        return structure
    except Exception as e:
        logger.error(f"Get project structure error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/project/context")
async def get_project_context_endpoint(file_path: Optional[str] = None, 
                              include_related: bool = True,
                              api_key: Optional[str] = Security(verify_api_key)):
    """Projekt kontextus lekérése"""
    try:
        if file_path:
            context = project_context.get_file_context(file_path, include_related)
        else:
            context = {
                "codebase": project_context.build_codebase_context(),
                "structure": project_context.get_project_structure()
            }
        return context
    except Exception as e:
        logger.error(f"Get project context error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/project/search")
async def search_files(query: str, limit: int = 10, api_key: Optional[str] = Security(verify_api_key)):
    """Fájlok keresése"""
    try:
        files = project_context.get_relevant_files(query, limit=limit)
        return {
            "query": query,
            "files": files,
            "count": len(files)
        }
    except Exception as e:
        logger.error(f"Search files error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Memória és cache endpointok
@app.get("/api/memory/summary")
async def get_memory_summary(api_key: Optional[str] = Security(verify_api_key)):
    """Beszélgetési memória összefoglaló"""
    try:
        summary = conversation_memory.get_summary()
        return {
            "summary": summary,
            "message_count": len(conversation_memory.messages)
        }
    except Exception as e:
        logger.error(f"Get memory summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/memory/clear")
async def clear_memory(api_key: Optional[str] = Security(verify_api_key)):
    """Beszélgetési memória törlése"""
    try:
        conversation_memory.clear()
        return {"status": "cleared"}
    except Exception as e:
        logger.error(f"Clear memory error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/cache/clear")
async def clear_cache(api_key: Optional[str] = Security(verify_api_key)):
    """Response cache törlése"""
    try:
        response_cache.clear()
        return {"status": "cleared", "message": "Cache törölve"}
    except Exception as e:
        logger.error(f"Clear cache error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Autentikációs endpointok
class GenerateKeyRequest(BaseModel):
    name: str = Field(..., description="Kulcs neve")
    description: str = Field("", description="Kulcs leírása")


class RevokeKeyRequest(BaseModel):
    api_key_to_revoke: str = Field(..., description="Visszavonandó API kulcs")


class VerifyKeyRequest(BaseModel):
    api_key_to_verify: str = Field(..., description="Ellenőrizendő API kulcs")


@app.post("/api/auth/generate")
async def generate_api_key(request: GenerateKeyRequest):
    """API kulcs generálása (admin)"""
    try:
        api_key = api_key_manager.generate_key(request.name, request.description)
        return {
            "success": True,
            "api_key": api_key,  # Csak egyszer mutatjuk meg!
            "name": request.name,
            "warning": "Mentsd el ezt a kulcsot biztonságos helyre, mert nem fogod újra látni!"
        }
    except Exception as e:
        logger.error(f"Generate API key error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/auth/keys")
async def list_api_keys(api_key: Optional[str] = Security(verify_api_key)):
    """API kulcsok listázása (névvel és statisztikákkal)"""
    try:
        keys = api_key_manager.list_keys()
        return {
            "keys": keys,
            "count": len(keys)
        }
    except Exception as e:
        logger.error(f"List API keys error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/revoke")
async def revoke_api_key(request: RevokeKeyRequest,
                        api_key: Optional[str] = Security(verify_api_key)):
    """API kulcs visszavonása"""
    try:
        success = api_key_manager.revoke_key(request.api_key_to_revoke)
        if success:
            return {"success": True, "message": "API kulcs visszavonva"}
        else:
            raise HTTPException(status_code=404, detail="API kulcs nem található")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Revoke API key error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/verify")
async def verify_api_key_endpoint(request: VerifyKeyRequest):
    """API kulcs ellenőrzése (autentikáció nélkül)"""
    try:
        is_valid = api_key_manager.validate_key(request.api_key_to_verify)
        return {
            "valid": is_valid,
            "message": "Érvényes API kulcs" if is_valid else "Érvénytelen API kulcs"
        }
    except Exception as e:
        logger.error(f"Verify API key error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# GPU kezelési endpointok
@app.get("/api/gpu/status")
async def get_gpu_status(api_key: Optional[str] = Security(verify_api_key)):
    """GPU-k állapotának lekérése"""
    try:
        gpus = gpu_manager.get_all_gpus_status()
        return {
            "gpus": gpus,
            "count": len(gpus),
            "available": len([g for g in gpus if g["status"] == "available"])
        }
    except Exception as e:
        logger.error(f"Get GPU status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/gpu/available")
async def get_available_gpu(api_key: Optional[str] = Security(verify_api_key)):
    """Elérhető GPU lekérése"""
    try:
        gpu_index = gpu_manager.get_available_gpu()
        if gpu_index is not None:
            gpu_info = gpu_manager.get_gpu_info(gpu_index)
            if gpu_info:
                return {
                    "gpu_index": gpu_index,
                    "name": gpu_info.name,
                    "memory_free": gpu_info.memory_total - gpu_info.memory_used,
                    "utilization": gpu_info.utilization
                }
        return {
            "gpu_index": None,
            "message": "Nincs elérhető GPU"
        }
    except Exception as e:
        logger.error(f"Get available GPU error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import sys
    # Reload csak fejlesztéshez, éles környezetben kikapcsolva
    # Kikapcsolás: python main.py --no-reload
    # Vagy környezeti változóval: export RELOAD=false
    use_reload = os.getenv("RELOAD", "false").lower() == "true" and "--no-reload" not in sys.argv
    
    # Network info kiírása szerver indítás előtt
    print_distributed_network_info()
    
    # Uvicorn konfiguráció reload warning elkerülésére
    if use_reload:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=use_reload,
            reload_excludes=["*.pyc", "__pycache__", "*.log", "data/*", "logs/*", "projects/*", ".git/*"],
            reload_includes=["*.py"]  # Csak Python fájlok figyelése
        )
    else:
        # Production mód: reload nélkül, warning nélkül
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=False
        )

