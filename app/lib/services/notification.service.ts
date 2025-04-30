/**
 * Notification Service
 * 
 * Manages notifications in the application, including:
 * - BAC threshold alerts
 * - Reminder notifications
 * - Session status updates
 */
import * as Notifications from 'expo-notifications';
// Rimuoviamo l'import dell'enum che potrebbe causare problemi
// import { SchedulableTriggerInputTypes } from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getBACDangerLevel, BACDangerLevel } from '../bac/calculator';

// Mappa i livelli di BAC ai tipi usati per le notifiche
type NotificationDangerLevel = 'safe' | 'caution' | 'danger';

const mapBACLevelToNotificationType = (level: BACDangerLevel): NotificationDangerLevel => {
  switch(level) {
    case BACDangerLevel.DANGER:
    case BACDangerLevel.EXTREME:
      return 'danger';
    case BACDangerLevel.CAUTION:
      return 'caution';
    case BACDangerLevel.SAFE:
    default:
      return 'safe';
  }
};

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
    try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
    } catch (error) {
      console.error('Error setting up notification channel:', error);
    }
  }
  
  if (Device.isDevice) {
    try {
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
    } catch (error) {
      console.error('Error getting push token:', error);
    }
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
  try {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
    },
    trigger: trigger || null, // null means send immediately
  });
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
};

/**
 * Schedule a BAC alert notification
 */
export const scheduleBACAlert = async (
  bac: number,
  dangerLevel: NotificationDangerLevel
) => {
  try {
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
  } catch (error) {
    console.error('Error scheduling BAC alert:', error);
  }
};

/**
 * Schedule a reminder to log a drink
 */
export const scheduleLoggingReminder = async (minutes = 60) => {
  try {
    // Assicuriamoci che minutes sia almeno 1 minuto
    const safeMinutes = Math.max(1, minutes);
    
  await scheduleNotification(
    'Reminder: Update Your Drinks',
    'Have you had any drinks recently? Log them to keep your BAC tracking accurate.',
    { type: 'logging_reminder' },
      { 
        type: 'timeInterval', 
        seconds: safeMinutes * 60,
        repeats: false
      }
    );
  } catch (error) {
    console.error('Error scheduling logging reminder:', error);
  }
};

/**
 * Schedule a notification for when user will be sober
 */
export const scheduleSoberTimeNotification = async (soberTime: Date) => {
  try {
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
      { 
        type: 'date', 
        date: soberTime
      }
  );
  } catch (error) {
    console.error('Error scheduling sober time notification:', error);
  }
};

/**
 * Schedule a notification when BAC thresholds are crossed
 */
export const monitorBACThresholds = async (currentBAC: number, previousBAC: number) => {
  try {
    const currentBACLevel = getBACDangerLevel(currentBAC);
    const previousBACLevel = getBACDangerLevel(previousBAC);
    
    // Mappa il livello BAC al tipo di notifica
    const currentLevel = mapBACLevelToNotificationType(currentBACLevel);
    const previousLevel = mapBACLevelToNotificationType(previousBACLevel);
  
  // Only notify when crossing thresholds
  if (currentLevel !== previousLevel) {
    await scheduleBACAlert(currentBAC, currentLevel);
    }
  } catch (error) {
    console.error('Error monitoring BAC thresholds:', error);
  }
};

/**
 * Dismiss all scheduled notifications
 */
export const dismissAllNotifications = async () => {
  try {
  await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error dismissing notifications:', error);
  }
};

/**
 * Listen for notification events
 */
export const addNotificationResponseListener = (
  callback: (response: Notifications.NotificationResponse) => void
) => {
  try {
  return Notifications.addNotificationResponseReceivedListener(callback);
  } catch (error) {
    console.error('Error adding notification response listener:', error);
    return {
      remove: () => {}
    };
  }
};

/**
 * Get all pending notifications
 */
export const getPendingNotifications = async () => {
  try {
  return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting pending notifications:', error);
    return [];
  }
}; 