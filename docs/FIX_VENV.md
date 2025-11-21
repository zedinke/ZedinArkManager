# 🔧 Virtuális környezet probléma megoldása

## ❌ Probléma: `ai_venv/bin/activate: No such file or directory`

### Lehetséges okok:
1. A virtuális környezet nem lett létrehozva
2. A virtuális környezet más helyen van
3. A telepítő script nem futott le helyesen

## ✅ Megoldás

### 1. Ellenőrzés

```bash
# Hol vagyunk?
pwd

# Van-e virtuális környezet valahol?
ls -la | grep ai_venv

# Vagy egy szinttel feljebb?
ls -la .. | grep ai_venv
```

### 2. Virtuális környezet létrehozása

**Opció A: Automatikus script (ajánlott)**

```bash
cd ~/ZedinArkManager
chmod +x installers/create_venv.sh
./installers/create_venv.sh
```

**Opció B: Manuális létrehozás**

```bash
# Lépj be a projekt mappába
cd ~/ZedinArkManager

# Virtuális környezet létrehozása
python3 -m venv ai_venv

# Aktiválás
source ai_venv/bin/activate

# Ellenőrzés (a prompt elé kell kerüljön a (ai_venv))
which python3

# Függőségek telepítése
pip3 install -r installers/requirements.txt
```

### 3. Teljes újratelepítés (ha szükséges)

```bash
cd ~/ZedinArkManager
chmod +x installers/install.sh
./installers/install.sh
```

Ez a script:
- Törli a régi virtuális környezetet
- Létrehozza az újat
- Telepíti a függőségeket
- Telepíti az Ollama-t és a modelleket

## ✅ Sikeres létrehozás után

```bash
# Aktiválás
source ai_venv/bin/activate

# Ellenőrzés
python3 --version
pip3 list

# Rendszer indítása
./start.sh
```

