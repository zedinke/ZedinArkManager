# 🐧 Linux telepítési útmutató - Lépésről lépésre

## 📋 Előfeltételek ellenőrzése

### ⚠️ FONTOS: Docker környezet

Ha **Docker már telepítve van** a gépeden és más programok is használják:
- ✅ **NEM** telepítjük újra a Docker-t
- ✅ **NEM** állítjuk le a meglévő konténereket
- ✅ Használhatod a **Docker telepítési opciót** (alább)
- ✅ Vagy folytathatod a **hagyományos telepítéssel** (Python virtuális környezet)

### 1. lépés: Rendszerfrissítés

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. lépés: Telepítési módszer kiválasztása

**Válassz egyet a kettő közül:**

#### Opció A: Docker telepítés (ajánlott, ha Docker már van)
- ✅ Izolált környezet
- ✅ Könnyű karbantartás
- ✅ Nem érinti a meglévő rendszert
- 👉 [Ugrás a Docker telepítéshez](#-docker-telepítés-opció-a)

#### Opció B: Hagyományos telepítés (Python virtuális környezet)
- ✅ Meglévő `ai_venv` virtuális környezet használata
- ✅ Közvetlen hozzáférés
- ✅ Egyszerűbb hibakeresés
- 👉 [Ugrás a hagyományos telepítéshez](#-hagyományos-telepítés-opció-b)

### 3. lépés: Git telepítése/ellenőrzése

```bash
# Git ellenőrzése
git --version

# Ha nincs telepítve:
sudo apt install git -y
```

---

## 🐳 Docker telepítés (Opció A)

> **Megjegyzés:** Ez a módszer **nem telepíti újra a Docker-t** és **nem állítja le** a meglévő konténereket. 
> Csak új konténereket hoz létre a ZedinArkManager számára.

### 1. lépés: Docker ellenőrzése

```bash
# Docker ellenőrzése (ha már telepítve van)
docker --version

# Docker Compose ellenőrzése
docker-compose --version

# Meglévő konténerek listázása (nem fogja őket megváltoztatni)
docker ps
```

### 2. lépés: Repository klónozása

```bash
git clone https://github.com/zedinke/ZedinArkManager.git
cd ZedinArkManager
```

### 3. lépés: Docker telepítő futtatása

```bash
cd installers
chmod +x docker-install.sh
./docker-install.sh
cd ..
```

### 4. lépés: Docker Compose build és indítás

```bash
# Konténerek build-elése és indítása
cd installers
docker-compose up -d --build

# Logok követése
docker-compose logs -f
```

### 5. lépés: Modell telepítése

```bash
# Ollama konténerbe belépés és modell telepítése
docker-compose exec ollama ollama pull llama3.1:8b

# Ez időbe telhet (~4-5GB letöltés)
```

### 6. lépés: Ellenőrzés

```bash
# Health check
curl http://localhost:8000/health

# Konténerek állapota
docker-compose ps
```

**További információk:** Lásd `docs/DOCKER_INSTALL.md`

---

## 🚀 Hagyományos telepítés (Opció B)

### 1. lépés: Repository klónozása

```bash
# Klónozd le a repository-t
git clone https://github.com/zedinke/ZedinArkManager.git

# Lépj be a mappába
cd ZedinArkManager
```

### 2. lépés: Python virtuális környezet aktiválása

**A meglévő `ai_venv` virtuális környezet használata:**

```bash
# Aktiváld a meglévő virtuális környezetet
source ai_venv/bin/activate

# Ellenőrzés - a prompt elé kerüljön a (ai_venv)
# Példa: (ai_venv) user@server:~/ZedinArkManager$
```

**Ha nincs még `ai_venv` virtuális környezet:**

```bash
# Virtuális környezet létrehozása (ha még nincs)
python3 -m venv ai_venv

# Aktiválás
source ai_venv/bin/activate
```

### 3. lépés: Automatikus telepítő futtatása

```bash
# Telepítő script futtathatóvá tétele
chmod +x installers/install.sh

# Telepítő futtatása (virtuális környezetben!)
./installers/install.sh
```

**Mit csinál a telepítő?**
- ✅ Létrehozza a szükséges mappákat (`logs`, `data`, `projects`)
- ✅ Telepíti a Python függőségeket a virtuális környezetbe
- ✅ Ellenőrzi az Ollama telepítését
- ✅ Létrehozza a `.env` konfigurációs fájlt

### 4. lépés: Ollama telepítése (ha még nincs)

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

### 5. lépés: Ollama indítása

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

### 6. lépés: Modell telepítése

**Fontos:** A modell telepítéshez az Ollama-nak futnia kell!

```bash
# A magyarul jól beszélő modell letöltése (~4-5GB, ez időbe telhet)
ollama pull llama3.1:8b

# Ellenőrzés
ollama list
```

**Alternatív modellek (ha szükséges):**

```bash
ollama pull codellama       # Kód-generálásra optimalizált
ollama pull mistral         # Kisebb, gyorsabb modell
ollama pull deepseek-coder  # Code generation modell
```

### 7. lépés: Környezeti változók beállítása

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

### 8. lépés: Rendszer indítása

**Fontos:** A virtuális környezetnek aktiválva kell lennie!

```bash
# Győződj meg róla, hogy a virtuális környezet aktív
source ai_venv/bin/activate

# Indító script futtathatóvá tétele
chmod +x start.sh

# Rendszer indítása (virtuális környezetben!)
./start.sh
```

**Mit csinál az indító script?**
- ✅ Ellenőrzi, hogy az Ollama fut-e
- ✅ Ellenőrzi a modellek telepítését (ha nincs, kérdezi, hogy telepítse-e)
- ✅ Ellenőrzi a Python függőségeket
- ✅ Betölti a környezeti változókat (`.env` fájlból)
- ✅ Indítja a FastAPI szervert

### 9. lépés: Ellenőrzés, hogy minden működik

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

## 🔧 Későbbi használat (hagyományos telepítés)

### Rendszer indítása

**Fontos:** Mindig aktiváld a virtuális környezetet!

```bash
# Aktiváld a virtuális környezetet
source ai_venv/bin/activate

# Rendszer indítása
./start.sh
```

### Rendszer leállítása

```bash
# Ctrl+C a terminálban, ahol fut
# Vagy ha hátérben fut:
ps aux | grep "python.*main.py"
kill <PID>
```

### Hátérben indítás

```bash
# Aktiváld a virtuális környezetet
source ai_venv/bin/activate

# Ollama hátérben (ha még nem fut)
nohup ollama serve > logs/ollama.log 2>&1 &

# FastAPI hátérben
nohup python3 main.py > logs/app.log 2>&1 &

# PID mentése (később leállításhoz)
echo $! > logs/api.pid
```

---

## 🔍 Hibaelhárítás

### Virtuális környezet problémák

```bash
# Aktiválás ellenőrzése
which python3
# Válasz: /path/to/ai_venv/bin/python3

# Ha nem jó, aktiváld újra
source ai_venv/bin/activate

# Függőségek újratelepítése
pip3 install -r installers/requirements.txt
```

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
# Modell telepítése (Ollama-nak futnia kell!)
ollama pull llama3.1:8b

# Ellenőrzés
ollama list
```

### Python függőségek hiányoznak

```bash
# Aktiváld a virtuális környezetet
source ai_venv/bin/activate

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
- **Docker telepítés**: `docs/DOCKER_INSTALL.md`
- **GitHub repository**: https://github.com/zedinke/ZedinArkManager

---

## 🎉 Sikeres telepítés!

Ha minden lépés sikeres volt, a rendszer most fut és használatra kész!

**Első lépések:**
1. Aktiváld a virtuális környezetet: `source ai_venv/bin/activate`
2. Nyisd meg: http://localhost:8000/docs
3. Próbáld ki a `/api/chat` endpoint-ot
4. Generálj kódot a `/api/generate` endpoint-tal

**Jó munkát! 🚀**
