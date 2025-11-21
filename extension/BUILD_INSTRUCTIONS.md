# 🔨 Extension build útmutató

## ✅ Helyes build lépések

### 1. Tiszta build

```bash
cd ~/ZedinArkManager/extension

# Töröld a régi build fájlokat
rm -rf out node_modules

# Telepítsd az ÖSSZES függőséget (dev + production)
npm install

# Fordítsd le a TypeScript-et
npm run compile

# Generáld a VSIX-et
npm run package
```

### 2. Ellenőrzés

**VSIX tartalom ellenőrzése:**

```bash
# VSIX kibontása (opcionális)
unzip -q zedinark-manager-1.0.0.vsix -d vsix_extracted

# Ellenőrizd, hogy az axios benne van-e
ls -la vsix_extracted/extension/node_modules/ | grep axios

# Tisztítás
rm -rf vsix_extracted
```

**Várható kimenet:**
```
axios
```

## ❌ Ne csináld ezt!

**ROSSZ:**
```bash
npm install --production  # Ez eltávolítja a dev dependencies-eket, de a vsce-nek szüksége van rájuk!
```

**JÓ:**
```bash
npm install  # Telepítsd az ÖSSZES függőséget
```

## 🔍 Miért?

- A `vsce` (VS Code Extension packaging tool) **dev dependency**
- A `vsce`-nek szüksége van a `linkify-it` és `markdown-it` modulokra
- A `.vscodeignore` automatikusan kizárja a dev dependencies-eket a VSIX-ből
- De az `axios` (production dependency) **bekerül** a VSIX-be

## 📊 VSIX tartalom

**Bekerül a VSIX-be:**
- ✅ `out/` - Fordított JavaScript fájlok
- ✅ `node_modules/axios/` - Production dependency
- ✅ `package.json` - Extension metadata

**KIZÁRVA a VSIX-ből:**
- ❌ `src/` - TypeScript forrás fájlok
- ❌ `node_modules/@types/` - TypeScript típusok
- ❌ `node_modules/typescript/` - TypeScript compiler
- ❌ `node_modules/@vscode/` - VS Code dev tools
- ❌ `node_modules/linkify-it/` - Dev dependency (vsce-hez)

## ✅ Végleges build parancs

```bash
cd ~/ZedinArkManager/extension
rm -rf out node_modules
npm install
npm run compile
npm run package
```

**Ez mindig működik! 🚀**

