# 📦 VS Code Extension Package létrehozása

## Telepítés

### 1. Node.js telepítés (ha nincs)

```bash
# Node.js telepítése
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verzió ellenőrzése
node --version
npm --version
```

### 2. VS Code Extension Tools telepítése

**Globálisan:**
```bash
npm install -g @vscode/vsce
```

**Vagy helyileg (ajánlott):**
```bash
cd extension
npm install
npm install -D @vscode/vsce
```

### 3. TypeScript fordítás

```bash
cd extension
npm run compile
```

### 4. Package létrehozása

**Ha globálisan telepítetted:**
```bash
cd extension
vsce package
```

**Ha helyileg telepítetted:**
```bash
cd extension
npx vsce package
```

**Vagy npm script-kel:**
```bash
cd extension
npm run package
```

## Package használata

A létrehozott `.vsix` fájlt telepítheted VS Code-ba:

1. VS Code megnyitása
2. Extensions (Ctrl+Shift+X)
3. `...` menü → "Install from VSIX..."
4. Válaszd ki a létrehozott `.vsix` fájlt

## Fejlesztési módban tesztelés

```bash
cd extension
npm run compile
code --extensionDevelopmentPath=.
```

## Hibaelhárítás

### vsce command not found

**Megoldás 1:** Globális telepítés
```bash
npm install -g @vscode/vsce
```

**Megoldás 2:** Helyi telepítés és npx használata
```bash
cd extension
npm install
npx vsce package
```

**Megoldás 3:** npm script használata
```bash
cd extension
npm run package
```

### Node.js nincs telepítve

Telepítsd a Node.js-t:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

**Most már készítheted a package-et! ✅**

