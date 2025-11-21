#!/bin/bash
# ZedinArkManager Docker telepítési script

set -e

echo "========================================="
echo "ZedinArkManager Docker telepítés"
echo "========================================="

# Docker ellenőrzése
if ! command -v docker &> /dev/null; then
    echo "❌ Docker nincs telepítve!"
    echo "   Telepítés: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker telepítve"

# Docker Compose ellenőrzése
if ! command -v docker-compose &> /dev/null; then
    echo "⚠️  Docker Compose nincs telepítve!"
    echo "   Telepítés: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker Compose telepítve"

# Mappák létrehozása
echo "📁 Mappák létrehozása..."
mkdir -p ../logs ../data/cache ../data/memory ../projects

# Jogosultságok beállítása
echo "🔐 Jogosultságok beállítása..."
chmod -R 755 ../logs ../data ../projects

# Docker Compose fájl ellenőrzése
if [ ! -f docker-compose.yml ]; then
    echo "❌ docker-compose.yml fájl nem található!"
    exit 1
fi

echo ""
echo "========================================="
echo "✅ Docker telepítés befejezve!"
echo "========================================="
echo ""
echo "Következő lépések:"
echo "1. Build és indítás: docker-compose up -d"
echo "2. Logok: docker-compose logs -f"
echo "3. Leállítás: docker-compose down"
echo ""

