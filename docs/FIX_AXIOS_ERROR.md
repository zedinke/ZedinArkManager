# 🔧 "Cannot find module 'axios'" hiba javítása

## ❌ Probléma

**Hibaüzenet**: `Activating extension 'zedinke.zedinark-manager' failed: Cannot find module 'axios'`

**Ok**: Az `axios` függőség nem került be a VSIX fájlba, mert a `.vscodeignore` kizárta a `node_modules` mappát.

## ✅ Megoldás

### 1. Frissítsd a kódot

**Szerveren (SSH-n keresztül):**

```bash
cd ~/ZedinArkManager/extension
git pull origin main
```

### 2. Töröld a régi build fájlokat

```bash
rm -rf out node_modules
```

### 3. Telepítsd a függőségeket újra

```bash
npm install
```

### 4. Generáld az új VSIX-et

```bash
npm run compile
npm run package
```

**Most már az `axios` benne lesz a VSIX-ben!**

### 5. Telepítsd az új VSIX-et

**VS Code-ban vagy Cursor-ban:**

1. **Töröld a régi extension-t:**
   - `Ctrl+Shift+X` → Keresés: `ZedinArk Manager` → Uninstall
   - Újraindítás

2. **Telepítsd az új VSIX-et:**
   - `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
   - Válaszd ki az új `zedinark-manager-1.0.0.vsix` fájlt
   - Újraindítás

### 6. Ellenőrzés

**Developer Console:**

1. `Ctrl+Shift+P` → `Developer: Toggle Developer Tools`
2. **Console** tab
3. Keresd: `ZedinArk Manager extension is now active!`

**Ha látod ezt az üzenetet és NINCS "Cannot find module" hiba, akkor működik!**

## 🔍 Mi változott?

### Előtte (rossz):

**`.vscodeignore`:**
```
node_modules/**
```

**Probléma**: Az összes `node_modules` ki lett zárva, így az `axios` sem került be.

### Utána (jó):

**`.vscodeignore`:**
```
# Include node_modules for production dependencies (axios)
node_modules/@types/**
node_modules/.bin/**
node_modules/typescript/**
node_modules/@vscode/**
```

**Előny**: Most már csak a dev dependencies-ek vannak kizárva, az `axios` (production dependency) bekerül.

**`package.json` scripts:**
```json
"vscode:prepublish": "npm run compile && npm install --production",
"package": "npx @vscode/vsce package --no-yarn"
```

**Előny**: A `--production` flag biztosítja, hogy csak a production dependencies-ek kerüljenek be.

## 📊 VSIX tartalom ellenőrzése

**Ellenőrizd, hogy az `axios` benne van-e:**

```bash
# VSIX fájl kibontása (opcionális)
unzip -l zedinark-manager-1.0.0.vsix | grep axios
```

**Várható kimenet:**
```
node_modules/axios/...
```

## ✅ Várható eredmény

**Sikeres aktiválás után:**

1. ✅ Developer Console-ban: `ZedinArk Manager extension is now active!`
2. ✅ NINCS "Cannot find module 'axios'" hiba
3. ✅ Command Palette-ben: `ZedinArk: Chat with AI` működik
4. ✅ Command Palette-ben: `ZedinArk: Connect to Server` működik

## 🔧 További hibaelhárítás

### Ha még mindig "Cannot find module" hiba van

**1. Ellenőrizd a VSIX tartalmát:**

```bash
# VSIX kibontása
unzip -q zedinark-manager-1.0.0.vsix -d vsix_extracted
ls -la vsix_extracted/extension/node_modules/ | grep axios
```

**Ha nincs `axios` mappa, akkor:**
- Töröld a `node_modules` mappát
- Futtasd újra: `npm install && npm run compile && npm run package`

**2. Ellenőrizd a package.json-t:**

```bash
cat package.json | grep -A 2 dependencies
```

**Várható:**
```json
"dependencies": {
  "axios": "^1.6.0"
}
```

**3. Próbáld manuálisan:**

```bash
cd extension
rm -rf out node_modules .vscode-test
npm install
npm run compile
npx @vscode/vsce package --no-yarn
```

## 📚 További információ

- **Extension telepítési útmutató**: `extension/INSTALL_GUIDE.md`
- **Hibaelhárítás**: `extension/QUICK_FIX.md`
- **VSIX telepítési útmutató**: `docs/VSIX_INSTALL.md`

---

**Most már az `axios` benne lesz a VSIX-ben! 🚀**

