#!/bin/bash
# Komplett rendszer telepítés és javítás script
# SSH-n keresztül futtatható

set -e

echo "========================================="
echo "ZedinArkManager - Komplett Telepítés"
echo "========================================="
echo ""

# Színek
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Mappa ellenőrzése
if [ ! -d "$HOME/ZedinArkManager" ]; then
    echo -e "${RED}❌ ZedinArkManager mappa nem található!${NC}"
    echo "Először klónozd le a repository-t:"
    echo "  git clone https://github.com/zedinke/ZedinArkManager.git"
    exit 1
fi

cd ~/ZedinArkManager

echo -e "${GREEN}✅ Mappa megtalálva: $PWD${NC}"
echo ""

# 1. Python és pip ellenőrzése
echo "========================================="
echo "1. Python ellenőrzése"
echo "========================================="

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 nem található!${NC}"
    echo "Telepítés..."
    sudo apt update
    sudo apt install -y python3 python3-pip python3-venv
else
    echo -e "${GREEN}✅ Python3 telepítve: $(python3 --version)${NC}"
fi

if ! command -v pip3 &> /dev/null; then
    echo -e "${RED}❌ pip3 nem található!${NC}"
    echo "Telepítés..."
    sudo apt install -y python3-pip
else
    echo -e "${GREEN}✅ pip3 telepítve: $(pip3 --version)${NC}"
fi

echo ""

# 2. Virtuális környezet ellenőrzése és létrehozása
echo "========================================="
echo "2. Virtuális környezet beállítása"
echo "========================================="

if [ ! -d "ai_venv" ]; then
    echo "Virtuális környezet létrehozása..."
    python3 -m venv ai_venv
    echo -e "${GREEN}✅ Virtuális környezet létrehozva${NC}"
else
    echo -e "${GREEN}✅ Virtuális környezet már létezik${NC}"
fi

# Aktiválás
echo "Virtuális környezet aktiválása..."
source ai_venv/bin/activate

# pip frissítése
echo "pip frissítése..."
pip install --upgrade pip setuptools wheel

echo ""

# 3. Python függőségek telepítése
echo "========================================="
echo "3. Python függőségek telepítése"
echo "========================================="

if [ -f "installers/requirements.txt" ]; then
    echo "Függőségek telepítése installers/requirements.txt-ből..."
    pip install -r installers/requirements.txt
elif [ -f "requirements.txt" ]; then
    echo "Függőségek telepítése requirements.txt-ből..."
    pip install -r requirements.txt
else
    echo -e "${YELLOW}⚠️  requirements.txt nem található, alapvető függőségek telepítése...${NC}"
    pip install fastapi uvicorn[standard] pydantic requests python-multipart
fi

echo -e "${GREEN}✅ Python függőségek telepítve${NC}"
echo ""

# 4. Könyvtárak létrehozása
echo "========================================="
echo "4. Könyvtárak létrehozása"
echo "========================================="

mkdir -p data/cache
mkdir -p data/memory
mkdir -p data
mkdir -p logs
mkdir -p projects

echo -e "${GREEN}✅ Könyvtárak létrehozva${NC}"
echo ""

# 5. Ollama ellenőrzése
echo "========================================="
echo "5. Ollama ellenőrzése"
echo "========================================="

if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}⚠️  Ollama nem található${NC}"
    echo "Ollama telepítése..."
    curl -fsSL https://ollama.com/install.sh | sh
else
    echo -e "${GREEN}✅ Ollama telepítve: $(ollama --version)${NC}"
fi

# Ollama indítása (ha nem fut)
if ! pgrep -x "ollama" > /dev/null; then
    echo "Ollama indítása..."
    ollama serve &
    sleep 3
    echo -e "${GREEN}✅ Ollama indítva${NC}"
else
    echo -e "${GREEN}✅ Ollama már fut${NC}"
fi

# Modellek ellenőrzése
echo "Telepített modellek ellenőrzése..."
MODELS=$(ollama list 2>/dev/null || echo "")
if echo "$MODELS" | grep -q "llama3.1:8b"; then
    echo -e "${GREEN}✅ llama3.1:8b modell telepítve${NC}"
else
    echo -e "${YELLOW}⚠️  llama3.1:8b modell nincs telepítve, telepítés...${NC}"
    ollama pull llama3.1:8b
    echo -e "${GREEN}✅ llama3.1:8b modell telepítve${NC}"
fi

echo ""

# 6. .env fájl létrehozása
echo "========================================="
echo "6. Környezeti változók beállítása"
echo "========================================="

if [ ! -f ".env" ]; then
    echo ".env fájl létrehozása..."
    cat > .env << EOF
# ZedinArkManager környezeti változók
PROJECT_BASE_PATH=.
OLLAMA_URL=http://localhost:11434
DEFAULT_MODEL=llama3.1:8b

# Autentikáció (false = kikapcsolva, true = bekapcsolva)
ENABLE_AUTH=false

# GPU beállítások (üres = automatikus)
# OLLAMA_NUM_GPU_LAYERS=
# OLLAMA_NUM_THREADS=
EOF
    echo -e "${GREEN}✅ .env fájl létrehozva${NC}"
else
    echo -e "${GREEN}✅ .env fájl már létezik${NC}"
fi

echo ""

# 7. Jogosultságok beállítása
echo "========================================="
echo "7. Jogosultságok beállítása"
echo "========================================="

chmod +x installers/*.sh 2>/dev/null || true
chmod +x start.sh 2>/dev/null || true
chmod 755 data logs projects 2>/dev/null || true

echo -e "${GREEN}✅ Jogosultságok beállítva${NC}"
echo ""

# 8. Tesztelés
echo "========================================="
echo "8. Rendszer tesztelése"
echo "========================================="

# Python importok ellenőrzése
echo "Python modulok ellenőrzése..."
python3 -c "
import sys
sys.path.insert(0, '.')
try:
    from core.llm_service import LLMService
    from core.auth import api_key_manager
    from core.gpu_manager import gpu_manager
    print('✅ Alapvető modulok importálhatók')
except Exception as e:
    print(f'❌ Hiba: {e}')
    sys.exit(1)
"

# Ollama kapcsolat ellenőrzése
echo "Ollama kapcsolat ellenőrzése..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Ollama elérhető${NC}"
else
    echo -e "${YELLOW}⚠️  Ollama nem elérhető, de a rendszer működhet később${NC}"
fi

echo ""

# 9. Összefoglaló
echo "========================================="
echo "✅ TELEPÍTÉS BEFEJEZVE!"
echo "========================================="
echo ""
echo "Következő lépések:"
echo ""
echo "1. Aktiváld a virtuális környezetet:"
echo "   source ai_venv/bin/activate"
echo ""
echo "2. Indítsd el a szervert:"
echo "   python main.py"
echo ""
echo "3. Teszteld az API-t (másik terminálban):"
echo "   curl http://localhost:8000/health"
echo ""
echo "4. API kulcs generálása (ha szükséges):"
echo "   curl -X POST http://localhost:8000/api/auth/generate \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"name\": \"Test Key\", \"description\": \"Test\"}'"
echo ""
echo "========================================="

