#!/bin/bash
# ZedinArkManager telepítési script Linuxra (Debian 12)

set -e

echo "========================================="
echo "ZedinArkManager telepítés"
echo "========================================="

# Ellenőrzések
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 nincs telepítve!"
    exit 1
fi

if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 nincs telepítve!"
    exit 1
fi

# Könyvtárak létrehozása
echo "📁 Könyvtárak létrehozása..."
mkdir -p logs data/cache data/memory projects

# Python függőségek telepítése
echo "📦 Python függőségek telepítése..."
pip3 install --upgrade pip
pip3 install -r installers/requirements.txt

# Ollama ellenőrzése
echo "🔍 Ollama ellenőrzése..."
if ! command -v ollama &> /dev/null; then
    echo "⚠️  Ollama nincs telepítve!"
    echo "   Telepítés: curl https://ollama.com/install.sh | sh"
    echo "   Vagy lásd: https://ollama.com/download"
else
    echo "✅ Ollama telepítve"
fi

# Jogosultságok beállítása
echo "🔐 Jogosultságok beállítása..."
chmod +x start.sh
chmod +x installers/install.sh

# Környezeti változók fájl létrehozása (ha nincs)
if [ ! -f .env ]; then
    echo "📝 .env fájl létrehozása..."
    cat > .env << EOF
# Ollama beállítások
OLLAMA_URL=http://localhost:11434
DEFAULT_MODEL=llama3.1:8b

# Projekt beállítások
PROJECT_BASE_PATH=.

# Optimalizáció
OLLAMA_NUM_GPU_LAYERS=
OLLAMA_NUM_THREADS=
EOF
    echo "✅ .env fájl létrehozva (szerkeszd ha szükséges)"
fi

echo ""
echo "========================================="
echo "✅ Telepítés befejezve!"
echo "========================================="
echo ""
echo "Következő lépések:"
echo "1. Állítsd be a .env fájlt (ha szükséges)"
echo "2. Indítsd el az Ollama-t: ollama serve"
echo "3. Telepítsd a modelt: ollama pull llama3.1:8b"
echo "4. Indítsd el a szervert: ./start.sh"
echo ""

