"""
Conversation Memory - Beszélgetési memória kezelés
"""
import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime


class ConversationMemory:
    """Beszélgetési memória kezelője"""
    
    def __init__(self, project_name: str = "global", storage_dir: str = "./data/memory"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.project_name = project_name
        self.messages: List[Dict] = []
        self._load_memory()
    
    def _get_memory_file(self) -> Path:
        """Memória fájl útvonala"""
        return self.storage_dir / f"{self.project_name}.json"
    
    def _load_memory(self):
        """Memória betöltése"""
        memory_file = self._get_memory_file()
        if memory_file.exists():
            try:
                with open(memory_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.messages = data.get("messages", [])
            except:
                self.messages = []
        else:
            self.messages = []
    
    def _save_memory(self):
        """Memória mentése"""
        memory_file = self._get_memory_file()
        data = {
            "project": self.project_name,
            "messages": self.messages,
            "updated": datetime.now().isoformat()
        }
        with open(memory_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    def add_message(self, role: str, content: str):
        """Üzenet hozzáadása"""
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        }
        self.messages.append(message)
        self._save_memory()
    
    def get_summary(self, limit: int = 10) -> str:
        """Memória összefoglalója"""
        if not self.messages:
            return "Nincs beszélgetési memória."
        
        recent = self.messages[-limit:]
        summary = "Legutóbbi beszélgetés:\n"
        for msg in recent:
            role = msg.get("role", "unknown")
            content = msg.get("content", "")[:200]
            summary += f"\n{role.upper()}: {content}...\n"
        
        return summary
    
    def search_relevant(self, query: str, limit: int = 5) -> List[Dict]:
        """Releváns üzenetek keresése"""
        query_lower = query.lower()
        relevant = []
        
        for msg in self.messages:
            content = msg.get("content", "").lower()
            if query_lower in content:
                relevant.append(msg)
                if len(relevant) >= limit:
                    break
        
        return relevant
    
    def get_recent(self, n: int = 10) -> List[Dict]:
        """Legutóbbi üzenetek"""
        return self.messages[-n:] if self.messages else []
    
    def clear(self):
        """Memória törlése"""
        self.messages = []
        memory_file = self._get_memory_file()
        if memory_file.exists():
            memory_file.unlink()
    
    def switch_project(self, project_name: str):
        """Projekt váltás"""
        self.project_name = project_name
        self._load_memory()

