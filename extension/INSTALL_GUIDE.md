# 📦 ZedinArk Manager Extension - Telepítési útmutató

## 🚀 Gyors telepítés

### 1. Függőségek telepítése

```bash
cd extension
npm install
```

### 2. Fordítás

```bash
npm run compile
```

### 3. Extension csomagolása (opcionális)

```bash
npm run package
```

Ez létrehozza a `zedinark-manager-1.0.0.vsix` fájlt, amit telepíthetsz VS Code-ba vagy Cursor-ba.

## 🔧 Részletes telepítés

### Node.js telepítése (ha még nincs)

**Linux (Debian/Ubuntu):**
```bash
sudo apt update
sudo apt install -y nodejs npm
```

**Vagy nvm-mel:**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install node
```

**macOS:**
```bash
brew install node
```

**Windows:**
1. Töltse le a Node.js-t: https://nodejs.org/
2. Telepítse a wizard segítségével

### Telepítés lépések

1. **Navigálj az extension mappába:**
   ```bash
   cd extension
   ```

2. **Telepítsd a függőségeket:**
   ```bash
   npm install
   ```

3. **Fordítsd le a TypeScript-et:**
   ```bash
   npm run compile
   ```

4. **(Opcionális) Csomagold az extension-t:**
   ```bash
   npm run package
   ```

## 📥 VS Code / Cursor telepítés

### Fejlesztési módban

1. **Nyisd meg az extension mappát VS Code-ban vagy Cursor-ban**

2. **Nyomj `F5`-öt** vagy:
   - VS Code: `Run` → `Start Debugging`
   - Cursor: `Run` → `Start Debugging`

3. **Egy új ablak nyílik meg** az extension-nal telepítve

### VSIX telepítés

1. **Generáld a VSIX fájlt:**
   ```bash
   npm run package
   ```

2. **Telepítsd VS Code-ba vagy Cursor-ba:**
   - `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
   - Válaszd ki a `zedinark-manager-1.0.0.vsix` fájlt

3. **Újraindítás szükséges**

## ⚙️ Konfiguráció

A telepítés után állítsd be az API URL-t és az API kulcsot:

```json
{
  "zedinark.apiUrl": "http://135.181.165.27:8000",
  "zedinark.apiKey": "your-api-key-here",
  "zedinark.model": "phi3:mini"
}
```

**Részletes útmutató**: `docs/CURSOR_VSCODE_CONNECTION.md`

## ✅ Ellenőrzés

1. **Kapcsolat tesztelése:**
   - `Ctrl+Shift+P` → `ZedinArk: Connect to Server`
   - Ellenőrizd az üzeneteket

2. **Chat teszt:**
   - `Ctrl+Shift+P` → `ZedinArk: Chat with AI`
   - Írj be "Hi" és ellenőrizd a választ

## 🔧 Hibaelhárítás

### "npm: command not found"

**Megoldás**: Telepítsd a Node.js-t (lásd fent)

### "Module not found" hibák

**Megoldás**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Compile hibák

**Megoldás**:
```bash
npm run compile
```

Ha hibák vannak, ellenőrizd a TypeScript verzióját:
```bash
npm install typescript@latest
```

## 📚 További információ

- **Részletes használati útmutató**: `docs/CURSOR_VSCODE_CONNECTION.md`
- **API dokumentáció**: `docs/API.md`
- **Fő projekt README**: `README.md`

