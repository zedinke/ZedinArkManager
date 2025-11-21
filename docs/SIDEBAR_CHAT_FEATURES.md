# 💬 Sidebar Chat - Teljes funkciók

## 🎯 Áttekintés

A Sidebar Chat egy modern, teljes funkcionalitású AI chat panel a VS Code bal oldalán, amely teljes autonómiát biztosít az AI-nak a projekt mappához.

## ✨ Fő funkciók

### 1. 🤖 Agent Mód (Autonóm)

**Teljes autonómia a projekt mappához:**

- ✅ **Fájlok létrehozása**: Az AI létrehozhat fájlokat a projektben
- ✅ **Fájlok módosítása**: Módosíthat meglévő fájlokat
- ✅ **Fájlok törlése**: Törölhet fájlokat
- ✅ **Autonóm döntéshozatal**: Önállóan dönt, mit csináljon
- ✅ **Projekt struktúra elemzése**: Látja a teljes projekt struktúráját

**Használat:**
1. Válaszd az **Agent** módot
2. Írd be a feladatot (pl: "Hozz létre egy Python web szervert Flask-kal")
3. Az AI elemezi és végrehajtja a szükséges műveleteket

**Példa:**
```
Te: Hozz létre egy egyszerű Python web szervert Flask-kal

ZedinArk AI: 
Elemeztem a feladatot. Létrehozok egy Flask web szervert.

CREATE_FILE: app.py
```python
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello, World!'

if __name__ == '__main__':
    app.run(debug=True)
```

✅ Fájl létrehozva: app.py
```

### 2. 💬 Ask Mód (Kérdés-Válasz)

**Egyszerű kérdés-válasz mód:**

- ✅ **Kérdések megválaszolása**: Válaszol a kérdésekre
- ✅ **Problémamegoldás**: Segít problémákat megoldani
- ✅ **Tanácsadás**: Javaslatokat ad

**Használat:**
1. Válaszd az **Ask** módot
2. Tegyél fel kérdést
3. Kapj választ

### 3. ✏️ Edit Mód (Szerkesztés)

**Aktív fájl szerkesztése:**

- ✅ **Fájl olvasása**: Olvassa az aktív fájlt
- ✅ **Módosítás**: Módosítja a fájlt az utasítás szerint
- ✅ **Automatikus mentés**: Elmenti a változtatásokat

**Használat:**
1. Nyisd meg a szerkeszteni kívánt fájlt
2. Válaszd az **Edit** módot
3. Írd be az utasítást (pl: "Add hozzá error handling-et")
4. Az AI módosítja és elmenti a fájlt

## 📎 Fájl és kép feltöltés

### Fájl feltöltés

1. Kattints a **📄 Fájl** gombra
2. Válaszd ki a fájlt
3. Az AI elolvassa és értelmezi a fájlt
4. Választ ad a fájl tartalmáról

**Támogatott formátumok:**
- Minden szöveges fájl
- Kód fájlok (Python, JavaScript, stb.)
- Konfigurációs fájlok
- Dokumentáció

### Kép feltöltés

1. Kattints a **🖼️ Kép** gombra
2. Válaszd ki a képet
3. Az AI elemezi a képet
4. Választ ad a kép tartalmáról

**Támogatott formátumok:**
- PNG, JPG, JPEG, GIF
- Screenshot-ok
- Diagramok
- Kód képek

## 🎨 Modern UI Design

### Design jellemzők

- ✅ **Letisztult**: Minimális, modern design
- ✅ **Reszponzív**: Automatikusan alkalmazkodik
- ✅ **Dark/Light mode**: VS Code témával kompatibilis
- ✅ **Animációk**: Smooth fade-in animációk
- ✅ **Loading indikátor**: Vizuális visszajelzés
- ✅ **Markdown támogatás**: Kód blokkok formázása

### Színpaletta

- **User üzenetek**: VS Code button színek
- **AI üzenetek**: VS Code textBlockQuote háttér
- **Mód gombok**: Aktív/inaktív állapotok
- **Upload gombok**: Hover effektekkel

