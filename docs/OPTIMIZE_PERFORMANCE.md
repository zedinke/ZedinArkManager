# ⚡ Teljesítmény optimalizálás

## 🐌 Lassú válaszidő problémák

Ha a chat API válasza több mint 60 másodperc, ez több okból lehet:

### 1. LLM válasz generálás ideje (normális)

Az LLM modellek válasz generálása **több másodpercig is eltarthat**, ez normális:

**Válaszidő általában:**
- **phi3:mini** (3B): 2-5 másodperc
- **llama3.1:8b**: 5-15 másodperc
- **mistral:7b**: 5-15 másodperc
- **codellama:7b**: 8-20 másodperc
- **codellama:13b**: 15-30 másodperc
- **codellama:34b**: 30-90 másodperc
- **llama3.1:70b**: 60-180+ másodperc

## ✅ Optimalizációs lehetőségek

### 1. Kisebb modell használata

**A kisebb modellek sokkal gyorsabbak:**

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "model": "phi3:mini"
  }'
```

**Gyors modellek (ajánlott):**
- `phi3:mini` - Nagyon gyors, kisebb válaszokhoz tökéletes
- `llama3.1:8b` - Gyors, jó minőség
- `mistral:7b` - Gyors, jó minőség

### 2. Stream használata (valós idejű válasz)

**A stream endpoint azonnal kezdi mutatni a választ:**

```bash
curl -X POST http://localhost:8000/api/chat/stream \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

**Python példa streamhez:**
```python
import requests

response = requests.post(
    "http://localhost:8000/api/chat/stream",
    headers={"X-API-Key": "your-api-key"},
    json={"messages": [{"role": "user", "content": "Hello!"}]},
    stream=True
)

for line in response.iter_lines():
    if line:
        print(line.decode('utf-8'))
```

### 3. Rövidebb prompt

**Rövidebb prompt = gyorsabb válasz:**

```bash
# Lassabb (hosszú prompt)
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Write a detailed explanation about how artificial intelligence works, including machine learning, neural networks, and deep learning concepts."}]
  }'

# Gyorsabb (rövid prompt)
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Hi"}]
  }'
```

### 4. Temperature csökkentése

**Alacsonyabb temperature = gyorsabb, konzisztensebb válasz:**

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "temperature": 0.3
  }'
```

### 5. GPU használata

**Ha van GPU, akkor sokkal gyorsabb:**

```bash
# GPU állapot ellenőrzése
curl http://localhost:8000/api/gpu/status

# Ha GPU van, automatikusan használja
```

**GPU beállítása (.env fájlban):**
```env
OLLAMA_NUM_GPU_LAYERS=35
```

### 6. Ollama optimalizálás

**Ollama beállítások optimalizálása:**

```env
# .env fájl
OLLAMA_NUM_THREADS=32  # CPU szálak száma
OLLAMA_NUM_GPU_LAYERS=35  # GPU rétegek száma
```

### 7. Timeout növelése

**Ha nagy modellt használsz, növeld a timeout-ot:**

```bash
# 180 másodperces timeout (3 perc)
curl --max-time 180 -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "model": "llama3.1:70b"
  }'
```

## 🔧 Tesztelés és mérés

### Gyors teszt (phi3:mini)

```bash
time curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Hi"}],
    "model": "phi3:mini"
  }'
```

### Közepes teszt (llama3.1:8b)

```bash
time curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "model": "llama3.1:8b"
  }'
```

## 📊 Teljesítmény összehasonlítás

**Várható válaszidők (CPU-n, rövid prompt):**

| Modell | Válaszidő | Használat |
|--------|-----------|-----------|
| phi3:mini | 2-5 sec | Gyors válaszok |
| llama3.1:8b | 5-15 sec | Általános használat |
| mistral:7b | 5-15 sec | Általános használat |
| codellama:7b | 8-20 sec | Kód generálás |
| codellama:13b | 15-30 sec | Komplex kód |
| codellama:34b | 30-90 sec | Nagyon komplex kód |
| llama3.1:70b | 60-180+ sec | Legjobb minőség |

**GPU-val 2-5x gyorsabb lehet!**

## ✅ Ajánlások

### Gyors válaszokhoz:

1. ✅ **Használj kisebb modellt** (`phi3:mini` vagy `llama3.1:8b`)
2. ✅ **Rövid prompt** használata
3. ✅ **Stream endpoint** használata (valós idejű válasz)
4. ✅ **Alacsonyabb temperature** (0.3-0.5)

### Jobb minőséghez (ha idő nem számít):

1. ✅ **Nagyobb modell** használata (`codellama:34b` vagy `llama3.1:70b`)
2. ✅ **Nagyobb timeout** (180+ másodperc)
3. ✅ **GPU használata** (ha van)

### Kód generáláshoz:

1. ✅ **Codellama modellek** (`codellama:7b`, `codellama:13b`, `codellama:34b`)
2. ✅ **Stream használata** (valós idejű látás)
3. ✅ **Részletes prompt**

## 🚀 Gyors példa

**Optimális beállítás gyors válaszhoz:**
```bash
export API_KEY="your-api-key-here"

curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "model": "phi3:mini",
    "temperature": 0.5
  }'
```

**Vagy stream (valós idejű):**
```bash
curl -X POST http://localhost:8000/api/chat/stream \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "model": "phi3:mini"
  }'
```

---

**Most már gyorsabban működik! ⚡**

