# 📦 VSIX telepítés - Részletes útmutató

## ✅ Sikeres VSIX létrehozás

Ha látod ezt az üzenetet, akkor sikeresen létrehoztad a VSIX fájlt:

```
✅ Packaged: zedinark-manager-1.0.0.vsix (9 files, 9.28 KB)
```

A fájl helye: `~/ZedinArkManager/extension/zedinark-manager-1.0.0.vsix`

## 🚀 Telepítés VS Code-ba vagy Cursor-ba

### Módszer 1: VSIX telepítés (ajánlott)

**VS Code-ban vagy Cursor-ban:**

1. **Nyisd meg a VS Code-ot vagy Cursor-t**

2. **Nyomj `Ctrl+Shift+P`** (vagy `Cmd+Shift+P` macOS-en)

3. **Írd be**: `Extensions: Install from VSIX...`

4. **Válaszd ki** a `zedinark-manager-1.0.0.vsix` fájlt:
   - Ha a szerveren vagy, töltsd le a fájlt először (SCP vagy SFTP)
   - Vagy használd a VS Code Remote SSH extension-t

5. **Újraindítás**: Az extension telepítése után újraindítod a VS Code-ot vagy Cursor-t

### Módszer 2: Parancssorból (ha van VS Code CLI)

```bash
# VS Code esetén
code --install-extension zedinark-manager-1.0.0.vsix

# Cursor esetén (ha van CLI)
cursor --install-extension zedinark-manager-1.0.0.vsix
```

## 📥 VSIX fájl letöltése a szerverről

Ha a szerveren vagy, és lokális gépen szeretnéd telepíteni:

### SCP használatával

```bash
# A lokális gépedről
scp ai_developer@135.181.165.27:~/ZedinArkManager/extension/zedinark-manager-1.0.0.vsix ./
```

### SFTP használatával

```bash
# FTP klienssel (FileZilla, WinSCP, stb.)
# Host: 135.181.165.27
# User: ai_developer
# Path: ~/ZedinArkManager/extension/zedinark-manager-1.0.0.vsix
```

### VS Code Remote SSH

1. Telepítsd a "Remote - SSH" extension-t a VS Code-ba
2. Kapcsolódj a szerverhez: `Ctrl+Shift+P` → `Remote-SSH: Connect to Host`
3. Nyisd meg a szerveren az `extension` mappát
4. Jobb klikk a `zedinark-manager-1.0.0.vsix` fájlra → `Download...`

## ⚙️ Konfiguráció telepítés után

1. **Nyisd meg a Settings-t**: `Ctrl+,`

2. **Keresés**: `zedinark`

3. **Állítsd be**:
   - **ZedinArk: Api Url**: `http://135.181.165.27:8000`
   - **ZedinArk: Api Key**: `ryatnWzeGZcGckLwf9KV09JFMDKKUlE8QTFXfDkr0xA`
   - **ZedinArk: Model**: `phi3:mini`

**Vagy `settings.json`-ban:**

```json
{
  "zedinark.apiUrl": "http://135.181.165.27:8000",
  "zedinark.apiKey": "ryatnWzeGZcGckLwf9KV09JFMDKKUlE8QTFXfDkr0xA",
  "zedinark.model": "phi3:mini"
}
```

## ✅ Ellenőrzés

1. **Kapcsolat tesztelése**:
   - `Ctrl+Shift+P` → `ZedinArk: Connect to Server`
   - Üzenet jelenik meg a kapcsolatról

2. **Chat teszt**:
   - `Ctrl+Shift+P` → `ZedinArk: Chat with AI`
   - Írj be "Hi"
   - Várható válasz: "Hello! How can I help you today?"

## 🔧 Hibaelhárítás

### "Extension not found"

**Ok**: A VSIX fájl nincs meg a helyén.

**Megoldás**: Ellenőrizd a fájl elérését:
```bash
ls -lh ~/ZedinArkManager/extension/*.vsix
```

### "Installation failed"

**Ok**: A VSIX fájl sérült vagy nem kompatibilis.

**Megoldás**: 
1. Töröld a régi VSIX fájlt
2. Generálj újat:
```bash
cd ~/ZedinArkManager/extension
npm run package
```

### "Permission denied"

**Ok**: Nem tudsz hozzáférni a VSIX fájlhoz.

**Megoldás**: Ellenőrizd a jogosultságokat:
```bash
chmod 644 zedinark-manager-1.0.0.vsix
```

## 💡 Tippek

### VSIX fájl újragenerálása

Ha módosítottad az extension kódját:

```bash
cd ~/ZedinArkManager/extension
npm run compile
npm run package
```

### Automatikus telepítés (opcionális)

Ha gyakran frissíted az extension-t, érdemes egy script-et létrehozni:

```bash
#!/bin/bash
cd ~/ZedinArkManager/extension
npm run compile
npm run package
echo "✅ VSIX fájl létrehozva: zedinark-manager-1.0.0.vsix"
echo "📥 Most telepítsd a VS Code-ba vagy Cursor-ba!"
```

## ✅ Összegzés

1. ✅ **VSIX fájl létrehozva**: `zedinark-manager-1.0.0.vsix`
2. ✅ **VSIX letöltése**: SCP, SFTP vagy Remote SSH
3. ✅ **Telepítés**: `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
4. ✅ **Konfiguráció**: API URL, API kulcs, modell
5. ✅ **Használat**: Chat, kód generálás, magyarázat, refaktor

**Most már készen vagy! 🚀**

---

**Kérdések vagy problémák? Nézd meg a `docs/CURSOR_VSCODE_CONNECTION.md` fájlt!**

