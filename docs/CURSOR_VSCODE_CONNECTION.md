# 🔌 Cursor / VS Code összekapcsolás - Részletes útmutató

## 📋 Áttekintés

Ez az útmutató segít összekapcsolni a Cursor-t vagy VS Code-ot a ZedinArk API szerverrel, hogy közvetlenül az editorból használhasd az AI-t.

## 🔧 Előfeltételek

1. ✅ **API szerver fut** (`http://135.181.165.27:8000` vagy `http://localhost:8000`)
2. ✅ **API kulcs generálva** (ha `ENABLE_AUTH=true`)
3. ✅ **Node.js telepítve** (a VS Code extension-hoz)

## 🚀 Telepítési módszerek

### 1. módszer: Fejlesztési módban telepítés (ajánlott)

Ez a mód jó, ha módosítani szeretnéd az extension-t vagy fejleszteni azt.

#### 1.1. Extension klónozása

```bash
# Ha a szerveren vagy
cd ~/ZedinArkManager/extension

# Vagy lokálisan (ha klónozod a repót)
git clone https://github.com/zedinke/ZedinArkManager.git
cd ZedinArkManager/extension
```

#### 1.2. Függőségek telepítése

```bash
# Node.js telepítése (ha még nincs)
# Linux:
sudo apt update
sudo apt install -y nodejs npm

# vagy nvm-mel:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install node

# Függőségek telepítése
npm install
```

#### 1.3. Extension fordítása

```bash
# TypeScript fordítása
npm run compile

# Vagy watch módban (automatikus újrafordítás változáskor)
npm run watch
```

#### 1.4. Extension betöltése VS Code-ba / Cursor-ba

1. **Nyisd meg a VS Code-ot vagy Cursor-t**

2. **Nyomj `F5`-öt** vagy:
   - VS Code: `Run` → `Start Debugging`
   - Cursor: `Run` → `Start Debugging`

3. **Egy új ablak nyílik meg** az extension-nal telepítve

4. **Vagy** manuálisan telepítsd:
   ```bash
   # A VS Code-ban vagy Cursor-ban:
   # Ctrl+Shift+P → "Extensions: Install from VSIX..."
   # Válaszd ki a generált .vsix fájlt
   ```

### 2. módszer: VSIX csomag telepítése

Ez a mód jó, ha csak használni szeretnéd az extension-t.

#### 2.1. VSIX csomag készítése

```bash
cd ~/ZedinArkManager/extension

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package extension
npm run package

# Ez létrehozza a: zedinark-manager-1.0.0.vsix fájlt
```

#### 2.2. VSIX telepítése

**VS Code-ban:**
1. `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
2. Válaszd ki a `zedinark-manager-1.0.0.vsix` fájlt
3. Újraindítás szükséges

**Cursor-ban:**
1. `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
2. Válaszd ki a `zedinark-manager-1.0.0.vsix` fájlt
3. Újraindítás szükséges

## ⚙️ Konfiguráció

### 1. API URL beállítása

**Módszer 1: Settings UI**
1. `Ctrl+,` (Settings megnyitása)
2. Keresés: `zedinark`
3. Állítsd be:
   - `ZedinArk: Api Url`: `http://135.181.165.27:8000`
   - `ZedinArk: Api Key`: `your-api-key-here`
   - `ZedinArk: Model`: `phi3:mini` (vagy más modell)

**Módszer 2: settings.json**
```json
{
  "zedinark.apiUrl": "http://135.181.165.27:8000",
  "zedinark.apiKey": "ryatnWzeGZcGckLwf9KV09JFMDKKUlE8QTFXfDkr0xA",
  "zedinark.model": "phi3:mini"
}
```

### 2. API kulcs generálása

Ha `ENABLE_AUTH=true` a szerveren:

```bash
# Szerveren
curl -X POST http://localhost:8000/api/auth/generate \
  -H "Content-Type: application/json" \
  -d '{"name": "VS Code Key", "description": "VS Code / Cursor extension"}'
```

**Válasz:**
```json
{
  "api_key": "ryatnWzeGZcGckLwf9KV09JFMDKKUlE8QTFXfDkr0xA",
  "name": "VS Code Key",
  "created": "2024-01-01T00:00:00"
}
```

**Mentsd el ezt a kulcsot a VS Code / Cursor settings-be!**

### 3. Kapcsolat ellenőrzése

1. **Command Palette megnyitása**: `Ctrl+Shift+P`
2. **Parancs futtatása**: `ZedinArk: Connect to Server`
3. **Eredmény**: Üzenet jelenik meg a státuszról

## 💻 Használat

### Parancsok

#### 1. Chat az AI-val

**Parancs**: `Ctrl+Shift+P` → `ZedinArk: Chat with AI`

**Használat**:
- Írj be egy kérdést vagy üzenetet
- Az AI válaszol az editorban

**Példa**:
- "Hozz létre egy Python függvényt, ami kiszámolja a faktoriálist"
- "Magyarázd el, hogyan működik a rekurzió"

#### 2. Kód generálás

**Parancs**: `Ctrl+Shift+P` → `ZedinArk: Generate Code`

