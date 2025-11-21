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
from modules.code_generator import CodeGenerator
from modules.project_context import ProjectContext

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

NUM_GPU_LAYERS = os.getenv("OLLAMA_NUM_GPU_LAYERS")
if NUM_GPU_LAYERS:
    NUM_GPU_LAYERS = int(NUM_GPU_LAYERS)
else:
    # GPU manager automatikus detektálás
    NUM_GPU_LAYERS = gpu_manager.get_ollama_gpu_layers()

NUM_THREADS = os.getenv("OLLAMA_NUM_THREADS")
if NUM_THREADS:
    NUM_THREADS = int(NUM_THREADS)
else:
    NUM_THREADS = None

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
project_context = ProjectContext(file_manager, base_path=BASE_PATH)
conversation_memory = ConversationMemory(project_name="global", storage_dir="./data/memory")
response_cache = ResponseCache(cache_dir="./data/cache", ttl=1800)

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


# API Endpoints
@app.get("/")
async def root():
    """Root endpoint (autentikáció nélkül)"""
    return {
        "message": "AI Coding Assistant API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "models": "/api/models",
            "chat": "/api/chat",
            "generate": "/api/generate",
            "edit": "/api/edit",
            "explain": "/api/explain",
            "refactor": "/api/refactor",
            "files": "/api/files",
            "projects": "/api/projects",
            "auth": "/api/auth"
        },
        "auth_enabled": os.getenv("ENABLE_AUTH", "false").lower() == "true"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint (autentikáció nélkül)"""
    ollama_connected = llm_service.check_connection()
    gpu_count = gpu_manager.get_gpu_count()
    return {
        "status": "healthy" if ollama_connected else "degraded",
        "ollama_connected": ollama_connected,
        "base_path": BASE_PATH,
        "default_model": DEFAULT_MODEL,
        "auth_enabled": os.getenv("ENABLE_AUTH", "false").lower() == "true",
        "gpu_count": gpu_count,
        "gpu_layers": NUM_GPU_LAYERS
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
            last_user_msg = messages[-1]["content"].lower() if messages else ""
            code_keywords = ["hoz", "készíts", "create", "generate", "make", "írd", "write"]
            
            if any(keyword in last_user_msg for keyword in code_keywords):
                system_prompt = """Te egy professzionális programozó vagy. 
Amikor kódot vagy fájlt kérnek tőled, MINDIG generáld a teljes, működő kódot kód blokkban (```), ne csak írd le hogyan kell.
A kódot mindig ``` nyelv formátumban add vissza."""
                messages.insert(0, {"role": "system", "content": system_prompt})
        
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
        
        save_result = code_generator.extract_and_save_code_from_chat(
            chat_response=response,
            auto_save=request.auto_save_code,
            user_message=last_user_message
        )
        
        result = {
            "response": response,
            "model": request.model or DEFAULT_MODEL
        }
        
        if save_result.get("files_saved"):
            result["files_saved"] = save_result["files_saved"]
            result["code_detected"] = True
        else:
            result["code_detected"] = save_result.get("code_found", False)
        
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
    use_reload = "--no-reload" not in sys.argv
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=use_reload
    )

