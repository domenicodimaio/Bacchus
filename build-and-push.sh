#!/bin/bash

# 🚀 BACCHUS BUILD & PUSH AUTOMATICO
# Versione semplificata: build + push GitHub (senza submit)

set -e

echo "🔧 BACCHUS: Build e push automatico..."

# Colori
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Commit automatico se ci sono modifiche
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${BLUE}ℹ️  Commit automatico modifiche...${NC}"
    git add .
    git commit -m "Build: Aggiornamento automatico $(date +%Y-%m-%d)"
fi

# Aggiorna build number
./update-build-number.sh

# Commit build number
git add .
git commit -m "Build: Aggiornato build number $(date +%Y-%m-%d)"

# Push su GitHub
git push origin main

# Build iOS
eas build --platform ios --profile production --non-interactive

echo -e "${GREEN}✅ BUILD & PUSH COMPLETATO!${NC}"
echo "📱 App buildata e codice pushato su GitHub"
