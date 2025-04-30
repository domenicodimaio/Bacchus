const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Ottieni la configurazione di default di Expo
const defaultConfig = getDefaultConfig(__dirname);

// Configurazione per Metro e Expo
module.exports = {
  ...defaultConfig,
  // Assicurati che Metro trovi tutti i moduli
  watchFolders: [
    path.resolve(__dirname, 'node_modules'),
  ],
  resolver: {
    ...defaultConfig.resolver,
    sourceExts: [...defaultConfig.resolver.sourceExts, 'cjs', 'mjs'],
    // Supporta l'alias di Expo
    extraNodeModules: new Proxy({}, {
      get: (target, name) => {
        return path.join(__dirname, `node_modules/${name}`);
      }
    }),
  },
  transformer: {
    ...defaultConfig.transformer,
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
}; 