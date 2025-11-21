# 🔄 Extension Update Funkció

## ✅ Automatikus Frissítés Ellenőrzés

Az extension most már tartalmaz egy **Update** gombot, amivel könnyen ellenőrizheted és telepítheted a legújabb verziót!

## 🚀 Használat

### 1. Update gomb a sidebar-ban

1. Nyisd meg a **ZedinArk AI** sidebar chat-et
2. A header tetején találsz egy **🔄 Update** gombot
3. Kattints rá!

### 2. Update ellenőrzés

Az Update gomb:
- ✅ Ellenőrzi a GitHub-ról a legújabb verziót
- ✅ Összehasonlítja az aktuális verzióval
- ✅ Ha újabb van, letölti a VSIX fájlt
- ✅ Automatikusan megnyitja a telepítéshez

### 3. Telepítés

Ha újabb verzió van:

1. **"Yes, Update"** - Letölti és segít telepíteni
2. **"Download Only"** - Csak letölti, manuálisan telepíted
3. **"Cancel"** - Mégse

Telepítés után:
- A VSIX fájl a temp mappában lesz
- VS Code automatikusan megnyitja a fájl helyét
- Vagy menjetek: **Extensions → ⋮ → Install from VSIX...**

## 📋 Command Palette

Másik módszer:

1. `Ctrl+Shift+P` → `ZedinArk: Check for Updates`
2. Követd az ugyanazokat a lépéseket

## 🔧 Hogyan működik?

1. **GitHub API hívás** - Ellenőrzi a legújabb release-t
2. **Verzió összehasonlítás** - Összehasonlítja az aktuális verzióval
3. **VSIX letöltés** - Ha újabb van, letölti a VSIX fájlt
4. **Telepítés segítség** - Megnyitja a fájlt és instrukciókat ad

## ⚙️ Telepített verzió ellenőrzése

Az aktuális verziót itt találod:
- `Ctrl+Shift+X` → Extensions
- Keress rá: "ZedinArk Manager"
- Láthatod a verziószámot

## 🐛 Hibaelhárítás

### "No internet connection"

**Probléma:** Nem tud ellenőrizni

**Megoldás:**
- Ellenőrizd az internetkapcsolatot
- Ellenőrizd, hogy a GitHub elérhető-e

### "No VSIX file found"

**Probléma:** Nincs VSIX fájl a release-ben

**Megoldás:**
- Ellenőrizd a GitHub release-t, hogy van-e VSIX fájl
- Ha nincs, manuálisan csomagold és töltésd fel

### "Already using latest version"

**Probléma:** Azt mondja, hogy már a legújabb van

**Megoldás:**
- Ez normális, ha tényleg a legújabb verziót használod
- Ellenőrizd a GitHub release verzióját

## 💡 Tippek

1. **Rendszeres ellenőrzés** - Hetente ellenőrizd a frissítéseket
2. **Backup** - Mielőtt frissítesz, mentsd el a beállításaidat
3. **Changelog** - Nézd meg a GitHub release notes-t

---

**Most már könnyen frissítheted az extension-t egy gombnyomással! 🎉**

