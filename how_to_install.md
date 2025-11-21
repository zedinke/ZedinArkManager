# 🐧 Linux telepítési útmutató - Lépésről lépésre

## 📋 Előfeltételek ellenőrzése

### 1. lépés: Rendszerfrissítés

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. lépés: Python telepítése/ellenőrzése

```bash
# Python verzió ellenőrzése
python3 --version

# Ha nincs telepítve Python 3.8 vagy újabb:
sudo apt install python3 python3-pip python3-venv -y
```

### 3. lépés: Git telepítése/ellenőrzése

```bash
# Git ellenőrzése
git --version

# Ha nincs telepítve:
sudo apt install git -y
```

---

## 🚀 Telepítés lépései

### 1. lépés: Repository klónozása

```bash
# Klónozd le a repository-t
git clone https://github.com/zedinke/ZedinArkManager.git

# Lépj be a mappába
cd ZedinArkManager
```

### 2. lépés: Automatikus telepítő futtatása

```bash
# Telepítő script futtathatóvá tétele
chmod +x installers/install.sh

# Telepítő futtatása
./installers/install.sh
```

**Mit csinál a telepítő?**
- ✅ Létrehozza a szükséges mappákat (`logs`, `data`, `projects`)
- ✅ Telepíti a Python függőségeket
- ✅ Ellenőrzi az Ollama telepítését
- ✅ Létrehozza a `.env` konfigurációs fájlt

### 3. lépés: Ollama telepítése

**Ha még nincs telepítve az Ollama:**

```bash
# Ollama telepítése
curl https://ollama.com/install.sh | sh
```

**Ellenőrzés:**

```bash
# Ollama verzió ellenőrzése
ollama --version
```

### 4. lépés: Ollama indítása

**Opció 1: Hátérben indítás (ajánlott)**

```bash
# Ollama indítása hátérben
nohup ollama serve > logs/ollama.log 2>&1 &

# Ellenőrzés, hogy fut-e
curl http://localhost:11434/api/tags
```

**Opció 2: Előtérben indítás**

```bash
# Ollama indítása előtérben (Ctrl+C-vel leállítható)
ollama serve
```

### 5. lépés: Modell telepítése

```bash
# A magyarul jól beszélő modell letöltése (~4-5GB, ez időbe telhet)
ollama pull llama3.1:8b
```

**Alternatív modellek (ha szükséges):**

```bash
ollama pull codellama       # Kód-generálásra optimalizált
ollama pull mistral         # Kisebb, gyorsabb modell
ollama pull deepseek-coder  # Code generation modell
```

**Ellenőrzés, hogy telepítve van-e:**

```bash
# Telepített modellek listázása
ollama list

# Vagy
curl http://localhost:11434/api/tags
```

### 6. lépés: Környezeti változók beállítása

**Szerkeszd a `.env` fájlt (ha szükséges):**

```bash
nano .env
```

**Alapértelmezett értékek (általában ezek jók):**

```env
# Ollama beállítások
OLLAMA_URL=http://localhost:11434
DEFAULT_MODEL=llama3.1:8b

# Projekt beállítások
PROJECT_BASE_PATH=.

# Optimalizáció (opcionális - a te szerveredhez):
OLLAMA_NUM_GPU_LAYERS=      # Ha van GPU, pl: 35
OLLAMA_NUM_THREADS=32       # 32 maghoz = 32 szál
```

**Vagy környezeti változóként (ha nem használod a .env fájlt):**

```bash
export OLLAMA_URL="http://localhost:11434"
export DEFAULT_MODEL="llama3.1:8b"
export PROJECT_BASE_PATH="."
export OLLAMA_NUM_THREADS="32"
```

### 7. lépés: Rendszer indítása

**Indító script használata (ajánlott):**

```bash
# Indító script futtathatóvá tétele
chmod +x start.sh

# Rendszer indítása
./start.sh
```

**Mit csinál az indító script?**
- ✅ Ellenőrzi, hogy az Ollama fut-e
- ✅ Ellenőrzi a modellek telepítését (ha nincs, kérdezi, hogy telepítse-e)
- ✅ Ellenőrzi a Python függőségeket
- ✅ Betölti a környezeti változókat (`.env` fájlból)
- ✅ Indítja a FastAPI szervert

### 8. lépés: Ellenőrzés, hogy minden működik

**1. Health check (terminálból):**

```bash
curl http://localhost:8000/health
```

**Várható válasz:**
```json
{
  "status": "healthy",
  "ollama_connected": true,
  "base_path": ".",
  "default_model": "llama3.1:8b"
}
```

