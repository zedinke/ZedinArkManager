"""
Response Cache - Válasz cache kezelés
"""
import json
import hashlib
import os
import logging
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class ResponseCache:
    """Válasz cache kezelője"""
    
    def __init__(self, cache_dir: str = "./data/cache", ttl: int = 1800):
        """
        Args:
            cache_dir: Cache könyvtár
            ttl: Time to live másodpercekben (alapértelmezett 30 perc)
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.ttl = ttl
        self.memory_cache: Dict[str, Dict[str, Any]] = {}
        
        # Memory cache limit (100 item)
        self.memory_cache_limit = 100
    
    def _generate_key(self, prompt: str, model: Optional[str], temperature: float) -> str:
        """Cache kulcs generálása"""
        key_string = f"{prompt}:{model}:{temperature}"
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def get(self, prompt: str, model: Optional[str] = None, temperature: float = 0.5) -> Optional[str]:
        """Cache-ből kiolvasás"""
        cache_key = self._generate_key(prompt, model, temperature)
        
        # Memory cache ellenőrzés
        if cache_key in self.memory_cache:
            item = self.memory_cache[cache_key]
            if datetime.now() < item["expires"]:
                return item["value"]
            else:
                del self.memory_cache[cache_key]
        
        # File cache ellenőrzés
        cache_file = self.cache_dir / f"{cache_key}.json"
        if cache_file.exists():
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                expires = datetime.fromisoformat(data["expires"])
                if datetime.now() < expires:
                    # Betöltés memory cache-be
                    self._add_to_memory_cache(cache_key, data["value"], expires)
                    return data["value"]
                else:
                    # Lejárt, töröljük
                    cache_file.unlink()
            except Exception as e:
                logger.warning(f"Cache file read error: {e}")
        
        return None
    
    def set(self, prompt: str, value: str, model: Optional[str] = None, temperature: float = 0.5):
        """Cache-be mentés"""
        cache_key = self._generate_key(prompt, model, temperature)
        expires = datetime.now() + timedelta(seconds=self.ttl)
        
        # Memory cache-be mentés
        self._add_to_memory_cache(cache_key, value, expires)
        
        # File cache-be mentés
        cache_file = self.cache_dir / f"{cache_key}.json"
        try:
            data = {
                "value": value,
                "expires": expires.isoformat(),
                "created": datetime.now().isoformat(),
                "prompt_hash": cache_key
            }
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.warning(f"Cache file write error: {e}")
    
    def _add_to_memory_cache(self, key: str, value: str, expires: datetime):
        """Memory cache-be hozzáadás (LRU szabályokkal)"""
        # Ha megtelt, legrégebbi törlése
        if len(self.memory_cache) >= self.memory_cache_limit:
            oldest_key = min(
                self.memory_cache.keys(),
                key=lambda k: self.memory_cache[k]["expires"]
            )
            del self.memory_cache[oldest_key]
        
        self.memory_cache[key] = {
            "value": value,
            "expires": expires
        }
    
    def clear(self):
        """Cache törlése"""
        self.memory_cache.clear()
        
        # File cache törlése
        try:
            for cache_file in self.cache_dir.glob("*.json"):
                cache_file.unlink()
        except Exception as e:
            logger.warning(f"Cache clear error: {e}")

