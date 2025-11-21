# 🔥 Tűzfal beállítása

## 📋 Áttekintés

A tűzfal beállítása szükséges ahhoz, hogy a ZedinArkManager API elérhető legyen külső hálózatról is.

## 🚀 Automatikus beállítás

### UFW tűzfal beállítása

```bash
cd ~/ZedinArkManager
chmod +x installers/setup_firewall.sh
sudo ./installers/setup_firewall.sh
```

Ez a script:
- ✅ Telepíti az UFW-t (ha nincs)
- ✅ Megnyitja a 22-es portot (SSH)
- ✅ Megnyitja a 8000-es portot (API szerver)
- ✅ Megnyitja a 11434-es portot (Ollama - csak localhost)
- ✅ Opcionálisan megnyitja a 443-as portot (HTTPS)

## 🔧 Manuális beállítás

### 1. UFW telepítése

```bash
sudo apt update
sudo apt install -y ufw
```

### 2. Portok megnyitása

```bash
# SSH (22) - fontos, hogy ne zárjuk ki magunkat!
sudo ufw allow 22/tcp

# API szerver (8000)
sudo ufw allow 8000/tcp

# Ollama (11434) - csak helyi hálózatról
sudo ufw allow from 127.0.0.1 to any port 11434

# HTTPS (443) - ha SSL-t használsz
sudo ufw allow 443/tcp
```

### 3. Tűzfal aktiválása

```bash
# Aktiválás
sudo ufw enable

# Státusz ellenőrzése
sudo ufw status numbered
```

## 🔍 Ellenőrzés

### Portok ellenőrzése

```bash
# Nyitott portok listája
sudo ufw status numbered

# Port ellenőrzése
sudo netstat -tlnp | grep 8000
sudo netstat -tlnp | grep 11434
```

### Külső elérés tesztelése

**Másik gépről vagy böngészőből:**
```bash
# API szerver ellenőrzése
curl http://135.181.165.27:8000/health

# Ha működik, válasz jön:
# {"status": "healthy", ...}
```

### Szerver beállítás ellenőrzése

**Ellenőrizd, hogy a szerver 0.0.0.0-on fut (main.py):**
```python
uvicorn.run(
    "main:app",
    host="0.0.0.0",  # ← Ez kell, hogy legyen!
    port=8000,
    reload=use_reload
)
```

## ⚠️ Lassú válaszidő

Ha a kérés eljut, de lassú a válasz, akkor **NEM tűzfal probléma**, hanem:

### 1. LLM válasz generálás ideje

Az LLM modellek válasz generálása **több másodpercig is eltarthat**, ez normális:
- **Kisebb modellek (phi3:mini, llama3.1:8b)**: 2-5 másodperc
- **Közepes modellek (mistral:7b, codellama:7b)**: 5-15 másodperc
- **Nagy modellek (llama3.1:70b, codellama:34b)**: 15-60+ másodperc

### 2. Optimalizálás

**Kisebb modell használata:**
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "model": "phi3:mini"
  }'
```

**Rövidebb prompt:**
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Hi"}]
  }'
```

**Stream használata (valós idejű válasz):**
```bash
curl -X POST http://localhost:8000/api/chat/stream \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 3. GPU használata

Ha van GPU, akkor gyorsabb lehet:
```bash
# GPU állapot ellenőrzése
curl http://localhost:8000/api/gpu/status
```

## 🔧 Hibaelhárítás

### Port foglalt

```bash
# Mi fut a 8000-es porton?
sudo lsof -i :8000

# Ha szükséges, állítsd le:
sudo kill -9 <PID>
```

### Tűzfal blokkolja

```bash
# Tűzfal szabályok ellenőrzése
sudo ufw status numbered

# Ha nincs 8000-es port szabály, add hozzá:
sudo ufw allow 8000/tcp
sudo ufw reload
```

### Külső elérés nem működik

**1. Ellenőrizd a szerver beállítását:**
```bash
# main.py-ban legyen:
host="0.0.0.0"  # Nem "127.0.0.1"!
```

**2. Ellenőrizd a tűzfalat:**
```bash
sudo ufw status
```

**3. Ellenőrizd a cloud provider tűzfalát:**
- AWS Security Groups
- DigitalOcean Firewalls
- stb.

### Timeout hiba

Ha timeout hibát kapsz, növeld a timeout-ot:
```bash
# 120 másodperces timeout
curl --max-time 120 -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"messages": [{"role": "user", "content": "Hello!"}]}'
```

## 📊 Teljes ellenőrzés

```bash
# 1. Szerver fut-e?
ps aux | grep "python.*main.py"

# 2. Port nyitva van-e?
sudo netstat -tlnp | grep 8000

# 3. Tűzfal szabályok
sudo ufw status numbered

# 4. Külső elérés teszt
curl http://135.181.165.27:8000/health

# 5. Localhost elérés teszt
curl http://localhost:8000/health
```

## ✅ Végleges ellenőrzés

**Működik-e kívülről:**
```bash
# Böngészőben vagy másik gépről:
http://135.181.165.27:8000/health
http://135.181.165.27:8000/docs
```

**Ha ezek működnek, akkor a tűzfal rendben van! ✅**

---

**Biztonságos használatot! 🔒**

