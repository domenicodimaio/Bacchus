/**
 * Notification Service
 * 
 * Manages notifications in the application, including:
 * - BAC threshold alerts
 * - Reminder notifications
 * - Session status updates
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getBACDangerLevel } from '../bac/calculator';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Register for push notifications
 */
export const registerForPushNotificationsAsync = async () => {
  let token;
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
  
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }
  
  return token;
};

/**
 * Schedule a local notification
 */
export const scheduleNotification = async (
  title: string,
  body: string,
  data?: any,
  trigger?: Notifications.NotificationTriggerInput
) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
    },
    trigger: trigger || null, // null means send immediately
  });
};

/**
 * Schedule a BAC alert notification
 */
export const scheduleBACAlert = async (
  bac: number,
  dangerLevel: 'safe' | 'caution' | 'danger'
) => {
  let title = '';
  let body = '';
  
  switch (dangerLevel) {
    case 'danger':
      title = 'Critical BAC Level Alert';
      body = `Your BAC has reached ${bac.toFixed(2)} g/L, which is above the legal limit. Do not drive or operate machinery. Stay safe!`;
      break;
    case 'caution':
      title = 'BAC Level Warning';
      body = `Your BAC is now ${bac.toFixed(2)} g/L, which is approaching the legal limit. Be cautious and consider stopping alcohol consumption.`;
      break;
    case 'safe':
      // Don't notify for safe levels
      return;
  }
  
  await scheduleNotification(title, body, { type: 'bac_alert', bac, dangerLevel });
};

/**
 * Schedule a reminder to log a drink
 */
export const scheduleLoggingReminder = async (minutes = 60) => {
  await scheduleNotification(
    'Reminder: Update Your Drinks',
    'Have you had any drinks recently? Log them to keep your BAC tracking accurate.',
    { type: 'logging_reminder' },
    { seconds: minutes * 60 } // trigger after specified minutes
  );
};

/**
 * Schedule a notification for when user will be sober
 */
export const scheduleSoberTimeNotification = async (soberTime: Date) => {
  const now = new Date();
  const diffMs = soberTime.getTime() - now.getTime();
  
  // Only schedule if sober time is in the future
  if (diffMs <= 0) {
    return;
  }
  
  const soberTimeString = soberTime.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  await scheduleNotification(
    'Sobriety Projection',
    `Based on your current consumption, your BAC should return to 0.00 by approximately ${soberTimeString}.`,
    { type: 'sober_time_notification' },
    { date: soberTime }
  );
};

/**
 * Schedule a notification when BAC thresholds are crossed
 */
export const monitorBACThresholds = async (currentBAC: number, previousBAC: number) => {
  const currentLevel = getBACDangerLevel(currentBAC);
  const previousLevel = getBACDangerLevel(previousBAC);
  
  // Only notify when crossing thresholds
  if (currentLevel !== previousLevel) {
    await scheduleBACAlert(currentBAC, currentLevel);
  }
};

/**
 * Dismiss all scheduled notifications
 */
export const dismissAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * Listen for notification events
 */
export const addNotificationResponseListener = (
  callback: (response: Notifications.NotificationResponse) => void
) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

/**
 * Get all pending notifications
 */
export const getPendingNotifications = async () => {
  return await Notifications.getAllScheduledNotificationsAsync();
}; 