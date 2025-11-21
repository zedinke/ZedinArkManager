# 🔧 Sérült node_modules javítása

## ❌ Probléma

**Hibaüzenet:**
```
Error: Cannot find module '../lib/tsc.js'
Error: Cannot find module './out/main'
```

**Ok**: A `node_modules` sérült vagy hiányos. A TypeScript és vsce modulok nem találják a szükséges fájlokat.

## ✅ Megoldás: Teljes újratelepítés

### 1. Automatikus rebuild (ajánlott)

**Futtasd a frissített rebuild scriptet:**
```bash
cd ~/ZedinArkManager/extension
git pull origin main
chmod +x rebuild.sh
./rebuild.sh
```

### 2. Manuális teljes újratelepítés

**Ha a script nem működik, csináld manuálisan:**

```bash
cd ~/ZedinArkManager/extension

# 1. Töröld MINDENT
rm -rf node_modules
rm -rf out
rm -f *.vsix
rm -f package-lock.json

# 2. Tisztítsd az npm cache-t
npm cache clean --force

# 3. Telepítsd újra (legacy-peer-deps használata)
npm install --legacy-peer-deps

# 4. Ellenőrizd a kritikus modulokat
ls -la node_modules/typescript/lib/tsc.js
ls -la node_modules/@vscode/vsce/out/main.js

# Ha hiányoznak, telepítsd újra
npm install typescript @vscode/vsce --save-dev --legacy-peer-deps

# 5. Javítsd a jogosultságokat
chmod +x node_modules/.bin/*

# 6. Fordítsd le
node_modules/.bin/tsc -p ./ || npx tsc -p ./

# 7. Csomagold
node_modules/.bin/vsce package || npx @vscode/vsce package
```

### 3. Node.js verzió ellenőrzés

**Lehet, hogy a Node.js verzió túl új (v24.11.1):**

```bash
# Ellenőrizd a Node.js verziót
node --version

# Ha v24+, próbáld meg egy stabilabb verzióval (v18 vagy v20)
# Használj nvm-et verzióváltáshoz:
nvm install 20
nvm use 20
npm install --legacy-peer-deps
```

### 4. Globális telepítés (utolsó megoldás)

**Ha még mindig nem működik:**

```bash
# Globális telepítés
npm install -g typescript@latest @vscode/vsce@latest

# Most már működnie kellene
cd ~/ZedinArkManager/extension
tsc -p ./
vsce package
```

## 🔍 Ellenőrzés

**Ellenőrizd, hogy minden modul megfelelően települt-e:**

```bash
# TypeScript ellenőrzés
ls -la node_modules/typescript/lib/tsc.js
ls -la node_modules/typescript/lib/typescript.js

# vsce ellenőrzés
ls -la node_modules/@vscode/vsce/out/main.js

# Bináris fájlok ellenőrzése
ls -la node_modules/.bin/tsc
ls -la node_modules/.bin/vsce
```

## ✅ Sikeres után

**Várható kimenet:**
```
✅ TypeScript lib directory exists
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
- **Rebuild**: `docs/REBUILD_EXTENSION.md`
- **Sidebar setup**: `docs/SIDEBAR_SETUP.md`

---

**Most már biztosan működnie kellene! 🚀**

