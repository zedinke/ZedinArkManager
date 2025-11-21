# 🔧 Extension hibaelhárítás - "command not found" hiba

## ❌ Probléma

**Hibaüzenet**: `command 'zedinark.chat' not found`

**Ok**: Az extension nem aktiválódott megfelelően, vagy az activation events hiányosak.

## ✅ Megoldás

### 1. Új VSIX generálása

Az `activationEvents` frissítve lett, hogy az extension automatikusan aktiválódjon indításkor.

**Szerveren:**

```bash
cd ~/ZedinArkManager/extension
git pull origin main  # Frissítsd a kódot
npm run compile       # Fordítsd le újra
npm run package      # Generáld az új VSIX-et
```

### 2. Régi extension eltávolítása

**VS Code-ban vagy Cursor-ban:**

1. `Ctrl+Shift+X` (Extensions panel)
2. Keresés: `ZedinArk Manager`
3. Kattints az "Uninstall" gombra
4. Újraindítás

### 3. Új VSIX telepítése

1. `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
2. Válaszd ki az új `zedinark-manager-1.0.0.vsix` fájlt
3. Újraindítás

### 4. Ellenőrzés

**Developer Console megnyitása:**

1. `Ctrl+Shift+P` → `Developer: Toggle Developer Tools`
2. Nézd meg a Console tab-ot
3. Keresd: `ZedinArk Manager extension is now active!`

**Ha látod ezt az üzenetet, akkor az extension aktiválva van!**

## 🔍 További hibaelhárítás

### Extension nem töltődik be

**Ok**: A VSIX fájl sérült vagy nem kompatibilis.

**Megoldás**:
1. Töröld a régi extension-t
2. Generálj új VSIX-et:
```bash
cd extension
rm -rf node_modules out
npm install
npm run compile
npm run package
```

### Parancsok nem jelennek meg

**Ok**: Az extension nem aktiválódott.

**Megoldás**:
1. Ellenőrizd a Developer Console-t (lásd fent)
2. Ha nincs "extension is now active" üzenet, akkor:
   - Újraindítás
   - Extension újratelepítés

### "Cannot find module" hiba

**Ok**: Hiányzó függőségek vagy hibás fordítás.

**Megoldás**:
```bash
cd extension
rm -rf node_modules out
npm install
npm run compile
```

### Extension aktiválódik, de parancsok nem működnek

**Ok**: API kapcsolat probléma vagy rossz konfiguráció.

**Megoldás**:
1. Ellenőrizd a konfigurációt:
   - `Ctrl+,` → Keresés: `zedinark`
   - API URL: `http://135.181.165.27:8000`
   - API Key: (ha szükséges)

2. Teszteld a kapcsolatot:
   ```bash
   curl http://135.181.165.27:8000/health
   ```

## 📊 Aktiválási módok

### Előtte (rossz):
```json
"activationEvents": [
  "onCommand:zedinark.connect",
  "onCommand:zedinark.chat",
  "onCommand:zedinark.generate"
]
```

**Probléma**: Csak ezek a parancsok aktiválják az extension-t. Az `explain` és `refactor` parancsok nem működnek.

### Utána (jó):
```json
"activationEvents": [
  "onStartupFinished"
]
```

**Előny**: Az extension automatikusan aktiválódik indításkor, minden parancs működik.

## ✅ Ellenőrzési lista

- [ ] Extension telepítve van
- [ ] Újraindítás után aktiválva van
- [ ] Developer Console-ban látod: "extension is now active"
- [ ] Konfiguráció beállítva (API URL, API Key)
- [ ] API szerver elérhető (`/health` endpoint)
- [ ] Parancsok megjelennek a Command Palette-ben

## 🚀 Gyors javítás

Ha minden parancs hibát ad:

1. **Töröld az extension-t**
2. **Generálj új VSIX-et** (szerveren)
3. **Telepítsd újra** (VS Code/Cursor)
4. **Újraindítás**
5. **Teszteld**: `Ctrl+Shift+P` → `ZedinArk: Connect to Server`

## 📚 További segítség

- **Részletes telepítési útmutató**: `docs/CURSOR_VSCODE_CONNECTION.md`
- **VSIX telepítési útmutató**: `docs/VSIX_INSTALL.md`
- **Extension README**: `extension/README.md`

---

**Most már működnie kellene! 🚀**

