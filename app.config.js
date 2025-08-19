export default {
  expo: {
    name: 'Bacchus',
    slug: 'Bacchus',
    owner: "domenicodimaio",
    version: '1.2.2',
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
      bundleIdentifier: 'com.bacchusapp.app',
      buildNumber: '1003',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSSupportsLiveActivities: true,
        NSSupportsLiveActivitiesFrequentUpdates: true,
        UIBackgroundModes: ['fetch', 'remote-notification', 'background-processing'],
        NSUserNotificationsUsageDescription: "This app needs notifications to keep you updated on your alcohol consumption.",
        NSCalendarsUsageDescription: "This app needs your calendar to track events.",
        NSCameraUsageDescription: "This app uses your camera for user profile pictures.",
        NSPhotoLibraryUsageDescription: "This app needs access to your photos for user profile pictures.",
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              "bacchus",
              "com.bacchusapp.app",
            ],
          },
        ],
        "com.apple.developer.applesignin": ["Default"],
      },
      associatedDomains: ['applinks:bacchus.app']
    },
    android: {
      package: 'com.bacchusapp.app',
      versionCode: 1003,
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#0c1620'
      },
      permissions: [
        "android.permission.RECEIVE_BOOT_COMPLETED", 
        "android.permission.VIBRATE",
        "android.permission.SCHEDULE_EXACT_ALARM",
        "android.permission.POST_NOTIFICATIONS"
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "bacchus",
            },
            {
              scheme: "com.bacchusapp.app",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      bundler: 'metro',
      favicon: './assets/icon.png'
    },
    plugins: [
      'expo-router',
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
          },
        },
      ],
    ],
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
      supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZHBqcWRzdWdiY29yb2NsZ3lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NTg0MTUsImV4cCI6MjA1ODAzNDQxNX0.VNZ0L4a7yixOk3oATyAz-bCDsohhuNE5ohQdV363xWM',
      bundleIdentifier: 'com.bacchusapp.app',
      eas: {
        projectId: "96b7f8cb-b419-4770-9912-693ddb0b2577"
      }
    }
  }
}; 