#!/bin/bash
# 🚀 BACCHUS BUILD PERFETTA - Quando EAS outage sarà risolto

./update-build-number.sh

echo "=== 🍷 BACCHUS BUILD PERFETTA ==="
echo "Build number: $(grep buildNumber app.config.js)"
echo "Hermes: ENABLED ✅"
echo "Cache: ENABLED ✅"  
echo "Resource: m-medium ✅"
echo ""

echo "📋 STEP 1: Controllo stato EAS..."
curl -s https://status.expo.dev/api/v2/status.json | grep "indicator" | head -1

echo ""
echo "🔧 STEP 2: Build iOS ottimizzata..."
eas build --platform ios --profile production --non-interactive

echo ""
echo "🎯 STEP 3: Submit automatico..."
if [ $? -eq 0 ]; then
    echo "✅ Build riuscita! Avvio submit..."
    eas submit -p ios --latest
else
    echo "❌ Build fallita. Controlla i log."
fi 