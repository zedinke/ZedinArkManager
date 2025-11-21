# 📖 Használati útmutató

## 🚀 Gyors kezdés

### 1. Rendszer indítása

```bash
./start.sh
```

A script automatikusan:
- Ellenőrzi az Ollama futását
- Ellenőrzi a modellek telepítését
- Indítja a FastAPI szervert

### 2. API elérése

- **API**: http://localhost:8000
- **Dokumentáció**: http://localhost:8000/docs
- **Health check**: http://localhost:8000/health

---

## 📡 API használat

### Chat

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Készíts egy Python függvényt ami összead két számot"}
    ]
  }'
```

### Kód generálás

```bash
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Készíts egy Python függvényt ami faktoriálist számol",
    "language": "python"
  }'
```

---

## 🔧 További információ

Lásd: `how_to_install.md` a telepítéshez.

