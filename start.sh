#!/bin/bash
# ZedinArkManager indító script - Mindent elindít

set -e

echo "========================================="
echo "ZedinArkManager indítása"
echo "========================================="

# Könyvtárak létrehozása ha nincsenek
mkdir -p logs data/cache data/memory projects

# Ollama ellenőrzése
echo "🔍 Ollama ellenőrzése..."
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama nincs telepítve!"
    echo "   Telepítés: curl https://ollama.com/install.sh | sh"
    exit 1
fi

# Ollama fut-e?
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "⚠️  Ollama nem fut!"
    echo "   Indítsd el: ollama serve"
    echo "   Vagy hátérben: nohup ollama serve > logs/ollama.log 2>&1 &"
    read -p "Indítsam most? (i/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ii]$ ]]; then
        echo "🚀 Ollama indítása hátérben..."
        nohup ollama serve > logs/ollama.log 2>&1 &
        sleep 2
        echo "✅ Ollama indítva"
    else
        exit 1
    fi
else
    echo "✅ Ollama fut"
fi

# Modellek ellenőrzése
echo "🔍 Modellek ellenőrzése..."
MODELS=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | head -1 || echo "")
if [ -z "$MODELS" ]; then
    echo "⚠️  Nincs telepített modell!"
    echo "   Telepítés: ollama pull llama3.1:8b"
    read -p "Telepítsem most? (i/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ii]$ ]]; then
        echo "📥 Modell telepítése (ez időbe telhet)..."
        ollama pull llama3.1:8b
    fi
else
    echo "✅ Modellek telepítve"
fi

# Python ellenőrzése
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 nincs telepítve!"
    exit 1
fi

# Virtuális környezet ellenőrzése és aktiválása
if [ -d "ai_venv" ]; then
    echo "✅ Virtuális környezet találva (ai_venv)"
    echo "📝 Aktiválás..."
    source ai_venv/bin/activate
    
    # Ellenőrzés, hogy aktiválva van-e
    if [[ "$VIRTUAL_ENV" != "" ]]; then
        echo "✅ Virtuális környezet aktív: $VIRTUAL_ENV"
    else
        echo "⚠️  Virtuális környezet aktiválása sikertelen, folytatás rendszer Python-nal"
    fi
else
    echo "⚠️  Virtuális környezet (ai_venv) nem található"
    echo "   Folytatás rendszer Python-nal"
    echo "   Használd: python3 -m venv ai_venv && source ai_venv/bin/activate"
fi

# Függőségek ellenőrzése
echo "🔍 Függőségek ellenőrzése..."
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "⚠️  Python függőségek nincsenek telepítve!"
    echo "   Telepítés: pip3 install -r installers/requirements.txt"
    read -p "Telepítsem most? (i/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ii]$ ]]; then
        pip3 install -r installers/requirements.txt
    else
        exit 1
    fi
fi

# Környezeti változók betöltése (.env ha van)
if [ -f .env ]; then
    echo "📝 Környezeti változók betöltése (.env)..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Szerver indítása
echo ""
echo "🚀 FastAPI szerver indítása..."
echo "   API: http://localhost:8000"
echo "   Docs: http://localhost:8000/docs"
echo "   Logok: logs/app.log"
echo ""
echo "Leállítás: Ctrl+C"
echo "========================================="
echo ""

# FastAPI indítása (virtuális környezetben, ha aktív)
python3 main.py

