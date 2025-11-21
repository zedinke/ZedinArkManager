#!/bin/bash
# CPU használat ellenőrzése és folyamatok listázása

set -e

echo "========================================="
echo "CPU Használat Ellenőrzés"
echo "========================================="
echo ""

# Színek
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Általános CPU használat
echo "1. Általános CPU használat:"
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
echo -e "${YELLOW}CPU használat: ${CPU_USAGE}%${NC}"
echo ""

# 2. Top CPU fogyasztó folyamatok
echo "2. Top 10 CPU fogyasztó folyamat:"
echo ""
ps aux --sort=-%cpu | head -11 | awk '{printf "%-8s %-8s %6s %6s %s\n", $2, $1, $3"%", $4"%", $11}'
echo ""

# 3. Python folyamatok
echo "3. Python folyamatok:"
echo ""
PYTHON_PROCS=$(ps aux | grep python | grep -v grep)
if [ ! -z "$PYTHON_PROCS" ]; then
    echo "$PYTHON_PROCS" | awk '{printf "PID: %-8s CPU: %6s MEM: %6s %s\n", $2, $3"%", $4"%", $11, $12, $13}'
else
    echo -e "${YELLOW}⚠️  Nincs Python folyamat${NC}"
fi
echo ""

# 4. Ollama folyamatok
echo "4. Ollama folyamatok:"
echo ""
OLLAMA_PROCS=$(ps aux | grep ollama | grep -v grep)
if [ ! -z "$OLLAMA_PROCS" ]; then
    echo "$OLLAMA_PROCS" | awk '{printf "PID: %-8s CPU: %6s MEM: %6s %s\n", $2, $3"%", $4"%", $11, $12}'
else
    echo -e "${YELLOW}⚠️  Nincs Ollama folyamat${NC}"
fi
echo ""

# 5. Összes magas CPU fogyasztó folyamat (CPU > 10%)
echo "5. Magas CPU fogyasztó folyamatok (CPU > 10%):"
echo ""
HIGH_CPU=$(ps aux --sort=-%cpu | awk 'NR>1 && $3 > 10.0 {printf "PID: %-8s CPU: %6s MEM: %6s %s\n", $2, $3"%", $4"%", $11, $12, $13, $14}')
if [ ! -z "$HIGH_CPU" ]; then
    echo "$HIGH_CPU"
else
    echo -e "${GREEN}✅ Nincs magas CPU fogyasztó folyamat (CPU > 10%)${NC}"
fi
echo ""

# 6. Top process PID
TOP_PID=$(ps aux --sort=-%cpu | awk 'NR==2 {print $2}')
TOP_CPU=$(ps aux --sort=-%cpu | awk 'NR==2 {print $3}')
TOP_CMD=$(ps aux --sort=-%cpu | awk 'NR==2 {print $11, $12, $13, $14, $15}')

if [ ! -z "$TOP_PID" ] && (( $(echo "$TOP_CPU > 10" | bc -l) )); then
    echo -e "${RED}⚠️  Legmagasabb CPU fogyasztó:${NC}"
    echo "  PID: $TOP_PID"
    echo "  CPU: ${TOP_CPU}%"
    echo "  Command: $TOP_CMD"
    echo ""
    echo "Leállítás:"
    echo "  kill $TOP_PID"
    echo "  # vagy ha nem működik:"
    echo "  kill -9 $TOP_PID"
fi

echo ""
echo "========================================="

