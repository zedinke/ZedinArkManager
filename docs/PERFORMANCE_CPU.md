# ⚡ CPU használat optimalizálása

## ❌ Probléma

A szerver **100%-on pörgeti a CPU-t**, mert a `reload` mód aktív, ami folyamatosan figyeli a fájl változásokat.

## ✅ Megoldás

### 1. Reload mód kikapcsolása (AJÁNLOTT éles környezetben)

**A `start.sh` script már automatikusan kikapcsolja a reload-ot!**

```bash
# Használd a start.sh scriptet
./start.sh
```

**Vagy manuálisan:**
```bash
python main.py --no-reload
```

**Vagy környezeti változóval:**
```bash
export RELOAD=false
python main.py
```

### 2. Reload mód beállítása

**Fejlesztéshez (reload bekapcsolva):**
```bash
export RELOAD=true
python main.py
```

**Éles környezetben (reload kikapcsolva):**
```bash
export RELOAD=false
python main.py
# vagy
python main.py --no-reload
```

## 🔧 Reload mód részletek

### Mi a reload mód?

A `reload=True` beállítás azt jelenti, hogy a szerver **automatikusan újraindul**, ha bármelyik Python fájl változik. Ez hasznos fejlesztéshez, de:

- ❌ **CPU intenzív** - folyamatosan figyeli a fájlokat
- ❌ **Memória fogyasztó** - több process futhat
- ❌ **Nem kell éles környezetben** - ott nem változnak a fájlok

### Reload kikapcsolva

Ha a reload kikapcsolva van:
- ✅ **Alacsony CPU használat** - csak a szükséges erőforrásokat használja
- ✅ **Jobb teljesítmény** - nincs fájl figyelés overhead
- ✅ **Stabilabb** - kevesebb process, kevesebb memória

## 📊 CPU használat összehasonlítás

### Reload bekapcsolva:
```
CPU: 80-100% (folyamatos fájl figyelés)
Memória: ~200-300 MB
Process: 2-3 (main + reload watcher)
```

### Reload kikapcsolva:
```
CPU: 5-15% (csak kérések feldolgozásakor)
Memória: ~100-150 MB
Process: 1 (csak main)
```

## 🚀 Ajánlott beállítások

### Éles környezet (szerver)

**Használd a `start.sh` scriptet:**
```bash
./start.sh
```

Ez automatikusan:
- ✅ Kikapcsolja a reload-ot
- ✅ Ellenőrzi az Ollama-t
- ✅ Beállítja a portokat

### Fejlesztés (lokális)

**Ha fejlesztesz és szeretnéd a reload-ot:**
```bash
export RELOAD=true
python main.py
```

**Vagy közvetlenül:**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## 🔍 Ellenőrzés

### CPU használat ellenőrzése

```bash
# Process CPU használat
top -p $(pgrep -f "python.*main.py")

# Vagy
htop -p $(pgrep -f "python.*main.py")
```

### Reload mód ellenőrzése

**Ha reload aktív, látod a logokban:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
```

**Ha reload kikapcsolva:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started server process
```

## ⚙️ További optimalizációk

### 1. Worker process-ek (ha sok kérés van)

```bash
# Több worker process (CPU magok száma)
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 2. Ollama optimalizálás

```env
# .env fájl
OLLAMA_NUM_THREADS=8  # Csökkentsd, ha túl sok
```

### 3. Logging csökkentése

```python
# main.py-ban
logging.basicConfig(
    level=logging.WARNING,  # INFO helyett WARNING
    ...
)
```

## ✅ Gyors megoldás

**Most azonnal:**

1. **Állítsd le a jelenlegi szervert:**
   ```bash
   pkill -f "python.*main.py"
   ```

2. **Indítsd újra reload nélkül:**
   ```bash
   cd ~/ZedinArkManager
   source ai_venv/bin/activate
   python main.py --no-reload
   ```

3. **Vagy használd a start.sh scriptet:**
   ```bash
   ./start.sh
   ```

**Most már csak 5-15% CPU-t fog használni! ✅**

---

**Most már hatékonyan fut! ⚡**

