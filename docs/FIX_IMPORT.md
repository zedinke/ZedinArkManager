# 🔧 Import hiba javítása

## ❌ Probléma

A szerver nem indult el helyesen, mert hiányzott a `gpu_manager` import a `main.py` fájlból.

**Hiba:**
```
NameError: name 'gpu_manager' is not defined
```

**OK:**
- A `main.py` fájlban a 48. sorban használjuk a `gpu_manager.get_ollama_gpu_layers()` függvényt
- De az import nem volt meg: `from core.gpu_manager import gpu_manager`

## ✅ Megoldás

Hozzáadtuk a hiányzó importot a `main.py` fájlhoz:

```python
from core.gpu_manager import gpu_manager
```

## 🔄 Következő lépések

1. **Szerver újraindítása:**
   ```bash
   # Ha fut, állítsd le
   pkill -f "python.*main.py"
   
   # Indítsd újra
   source ai_venv/bin/activate
   python main.py
   ```

2. **Tesztelés:**
   ```bash
   # API kulcs generálás
   curl -X POST http://localhost:8000/api/auth/generate \
     -H "Content-Type: application/json" \
     -d '{"name": "Test Key", "description": "Test"}'
   ```

3. **Health check:**
   ```bash
   curl http://localhost:8000/health
   ```

---

**Most már működnie kell! ✅**