**2. API dokumentáció megnyitása (böngészőben):**

```
http://localhost:8000/docs
```

**3. Telepített modellek ellenőrzése:**

```bash
curl http://localhost:8000/api/models
```

---

## ✅ Telepítés kész!

Ha minden lépés sikeres volt, a rendszer most fut és elérhető:

- **API**: http://localhost:8000
- **API Dokumentáció**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

---

## 🔧 Manuális telepítés (ha az automatikus nem működik)

### 1. Python függőségek telepítése

```bash
# pip frissítése
pip3 install --upgrade pip

# Függőségek telepítése
pip3 install -r installers/requirements.txt
```

### 2. Mappák létrehozása

```bash
mkdir -p logs data/cache data/memory projects
```

### 3. FastAPI szerver indítása (manuálisan)

```bash
# Közvetlenül Python-nal
python3 main.py

# Vagy uvicorn-nel
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## 🏃 Rendszer indítása (későbbi használat)

### Gyors indítás

```bash
./start.sh
```

### Hátérben indítás

```bash
# Ollama hátérben (ha még nem fut)
nohup ollama serve > logs/ollama.log 2>&1 &

# FastAPI hátérben
nohup python3 main.py > logs/app.log 2>&1 &
```

### Systemd szolgáltatásként (éles környezet)

**1. Szolgáltatás fájl létrehozása:**

```bash
sudo nano /etc/systemd/system/zedinarkmanager.service
```

**2. Tartalom:**

```ini
[Unit]
Description=ZedinArkManager API Server
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/ZedinArkManager
EnvironmentFile=/home/your-username/ZedinArkManager/.env
ExecStart=/usr/bin/python3 /home/your-username/ZedinArkManager/main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**3. Szolgáltatás aktiválása:**

```bash
# Systemd újratöltése
sudo systemctl daemon-reload

# Szolgáltatás engedélyezése (indulás rendszerindításkor)
sudo systemctl enable zedinarkmanager

# Szolgáltatás indítása
sudo systemctl start zedinarkmanager

# Állapot ellenőrzése
sudo systemctl status zedinarkmanager
```

---

## 🔍 Hibaelhárítás

### Ollama nem fut

```bash
# Ellenőrzés
curl http://localhost:11434/api/tags

# Ha nem fut, indítsd el:
ollama serve

# Vagy hátérben:
nohup ollama serve > logs/ollama.log 2>&1 &
```

### Ollama kapcsolati hiba

```bash
# Ellenőrizd, hogy az Ollama fut-e
ps aux | grep ollama

# Ha nem fut, indítsd el
ollama serve &

# Várj 2-3 másodpercet, majd próbáld újra
sleep 3
curl http://localhost:11434/api/tags
```

### Modell nincs telepítve

```bash
# Modell telepítése
ollama pull llama3.1:8b

# Ellenőrzés
ollama list
```

### Python függőségek hiányoznak

```bash
# Függőségek telepítése
pip3 install -r installers/requirements.txt

# Ha hiba van, próbáld:
pip3 install --upgrade pip
pip3 install -r installers/requirements.txt --force-reinstall
```

### Port már használatban

```bash
# Melyik process használja a 8000-es portot?
sudo lsof -i :8000

# Vagy
sudo netstat -tulpn | grep :8000

# Process leállítása (ha szükséges)
sudo kill -9 <PID>
```

### Jogosultság hibák

```bash
# Scriptek futtathatóvá tétele
chmod +x start.sh
chmod +x installers/install.sh

# Mappák jogosultságai
chmod -R 755 logs data projects
```

### Log fájlok ellenőrzése

```bash
# Alkalmazás logok
tail -f logs/app.log

# Ollama logok
tail -f logs/ollama.log

# Hibák keresése
grep -i error logs/app.log
```

---

## 📝 További információk

- **API dokumentáció**: http://localhost:8000/docs
- **Projekt struktúra**: `docs/PROJECT_STRUCTURE.md`
- **Használati útmutató**: `docs/USAGE_GUIDE.md`
- **GitHub repository**: https://github.com/zedinke/ZedinArkManager

---

## 🎉 Sikeres telepítés!

Ha minden lépés sikeres volt, a rendszer most fut és használatra kész!

**Első lépések:**
1. Nyisd meg: http://localhost:8000/docs
2. Próbáld ki a `/api/chat` endpoint-ot
3. Generálj kódot a `/api/generate` endpoint-tal

**Jó munkát! 🚀**
