"""
GPU Manager - Több GPU kezelése és load balancing
"""
import os
import subprocess
import logging
from typing import List, Dict, Optional, Tuple
from enum import Enum


logger = logging.getLogger(__name__)


class GPUStatus(str, Enum):
    """GPU állapot"""
    AVAILABLE = "available"
    BUSY = "busy"
    ERROR = "error"
    UNAVAILABLE = "unavailable"


class GPUInfo:
    """GPU információk"""
    def __init__(self, index: int, name: str, memory_total: int, memory_used: int = 0):
        self.index = index
        self.name = name
        self.memory_total = memory_total
        self.memory_used = memory_used
        self.status = GPUStatus.AVAILABLE
        self.utilization = 0.0
        self.temperature = 0.0


class GPUManger:
    """GPU kezelő - több GPU load balancing"""
    
    def __init__(self):
        self.gpus: List[GPUInfo] = []
        self.current_gpu_index = 0
        self._detect_gpus()
    
    def _detect_gpus(self):
        """GPU-k detektálása"""
        try:
            # nvidia-smi ellenőrzése
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=index,name,memory.total", "--format=csv,noheader,nounits"],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                for line in result.stdout.strip().split('\n'):
                    if line.strip():
                        parts = [p.strip() for p in line.split(',')]
                        if len(parts) >= 3:
                            index = int(parts[0])
                            name = parts[1]
                            memory_total = int(parts[2])
                            gpu = GPUInfo(index, name, memory_total)
                            self.gpus.append(gpu)
                logger.info(f"Detected {len(self.gpus)} GPU(s)")
            else:
                logger.warning("nvidia-smi nem elérhető, GPU kezelés kikapcsolva")
        except FileNotFoundError:
            logger.info("NVIDIA GPU nem található vagy nvidia-smi nincs telepítve")
        except Exception as e:
            logger.error(f"GPU detection error: {e}")
    
    def get_gpu_count(self) -> int:
        """GPU szám"""
        return len(self.gpus)
    
    def get_gpu_info(self, index: Optional[int] = None) -> Optional[GPUInfo]:
        """GPU információk lekérése"""
        if not self.gpus:
            return None
        
        if index is None:
            index = self.current_gpu_index
        
        if 0 <= index < len(self.gpus):
            self._update_gpu_status(index)
            return self.gpus[index]
        
        return None
    
    def _update_gpu_status(self, index: int):
        """GPU állapot frissítése"""
        if not self.gpus or index >= len(self.gpus):
            return
        
        try:
            # nvidia-smi query (minden GPU egyszerre)
            result = subprocess.run(
                ["nvidia-smi",
                 "--query-gpu=index,memory.used,memory.total,utilization.gpu,temperature.gpu",
                 "--format=csv,noheader,nounits"],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                for line in result.stdout.strip().split('\n'):
                    if line.strip():
                        parts = [p.strip() for p in line.split(',')]
                        if len(parts) >= 5:
                            gpu_idx = int(parts[0])
                            if gpu_idx == index and gpu_idx < len(self.gpus):
                                self.gpus[index].memory_used = int(parts[1])
                                memory_total = int(parts[2])
                                if memory_total != self.gpus[index].memory_total:
                                    self.gpus[index].memory_total = memory_total
                                self.gpus[index].utilization = float(parts[3])
                                self.gpus[index].temperature = float(parts[4])
                                
                                # Állapot beállítása
                                memory_percent = (self.gpus[index].memory_used / self.gpus[index].memory_total) * 100
                                if memory_percent > 95 or self.gpus[index].utilization > 95:
                                    self.gpus[index].status = GPUStatus.BUSY
                                else:
                                    self.gpus[index].status = GPUStatus.AVAILABLE
                                break
        except Exception as e:
            logger.error(f"GPU status update error: {e}")
            if index < len(self.gpus):
                self.gpus[index].status = GPUStatus.ERROR
    
    def get_available_gpu(self) -> Optional[int]:
        """Legkevésbé terhelt GPU kiválasztása"""
        if not self.gpus:
            return None
        
        # Minden GPU állapotának frissítése
        for i in range(len(self.gpus)):
            self._update_gpu_status(i)
        
        # Legkevésbé terhelt GPU keresése
        available_gpus = [gpu for gpu in self.gpus if gpu.status == GPUStatus.AVAILABLE]
        
        if not available_gpus:
            # Ha nincs elérhető, akkor a legkevésbé terhelt
            available_gpus = self.gpus
        
        # Memory használat alapján rendezés
        available_gpus.sort(key=lambda g: (g.memory_used / g.memory_total, g.utilization))
        
        selected_gpu = available_gpus[0]
        self.current_gpu_index = selected_gpu.index
        
        return selected_gpu.index
    
    def get_all_gpus_status(self) -> List[Dict]:
        """Összes GPU állapota"""
        result = []
        for i in range(len(self.gpus)):
            self._update_gpu_status(i)
            gpu = self.gpus[i]
            result.append({
                "index": gpu.index,
                "name": gpu.name,
                "status": gpu.status.value,
                "memory_total": gpu.memory_total,
                "memory_used": gpu.memory_used,
                "memory_free": gpu.memory_total - gpu.memory_used,
                "memory_percent": (gpu.memory_used / gpu.memory_total) * 100,
                "utilization": gpu.utilization,
                "temperature": gpu.temperature
            })
        return result
    
    def get_next_gpu_round_robin(self) -> Optional[int]:
        """Következő GPU round-robin módszerrel"""
        if not self.gpus:
            return None
        
        selected = self.current_gpu_index
        self.current_gpu_index = (self.current_gpu_index + 1) % len(self.gpus)
        
        return selected
    
    def get_ollama_gpu_layers(self, gpu_index: Optional[int] = None) -> Optional[int]:
        """Ollama GPU rétegek számának meghatározása"""
        if not self.gpus:
            return None
        
        if gpu_index is None:
            gpu_index = self.get_available_gpu()
        
        if gpu_index is None:
            return None
        
        gpu = self.get_gpu_info(gpu_index)
        if not gpu:
            return None
        
        # GPU memória alapján rétegek számának becslése
        # Átlagos modell: ~1GB per 1B paraméter
        # Llama 3.1 8B: ~8GB
        # GPU rétegek: memória_total / modell_memória * 0.8 (biztonsági margó)
        
        free_memory_gb = (gpu.memory_total - gpu.memory_used) / 1024  # MB -> GB
        
        # Konzervatív becslés: 1GB per réteg
        estimated_layers = int(free_memory_gb * 0.8)
        
        return max(1, min(estimated_layers, 100))  # 1-100 réteg közé korlátozás


# Globális GPU manager
gpu_manager = GPUManager()

