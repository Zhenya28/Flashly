import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure behavior (show alert even if app is foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Notification Service Mock
// Disabled because Personal Development Teams do not support Push Notifications capability.

export const NotificationService = {
  async registerForPushNotificationsAsync() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // Just check permissions, no device check or token needed for local-only
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return null;
    }
    
    // Return something truthy to indicate success, or null if failed
    return "granted";
  },

  async scheduleDailyReminder(hour: number = 18, minute: number = 0) {
    // Cancel existing to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Czas na naukę! 🎓",
        body: "Twoja codzienna seria czeka. Powtórz słówka i bądź lepszy niż wczoraj!",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  },

  async cancelAll() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
};
