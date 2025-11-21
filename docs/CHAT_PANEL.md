# 💬 Chat Panel használata

## 🚀 Chat ablak megnyitása

### Parancs

**VS Code-ban vagy Cursor-ban:**

1. `Ctrl+Shift+P` (vagy `Cmd+Shift+P` macOS-en)
2. Írd be: `ZedinArk: Open Chat Panel`
3. Enter

**Vagy gyorsbillentyű (ha be van állítva):**

- Alapértelmezetten nincs gyorsbillentyű, de beállíthatod a `keybindings.json`-ban

### Chat ablak funkciók

✅ **Dedikált chat ablak** - Külön panel a beszélgetéshez
✅ **Üzenetek megjelenítése** - Te és az AI üzenetei külön stílusban
✅ **Valós idejű válasz** - Az AI válasza azonnal megjelenik
✅ **Enter billentyű** - Gyors küldés Enter-rel
✅ **Loading indikátor** - Várható válasz jelzése
✅ **Hibakezelés** - Hibák esetén értesítés

## 💻 Használat

### 1. Chat ablak megnyitása

```
Ctrl+Shift+P → "ZedinArk: Open Chat Panel"
```

### 2. Üzenet küldése

1. Írd be az üzeneted az input mezőbe
2. Nyomj **Enter**-t vagy kattints a **Küldés** gombra
3. Várd meg az AI válaszát

### 3. Többszöri használat

- A chat ablak megmarad, amíg be nem zárod
- Az üzenetek megmaradnak a beszélgetés során
- Újra megnyithatod ugyanazzal a parancssal

## 🎨 UI funkciók

### Üzenetek

- **Te**: Jobbra igazított, sötét háttér
- **AI**: Balra igazított, világos háttér
- **Loading**: "AI válaszol..." üzenet válasz közben

### Input mező

- **Enter**: Üzenet küldése
- **Disabled**: Válasz várakozása közben
- **Auto-focus**: Válasz után automatikusan fókuszban

## 🔧 Beállítások

### API konfiguráció

A chat panel ugyanazokat a beállításokat használja, mint a többi parancs:

```json
{
  "zedinark.apiUrl": "http://135.181.165.27:8000",
  "zedinark.apiKey": "your-api-key-here",
  "zedinark.model": "phi3:mini"
}
```

### Gyorsbillentyű beállítása

**`keybindings.json`:**

```json
{
  "command": "zedinark.chatPanel",
  "key": "ctrl+shift+c",
  "when": "editorTextFocus"
}
```

## 📊 Összehasonlítás

### Chat Panel vs Chat Command

**Chat Panel** (`ZedinArk: Open Chat Panel`):
- ✅ Dedikált ablak
- ✅ Üzenetek megmaradnak
- ✅ Többszöri használat
- ✅ Jobb UX

**Chat Command** (`ZedinArk: Chat with AI`):
- ⚠️ Input box
- ⚠️ Csak egy üzenet
- ⚠️ Notification-ben jelenik meg a válasz

## ✅ Ajánlott használat

**Chat Panel használata:**
- Hosszabb beszélgetésekhez
- Többszöri kérdésekhez
- Kontextus megőrzéséhez

**Chat Command használata:**
- Gyors kérdésekhez
- Egyszeri válaszokhoz

## 🔍 Hibaelhárítás

### Chat ablak nem nyílik meg

**Ok**: Extension nem aktiválva vagy hibás konfiguráció.

**Megoldás**:
1. Ellenőrizd a Developer Console-t: `Ctrl+Shift+P` → `Developer: Toggle Developer Tools`
2. Nézd meg, vannak-e hibák
3. Próbáld újra: `Ctrl+Shift+P` → `ZedinArk: Open Chat Panel`

### Üzenetek nem jelennek meg

**Ok**: API kapcsolat probléma.

**Megoldás**:
1. Ellenőrizd az API URL-t: `Ctrl+,` → Keresés: `zedinark`
2. Teszteld a kapcsolatot: `Ctrl+Shift+P` → `ZedinArk: Connect to Server`
3. Ellenőrizd az API kulcsot (ha szükséges)

### "Loading..." nem tűnik el

**Ok**: API válasz timeout vagy hiba.

**Megoldás**:
1. Várj egy kicsit (lehet, hogy lassú a válasz)
2. Ha nem válaszol, ellenőrizd a Developer Console-t
3. Próbáld újra az üzenetet

## 📚 További információ

- **Extension telepítés**: `extension/INSTALL_GUIDE.md`
- **API konfiguráció**: `docs/CURSOR_VSCODE_CONNECTION.md`
- **Hibaelhárítás**: `extension/QUICK_FIX.md`

---

**Most már van dedikált chat ablakod! 💬**

