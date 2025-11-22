# Distributed Computing Network

## 📋 Leírás

A Distributed Computing Network lehetővé teszi, hogy **minden felhasználó erőforrásait (GPU, CPU) közösen használja a rendszer**. Egy kérésnél **minden elérhető csomóponton párhuzamosan** fut a feldolgozás, és a válaszokat intelligensen kombinálja.

## 🎯 Főbb jellemzők

- **Párhuzamos feldolgozás**: Minden kérés minden elérhető csomóponton fut egyszerre
- **Intelligens válasz kombinálás**: A legjobb válaszokat választja vagy kombinálja
- **Automatikus load balancing**: A legkevésbé terhelt csomópontokat használja
- **Skálázhatóság**: Minél több felhasználó, annál gyorsabb a rendszer
- **Fault tolerance**: Ha egy csomópont hibázik, a többiek tovább dolgoznak

## 🏗️ Architektúra

```
┌─────────────┐
│   Client 1  │ (Windows GPU)
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
┌──────▼──────┐    ┌─────▼─────┐
│  Coordinator│    │  Client 2  │ (Linux GPU)
│   Server    │    └─────┬──────┘
└──────┬──────┘          │
       │                 │
       ├─────────────────┘
       │
┌──────▼──────┐
│  Client 3   │ (Mac CPU)
└─────────────┘

1 kérés → Minden csomóponton párhuzamosan fut
         → Válaszok kombinálása
```

## 🚀 Használat

### 1. Csomópont regisztrálása

Minden felhasználó regisztrálja a saját gépét a hálózatba:

```python
POST /api/distributed/register
{
    "node_id": "user1-windows-pc",
    "user_id": "user1",
    "name": "Windows PC - RTX 4090",
    "ollama_url": "http://localhost:11434",
    "gpu_count": 1,
    "gpu_memory": 24576,  # MB
    "cpu_cores": 16,
    "available_models": ["llama3.1:8b", "mistral:7b"]
}
```

### 2. Állapot frissítése

Rendszeres heartbeat üzenetek:

```python
POST /api/distributed/status/{node_id}
{
    "status": "online",
    "available_models": ["llama3.1:8b"],
    "current_load": 0.3,
    "response_time": 150.5
}
```

### 3. Chat kérés (automatikus distributed computing)

A `/api/chat` endpoint automatikusan használja a distributed hálózatot, ha van elérhető csomópont:

```python
POST /api/chat
{
    "messages": [...],
    "model": "llama3.1:8b",
    "use_distributed": true  # Alapértelmezett: true
}
```

**Mi történik:**
1. A szerver megtalálja az összes elérhető csomópontot
2. Párhuzamosan küldi a kérést mindegyikre
3. Várja meg az összes választ
4. Intelligensen kombinálja vagy a legjobbat választja

## 📊 Statisztikák

```python
GET /api/distributed/stats
```

Visszaadja:
- Összes csomópont száma
- Online csomópontok száma
- Összes GPU memória
- Összes CPU magok
- Aktív feladatok száma

## 🔧 VS Code Extension integráció

A VS Code extension automatikusan regisztrálja magát a hálózatba, amikor:
1. Lokális Ollama elérhető
2. `useDistributedNetwork` beállítás be van kapcsolva

**Beállítások:**
```json
{
    "zedinark.useDistributedNetwork": true,
    "zedinark.nodeName": "My Windows PC",
    "zedinark.autoRegister": true
}
```

## 💡 Előnyök

1. **Gyorsabb válaszidő**: Minél több csomópont, annál gyorsabb
2. **Jobb minőség**: Több válasz kombinálása = részletesebb válasz
3. **Fault tolerance**: Ha egy csomópont hibázik, a többiek tovább dolgoznak
4. **Skálázhatóság**: Új felhasználók = több erőforrás = gyorsabb rendszer

## ⚠️ Figyelmeztetések

- **Erőforrás felhasználás**: Minden kérés minden csomóponton fut
- **Hálózati forgalom**: Nagyobb hálózati forgalom
- **Biztonság**: Csak megbízható felhasználókkal használd

## 🔐 Biztonság

- API kulcsok használata
- Csomópont autentikáció
- Rate limiting
- Felhasználó izoláció

## 📈 Példa: 3 felhasználó

**Felhasználó 1**: Windows PC, RTX 4090 (24GB)
**Felhasználó 2**: Linux Server, 2x RTX 3090 (48GB)
**Felhasználó 3**: MacBook, M2 Pro (CPU only)

**1 kérés esetén:**
- 3 csomóponton párhuzamosan fut
- 3 válasz érkezik
- Legjobb válasz vagy kombinált válasz
- **3x gyorsabb**, mint egy csomóponton

## 🎓 További információk

Lásd: `core/distributed_computing.py` - teljes implementáció

