# ⏱️ API Teszt Timeout hiba megoldása

## ❌ Probléma

A `test_api.sh` script a chat tesztnél elakad és nem megy tovább.

## 🔍 Okok

1. **Hosszú válaszidő** - Az LLM válaszolása több másodpercig is eltarthat
2. **Nincs timeout** - A curl végtelenül várakozik
3. **Nagy modellek** - Nagyobb modellek (70b, 34b) lassabbak

## ✅ Megoldás

### 1. Frissített test script

A script most már tartalmaz:
- ✅ Timeout beállítást (60 másodperc)
- ✅ Jobb hibakezelést
- ✅ Információt a folyamatról

**Frissítés:**
```bash
cd ~/ZedinArkManager
git pull origin main
chmod +x test_api.sh
```

### 2. Manuális tesztelés timeout-tal

**Chat teszt timeout-tal:**
```bash
export API_KEY="your-api-key-here"

curl --max-time 60 -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello! Say hello in Hungarian."}
    ]
  }'
```

### 3. Rövidebb prompt használata

A rövidebb prompt gyorsabb választ eredményez:

```bash
curl --max-time 60 -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [
      {"role": "user", "content": "Say hello in one word."}
    ]
  }'
```

## 🚀 Gyors tesztelés

**Health check (gyors):**
```bash
curl http://localhost:8000/health
```

**Modellek listázása (gyors):**
```bash
curl http://localhost:8000/api/models
```

**API kulcs generálása (gyors):**
```bash
curl -X POST http://localhost:8000/api/auth/generate \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Key", "description": "Test"}'
```

**Chat teszt (lassabb, timeout-tal):**
```bash
export API_KEY="your-api-key-here"

timeout 60 curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [
      {"role": "user", "content": "Say hello."}
    ]
  }'
```

## 📊 Válaszidő optimalizálás

### Kisebb modell használata

A kisebb modellek gyorsabbak:
- `phi3:mini` - Nagyon gyors
- `llama3.1:8b` - Gyors
- `mistral:7b` - Gyors
- `llama3.1:70b` - Lassabb
- `codellama:34b` - Lassabb

**Modell megadása:**
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "model": "phi3:mini"
  }'
```

### Rövid prompt

Rövidebb prompt = gyorsabb válasz.

### Temperature csökkentése

Alacsonyabb temperature = konzisztensebb, esetleg gyorsabb válasz.

## ✅ Frissített script használata

A frissített script most már:
- ✅ 60 másodperces timeout-tal működik
- ✅ Információt ad a folyamatról
- ✅ Kezeli a timeout hibákat
- ✅ Jobb hibakezelést tartalmaz

**Futtatás:**
```bash
cd ~/ZedinArkManager
./test_api.sh
```

Ha a chat teszt túl hosszú, a script:
- ⏳ Megjeleníti, hogy vár
- ⏱️ Maximum 60 másodpercig várakozik
- ⚠️ Ha timeout van, jelzi, hogy ez normális lehet

---

**Most már működnie kell! ✅**

