# 🔧 View Provider Troubleshooting - Részletes útmutató

## ❌ Probléma

**Hibaüzenet:**
```
There is no data provider registered that can provide view data.
```

## 🔍 Részletes debug lépések

### 1. Developer Console megnyitása

**VS Code-ban:**
- `Ctrl+Shift+P` → `Developer: Toggle Developer Tools`
- Vagy: `Help` → `Toggle Developer Tools`
- **Console** tab megnyitása

### 2. Extension aktiválás ellenőrzése

**Console-ban keresd:**

```
ZedinArk Manager extension is now active!
Registering sidebar view provider...
View ID: zedinarkChatView
Provider: [object Object]
Sidebar view provider registered successfully: zedinarkChatView
```

**Ha ezek hiányoznak:**
- Az extension nem aktiválódott
- Próbáld: `Ctrl+Shift+P` → `Developer: Reload Window`

### 3. View megnyitás ellenőrzése

**Amikor megnyitod a sidebar chat-et, keresd:**

```
SidebarChatViewProvider.resolveWebviewView called!
WebviewView: [object Object]
View ID: zedinarkChatView
```

**Ha ez hiányzik:**
- A `resolveWebviewView` nem hívódik meg
- Lehet, hogy a view ID nem egyezik meg

### 4. Extension verzió ellenőrzése

**Extensions panel:**
- `Ctrl+Shift+X`
- Keresés: `ZedinArk Manager`
- Nézd meg a verziószámot
- **Fontos**: Ellenőrizd, hogy a legújabb verzió van-e telepítve

### 5. Teljes újratelepítés

**Ha semmi sem működik:**

```bash
# VS Code-ban
1. Ctrl+Shift+X → ZedinArk Manager → Uninstall
2. Újraindítás (teljes VS Code bezárása)
3. Ctrl+Shift+P → Extensions: Install from VSIX...
4. Válaszd ki a legújabb VSIX fájlt
5. Újraindítás
6. Developer Console megnyitása
7. Nézd meg a logokat
```

### 6. View ID manuális ellenőrzés

**Developer Console-ban futtasd:**

```javascript
// Extension ellenőrzés
const ext = vscode.extensions.getExtension('zedinark.zedinark-manager');
console.log('Extension:', ext);
console.log('Is active:', ext?.isActive);
console.log('Package JSON:', ext?.packageJSON);

// View ID ellenőrzés
console.log('View ID should be: zedinarkChatView');
```

### 7. View manuális megnyitása

**Command Palette:**
- `Ctrl+Shift+P` → `View: Show ZedinArk AI`
- Vagy próbáld: `View: Show Chat`

## 🔧 Lehetséges problémák és megoldások

### Probléma 1: Extension nem aktiválódik

**Megoldás:**
- `activationEvents` legyen `["*"]` a `package.json`-ban
- Újraindítás

### Probléma 2: View ID nem egyezik

**Ellenőrzés:**
- `package.json` → `views.zedinark[0].id` = `"zedinarkChatView"`
- `extension.ts` → `registerWebviewViewProvider('zedinarkChatView', ...)`
- `sidebarChatView.ts` → `viewType = 'zedinarkChatView'`

**Mindháromnak egyeznie kell!**

### Probléma 3: View container nem létezik

**Ellenőrzés:**
- `package.json` → `viewsContainers.activitybar[0].id` = `"zedinark"`
- `package.json` → `views.zedinark` létezik

### Probléma 4: Extension nem töltődik be

**Megoldás:**
- Ellenőrizd, hogy a `main` fájl létezik: `"./out/extension.js"`
- Ellenőrizd, hogy a `out/extension.js` létezik a VSIX-ben
- Újrafordítás: `npm run compile`

## 📋 Checklist

Mielőtt jelentesz problémát, ellenőrizd:

- [ ] Extension telepítve van
- [ ] Legújabb verzió telepítve
- [ ] Developer Console-ban látod: "ZedinArk Manager extension is now active!"
- [ ] Developer Console-ban látod: "Sidebar view provider registered successfully"
- [ ] View ID egyezik mindhárom helyen
- [ ] View container létezik
- [ ] `out/extension.js` létezik és friss
- [ ] VS Code újraindítva

## 🚀 Frissített telepítés

**Szerveren:**

```bash
cd ~/ZedinArkManager/extension
git pull origin main
npm run compile
npm run package
```

**VS Code-ban:**

1. **Töröld** a régi extension-t
2. **Telepítsd** az új VSIX-et
3. **Újraindítás**
4. **Developer Console** megnyitása
5. **Nézd meg** a logokat

## 📚 További segítség

- **Telepítés**: `docs/SIDEBAR_SETUP.md`
- **View Provider**: `docs/FIX_VIEW_PROVIDER.md`
- **Debug**: `docs/DEBUG_VIEW_PROVIDER.md`

---

**Küldd el a Developer Console teljes kimenetét, ha még mindig nem működik! 🔍**

