"""
Code Generator - Kód generálás és szerkesztés
"""
import re
from typing import Dict, Optional, List
from core.llm_service import LLMService
from core.file_manager import FileManager
from core.project_manager import ProjectManager
from modules.prompt_builder import (
    build_code_generation_prompt,
    build_edit_prompt,
    build_explain_prompt,
    build_refactor_prompt
)


class CodeGenerator:
    """Kód generálás és szerkesztés kezelője"""
    
    def __init__(self, llm_service: LLMService, 
                 file_manager: FileManager,
                 project_manager: ProjectManager):
        self.llm = llm_service
        self.fm = file_manager
        self.pm = project_manager
    
    def generate_code(self, prompt: str, language: str = "python", 
                     context_files: Optional[List[str]] = None,
                     model: Optional[str] = None,
                     auto_save: bool = True,
                     file_path: Optional[str] = None) -> Dict:
        """Kód generálás prompt alapján"""
        try:
            context = None
            if context_files:
                context = self._build_context(context_files)
            
            full_prompt = build_code_generation_prompt(prompt, language, context)
            
            response = self.llm.generate(
                prompt=full_prompt,
                model=model,
                temperature=0.2,
                max_tokens=2000
            )
            
            code, explanation = self._extract_code(response, language)
            
            saved_file = None
            if auto_save and code:
                if not file_path:
                    file_path = self._generate_file_path(prompt, language)
                
                if self.pm.get_current_project():
                    result = self.pm.add_file_to_project(file_path, code)
                    if result.get("success"):
                        saved_file = file_path
                else:
                    result = self.fm.write_file(file_path, code)
                    if result.get("success"):
                        saved_file = file_path
            
            return {
                "code": code,
                "explanation": explanation,
                "file_path": saved_file,
                "error": None
            }
        
        except Exception as e:
            return {
                "code": None,
                "explanation": None,
                "file_path": None,
                "error": str(e)
            }
    
    def edit_code(self, file_path: str, instruction: str, 
                  model: Optional[str] = None) -> Dict:
        """Kód szerkesztés"""
        try:
            file_result = self.fm.read_file(file_path)
            if not file_result.get("exists") or file_result.get("error"):
                return {
                    "code": None,
                    "error": f"Cannot read file: {file_result.get('error')}"
                }
            
            code = file_result["content"]
            language = self._detect_language(file_path)
            
            prompt = build_edit_prompt(code, instruction, language)
            
            response = self.llm.generate(
                prompt=prompt,
                model=model,
                temperature=0.3,
                max_tokens=2000
            )
            
            edited_code, explanation = self._extract_code(response, language)
            
            return {
                "code": edited_code if edited_code else code,
                "explanation": explanation,
                "error": None
            }
        
        except Exception as e:
            return {
                "code": None,
                "error": str(e)
            }
    
    def explain_code(self, file_path: str, model: Optional[str] = None) -> Dict:
        """Kód magyarázata"""
        try:
            file_result = self.fm.read_file(file_path)
            if not file_result.get("exists") or file_result.get("error"):
                return {
                    "explanation": None,
                    "error": f"Cannot read file: {file_result.get('error')}"
                }
            
            code = file_result["content"]
            language = self._detect_language(file_path)
            
            prompt = build_explain_prompt(code, language)
            
            explanation = self.llm.generate(
                prompt=prompt,
                model=model,
                temperature=0.5,
                max_tokens=1000
            )
            
            return {
                "explanation": explanation,
                "error": None
            }
        
        except Exception as e:
            return {
                "explanation": None,
                "error": str(e)
            }
    
    def refactor_code(self, file_path: str, refactor_type: str,
                     model: Optional[str] = None) -> Dict:
        """Kód refaktorálás"""
        try:
            file_result = self.fm.read_file(file_path)
            if not file_result.get("exists") or file_result.get("error"):
                return {
                    "code": None,
                    "changes": None,
                    "error": f"Cannot read file: {file_result.get('error')}"
                }
            
            code = file_result["content"]
            language = self._detect_language(file_path)
            
            prompt = build_refactor_prompt(code, refactor_type, language)
            
            response = self.llm.generate(
                prompt=prompt,
                model=model,
                temperature=0.3,
                max_tokens=2000
            )
            
            refactored_code, changes = self._extract_code(response, language)
            
            return {
                "code": refactored_code if refactored_code else code,
                "changes": changes or f"Refaktorálás: {refactor_type}",
                "error": None
            }
        
        except Exception as e:
            return {
                "code": None,
                "changes": None,
                "error": str(e)
            }
    
    def extract_and_save_code_from_chat(self, chat_response: str, 
                                        auto_save: bool = True,
                                        user_message: str = "") -> Dict:
        """Kód kinyerése chat válaszból és automatikus mentés"""
        code_blocks = self._extract_code_blocks(chat_response)
        
        if not code_blocks:
            return {
                "code_found": False,
                "files_saved": []
            }
        
        files_saved = []
        if auto_save:
            for i, (code, language) in enumerate(code_blocks):
                file_path = self._generate_file_path(user_message or f"code_{i}", language)
                
                if self.pm.get_current_project():
                    result = self.pm.add_file_to_project(file_path, code)
                else:
                    result = self.fm.write_file(file_path, code)
                
                if result.get("success"):
                    files_saved.append(file_path)
        
        return {
            "code_found": True,
            "files_saved": files_saved
        }
    
    def _extract_code(self, response: str, language: str) -> tuple[str, str]:
        """Kód kinyerése a válaszból"""
        pattern = rf"```{language}\s*(.*?)```"
        matches = re.findall(pattern, response, re.DOTALL)
        
        if matches:
            code = matches[0].strip()
            explanation = response.replace(f"```{language}", "").replace("```", "").strip()
            return code, explanation
        
        pattern = r"```(.*?)```"
        matches = re.findall(pattern, response, re.DOTALL)
        
        if matches:
            code = matches[0].strip()
            explanation = response.replace("```", "").strip()
            return code, explanation
        
        return response, ""
    
    def _extract_code_blocks(self, text: str) -> List[tuple[str, str]]:
        """Összes kód blokk kinyerése"""
        pattern = r"```(\w+)?\s*(.*?)```"
        matches = re.findall(pattern, text, re.DOTALL)
        
        code_blocks = []
        for lang, code in matches:
            language = lang.strip() if lang else "python"
            code_blocks.append((code.strip(), language))
        
        return code_blocks
    
    def _build_context(self, context_files: List[str]) -> str:
        """Kontextus építése fájlokból"""
        context_parts = []
        for file_path in context_files:
            result = self.fm.read_file(file_path)
            if result.get("exists") and result.get("content"):
                context_parts.append(f"--- {file_path} ---\n{result['content']}\n")
        return "\n".join(context_parts)
    
    def _detect_language(self, file_path: str) -> str:
        """Programozási nyelv detektálása fájl kiterjesztésből"""
        extension_map = {
            '.py': 'python',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'javascript',
            '.tsx': 'typescript',
            '.html': 'html',
            '.css': 'css',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.rs': 'rust',
            '.go': 'go',
            '.rb': 'ruby',
            '.php': 'php',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.sql': 'sql'
        }
        
        from pathlib import Path
        ext = Path(file_path).suffix.lower()
        return extension_map.get(ext, 'python')
    
    def _generate_file_path(self, prompt: str, language: str) -> str:
        """Fájl útvonal generálása prompt alapján"""
        from pathlib import Path
        import re
        
        # Egyszerűsített fájlnév generálás
        prompt_lower = prompt.lower()[:50]
        prompt_lower = re.sub(r'[^\w\s-]', '', prompt_lower)
        prompt_lower = re.sub(r'\s+', '_', prompt_lower)
        
        extension_map = {
            'python': '.py',
            'javascript': '.js',
            'typescript': '.ts',
            'html': '.html',
            'css': '.css',
            'java': '.java',
            'cpp': '.cpp',
            'c': '.c',
            'rust': '.rs',
            'go': '.go',
            'ruby': '.rb',
            'php': '.php',
            'swift': '.swift',
            'kotlin': '.kt',
            'sql': '.sql'
        }
        
        ext = extension_map.get(language.lower(), '.py')
        filename = f"{prompt_lower}{ext}"
        
        return filename
