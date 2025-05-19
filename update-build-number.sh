#!/bin/bash

# Script per aggiornare automaticamente il numero di build in tutti i file rilevanti
# Autore: Claude AI
# Uso: ./update-build-number.sh [NUMERO_BUILD]

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzione per stampare messaggi in modo consistente
print_status() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Controlla se è stato fornito un numero di build come argomento
if [ -z "$1" ]; then
  # Chiedi il numero di build all'utente
  echo -e "${BLUE}=== BACCHUS BUILD NUMBER UPDATER ===${NC}"
  echo -e "Questo script aggiornerà il numero di build in tutti i file rilevanti."
  read -p "Inserisci il nuovo numero di build: " BUILD_NUMBER
else
  BUILD_NUMBER=$1
fi

# Verifica che il numero di build sia valido (solo numeri)
if ! [[ "$BUILD_NUMBER" =~ ^[0-9]+$ ]]; then
  print_error "Il numero di build deve essere un numero intero positivo."
  exit 1
fi

print_status "Aggiornamento numero di build a: ${YELLOW}$BUILD_NUMBER${NC}"

# 1. Aggiorna app.config.js
print_status "Aggiornamento app.config.js..."
if [ -f "app.config.js" ]; then
  # Aggiorna iOS buildNumber
  sed -i '' "s/buildNumber: '[0-9]*'/buildNumber: '$BUILD_NUMBER'/g" app.config.js
  # Aggiorna Android versionCode
  sed -i '' "s/versionCode: [0-9]*/versionCode: $BUILD_NUMBER/g" app.config.js
  print_success "app.config.js aggiornato."
else
  print_error "app.config.js non trovato."
fi

# 2. Aggiorna Info.plist
print_status "Aggiornamento ios/Bacchus/Info.plist..."
if [ -f "ios/Bacchus/Info.plist" ]; then
  # Trova la riga con CFBundleVersion e aggiorna il numero nella riga successiva
  awk -v build="$BUILD_NUMBER" '
    /<key>CFBundleVersion<\/key>/ {
      print $0;
      getline;
      gsub(/>.*</, ">" build "<");
      print $0;
      next;
    }
    { print $0 }
  ' ios/Bacchus/Info.plist > ios/Bacchus/Info.plist.tmp
  mv ios/Bacchus/Info.plist.tmp ios/Bacchus/Info.plist
  print_success "ios/Bacchus/Info.plist aggiornato."
else
  print_error "ios/Bacchus/Info.plist non trovato."
fi

# 3. Aggiorna project.pbxproj
print_status "Aggiornamento ios/Bacchus.xcodeproj/project.pbxproj..."
if [ -f "ios/Bacchus.xcodeproj/project.pbxproj" ]; then
  # Aggiorna CURRENT_PROJECT_VERSION
  sed -i '' "s/CURRENT_PROJECT_VERSION = [0-9]*;/CURRENT_PROJECT_VERSION = $BUILD_NUMBER;/g" ios/Bacchus.xcodeproj/project.pbxproj
  print_success "ios/Bacchus.xcodeproj/project.pbxproj aggiornato."
else
  print_error "ios/Bacchus.xcodeproj/project.pbxproj non trovato."
fi

# 4. Aggiorna android/app/build.gradle
print_status "Aggiornamento android/app/build.gradle..."
if [ -f "android/app/build.gradle" ]; then
  # Aggiorna versionCode
  sed -i '' "s/versionCode [0-9]*/versionCode $BUILD_NUMBER/g" android/app/build.gradle
  print_success "android/app/build.gradle aggiornato."
else
  print_error "android/app/build.gradle non trovato."
fi

# 5. Aggiorna app/settings/index.tsx
print_status "Aggiornamento app/settings/index.tsx..."
if [ -f "app/settings/index.tsx" ]; then
  # Trova la riga con appBuild e aggiorna il valore predefinito
  sed -i '' "s/appBuild = Constants?.expoConfig?.ios?.buildNumber || '[0-9]*'/appBuild = Constants?.expoConfig?.ios?.buildNumber || '$BUILD_NUMBER'/g" app/settings/index.tsx
  print_success "app/settings/index.tsx aggiornato."
else
  print_error "app/settings/index.tsx non trovato."
fi

print_success "Aggiornamento completato! Tutti i file sono stati aggiornati con numero di build: ${YELLOW}$BUILD_NUMBER${NC}"
echo -e "${BLUE}=== RICORDA ===${NC}"
echo -e "Esegui ${YELLOW}git diff${NC} per verificare le modifiche apportate."
echo -e "Esegui ${YELLOW}git commit -am \"build: aggiornato numero di build a $BUILD_NUMBER\"${NC} per fare commit delle modifiche." 