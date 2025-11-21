# 🔍 CPU használat hibaelhárítás

## ❌ Probléma

A CPU **99%-on pörgeti** a gépet, de nem a `python main.py` process.

## ✅ Megoldás

### 1. CPU használat ellenőrzése

**Használd a diagnosztikai scriptet:**
```bash
cd ~/ZedinArkManager
chmod +x find_cpu_usage.sh
./find_cpu_usage.sh
```

Ez a script megmutatja:
- ✅ Top CPU fogyasztó folyamatok
- ✅ Python folyamatok
- ✅ Ollama folyamatok
- ✅ Magas CPU fogyasztó folyamatok (>10%)

### 2. Manuális ellenőrzés

**Top CPU fogyasztó folyamatok:**
```bash
ps aux --sort=-%cpu | head -10
```

**Python folyamatok:**
```bash
ps aux | grep python | grep -v grep
```

**Ollama folyamatok:**
```bash
ps aux | grep ollama | grep -v grep
```

**Legmagasabb CPU fogyasztó:**
```bash
top -bn1 | head -20
```

## 🔧 Lehetséges okok

### 1. Ollama pörgeti a CPU-t

**Jelzés:** Ollama process magas CPU használattal

**Megoldás:**
```bash
# Ollama folyamatok ellenőrzése
ps aux | grep ollama

# Ha magas CPU, állítsd le és indítsd újra
pkill ollama
sleep 2
ollama serve > /dev/null 2>&1 &
```

### 2. Több Python/szerver process fut

**Jelzés:** Több Python process fut

**Megoldás:**
```bash
# Összes Python process kilistázása
ps aux | grep python

# Összes Python process leállítása (ha szükséges)
pkill -f "python.*main.py"

# Csak a main.py leállítása
pkill -f "python.*main.py"

# Újraindítás
cd ~/ZedinArkManager
source ai_venv/bin/activate
python main.py --no-reload
```

### 3. Egyéb folyamatok

**Jelzés:** Más folyamat magas CPU használattal

**Megoldás:**
```bash
# Magas CPU fogyasztó folyamatok
ps aux --sort=-%cpu | head -10

# Ha megtalálod, állítsd le:
kill <PID>

# Vagy ha nem működik:
kill -9 <PID>
```

## 🚀 Gyors megoldás

### 1. Összes futó Python process leállítása

```bash
# Összes Python process leállítása
pkill -f "python.*main.py"

# Várj 2 másodpercet
sleep 2

# Újraindítás
cd ~/ZedinArkManager
source ai_venv/bin/activate
python main.py --no-reload
```

### 2. Ollama újraindítása

```bash
# Ollama leállítása
pkill ollama

# Várj 2 másodpercet
sleep 2

# Ollama indítása háttérben
ollama serve > /dev/null 2>&1 &

# Ellenőrzés
sleep 3
curl http://localhost:11434/api/tags
```

### 3. Minden folyamat ellenőrzése

```bash
# Top 10 CPU fogyasztó
ps aux --sort=-%cpu | head -11

# Ha megtalálod a problémát, állítsd le
kill <PID>
```

## 📊 Rendszer állapot ellenőrzése

### CPU használat

```bash
# Valós idejű CPU használat
top

# Vagy
htop

# Vagy
btop
```

### Memória használat

```bash
free -h
```

### Process lista

```bash
# Összes process
ps aux

# Python processek
ps aux | grep python

# Ollama processek
ps aux | grep ollama
```

## ✅ Ajánlott beállítások

### 1. Csak egy szerver process

```bash
# Ellenőrizd, hogy csak egy fut
ps aux | grep "python.*main.py"

# Ha több van, állítsd le mindet
pkill -f "python.*main.py"

# Újraindítás
python main.py --no-reload
```

### 2. Ollama háttérben

```bash
# Ollama háttérben indítása
nohup ollama serve > /dev/null 2>&1 &

# Vagy systemd service használata
sudo systemctl enable ollama
sudo systemctl start ollama
```

### 3. Monitorozás

```bash
# CPU használat figyelése
watch -n 1 'ps aux --sort=-%cpu | head -10'

# Vagy btop használata
btop
```

## 🎯 Gyors checklist

1. ✅ **CPU használat ellenőrzése:**
   ```bash
   ./find_cpu_usage.sh
   ```

2. ✅ **Top folyamatok:**
   ```bash
   ps aux --sort=-%cpu | head -10
   ```

3. ✅ **Python processek:**
   ```bash
   ps aux | grep python
   ```

4. ✅ **Ollama processek:**
   ```bash
   ps aux | grep ollama
   ```

5. ✅ **Problémás folyamat leállítása:**
   ```bash
   kill <PID>
   ```

---

**Most már megtalálhatod, mi pörgeti a CPU-t! 🔍**

