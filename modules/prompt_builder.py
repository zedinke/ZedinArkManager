"""
Prompt Builder - Prompt építés és formázás
"""
from typing import List, Dict, Optional


def build_chat_prompt(messages: List[Dict[str, str]], system_prompt: Optional[str] = None) -> str:
    """Chat prompt építése"""
    prompt_parts = []
    
    if system_prompt:
        prompt_parts.append(f"System: {system_prompt}\n")
    
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        prompt_parts.append(f"{role.capitalize()}: {content}\n")
    
    prompt_parts.append("Assistant: ")
    return "".join(prompt_parts)


def build_code_generation_prompt(prompt: str, language: str = "python", 
                                context: Optional[str] = None) -> str:
    """Kód generálási prompt építése"""
    system_prompt = f"""Te egy professzionális programozó vagy.
Amikor kódot generálsz, MINDIG csak a kódot add vissza ```{language} blokkban.
Ne adj magyarázatot, csak a kódot. A kód teljes és működőképes legyen."""
    
    if context:
        full_prompt = f"""{system_prompt}

Kontextus:
{context}

Feladat:
{prompt}

Kód:"""
    else:
        full_prompt = f"""{system_prompt}

Feladat:
{prompt}

Kód:"""
    
    return full_prompt


def build_edit_prompt(file_content: str, instruction: str, language: str = "python") -> str:
    """Kód szerkesztési prompt építése"""
    prompt = f"""Te egy professzionális programozó vagy.

Jelenlegi kód:
```{language}
{file_content}
```

Utasítás:
{instruction}

Szerkesztett kód (csak a kódot add vissza ```{language} blokkban):"""
    
    return prompt


def build_explain_prompt(file_content: str, language: str = "python") -> str:
    """Kód magyarázati prompt építése"""
    prompt = f"""Magyarázzd el ezt a {language} kódot részletesen magyarul.

Kód:
```{language}
{file_content}
```

Magyarázat:"""
    
    return prompt


def build_refactor_prompt(file_content: str, refactor_type: str, language: str = "python") -> str:
    """Refaktorálási prompt építése"""
    refactor_descriptions = {
        "clean": "Tisztítsd meg a kódot, távolítsd el a felesleges részeket",
        "optimize": "Optimalizáld a kódot teljesítmény szempontjából",
        "modernize": "Modernizáld a kódot a nyelv legújabb funkcióival"
    }
    
    instruction = refactor_descriptions.get(refactor_type, refactor_descriptions["clean"])
    
    prompt = f"""Te egy professzionális programozó vagy.

Jelenlegi kód:
```{language}
{file_content}
```

Utasítás: {instruction}

Refaktorált kód (csak a kódot add vissza ```{language} blokkban):"""
    
    return prompt

