# 🔧 SSH-n keresztüli telepítés útmutató

## 📋 Előfeltételek

- SSH hozzáférés a szerverhez
- Sudo jogosultságok
- Internet kapcsolat

## 🚀 Gyors telepítés

### 1. SSH kapcsolat

```bash
ssh ai_developer@135.181.165.27
# Jelszó: Gele007ta...
```

### 2. Repository klónozása (ha nincs)

```bash
cd ~
git clone https://github.com/zedinke/ZedinArkManager.git
cd ZedinArkManager
```

### 3. Telepítő script futtatása

```bash
chmod +x installers/setup_complete.sh
./installers/setup_complete.sh
```

Ez a script:
- ✅ Telepíti a Python függőségeket
- ✅ Létrehozza a virtuális környezetet
- ✅ Telepíti az Ollama-t (ha nincs)
- ✅ Beállítja a modelleket
- ✅ Létrehozza a szükséges könyvtárakat
- ✅ Beállítja a környezeti változókat
- ✅ Teszteli a rendszert

### 4. Szerver indítása

**Először aktiváld a virtuális környezetet:**
```bash
cd ~/ZedinArkManager
source ai_venv/bin/activate
```

**Majd indítsd el a szervert:**
```bash
python main.py
```

**Vagy háttérben (screen/tmux használatával):**
```bash
# Screen telepítése (ha nincs)
sudo apt install -y screen

# Screen indítása
screen -S zedinark

# Szerver indítása
cd ~/ZedinArkManager
source ai_venv/bin/activate
python main.py

# Screen elhagyása (Ctrl+A, majd D)
# Visszatérés: screen -r zedinark
```

### 5. Tesztelés

**Másik terminálban (vagy SSH-n keresztül):**
```bash
# Health check
curl http://localhost:8000/health

# API kulcs generálása
curl -X POST http://localhost:8000/api/auth/generate \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Key", "description": "Test"}'
```

## 🔍 Hibaelhárítás

### Python nem található

```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv
```

### Ollama nem fut

```bash
# Ollama telepítése
curl -fsSL https://ollama.com/install.sh | sh

# Ollama indítása
ollama serve &

# Modell telepítése
ollama pull llama3.1:8b
```

### Port foglalt

```bash
# Mi fut a 8000-es porton?
sudo lsof -i :8000

# Ha szükséges, állítsd le:
sudo kill -9 <PID>
```

### Virtuális környezet probléma

```bash
cd ~/ZedinArkManager
rm -rf ai_venv
python3 -m venv ai_venv
source ai_venv/bin/activate
pip install -r installers/requirements.txt
```

### Import hibák

```bash
# Modulok ellenőrzése
cd ~/ZedinArkManager
source ai_venv/bin/activate
python3 -c "from core.llm_service import LLMService; print('OK')"
```

## 📊 Rendszer ellenőrzése

### Aktív folyamatok

```bash
# Python szerver ellenőrzése
ps aux | grep python

# Ollama ellenőrzése
ps aux | grep ollama
```

### Logok ellenőrzése

```bash
cd ~/ZedinArkManager
tail -f logs/app.log
```

### Port ellenőrzése

```bash
# 8000-es port (API)
sudo netstat -tlnp | grep 8000

# 11434-es port (Ollama)
sudo netstat -tlnp | grep 11434
```

## 🔄 Szerver újraindítása

### Manuális újraindítás

```bash
# Szerver leállítása
pkill -f "python.*main.py"

# Újraindítás
cd ~/ZedinArkManager
source ai_venv/bin/activate
python main.py
```

### Automatikus újraindítás (systemd service)

Létrehozhatsz egy systemd service-t is:

```bash
sudo nano /etc/systemd/system/zedinark.service
```

Tartalom:
```ini
[Unit]
Description=ZedinArkManager API Server
After=network.target

[Service]
Type=simple
User=ai_developer
WorkingDirectory=/home/ai_developer/ZedinArkManager
Environment="PATH=/home/ai_developer/ZedinArkManager/ai_venv/bin"
ExecStart=/home/ai_developer/ZedinArkManager/ai_venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Aktiválás:
```bash
sudo systemctl daemon-reload
sudo systemctl enable zedinark
sudo systemctl start zedinark
sudo systemctl status zedinark
```

## ✅ Végleges ellenőrzés

```bash
# 1. Health check
curl http://localhost:8000/health

# 2. API dokumentáció
curl http://localhost:8000/docs

# 3. Modellek listája
curl http://localhost:8000/api/models

# 4. Chat teszt
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

---

**Most már működnie kell! 🚀**

