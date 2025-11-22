#!/bin/bash
# Gyors aiohttp telepítési script

echo "========================================="
echo "aiohttp telepítése"
echo "========================================="

# Virtual environment keresése
if [ -d "ai_venv" ]; then
    VENV_PATH="ai_venv"
    echo "✅ Virtual environment található: $VENV_PATH"
elif [ -d "../ai_venv" ]; then
    VENV_PATH="../ai_venv"
    echo "✅ Virtual environment található: $VENV_PATH"
else
    echo "❌ Virtual environment nem található!"
    echo "Hozd létre: python3 -m venv ai_venv"
    exit 1
fi

# Virtual environment aktiválása
echo "📝 Virtual environment aktiválása..."
source "$VENV_PATH/bin/activate"

if [[ "$VIRTUAL_ENV" != "" ]]; then
    echo "✅ Virtual environment aktív: $VIRTUAL_ENV"
else
    echo "❌ Virtual environment aktiválása sikertelen!"
    exit 1
fi

# pip frissítése
echo "📦 pip frissítése..."
pip install --upgrade pip

# aiohttp telepítése
echo "📦 aiohttp telepítése..."
pip install aiohttp==3.9.1

# Ellenőrzés
echo "🔍 Ellenőrzés..."
if python -c "import aiohttp; print(f'✅ aiohttp telepítve: {aiohttp.__version__}')" 2>/dev/null; then
    echo ""
    echo "========================================="
    echo "✅ SIKERES TELEPÍTÉS!"
    echo "========================================="
    echo ""
    echo "A virtual environment aktív marad, amíg ki nem lép belőle."
    echo "Kijelentkezéshez: deactivate"
else
    echo "❌ Telepítés sikertelen!"
    exit 1
fi

