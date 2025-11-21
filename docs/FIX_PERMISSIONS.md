# 🔧 Permission denied hiba javítása

## ❌ Probléma

**Hibaüzenet:**
```
sh: 1: tsc: Permission denied
sh: 1: vsce: Permission denied
```

**Ok**: A `node_modules/.bin` mappában lévő bináris fájlok nem rendelkeznek végrehajtási jogosultsággal.

## ✅ Megoldás

### 1. Gyors javítás (ajánlott)

**Futtasd ezt a scriptet:**
```bash
cd ~/ZedinArkManager/extension
chmod +x node_modules/.bin/*
npm run compile
npm run package
```

### 2. Automatikus javítás scripttel

**A projekt tartalmaz egy fix scriptet:**
```bash
cd ~/ZedinArkManager/extension
chmod +x fix_permissions.sh
./fix_permissions.sh
npm run compile
npm run package
```

### 3. Manuális javítás

**Ha a fenti nem működik:**
```bash
cd ~/ZedinArkManager/extension

# Töröld a node_modules-t
rm -rf node_modules

# Telepítsd újra
npm install

# Javítsd a jogosultságokat
chmod +x node_modules/.bin/*

# Fordítsd le és csomagold
npm run compile
npm run package
```

### 4. Alternatív: npx használata

**Ha még mindig nem működik, használd az npx-t közvetlenül:**
```bash
cd ~/ZedinArkManager/extension

# TypeScript compile
npx tsc -p ./

# Package
npx @vscode/vsce package
```

## 🔍 Ellenőrzés

**Ellenőrizd a jogosultságokat:**
```bash
ls -la node_modules/.bin/tsc
ls -la node_modules/.bin/vsce
```

**Várható kimenet:**
```
-rwxr-xr-x 1 user user ... tsc
-rwxr-xr-x 1 user user ... vsce
```

Az `x` betűk jelzik, hogy végrehajtható.

## ✅ Sikeres után

Ha minden rendben van:
```
✅ Compiled successfully
✅ Packaged: zedinark-manager-1.0.0.vsix
```

## 🚀 Telepítés

1. **Töltsd le a VSIX-et** a szerverről
2. **Telepítsd** VS Code/Cursor-ba
3. **Újraindítás**
4. **Kattints** a bal oldali Activity Bar "ZedinArk AI" ikonjára

---

**Most már működnie kellene! 🚀**

