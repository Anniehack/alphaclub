
"use client";

import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { app, db, auth, firebaseInitialized } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

export async function requestNotificationPermission() {
    if (!firebaseInitialized || !(await isSupported())) {
        console.log("Firebase not initialized or notifications not supported.");
        return null;
    }

    const messaging = getMessaging(app);
    const currentUser = auth.currentUser;
    console.log("requestNotificationPermission called. Current user:", currentUser);

    if (!currentUser) {
        console.error("User not logged in, cannot request notification permission.");
        return null;

    }

    const currentPermission = Notification.permission;
    if (currentPermission === "granted") {
        console.log("Notification permission already granted.");
    } else if (currentPermission === "denied") {
        console.log("Notification permission has been denied.");

        return null;
    } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            console.log("Notification permission was not granted.");
            return null;
        }
    }
    console.log("Current notification permission:", currentPermission);

    try {
        const fcmToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        if (fcmToken) {
            console.log("FCM Token:", fcmToken);
            const userDocRef = doc(db, "users", currentUser.uid);
            await updateDoc(userDocRef, {
                fcmTokens: arrayUnion(fcmToken),

            });
            console.log("Successfully saved FCM token for user.");
            return fcmToken;
        } else {
            console.log("No registration token available. Request permission to generate one.");
            return null;

        }
    } catch (error) {
        console.error("An error occurred while retrieving or saving token: ", error);

        return null;
    }
}

// Listen for notifications when the app is in the foreground
export function onForegroundMessage(callback: (payload: any) => void) {
    if (!firebaseInitialized) return () => {};
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
        console.log("Foreground message received. ", payload);
        callback(payload);
    });
}
