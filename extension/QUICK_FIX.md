# 🔧 Gyors javítás - "command not found" hiba

## ❌ Probléma

A VS Code-ban vagy Cursor-ban még mindig a `command 'zedinark.chat' not found` hibát kapod.

## ✅ Megoldás

### 1. Régi extension eltávolítása

**VS Code-ban vagy Cursor-ban:**

1. `Ctrl+Shift+X` (Extensions panel megnyitása)
2. Keresés: `ZedinArk Manager`
3. Kattints az **"Uninstall"** gombra
4. **Újraindítás** (fontos!)

### 2. Új VSIX generálása (szerveren)

**SSH-n keresztül:**

```bash
cd ~/ZedinArkManager/extension

# Frissítsd a kódot
git pull origin main

# Töröld a régi build fájlokat
rm -rf out node_modules/.cache

# Telepítsd a függőségeket (ha szükséges)
npm install

# Fordítsd le újra
npm run compile

# Generáld az új VSIX-et
npm run package
```

**Ellenőrizd, hogy létrejött:**
```bash
ls -lh zedinark-manager-1.0.0.vsix
```

### 3. Új VSIX telepítése

**VS Code-ban vagy Cursor-ban:**

1. **Töltsd le** a VSIX fájlt a szerverről (SCP, SFTP, vagy VS Code Remote SSH)
2. `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
3. Válaszd ki az **új** `zedinark-manager-1.0.0.vsix` fájlt
4. **Újraindítás** (fontos!)

### 4. Ellenőrzés

**Developer Console megnyitása:**

1. `Ctrl+Shift+P` → `Developer: Toggle Developer Tools`
2. **Console** tab
3. Keresd: `ZedinArk Manager extension is now active!`

**Ha látod ezt az üzenetet, akkor az extension aktiválva van!**

**Tesztelés:**

1. `Ctrl+Shift+P` → `ZedinArk: Connect to Server`
2. Ha működik, akkor próbáld: `ZedinArk: Chat with AI`

## 🔍 További hibaelhárítás

### Ha még mindig nem működik

**1. Ellenőrizd az extension verzióját:**

- `Ctrl+Shift+X` → Keresés: `ZedinArk Manager`
- Nézd meg a verziót (kellene hogy `1.0.0` legyen)

**2. Ellenőrizd a konfigurációt:**

- `Ctrl+,` → Keresés: `zedinark`
- **API URL**: `http://135.181.165.27:8000`
- **API Key**: (a generált kulcs)
- **Model**: `phi3:mini` vagy `llama3.1:8b`

**3. Ellenőrizd a Developer Console-t:**

- `Ctrl+Shift+P` → `Developer: Toggle Developer Tools`
- **Console** tab → Nézd meg, vannak-e hibák

**4. Próbáld újra a teljes telepítést:**

```bash
# Szerveren
cd ~/ZedinArkManager/extension
rm -rf out node_modules
npm install
npm run compile
npm run package
```

## 📊 Aktiválási mód ellenőrzése

**Ellenőrizd a `package.json`-t:**

```json
"activationEvents": [
  "onStartupFinished"
]
```

**Ez kellene hogy legyen!** Ha `onCommand:...` van benne, akkor rossz verzió.

## ✅ Várható eredmény

**Sikeres aktiválás után:**

1. ✅ Developer Console-ban: `ZedinArk Manager extension is now active!`
2. ✅ Command Palette-ben: `ZedinArk: Chat with AI` működik
3. ✅ Command Palette-ben: `ZedinArk: Connect to Server` működik
4. ✅ Command Palette-ben: `ZedinArk: Generate Code` működik

---

**Ha még mindig nem működik, küldj egy képet a Developer Console-ról!**

