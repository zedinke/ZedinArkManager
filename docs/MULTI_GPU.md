# 🎮 Multi-GPU támogatás

## 📋 Áttekintés

Több GPU kezelése és load balancing automatikus GPU kiválasztással.

## 🔍 GPU detektálás

A rendszer automatikusan detektálja a GPU-kat:

```bash
# GPU státusz ellenőrzése
curl -X GET http://localhost:8000/api/gpu/status \
  -H "X-API-Key: your-api-key"
```

**Válasz:**
```json
{
  "gpus": [
    {
      "index": 0,
      "name": "NVIDIA GeForce RTX 4090",
      "status": "available",
      "memory_total": 24576,
      "memory_used": 8192,
      "memory_free": 16384,
      "memory_percent": 33.3,
      "utilization": 45.0,
      "temperature": 65.0
    }
  ],
  "count": 1,
  "available": 1
}
```

## 🎯 Load Balancing

### Automatikus GPU kiválasztás

A rendszer automatikusan kiválasztja a **legkevésbé terhelt GPU-t**:

- Memory használat alapján
- GPU utilization alapján
- Round-robin módszerrel

### Elérhető GPU lekérése

```bash
curl -X GET http://localhost:8000/api/gpu/available \
  -H "X-API-Key: your-api-key"
```

## ⚙️ GPU rétegek automatikus beállítása

A rendszer automatikusan meghatározza az Ollama GPU rétegek számát:

```python
# core/gpu_manager.py automatikusan:
# - Detektálja a GPU memóriát
# - Kiszámítja az optimális rétegszámot
# - Beállítja a NUM_GPU_LAYERS értékét
```

### Manuális beállítás

Ha manuálisan szeretnéd beállítani:

```env
# .env fájl
OLLAMA_NUM_GPU_LAYERS=35
```

## 📊 GPU állapot monitoring

### Health check-ben

```bash
curl http://localhost:8000/health
```

**Válasz:**
```json
{
  "status": "healthy",
  "gpu_count": 2,
  "gpu_layers": 35,
  ...
}
```

## 🔧 Több GPU használata

### 1. GPU-k ellenőrzése

```bash
# nvidia-smi
nvidia-smi

# API-n keresztül
curl http://localhost:8000/api/gpu/status
```

### 2. Ollama több GPU-val

Ollama alapértelmezetten automatikusan kezeli a GPU-kat. A `gpu_manager` csak információt szolgáltat és load balancing-et végez.

### 3. Manuális GPU választás

Ha több Ollama instance-t használsz különböző GPU-kon:

```bash
# GPU 0
CUDA_VISIBLE_DEVICES=0 ollama serve

# GPU 1
CUDA_VISIBLE_DEVICES=1 ollama serve
```

## ⚠️ Megjegyzések

1. **NVIDIA GPU szükséges** - `nvidia-smi` kell hogy elérhető legyen
2. **Automatikus detektálás** - Ha nincs GPU, a rendszer CPU-t használ
3. **Optimalizáció** - A GPU rétegek számát a rendszer automatikusan optimalizálja

---

**Hatékony GPU használat! 🎮**

