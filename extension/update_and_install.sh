#!/bin/bash

# Automatikus frissítés és telepítés script
# Ez a script frissíti a verziót, fordítja, csomagolja, és telepíti

cd ~/ZedinArkManager/extension

# Git pull
echo "📥 Frissítés Git-ből..."
git pull origin main

# Verzió növelés (patch)
echo "🔢 Verzió növelés..."
npm version patch --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "Új verzió: $NEW_VERSION"

# Build
echo "🔨 Fordítás..."
npm run compile

# Package
echo "📦 Csomagolás..."
npm run package

VSIX_FILE="zedinark-manager-${NEW_VERSION}.vsix"

echo ""
echo "✅ VSIX fájl kész: $VSIX_FILE"
echo ""
echo "📥 Most töltsd le és telepítsd:"
echo "   1. Töltsd le: $VSIX_FILE"
echo "   2. VS Code: Ctrl+Shift+P → Extensions: Install from VSIX..."
echo "   3. Válaszd ki a letöltött fájlt"
echo "   4. Újraindítás"

# Git commit (opcionális)
read -p "Commitoljam a változásokat? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add package.json
    git commit -m "chore: Bump version to $NEW_VERSION"
    git push origin main
    echo "✅ Git commit kész"
fi

