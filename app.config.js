import 'dotenv/config';

export default {
  expo: {
    name: 'AlcolTest',
    slug: 'AlcolTest',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff'
      }
    },
    web: {
      bundler: 'metro',
      favicon: './assets/favicon.png'
    },
    plugins: ['expo-router'],
    scheme: 'acme',
    experiments: {
      typedRoutes: true
    },
    newArchEnabled: true,
    extra: {
      supabaseUrl: process.env.SUPABASE_URL || 'https://example.supabase.co',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'demo-key',
      eas: {
        projectId: process.env.EAS_PROJECT_ID || ''
      }
    }
  }
}; 