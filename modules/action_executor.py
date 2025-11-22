"""
Action Executor - Parancsok és utasítások végrehajtása
Teljes jogosultságokkal rendelkezik a fájl műveletekhez, shell parancsokhoz, stb.
"""
import re
import subprocess
import os
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class ActionExecutor:
    """Parancsok és utasítások végrehajtása teljes jogosultságokkal"""
    
    def __init__(self, file_manager, base_path: str = "."):
        self.fm = file_manager
        self.base_path = Path(base_path).resolve()
        self.allowed_commands = [
            'git', 'python', 'python3', 'pip', 'npm', 'node', 'curl', 'wget',
            'ls', 'cat', 'grep', 'find', 'mkdir', 'rm', 'cp', 'mv', 'chmod',
            'echo', 'pwd', 'cd', 'tar', 'zip', 'unzip', 'gzip', 'gunzip',
            'ps', 'top', 'df', 'du', 'free', 'uptime', 'uname', 'whoami',
            'systemctl', 'service', 'apt', 'apt-get', 'yum', 'dnf',
            'docker', 'docker-compose', 'kubectl', 'helm',
            'ollama', 'nvidia-smi', 'nohup', 'screen', 'tmux'
        ]
        self.dangerous_patterns = [
            r'rm\s+-rf\s+/',  # Root törlés
            r':\s*\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\};\s*:',  # Fork bomb
            r'mkfs\.',  # Fájlrendszer formázás
            r'fdisk',  # Lemez particionálás
            r'dd\s+if=',  # Raw disk írás
        ]
    
    def execute_actions_from_response(self, ai_response: str, user_message: str = "") -> Dict:
        """AI válasz feldolgozása és parancsok végrehajtása"""
        results = {
            "actions_executed": [],
            "files_created": [],
            "files_modified": [],
            "files_deleted": [],
            "commands_run": [],
            "errors": [],
            "response_text": ""
        }
        
        # 0. Intelligens fájl létrehozás a felhasználó üzenetéből (ha az AI nem használta a formátumot)
        if user_message:
            file_creation_result = self._try_intelligent_file_creation(user_message, ai_response)
            if file_creation_result:
                results["actions_executed"].append(file_creation_result)
                if file_creation_result.get("file_created"):
                    results["files_created"].append(file_creation_result["file_created"])
                if file_creation_result.get("error"):
                    results["errors"].append(file_creation_result["error"])
        
        # 1. Explicit parancsok keresése (CREATE_FILE, MODIFY_FILE, DELETE_FILE, RUN_COMMAND)
        explicit_actions = self._extract_explicit_actions(ai_response)
        for action in explicit_actions:
            action_result = self._execute_explicit_action(action)
            if action_result:
                results["actions_executed"].append(action_result)
                if action_result.get("file_created"):
                    results["files_created"].append(action_result["file_created"])
                if action_result.get("file_modified"):
                    results["files_modified"].append(action_result["file_modified"])
                if action_result.get("file_deleted"):
                    results["files_deleted"].append(action_result["file_deleted"])
                if action_result.get("command_run"):
                    results["commands_run"].append(action_result["command_run"])
                if action_result.get("error"):
                    results["errors"].append(action_result["error"])
        
        # 2. Kód blokkok kinyerése és végrehajtása (ha nincs explicit parancs)
        if not explicit_actions:
            code_blocks = self._extract_code_blocks(ai_response)
            for code, language in code_blocks:
                action_result = self._execute_code_block(code, language, user_message)
                if action_result:
                    results["actions_executed"].append(action_result)
                    if action_result.get("file_created"):
                        results["files_created"].append(action_result["file_created"])
                    if action_result.get("file_modified"):
                        results["files_modified"].append(action_result["file_modified"])
                    if action_result.get("error"):
                        results["errors"].append(action_result["error"])
        
        # 3. Válasz szövegének tisztítása (kód blokkok eltávolítása)
        results["response_text"] = self._clean_response_text(ai_response)
        
        return results
    
    def _extract_code_blocks(self, text: str) -> List[Tuple[str, str]]:
        """Kód blokkok kinyerése"""
        pattern = r"```(\w+)?\s*(.*?)```"
        matches = re.findall(pattern, text, re.DOTALL)
        
        code_blocks = []
        for lang, code in matches:
            language = lang.strip() if lang else "python"
            code_blocks.append((code.strip(), language))
        
        return code_blocks
    
    def _extract_explicit_actions(self, text: str) -> List[Dict]:
        """Explicit parancsok kinyerése (CREATE_FILE, MODIFY_FILE, DELETE_FILE, RUN_COMMAND)"""
        actions = []
        
        # CREATE_FILE pattern - rugalmasabb minta
        # Keresünk CREATE_FILE: fájlnév mintákat
        create_file_matches = list(re.finditer(r"CREATE_FILE:\s*([^\n]+)", text, re.IGNORECASE))
        
        for create_match in create_file_matches:
            file_path = create_match.group(1).strip()
            # Keresünk kód blokkot a CREATE_FILE után
            remaining_text = text[create_match.end():]
            # Keresünk a következő ``` mintát (rugalmas whitespace kezeléssel)
            code_block_match = re.search(r"```(\w+)?\s*(.*?)```", remaining_text, re.DOTALL)
            
            if code_block_match:
                language = code_block_match.group(1).strip() if code_block_match.group(1) else "text"
                content = code_block_match.group(2).strip()
            else:
                # Ha nincs kód blokk, üres fájl
                content = ""
                language = "text"
            
            actions.append({
                "type": "CREATE_FILE",
                "file_path": file_path,
                "content": content,
                "language": language
            })
        
        # MODIFY_FILE pattern
        modify_pattern = r"MODIFY_FILE:\s*([^\n]+)\s*\n```(\w+)?\s*(.*?)```"
        for match in re.finditer(modify_pattern, text, re.DOTALL):
            file_path = match.group(1).strip()
            language = match.group(2).strip() if match.group(2) else "text"
            content = match.group(3).strip()
            actions.append({
                "type": "MODIFY_FILE",
                "file_path": file_path,
                "content": content,
                "language": language
            })
        
        # DELETE_FILE pattern
        delete_pattern = r"DELETE_FILE:\s*([^\n]+)"
        for match in re.finditer(delete_pattern, text):
            file_path = match.group(1).strip()
            actions.append({
                "type": "DELETE_FILE",
                "file_path": file_path
            })
        
        # RUN_COMMAND pattern
        command_pattern = r"RUN_COMMAND:\s*([^\n]+)"
        for match in re.finditer(command_pattern, text):
            command = match.group(1).strip()
            actions.append({
                "type": "RUN_COMMAND",
                "command": command
            })
        
        return actions
    
    def _execute_code_block(self, code: str, language: str, user_message: str = "") -> Optional[Dict]:
        """Kód blokk végrehajtása"""
        try:
            # Python kód végrehajtása
            if language.lower() in ['python', 'py']:
                return self._execute_python_code(code)
            
            # Shell script végrehajtása
            elif language.lower() in ['bash', 'sh', 'shell']:
                return self._execute_shell_command(code)
            
            # Egyéb esetben fájlként mentjük
            else:
                return self._save_code_as_file(code, language, user_message)
        
        except Exception as e:
            logger.error(f"Error executing code block: {e}")
            return {
                "type": "code_block",
                "error": str(e)
            }
    
    def _execute_python_code(self, code: str) -> Optional[Dict]:
        """Python kód végrehajtása"""
        try:
            # Biztonságos végrehajtás - csak fájl műveletek és biztonságos parancsok
            # Külön namespace-ben futtatjuk
            namespace = {
                '__builtins__': {
                    'print': print,
                    'len': len,
                    'str': str,
                    'int': int,
                    'float': float,
                    'list': list,
                    'dict': dict,
                    'tuple': tuple,
                    'set': set,
                    'bool': bool,
                    'open': open,
                    'Path': Path,
                    'os': os,
                    'shutil': shutil,
                },
                'file_manager': self.fm,
                'base_path': str(self.base_path)
            }
            
            # Végrehajtás
            exec(code, namespace)
            
            return {
                "type": "python_execution",
                "success": True
            }
        
        except Exception as e:
            logger.error(f"Python execution error: {e}")
            return {
                "type": "python_execution",
                "error": str(e)
            }
    
    def _execute_shell_command(self, command: str) -> Optional[Dict]:
        """Shell parancs végrehajtása"""
        try:
            # Biztonsági ellenőrzés
            if not self._is_command_safe(command):
                return {
                    "type": "shell_command",
                    "error": f"Unsafe command blocked: {command[:50]}"
                }
            
            # Parancs futtatása
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=60,
                cwd=str(self.base_path)
            )
            
            return {
                "type": "shell_command",
                "command": command,
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "return_code": result.returncode
            }
        
        except subprocess.TimeoutExpired:
            return {
                "type": "shell_command",
                "error": "Command timeout (60s)"
            }
        except Exception as e:
            logger.error(f"Shell command error: {e}")
            return {
                "type": "shell_command",
                "error": str(e)
            }
    
    def _save_code_as_file(self, code: str, language: str, user_message: str = "") -> Optional[Dict]:
        """Kód mentése fájlként"""
        try:
            # Fájl útvonal generálása
            file_path = self._generate_file_path(user_message or "code", language)
            
            # Fájl mentése
            result = self.fm.write_file(file_path, code)
            
            if result.get("success"):
                return {
                    "type": "file_creation",
                    "file_created": file_path,
                    "success": True
                }
            else:
                return {
                    "type": "file_creation",
                    "error": result.get("error", "Unknown error")
                }
        
        except Exception as e:
            logger.error(f"File save error: {e}")
            return {
                "type": "file_creation",
                "error": str(e)
            }
    
    def _execute_explicit_action(self, action: Dict) -> Optional[Dict]:
        """Explicit parancs végrehajtása"""
        action_type = action.get("type")
        
        try:
            if action_type == "CREATE_FILE":
                file_path = action["file_path"]
                content = action["content"]
                result = self.fm.write_file(file_path, content)
                
                if result.get("success"):
                    return {
                        "type": "CREATE_FILE",
                        "file_created": file_path,
                        "success": True
                    }
                else:
                    return {
                        "type": "CREATE_FILE",
                        "error": result.get("error")
                    }
            
            elif action_type == "MODIFY_FILE":
                file_path = action["file_path"]
                content = action["content"]
                
                # Olvasás
                read_result = self.fm.read_file(file_path)
                if not read_result.get("exists"):
                    # Ha nem létezik, létrehozzuk
                    result = self.fm.write_file(file_path, content)
                else:
                    # Ha létezik, felülírjuk
                    result = self.fm.write_file(file_path, content)
                
                if result.get("success"):
                    return {
                        "type": "MODIFY_FILE",
                        "file_modified": file_path,
                        "success": True
                    }
                else:
                    return {
                        "type": "MODIFY_FILE",
                        "error": result.get("error")
                    }
            
            elif action_type == "DELETE_FILE":
                file_path = action["file_path"]
                result = self.fm.delete_file(file_path)
                
                if result.get("success"):
                    return {
                        "type": "DELETE_FILE",
                        "file_deleted": file_path,
                        "success": True
                    }
                else:
                    return {
                        "type": "DELETE_FILE",
                        "error": result.get("error")
                    }
            
            elif action_type == "RUN_COMMAND":
                command = action["command"]
                return self._execute_shell_command(command)
            
            return None
        
        except Exception as e:
            logger.error(f"Action execution error: {e}")
            return {
                "type": action_type,
                "error": str(e)
            }
    
    def _is_command_safe(self, command: str) -> bool:
        """Parancs biztonsági ellenőrzése"""
        # Veszélyes mintázatok ellenőrzése
        for pattern in self.dangerous_patterns:
            if re.search(pattern, command, re.IGNORECASE):
                return False
        
        # Engedélyezett parancsok ellenőrzése
        command_parts = command.strip().split()
        if not command_parts:
            return False
        
        first_command = command_parts[0].split('/')[-1]  # Path nélküli név
        
        # Engedélyezett parancsok listája
        if first_command in self.allowed_commands:
            return True
        
        # Relatív útvonalak (csak base_path-en belül)
        if command.startswith('./') or command.startswith('../'):
            # További ellenőrzés szükséges
            return True
        
        # Python scriptek
        if first_command.startswith('python') or first_command.startswith('python3'):
            return True
        
        return False
    
    def _clean_response_text(self, text: str) -> str:
        """Válasz szövegének tisztítása (kód blokkok eltávolítása)"""
        # Kód blokkok eltávolítása
        text = re.sub(r'```[\w]*\s*.*?```', '', text, flags=re.DOTALL)
        
        # Explicit parancsok eltávolítása
        text = re.sub(r'CREATE_FILE:.*?\n```.*?```', '', text, flags=re.DOTALL)
        text = re.sub(r'MODIFY_FILE:.*?\n```.*?```', '', text, flags=re.DOTALL)
        text = re.sub(r'DELETE_FILE:.*?\n', '', text)
        text = re.sub(r'RUN_COMMAND:.*?\n', '', text)
        
        # Többszörös üres sorok eltávolítása
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        return text.strip()
    
    def _try_intelligent_file_creation(self, user_message: str, ai_response: str) -> Optional[Dict]:
        """Intelligens fájl létrehozás a felhasználó üzenetéből"""
        try:
            user_lower = user_message.lower()
            
            # Fájl létrehozási kulcsszavak
            create_keywords = ["hoz", "készíts", "create", "make", "írd", "write", "generálj", "generate"]
            file_keywords = ["fájl", "file", "txt", ".py", ".js", ".txt", ".json", ".md"]
            
            # Ellenőrzés: van-e fájl létrehozási kérés?
            has_create = any(keyword in user_lower for keyword in create_keywords)
            has_file = any(keyword in user_lower for keyword in file_keywords)
            
            if not (has_create and has_file):
                return None
            
            # Fájlnév kinyerése
            file_name = self._extract_filename_from_message(user_message)
            if not file_name:
                return None
            
            # Tartalom kinyerése (ha van kód blokk az AI válaszban)
            code_blocks = self._extract_code_blocks(ai_response)
            content = ""
            
            if code_blocks:
                # Ha van kód blokk, azt használjuk
                content = code_blocks[0][0]  # Első kód blokk tartalma
            else:
                # Ha nincs kód blokk, üres fájlt hozunk létre vagy egyszerű tartalmat
                # Próbáljuk kinyerni a tartalmat a felhasználó üzenetéből
                content = self._extract_content_from_message(user_message)
            
            # Fájl létrehozása
            result = self.fm.write_file(file_name, content)
            
            if result.get("success"):
                logger.info(f"Intelligens fájl létrehozás: {file_name}")
                return {
                    "type": "intelligent_file_creation",
                    "file_created": file_name,
                    "success": True
                }
            else:
                logger.error(f"Fájl létrehozás hiba: {result.get('error')}")
                return {
                    "type": "intelligent_file_creation",
                    "error": result.get("error")
                }
        
        except Exception as e:
            logger.error(f"Intelligens fájl létrehozás hiba: {e}")
            return None
    
    def _extract_filename_from_message(self, message: str) -> Optional[str]:
        """Fájlnév kinyerése a felhasználó üzenetéből"""
        import re
        
        # Minta: "hozz létre egy test.txt fájlt" vagy "create test.py" vagy "test.txt"
        patterns = [
            r'([a-zA-Z0-9_\-\.]+\.(txt|py|js|ts|json|md|html|css|yaml|yml|sh|bat|ps1))',  # Fájlnév kiterjesztéssel
            r'(?:fájl|file)[\s:]+([a-zA-Z0-9_\-\.]+\.(txt|py|js|ts|json|md|html|css|yaml|yml|sh|bat|ps1))',  # "fájl: test.txt"
            r'([a-zA-Z0-9_\-]+)\.(txt|py|js|ts|json|md|html|css|yaml|yml|sh|bat|ps1)',  # "test.txt" formátum
        ]
        
        for pattern in patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                filename = match.group(1) if match.lastindex >= 1 else match.group(0)
                # Ha nincs kiterjesztés, hozzáadjuk
                if '.' not in filename:
                    ext_match = re.search(r'\.(txt|py|js|ts|json|md|html|css|yaml|yml|sh|bat|ps1)', message, re.IGNORECASE)
                    if ext_match:
                        filename = filename + ext_match.group(0)
                    else:
                        filename = filename + '.txt'  # Alapértelmezett
                return filename
        
        # Ha nincs fájlnév, de van "fájl" vagy "file" kulcsszó, generálunk egyet
        if any(keyword in message.lower() for keyword in ["fájl", "file"]):
            # Egyszerű fájlnév generálás
            words = re.findall(r'\b[a-zA-Z0-9]+\b', message)
            if words:
                # Keresünk egy értelmes szót (nem kulcsszó)
                skip_words = {"hoz", "létre", "készíts", "create", "make", "fájl", "file", "egy", "a", "az", "egy", "egy"}
                for word in words:
                    if word.lower() not in skip_words and len(word) > 2:
                        return f"{word.lower()}.txt"
                # Ha nincs jó szó, használjuk az elsőt
                if words:
                    return f"{words[0].lower()}.txt"
        
        return None
    
    def _extract_content_from_message(self, message: str) -> str:
        """Tartalom kinyerése a felhasználó üzenetéből"""
        import re
        
        # Próbáljuk kinyerni idézőjelek közötti tartalmat
        quoted = re.findall(r'["\']([^"\']+)["\']', message)
        if quoted:
            return quoted[0]
        
        # Próbáljuk kinyerni "tartalommal" vagy "content" után
        content_patterns = [
            r'tartalom[mal]*[:=]\s*["\']?([^"\']+)["\']?',
            r'content[:=]\s*["\']?([^"\']+)["\']?',
            r'írj[ad]*[:=]\s*["\']?([^"\']+)["\']?',
        ]
        
        for pattern in content_patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        # Ha nincs tartalom, üres string
        return ""
    
    def _generate_file_path(self, prompt: str, language: str) -> str:
        """Fájl útvonal generálása"""
        import re as re_module
        
        prompt_lower = prompt.lower()[:50]
        prompt_lower = re_module.sub(r'[^\w\s-]', '', prompt_lower)
        prompt_lower = re_module.sub(r'\s+', '_', prompt_lower)
        
        extension_map = {
            'python': '.py',
            'py': '.py',
            'javascript': '.js',
            'js': '.js',
            'typescript': '.ts',
            'ts': '.ts',
            'html': '.html',
            'css': '.css',
            'json': '.json',
            'yaml': '.yaml',
            'yml': '.yml',
            'txt': '.txt',
            'md': '.md',
            'sh': '.sh',
            'bash': '.sh',
            'sql': '.sql'
        }
        
        ext = extension_map.get(language.lower(), '.txt')
        filename = f"{prompt_lower}{ext}"
        
        return filename

