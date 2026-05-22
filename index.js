/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Register background FCM handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('[FCM Background] Message received:', remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
