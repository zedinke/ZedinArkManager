#!/bin/bash
# Tűzfal beállítása ZedinArkManager-hoz
# UFW (Uncomplicated Firewall) használata

set -e

echo "========================================="
echo "Tűzfal beállítása"
echo "========================================="
echo ""

# Színek
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# UFW ellenőrzése
if ! command -v ufw &> /dev/null; then
    echo -e "${YELLOW}⚠️  UFW nincs telepítve, telepítés...${NC}"
    sudo apt update
    sudo apt install -y ufw
else
    echo -e "${GREEN}✅ UFW telepítve${NC}"
fi

echo ""

# Tűzfal státusz ellenőrzése
if sudo ufw status | grep -q "Status: active"; then
    echo -e "${GREEN}✅ Tűzfal aktív${NC}"
else
    echo -e "${YELLOW}⚠️  Tűzfal inaktív${NC}"
fi

echo ""

# Portok megnyitása
echo "Portok megnyitása..."

# SSH (22) - fontos, hogy ne zárjuk ki magunkat!
echo "SSH (22) port nyitása..."
sudo ufw allow 22/tcp comment 'SSH'

# API szerver (8000)
echo "API szerver (8000) port nyitása..."
sudo ufw allow 8000/tcp comment 'ZedinArkManager API'

# Ollama (11434) - csak helyi hálózatról
echo "Ollama (11434) port - csak helyi hálózat..."
sudo ufw allow from 127.0.0.1 to any port 11434 comment 'Ollama local'

# HTTPS (443) - ha SSL-t használsz
read -p "Megnyitod a HTTPS (443) portot is? (i/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ii]$ ]]; then
    echo "HTTPS (443) port nyitása..."
    sudo ufw allow 443/tcp comment 'HTTPS'
fi

echo ""

# Tűzfal aktiválása (ha még nem aktív)
if ! sudo ufw status | grep -q "Status: active"; then
    echo "Tűzfal aktiválása..."
    echo "y" | sudo ufw enable
    echo -e "${GREEN}✅ Tűzfal aktiválva${NC}"
else
    echo "Tűzfal szabályok alkalmazása..."
    sudo ufw reload
    echo -e "${GREEN}✅ Tűzfal szabályok alkalmazva${NC}"
fi

echo ""

# Tűzfal státusz
echo "========================================="
echo "Tűzfal státusz:"
echo "========================================="
sudo ufw status numbered

echo ""
echo "========================================="
echo -e "${GREEN}✅ TŰZFAL BEÁLLÍTVA!${NC}"
echo "========================================="
echo ""
echo "Nyitott portok:"
echo "  - 22 (SSH)"
echo "  - 8000 (API szerver)"
echo "  - 11434 (Ollama - csak localhost)"
echo ""
echo "A szerver most már elérhető:"
echo "  - http://135.181.165.27:8000"
echo "  - http://localhost:8000"
echo ""

