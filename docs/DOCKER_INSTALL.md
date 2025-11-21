# 🐳 Docker telepítési útmutató

## 📋 Előfeltételek

### Docker már telepítve van

Ha **Docker már telepítve van** a gépeden:
- ✅ **NEM** telepítjük újra a Docker-t
- ✅ **NEM** állítjuk le a meglévő konténereket
- ✅ Csak új konténereket hozunk létre a ZedinArkManager számára
- ✅ A meglévő Docker környezet nem lesz érintve

### Ellenőrzés

```bash
# Docker ellenőrzése
docker --version

# Docker Compose ellenőrzése
docker-compose --version

# Meglévő konténerek (nem fogja őket megváltoztatni)
docker ps
```

---

## 🚀 Docker telepítés lépései

### 1. lépés: Repository klónozása

```bash
git clone https://github.com/zedinke/ZedinArkManager.git
cd ZedinArkManager
```

### 2. lépés: Docker telepítő futtatása

```bash
cd installers
chmod +x docker-install.sh
./docker-install.sh
```

### 3. lépés: Docker Compose build és indítás

```bash
# Konténerek build-elése és indítása
docker-compose up -d --build

# Logok követése
docker-compose logs -f
```

### 4. lépés: Modell telepítése

```bash
# Ollama konténerbe belépés és modell telepítése
docker-compose exec ollama ollama pull llama3.1:8b

# Ez időbe telhet (~4-5GB letöltés)
```

### 5. lépés: Ellenőrzés

```bash
# Health check
curl http://localhost:8000/health

# Konténerek állapota
docker-compose ps

# API dokumentáció (böngészőben)
# http://localhost:8000/docs
```

---

## 📝 Docker használat

### Konténerek kezelése

**Indítás:**
```bash
cd installers
docker-compose up -d
```

**Leállítás:**
```bash
docker-compose down
```

**Újraindítás:**
```bash
docker-compose restart
```

**Logok megtekintése:**
```bash
# API logok
docker-compose logs -f api

# Ollama logok
docker-compose logs -f ollama

# Összes log
docker-compose logs -f
```

**Konténerek állapota:**
```bash
docker-compose ps
```

**Frissítés (új build):**
```bash
docker-compose up -d --build
```

### Közvetlen hozzáférés a konténerekhez

**API konténer:**
```bash
docker exec -it zedinark-api bash
```

**Ollama konténer:**
```bash
docker exec -it zedinark-ollama bash
```

---

## 🔍 Hibaelhárítás

### Port már használatban

Ha a 8000 vagy 11434 port már használatban van:

```bash
# Szerkeszd a docker-compose.yml fájlt
nano docker-compose.yml

# Változtasd meg a portokat:
# ports:
#   - "8001:8000"  # API port módosítása
#   - "11435:11434"  # Ollama port módosítása
```

### Konténer nem indul

```bash
# Logok ellenőrzése
docker-compose logs api
docker-compose logs ollama

# Konténer újraépítése
docker-compose up -d --build --force-recreate
```

### Modell nem töltődik le

```bash
# Ollama konténerbe belépés
docker exec -it zedinark-ollama bash

# Modell telepítése
ollama pull llama3.1:8b

# Ellenőrzés
ollama list
```

### Volume problémák

```bash
# Volume-ok ellenőrzése
docker volume ls

# Jogosultságok beállítása
chmod -R 755 ../logs ../data ../projects
```

---

## 📊 Teljesítmény optimalizálás

### GPU használat (ha van GPU)

Szerkeszd a `docker-compose.yml` fájlt:

```yaml
services:
  ollama:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

Telepítés után:
```bash
# Nvidia Docker runtime telepítése (ha nincs)
# Lásd: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html

# Újraindítás
docker-compose down
docker-compose up -d
```

---

## 🔐 Biztonság

### Környezeti változók

A `.env` fájl használatával:

```bash
# docker-compose.yml-ben:
environment:
  - OLLAMA_URL=${OLLAMA_URL:-http://ollama:11434}
  - DEFAULT_MODEL=${DEFAULT_MODEL:-llama3.1:8b}
```

### Hálózati izoláció

A konténerek saját Docker hálózatot használnak (`zedinark-network`), így nincs konfliktus a meglévő konténerekkel.

---

## ✅ Előnyök a Docker telepítésnél

- ✅ **Izolált környezet** - nem zavarja a meglévő rendszert
- ✅ **Könnyű karbantartás** - egyszerű frissítés és eltávolítás
- ✅ **Portabilitás** - ugyanaz minden környezetben
- ✅ **Nem érinti a meglévő konténereket** - teljesen elkülönült
- ✅ **Gyors indítás/leállítás** - `docker-compose up/down`

---

**Docker telepítés befejezve! 🎉**

