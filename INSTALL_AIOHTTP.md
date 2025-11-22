# aiohttp telepítése

## Probléma
```
error: externally-managed-environment
```

Ez azért történik, mert a virtual environment nincs aktiválva.

## Megoldás

### 1. Lépj ki az extension mappából
```bash
cd ~/ZedinArkManager
```

### 2. Aktiváld a virtual environment-et
```bash
source ai_venv/bin/activate
```

Vagy ha a virtual environment a szülő mappában van:
```bash
source ../ai_venv/bin/activate
```

### 3. Telepítsd az aiohttp-ot
```bash
pip install aiohttp==3.9.1
```

### 4. VAGY telepítsd az összes függőséget (ajánlott)
```bash
pip install -r installers/requirements.txt
```

Ez telepíti az összes szükséges package-t, beleértve az aiohttp-ot is.

## Ellenőrzés

Ellenőrizd, hogy telepítve van-e:
```bash
pip list | grep aiohttp
```

Vagy Python-ból:
```python
python -c "import aiohttp; print(aiohttp.__version__)"
```

## Ha nincs virtual environment

Ha még nincs virtual environment, hozd létre:
```bash
cd ~/ZedinArkManager
python3 -m venv ai_venv
source ai_venv/bin/activate
pip install -r installers/requirements.txt
```

