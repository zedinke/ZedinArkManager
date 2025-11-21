# 🔐 Autentikációs rendszer

## 📋 Áttekintés

Az API kulcs alapú autentikáció biztonságos hozzáférést biztosít az API-hoz.

## ⚙️ Beállítás

### Autentikáció engedélyezése

Szerkeszd a `.env` fájlt:

```env
ENABLE_AUTH=true
```

Vagy környezeti változóként:

```bash
export ENABLE_AUTH=true
```

### Autentikáció kikapcsolása (fejlesztéshez)

```env
ENABLE_AUTH=false
```

## 🔑 API kulcs generálása

### 1. API kulcs létrehozása

```bash
curl -X POST http://localhost:8000/api/auth/generate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API Key",
    "description": "Main API key"
  }'
```

**Válasz:**
```json
{
  "success": true,
  "api_key": "your-api-key-here...",
  "name": "My API Key",
  "warning": "Mentsd el ezt a kulcsot biztonságos helyre!"
}
```

### 2. API kulcs használata

**Header-ben:**
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**Python példa:**
```python
import requests

headers = {
    "X-API-Key": "your-api-key-here",
    "Content-Type": "application/json"
}

response = requests.post(
    "http://localhost:8000/api/chat",
    headers=headers,
    json={"messages": [{"role": "user", "content": "Hello"}]}
)
```

## 📝 API kulcs kezelés

### Kulcsok listázása

```bash
curl -X GET http://localhost:8000/api/auth/keys \
  -H "X-API-Key: your-api-key-here"
```

### Kulcs visszavonása

```bash
curl -X POST http://localhost:8000/api/auth/revoke \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key_to_revoke": "key-to-revoke"
  }'
```

### Kulcs ellenőrzése

```bash
curl -X POST http://localhost:8000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "api_key_to_verify": "your-api-key-here"
  }'
```

## 🛡️ Védett endpointok

Ha `ENABLE_AUTH=true`, az alábbi endpointok autentikációt igényelnek:

- `/api/chat`
- `/api/generate`
- `/api/edit`
- `/api/explain`
- `/api/refactor`
- `/api/files/*`
- `/api/projects/*`
- `/api/gpu/*`
- `/api/auth/*` (generate kivételével)

**Nyilvános endpointok** (autentikáció nélkül):
- `/` (root)
- `/health`
- `/api/auth/generate` (kulcs generáláshoz)
- `/api/auth/verify` (kulcs ellenőrzéshez)

## ⚠️ Biztonsági tippek

1. **Mentsd el a kulcsot biztonságos helyre** - egyszer mutatjuk meg!
2. **Ne oszd meg** - minden felhasználó saját kulcsot használjon
3. **Visszavonás** - ha biztonsági probléma van, vond vissza a kulcsot
4. **HTTPS használata** - éles környezetben mindig HTTPS!

## 🔍 Hibaelhárítás

### 401 Unauthorized

**Hiba:**
```json
{
  "detail": "API kulcs szükséges"
}
```

**Megoldás:**
1. Add hozzá a `X-API-Key` header-t
2. Vagy állítsd be `ENABLE_AUTH=false`-t a `.env` fájlban

### Érvénytelen kulcs

**Hiba:**
```json
{
  "detail": "Érvénytelen vagy visszavont API kulcs"
}
```

**Megoldás:**
1. Generálj új kulcsot: `/api/auth/generate`
2. Ellenőrizd a kulcsot: `/api/auth/verify`

---

**Biztonságos használatot! 🔐**

