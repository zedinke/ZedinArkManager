# 🔧 View Provider hiba javítása

## ❌ Probléma

**Hibaüzenet:**
```
There is no data provider registered that can provide view data.
```

**Ok**: A view provider nem lett megfelelően regisztrálva vagy az activation event rossz.

## ✅ Javítás

### 1. Activation Event javítása

Az `activationEvents`-ben a view ID-t helyesen kell megadni:

**Előtte:**
```json
"activationEvents": [
  "onView:zedinark.zedinarkChatView"
]
```

**Utána:**
```json
"activationEvents": [
  "onStartupFinished",
  "onView:zedinarkChatView"
]
```

### 2. View Provider regisztráció javítása

Az `extension.ts`-ben explicit view ID-t használjunk:

**Előtte:**
```typescript
vscode.window.registerWebviewViewProvider(
    SidebarChatViewProvider.viewType,
    sidebarProvider
)
```

**Utána:**
```typescript
const providerRegistration = vscode.window.registerWebviewViewProvider(
    'zedinarkChatView',
    sidebarProvider,
    {
        webviewOptions: {
            retainContextWhenHidden: true
        }
    }
);
context.subscriptions.push(providerRegistration);
```

## 🚀 Frissítés

**Szerveren:**

```bash
cd ~/ZedinArkManager/extension
git pull origin main
npm run compile
npm run package
```

**VS Code-ban:**

1. **Töröld a régi extension-t**
2. **Telepítsd az új VSIX-et**
3. **Újraindítás**
4. **Developer Console ellenőrzés**:
   - `Ctrl+Shift+P` → `Developer: Toggle Developer Tools`
   - Console tab → Nézd meg, hogy vannak-e hibák

## 🔍 Ellenőrzés

**Developer Console-ban keresd:**
- `ZedinArk Manager extension is now active!` - extension aktiválva
- Nincs `registerWebviewViewProvider` hiba
- A view ID (`zedinarkChatView`) megegyezik a `package.json`-ban lévővel

## ✅ Sikeres után

A sidebar chat panelnek meg kell jelennie és működnie kellene.

---

**Most már biztosan működnie kellene! 🚀**

