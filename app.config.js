import 'dotenv/config';

export default {
  expo: {
    name: 'Bacchus',
    slug: 'Bacchus',
    owner: "dimaiodomenico95",
    version: '1.0.2',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#0c1620'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.bacchusapp.app',
      buildNumber: '160',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSSupportsLiveActivities: true,
        NSSupportsLiveActivitiesFrequentUpdates: true,
        UIBackgroundModes: ['fetch', 'remote-notification'],
        NSUserNotificationsUsageDescription: "This app needs notifications to keep you updated on your alcohol consumption.",
        NSCalendarsUsageDescription: "This app needs your calendar to track events.",
        NSCameraUsageDescription: "This app uses your camera for user profile pictures.",
        NSPhotoLibraryUsageDescription: "This app needs access to your photos for user profile pictures.",
      },
      associatedDomains: ['applinks:bacchus.app']
    },
    android: {
      package: 'com.bacchusapp.app',
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#0c1620'
      },
      permissions: [
        "android.permission.RECEIVE_BOOT_COMPLETED", 
        "android.permission.VIBRATE",
        "android.permission.SCHEDULE_EXACT_ALARM",
        "android.permission.POST_NOTIFICATIONS"
      ]
    },
    web: {
      bundler: 'metro',
      favicon: './assets/icon.png'
    },
    plugins: ['expo-router'],
    scheme: 'bacchus',
    experiments: {
      typedRoutes: true
    },
    updates: {
      url: "https://u.expo.dev/8b45518d-6d0c-4503-acb6-aed59b5675d9",
      enabled: true,
      fallbackToCacheTimeout: 0
    },
    runtimeVersion: "1.0.0",
    extra: {
      supabaseUrl: process.env.SUPABASE_URL || 'https://example.supabase.co',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'demo-key',
      eas: {
        projectId: "8b45518d-6d0c-4503-acb6-aed59b5675d9"
      }
    }
  }
}; 