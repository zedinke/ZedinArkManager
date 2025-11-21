#!/bin/bash

# Complete rebuild script for extension
echo "🔧 Rebuilding extension from scratch..."

cd ~/ZedinArkManager/extension

# Step 1: Remove old build artifacts
echo "📦 Removing old build artifacts..."
rm -rf node_modules
rm -rf out
rm -f *.vsix

# Step 2: Clean npm cache (optional but recommended)
echo "🧹 Cleaning npm cache..."
npm cache clean --force

# Step 3: Remove package-lock.json if exists (to force fresh install)
if [ -f "package-lock.json" ]; then
    echo "🗑️  Removing package-lock.json..."
    rm -f package-lock.json
fi

# Step 4: Install dependencies (fresh install)
echo "📥 Installing dependencies..."
npm install --legacy-peer-deps

# Step 4.5: Verify critical modules exist
echo "🔍 Verifying critical modules..."
if [ ! -d "node_modules/typescript/lib" ]; then
    echo "❌ TypeScript lib directory not found! Reinstalling TypeScript..."
    npm install typescript --save-dev --legacy-peer-deps
fi

if [ ! -d "node_modules/@vscode/vsce" ]; then
    echo "❌ @vscode/vsce not found! Reinstalling..."
    npm install @vscode/vsce --save-dev --legacy-peer-deps
fi

# Step 5: Fix permissions
echo "🔐 Fixing permissions..."
chmod +x node_modules/.bin/* 2>/dev/null || true

# Step 6: Verify TypeScript installation
echo "✅ Verifying TypeScript installation..."
if [ -f "node_modules/.bin/tsc" ] && [ -d "node_modules/typescript/lib" ]; then
    echo "✅ TypeScript found"
    ls -la node_modules/.bin/tsc
    echo "✅ TypeScript lib directory exists"
else
    echo "❌ TypeScript not properly installed!"
    echo "Attempting to reinstall TypeScript..."
    npm install typescript --save-dev --legacy-peer-deps
    if [ ! -d "node_modules/typescript/lib" ]; then
        echo "❌ TypeScript installation failed!"
        exit 1
    fi
fi

# Step 7: Compile TypeScript
echo "🔨 Compiling TypeScript..."
if [ -f "node_modules/.bin/tsc" ]; then
    node_modules/.bin/tsc -p ./ || npx tsc -p ./
else
    npx tsc -p ./
fi

if [ $? -eq 0 ]; then
    echo "✅ Compilation successful"
else
    echo "❌ Compilation failed"
    exit 1
fi

# Step 8: Package extension
echo "📦 Packaging extension..."
if [ -f "node_modules/.bin/vsce" ]; then
    node_modules/.bin/vsce package || npx @vscode/vsce package
else
    npx @vscode/vsce package
fi

if [ $? -eq 0 ]; then
    echo "✅ Packaging successful"
    echo ""
    echo "📦 VSIX file created:"
    ls -lh *.vsix
else
    echo "❌ Packaging failed"
    exit 1
fi

echo ""
echo "✅ Done! Extension rebuilt successfully."