## 🔧 Technikai részletek

### Projekt struktúra hozzáférés

Az Agent mód teljes hozzáférést kap a projekt mappához:

```typescript
// Projekt struktúra lekérése
const projectStructure = await getProjectStructure(workspacePath);
// Visszaadja: { files: [...], directories: [...] }
```

### Fájl műveletek

**Létrehozás:**
```typescript
CREATE_FILE: path/to/file.py
```python
code here
```
```

**Törlés:**
```typescript
DELETE_FILE: path/to/file.py
```

**Módosítás:**
```typescript
MODIFY_FILE: path/to/file.py
```python
new code here
```
```

### Agent személyiség

Az AI személyisége:
- **Kreatív**: Kreatív megoldásokat talál
- **Proaktív**: Előre gondolkodik
- **Autonóm**: Önállóan dönt
- **Segítőkész**: Mindig segít
- **Hatékony**: Gyors és pontos

## 📊 Módok összehasonlítása

| Funkció | Agent | Ask | Edit |
|---------|-------|-----|------|
| Fájl létrehozás | ✅ | ❌ | ❌ |
| Fájl módosítás | ✅ | ❌ | ✅ |
| Fájl törlés | ✅ | ❌ | ❌ |
| Kérdés-válasz | ✅ | ✅ | ❌ |
| Projekt elemzés | ✅ | ✅ | ❌ |
| Autonóm műveletek | ✅ | ❌ | ❌ |

## 🚀 Használati példák

### Példa 1: Web szerver létrehozása (Agent mód)

```
Te: Hozz létre egy Flask web szervert egy TODO listával

ZedinArk AI:
Elemeztem a feladatot. Létrehozok egy Flask web szervert TODO funkcióval.

CREATE_FILE: app.py
```python
from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__)
todos = []

@app.route('/')
def index():
    return render_template('index.html', todos=todos)

@app.route('/add', methods=['POST'])
def add_todo():
    todo = request.form.get('todo')
    if todo:
        todos.append(todo)
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)
```

CREATE_FILE: templates/index.html
```html
<!DOCTYPE html>
<html>
<head>
    <title>TODO List</title>
</head>
<body>
    <h1>TODO List</h1>
    <form method="POST" action="/add">
        <input type="text" name="todo" placeholder="Új TODO">
        <button type="submit">Hozzáad</button>
    </form>
    <ul>
        {% for todo in todos %}
        <li>{{ todo }}</li>
        {% endfor %}
    </ul>
</body>
</html>
```

✅ Fájlok létrehozva: app.py, templates/index.html
```

### Példa 2: Kód magyarázat (Ask mód)

```
Te: Magyarázd el, hogyan működik a rekurzió

ZedinArk AI:
A rekurzió egy programozási technika, ahol egy függvény önmagát hívja meg...

[részletes magyarázat]
```

### Példa 3: Fájl módosítás (Edit mód)

```
Te: Add hozzá error handling-et a calculate függvényhez

ZedinArk AI:
Hozzáadtam az error handling-et:

```python
def calculate(a, b, operation):
    try:
        if operation == '+':
            return a + b
        elif operation == '-':
            return a - b
        # ...
    except Exception as e:
        return f"Error: {e}"
```

✅ Fájl módosítva: calculator.py
```

## 🔒 Biztonság

- ✅ **Workspace korlátozás**: Csak a workspace mappán belül működik
- ✅ **Permission check**: Ellenőrzi a fájl jogosultságokat
- ✅ **Error handling**: Biztonságos hibakezelés
- ✅ **Validation**: Fájl útvonalak validálása

## 📚 További információ

- **Extension telepítés**: `extension/INSTALL_GUIDE.md`
- **API dokumentáció**: `docs/CURSOR_VSCODE_CONNECTION.md`
- **Chat Panel**: `docs/CHAT_PANEL.md`

---

**Most már van egy teljes funkcionalitású AI asszisztensed! 🚀**

