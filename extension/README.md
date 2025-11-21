# ZedinArk Manager - VS Code / Cursor Extension

VS Code és Cursor extension a ZedinArk API-hoz való csatlakozáshoz.

## Funkciók

- ✅ Chat az AI-val
- ✅ Kód generálás
- ✅ Kód magyarázata
- ✅ Kód refaktorálás
- ✅ API szerverhez való csatlakozás
- ✅ API kulcs autentikáció

## Telepítés

### Fejlesztési módban

```bash
cd extension
npm install
npm run compile
```

### Package létrehozása

```bash
npm install -g @vscode/vsce
vsce package
```

## Használat

1. **Csatlakozás beállítása:**
   - Nyisd meg a Settings-t (Ctrl+,)
   - Keress rá: "ZedinArk"
   - Állítsd be az API URL-t: `http://135.181.165.27:8000`
   - Opcionálisan add meg az API kulcsot

2. **Parancsok:**
   - `ZedinArk: Connect to Server` - Szerver csatlakozás
   - `ZedinArk: Chat with AI` - Chat az AI-val
   - `ZedinArk: Generate Code` - Kód generálás
   - `ZedinArk: Explain Code` - Kód magyarázata (kijelölt kódhoz)
   - `ZedinArk: Refactor Code` - Kód refaktorálás (aktív fájlhoz)

## Konfiguráció

```json
{
  "zedinark.apiUrl": "http://135.181.165.27:8000",
  "zedinark.apiKey": "your-api-key-here",
  "zedinark.model": "llama3.1:8b"
}
```

