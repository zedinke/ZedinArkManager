#!/bin/bash
# Virtuális környezet létrehozása

set -e

echo "========================================="
echo "Virtuális környezet létrehozása"
echo "========================================="

# Python ellenőrzése
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 nincs telepítve!"
    exit 1
fi

# Virtuális környezet létrehozása
VENV_PATH="ai_venv"

if [ -d "$VENV_PATH" ]; then
    echo "⚠️  Virtuális környezet már létezik: $VENV_PATH"
    read -p "Töröljem és hozzam létre újra? (i/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ii]$ ]]; then
        echo "🗑️  Régi virtuális környezet törlése..."
        rm -rf "$VENV_PATH"
    else
        echo "❌ Művelet megszakítva"
        exit 1
    fi
fi

echo "📦 Virtuális környezet létrehozása: $VENV_PATH"
python3 -m venv "$VENV_PATH"

echo "📝 Virtuális környezet aktiválása..."
source "$VENV_PATH/bin/activate"

if [[ "$VIRTUAL_ENV" != "" ]]; then
    echo "✅ Virtuális környezet aktív: $VIRTUAL_ENV"
    echo ""
    echo "Következő lépések:"
    echo "1. Aktiváld: source ai_venv/bin/activate"
    echo "2. Telepítsd a függőségeket: pip3 install -r installers/requirements.txt"
else
    echo "❌ Virtuális környezet aktiválása sikertelen!"
    exit 1
fi

