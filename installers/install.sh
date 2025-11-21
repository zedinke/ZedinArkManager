#!/bin/bash
# ZedinArkManager teljes újratelepítési script Linuxra (Debian 12)
# Figyelmeztetés: Ez a script MINDENT töröl és újratelepít!

set -e

echo "========================================="
echo "ZedinArkManager TELJES ÚJRATELEPÍTÉS"
echo "========================================="
echo ""
echo "⚠️  FIGYELMEZTETÉS: Ez a script törölni fogja:"
echo "   - Virtuális környezet (ai_venv)"
echo "   - Ollama és modellek"
echo "   - Python függőségek"
echo "   - Cache és memória adatok"
echo ""
read -p "Folytatod? (i/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ii]$ ]]; then
    echo "❌ Telepítés megszakítva"
    exit 1
fi

echo ""
echo "========================================="
echo "1. KOMPONENSEK TÖRLÉSE"
echo "========================================="

# 1.1 Virtuális környezet törlése
echo "🗑️  Virtuális környezet törlése..."
VENV_PATHS=("../ai_venv" "./ai_venv" "ai_venv")
for venv_path in "${VENV_PATHS[@]}"; do
    if [ -d "$venv_path" ]; then
        echo "   Törlés: $venv_path"
        rm -rf "$venv_path"
        echo "   ✅ Törölve: $venv_path"
    fi
done

# 1.2 Ollama leállítása és eltávolítása
echo "🗑️  Ollama leállítása és törlése..."
if command -v ollama &> /dev/null; then
    # Ollama processek leállítása
    if pgrep -x ollama > /dev/null; then
        echo "   Ollama leállítása..."
        pkill -x ollama || true
        sleep 2
    fi
    
    # Ollama modellek törlése
    echo "   Ollama modellek törlése..."
    OLLAMA_DIR="$HOME/.ollama"
    if [ -d "$OLLAMA_DIR" ]; then
        echo "   Törlés: $OLLAMA_DIR"
        rm -rf "$OLLAMA_DIR"
        echo "   ✅ Ollama modellek törölve"
    fi
    
    # Ollama bináris eltávolítása (ha van)
    echo "   Ollama bináris eltávolítása..."
    sudo rm -f /usr/local/bin/ollama 2>/dev/null || true
    sudo rm -f /usr/bin/ollama 2>/dev/null || true
    echo "   ✅ Ollama eltávolítva"
else
    echo "   ℹ️  Ollama nem található"
fi

