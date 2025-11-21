#!/bin/bash
# API gyors tesztelési script

set -e

API_URL="http://localhost:8000"
TIMEOUT=30  # Timeout másodpercekben (30 sec - gyors modellhez)

echo "========================================="
echo "ZedinArkManager API Teszt"
echo "========================================="
echo ""

# Színek
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Health check
echo "1. Health check..."
if curl -s --max-time 10 "$API_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ Health check OK${NC}"
    curl -s "$API_URL/health" | python3 -m json.tool
else
    echo -e "${RED}❌ Health check FAILED${NC}"
    echo "Ellenőrizd, hogy a szerver fut-e: python main.py"
    exit 1
fi

echo ""

# 2. Root endpoint
echo "2. Root endpoint..."
if curl -s --max-time 10 "$API_URL/" > /dev/null; then
    echo -e "${GREEN}✅ Root endpoint OK${NC}"
else
    echo -e "${RED}❌ Root endpoint FAILED${NC}"
fi

echo ""

# 3. API kulcs generálása
echo "3. API kulcs generálása..."
RESPONSE=$(curl -s --max-time 10 -X POST "$API_URL/api/auth/generate" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Key", "description": "Test API Key"}')

if echo "$RESPONSE" | grep -q "api_key"; then
    echo -e "${GREEN}✅ API kulcs generálás OK${NC}"
    API_KEY=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['api_key'])")
    echo -e "${YELLOW}API Key: $API_KEY${NC}"
    echo ""
    echo "Mentsd el ezt a kulcsot:"
    echo "export API_KEY=\"$API_KEY\""
else
    echo -e "${RED}❌ API kulcs generálás FAILED${NC}"
    echo "Response: $RESPONSE"
fi

echo ""

# 4. Modellek listázása
echo "4. Modellek listázása..."
if curl -s --max-time 10 "$API_URL/api/models" > /dev/null; then
    echo -e "${GREEN}✅ Modellek listázás OK${NC}"
    curl -s "$API_URL/api/models" | python3 -m json.tool
else
    echo -e "${YELLOW}⚠️  Modellek listázás nem érhető el${NC}"
fi

echo ""

# 5. Chat teszt (ha API key van)
if [ ! -z "$API_KEY" ]; then
    echo "5. Chat teszt (API kulccsal)..."
    
    # Ollama ellenőrzése előtte
    echo "Ollama ellenőrzése..."
    if ! curl -s --max-time 5 http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${RED}❌ Ollama nem elérhető!${NC}"
        echo "Indítsd el: ollama serve &"
        echo -e "${YELLOW}⚠️  Chat teszt kihagyva${NC}"
    else
        echo -e "${GREEN}✅ Ollama elérhető${NC}"
        echo ""
        echo -e "${YELLOW}⏳ Várakozás a válaszra (max 30 másodperc)...${NC}"
        echo -e "${YELLOW}ℹ️  Gyors modellt használunk (phi3:mini) - várható válaszidő: 5-10 másodperc${NC}"
        echo -e "${YELLOW}ℹ️  FIGYELEM: Ez CPU intenzív lehet (Ollama modell futtatás)${NC}"
        
        # Gyors modell használata (phi3:mini) - rövidebb timeout (30 sec)
        # Progress jelzés hozzáadása
        CHAT_RESPONSE=$(timeout 30 curl --progress-bar --max-time 30 -X POST "$API_URL/api/chat" \
          -H "Content-Type: application/json" \
          -H "X-API-Key: $API_KEY" \
          -d '{
            "messages": [
              {"role": "user", "content": "Hi"}
            ],
            "model": "phi3:mini",
            "temperature": 0.3
          }' 2>&1)
        
        EXIT_CODE=$?
        
        echo ""
        
        if [ $EXIT_CODE -eq 0 ] && echo "$CHAT_RESPONSE" | grep -q "response"; then
            echo -e "${GREEN}✅ Chat teszt OK${NC}"
            echo ""
            echo "Válasz:"
            echo "$CHAT_RESPONSE" | python3 -m json.tool 2>/dev/null | grep -A 3 "response" || echo "$CHAT_RESPONSE" | head -5
        elif [ $EXIT_CODE -eq 124 ] || [ $EXIT_CODE -eq 28 ]; then
            echo -e "${RED}❌ Chat teszt timeout (> 30 sec)${NC}"
            echo -e "${YELLOW}ℹ️  Az Ollama túl lassan válaszol vagy nem válaszol${NC}"
            echo ""
            echo "Hibaelhárítás:"
            echo "  1. Ollama ellenőrzése: curl http://localhost:11434/api/tags"
            echo "  2. Ollama újraindítása: pkill ollama && ollama serve &"
            echo "  3. Próbáld közvetlenül: ollama run phi3:mini 'Hi'"
            echo "  4. Próbáld stream endpoint-ot: /api/chat/stream"
        else
            echo -e "${YELLOW}⚠️  Chat teszt nem sikerült (exit code: $EXIT_CODE)${NC}"
            echo "Response (első 200 karakter):"
            echo "$CHAT_RESPONSE" | head -c 200
            echo ""
            echo ""
            echo "Hibaelhárítás:"
            echo "  - Ollama ellenőrzése: curl http://localhost:11434/api/tags"
            echo "  - Szerver logok: tail -20 logs/app.log"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Chat teszt kihagyva (nincs API kulcs)${NC}"
fi

echo ""
echo "========================================="
echo -e "${GREEN}✅ TESZT BEFEJEZVE!${NC}"
echo "========================================="

