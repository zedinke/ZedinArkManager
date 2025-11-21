# 🔧 Git Pull hiba javítása - node_modules ütközés

## ❌ Probléma

**Hibaüzenet**: `error: The following untracked working tree files would be overwritten by merge`

**Ok**: A `node_modules` fájlok ütköznek a Git pull során, mert lokálisan vannak, de a Git megpróbálja őket felülírni.

## ✅ Megoldás

### 1. Gyors javítás (ajánlott)

**Töröld a node_modules mappát és próbáld újra:**

```bash
cd ~/ZedinArkManager/extension
rm -rf node_modules
git pull origin main
npm install
npm run compile
npm run package
```

### 2. Teljes reset (ha a fenti nem működik)

```bash
cd ~/ZedinArkManager/extension

# Mentsd el a VSIX fájlt (ha már létrejött)
cp zedinark-manager-1.0.0.vsix ~/

# Töröld a node_modules-t
rm -rf node_modules

# Git reset
git reset --hard origin/main

# Telepítsd újra a függőségeket
npm install

# Fordítsd le és csomagold
npm run compile
npm run package
```

### 3. Stash használata

```bash
cd ~/ZedinArkManager/extension

# Stash a lokális változásokat
git stash

# Pull
git pull origin main

# Stash visszaállítása (ha szükséges)
git stash pop

# Telepítsd a függőségeket
npm install
npm run compile
npm run package
```

## 🔍 Miért történt?

A `node_modules` mappa **nem kellene** a Git repóban legyen, mert:
- ✅ Nagy fájlok (több száz MB)
- ✅ Platform-specifikus
- ✅ Automatikusan generálható (`npm install`)

A `.gitignore` fájl most már kizárja a `node_modules`-t.

## ✅ Javítás után

A következő `git pull` már nem fog hibát adni, mert a `node_modules` ki van zárva.

## 📊 VSIX állapot

**Jó hír**: A VSIX sikeresen létrejött! 🎉

```
✅ Packaged: zedinark-manager-1.0.0.vsix (332 files, 516.07 KB)
```

**Most már telepítheted a VS Code-ba vagy Cursor-ba!**

## 🚀 Telepítés

1. **Töltsd le a VSIX fájlt** a szerverről
2. **VS Code/Cursor**: `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
3. **Válaszd ki** a `zedinark-manager-1.0.0.vsix` fájlt
4. **Újraindítás**
5. **Kattints** a bal oldali Activity Bar "ZedinArk AI" ikonjára

---

**Most már működnie kellene! 🚀**

