#!/bin/bash
# Gyors API teszt - CPU pörgés elkerülése érdekében

set -e

API_URL="http://localhost:8000"

echo "========================================="
echo "ZedinArkManager - Gyors API Teszt"
echo "========================================="
echo ""

# Színek
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Health check
echo "1. Health check..."
if curl -s --max-time 5 "$API_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ Health check OK${NC}"
    curl -s --max-time 5 "$API_URL/health" | python3 -m json.tool | head -10
else
    echo -e "${RED}❌ Health check FAILED${NC}"
    exit 1
fi

echo ""

# 2. Ollama ellenőrzése
echo "2. Ollama ellenőrzése..."
if curl -s --max-time 5 http://localhost:11434/api/tags > /dev/null; then
    echo -e "${GREEN}✅ Ollama elérhető${NC}"
else
    echo -e "${RED}❌ Ollama nem elérhető${NC}"
    echo "Indítsd el: ollama serve &"
    exit 1
fi

echo ""

# 3. Modellek listázása
echo "3. Modellek listázása..."
MODELS=$(curl -s --max-time 5 "$API_URL/api/models")
if [ ! -z "$MODELS" ]; then
    echo -e "${GREEN}✅ Modellek elérhetők${NC}"
    echo "$MODELS" | python3 -m json.tool | head -15
else
    echo -e "${YELLOW}⚠️  Modellek nem elérhetők${NC}"
fi

echo ""

echo "========================================="
echo -e "${GREEN}✅ GYORS TESZT BEFEJEZVE!${NC}"
echo "========================================="
echo ""
echo -e "${YELLOW}ℹ️  Chat teszt kihagyva (CPU intenzív)${NC}"
echo "Chat teszteléshez használd a stream endpoint-ot:"
echo "  curl -X POST $API_URL/api/chat/stream \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -H 'X-API-Key: YOUR_KEY' \\"
echo "    -d '{\"messages\": [{\"role\": \"user\", \"content\": \"Hi\"}], \"model\": \"phi3:mini\"}'"
echo ""

