#!/bin/bash

# 🚀 BACCHUS BUILD & DEPLOY AUTOMATICO
# Questo script aggiorna il build number, fa la build, e pusha su GitHub
#
# FEATURES:
#   - Pulizia automatica cache locale ed EAS per evitare problemi
#   - Build number automatico
#   - Commit e push automatico
#   - Build production + submit TestFlight

set -e  # Esce se c'è un errore

echo "🔧 BACCHUS: Iniziando build e deploy automatico..."

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzione per log colorato
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Controlla se siamo nel repository git
if [ ! -d ".git" ]; then
    log_error "Non siamo in un repository git!"
    exit 1
fi

# Controlla se ci sono modifiche non committate
if [ -n "$(git status --porcelain)" ]; then
    log_warning "Ci sono modifiche non committate. Facendo commit automatico..."
    
    # Commit automatico delle modifiche
    git add .
    git commit -m "Build: Aggiornamento automatico build number e configurazioni"
    log_success "Commit automatico completato"
else
    log_info "Nessuna modifica da committare"
fi

# STEP 1: Aggiorna build number
log_info "STEP 1: Aggiornando build number..."

# Mostra il build number attuale
CURRENT_BUILD=$(grep "buildNumber:" app.config.js | grep -oE "[0-9]+" | head -1)
log_info "Build number attuale: $CURRENT_BUILD"

# Chiedi all'utente il nuovo build number
echo -e "${YELLOW}Inserisci il nuovo build number (o premi INVIO per auto-incremento a $((CURRENT_BUILD + 1))):${NC}"
read -r USER_BUILD_NUMBER

# Se l'utente non inserisce nulla, usa l'auto-incremento
if [ -z "$USER_BUILD_NUMBER" ]; then
    NEXT_BUILD=$((CURRENT_BUILD + 1))
    log_info "Usando auto-incremento: $NEXT_BUILD"
else
    NEXT_BUILD=$USER_BUILD_NUMBER
    log_info "Usando build number inserito: $NEXT_BUILD"
fi

./update-build-number.sh $NEXT_BUILD
if [ $? -eq 0 ]; then
    log_success "Build number aggiornato"
else
    log_error "Errore nell'aggiornamento build number"
    exit 1
fi

# STEP 2: Commit delle modifiche del build number
log_info "STEP 2: Committando aggiornamento build number..."
git add .
git commit -m "Build: Aggiornato build number per nuova build"
log_success "Build number committato"

# STEP 3: Push su GitHub
log_info "STEP 3: Pushando su GitHub..."
git push origin main
if [ $? -eq 0 ]; then
    log_success "Codice pushato su GitHub"
else
    log_error "Errore nel push su GitHub"
    exit 1
fi

# STEP 4: Pulizia cache locale
log_info "STEP 4: Pulizia cache locale..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .expo 2>/dev/null || true
log_success "Cache locale pulita"

# STEP 5: Build iOS con EAS
log_info "STEP 5: Avviando build iOS con EAS (con pulizia cache)..."
eas build --platform ios --profile production --non-interactive --clear-cache
if [ $? -eq 0 ]; then
    log_success "Build iOS con EAS completata"
else
    log_error "Errore nella build iOS con EAS"
    exit 1
fi

# STEP 6: Submit su App Store
log_info "STEP 6: Submitting su App Store..."
eas submit -p ios --latest
if [ $? -eq 0 ]; then
    log_success "Submit su App Store completato"
else
    log_error "Errore nel submit su App Store"
    log_info "Puoi riprovare manualmente con: eas submit -p ios --latest"
    exit 1
fi

# SUCCESSO COMPLETO
echo ""
log_success "🎉 BUILD & DEPLOY COMPLETATO CON SUCCESSO!"
log_success "📱 App buildata e submittata su TestFlight"
log_success "🌐 Codice aggiornato su GitHub"
log_success "🔢 Build number aggiornato automaticamente"
log_success "🧹 Cache pulita completamente"
echo ""
log_info "Prossimi passi:"
log_info "1. Controlla TestFlight per la nuova build"
log_info "2. Installa e testa l'app"
log_info "3. Verifica che i fix funzionino"
echo ""
