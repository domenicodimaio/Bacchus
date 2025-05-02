#!/bin/bash

# Script per incrementare automaticamente il numero di build iOS in tutti i file necessari

# Prendi il numero di build corrente da Info.plist
CURRENT_BUILD=$(grep -A 1 CFBundleVersion ios/Bacchus/Info.plist | tail -1 | sed 's/[^0-9]*//g')

# Incrementa il numero di build
NEW_BUILD=$((CURRENT_BUILD + 1))

echo "Incremento numero build da $CURRENT_BUILD a $NEW_BUILD..."

# 1. Aggiorna app.config.js
sed -i '' "s/ios: {[^}]*buildNumber: [\"']$CURRENT_BUILD[\"']/ios: { buildNumber: '$NEW_BUILD'/g" app.config.js

# 2. Aggiorna Info.plist
sed -i '' "s/<string>$CURRENT_BUILD<\/string>/<string>$NEW_BUILD<\/string>/g" ios/Bacchus/Info.plist 

# 3. Aggiorna project.pbxproj
sed -i '' "s/CURRENT_PROJECT_VERSION = $CURRENT_BUILD/CURRENT_PROJECT_VERSION = $NEW_BUILD/g" ios/Bacchus.xcodeproj/project.pbxproj

echo "✅ Build number aggiornato a $NEW_BUILD in tutti i file!"
echo "   - app.config.js"
echo "   - ios/Bacchus/Info.plist"
echo "   - ios/Bacchus.xcodeproj/project.pbxproj" 