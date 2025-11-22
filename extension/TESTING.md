# Extension Lokális Tesztelés

## Előfeltételek
- Node.js telepítve
- VS Code vagy Cursor telepítve
- Extension függőségek telepítve (`npm install`)

## Tesztelési Lépések

### 1. Extension Fordítása
```bash
cd extension
npm run compile
```

### 2. Extension Csomagolása
```bash
npm run package
```

Ez létrehozza a `zedinark-manager-1.0.1.vsix` fájlt.

### 3. Extension Telepítése Teszteléshez

#### VS Code-ban:
1. Nyisd meg a VS Code-ot
2. Nyomj `F5`-öt vagy menj a `Run > Start Debugging` menüpontra
3. Ez egy új "Extension Development Host" ablakot nyit meg
4. Az új ablakban nyisd meg a sidebar-t és keresd meg a "ZedinArk AI" ikont

#### Vagy telepítsd a VSIX fájlt:
1. VS Code-ban: `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
2. Válaszd ki a `zedinark-manager-1.0.1.vsix` fájlt

### 4. Developer Tools Megnyitása

A teszteléshez szükséges a Developer Tools megnyitása:

1. Az Extension Development Host ablakban:
   - `Help > Toggle Developer Tools` (vagy `Ctrl+Shift+I`)
2. Válaszd ki a `Console` fület

### 5. Tesztelési Ellenőrzőlista

#### Gombok Működése:
- [ ] Update gomb kattintásra működik
- [ ] Mode gombok (Agent/Ask/Edit) váltása működik
- [ ] Send gomb kattintásra működik

#### Üzenet Küldés:
- [ ] Enter billentyű küldi az üzenetet
- [ ] Shift+Enter új sort hoz létre
- [ ] Üzenet megjelenik a chat-ben
- [ ] Üzenet elküldése után a mező ürítődik

#### Console Logok:
A következő logoknak kell megjelennie a Console-ban:
- `✅ All elements found, attaching event listeners...`
- `✅ Event listeners attached successfully`
- `🖱️ Send button clicked` (gomb kattintásnál)
- `⌨️ Enter pressed` (Enter billentyűnél)
- `📤 Sending message: ...`
- `📨 Posting message to vscode: ...`
- `✅ Message posted successfully`

### 6. Hibakeresés

Ha a gombok nem működnek:

1. **Ellenőrizd a Console-t** - vannak-e hibaüzenetek?
2. **Ellenőrizd az inicializálást** - látod-e a `✅ All elements found` üzenetet?
3. **Ellenőrizd az event listener-eket** - látod-e a `✅ Event listeners attached` üzenetet?
4. **Próbáld meg újratölteni** - `Ctrl+R` az Extension Development Host ablakban

### 7. Gyakori Problémák

#### "Elements not found" hiba:
- Az inicializálás túl korán fut le
- Megoldás: Az `initialize()` függvény újrapróbálkozik 100ms késleltetéssel

#### "sendMessage function not available" hiba:
- A függvény nincs definiálva
- Megoldás: Ellenőrizd, hogy minden függvény definiálva van-e

#### Gombok nem reagálnak:
- Event listener-ek nincsenek beállítva
- Megoldás: Ellenőrizd a Console-t az inicializálási üzenetekért

### 8. Tesztelési Példa

1. Nyisd meg a sidebar chat-et
2. Írj be egy üzenetet: "Hello, test"
3. Nyomd meg az Enter billentyűt vagy kattints a Send gombra
4. Ellenőrizd a Console-t:
   - Látod-e a `📤 Sending message: Hello, test` üzenetet?
   - Látod-e a `📨 Posting message to vscode` üzenetet?
   - Látod-e a `✅ Message posted successfully` üzenetet?

Ha mindhárom üzenet megjelenik, az üzenet küldés működik!

