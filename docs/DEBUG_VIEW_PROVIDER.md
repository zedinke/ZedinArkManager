# 🔍 View Provider Debug útmutató

## ❌ Probléma

**Hibaüzenet:**
```
There is no data provider registered that can provide view data.
```

## 🔍 Debug lépések

### 1. Developer Console megnyitása

**VS Code-ban:**
- `Ctrl+Shift+P` → `Developer: Toggle Developer Tools`
- Vagy: `Help` → `Toggle Developer Tools`

### 2. Console logok ellenőrzése

**Keresd ezeket a logokat:**

```
ZedinArk Manager extension is now active!
Registering sidebar view provider...
Sidebar view provider registered: zedinarkChatView
SidebarChatViewProvider.resolveWebviewView called!
```

**Ha hiányoznak:**
- Az extension nem aktiválódott
- Próbáld meg újraindítani VS Code-ot

**Ha csak az első kettő van:**
- A view provider regisztrálva van, de a `resolveWebviewView` nem hívódik meg
- Próbáld meg bezárni és újra megnyitni a sidebar chat-et

### 3. Extension újraindítása

**Command Palette:**
- `Ctrl+Shift+P` → `Developer: Reload Window`

**Vagy:**
- Zárj be és nyisd meg újra VS Code-ot

### 4. Extension verzió ellenőrzése

**Extensions panel:**
- `Ctrl+Shift+X`
- Keresés: `ZedinArk Manager`
- Nézd meg a verziószámot
- Ellenőrizd, hogy az legújabb verzió van-e telepítve

### 5. View ID ellenőrzés

**Developer Console-ban:**

```javascript
// Futtasd ezt a konzolban
vscode.extensions.getExtension('zedinark.zedinark-manager')
```

**Vagy:**

```javascript
// Nézd meg a regisztrált view provider-eket
console.log('Registered views:', vscode.workspace.getConfiguration('workbench').get('views'));
```

## ✅ Javítási lépések

### 1. Teljes újratelepítés

```bash
# VS Code-ban
1. Ctrl+Shift+X → ZedinArk Manager → Uninstall
2. Újraindítás
3. Ctrl+Shift+P → Extensions: Install from VSIX...
4. Válaszd ki a legújabb VSIX fájlt
5. Újraindítás
```

### 2. Extension újraaktiválás

**Developer Console-ban:**

```javascript
// Extension újraaktiválása
vscode.commands.executeCommand('workbench.action.reloadWindow');
```

### 3. View manuális megnyitása

**Command Palette:**
- `Ctrl+Shift+P` → `View: Show ZedinArk AI`
- Vagy: `View: Show Chat` (ha van ilyen)

## 🔧 További hibakeresés

### Extension aktiválás ellenőrzése

**Developer Console-ban:**

```javascript
// Extension státusz
const ext = vscode.extensions.getExtension('zedinark.zedinark-manager');
console.log('Extension:', ext);
console.log('Is active:', ext?.isActive);
console.log('Exports:', ext?.exports);
```

### View provider regisztráció ellenőrzése

**Developer Console-ban:**

```javascript
// Nézd meg a console logokat
// Keresd: "Registering sidebar view provider"
// Keresd: "Sidebar view provider registered"
```

## 📚 További segítség

- **Telepítés**: `docs/SIDEBAR_SETUP.md`
- **View Provider**: `docs/FIX_VIEW_PROVIDER.md`
- **Auto Update**: `docs/AUTO_UPDATE.md`

---

**Ha még mindig nem működik, küldd el a Developer Console logokat! 🔍**

