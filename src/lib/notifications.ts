import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const initializeNotifications = async () => {
  if (Capacitor.isNativePlatform()) {
    // Request permissions
    let permStatus = await PushNotifications.requestPermissions();
    
    if (permStatus.receive === 'granted') {
      // Register with FCM
      await PushNotifications.register();
    }

    // Add listeners
    PushNotifications.addListener('registration', (token) => {
      console.log('Registration token: ', token.value);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received: ', notification);
      
      // Show local notification with sound/vibration
      LocalNotifications.schedule({
        notifications: [{
          title: notification.title || 'New Notification',
          body: notification.body || 'You have a new message',
          id: Date.now(),
          sound: 'default',
          vibrate: true,
        }]
      });
    });
  }
};