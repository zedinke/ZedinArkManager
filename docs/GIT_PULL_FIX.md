# 🔧 Git pull hiba megoldása

## ❌ Probléma

Ha helyi változások vannak, a `git pull` nem fog működni:

```
error: Your local changes to the following files would be overwritten by merge:
        test_api.sh
Please commit your changes or stash them before you merge.
```

## ✅ Gyors megoldás

### Option 1: Helyi változások elvetése (ajánlott)

**Ha nem kell a helyi változás, egyszerűen elvetjük:**
```bash
# Helyi változások elvetése
git checkout -- test_api.sh

# Frissítés
git pull origin main

# Kész!
```

**Vagy egyszerre:**
```bash
git checkout -- test_api.sh && git pull origin main
```

### Option 2: Stash (ha meg szeretnéd tartani a változásokat)

**Elmentjük a helyi változásokat, majd pull:**
```bash
# Helyi változások elmentése
git stash

# Frissítés
git pull origin main

# Ha később vissza szeretnéd állítani:
# git stash pop
```

### Option 3: Commit (ha meg szeretnéd tartani a változásokat)

**Ha meg szeretnéd tartani a helyi változásokat:**
```bash
# Helyi változások commitolása
git add test_api.sh
git commit -m "fix: Local changes to test_api.sh"

# Frissítés (merge lesz)
git pull origin main

# Ha ütközés van, oldd meg:
# git mergetool
```

## 🚀 Most (test_api.sh)

**A leggyorsabb megoldás:**
```bash
# 1. Helyi változások elvetése
git checkout -- test_api.sh

# 2. Frissítés
git pull origin main

# 3. Teszt
chmod +x test_api.sh
./test_api.sh
```

**Vagy egyszerre:**
```bash
git checkout -- test_api.sh && git pull origin main && chmod +x test_api.sh
```

---

**Most már működnie kell! ✅**
