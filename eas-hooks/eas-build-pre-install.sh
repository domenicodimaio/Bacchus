#!/bin/bash

echo "🔧 EAS Pre-Install Hook: Installing CocoaPods dependencies..."

# Navigate to iOS directory
cd ios

# Install pods with repo update to ensure latest dependencies
echo "📦 Running pod install..."
pod install --repo-update

# Verify that xcconfig files exist
echo "✅ Verifying xcconfig files..."
if [ -f "Pods/Target Support Files/Pods-Bacchus/Pods-Bacchus.release.xcconfig" ]; then
    echo "✅ Pods-Bacchus.release.xcconfig found"
else
    echo "❌ Pods-Bacchus.release.xcconfig NOT found"
    exit 1
fi

if [ -f "Pods/Target Support Files/Pods-BacchusWidgetExtension/Pods-BacchusWidgetExtension.release.xcconfig" ]; then
    echo "✅ Pods-BacchusWidgetExtension.release.xcconfig found"
else
    echo "❌ Pods-BacchusWidgetExtension.release.xcconfig NOT found"
    exit 1
fi

echo "🎉 CocoaPods installation completed successfully!"
