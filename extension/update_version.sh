#!/bin/bash

# Automatikus verzió növelés script
# Használat: ./update_version.sh [major|minor|patch]

cd ~/ZedinArkManager/extension

# Jelenlegi verzió beolvasása
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Jelenlegi verzió: $CURRENT_VERSION"

# Verziószám növelése
if [ "$1" == "major" ]; then
    npm version major --no-git-tag-version
elif [ "$1" == "minor" ]; then
    npm version minor --no-git-tag-version
else
    npm version patch --no-git-tag-version
fi

NEW_VERSION=$(node -p "require('./package.json').version")
echo "Új verzió: $NEW_VERSION"

# Build és package
echo "🔨 Fordítás és csomagolás..."
npm run compile
npm run package

echo ""
echo "✅ Kész! Új VSIX fájl: zedinark-manager-${NEW_VERSION}.vsix"
echo ""
echo "📦 Telepítéshez:"
echo "   VS Code: Ctrl+Shift+P → Extensions: Install from VSIX..."
echo "   Válaszd ki: zedinark-manager-${NEW_VERSION}.vsix"

