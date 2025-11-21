# 🚀 Szerver indítás és tesztelés

## ✅ Telepítés kész!

A telepítő script sikeresen lefutott. Most már csak el kell indítani a szervert!

## 🎯 Gyors indítás

### 1. Szerver indítása

**Option A: Indító script használata (ajánlott)**
```bash
cd ~/ZedinArkManager
chmod +x start.sh
./start.sh
```

**Option B: Manuális indítás**
```bash
cd ~/ZedinArkManager
source ai_venv/bin/activate
python main.py
```

**Option C: Háttérben (screen)**
```bash
# Screen telepítése (ha nincs)
sudo apt install -y screen

# Screen indítása
screen -S zedinark

# Szerver indítása
cd ~/ZedinArkManager
source ai_venv/bin/activate
python main.py

# Screen elhagyása: Ctrl+A, majd D
# Visszatérés: screen -r zedinark
```

### 2. API tesztelése

**Másik terminálban vagy SSH sessionben:**

**Option A: Automatikus teszt script**
```bash
cd ~/ZedinArkManager
chmod +x test_api.sh
./test_api.sh
```

**Option B: Manuális tesztelés**

**Health check:**
```bash
curl http://localhost:8000/health
```

**API dokumentáció:**
```bash
# Böngészőben:
# http://135.181.165.27:8000/docs
```

**API kulcs generálása:**
```bash
curl -X POST http://localhost:8000/api/auth/generate \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Key", "description": "Test"}'
```

**Chat teszt:**
```bash
# Először generálj API kulcsot, majd:
export API_KEY="your-api-key-here"

curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello! Say hello in Hungarian."}
    ]
  }'
```

## 🔍 Ellenőrzés

### Szerver fut-e?

```bash
# Process ellenőrzése
ps aux | grep "python.*main.py"

# Port ellenőrzése
sudo netstat -tlnp | grep 8000

# Logok ellenőrzése
tail -f ~/ZedinArkManager/logs/app.log
```

### Ollama fut-e?

```bash
# Process ellenőrzése
ps aux | grep ollama

# Port ellenőrzése
sudo netstat -tlnp | grep 11434

# API ellenőrzése
curl http://localhost:11434/api/tags
```

## 🔧 Hibaelhárítás

### Port foglalt

```bash
# Mi fut a 8000-es porton?
sudo lsof -i :8000

# Leállítás
sudo kill -9 <PID>
# vagy
pkill -f "python.*main.py"
```

### Import hibák

```bash
# Virtuális környezet aktiválása
cd ~/ZedinArkManager
source ai_venv/bin/activate

# Modulok ellenőrzése
python3 -c "from core.llm_service import LLMService; print('OK')"
python3 -c "from core.auth import api_key_manager; print('OK')"
python3 -c "from core.gpu_manager import gpu_manager; print('OK')"
```

### Ollama nem elérhető

```bash
# Ollama indítása
ollama serve &

# Várj 3 másodpercet
sleep 3

# Tesztelés
curl http://localhost:11434/api/tags
```

## 📊 Rendszer státusz

### Teljes ellenőrzés

```bash
cd ~/ZedinArkManager

# 1. Python és függőségek
source ai_venv/bin/activate
python --version
pip list | grep fastapi

# 2. Ollama
ollama --version
curl http://localhost:11434/api/tags

# 3. API szerver
curl http://localhost:8000/health

# 4. Logok
tail -20 logs/app.log
```

## 🎉 Sikeres indítás

Ha minden rendben, akkor látnod kell:

```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

És a health check válasza:
```json
{
  "status": "healthy",
  "ollama_connected": true,
  "gpu_count": 0,
  ...
}
```

## 📝 Következő lépések

1. ✅ **Szerver indítva** - `python main.py` vagy `./start.sh`
2. ✅ **Health check** - `curl http://localhost:8000/health`
3. ✅ **API kulcs generálás** - `/api/auth/generate` endpoint
4. ✅ **Chat teszt** - `/api/chat` endpoint

---

**Most már működnie kell! 🚀**

