// scripts/setup-widgets.js
// Script per configurare l'estensione widget nel progetto Xcode
// Questo script dovrebbe essere eseguito dopo 'expo prebuild'

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const XCODEPROJ_PATH = path.join(__dirname, '..', 'ios', 'Bacchus.xcodeproj');
const WIDGET_EXTENSION_PATH = path.join(__dirname, '..', 'ios', 'BACWidgetExtension');

console.log('Configurazione dell\'estensione widget per iOS...');

function setupWidgetExtension() {
  // Verifica se il progetto Xcode esiste
  if (!fs.existsSync(XCODEPROJ_PATH)) {
    console.error('Il progetto Xcode non esiste. Esegui prima "npx expo prebuild".');
    process.exit(1);
  }

  // Verifica se la directory dell'estensione widget esiste
  if (!fs.existsSync(WIDGET_EXTENSION_PATH)) {
    console.log('Directory dell\'estensione widget non trovata, la stiamo creando...');
    fs.mkdirSync(WIDGET_EXTENSION_PATH, { recursive: true });
  }

  // Copia i file dell'estensione widget nella directory di destinazione
  console.log('Copia dei file dell\'estensione widget...');
  
  try {
    // Copia il file entitlements
    const entitlementsContent = fs.readFileSync(
      path.join(__dirname, '..', 'ios', 'BACWidgetExtension', 'BACWidgetExtension.entitlements'),
      'utf8'
    );
    
    fs.writeFileSync(
      path.join(WIDGET_EXTENSION_PATH, 'BACWidgetExtension.entitlements'),
      entitlementsContent
    );
    
    console.log('File entitlements copiato con successo.');
    
    // Istruzioni per aggiungere l'estensione widget al progetto Xcode
    console.log(`
========================================
L'impostazione dell'estensione widget è completa!

Ora devi:
1. Aprire il progetto Xcode: npx expo run:ios
2. In Xcode, clicca su "File" > "New" > "Target..."
3. Seleziona "Widget Extension" e clicca su "Next"
4. Inserisci "BACWidgetExtension" come nome
5. Deseleziona "Include configuration intent" e clicca su "Finish"
6. Aggiungi il gruppo App Groups "group.com.bacchus.app" per entrambi i target

Poi, sostituisci i file creati con quelli nella directory "ios/BACWidgetExtension":
- BACWidget.swift
- BACLiveActivity.swift
- BACWidgetBundle.swift

========================================
    `);
    
  } catch (error) {
    console.error('Errore durante la configurazione dell\'estensione widget:', error);
    process.exit(1);
  }
}

setupWidgetExtension(); 