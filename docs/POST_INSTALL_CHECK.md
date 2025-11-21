# ✅ Telepítés utáni ellenőrzés

## 🔍 Gyors ellenőrzés lépései

### 1. Ollama ellenőrzése

```bash
# Ollama verzió
ollama --version

# Ollama fut-e?
curl http://localhost:11434/api/tags

# Telepített modellek
ollama list
```

### 2. Virtuális környezet ellenőrzése

```bash
# Aktiválás
source ai_venv/bin/activate

# Ellenőrzés (a prompt elé kell kerüljön a (ai_venv))
which python3

# Python függőségek ellenőrzése
pip3 list | grep -i fastapi
pip3 list | grep -i uvicorn
```

### 3. API szerver ellenőrzése

```bash
# Health check
curl http://localhost:8000/health

# API dokumentáció (böngészőben)
# http://localhost:8000/docs

# Telepített modellek listázása
curl http://localhost:8000/api/models
```

### 4. Log fájlok ellenőrzése

```bash
# Alkalmazás logok
tail -f logs/app.log

# Ollama logok
tail -f logs/ollama.log

# Hibák keresése
grep -i error logs/app.log
```

## 🚀 Indítás

### Rendszer indítása

```bash
# Aktiváld a virtuális környezetet
source ai_venv/bin/activate

# Indító script
./start.sh
```

### Hátérben indítás

```bash
# Aktiváld a virtuális környezetet
source ai_venv/bin/activate

# Ollama hátérben (ha még nem fut)
nohup ollama serve > logs/ollama.log 2>&1 &

# API szerver hátérben
nohup python3 main.py > logs/app.log 2>&1 &
```

## ⚠️ Gyakori problémák

### Ollama nem fut

```bash
# Indítás
ollama serve &

# Ellenőrzés
curl http://localhost:11434/api/tags
```

### Modell nincs telepítve

```bash
# Telepítés
ollama pull llama3.1:8b

# Ellenőrzés
ollama list
```

### Port már használatban

```bash
# Melyik process használja?
sudo lsof -i :8000

# Leállítás
sudo kill -9 <PID>
```

### Python függőségek hiányoznak

```bash
# Aktiváld a virtuális környezetet
source ai_venv/bin/activate

# Telepítés
pip3 install -r installers/requirements.txt
```

## ✅ Sikeres telepítés jelei

- ✅ Ollama fut és válaszol
- ✅ Modell telepítve van (`llama3.1:8b`)
- ✅ Virtuális környezet aktív
- ✅ Python függőségek telepítve
- ✅ API szerver fut (`http://localhost:8000`)
- ✅ Health check válaszol

---

**Ha minden rendben, a rendszer használatra kész! 🎉**

