# 📁 Projekt struktúra

## Mappa struktúra

```
ZedinArkManager/
├── core/                      # Core modulok (minden modul külön fájlban)
│   ├── __init__.py
│   ├── llm_service.py         # Ollama LLM integráció
│   ├── file_manager.py        # Fájl műveletek kezelése
│   ├── response_cache.py      # Válasz cache kezelés
│   ├── project_manager.py     # Projekt kezelés
│   └── conversation_memory.py # Beszélgetési memória
│
├── modules/                   # Funkcionális modulok (minden modul külön fájlban)
│   ├── __init__.py
│   ├── code_generator.py      # Kód generálás
│   ├── project_context.py     # Projekt kontextus kezelés
│   └── prompt_builder.py      # Prompt építés
│
├── installers/                # Telepítési fájlok
│   ├── install.sh             # Fő telepítési script (Linux)
│   ├── requirements.txt       # Python függőségek
│   └── setup_env.sh           # Környezeti változók beállítása
│
├── docs/                      # Dokumentáció
│   ├── PROJECT_STRUCTURE.md
│   ├── API_DOCUMENTATION.md
│   ├── USAGE_GUIDE.md
│   └── ...
│
├── logs/                      # Log fájlok (generált, gitignore-ban)
│   ├── app.log
│   ├── error.log
│   └── access.log
│
├── projects/                  # Felhasználói projektek (generált)
│   └── .gitkeep
│
├── data/                      # Adat fájlok
│   ├── cache/                 # Response cache
│   └── memory/                # Conversation memory
│
├── main.py                    # FastAPI alkalmazás fő fájl
├── start.sh                   # Mindent elindító script
├── how_to_install.md          # Linux telepítési útmutató
├── .gitignore
└── README.md
```

## Elvek

1. **Moduláris felépítés**: Minden modul külön fájlban
2. **Tiszta szeparáció**: Core funkciók vs. Business logika
3. **Könnyű karbantartás**: Kis, átlátható fájlok
4. **Logikus elrendezés**: Minden a helyén van

