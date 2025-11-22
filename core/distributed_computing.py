"""
Distributed Computing Network - Közös erőforrás használat
Minden felhasználó erőforrásait (GPU, CPU) közösen használja a rendszer
"""
import asyncio
import logging
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import uuid
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)


class NodeStatus(str, Enum):
    """Csomópont állapot"""
    ONLINE = "online"
    OFFLINE = "offline"
    BUSY = "busy"
    ERROR = "error"


@dataclass
class ComputeNode:
    """Számítási csomópont (felhasználó gép)"""
    node_id: str
    user_id: str
    name: str
    ollama_url: str
    api_key: Optional[str] = None
    status: NodeStatus = NodeStatus.OFFLINE
    gpu_count: int = 0
    gpu_memory: int = 0  # MB
    cpu_cores: int = 0
    available_models: List[str] = field(default_factory=list)
    current_load: float = 0.0  # 0.0 - 1.0
    last_seen: datetime = field(default_factory=datetime.now)
    response_time: float = 0.0  # ms
    total_requests: int = 0
    successful_requests: int = 0
    
    def is_available(self, max_age_seconds: int = 60) -> bool:
        """Ellenőrzi, hogy elérhető-e a csomópont"""
        if self.status != NodeStatus.ONLINE:
            return False
        age = (datetime.now() - self.last_seen).total_seconds()
        return age < max_age_seconds and self.current_load < 0.9


@dataclass
class DistributedTask:
    """Elosztott feladat"""
    task_id: str
    user_id: str
    model: str
    messages: List[Dict[str, str]]
    assigned_nodes: List[str] = field(default_factory=list)
    results: Dict[str, Any] = field(default_factory=dict)
    status: str = "pending"  # pending, processing, completed, failed
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None


