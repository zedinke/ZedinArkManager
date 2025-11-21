# 🌐 Böngészőből való API tesztelés

## ❌ Probléma

Ha a böngészőben megnyitod az `/api/chat` endpointot, ezt a hibát kapod:
```json
{"detail":"Method Not Allowed"}
```

**Ok:** A böngésző **GET** kérést küld, de az `/api/chat` endpoint csak **POST** kérést fogad el.

## ✅ Megoldások

### 1. FastAPI interaktív dokumentáció használata (AJÁNLOTT)

**A legegyszerűbb mód a böngészőben:**

```
http://135.181.165.27:8000/docs
```

Ez egy interaktív API dokumentáció, ahol:
- ✅ Minden endpoint-ot látod
- ✅ Tesztelheted közvetlenül a böngészőből
- ✅ Nem kell manuálisan kérést írni
- ✅ Példákat látsz minden endpoint-hoz

**Használat:**
1. Nyisd meg: `http://135.181.165.27:8000/docs`
2. Keresd meg az `/api/chat` endpointot
3. Kattints a "Try it out" gombra
4. Add meg a szükséges adatokat
5. Kattints az "Execute" gombra
6. Láthatod a választ!

### 2. curl használata (Terminálból)

**Terminálból POST kérést küldhetsz:**

```bash
export API_KEY="your-api-key-here"

curl -X POST http://135.181.165.27:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### 3. JavaScript fetch API (Böngésző konzolban)

**Böngésző konzolban (F12):**

```javascript
fetch('http://135.181.165.27:8000/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key-here'
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Hello!' }
    ]
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

### 4. Postman vagy Insomnia használata

**Külső eszközök:**
- [Postman](https://www.postman.com/) - REST API tesztelő
- [Insomnia](https://insomnia.rest/) - API tesztelő
- [Thunder Client](https://www.thunderclient.com/) - VS Code extension

## 📋 Gyors útmutató

### 1. Interaktív dokumentáció (Ajánlott)

```
1. Nyisd meg: http://135.181.165.27:8000/docs
2. Keresd meg az /api/chat endpointot
3. Kattints "Try it out"
4. Add meg az adatokat:
   - messages: [{"role": "user", "content": "Hello!"}]
5. Kattints "Execute"
6. Lásd a választ!
```

### 2. Health check (böngészőből)

Ez működik GET-tel is:
```
http://135.181.165.27:8000/health
```

### 3. Modellek listázása (böngészőből)

Ez is működik GET-tel:
```
http://135.181.165.27:8000/api/models
```

## 🔍 Endpoint típusok

### GET endpointok (böngészőből működnek)

- ✅ `/` - Főoldal
- ✅ `/health` - Health check
- ✅ `/docs` - Interaktív dokumentáció
- ✅ `/api/models` - Modellek listázása
- ✅ `/api/projects` - Projektek listázása

### POST endpointok (böngészőből NEM működnek)

- ❌ `/api/chat` - Chat endpoint (POST szükséges)
- ❌ `/api/generate` - Kód generálás (POST szükséges)
- ❌ `/api/auth/generate` - API kulcs generálás (POST szükséges)

**Ezekhez használd:**
- ✅ `/docs` oldalt (interaktív)
- ✅ curl parancsot (terminálból)
- ✅ Postman/Insomnia (külső eszköz)

## 🚀 Gyors tesztelés

### Böngészőben:

1. **API dokumentáció:**
   ```
   http://135.181.165.27:8000/docs
   ```

2. **Health check:**
   ```
   http://135.181.165.27:8000/health
   ```

3. **Modellek:**
   ```
   http://135.181.165.27:8000/api/models
   ```

### Terminálból:

```bash
# Health check
curl http://135.181.165.27:8000/health

# Chat teszt
curl -X POST http://135.181.165.27:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"messages": [{"role": "user", "content": "Hello!"}]}'
```

## ⚠️ Fontos megjegyzés

**A böngésző csak GET kéréseket tud küldeni közvetlenül az URL-ből.**

POST, PUT, DELETE kérésekhez:
- Használd a `/docs` oldalt (ajánlott)
- Vagy curl parancsot
- Vagy Postman/Insomnia eszközt

---

**A `/docs` oldal a legegyszerűbb mód a böngészőből való teszteléshez! 🚀**

