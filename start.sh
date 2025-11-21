#!/bin/bash
# ZedinArkManager szerver indító script

set -e

# Színek
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "ZedinArkManager - Szerver indítása"
echo "========================================="
echo ""

# Mappa ellenőrzése
if [ ! -d "$HOME/ZedinArkManager" ]; then
    echo "❌ ZedinArkManager mappa nem található!"
    exit 1
fi

cd ~/ZedinArkManager

# Virtuális környezet ellenőrzése
if [ ! -d "ai_venv" ]; then
    echo "❌ Virtuális környezet nem található!"
    echo "Futtasd először: ./installers/setup_complete.sh"
    exit 1
fi

# Virtuális környezet aktiválása
echo "Virtuális környezet aktiválása..."
source ai_venv/bin/activate

# Ollama ellenőrzése
echo "Ollama ellenőrzése..."
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Ollama nem fut, indítás...${NC}"
    ollama serve > /dev/null 2>&1 &
    sleep 3
fi

echo -e "${GREEN}✅ Ollama elérhető${NC}"
echo ""

# Port ellenőrzése
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  A 8000-es port már foglalt!${NC}"
    echo "Futó folyamat leállítása..."
    pkill -f "python.*main.py" || true
    sleep 2
fi

echo "========================================="
echo "Szerver indítása..."
echo "========================================="
echo ""
echo "A szerver a következő címen lesz elérhető:"
echo "  - http://localhost:8000"
echo "  - http://135.181.165.27:8000"
echo ""
echo "API dokumentáció:"
echo "  - http://localhost:8000/docs"
echo ""
echo "Leállítás: Ctrl+C"
echo ""
echo "========================================="
echo ""

# Szerver indítása (reload nélkül - jobb teljesítmény)
python main.py --no-reload
