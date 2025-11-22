# Gyors indítási útmutató

## Előfeltételek ellenőrzése

### 1. Virtual environment aktiválva?
```bash
# Ellenőrzés: a prompt elején kell lennie: (ai_venv)
echo $VIRTUAL_ENV

# Ha nincs, aktiváld:
source ai_venv/bin/activate
```

### 2. Ollama fut?
```bash
# Ellenőrzés
curl http://localhost:11434/api/tags

# Ha nem fut, indítsd el:
ollama serve
# Vagy háttérben:
nohup ollama serve > logs/ollama.log 2>&1 &
```

### 3. Függőségek telepítve?
```bash
pip list | grep aiohttp
# Ha nincs, telepítsd:
pip install -r installers/requirements.txt
```

## Szerver indítása

### Egyszerű indítás
```bash
cd ~/ZedinArkManager
source ai_venv/bin/activate
python main.py
```

### Háttérben indítás (ajánlott production-hez)
```bash
cd ~/ZedinArkManager
source ai_venv/bin/activate
nohup python main.py > logs/server.log 2>&1 &
```

### start.sh script használata (ha van)
```bash
cd ~/ZedinArkManager
./start.sh
```

## Ellenőrzés

### Szerver fut?
```bash
curl http://localhost:8000/health
```

### Distributed network működik?
```bash
curl http://localhost:8000/api/distributed/stats
```

### Logok ellenőrzése
```bash
tail -f logs/app.log
```

## Leállítás

```bash
# Process keresése
ps aux | grep "python main.py"

# Leállítás
pkill -f "python main.py"
```

