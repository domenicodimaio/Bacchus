# Bacchus - Blood Alcohol Concentration Calculator

Bacchus is a mobile application designed to estimate and track your blood alcohol concentration (BAC) in real-time. It enables users to log their food and alcohol consumption in detail, providing calculations based on scientific formulas while offering a modern and intuitive user interface.

## Features

- **Dual-Mode Operation**:
  - **Advanced Mode**: Precise BAC estimates with detailed input for alcoholic beverages and food
  - **Simple Mode**: Quick estimates for casual users without requiring precise details

- **Multi-Profile Management**:
  - Create and manage multiple profiles with different physiological parameters
  - Personalized BAC calculations based on weight, gender, age, and drinking habits

- **Real-Time BAC Monitoring**:
  - Dynamic updates as you log drinks and food
  - Timeline visualization of BAC evolution during a session

- **Comprehensive Consumption Logging**:
  - Track beverages with volume, alcohol percentage, and time consumed
  - Log food intake to factor in its effect on alcohol absorption

- **Safety Notifications**:
  - Visual indicators for BAC levels (safe, caution, danger)
  - Awareness of legal driving limits

## Technology

Bacchus is built with modern technologies:

- **React Native & Expo**: Cross-platform compatibility for iOS and Android
- **TypeScript**: Type-safe code for reliability
- **Expo Router**: File-based navigation system
- **React Native Paper**: Material Design components

## BAC Calculation

The app uses an enhanced version of the Widmark formula, adjusted for factors such as:

- Gender-specific alcohol distribution ratios
- Metabolic rate variations based on drinking frequency
- Food intake effects on alcohol absorption
- Time-based elimination of alcohol from the bloodstream

## Getting Started

### Prerequisites

- Node.js (v16 or newer)
- npm or yarn
- Expo CLI

### Installation

```sh
# Clone the repository
git clone https://github.com/yourusername/bacchus.git
cd bacchus

# Install dependencies
npm install

# Start the development server
npm start
```

## Disclaimer

This application provides BAC estimates for educational and informational purposes only. It is not a medical device and should not be used to determine if you are fit to drive or operate machinery. Always err on the side of caution and never drink and drive.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Incrementare il Numero di Build iOS

Per risolvere il problema del numero di build per le submission ad App Store Connect, usa lo script automatico incluso nel progetto:

```bash
# Incrementa automaticamente il numero di build in tutti i file necessari
./update-build-number.sh
```

Lo script aggiorna automaticamente:
1. `app.config.js`
2. `ios/Bacchus/Info.plist`
3. `ios/Bacchus.xcodeproj/project.pbxproj`

Esegui questo script PRIMA di lanciare `eas build` per assicurarti che tutti i file abbiano lo stesso numero di build incrementato.

## Build e Submit con Numero Corretto

```bash
# 1. Incrementa il numero di build
./update-build-number.sh

# 2. Fai commit delle modifiche
git add .
git commit -m "Incremento build number"

# 3. Esegui la build
eas build --platform ios --profile production

# 4. Invia all'App Store
eas submit -p ios --latest
```
