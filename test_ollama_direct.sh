#!/bin/bash
# Ollama közvetlen tesztelése

set -e

echo "========================================="
echo "Ollama Közvetlen Teszt"
echo "========================================="
echo ""

# Színek
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Ollama ellenőrzése
echo "1. Ollama process ellenőrzése..."
if pgrep -x "ollama" > /dev/null; then
    echo -e "${GREEN}✅ Ollama process fut${NC}"
    ps aux | grep ollama | grep -v grep
else
    echo -e "${RED}❌ Ollama process nem fut${NC}"
    echo "Indítás..."
    ollama serve > /dev/null 2>&1 &
    sleep 3
    if pgrep -x "ollama" > /dev/null; then
        echo -e "${GREEN}✅ Ollama indítva${NC}"
    else
        echo -e "${RED}❌ Ollama indítás sikertelen${NC}"
        exit 1
    fi
fi

echo ""

# 2. Ollama API ellenőrzése
echo "2. Ollama API ellenőrzése..."
if curl -s http://localhost:11434/api/tags > /dev/null; then
    echo -e "${GREEN}✅ Ollama API elérhető${NC}"
else
    echo -e "${RED}❌ Ollama API nem elérhető${NC}"
    exit 1
fi

echo ""

# 3. Modellek listázása
echo "3. Telepített modellek..."
MODELS=$(curl -s http://localhost:11434/api/tags | python3 -c "import sys, json; models = json.load(sys.stdin).get('models', []); print('\\n'.join([m['name'] for m in models]))" 2>/dev/null || echo "")

if [ -z "$MODELS" ]; then
    echo -e "${YELLOW}⚠️  Nincs telepített modell${NC}"
    echo "Telepítés: ollama pull phi3:mini"
else
    echo -e "${GREEN}✅ Telepített modellek:${NC}"
    echo "$MODELS"
fi

echo ""

# 4. phi3:mini ellenőrzése
echo "4. phi3:mini modell ellenőrzése..."
if echo "$MODELS" | grep -q "phi3:mini"; then
    echo -e "${GREEN}✅ phi3:mini telepítve${NC}"
else
    echo -e "${YELLOW}⚠️  phi3:mini nincs telepítve${NC}"
    echo "Telepítés: ollama pull phi3:mini"
    read -p "Telepítsem most? (i/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ii]$ ]]; then
        ollama pull phi3:mini
        echo -e "${GREEN}✅ phi3:mini telepítve${NC}"
    fi
fi

echo ""

# 5. Közvetlen Ollama chat teszt
echo "5. Közvetlen Ollama chat teszt..."
echo -e "${YELLOW}⏳ Várakozás a válaszra (max 30 másodperc)...${NC}"

RESPONSE=$(timeout 30 curl -s -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "phi3:mini",
    "prompt": "Hello! Say hello in Hungarian in one word.",
    "stream": false
  }' 2>&1)

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ] && echo "$RESPONSE" | grep -q "response"; then
    echo -e "${GREEN}✅ Ollama chat teszt OK${NC}"
    echo ""
    echo "Válasz:"
    echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('response', ''))" 2>/dev/null || echo "$RESPONSE" | head -5
elif [ $EXIT_CODE -eq 124 ] || [ $EXIT_CODE -eq 28 ]; then
    echo -e "${RED}❌ Ollama chat teszt timeout (> 30 sec)${NC}"
    echo ""
    echo "Probléma: Az Ollama nem válaszol időben"
    echo ""
    echo "Ellenőrzés:"
    echo "  1. Ollama process: ps aux | grep ollama"
    echo "  2. Ollama logok: journalctl -u ollama 2>/dev/null || dmesg | grep ollama"
    echo "  3. Port ellenőrzése: netstat -tlnp | grep 11434"
else
    echo -e "${RED}❌ Ollama chat teszt sikertelen (exit code: $EXIT_CODE)${NC}"
    echo ""
    echo "Hibaüzenet:"
    echo "$RESPONSE" | head -10
fi

echo ""
echo "========================================="

