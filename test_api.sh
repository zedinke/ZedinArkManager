#!/bin/bash
# API gyors tesztelési script

set -e

API_URL="http://localhost:8000"

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
if curl -s "$API_URL/health" > /dev/null; then
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
if curl -s "$API_URL/" > /dev/null; then
    echo -e "${GREEN}✅ Root endpoint OK${NC}"
else
    echo -e "${RED}❌ Root endpoint FAILED${NC}"
fi

echo ""

# 3. API kulcs generálása
echo "3. API kulcs generálása..."
RESPONSE=$(curl -s -X POST "$API_URL/api/auth/generate" \
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
if curl -s "$API_URL/api/models" > /dev/null; then
    echo -e "${GREEN}✅ Modellek listázás OK${NC}"
    curl -s "$API_URL/api/models" | python3 -m json.tool
else
    echo -e "${YELLOW}⚠️  Modellek listázás nem érhető el${NC}"
fi

echo ""

# 5. Chat teszt (ha API key van)
if [ ! -z "$API_KEY" ]; then
    echo "5. Chat teszt (API kulccsal)..."
    CHAT_RESPONSE=$(curl -s -X POST "$API_URL/api/chat" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d '{
        "messages": [
          {"role": "user", "content": "Hello! Say hello back in Hungarian."}
        ]
      }')
    
    if echo "$CHAT_RESPONSE" | grep -q "response"; then
        echo -e "${GREEN}✅ Chat teszt OK${NC}"
        echo "$CHAT_RESPONSE" | python3 -m json.tool | head -20
    else
        echo -e "${YELLOW}⚠️  Chat teszt nem sikerült${NC}"
    fi
fi

echo ""
echo "========================================="
echo -e "${GREEN}✅ TESZT BEFEJEZVE!${NC}"
echo "========================================="