**Használat**:
1. Írd be a promptot (pl. "Python függvény faktoriális számításhoz")
2. Válaszd ki a nyelvet (Python, JavaScript, TypeScript, stb.)
3. A generált kód beillesztődik az aktív editorba

**Példa**:
- Prompt: "Python függvény faktoriális számításhoz"
- Nyelv: Python
- Eredmény: A függvény beillesztődik az editorba

#### 3. Kód magyarázata

**Parancs**: `Ctrl+Shift+P` → `ZedinArk: Explain Code`

**Használat**:
1. Jelöld ki a kódot az editorban
2. Futtasd a parancsot
3. A magyarázat megjelenik egy új panelben

**Példa**:
```python
def factorial(n):
    if n == 0:
        return 1
    return n * factorial(n-1)
```
→ Magyarázat: Ez egy rekurzív függvény, ami...

#### 4. Kód refaktorálás

**Parancs**: `Ctrl+Shift+P` → `ZedinArk: Refactor Code`

**Használat**:
1. Nyisd meg a fájlt, amit refaktorálni szeretnél
2. Futtasd a parancsot
3. Válaszd ki a refaktor típusát:
   - `clean` - Tiszta kód (clean code)
   - `optimize` - Optimalizálás
   - `modernize` - Modernizálás (Python 3.10+ syntax)
4. A refaktorált kód lecseréli az eredetit

**Példa**:
- Refaktor típus: `optimize`
- Eredmény: Optimalizált, gyorsabb kód

## 🔍 Hibaelhárítás

### 1. "Connection failed" hiba

**Ok**: A szerver nem elérhető vagy rossz URL.

**Megoldás**:
```bash
# Ellenőrizd, hogy fut-e a szerver
curl http://135.181.165.27:8000/health

# Vagy lokálisan
curl http://localhost:8000/health
```

**Ellenőrizd**:
- ✅ A szerver fut (`python main.py` vagy `./start.sh`)
- ✅ A port elérhető (8000)
- ✅ A tűzfal megenged-e a kapcsolatot

### 2. "Authentication failed" hiba

**Ok**: Rossz vagy hiányzó API kulcs.

**Megoldás**:
1. Generálj új API kulcsot:
```bash
curl -X POST http://localhost:8000/api/auth/generate \
  -H "Content-Type: application/json" \
  -d '{"name": "New Key", "description": "VS Code"}'
```

2. Frissítsd a VS Code / Cursor settings-ben:
```json
{
  "zedinark.apiKey": "new-api-key-here"
}
```

### 3. Extension nem töltődik be

**Ok**: Hiányzó függőségek vagy hibás fordítás.

**Megoldás**:
```bash
cd extension
rm -rf node_modules package-lock.json
npm install
npm run compile
```

### 4. "Timeout" hiba

**Ok**: A modell válasza túl lassú.

**Megoldás**:
1. Használj gyorsabb modellt (`phi3:mini`):
```json
{
  "zedinark.model": "phi3:mini"
}
```

2. Vagy növeld a timeout-ot az `api.ts` fájlban:
```typescript
timeout: 120000, // 120 másodperc
```

### 5. "Model not found" hiba

**Ok**: A kiválasztott modell nincs telepítve.

**Megoldás**:
1. Listázd a telepített modelleket:
```bash
curl http://localhost:8000/api/models
```

2. Telepítsd a hiányzó modellt:
```bash
ollama pull phi3:mini
```

## 📊 Tesztelés

### 1. Kapcsolat tesztelése

```bash
# Health check
curl http://135.181.165.27:8000/health

# Modellek listázása
curl -H "X-API-Key: your-key" http://135.181.165.27:8000/api/models
```

### 2. Extension tesztelése

1. **Chat teszt**:
   - `Ctrl+Shift+P` → `ZedinArk: Chat with AI`
   - Üzenet: "Hi"
   - Várható: "Hello! How can I help you today?"

2. **Kód generálás teszt**:
   - `Ctrl+Shift+P` → `ZedinArk: Generate Code`
   - Prompt: "Python hello world"
   - Nyelv: Python
   - Várható: Python kód beillesztése

3. **Kód magyarázat teszt**:
   - Jelöld ki egy kódrészletet
   - `Ctrl+Shift+P` → `ZedinArk: Explain Code`
   - Várható: Magyarázat új panelben

## 🚀 Gyors indítás

### Lokális szerverhez (localhost)

```json
{
  "zedinark.apiUrl": "http://localhost:8000",
  "zedinark.apiKey": "",
  "zedinark.model": "phi3:mini"
}
```

### Távoli szerverhez

```json
{
  "zedinark.apiUrl": "http://135.181.165.27:8000",
  "zedinark.apiKey": "ryatnWzeGZcGckLwf9KV09JFMDKKUlE8QTFXfDkr0xA",
  "zedinark.model": "phi3:mini"
}
```

## ✅ Összegzés

1. ✅ **Extension telepítése**: `npm install` + `npm run compile`
2. ✅ **Konfiguráció**: API URL, API kulcs, modell
3. ✅ **Kapcsolat**: `ZedinArk: Connect to Server`
4. ✅ **Használat**: Chat, kód generálás, magyarázat, refaktor

**Most már készen vagy! 🚀**

---

**Kérdések vagy problémák? Nézd meg a `docs/` mappát további információkért!**

