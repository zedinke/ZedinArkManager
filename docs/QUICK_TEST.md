# ✅ Gyors API teszt

## 🎯 Láthatod az API választ? (135.181.165.27:8000)

Ha látod ezt a JSON-t, **minden rendben!** ✅

```json
{
  "message": "AI Coding Assistant API",
  "version": "1.0.0",
  "endpoints": { ... }
}
```

## 🔍 További ellenőrzések

### 1. Health Check

Nyisd meg a böngészőben:
```
http://135.181.165.27:8000/health
```

Várható válasz:
```json
{
  "status": "healthy",
  "ollama_connected": true,
  "base_path": ".",
  "default_model": "llama3.1:8b"
}
```

### 2. API Dokumentáció

Nyisd meg:
```
http://135.181.165.27:8000/docs
```

Itt interaktívan tesztelheted az összes endpoint-ot!

### 3. Telepített modellek

Nyisd meg:
```
http://135.181.165.27:8000/api/models
```

Várható válasz:
```json
{
  "models": ["llama3.1:8b"],
  "default": "llama3.1:8b",
  "available": true
}
```

## 🚀 Használat

### Chat tesztelése

**Böngészőben:** http://135.181.165.27:8000/docs → `/api/chat` → Try it out

**Terminálból:**
```bash
curl -X POST http://135.181.165.27:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Helló! Működsz?"}
    ]
  }'
```

### Kód generálás tesztelése

**Böngészőben:** http://135.181.165.27:8000/docs → `/api/generate` → Try it out

**Terminálból:**
```bash
curl -X POST http://135.181.165.27:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Készíts egy Python függvényt ami összead két számot",
    "language": "python"
  }'
```

## ✅ Sikeres telepítés jelei

- ✅ API válaszol (`http://135.181.165.27:8000`)
- ✅ Health check OK (`/health`)
- ✅ Dokumentáció elérhető (`/docs`)
- ✅ Modellek telepítve (`/api/models`)

---

**Gratulálok! A rendszer fut és használatra kész! 🎉**

