# 🐧 Linux telepítési útmutató

## 📋 Előfeltételek

### 1. Rendszer követelmények

- **OS**: Debian 12 (vagy hasonló Linux disztribúció)
- **Python**: 3.8 vagy újabb
- **RAM**: Minimum 8GB (ajánlott 16GB+)
- **Tárhely**: Minimum 10GB szabad hely

### 2. Rendszerfrissítés

```bash
sudo apt update
sudo apt upgrade -y
```

### 3. Python telepítése (ha nincs)

```bash
sudo apt install python3 python3-pip python3-venv -y
```

### 4. Git telepítése (ha nincs)

```bash
sudo apt install git -y
```

---

## 🚀 Telepítés lépései

### 1. lépés: Repository klónozása

```bash
git clone https://github.com/zedinke/ZedinArkManager.git
cd ZedinArkManager
```

### 2. lépés: Automatikus telepítés

```bash
chmod +x installers/install.sh
./installers/install.sh
```

A script:
- Létrehozza a szükséges könyvtárakat
- Telepíti a Python függőségeket
- Ellenőrzi az Ollama telepítését
- Létrehozza a `.env` fájlt

### 3. lépés: Ollama telepítése

Ha még nincs telepítve az Ollama:

```bash
curl https://ollama.com/install.sh | sh
```

Vagy manuálisan:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 4. lépés: Modell telepítése

```bash
# Ollama indítása (ha még nem fut)
ollama serve &

# Modell letöltése (ez időbe telhet, ~4-5GB)
ollama pull llama3.1:8b
```

Egyéb modellek:
```bash
ollama pull codellama       # Code-specific modell
ollama pull mistral         # Kisebb, gyorsabb modell
ollama pull deepseek-coder  # Code generation
```

### 5. lépés: Környezeti változók beállítása

Szerkeszd a `.env` fájlt (ha szükséges):

```bash
nano .env
```

Példa beállítások:
```env
# Ollama beállítások
OLLAMA_URL=http://localhost:11434
DEFAULT_MODEL=llama3.1:8b

# Projekt beállítások
PROJECT_BASE_PATH=.

# Optimalizáció (opcionális)
OLLAMA_NUM_GPU_LAYERS=35    # GPU rétegek száma (ha van GPU)
OLLAMA_NUM_THREADS=32       # CPU szálak száma (32 maghoz)
```

### 6. lépés: Rendszer indítása

```bash
chmod +x start.sh
./start.sh
```

A script:
- Ellenőrzi az Ollama futását
- Ellenőrzi a modellek telepítését
- Indítja a FastAPI szervert

---

## 🔧 Manuális telepítés (ha az automatikus nem működik)

### Python függőségek telepítése

```bash
pip3 install --upgrade pip
pip3 install -r installers/requirements.txt
```

### Könyvtárak létrehozása

```bash
mkdir -p logs data/cache data/memory projects
```

### Környezeti változók beállítása

```bash
export OLLAMA_URL="http://localhost:11434"
export DEFAULT_MODEL="llama3.1:8b"
export PROJECT_BASE_PATH="."
```

Vagy állandó beállításhoz a `.env` fájlban.

---

## 🏃 Rendszer indítása

### Opció 1: Automatikus indító script (ajánlott)

```bash
./start.sh
```

### Opció 2: Manuális indítás

#### Ollama indítása hátérben:

```bash
nohup ollama serve > logs/ollama.log 2>&1 &
```

#### FastAPI szerver indítása:

```bash
python3 main.py
```

Vagy uvicorn-nel közvetlenül:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Opció 3: Systemd szolgáltatásként (éles környezet)

Létrehozni egy `/etc/systemd/system/zedinarkmanager.service` fájlt:

```ini
[Unit]
Description=ZedinArkManager API Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/ZedinArkManager
EnvironmentFile=/path/to/ZedinArkManager/.env
ExecStart=/usr/bin/python3 /path/to/ZedinArkManager/main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Aktíválás:

```bash
sudo systemctl daemon-reload
sudo systemctl enable zedinarkmanager
sudo systemctl start zedinarkmanager
sudo systemctl status zedinarkmanager
```

---

## ✅ Ellenőrzés

### 1. Health check

```bash
curl http://localhost:8000/health
```

Válasz példa:
```json
{
  "status": "healthy",
  "ollama_connected": true,
  "base_path": ".",
  "default_model": "llama3.1:8b"
}
```

### 2. API dokumentáció

Nyisd meg böngészőben:
```
http://localhost:8000/docs
```

### 3. Telepített modellek listázása

```bash
curl http://localhost:8000/api/models
```

---

## 🔍 Hibaelhárítás

### Ollama nem fut

```bash
# Ellenőrzés
curl http://localhost:11434/api/tags

# Indítás
ollama serve

# Logok ellenőrzése
tail -f logs/ollama.log
```

### Python függőségek hiányoznak

```bash
pip3 install -r installers/requirements.txt
```

### Port már használatban

```bash
# Melyik process használja a portot?
sudo lsof -i :8000

# Kill process
sudo kill -9 <PID>
```

### Jogosultság hibák

```bash
# Jogosultságok beállítása
chmod +x start.sh
chmod +x installers/install.sh
chmod -R 755 logs data projects
```

### Log fájlok ellenőrzése

```bash
tail -f logs/app.log
tail -f logs/ollama.log
```

---

## 📝 Frissítés

### Kód frissítése

```bash
git pull origin main
pip3 install -r installers/requirements.txt --upgrade
```

### Ollama frissítése

```bash
ollama --version
# Újabb verzió letöltése
curl https://ollama.com/install.sh | sh
```

---

## 🔐 Biztonság (éles környezet)

1. **CORS korlátozás**: Szerkeszd a `main.py`-t, és korlátozd az `allow_origins`-t
2. **Autentikáció**: Adjon hozzá API kulcs autentikációt
3. **HTTPS**: Használj Nginx reverse proxy-t SSL-lel
4. **Firewall**: Nyisd meg csak a szükséges portokat

---

## 📞 További információk

- API dokumentáció: `http://localhost:8000/docs`
- Projekt struktúra: `docs/PROJECT_STRUCTURE.md`
- Használati útmutató: `docs/USAGE_GUIDE.md`

---

**Telepítés befejezve! 🎉**

