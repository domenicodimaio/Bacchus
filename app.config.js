import 'dotenv/config';

export default {
  expo: {
    name: 'Bacchus',
    slug: 'bacchus',
    owner: "domenicodimaio9595",
    version: '1.2.1',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#0c2348'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.domenicodimaio.bacchus',
      buildNumber: '190',
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
      enabled: true,
      fallbackToCacheTimeout: 0
    },
    runtimeVersion: "1.0.0",
    extra: {
      supabaseUrl: process.env.SUPABASE_URL || 'https://example.supabase.co',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'demo-key',
      eas: {
        projectId: "86fcd93e-98de-4626-ab02-186714a724d4"
      }
    }
  }
}; 