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

# Step 3: Install dependencies
echo "📥 Installing dependencies..."
npm install

# Step 4: Fix permissions
echo "🔐 Fixing permissions..."
chmod +x node_modules/.bin/* 2>/dev/null || true

# Step 5: Verify TypeScript installation
echo "✅ Verifying TypeScript installation..."
if [ -f "node_modules/.bin/tsc" ]; then
    echo "✅ TypeScript found"
    ls -la node_modules/.bin/tsc
else
    echo "❌ TypeScript not found!"
    exit 1
fi

# Step 6: Compile TypeScript
echo "🔨 Compiling TypeScript..."
./node_modules/.bin/tsc -p ./ || npx tsc -p ./

if [ $? -eq 0 ]; then
    echo "✅ Compilation successful"
else
    echo "❌ Compilation failed"
    exit 1
fi

# Step 7: Package extension
echo "📦 Packaging extension..."
./node_modules/.bin/vsce package || npx @vscode/vsce package

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

