# 🖼️ Vision Model Telepítési Útmutató

## 🎯 Cél

A vision model lehetővé teszi, hogy az AI **lássa és értelmezze a képeket**. A rendszer Ollama vision modelleket használ (pl. llava).

## 📦 Telepítés

### 1. Vision Model Letöltése

Telepítsd a llava vision modelt:

```bash
ollama pull llava
```

Vagy más vision modelleket:

```bash
# Kisebb, gyorsabb modell
ollama pull llava:7b

# Nagyobb, pontosabb modell
ollama pull llava:13b
ollama pull llava:34b
```

### 2. Ellenőrzés

Ellenőrizd, hogy a modell telepítve van-e:

```bash
ollama list
```

Keress rá: `llava` a listában.

## 🚀 Használat

### VS Code Extension-ben

1. **Kép feltöltése:**
   - Nyisd meg a ZedinArk AI sidebar chat-et
   - Kattints a **"Kép"** gombra
   - Válaszd ki a képet

2. **Kép elemzése:**
   - A kép automatikusan feltöltődik
   - Az AI elemzi a képet és leírja, mit lát

### API-n keresztül

```bash
# Kép base64 kódolása (Linux/Mac)
IMAGE_B64=$(base64 -i image.jpg)

# API hívás
curl -X POST http://localhost:8000/api/vision \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d "{
    \"image\": \"$IMAGE_B64\",
    \"prompt\": \"Elemezd ezt a képet részletesen\",
    \"model\": \"llava\"
  }"
```

## ⚙️ Konfiguráció

### Modell megadása

A vision endpoint automatikusan a `llava` modellt használja. Más modellt is megadhatsz:

```json
{
  "image": "base64_encoded_image",
  "prompt": "Elemezd ezt a képet",
  "model": "llava:13b"
}
```

### Alapértelmezett prompt

Ha nem adsz meg promptot, az alapértelmezett prompt használatos:
> "Elemezd ezt a képet részletesen. Írd le, mit látsz, milyen objektumok, színek, szövegek vannak rajta, és adj releváns információkat."

## 🐛 Hibaelhárítás

### "Vision model nincs telepítve" hiba

**Probléma:** `Vision model (llava) nincs telepítve`

**Megoldás:**
```bash
ollama pull llava
```

### "Ollama API nem elérhető" hiba

**Probléma:** `Ollama vision API nem elérhető`

**Megoldás:**
1. Ellenőrizd, hogy Ollama fut-e:
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. Indítsd el Ollama-t:
   ```bash
   ollama serve
   ```

### Lassú válaszok

**Probléma:** A vision elemzés lassú

**Megoldások:**
1. Használj kisebb modellt (pl. `llava:7b` helyett `llava:13b`)
2. Csökkentsd a kép méretét a feltöltés előtt
3. Gyorsabb GPU-val dolgozz

## 📊 Támogatott modellek

- **llava** - Általános célú vision model (alapértelmezett)
- **llava:7b** - Kisebb, gyorsabb verzió
- **llava:13b** - Közepes, pontosabb verzió
- **llava:34b** - Nagy, nagyon pontos verzió (sok memória)

## 💡 Tippek

1. **Kép mérete:** A kisebb képek gyorsabban feldolgozhatók. Javasolt max. 1024x1024 pixel.

2. **Kép formátum:** A legtöbb formátum támogatott (JPEG, PNG, etc.), de a JPEG általában a leghatékonyabb.

3. **Batch feldolgozás:** Jelenleg egy képet lehet egyszerre elemezni. A többszörös kép elemzéshez külön kéréseket kell küldeni.

4. **Context:** A vision model nagyobb context window-ot használ (4096 token), így részletesebb elemzéseket tud készíteni.

---

**Most már az AI láthatja és értelmezheti a képeket! 🎉**

