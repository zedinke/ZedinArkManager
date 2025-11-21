#!/bin/bash
# Script to remove node_modules and .vsix files from git tracking

echo "🔧 Removing node_modules and .vsix files from git tracking..."

cd "$(dirname "$0")"

# Remove from git cache (keep files locally)
git rm -r --cached node_modules/ 2>/dev/null || true
git rm --cached *.vsix 2>/dev/null || true
git rm --cached package-lock.json 2>/dev/null || true

echo "✅ Removed from git tracking"
echo ""
echo "Now run: git commit -m 'chore: Remove node_modules and .vsix from git tracking'"
echo "Then: git pull origin main"

