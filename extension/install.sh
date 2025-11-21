#!/bin/bash
# VS Code Extension telepítés és package script

set -e

echo "========================================="
echo "VS Code Extension Telepítés"
echo "========================================="

# Node.js ellenőrzése
if ! command -v node &> /dev/null; then
    echo "📦 Node.js telepítése..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js telepítve: $(node --version)"
fi

# npm ellenőrzése
if ! command -v npm &> /dev/null; then
    echo "❌ npm nem található!"
    exit 1
else
    echo "✅ npm telepítve: $(npm --version)"
fi

# Függőségek telepítése
echo "📦 Függőségek telepítése..."
npm install

# TypeScript fordítás
echo "🔨 TypeScript fordítás..."
npm run compile

# VS Code Extension Tools telepítése
echo "📦 @vscode/vsce telepítése..."
npm install -D @vscode/vsce

echo ""
echo "========================================="
echo "✅ Telepítés befejezve!"
echo "========================================="
echo ""
echo "Következő lépések:"
echo "1. Package létrehozása:"
echo "   npm run package"
echo ""
echo "2. Vagy közvetlenül:"
echo "   npx @vscode/vsce package"
echo ""

