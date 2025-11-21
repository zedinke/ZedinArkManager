# ⚡ Teljesítmény Frissítés

## 🚀 Változások

### CPU Erőforrások
- **CPU Thread-ek**: 8 → **12 mag**
- Jobb teljesítmény nagyobb modellekkel
- Gyorsabb válaszidő

### Kimenet Limitek
- **Token limit**: 100 → **2000 token**
- **Sor limit**: ~10 sor → **~300 sor**
- **Context window**: 512 → **2048 token**

## 📊 Teljesítmény Javulás

### Előtte:
- Max 8 CPU thread
- Max 100 token válasz (~10 sor)
- Kisebb context window (512 token)

### Utána:
- Max **12 CPU thread** ✅
- Max **2000 token válasz** (~300 sor) ✅
- Nagyobb context window (**2048 token**) ✅

## 🎯 Mire használható

Most már az AI képes:
- ✅ Hosszabb válaszokat adni (300 sorig)
- ✅ Nagyobb kontextust kezelni
- ✅ Több CPU erőforrást használni (gyorsabb válaszidő)

## ⚙️ Konfiguráció

Az erőforrások automatikusan beállítva vannak. Ha módosítani szeretnéd:

### Environment változók

```bash
# CPU thread-ek száma (max 12)
export OLLAMA_NUM_THREADS=12

# Ha többet szeretnél (nem ajánlott, CPU pörgést okozhat)
export OLLAMA_NUM_THREADS=16
```

### Kódban

A `core/llm_service.py` fájlban:

```python
options = {
    "num_thread": min(self.num_threads, 12),  # Max 12 thread
    "num_predict": 2000,  # ~300 sor válasz
    "num_ctx": 2048,  # Context window
}
```

## 💡 Tippek

1. **Ha lassú:** Csökkentsd a thread-ek számát 8-ra
2. **Ha túl rövid válasz:** Növeld a `num_predict`-et 3000-re
3. **Ha túl sok memória:** Csökkentsd a `num_ctx`-t 1024-re

## 🐛 Hibaelhárítás

### CPU 99%-on

**Probléma:** A CPU 99%-on pörög

**Megoldás:**
```bash
export OLLAMA_NUM_THREADS=8
```

### Válasz túl rövid

**Probléma:** A válasz túl rövid (< 300 sor)

**Megoldás:** Ellenőrizd, hogy a `num_predict` 2000-re van állítva a `core/llm_service.py`-ban

### Lassú válaszok

**Probléma:** Lassabb válaszidő

**Megoldás:** Használj GPU-t vagy csökkentsd a thread-ek számát

---

**Most már az AI képes hosszabb válaszokat adni és több erőforrást használni! 🎉**