# 1.3 Cache és memória adatok törlése
echo "🗑️  Cache és memória adatok törlése..."
if [ -d "data/cache" ]; then
    rm -rf data/cache/*
    echo "   ✅ Cache törölve"
fi
if [ -d "data/memory" ]; then
    rm -rf data/memory/*
    echo "   ✅ Memória adatok törölve"
fi
if [ -d "../data/cache" ]; then
    rm -rf ../data/cache/*
    echo "   ✅ Cache törölve (szülő mappa)"
fi
if [ -d "../data/memory" ]; then
    rm -rf ../data/memory/*
    echo "   ✅ Memória adatok törölve (szülő mappa)"
fi

# 1.4 Logok törlése (opcionális - ha szeretnéd)
echo "🗑️  Log fájlok törlése..."
if [ -d "logs" ]; then
    rm -f logs/*.log 2>/dev/null || true
    echo "   ✅ Logok törölve"
fi
if [ -d "../logs" ]; then
    rm -f ../logs/*.log 2>/dev/null || true
    echo "   ✅ Logok törölve (szülő mappa)"
fi

echo ""
echo "========================================="
echo "2. TELEPÍTÉS"
echo "========================================="

# 2.1 Python ellenőrzése
echo "🔍 Python ellenőrzése..."
if ! command -v python3 &> /dev/null; then
    echo "📦 Python3 telepítése..."
    sudo apt update
    sudo apt install python3 python3-pip python3-venv -y
else
    echo "✅ Python3 telepítve: $(python3 --version)"
fi

if ! command -v pip3 &> /dev/null; then
    echo "📦 pip3 telepítése..."
    sudo apt install python3-pip -y
else
    echo "✅ pip3 telepítve"
fi

# 2.2 Docker ellenőrzése és telepítése (ha nincs)
echo "🔍 Docker ellenőrzése..."
if command -v docker &> /dev/null; then
    echo "✅ Docker már telepítve: $(docker --version)"
    echo "   ℹ️  Docker-t nem módosítjuk"
    
    # Docker Compose ellenőrzése
    if command -v docker-compose &> /dev/null; then
        echo "✅ Docker Compose telepítve: $(docker-compose --version)"
    else
        # Próbáljuk meg a docker compose plugin-t (újabb verziók)
        if docker compose version &> /dev/null; then
            echo "✅ Docker Compose (plugin) telepítve"
        else
            echo "📦 Docker Compose telepítése..."
            sudo apt install docker-compose -y || true
        fi
    fi
else
    echo "📦 Docker telepítése..."
    # Docker telepítés (Debian/Ubuntu)
    sudo apt update
    sudo apt install -y ca-certificates curl gnupg lsb-release
    
    # Docker GPG key hozzáadása
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Docker repository hozzáadása
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Docker telepítése
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Docker Compose (ha a plugin nem elég)
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        sudo apt install docker-compose -y || true
    fi
    
    echo "✅ Docker telepítve: $(docker --version)"
fi

# 2.3 Könyvtárak létrehozása
echo "📁 Könyvtárak létrehozása..."
mkdir -p logs data/cache data/memory projects
if [ ! -d "../logs" ]; then
    mkdir -p ../logs ../data/cache ../data/memory ../projects
fi
echo "✅ Könyvtárak létrehozva"

# 2.4 Virtuális környezet létrehozása
echo "📦 Virtuális környezet létrehozása..."
VENV_PATH="ai_venv"
if [ ! -d "$VENV_PATH" ]; then
    # Próbáljuk meg a szülő mappában is
    if [ -d ".." ] && [ ! -d "../ai_venv" ]; then
        python3 -m venv "../ai_venv"
        VENV_PATH="../ai_venv"
        echo "✅ Virtuális környezet létrehozva: $VENV_PATH"
    else
        python3 -m venv "$VENV_PATH"
        echo "✅ Virtuális környezet létrehozva: $VENV_PATH"
    fi
else
    echo "⚠️  Virtuális környezet már létezik: $VENV_PATH"
fi

# 2.5 Virtuális környezet aktiválása
echo "📝 Virtuális környezet aktiválása..."
if [ -d "../ai_venv" ]; then
    source "../ai_venv/bin/activate"
    VENV_PATH="../ai_venv"
elif [ -d "ai_venv" ]; then
    source "ai_venv/bin/activate"
    VENV_PATH="ai_venv"
else
    echo "❌ Virtuális környezet nem található!"
    exit 1
fi

if [[ "$VIRTUAL_ENV" != "" ]]; then
    echo "✅ Virtuális környezet aktív: $VIRTUAL_ENV"
else
    echo "❌ Virtuális környezet aktiválása sikertelen!"
    exit 1
fi

# 2.6 Python függőségek telepítése
echo "📦 Python függőségek telepítése..."
pip3 install --upgrade pip
pip3 install -r installers/requirements.txt
echo "✅ Python függőségek telepítve"

# 2.7 Ollama telepítése
echo "📦 Ollama telepítése..."
if ! command -v ollama &> /dev/null; then
    curl https://ollama.com/install.sh | sh
    echo "✅ Ollama telepítve: $(ollama --version)"
else
    echo "✅ Ollama már telepítve: $(ollama --version)"
fi

# 2.8 Jogosultságok beállítása
echo "🔐 Jogosultságok beállítása..."
chmod +x start.sh 2>/dev/null || true
chmod +x installers/install.sh 2>/dev/null || true
if [ -f "../start.sh" ]; then
    chmod +x ../start.sh
fi
chmod -R 755 logs data projects 2>/dev/null || true
if [ -d "../logs" ]; then
    chmod -R 755 ../logs ../data ../projects 2>/dev/null || true
fi
echo "✅ Jogosultságok beállítva"

# 2.9 Környezeti változók fájl létrehozása
echo "📝 .env fájl létrehozása..."
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ] && [ -f "../.env" ]; then
    ENV_FILE="../.env"
fi

cat > "$ENV_FILE" << EOF
# Ollama beállítások
OLLAMA_URL=http://localhost:11434
DEFAULT_MODEL=llama3.1:8b

# Projekt beállítások
PROJECT_BASE_PATH=.

# Optimalizáció
OLLAMA_NUM_GPU_LAYERS=
OLLAMA_NUM_THREADS=32
EOF
echo "✅ .env fájl létrehozva: $ENV_FILE"

# 2.10 Ollama indítása
echo "🚀 Ollama indítása..."
if pgrep -x ollama > /dev/null; then
    echo "   ℹ️  Ollama már fut"
else
    LOG_DIR="logs"
    if [ -d "../logs" ]; then
        LOG_DIR="../logs"
    fi
    nohup ollama serve > "$LOG_DIR/ollama.log" 2>&1 &
    sleep 3
    echo "✅ Ollama indítva"
fi

# 2.11 Modell telepítése
echo "📥 Modell telepítése (llama3.1:8b)..."
echo "   ⏳ Ez időbe telhet (~4-5GB letöltés)..."
ollama pull llama3.1:8b
echo "✅ Modell telepítve"

echo ""
echo "========================================="
echo "✅ TELEPÍTÉS BEFEJEZVE!"
echo "========================================="
echo ""
echo "Következő lépések:"
if [ "$VENV_PATH" = "../ai_venv" ]; then
    echo "1. Aktiváld a virtuális környezetet: source ai_venv/bin/activate"
else
    echo "1. Aktiváld a virtuális környezetet: source $VENV_PATH/bin/activate"
fi
echo "2. Indítsd el a szervert: ./start.sh"
echo ""
echo "Az Ollama már fut és a modell telepítve van."
echo ""
