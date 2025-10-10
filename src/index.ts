import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

export const notifyNewMission = onDocumentCreated('missions/{missionId}', async (event) => {
  const mission = event.data;
  if (!mission) return;

  const obcSnapshot = await db.collection('obcRegistrations').where('active', '==', true).get();
  const tokens = obcSnapshot.docs
    .map(doc => doc.data().fcmToken)
    .filter(token => !!token);

  if (tokens.length === 0) return;

  const message = {
    notification: {
      title: 'New Mission Available',
      body: `Mission "${mission.title}" is now available. Apply now!`,
    },
    tokens,
    data: {
      missionId: event.params.missionId,
    },
  };

  const response = await messaging.sendMulticast(message);
  console.log(`Notifications sent: ${response.successCount} successful, ${response.failureCount} failed.`);
});
