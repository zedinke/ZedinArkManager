# 🔄 Automatikus Extension Frissítés

## 🎯 Cél

Ne kelljen minden alkalommal manuálisan újra telepíteni az extension-t. Automatikus verziókezelés és egyszerű frissítési folyamat.

## 🚀 Használat

### 1. Gyors frissítés (ajánlott)

**Szerveren:**

```bash
cd ~/ZedinArkManager/extension
chmod +x update_and_install.sh
./update_and_install.sh
```

Ez a script:
- ✅ Frissíti a kódot Git-ből
- ✅ Növeli a verziószámot (patch)
- ✅ Lefordítja a TypeScript-et
- ✅ Csomagolja az extension-t
- ✅ Opcionálisan commitolja a változásokat

### 2. Verzió növelés típusok

**Patch (1.0.0 → 1.0.1)** - Bugfixek, kis változások:
```bash
npm run update
# vagy
./update_version.sh patch
```

**Minor (1.0.0 → 1.1.0)** - Új funkciók:
```bash
npm run update:minor
# vagy
./update_version.sh minor
```

**Major (1.0.0 → 2.0.0)** - Breaking changes:
```bash
npm run update:major
# vagy
./update_version.sh major
```

### 3. VS Code-ban telepítés

**Egyszerű telepítés:**

1. **Töltsd le az új VSIX fájlt** a szerverről
2. **VS Code**: `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
3. **Válaszd ki** az új VSIX fájlt
4. **Újraindítás**

**VS Code automatikusan felülírja a régi verziót!** ✅

## 📋 Teljes folyamat

### Szerveren:

```bash
cd ~/ZedinArkManager/extension

# 1. Frissítés és build
./update_and_install.sh

# 2. VSIX fájl neve (pl: zedinark-manager-1.0.1.vsix)
ls -lh *.vsix
```

### Lokális gépen:

```bash
# 1. VSIX letöltése
scp ai_developer@135.181.165.27:~/ZedinArkManager/extension/zedinark-manager-*.vsix ./

# 2. VS Code-ban telepítés
# Ctrl+Shift+P → Extensions: Install from VSIX...
# Válaszd ki a legújabb VSIX fájlt
# Újraindítás
```

## 🔍 Verzió ellenőrzés

**Telepített verzió ellenőrzése VS Code-ban:**

1. `Ctrl+Shift+X` (Extensions)
2. Keresés: `ZedinArk Manager`
3. Nézd meg a verziószámot

**Vagy settings.json-ban:**
```json
{
  "zedinark.version": "1.0.1"
}
```

## 💡 Tippek

### Automatikus telepítés script (opcionális)

Hozz létre egy `install_latest.sh` scriptet a lokális gépeden:

```bash
#!/bin/bash
# install_latest.sh

SERVER="ai_developer@135.181.165.27"
REMOTE_PATH="~/ZedinArkManager/extension"
LOCAL_PATH="./"

echo "📥 VSIX letöltése..."
scp ${SERVER}:${REMOTE_PATH}/zedinark-manager-*.vsix ${LOCAL_PATH}

LATEST_VSIX=$(ls -t zedinark-manager-*.vsix | head -1)
echo "✅ Letöltve: $LATEST_VSIX"

echo ""
echo "📦 Telepítéshez:"
echo "   VS Code: Ctrl+Shift+P → Extensions: Install from VSIX..."
echo "   Válaszd ki: $LATEST_VSIX"
```

## ✅ Előnyök

- ✅ **Automatikus verziókezelés** - Nem kell manuálisan növelni
- ✅ **Egyszerű frissítés** - Egy script mindent megcsinál
- ✅ **VS Code automatikus felülírás** - Nem kell először törölni
- ✅ **Verzió követés** - Mindig tudod, melyik verzió van telepítve

## 📚 További információ

- **Telepítés**: `docs/SIDEBAR_SETUP.md`
- **View Provider hiba**: `docs/FIX_VIEW_PROVIDER.md`

---

**Most már egyszerűen frissítheted az extension-t! 🚀**

