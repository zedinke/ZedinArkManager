"""
File Manager - Fájl műveletek kezelése
"""
import os
from pathlib import Path
from typing import List, Dict, Optional
import mimetypes


class FileManager:
    """Fájl műveletek kezelője"""
    
    def __init__(self, base_path: str = "."):
        self.base_path = Path(base_path).resolve()
    
    def read_file(self, file_path: str) -> Dict:
        """Fájl olvasása"""
        try:
            path = self._resolve_path(file_path)
            
            if not path.exists():
                return {
                    "content": None,
                    "exists": False,
                    "error": f"File not found: {file_path}"
                }
            
            if not path.is_file():
                return {
                    "content": None,
                    "exists": False,
                    "error": f"Path is not a file: {file_path}"
                }
            
            if not str(path).startswith(str(self.base_path)):
                return {
                    "content": None,
                    "exists": False,
                    "error": "Access denied: File outside base path"
                }
            
            if path.stat().st_size > 10 * 1024 * 1024:
                return {
                    "content": None,
                    "exists": True,
                    "error": "File too large (max 10MB)"
                }
            
            if self._is_text_file(path):
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                return {
                    "content": content,
                    "exists": True,
                    "error": None,
                    "size": len(content),
                    "lines": len(content.splitlines())
                }
            else:
                return {
                    "content": None,
                    "exists": True,
                    "error": "Binary file - cannot read as text"
                }
        
        except Exception as e:
            return {
                "content": None,
                "exists": False,
                "error": str(e)
            }
    
    def write_file(self, file_path: str, content: str, create_dirs: bool = True) -> Dict:
        """Fájl írása"""
        try:
            path = self._resolve_path(file_path)
            
            if not str(path).startswith(str(self.base_path)):
                return {
                    "success": False,
                    "error": "Access denied: File outside base path"
                }
            
            if create_dirs and not path.parent.exists():
                path.parent.mkdir(parents=True, exist_ok=True)
            
            temp_path = path.with_suffix(path.suffix + '.tmp')
            try:
                with open(temp_path, 'w', encoding='utf-8', buffering=8192) as f:
                    f.write(content)
                temp_path.replace(path)
            except Exception:
                if temp_path.exists():
                    temp_path.unlink()
                raise
            
            return {
                "success": True,
                "error": None,
                "path": str(path)
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def delete_file(self, file_path: str) -> Dict:
        """Fájl törlése"""
        try:
            path = self._resolve_path(file_path)
            
            if not str(path).startswith(str(self.base_path)):
                return {
                    "success": False,
                    "error": "Access denied: File outside base path"
                }
            
            if not path.exists():
                return {
                    "success": False,
                    "error": "File not found"
                }
            
            if path.is_file():
                path.unlink()
            elif path.is_dir():
                return {
                    "success": False,
                    "error": "Use delete_directory for directories"
                }
            
            return {
                "success": True,
                "error": None
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def list_directory(self, dir_path: str = ".", recursive: bool = False) -> Dict:
        """Könyvtár tartalmának listázása"""
        try:
            path = self._resolve_path(dir_path)
            
            if not path.exists():
                return {
                    "files": [],
                    "directories": [],
                    "error": f"Directory not found: {dir_path}"
                }
            
            if not path.is_dir():
                return {
                    "files": [],
                    "directories": [],
                    "error": f"Path is not a directory: {dir_path}"
                }
            
            files = []
            directories = []
            
            if recursive:
                for item in path.rglob('*'):
                    if item.is_file():
                        files.append(str(item.relative_to(self.base_path)))
                    elif item.is_dir():
                        directories.append(str(item.relative_to(self.base_path)))
            else:
                for item in path.iterdir():
                    rel_path = item.relative_to(self.base_path)
                    if item.is_file():
                        files.append(str(rel_path))
                    elif item.is_dir():
                        directories.append(str(rel_path))
            
            return {
                "files": sorted(files),
                "directories": sorted(directories),
                "error": None
            }
        
        except Exception as e:
            return {
                "files": [],
                "directories": [],
                "error": str(e)
            }
    
    def _resolve_path(self, file_path: str) -> Path:
        """Útvonal feloldása"""
        path = Path(file_path)
        if path.is_absolute():
            return path
        return self.base_path / path
    
    def _is_text_file(self, path: Path) -> bool:
        """Ellenőrzi, hogy szöveges fájl-e"""
        text_extensions = {
            '.py', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.json',
            '.md', '.txt', '.yml', '.yaml', '.xml', '.csv', '.sql', '.sh',
            '.bat', '.ps1', '.go', '.rs', '.java', '.cpp', '.c', '.h',
            '.php', '.rb', '.swift', '.kt', '.dart', '.vue', '.svelte',
            '.rs', '.toml', '.ini', '.cfg', '.conf', '.log'
        }
        
        if path.suffix.lower() in text_extensions:
            return True
        
        mime_type, _ = mimetypes.guess_type(str(path))
        if mime_type and mime_type.startswith('text/'):
            return True
        
        return False
