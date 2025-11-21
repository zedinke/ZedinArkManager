# 🚀 Sidebar Chat telepítés és használat

## ✅ VSIX sikeresen létrejött!

```
✅ Packaged: zedinark-manager-1.0.0.vsix (332 files, 516.07 KB)
```

## 📥 Telepítés

### 1. VSIX letöltése a szerverről

**SCP-vel (lokális gépedről):**
```bash
scp ai_developer@135.181.165.27:~/ZedinArkManager/extension/zedinark-manager-1.0.0.vsix ./
```

**Vagy VS Code Remote SSH-val:**
1. Kapcsolódj a szerverhez: `Ctrl+Shift+P` → `Remote-SSH: Connect to Host`
2. Nyisd meg az `extension` mappát
3. Jobb klikk a `zedinark-manager-1.0.0.vsix` fájlra → `Download...`

### 2. Extension telepítése

**VS Code-ban vagy Cursor-ban:**

1. **Töröld a régi extension-t** (ha van):
   - `Ctrl+Shift+X` → Keresés: `ZedinArk Manager` → Uninstall
   - Újraindítás

2. **Telepítsd az új VSIX-et**:
   - `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
   - Válaszd ki a `zedinark-manager-1.0.0.vsix` fájlt
   - Újraindítás

### 3. Sidebar Chat megnyitása

**Módszer 1: Activity Bar**
- Kattints a bal oldali Activity Bar **"ZedinArk AI"** ikonjára

**Módszer 2: Command Palette**
- `Ctrl+Shift+P` → `View: Show ZedinArk AI`

## 🎯 Használat

### Módok váltása

A sidebar chat tetején 3 gomb van:

1. **🤖 Agent** - Teljes autonómia, fájlok létrehozása/törlése/módosítása
2. **💬 Ask** - Kérdés-válasz mód
3. **✏️ Edit** - Aktív fájl szerkesztése

### Fájl/kép feltöltés

- **📄 Fájl**: Kattints a "Fájl" gombra és válaszd ki a fájlt
- **🖼️ Kép**: Kattints a "Kép" gombra és válaszd ki a képet

### Üzenet küldése

1. Írd be az üzeneted az input mezőbe
2. Nyomj **Enter**-t (vagy `Shift+Enter` új sorhoz)
3. Várd meg az AI válaszát

## 🔧 Git Pull hiba javítása

Ha a következő `git pull` során hibát kapsz a `node_modules`-szal:

```bash
cd ~/ZedinArkManager/extension
rm -rf node_modules
git pull origin main
npm install
npm run compile
npm run package
```

## ✅ Ellenőrzés

**Sidebar Chat megnyitása után:**

1. ✅ Látod a 3 mód gombot (Agent, Ask, Edit)
2. ✅ Látod a fájl/kép feltöltés gombokat
3. ✅ Látod az input mezőt
4. ✅ Működik az üzenet küldés

**Tesztelés:**

1. Válaszd az **Ask** módot
2. Írj be: "Hi"
3. Várható válasz: "Hello! How can I help you today?"

## 📚 További információ

- **Teljes funkciók**: `docs/SIDEBAR_CHAT_FEATURES.md`
- **Git pull hiba**: `docs/FIX_GIT_PULL.md`
- **Chat Panel**: `docs/CHAT_PANEL.md`

---

**Most már működnie kellene! 🚀**

