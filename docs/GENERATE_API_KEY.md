# 🔑 API kulcs generálása - Részletes útmutató

## 🚀 Gyors generálás

### 1. API kulcs generálása

**Szerveren (SSH-n keresztül):**

```bash
curl -X POST http://localhost:8000/api/auth/generate \
  -H "Content-Type: application/json" \
  -d '{"name": "My API Key", "description": "VS Code / Cursor extension"}'
```

**Válasz példa:**
```json
{
  "api_key": "ryatnWzeGZcGckLwf9KV09JFMDKKUlE8QTFXfDkr0xA",
  "name": "My API Key",
  "description": "VS Code / Cursor extension",
  "created": "2024-01-01T00:00:00"
}
```

### 2. API kulcs mentése

**Mentsd el a kulcsot biztonságos helyre!**

```bash
# Példa: mentés fájlba
echo "ryatnWzeGZcGckLwf9KV09JFMDKKUlE8QTFXfDkr0xA" > ~/zedinark_api_key.txt
chmod 600 ~/zedinark_api_key.txt  # Csak te olvashatod
```

### 3. API kulcs használata

**VS Code / Cursor settings.json:**

```json
{
  "zedinark.apiKey": "ryatnWzeGZcGckLwf9KV09JFMDKKUlE8QTFXfDkr0xA"
}
```

**Vagy curl parancsban:**

```bash
export API_KEY="ryatnWzeGZcGckLwf9KV09JFMDKKUlE8QTFXfDkr0xA"

curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Hi"}],
    "model": "phi3:mini"
  }'
```

## 📋 Részletes útmutató

### 1. Ellenőrizd, hogy fut-e a szerver

```bash
curl http://localhost:8000/health
```

**Várható válasz:**
```json
{
  "status": "healthy",
  "ollama_connected": true,
  "auth_enabled": false
}
```

**Ha `auth_enabled: false`, akkor NEM kell API kulcs!**

### 2. API kulcs generálása (ha szükséges)

**Ha `ENABLE_AUTH=true` a `.env` fájlban:**

```bash
curl -X POST http://localhost:8000/api/auth/generate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "VS Code Key",
    "description": "VS Code / Cursor extension"
  }'
```

**Válasz:**
```json
{
  "api_key": "ryatnWzeGZcGckLwf9KV09JFMDKKUlE8QTFXfDkr0xA",
  "name": "VS Code Key",
  "description": "VS Code / Cursor extension",
  "created": "2024-01-01T00:00:00"
}
```

### 3. API kulcs ellenőrzése

```bash
export API_KEY="ryatnWzeGZcGckLwf9KV09JFMDKKUlE8QTFXfDkr0xA"

curl -X POST http://localhost:8000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d "{\"api_key_to_verify\": \"$API_KEY\"}"
```

**Várható válasz:**
```json
{
  "valid": true,
  "name": "VS Code Key"
}
```

### 4. API kulcsok listázása

```bash
curl -X GET http://localhost:8000/api/auth/keys \
  -H "X-API-Key: $API_KEY"
```

**Válasz:**
```json
{
  "keys": [
    {
      "name": "VS Code Key",
      "description": "VS Code / Cursor extension",
      "created": "2024-01-01T00:00:00",
      "last_used": "2024-01-01T12:00:00",
      "usage_count": 5,
      "active": true,
      "hash": "abc12345..."
    }
  ]
}
```

### 5. API kulcs visszavonása

```bash
curl -X POST http://localhost:8000/api/auth/revoke \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{\"api_key_to_revoke\": \"$API_KEY\"}"
```

## 🔒 Biztonság

### 1. API kulcs védelem

- ✅ **Ne oszd meg** az API kulcsot másokkal
- ✅ **Ne commitold** a Git repóba
- ✅ **Használj környezeti változókat** vagy VS Code settings-t
- ✅ **Visszavonás** ha feltörve lett

### 2. Környezeti változók használata

**`.env` fájlban (NE commitold!):**
```env
ZEDINARK_API_KEY=ryatnWzeGZcGckLwf9KV09JFMDKKUlE8QTFXfDkr0xA
```

**Bash scriptben:**
```bash
export API_KEY="ryatnWzeGZcGckLwf9KV09JFMDKKUlE8QTFXfDkr0xA"
```

### 3. VS Code / Cursor settings

**User settings (globális):**
```json
{
  "zedinark.apiKey": "ryatnWzeGZcGckLwf9KV09JFMDKKUlE8QTFXfDkr0xA"
}
```

**Workspace settings (csak erre a projektre):**
```json
{
  "zedinark.apiKey": "ryatnWzeGZcGckLwf9KV09JFMDKKUlE8QTFXfDkr0xA"
}
```

## 🧪 Tesztelés

### 1. API kulcs nélkül (ha `ENABLE_AUTH=false`)

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hi"}],
    "model": "phi3:mini"
  }'
```

### 2. API kulccsal (ha `ENABLE_AUTH=true`)

```bash
export API_KEY="ryatnWzeGZcGckLwf9KV09JFMDKKUlE8QTFXfDkr0xA"

curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Hi"}],
    "model": "phi3:mini"
  }'
```

## 🔧 Hibaelhárítás

### "API kulcs szükséges" hiba

**Ok**: `ENABLE_AUTH=true`, de nem adtad meg az API kulcsot.

**Megoldás**:
1. Generálj API kulcsot (lásd fent)
2. Add hozzá a VS Code / Cursor settings-hez
3. Vagy állítsd be: `ENABLE_AUTH=false` a `.env` fájlban

### "Érvénytelen vagy visszavont API kulcs" hiba

**Ok**: Rossz vagy visszavont API kulcs.

**Megoldás**:
1. Generálj új API kulcsot
2. Frissítsd a VS Code / Cursor settings-t
3. Újraindítás

### "Not Found" hiba az `/api/auth/generate` endpoint-nál

**Ok**: A szerver nem fut vagy rossz URL.

**Megoldás**:
1. Ellenőrizd, hogy fut-e a szerver: `curl http://localhost:8000/health`
2. Indítsd el a szervert: `python main.py` vagy `./start.sh`

## 📊 API kulcs információk

### Tárolás helye

**Szerveren:**
```
~/ZedinArkManager/data/api_keys.json
```

### Formátum

```json
{
  "keys": {
    "abc123...": {
      "name": "VS Code Key",
      "description": "VS Code / Cursor extension",
      "created": "2024-01-01T00:00:00",
      "last_used": "2024-01-01T12:00:00",
      "usage_count": 5,
      "active": true
    }
  },
  "updated": "2024-01-01T12:00:00"
}
```

**Fontos**: A kulcsok SHA256 hash-ben vannak tárolva, nem plain text-ben!

## ✅ Összegzés

1. ✅ **Ellenőrizd** a szerver állapotát (`/health`)
2. ✅ **Generálj** API kulcsot (`/api/auth/generate`)
3. ✅ **Mentsd el** a kulcsot biztonságos helyre
4. ✅ **Add hozzá** a VS Code / Cursor settings-hez
5. ✅ **Teszteld** a kapcsolatot

---

**Most már van működő API kulcsod! 🔑**

