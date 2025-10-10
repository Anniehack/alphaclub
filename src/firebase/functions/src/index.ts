

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { Message, getMessaging } from "firebase-admin/messaging";

// Initialize the Admin SDK
admin.initializeApp();

const db = admin.firestore();
const fcm = getMessaging();

/**
 * Triggered when a new chat message is created.
 * Creates a notification document for each participant in the chat (except the sender).
 */
export const createChatMessageNotification = onDocumentCreated("conversations/{conversationId}/messages/{messageId}", async (event) => {
    const { conversationId } = event.params;
    const messageData = event.data?.data();

    if (!messageData) {
      logger.error("No data associated with the message event");
      return;
    }

    const { senderId, text, senderName } = messageData;

    try {
      // Get conversation details to find participants
      const conversationRef = db.collection("conversations").doc(conversationId);
      const conversationDoc = await conversationRef.get();

      if (!conversationDoc.exists) {
        logger.error(`Conversation document ${conversationId} not found.`);
        return;
      }

      const conversationData = conversationDoc.data();
      if (!conversationData || !conversationData.participants) {
          logger.error(`Conversation data or participants missing for ${conversationId}`);
          return;
      }
      
      const allParticipantIds = Object.keys(conversationData.participants);
      const senderIsAdmin = conversationData.participants[senderId]?.role === 'admin';
      
      const recipients: string[] = allParticipantIds.filter(id => {
        // A user should never be notified of their own message
        if (id === senderId) return false;

        const participantIsAdmin = conversationData.participants[id]?.role === 'admin';

        // Case 1: Sender is an admin. Notify only non-admins.
        if (senderIsAdmin) {
            return !participantIsAdmin;
        } 
        // Case 2: Sender is not an admin. Notify only admins.
        else {
            return participantIsAdmin;
        }
      });


      const notificationPayload = {
        message: `New message from ${senderName}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
        type: 'mission_update' as const,
        relatedId: conversationId,
        read: false,
        createdAt: new Date().toISOString(),
      };

      const promises = recipients.map(async (userId) => {
        const userNotificationsCol = db.collection(`users/${userId}/notifications`);
        await userNotificationsCol.add(notificationPayload);

        // Capping logic: keep only the 10 most recent notifications.
        const notificationsQuery = userNotificationsCol.orderBy('createdAt', 'desc');
        const snapshot = await notificationsQuery.get();
        if (snapshot.docs.length > 10) {
            const batch = db.batch();
            for(let i = 10; i < snapshot.docs.length; i++) {
                batch.delete(snapshot.docs[i].ref);
            }
            await batch.commit();
        }
      });

      await Promise.all(promises);
      logger.log(`Notifications created for ${recipients.length} users in conversation ${conversationId}.`);

    } catch (error) {
      logger.error("Error creating chat message notifications:", error);
    }
  });


/**
 * Triggered when a new notification is created for a user.
 * It sends a push notification to the user's registered devices.
 */
export const sendPushNotification = onDocumentCreated("users/{userId}/notifications/{notificationId}", async (event) => {
    const { userId } = event.params;
    const notificationData = event.data?.data();

    if (!notificationData) {
      logger.error("No data associated with the event");
      return;
    }

    const { message, type } = notificationData;

    logger.log(`New notification for user ${userId}:`, message);

    try {
      // Get the user's FCM tokens from their document
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        logger.error(`User document for ${userId} not found.`);
        return;
      }

      const userData = userDoc.data();
      const tokens = userData?.fcmTokens;

      if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
        logger.log(`User ${userId} has no FCM tokens.`);
        return;
      }

      const payload: Message = {
        notification: {
          title: "AlphaClub Alert",
          body: message,
        },
        webpush: {
            notification: {
                icon: "https://firebasestorage.googleapis.com/v0/b/alphaclub-ev7kl.firebasestorage.app/o/icon-192x192.png?alt=media&token=0681b568-15f8-42c9-ba26-4625d5bf9cbf",
                badge: "/icon-96x96.png",
                vibrate: [200, 100, 200],
                sound: 'default' // Added sound option for webpush
            }
        },
        android: {
            notification: {
                sound: 'default'
            }
        },
        apns: {
            payload: {
                aps: {
                    sound: 'default'
                }
            }
        },
        data: {
            type: type || "generic",
            click_action: `https://alphaclub-ev7kl.web.app/dashboard`,
        },
        token: tokens[0] // sendToDevice is deprecated, sending one by one
      };
      
      const tokensToRemove: string[] = [];

      const responses = await Promise.all(tokens.map((token: string) => {
          const messagePayload = {...payload, token };
          logger.log('FCM Payload:', messagePayload);
          return fcm.send(messagePayload, true) // Pass true to enable dryRun for testing if needed
              .catch(error => {
                  logger.error("Failure sending notification to", token, error);
                  // Cleanup the tokens that are not registered anymore.
                  if (error.code === 'messaging/invalid-registration-token' ||
                      error.code === 'messaging/registration-token-not-registered') {
                      tokensToRemove.push(token);
                  }
                  return null; // Return null for failed sends
              });
      }));

      logger.log(`Sent ${responses.filter(r => r).length} notifications successfully.`);

      if (tokensToRemove.length > 0) {
        logger.log("Cleaning up invalid tokens:", tokensToRemove);
        const updatedTokens = tokens.filter((t: string) => !tokensToRemove.includes(t));
        await userRef.update({ fcmTokens: updatedTokens });
      }

    } catch (error) {
      logger.error("Error sending push notification:", error);
    }
  });

