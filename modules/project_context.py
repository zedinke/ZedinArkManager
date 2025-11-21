"""
Project Context - Projekt kontextus kezelés
"""
from typing import List, Dict, Set, Optional
from pathlib import Path
from core.file_manager import FileManager


class ProjectContext:
    """Projekt kontextus kezelője"""
    
    def __init__(self, file_manager: FileManager, base_path: str = "."):
        self.fm = file_manager
        self.base_path = Path(base_path)
        self.ignored_patterns = {
            '__pycache__', '.git', 'node_modules', '.venv', 'venv',
            'env', '.env', 'dist', 'build', '.pytest_cache',
            '.idea', '.vscode', '*.pyc', '*.pyo', '*.pyd',
            '.DS_Store', 'Thumbs.db', 'logs', 'data'
        }
    
    def get_project_structure(self, max_depth: int = 3) -> Dict:
        """Projekt struktúra lekérése"""
        try:
            structure = {
                "files": [],
                "directories": [],
                "total_files": 0,
                "depth": max_depth
            }
            
            self._build_structure(self.base_path, structure, max_depth, 0)
            
            return structure
        except Exception as e:
            return {
                "error": str(e),
                "files": [],
                "directories": []
            }
    
    def _build_structure(self, path: Path, structure: Dict, max_depth: int, current_depth: int):
        """Rekurzív struktúra építés"""
        if current_depth >= max_depth:
            return
        
        try:
            for item in path.iterdir():
                if item.name in self.ignored_patterns or item.name.startswith('.'):
                    continue
                
                rel_path = str(item.relative_to(self.base_path))
                
                if item.is_file():
                    structure["files"].append(rel_path)
                    structure["total_files"] += 1
                elif item.is_dir():
                    structure["directories"].append(rel_path)
                    if current_depth < max_depth - 1:
                        self._build_structure(item, structure, max_depth, current_depth + 1)
        except PermissionError:
            pass
    
    def get_file_context(self, file_path: str, include_related: bool = True) -> Dict:
        """Fájl kontextus lekérése"""
        try:
            file_result = self.fm.read_file(file_path)
            if not file_result.get("exists"):
                return {
                    "error": "File not found",
                    "content": None,
                    "related_files": []
                }
            
            context = {
                "file_path": file_path,
                "content": file_result.get("content"),
                "size": file_result.get("size", 0),
                "lines": file_result.get("lines", 0),
                "related_files": []
            }
            
            if include_related:
                context["related_files"] = self._find_related_files(file_path)
            
            return context
        except Exception as e:
            return {
                "error": str(e),
                "content": None,
                "related_files": []
            }
    
    def _find_related_files(self, file_path: str, limit: int = 5) -> List[str]:
        """Kapcsolódó fájlok keresése"""
        # Egyszerűsített implementáció
        # Valós használatban lehetne import analízis, hasonló nevek, stb.
        try:
            file_dir = Path(file_path).parent
            related = []
            
            for item in file_dir.iterdir():
                if item.is_file() and item.name != Path(file_path).name:
                    related.append(str(item.relative_to(self.base_path)))
                    if len(related) >= limit:
                        break
            
            return related
        except:
            return []
    
    def build_codebase_context(self, max_files: int = 20) -> str:
        """Codebase kontextus építése"""
        try:
            structure = self.get_project_structure(max_depth=2)
            files = structure.get("files", [])[:max_files]
            
            context_parts = []
            for file_path in files:
                result = self.fm.read_file(file_path)
                if result.get("exists") and result.get("content"):
                    content = result["content"][:500]  # Limit content size
                    context_parts.append(f"--- {file_path} ---\n{content}...\n")
            
            return "\n".join(context_parts)
        except Exception as e:
            return f"Error building context: {str(e)}"
    
    def get_relevant_files(self, query: str, limit: int = 10) -> List[str]:
        """Releváns fájlok keresése query alapján"""
        try:
            structure = self.get_project_structure(max_depth=3)
            files = structure.get("files", [])
            
            query_lower = query.lower()
            relevant = []
            
            for file_path in files:
                if query_lower in file_path.lower():
                    relevant.append(file_path)
                    if len(relevant) >= limit:
                        break
                
                # Content search (first 500 chars)
                result = self.fm.read_file(file_path)
                if result.get("content") and query_lower in result["content"][:500].lower():
                    if file_path not in relevant:
                        relevant.append(file_path)
                        if len(relevant) >= limit:
                            break
            
            return relevant
        except:
            return []

