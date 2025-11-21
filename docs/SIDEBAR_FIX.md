# 🔧 Sidebar View javítás

## ❌ Probléma

A "View: Show ZedinArk AI" parancs nem jelent meg a Command Palette-ben, mert a view rossz container-ben volt regisztrálva.

## ✅ Javítás

A `package.json`-ban a view-t az `explorer`-ből áthelyeztem a saját `zedinark` activitybar container-be.

**Előtte:**
```json
"views": {
  "explorer": [
    {
      "id": "zedinarkChatView",
      "name": "ZedinArk AI"
    }
  ]
}
```

**Utána:**
```json
"views": {
  "zedinark": [
    {
      "id": "zedinarkChatView",
      "name": "Chat"
    }
  ]
}
```

## 🚀 Frissítés

**Szerveren:**

```bash
cd ~/ZedinArkManager/extension
git pull origin main
npm run compile
npm run package
```

**Lokális gépen:**

1. Töröld a régi extension-t
2. Telepítsd az új VSIX-et
3. Újraindítás
4. Most már látni fogod a bal oldali Activity Bar-ban a "ZedinArk AI" ikont!

## ✅ Ellenőrzés

1. **Activity Bar**: Bal oldalon megjelenik a "ZedinArk AI" ikon
2. **Kattints rá**: Megnyílik a Sidebar Chat
3. **Command Palette**: `Ctrl+Shift+P` → `View: Show ZedinArk AI` (most már működik)

---

**Most már működnie kellene! 🚀**

