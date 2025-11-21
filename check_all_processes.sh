#!/bin/bash
# Összes folyamat CPU használatának ellenőrzése

set -e

echo "========================================="
echo "Összes Folyamat CPU Használat"
echo "========================================="
echo ""

# Színek
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Összes CPU használat összegzése
echo "1. Összes CPU használat összegzése:"
TOTAL_CPU=$(ps aux | awk 'NR>1 {sum += $3} END {print sum}')
echo -e "${YELLOW}Összes CPU használat: ${TOTAL_CPU}%${NC}"
echo ""

# 2. Top 20 CPU fogyasztó
echo "2. Top 20 CPU fogyasztó folyamat:"
echo ""
ps aux --sort=-%cpu | head -21 | awk 'NR==1 || $3 > 0.1 {printf "%-8s %-8s %6s %6s %s\n", $2, $1, $3"%", $4"%", $11, $12, $13, $14, $15}'
echo ""

# 3. CPU használat kategóriákban
echo "3. CPU használat kategóriákban:"
echo ""
HIGH_CPU=$(ps aux | awk 'NR>1 && $3 > 10.0 {sum += $3; count++} END {print sum, count}')
MEDIUM_CPU=$(ps aux | awk 'NR>1 && $3 > 1.0 && $3 <= 10.0 {sum += $3; count++} END {print sum, count}')
LOW_CPU=$(ps aux | awk 'NR>1 && $3 > 0.1 && $3 <= 1.0 {sum += $3; count++} END {print sum, count}')

echo "Magas CPU (>10%): $(echo $HIGH_CPU | awk '{print $1"% ("$2" folyamat)"}')"
echo "Közepes CPU (1-10%): $(echo $MEDIUM_CPU | awk '{print $1"% ("$2" folyamat)"}')"
echo "Alacsony CPU (0.1-1%): $(echo $LOW_CPU | awk '{print $1"% ("$2" folyamat)"}')"
echo ""

# 4. btop process ellenőrzése
echo "4. btop process ellenőrzése:"
BTOP_PROCS=$(ps aux | grep btop | grep -v grep)
if [ ! -z "$BTOP_PROCS" ]; then
    BTOP_CPU=$(echo "$BTOP_PROCS" | awk '{sum += $3} END {print sum}')
    BTOP_COUNT=$(echo "$BTOP_PROCS" | wc -l)
    echo -e "${YELLOW}btop processek: $BTOP_COUNT db, összesen ${BTOP_CPU}% CPU${NC}"
    echo "$BTOP_PROCS" | awk '{printf "  PID: %-8s CPU: %6s %s\n", $2, $3"%", $11}'
    echo ""
    echo "Ha a btop magas CPU-t használ, állítsd le:"
    echo "  pkill btop"
else
    echo -e "${GREEN}✅ Nincs btop process${NC}"
fi
echo ""

# 5. Ollama processek
echo "5. Ollama processek:"
OLLAMA_PROCS=$(ps aux | grep ollama | grep -v grep)
if [ ! -z "$OLLAMA_PROCS" ]; then
    OLLAMA_CPU=$(echo "$OLLAMA_PROCS" | awk '{sum += $3} END {print sum}')
    OLLAMA_COUNT=$(echo "$OLLAMA_PROCS" | wc -l)
    echo -e "${YELLOW}Ollama processek: $OLLAMA_COUNT db, összesen ${OLLAMA_CPU}% CPU${NC}"
    echo "$OLLAMA_PROCS" | awk '{printf "  PID: %-8s CPU: %6s %s\n", $2, $3"%", $11, $12}'
else
    echo -e "${GREEN}✅ Nincs Ollama process${NC}"
fi
echo ""

# 6. Python processek
echo "6. Python processek:"
PYTHON_PROCS=$(ps aux | grep python | grep -v grep)
if [ ! -z "$PYTHON_PROCS" ]; then
    PYTHON_CPU=$(echo "$PYTHON_PROCS" | awk '{sum += $3} END {print sum}')
    PYTHON_COUNT=$(echo "$PYTHON_PROCS" | wc -l)
    echo -e "${YELLOW}Python processek: $PYTHON_COUNT db, összesen ${PYTHON_CPU}% CPU${NC}"
    echo "$PYTHON_PROCS" | awk '{printf "  PID: %-8s CPU: %6s %s\n", $2, $3"%", $11, $12, $13}'
else
    echo -e "${GREEN}✅ Nincs Python process${NC}"
fi
echo ""

# 7. Összesített CPU használat
echo "7. Összesített CPU használat:"
echo ""
echo "btop: ${BTOP_CPU}%"
echo "Ollama: ${OLLAMA_CPU}%"
echo "Python: ${PYTHON_CPU}%"
echo "Összes: ${TOTAL_CPU}%"
echo ""

# 8. Ajánlások
if (( $(echo "$BTOP_CPU > 5" | bc -l) )); then
    echo -e "${YELLOW}⚠️  btop magas CPU-t használ (${BTOP_CPU}%)${NC}"
    echo "Ajánlás: Állítsd le a btop-ot, ha nem használod:"
    echo "  pkill btop"
    echo ""
fi

if (( $(echo "$TOTAL_CPU > 50" | bc -l) )); then
    echo -e "${RED}⚠️  Magas összes CPU használat (${TOTAL_CPU}%)${NC}"
    echo "Ellenőrizd az összes folyamatot:"
    echo "  ps aux --sort=-%cpu | less"
else
    echo -e "${GREEN}✅ CPU használat rendben (${TOTAL_CPU}%)${NC}"
fi

echo ""
echo "========================================="

