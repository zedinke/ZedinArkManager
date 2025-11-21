# 🔧 Git Pull Hiba Javítása

## ❌ Probléma

A git pull hibát ad, mert a `node_modules` és `.vsix` fájlok változtak:

```
error: Your local changes to the following files would be overwritten by merge:
        extension/node_modules/...
        extension/*.vsix
```

## ✅ Megoldás

Ezek a fájlok nem kellenek a git-be, mert automatikusan generálódnak.

### Opció 1: Automatikus script (AJÁNLOTT)

A szerveren futtasd:

```bash
cd ~/ZedinArkManager/extension
chmod +x fix_git_ignore.sh
./fix_git_ignore.sh
git commit -m "chore: Remove node_modules and .vsix from git tracking"
git pull origin main
```

### Opció 2: Manuális lépések

1. **Stash a változásokat:**
   ```bash
   cd ~/ZedinArkManager
   git stash
   ```

2. **Pull:**
   ```bash
   git pull origin main
   ```

3. **Töröld a node_modules-et és VSIX-et (ha szükséges):**
   ```bash
   cd extension
   rm -rf node_modules
   rm -f *.vsix
   npm install
   ```

### Opció 3: Git restore (ha a fájlok még nem committedek)

```bash
cd ~/ZedinArkManager
git restore extension/node_modules/
git restore extension/*.vsix
git restore extension/package-lock.json
git pull origin main
```

## 🎯 Legegyszerűbb megoldás

A szerveren futtasd ezeket a parancsokat:

```bash
cd ~/ZedinArkManager

# Stash a változásokat
git stash

# Pull az új kódot
git pull origin main

# Ha szükséges, töröld és újra telepítsd a node_modules-et
cd extension
rm -rf node_modules package-lock.json
npm install
```

## 💡 Előre megelőzés

A `.gitignore` már tartalmazza ezeket a fájlokat, szóval a jövőben nem kerülnek be a git-be. Ez az egyszeri hiba a régi állapotból maradt.

---

**Most már működnie kellene a git pull! 🚀**

