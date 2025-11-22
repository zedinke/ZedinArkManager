# aiohttp telepítése

## Probléma
```
error: externally-managed-environment
```

Ez azért történik, mert a virtual environment nincs aktiválva.

## Gyors megoldás (ajánlott)

### Automatikus telepítési script használata:
```bash
cd ~/ZedinArkManager
chmod +x install_aiohttp.sh
./install_aiohttp.sh
```

Ez automatikusan:
- Megkeresi a virtual environment-et
- Aktiválja
- Telepíti az aiohttp-ot
- Ellenőrzi a telepítést

## Manuális telepítés

### 1. Lépj a fő mappába
```bash
cd ~/ZedinArkManager
```

### 2. Aktiváld a virtual environment-et
```bash
source ai_venv/bin/activate
```

**Fontos:** A prompt elején meg kell jelennie: `(ai_venv)`

Ha nem látod, akkor a virtual environment nincs aktiválva!

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