class DistributedComputingNetwork:
    """Elosztott számítási hálózat koordinátor"""
    
    def __init__(self):
        self.nodes: Dict[str, ComputeNode] = {}
        self.tasks: Dict[str, DistributedTask] = {}
        self.executor = ThreadPoolExecutor(max_workers=50)
        self.lock = asyncio.Lock()
    
    def register_node(self, node_id: str, user_id: str, name: str, 
                     ollama_url: str, api_key: Optional[str] = None,
                     gpu_count: int = 0, gpu_memory: int = 0, 
                     cpu_cores: int = 0) -> ComputeNode:
        """Csomópont regisztrálása"""
        node = ComputeNode(
            node_id=node_id,
            user_id=user_id,
            name=name,
            ollama_url=ollama_url,
            api_key=api_key,
            gpu_count=gpu_count,
            gpu_memory=gpu_memory,
            cpu_cores=cpu_cores,
            status=NodeStatus.ONLINE,
            last_seen=datetime.now()
        )
        self.nodes[node_id] = node
        logger.info(f"Node registered: {node_id} ({name}) from {ollama_url}")
        return node
    
    def update_node_status(self, node_id: str, status: NodeStatus,
                          available_models: Optional[List[str]] = None,
                          current_load: Optional[float] = None,
                          response_time: Optional[float] = None):
        """Csomópont állapot frissítése"""
        if node_id in self.nodes:
            node = self.nodes[node_id]
            node.status = status
            node.last_seen = datetime.now()
            if available_models is not None:
                node.available_models = available_models
            if current_load is not None:
                node.current_load = current_load
            if response_time is not None:
                node.response_time = response_time
    
    def get_available_nodes(self, model: Optional[str] = None, 
                          min_gpu_memory: int = 0) -> List[ComputeNode]:
        """Elérhető csomópontok lekérése"""
        available = []
        for node in self.nodes.values():
            if not node.is_available():
                continue
            if min_gpu_memory > 0 and node.gpu_memory < min_gpu_memory:
                continue
            if model and model not in node.available_models:
                continue
            available.append(node)
        
        # Rendezés: kevésbé terhelt, gyorsabb válaszidő
        available.sort(key=lambda n: (n.current_load, n.response_time))
        return available
    
    async def distribute_task(self, user_id: str, model: str, 
                             messages: List[Dict[str, str]],
                             use_all_nodes: bool = True) -> str:
        """
        Feladat elosztása minden elérhető csomópontra
        
        Args:
            user_id: Felhasználó ID
            model: Modell neve
            messages: Chat üzenetek
            use_all_nodes: Ha True, minden elérhető csomópontot használ
        
        Returns:
            Kombinált válasz
        """
        task_id = str(uuid.uuid4())
        task = DistributedTask(
            task_id=task_id,
            user_id=user_id,
            model=model,
            messages=messages,
            status="processing"
        )
        self.tasks[task_id] = task
        
        # Elérhető csomópontok keresése
        available_nodes = self.get_available_nodes(model=model)
        
        if not available_nodes:
            task.status = "failed"
            raise Exception("No available compute nodes")
        
        # Ha use_all_nodes=False, csak a legjobb csomópontot használjuk
        if not use_all_nodes:
            available_nodes = available_nodes[:1]
        
        logger.info(f"Distributing task {task_id} to {len(available_nodes)} nodes")
        
        # Párhuzamos kérések minden csomópontra
        futures = []
        for node in available_nodes:
            task.assigned_nodes.append(node.node_id)
            future = asyncio.create_task(
                self._execute_on_node(node, model, messages)
            )
            futures.append((node.node_id, future))
        
        # Válaszok gyűjtése
        results = {}
        errors = {}
        
        for node_id, future in futures:
            try:
                result = await asyncio.wait_for(future, timeout=300)  # 5 perc timeout
                results[node_id] = result
                # Csomópont statisztika frissítése
                if node_id in self.nodes:
                    self.nodes[node_id].total_requests += 1
                    self.nodes[node_id].successful_requests += 1
            except asyncio.TimeoutError:
                errors[node_id] = "Timeout"
                if node_id in self.nodes:
                    self.nodes[node_id].total_requests += 1
            except Exception as e:
                errors[node_id] = str(e)
                if node_id in self.nodes:
                    self.nodes[node_id].total_requests += 1
        
        task.results = results
        task.status = "completed" if results else "failed"
        task.completed_at = datetime.now()
        
        # Válaszok kombinálása
        if results:
            combined_response = self._combine_responses(list(results.values()))
            logger.info(f"Task {task_id} completed: {len(results)}/{len(available_nodes)} successful")
            return combined_response
        else:
            raise Exception(f"All nodes failed: {errors}")
    
    async def _execute_on_node(self, node: ComputeNode, model: str,
                              messages: List[Dict[str, str]]) -> str:
        """Feladat végrehajtása egy csomóponton"""
        start_time = datetime.now()
        
        try:
            # Ollama API hívás
            url = f"{node.ollama_url}/api/chat"
            payload = {
                "model": model,
                "messages": messages,
                "stream": False
            }
            
            headers = {"Content-Type": "application/json"}
            if node.api_key:
                headers["X-API-Key"] = node.api_key
            
            response = requests.post(url, json=payload, headers=headers, timeout=300)
            
            if response.status_code == 200:
                data = response.json()
                result = data.get("message", {}).get("content", "") or data.get("response", "")
                
                # Válaszidő mérése
                response_time = (datetime.now() - start_time).total_seconds() * 1000
                self.update_node_status(node.node_id, NodeStatus.ONLINE, 
                                       response_time=response_time)
                
                return result
            else:
                raise Exception(f"Ollama API error: {response.status_code}")
        
        except Exception as e:
            logger.error(f"Node {node.node_id} error: {e}")
            self.update_node_status(node.node_id, NodeStatus.ERROR)
            raise
    
    def _combine_responses(self, responses: List[str]) -> str:
        """Több válasz kombinálása intelligensen"""
        if not responses:
            return ""
        
        if len(responses) == 1:
            return responses[0]
        
        # Ha minden válasz megegyezik, csak egyet adunk vissza
        if len(set(responses)) == 1:
            return responses[0]
        
        # Válaszok hossza alapján rendezés (hosszabb = részletesebb)
        responses_sorted = sorted(responses, key=len, reverse=True)
        
        # Legrészletesebb válasz + egyedi információk a többiből
        combined = responses_sorted[0]
        
        # Új információk keresése a többi válaszban
        base_words = set(responses_sorted[0].lower().split())
        
        for response in responses_sorted[1:]:
            response_words = set(response.lower().split())
            new_words = response_words - base_words
            
            # Ha van jelentős új információ (több mint 10 egyedi szó)
            if len(new_words) > 10:
                combined += f"\n\n--- További információ másik csomópontról ---\n\n{response}"
        
        return combined
    
    def get_network_stats(self) -> Dict[str, Any]:
        """Hálózat statisztikák"""
        online_nodes = [n for n in self.nodes.values() if n.status == NodeStatus.ONLINE]
        total_gpu = sum(n.gpu_count for n in online_nodes)
        total_memory = sum(n.gpu_memory for n in online_nodes)
        total_cores = sum(n.cpu_cores for n in online_nodes)
        
        return {
            "total_nodes": len(self.nodes),
            "online_nodes": len(online_nodes),
            "total_gpu": total_gpu,
            "total_gpu_memory_gb": total_memory / 1024,
            "total_cpu_cores": total_cores,
            "active_tasks": len([t for t in self.tasks.values() if t.status == "processing"]),
            "completed_tasks": len([t for t in self.tasks.values() if t.status == "completed"])
        }
    
    def cleanup_old_tasks(self, max_age_hours: int = 24):
        """Régi feladatok törlése"""
        cutoff = datetime.now() - timedelta(hours=max_age_hours)
        to_remove = [
            task_id for task_id, task in self.tasks.items()
            if task.completed_at and task.completed_at < cutoff
        ]
        for task_id in to_remove:
            del self.tasks[task_id]
        logger.info(f"Cleaned up {len(to_remove)} old tasks")


# Globális hálózat példány
distributed_network = DistributedComputingNetwork()

