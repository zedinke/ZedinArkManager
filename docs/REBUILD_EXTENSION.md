# 🔧 Extension teljes újraépítése

## ❌ Probléma

**Hibaüzenet:**
```
sh: 1: tsc: Permission denied
sh: 1: vsce: Permission denied
```

**Ok**: A `node_modules` fájlok sérültek vagy nem megfelelően lettek telepítve.

## ✅ Megoldás: Teljes újraépítés

### 1. Automatikus rebuild (ajánlott)

**Futtasd a rebuild scriptet:**
```bash
cd ~/ZedinArkManager/extension
git pull origin main
chmod +x rebuild.sh
./rebuild.sh
```

Ez a script:
- ✅ Törli a régi `node_modules` és `out` mappákat
- ✅ Törli a régi VSIX fájlokat
- ✅ Újratelepíti az összes függőséget
- ✅ Javítja a jogosultságokat
- ✅ Lefordítja a TypeScript-et
- ✅ Csomagolja az extension-t

### 2. Manuális rebuild

**Ha a script nem működik, csináld manuálisan:**

```bash
cd ~/ZedinArkManager/extension

# 1. Töröld a régi fájlokat
rm -rf node_modules out *.vsix

# 2. Telepítsd újra a függőségeket
npm install

# 3. Javítsd a jogosultságokat
chmod +x node_modules/.bin/*

# 4. Ellenőrizd a TypeScript-et
ls -la node_modules/.bin/tsc

# 5. Fordítsd le közvetlenül
./node_modules/.bin/tsc -p ./

# 6. Csomagold közvetlenül
./node_modules/.bin/vsce package
```

### 3. Globális telepítés (utolsó megoldás)

**Ha még mindig nem működik, telepítsd globálisan:**

```bash
# Globális TypeScript telepítés
npm install -g typescript

# Globális vsce telepítés
npm install -g @vscode/vsce

# Most már működnie kellene
cd ~/ZedinArkManager/extension
tsc -p ./
vsce package
```

## 🔍 Ellenőrzés

**Ellenőrizd, hogy minden rendben van-e:**

```bash
# TypeScript ellenőrzés
which tsc
tsc --version

# vsce ellenőrzés
which vsce
vsce --version

# Node modules ellenőrzés
ls -la node_modules/.bin/tsc
ls -la node_modules/.bin/vsce
```

## ✅ Sikeres után

**Várható kimenet:**
```
✅ Compilation successful
✅ Packaging successful
📦 VSIX file created: zedinark-manager-1.0.0.vsix
```

## 🚀 Telepítés

1. **Töltsd le a VSIX-et** a szerverről
2. **Telepítsd** VS Code/Cursor-ba
3. **Újraindítás**
4. **Kattints** a bal oldali Activity Bar "ZedinArk AI" ikonjára

## 📚 További segítség

- **Permission hiba**: `docs/FIX_PERMISSIONS.md`
- **Sidebar setup**: `docs/SIDEBAR_SETUP.md`
- **Sidebar fix**: `docs/SIDEBAR_FIX.md`

---

**Most már biztosan működnie kellene! 🚀**

