"""
Authentication - API kulcs kezelés
"""
import secrets
import hashlib
import json
import logging
import os
from pathlib import Path
from typing import Optional, Dict, List
from datetime import datetime, timedelta
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader


logger = logging.getLogger(__name__)

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

class APIKeyManager:
    """API kulcs kezelő"""
    
    def __init__(self, keys_file: str = "./data/api_keys.json"):
        self.keys_file = Path(keys_file)
        self.keys_file.parent.mkdir(parents=True, exist_ok=True)
        self.keys: Dict[str, Dict] = {}
        self._load_keys()
    
    def _load_keys(self):
        """API kulcsok betöltése"""
        if self.keys_file.exists():
            try:
                with open(self.keys_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.keys = data.get("keys", {})
            except Exception as e:
                logger.error(f"Error loading API keys: {e}")
                self.keys = {}
        else:
            self.keys = {}
            # Létrehozunk egy alapértelmezett kulcsot
            default_key = self.generate_key("default", "Alapértelmezett kulcs")
            logger.info(f"Default API key created: {default_key}")
    
    def _save_keys(self):
        """API kulcsok mentése"""
        try:
            data = {
                "keys": self.keys,
                "updated": datetime.now().isoformat()
            }
            with open(self.keys_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving API keys: {e}")
    
    def generate_key(self, name: str, description: str = "") -> str:
        """Új API kulcs generálása"""
        # API kulcs generálása (32 karakter)
        api_key = secrets.token_urlsafe(32)
        
        # Hash készítése a tároláshoz
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        # Kulcs mentése
        self.keys[key_hash] = {
            "name": name,
            "description": description,
            "created": datetime.now().isoformat(),
            "last_used": None,
            "usage_count": 0,
            "active": True
        }
        
        self._save_keys()
        logger.info(f"API key generated: {name}")
        
        return api_key
    
    def validate_key(self, api_key: str) -> bool:
        """API kulcs validálása"""
        if not api_key:
            return False
        
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        if key_hash in self.keys:
            key_info = self.keys[key_hash]
            
            # Ellenőrzés, hogy aktív-e
            if not key_info.get("active", True):
                return False
            
            # Használati statisztika frissítése
            key_info["last_used"] = datetime.now().isoformat()
            key_info["usage_count"] = key_info.get("usage_count", 0) + 1
            self._save_keys()
            
            return True
        
        return False
    
    def revoke_key(self, api_key: str) -> bool:
        """API kulcs visszavonása"""
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        if key_hash in self.keys:
            self.keys[key_hash]["active"] = False
            self._save_keys()
            logger.info(f"API key revoked: {self.keys[key_hash].get('name')}")
            return True
        
        return False
    
    def list_keys(self) -> List[Dict]:
        """API kulcsok listázása (névvel és statisztikákkal)"""
        result = []
        for key_hash, key_info in self.keys.items():
            result.append({
                "name": key_info.get("name"),
                "description": key_info.get("description", ""),
                "created": key_info.get("created"),
                "last_used": key_info.get("last_used"),
                "usage_count": key_info.get("usage_count", 0),
                "active": key_info.get("active", True),
                "hash": key_hash[:8] + "..."  # Csak prefix
            })
        return result
    
    def delete_key(self, api_key: str) -> bool:
        """API kulcs törlése"""
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        if key_hash in self.keys:
            del self.keys[key_hash]
            self._save_keys()
            logger.info(f"API key deleted: {key_hash[:8]}")
            return True
        
        return False


# Globális API kulcs manager
api_key_manager = APIKeyManager()


async def verify_api_key(api_key: Optional[str] = Security(API_KEY_HEADER)) -> Optional[str]:
    """API kulcs ellenőrzése"""
    # Ha nincs API kulcs beállítva, akkor opcionális (fejlesztéshez)
    auth_enabled = os.getenv("ENABLE_AUTH", "false").lower() == "true"
    
    if not auth_enabled:
        return None  # Autentikáció kikapcsolva
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API kulcs szükséges. Add hozzá a 'X-API-Key' header-t vagy állítsd be az ENABLE_AUTH=false-t a .env fájlban.",
            headers={"WWW-Authenticate": "APIKey"},
        )
    
    if not api_key_manager.validate_key(api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Érvénytelen vagy visszavont API kulcs",
            headers={"WWW-Authenticate": "APIKey"},
        )
    
    return api_key

