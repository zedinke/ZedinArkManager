#!/bin/bash
# Egyszerű chat teszt gyors modelllel

set -e

API_URL="http://localhost:8000"
TIMEOUT=30  # 30 másodperc (gyors modellhez)

# Színek
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================="
echo "Gyors Chat Teszt"
echo "========================================="
echo ""

# API kulcs beállítása
if [ -z "$API_KEY" ]; then
    echo "API kulcs generálása..."
    RESPONSE=$(curl -s -X POST "$API_URL/api/auth/generate" \
      -H "Content-Type: application/json" \
      -d '{"name": "Test Key", "description": "Test"}')
    
    if echo "$RESPONSE" | grep -q "api_key"; then
        API_KEY=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['api_key'])")
        echo -e "${GREEN}✅ API kulcs generálva${NC}"
        echo "export API_KEY=\"$API_KEY\""
        export API_KEY="$API_KEY"
    else
        echo -e "${RED}❌ API kulcs generálás sikertelen${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ API kulcs beállítva${NC}"
fi

echo ""
echo "========================================="
echo "Chat teszt (phi3:mini - gyors modell)"
echo "========================================="
echo ""
echo -e "${YELLOW}⏳ Várakozás a válaszra (max 30 másodperc)...${NC}"
echo ""

# Gyors chat teszt
START_TIME=$(date +%s)

CHAT_RESPONSE=$(timeout $TIMEOUT curl -s -X POST "$API_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello! Say hello in Hungarian in one sentence."}
    ],
    "model": "phi3:mini",
    "temperature": 0.5
  }' 2>&1)

EXIT_CODE=$?
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo "Válaszidő: ${ELAPSED} másodperc"
echo ""

if [ $EXIT_CODE -eq 0 ] && echo "$CHAT_RESPONSE" | grep -q "response"; then
    echo -e "${GREEN}✅ Chat teszt SIKERES!${NC}"
    echo ""
    echo "Válasz:"
    echo "$CHAT_RESPONSE" | python3 -m json.tool 2>/dev/null | grep -A 5 "response" || echo "$CHAT_RESPONSE"
elif [ $EXIT_CODE -eq 124 ] || [ $EXIT_CODE -eq 28 ]; then
    echo -e "${RED}❌ Chat teszt TIMEOUT (> $TIMEOUT sec)${NC}"
    echo ""
    echo "Hibaelhárítás:"
    echo "  1. Ollama ellenőrzése:"
    echo "     curl http://localhost:11434/api/tags"
    echo ""
    echo "  2. Próbáld stream endpoint-ot:"
    echo "     curl -X POST $API_URL/api/chat/stream \\"
    echo "       -H 'Content-Type: application/json' \\"
    echo "       -H 'X-API-Key: $API_KEY' \\"
    echo "       -d '{\"messages\": [{\"role\": \"user\", \"content\": \"Hello!\"}], \"model\": \"phi3:mini\"}'"
else
    echo -e "${RED}❌ Chat teszt SIKERTELEN (exit code: $EXIT_CODE)${NC}"
    echo ""
    echo "Hibaüzenet:"
    echo "$CHAT_RESPONSE" | head -20
fi

echo ""
echo "========================================="

