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
      buildNumber: '196',
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
      supabaseUrl: 'https://egdpjqdsugbcoroclgys.supabase.co',
      supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZHBqcWRzdWdiY29yb2NsZ3lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTg5MjM0MzksImV4cCI6MjAxNDQ5OTQzOX0.hGyWUlOCmpRyRg-OdWVy6S-vLXgI2iq36OEjMZ4TbnA',
      eas: {
        projectId: "86fcd93e-98de-4626-ab02-186714a724d4"
      }
    }
  }
}; 