"""
Distributed Computing Network - Közös erőforrás használat
Minden felhasználó erőforrásait (GPU, CPU) közösen használja a rendszer
"""
import asyncio
import logging
from typing import List, Dict, Optional, Tuple, Any
import random
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import uuid
import requests
import aiohttp
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
    
    def is_available(self, max_age_seconds: int = 600) -> bool:
        """Ellenőrzi, hogy elérhető-e a csomópont (10 perc offline timeout)"""
        # Ha ERROR státuszban van, nem elérhető
        if self.status == NodeStatus.ERROR:
            return False
        # Ha ONLINE vagy BUSY, akkor elérhető (BUSY = ideiglenesen nem elérhető, de ne távolítsuk el)
        if self.status == NodeStatus.ONLINE or self.status == NodeStatus.BUSY:
            age = (datetime.now() - self.last_seen).total_seconds()
            return age < max_age_seconds and self.current_load < 0.9
        # Ha OFFLINE, akkor csak akkor elérhető, ha nem régen volt aktív
        if self.status == NodeStatus.OFFLINE:
            age = (datetime.now() - self.last_seen).total_seconds()
            return age < max_age_seconds
        return False


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
        # Connection pool optimalizáció: újrahasznosított HTTP session-ök
        self._session_pool: Optional[aiohttp.ClientSession] = None
    
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
                          min_gpu_memory: int = 0,
                          ignore_model_filter: bool = False) -> List[ComputeNode]:
        """
        Elérhető csomópontok lekérése
        
        Args:
            model: Modell neve (opcionális szűréshez)
            min_gpu_memory: Minimális GPU memória (MB)
            ignore_model_filter: Ha True, minden elérhető csomópontot visszaad, függetlenül a modelltől
        """
        available = []
        for node in self.nodes.values():
            # Ellenőrizzük az elérhetőséget (de a szerver node-ot mindig használjuk, ha online)
            is_server_node = node.node_id.startswith('server-')
            
            # Ha nem szerver node
            if not is_server_node:
                # ERROR státuszban lévő node-ot kihagyjuk
                if node.status == NodeStatus.ERROR:
                    continue
                # BUSY node-okat is használjuk (lehet, hogy most már elérhető)
                elif node.status == NodeStatus.BUSY:
                    # BUSY node-okat is hozzáadjuk, de csak akkor, ha nem régen volt aktív (10 perc)
                    age = (datetime.now() - node.last_seen).total_seconds()
                    if age < 600:  # 10 perc
                        logger.debug(f"🔄 Including BUSY node: {node.node_id} (will retry, age: {age:.1f}s)")
                        # Folytatjuk, hozzáadjuk a listához
                    else:
                        # Ha túl régen volt aktív, kihagyjuk
                        logger.debug(f"⏭️ Skipping BUSY node: {node.node_id} (too old: {age:.1f}s)")
                        continue
                # ONLINE node-okat ellenőrizzük
                elif node.status == NodeStatus.ONLINE:
                    # ONLINE node-okat csak akkor használjuk, ha elérhető
                    if not node.is_available():
                        continue
                # OFFLINE node-okat csak akkor használjuk, ha nem régen volt aktív
                elif node.status == NodeStatus.OFFLINE:
                    age = (datetime.now() - node.last_seen).total_seconds()
                    if age >= 600:  # 10 perc
                        continue
                else:
                    # Ismeretlen státusz, kihagyjuk
                    continue
            
            # Ha szerver node, akkor csak az ONLINE státuszt ellenőrizzük
            if is_server_node and node.status != NodeStatus.ONLINE:
                continue
                
            if min_gpu_memory > 0 and node.gpu_memory < min_gpu_memory:
                continue
            # Modell szűrés csak akkor, ha ignore_model_filter=False
            if not ignore_model_filter and model and model not in node.available_models:
                continue
            available.append(node)
        
        # Rendezés: kevésbé terhelt, gyorsabb válaszidő
        available.sort(key=lambda n: (n.current_load, n.response_time))
        return available
    
    async def distribute_task(self, user_id: str, model: str, 
                             messages: List[Dict[str, str]],
                             use_all_nodes: bool = True,
                             load_balance: bool = True) -> str:
        """
        Feladat elosztása minden elérhető csomópontra
        
        Args:
            user_id: Felhasználó ID
            model: Modell neve
            messages: Chat üzenetek
            use_all_nodes: Ha True, minden elérhető csomópontot használ
            load_balance: Ha True, 50-50% terheléselosztás (egy node-ot választ véletlenszerűen)
        
        Returns:
            Kombinált válasz vagy egy node válasza
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
        # ignore_model_filter=True: minden modell használja az összes beregisztrált erőforrást
        available_nodes = self.get_available_nodes(model=model, ignore_model_filter=True)
        
        if not available_nodes:
            task.status = "failed"
            raise Exception("No available compute nodes")
        
        # Terheléselosztás: 50-50% (véletlenszerűen választ egy node-ot)
        if load_balance and len(available_nodes) >= 2:
            import random
            # Véletlenszerűen választunk egy node-ot (50% esély mindkettőre)
            selected_node = random.choice(available_nodes)
            available_nodes = [selected_node]
            logger.info(f"⚖️ Load balancing: Selected node {selected_node.node_id} (50% chance for each node)")
        elif not use_all_nodes:
            # Ha use_all_nodes=False, csak a legjobb csomópontot használjuk
            available_nodes = available_nodes[:1]
        
        logger.info(f"Distributing task {task_id} to {len(available_nodes)} nodes: {[n.node_id for n in available_nodes]}")
        
        # Párhuzamos kérések minden csomópontra (beleértve a szerver node-ot is)
        futures = []
        for node in available_nodes:
            task.assigned_nodes.append(node.node_id)
            logger.info(f"Creating async task for node: {node.node_id} ({node.name})")
            future = asyncio.create_task(
                self._execute_on_node(node, model, messages)
            )
            futures.append((node.node_id, future))
        
        # Válaszok gyűjtése - OPTIMALIZÁLT: első válasz visszaadása
        results = {}
        errors = {}
        
        # Ha csak egy node van, nincs szükség párhuzamos várakozásra
        if len(futures) == 1:
            node_id, future = futures[0]
            try:
                result = await asyncio.wait_for(future, timeout=300)  # 5 perc timeout
                results[node_id] = result
                if node_id in self.nodes:
                    self.nodes[node_id].total_requests += 1
                    self.nodes[node_id].successful_requests += 1
                logger.info(f"✅ Node {node_id} responded successfully")
                task.results = results
                task.status = "completed"
                task.completed_at = datetime.now()
                return result  # Azonnal visszaadjuk, nincs szükség kombinálásra
            except Exception as e:
                error_msg = str(e)
                logger.error(f"❌ Node {node_id} error: {error_msg}")
                raise Exception(f"Node {node_id} failed: {error_msg}")
        
        # Több node esetén: első válasz visszaadása (gyorsabb)
        # Vagy mindkét válasz kombinálása, ha mindkettő sikeres
        done, pending = await asyncio.wait(futures, return_when=asyncio.FIRST_COMPLETED)
        
        # Első sikeres válasz feldolgozása
        first_result = None
        first_node_id = None
        
        for completed in done:
            node_id, future = [(nid, f) for nid, f in futures if f == completed][0]
            try:
                result = await future
                results[node_id] = result
                first_result = result
                first_node_id = node_id
                if node_id in self.nodes:
                    self.nodes[node_id].total_requests += 1
                    self.nodes[node_id].successful_requests += 1
                logger.info(f"✅ Node {node_id} responded successfully (first)")
                break
            except Exception as e:
                error_msg = str(e)
                errors[node_id] = error_msg
                # Ne állítsuk ERROR-ra azonnal, csak BUSY-ra (lehet, hogy ideiglenes probléma)
                if node_id in self.nodes:
                    # Csak akkor állítsuk ERROR-ra, ha valódi hiba van (nem timeout/connection)
                    if "timeout" not in error_msg.lower() and "connection" not in error_msg.lower():
                        self.update_node_status(node_id, NodeStatus.ERROR)
                    else:
                        # Timeout/connection hibák esetén csak BUSY-ra állítjuk
                        self.update_node_status(node_id, NodeStatus.BUSY)
                logger.warning(f"⚠️ Node {node_id} error: {error_msg}")
        
        # Várakozás a többi node-ra (ha van), de nem blokkoljuk a választ
        if pending:
            # Várakozás a többi node-ra (max 5 másodperc, hogy ne lassítsa)
            remaining_futures = [(nid, f) for nid, f in futures if f in pending]
            for node_id, future in remaining_futures:
                try:
                    result = await asyncio.wait_for(future, timeout=5)  # Rövidebb timeout a kombináláshoz
                    results[node_id] = result
                    if node_id in self.nodes:
                        self.nodes[node_id].total_requests += 1
                        self.nodes[node_id].successful_requests += 1
                    logger.info(f"✅ Node {node_id} responded successfully (additional)")
                except asyncio.TimeoutError:
                    errors[node_id] = "Timeout (additional response)"
                    logger.debug(f"⏱️ Node {node_id} timeout (additional, not critical)")
                    if node_id in self.nodes:
                        self.nodes[node_id].total_requests += 1
                except Exception as e:
                    error_msg = str(e)
                    errors[node_id] = error_msg
                    logger.debug(f"⚠️ Node {node_id} error (additional): {error_msg}")
                    if node_id in self.nodes:
                        self.nodes[node_id].total_requests += 1
        
        task.results = results
        task.status = "completed" if results else "failed"
        task.completed_at = datetime.now()
        
        # Válasz visszaadása
        if results:
            # Ha több válasz van, kombináljuk, különben az elsőt használjuk
            if len(results) > 1:
                combined_response = self._combine_responses(list(results.values()))
                logger.info(f"Task {task_id} completed: {len(results)}/{len(available_nodes)} successful (combined)")
                if errors:
                    failed_nodes = list(errors.keys())
                    logger.debug(f"⚠️ Some nodes failed ({len(errors)}/{len(available_nodes)}): {failed_nodes}")
                return combined_response
            else:
                # Csak egy válasz van, azonnal visszaadjuk
                logger.info(f"Task {task_id} completed: {len(results)}/{len(available_nodes)} successful (single response)")
                return first_result
        else:
            logger.error(f"❌ All nodes failed for task {task_id}: {errors}")
            raise Exception(f"All nodes failed: {errors}")
    
    async def _execute_on_node(self, node: ComputeNode, model: str,
                              messages: List[Dict[str, str]], retry_count: int = 0) -> str:
        """Feladat végrehajtása egy csomóponton - ASZINKRON HTTP kérés RETRY logikával"""
        start_time = datetime.now()
        max_retries = 2  # Maximum 2 újrapróbálás
        retry_delay = 2  # 2 másodperc várakozás az újrapróbálások között
        
        logger.info(f"🚀 Executing task on node: {node.node_id} ({node.name}) at {node.ollama_url} (attempt {retry_count + 1}/{max_retries + 1})")
        
        try:
            # Ollama API hívás - MINDEN node-nak HTTP kérést küldünk, még a szerver node-nak is
            # ASZINKRON kérés használata - ez biztosítja, hogy párhuzamosan fut és valóban használja az erőforrásokat
            url = f"{node.ollama_url}/api/chat"
            payload = {
                "model": model,
                "messages": messages,
                "stream": False
            }
            
            headers = {"Content-Type": "application/json"}
            if node.api_key:
                headers["X-API-Key"] = node.api_key
            
            # Aszinkron HTTP kérés - ez biztosítja a valódi párhuzamos futtatást
            # FONTOS: Az Ollama automatikusan használja a GPU-t, ha elérhető
            # Nem kell külön GPU opciókat beállítani, az Ollama detektálja
            # OPTIMALIZÁLT: Connection pooling és keep-alive használata
            if self._session_pool is None or self._session_pool.closed:
                connector = aiohttp.TCPConnector(limit=100, limit_per_host=10, keepalive_timeout=30)
                self._session_pool = aiohttp.ClientSession(connector=connector)
            
            session = self._session_pool
            logger.debug(f"📡 Sending async HTTP request to {url} for node {node.node_id}")
            logger.debug(f"   Node GPU info: {node.gpu_count} GPU(s), {node.gpu_memory} MB memory")
            
            try:
                # Növelt connect timeout (30 másodperc) - lehet, hogy a node lassan válaszol
                async with session.post(url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=300, connect=30)) as response:
                    if response.status == 200:
                        data = await response.json()
                        result = data.get("message", {}).get("content", "") or data.get("response", "")
                        
                        # Válaszidő mérése
                        response_time = (datetime.now() - start_time).total_seconds() * 1000
                        logger.info(f"✅ Node {node.node_id} completed in {response_time:.2f}ms, response length: {len(result)} chars")
                        if node.gpu_count > 0:
                            logger.info(f"   💻 GPU used: {node.gpu_count} GPU(s), {node.gpu_memory} MB")
                        self.update_node_status(node.node_id, NodeStatus.ONLINE, 
                                               response_time=response_time)
                        
                        return result
                    else:
                        error_text = await response.text()
                        raise Exception(f"Ollama API error: {response.status} - {error_text}")
            except asyncio.TimeoutError:
                # RETRY logika: ha még nem próbáltuk meg max_retries-szer, próbáljuk újra
                if retry_count < max_retries:
                    logger.warning(f"⏱️ Node {node.node_id} timeout (attempt {retry_count + 1}/{max_retries + 1}), retrying in {retry_delay}s...")
                    await asyncio.sleep(retry_delay)
                    # Ne állítsuk ERROR-ra, csak BUSY-ra
                    self.update_node_status(node.node_id, NodeStatus.BUSY)
                    # Újrapróbálás
                    return await self._execute_on_node(node, model, messages, retry_count + 1)
                else:
                    logger.error(f"❌ Node {node.node_id} timeout after {max_retries + 1} attempts: Could not reach {url}")
                    # Csak akkor állítsuk BUSY-ra, ha minden újrapróbálás sikertelen volt
                    self.update_node_status(node.node_id, NodeStatus.BUSY)
                    raise Exception(f"Node {node.node_id} timeout: Could not reach Ollama at {url} after {max_retries + 1} attempts")
            except aiohttp.ClientError as e:
                error_msg = str(e)
                # RETRY logika: ha még nem próbáltuk meg max_retries-szer, próbáljuk újra
                if retry_count < max_retries and ("timeout" in error_msg.lower() or "Connection timed out" in error_msg):
                    logger.warning(f"🔌 Node {node.node_id} connection timeout (attempt {retry_count + 1}/{max_retries + 1}), retrying in {retry_delay}s...")
                    await asyncio.sleep(retry_delay)
                    # Ne állítsuk ERROR-ra, csak BUSY-ra
                    self.update_node_status(node.node_id, NodeStatus.BUSY)
                    # Újrapróbálás
                    return await self._execute_on_node(node, model, messages, retry_count + 1)
                
                logger.error(f"❌ Node {node.node_id} connection error: {e}")
                # Ne állítsuk ERROR-ra, csak BUSY-ra (lehet, hogy ideiglenes probléma)
                self.update_node_status(node.node_id, NodeStatus.BUSY)
                raise Exception(f"Node {node.node_id} connection error: {e}")
        
        except Exception as e:
            # Csak akkor állítsuk ERROR-ra, ha valódi hiba van (nem timeout/connection)
            error_msg = str(e)
            if "timeout" not in error_msg.lower() and "connection" not in error_msg.lower():
                logger.error(f"❌ Node {node.node_id} error: {e}")
                self.update_node_status(node.node_id, NodeStatus.ERROR)
            else:
                logger.warning(f"⚠️ Node {node.node_id} connection/timeout error: {e}")
                self.update_node_status(node.node_id, NodeStatus.BUSY)
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

