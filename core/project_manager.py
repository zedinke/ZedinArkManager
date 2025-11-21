"""
Project Manager - Projekt kezelés
"""
import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime
from core.file_manager import FileManager


class ProjectManager:
    """Projekt kezelő"""
    
    def __init__(self, base_path: str = "projects"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(exist_ok=True)
        self.projects_file = self.base_path / ".projects.json"
        self.current_project = None
        self.file_manager = FileManager(base_path=str(self.base_path))
        self._load_projects()
    
    def _load_projects(self):
        """Projektek betöltése"""
        if self.projects_file.exists():
            try:
                with open(self.projects_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.projects = data.get("projects", {})
                    self.current_project = data.get("current_project")
            except:
                self.projects = {}
                self.current_project = None
        else:
            self.projects = {}
            self.current_project = None
    
    def _save_projects(self):
        """Projektek mentése"""
        data = {
            "projects": self.projects,
            "current_project": self.current_project,
            "updated": datetime.now().isoformat()
        }
        with open(self.projects_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    def create_project(self, name: str, project_type: str = "general", 
                      description: str = "") -> Dict:
        """Új projekt létrehozása"""
        if name in self.projects:
            return {
                "success": False,
                "error": f"Projekt '{name}' már létezik"
            }
        
        project_path = self.base_path / name
        project_path.mkdir(exist_ok=True)
        
        project_info = {
            "name": name,
            "type": project_type,
            "description": description,
            "created": datetime.now().isoformat(),
            "path": str(project_path)
        }
        
        self.projects[name] = project_info
        self._save_projects()
        
        # README létrehozása
        readme_path = project_path / "README.md"
        readme_content = f"# {name}\n\n{description}\n\n**Típus**: {project_type}\n**Létrehozva**: {project_info['created']}\n"
        self.file_manager.write_file(str(readme_path.relative_to(self.base_path)), readme_content)
        
        return {
            "success": True,
            "project": project_info
        }
    
    def list_projects(self) -> List[Dict]:
        """Projektek listázása"""
        return list(self.projects.values())
    
    def set_current_project(self, name: str) -> bool:
        """Aktuális projekt beállítása"""
        if name in self.projects:
            self.current_project = name
            self._save_projects()
            return True
        return False
    
    def get_current_project(self) -> Optional[Dict]:
        """Aktuális projekt lekérése"""
        if self.current_project and self.current_project in self.projects:
            return self.projects[self.current_project]
        return None
    
    def add_file_to_project(self, file_path: str, content: str) -> Dict:
        """Fájl hozzáadása a projekthez"""
        current = self.get_current_project()
        if not current:
            return {
                "success": False,
                "error": "Nincs kiválasztott projekt"
            }
        
        project_path = self.base_path / current["name"]
        full_path = project_path / file_path
        
        return self.file_manager.write_file(
            str(full_path.relative_to(self.base_path.parent)),
            content
        )

