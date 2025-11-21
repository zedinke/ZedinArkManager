#!/bin/bash

# Fix permissions for node_modules binaries
echo "🔧 Fixing permissions for node_modules binaries..."

cd ~/ZedinArkManager/extension

# Fix permissions for all binaries in node_modules/.bin
if [ -d "node_modules/.bin" ]; then
    chmod +x node_modules/.bin/*
    echo "✅ Permissions fixed for node_modules/.bin"
else
    echo "⚠️  node_modules/.bin not found, installing dependencies..."
    npm install
    chmod +x node_modules/.bin/*
fi

# Also fix TypeScript compiler if installed globally
if command -v tsc &> /dev/null; then
    echo "✅ TypeScript compiler found in PATH"
else
    echo "ℹ️  TypeScript compiler not in PATH, using local version"
fi

echo "✅ Done! Try running 'npm run compile' again."

