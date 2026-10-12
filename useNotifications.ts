import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

// 1. Tell the app how to handle notifications when the app is actively open
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true, // NEW EXPO REQUIREMENT
        shouldShowList: true,   // NEW EXPO REQUIREMENT
    }),
});

export function useNotifications() {
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
    const notificationListener = useRef<any>(null);
    const responseListener = useRef<any>(null);

    useEffect(() => {
        // Only run this if a user is currently logged in
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;

        registerForPushNotificationsAsync().then(async (token) => {
            setExpoPushToken(token);
            
            if (token) {
                // Save the token to Firebase so other users can find this device
                const userRef = doc(db, 'users', uid);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                    await updateDoc(userRef, { pushToken: token });
                } else {
                    await setDoc(userRef, { pushToken: token }, { merge: true });
                }
            }
        });

        // 2. Listeners for when the notification is received or tapped
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log("Notification received in foreground!", notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log("User tapped the notification!", response);
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove(); // NEW EXPO METHOD
            }
            if (responseListener.current) {
                responseListener.current.remove(); // NEW EXPO METHOD
            }
        };
    }, []);

    return { expoPushToken };
}

// The core logic to ask the operating system for permission
async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#6750A4', 
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
            return undefined;
        }

        try {
            // Expo needs a project ID to generate the token
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        } catch (e) {
            console.log("Error getting push token", e);
        }
    } else {
        console.log('Must use a physical device for Push Notifications');
    }

    return token;
}