#!/bin/bash

# 🚀 BACCHUS BUILD & DEPLOY AUTOMATICO
# Questo script aggiorna il build number, fa la build, e pusha su GitHub

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
./update-build-number.sh
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

# STEP 4: Build iOS
log_info "STEP 4: Avviando build iOS..."
eas build --platform ios --profile production --non-interactive
if [ $? -eq 0 ]; then
    log_success "Build iOS completata"
else
    log_error "Errore nella build iOS"
    exit 1
fi

# STEP 5: Submit su App Store
log_info "STEP 5: Submitting su App Store..."
eas submit -p ios --latest
if [ $? -eq 0 ]; then
    log_success "Submit su App Store completato"
else
    log_error "Errore nel submit su App Store"
    exit 1
fi

# SUCCESSO COMPLETO
echo ""
log_success "🎉 BUILD & DEPLOY COMPLETATO CON SUCCESSO!"
log_success "📱 App buildata e submittata su App Store"
log_success "🌐 Codice aggiornato su GitHub"
log_success "🔢 Build number aggiornato automaticamente"
echo ""
log_info "Prossimi passi:"
log_info "1. Controlla TestFlight per la nuova build"
log_info "2. Verifica su GitHub che le modifiche siano visibili"
log_info "3. Testa l'app se necessario"
echo ""
