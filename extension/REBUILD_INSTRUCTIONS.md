# 🔄 Extension Újraépítési Útmutató

## ✅ KRITIKUS JAVÍTÁS

A `package.json`-ban most már megvan a **kötelező** `"type": "webview"` mező a view definícióban!

## 🚀 Szerveren újraépítés

```bash
cd ~/ZedinArkManager/extension

# Git frissítés
git pull origin main

# Függőségek telepítése (ha szükséges)
npm install

# Fordítás
npm run compile

# Csomagolás
npm run package
```

Ez létrehoz egy új `zedinark-manager-*.vsix` fájlt.

## 📦 VS Code-ban telepítés

1. **Régi extension eltávolítása:**
   - VS Code-ban: `Ctrl+Shift+X` → Extensions
   - Keresd: "ZedinArk Manager"
   - Kattints az Uninstall gombra

2. **Új extension telepítése:**
   - Kattints a `...` menüre → `Install from VSIX...`
   - Válaszd ki a `zedinark-manager-*.vsix` fájlt

3. **VS Code újraindítás:**
   - `Ctrl+Shift+P` → `Developer: Reload Window`

## ✅ Ellenőrzés

1. **Activity Bar:**
   - Kattints a bal oldali Activity Bar "ZedinArk AI" ikonjára
   - A sidebar-ban meg kell jelennie a "Chat" nézetnek

2. **Developer Console:**
   - `Ctrl+Shift+P` → `Developer: Toggle Developer Tools`
   - Console fülön keresd: `SidebarChatViewProvider.resolveWebviewView called!`
   - Ha látod ezt a logot, akkor működik! ✅

3. **Ha még mindig nem működik:**
   - Ellenőrizd, hogy a `package.json`-ban van-e `"type": "webview"`
   - Ellenőrizd a Developer Console-ban a hibákat
   - Próbáld meg a `View: Reset View Locations` parancsot

## 🎯 Mi változott?

A `package.json` view definíciójában hozzáadtam a **kötelező** `"type": "webview"` mezőt:

```json
"views": {
  "zedinark": [
    {
      "type": "webview",  // ← EZ VOLT HIÁNY!
      "id": "zedinarkChatView",
      "name": "Chat",
      "when": "true"
    }
  ]
}
```

Ez **kritikus** a VS Code WebviewViewProvider működéséhez!

---

**Most már biztosan működnie kellene! 🚀**

