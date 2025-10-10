

import { db, storage } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, query, where, addDoc, updateDoc, setDoc, orderBy, onSnapshot, serverTimestamp, Timestamp, writeBatch, limit, runTransaction, deleteDoc, arrayUnion } from 'firebase/firestore';
import type { Mission, OBC, User, UserDocument, InviteCode, MissionApplication, Conversation, ChatMessage, ExpenseReport, ExpenseItem, Notification, Currency, NotificationType, ExpenseCategory, UserComment } from '@/types';
import { sendWelcomeEmail } from '@/ai/flows/send-welcome-email';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function ensureDb() {
    if (!db) {
        throw new Error("Firebase is not initialized. Please check your .env file.");
    }
    return db;
}

export async function getAllMissions(): Promise<Mission[]> {
  const firestoreDb = ensureDb();
  const missionsCol = collection(firestoreDb, 'missions');
  const q = query(missionsCol, orderBy("missionDate", "desc"));
  const missionSnapshot = await getDocs(q);
  const missionList = missionSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mission));
  return missionList;
}

export function onMissionsUpdate(callback: (missions: Mission[]) => void): () => void {
    const firestoreDb = ensureDb();
    const missionsCol = collection(firestoreDb, 'missions');
    const q = query(missionsCol, orderBy("missionDate", "desc"));
    
    return onSnapshot(q, (snapshot) => {
        const missions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mission));
        callback(missions);
    }, (error) => {
        console.error("Error listening to mission updates:", error);
    });
}

export async function getPendingMissions(): Promise<Mission[]> {
  const firestoreDb = ensureDb();
  const missionsCol = collection(firestoreDb, 'missions');
  const q = query(missionsCol, where("status", "==", "Pending"));
  const missionSnapshot = await getDocs(q);
  const missionList = missionSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mission));

  missionList.sort((a, b) => {
    if (a.missionDate && b.missionDate) {
      return new Date(b.missionDate).getTime() - new Date(a.missionDate).getTime();
    }
    if (a.missionDate) return -1;
    if (b.missionDate) return 1;
    return 0;
  });

  return missionList;
}

export async function applyForMission(mission: Mission, user: User): Promise<void> {
    const firestoreDb = ensureDb();
    const application: Omit<MissionApplication, 'id'> = {
        missionId: mission.id,
        missionTitle: mission.title,
        serviceType: mission.serviceType || [],
        obcId: user.id,
        obcName: user.name,
        obcNumber: user.obcNumber || 'N/A',
        applicationDate: new Date().toISOString(),
        status: 'pending',
    };
    await addDoc(collection(firestoreDb, 'missionApplications'), application);
}

export async function getActiveMissionForOBC(obcId: string): Promise<Mission | null> {
    const firestoreDb = ensureDb();
    const missionsCol = collection(firestoreDb, 'missions');
    const q = query(missionsCol, where("obcIds", "array-contains", obcId), where("status", "in", ["Booked", "Completed"]), limit(1));
    const missionSnapshot = await getDocs(q);
    if (missionSnapshot.empty) {
        return null;
    }
    const missionDoc = missionSnapshot.docs[0];
    return { id: missionDoc.id, ...missionDoc.data() } as Mission;
}

export async function getMissionsForOBC(obcId: string): Promise<Mission[]> {
    const firestoreDb = ensureDb();
    const missionsCol = collection(firestoreDb, 'missions');
    const q = query(missionsCol, where("obcIds", "array-contains", obcId));
    const missionSnapshot = await getDocs(q);
    const missionList = missionSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mission));
    
    return missionList.sort((a, b) => {
        if (a.status === 'Booked' && b.status !== 'Booked') return -1;
        if (a.status !== 'Booked' && b.status === 'Booked') return 1;
        return 0;
    });
}

export async function getAllOBCs(): Promise<(OBC & User)[]> {
    const firestoreDb = ensureDb();
    const usersCol = collection(firestoreDb, 'users');
    const q = query(usersCol, where("role", "==", "obc"), where("registrationStatus", "==", "approved"));
    const obcSnapshot = await getDocs(q);
    
    const obcList = obcSnapshot.docs.map(doc => {
        const userData = doc.data();
        return {
            id: doc.id,
            obcId: doc.id,
            name: userData.name || 'Unknown OBC',
            avatar: userData.avatar || '',
            currentLocation: userData.currentLocation || 'Unknown', 
            availability: userData.availability || 'Unavailable', 
            specialization: userData.specialization || 'General',
            passportExpiry: userData.passportExpiry || 'N/A',
            visaExpiry: userData.visaExpiry || 'N/A',
            location: userData.location || null,
            registrationStatus: userData.registrationStatus || 'approved',
            ...userData
        } as OBC & User;
    });
    return obcList;
}

export function onOBCProfileUpdate(userId: string, callback: (profile: OBC | null) => void): () => void {
    const firestoreDb = ensureDb();
    const userDocRef = doc(firestoreDb, 'users', userId);

    const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists() && doc.data().role === 'obc') {
            const userData = doc.data();
            const profile = {
                id: doc.id,
                obcId: doc.id,
                name: userData.name || 'Unknown OBC',
                avatar: userData.avatar || '',
                currentLocation: userData.currentLocation || 'Unknown',
                availability: userData.availability || 'Unavailable',
                specialization: userData.specialization || 'General',
                passportExpiry: userData.passportExpiry || 'N/A',
                visaExpiry: userData.visaExpiry || 'N/A',
                location: userData.location || null,
                registrationStatus: userData.registrationStatus || 'approved',
                ...userData
            } as OBC & User;
            callback(profile);
        } else {
            callback(null);
        }
    });

    return unsubscribe;
}

export async function getPendingOBCs(): Promise<User[]> {
    const firestoreDb = ensureDb();
    const usersCol = collection(firestoreDb, 'users');
    const q = query(usersCol, where("role", "==", "obc"), where("registrationStatus", "==", "pending"));
    const obcSnapshot = await getDocs(q);
    const obcList = obcSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    return obcList;
}

export async function approveOBC(userId: string, name: string): Promise<void> {
    const firestoreDb = ensureDb();
    const userRef = doc(firestoreDb, 'users', userId);

    try {
        const safeName = name || "NA";
        const initials = safeName.split(' ').map(n => n[0]).join('').toUpperCase() || 'NA';
        const timestampPart = Date.now().toString().slice(-6);

        const newObcNumber = `${initials}${timestampPart}`;

        await updateDoc(userRef, {
            registrationStatus: 'approved',
            obcNumber: newObcNumber,
        });

        // Email sending logic is outside the critical path.
        try {
            const userDoc = await getDoc(userRef);
            const userEmail = userDoc.data()?.email;
            const userName = userDoc.data()?.name || "New Courier";

            if (userEmail) {
                await sendWelcomeEmail({
                    name: userName,
                    email: userEmail,
                    obcNumber: newObcNumber,
                });
            } else {
                console.error(`Could not send welcome email for user ${userId} because no email was found.`);
            }
        } catch (emailError) {
            // Log the error but don't fail the entire approval if email fails.
            console.error("Welcome email failed to send, but the OBC was approved successfully.", emailError);
        }
    } catch (e) {
        console.error("OBC approval failed: ", e);
        // Re-throw the error to be caught by the calling function in the UI.
        throw e;
    }
}

export async function getUserDocuments(userId: string): Promise<UserDocument[]> {
    const firestoreDb = ensureDb();
    const documentsCol = collection(firestoreDb, `users/${userId}/documents`);
    const docSnapshot = await getDocs(documentsCol);
    const docList = docSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDocument));
    return docList;
}

export async function getOBCProfile(userId: string): Promise<(OBC & User) | null> {
    const firestoreDb = ensureDb();
    const userDocRef = doc(firestoreDb, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists() || userDoc.data().role !== 'obc') {
        return null;
    }
    return { id: userDoc.id, obcId: userDoc.id, ...userDoc.data() } as (OBC & User);
}

export async function getAllUsers(): Promise<User[]> {
    const firestoreDb = ensureDb();
    const usersCol = collection(firestoreDb, 'users');
    const userSnapshot = await getDocs(usersCol);
    const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    return userList;
}

export async function getUser(userId: string): Promise<User | null> {
    const firestoreDb = ensureDb();
    const userRef = doc(firestoreDb, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() } as User;
    }
    return null;
}

export async function updateMission(missionId: string, data: Partial<Mission>) {
    const firestoreDb = ensureDb();
    await updateDoc(doc(firestoreDb, 'missions', missionId), data);
}

export async function updateUser(userId: string, data: Partial<User & OBC>) {
    const firestoreDb = ensureDb();
    await updateDoc(doc(firestoreDb, 'users', userId), data);
}

export async function createMission(missionData: Omit<Mission, 'id'>): Promise<string> {
    const firestoreDb = ensureDb();
    const missionsCol = collection(firestoreDb, 'missions');
    const docRef = await addDoc(missionsCol, missionData);
    return docRef.id;
}

export async function addDocument(userId: string, documentData: Omit<UserDocument, 'id'>) {
    const firestoreDb = ensureDb();
    const documentsCol = collection(firestoreDb, `users/${userId}/documents`);
    await addDoc(documentsCol, documentData);
}

export async function createInviteCode(code: string, email: string): Promise<void> {
    const firestoreDb = ensureDb();
    await setDoc(doc(firestoreDb, 'invite_codes', code), {
        email: email,
        isUsed: false,
        createdAt: new Date().toISOString()
    });
}

export async function validateAndUseInviteCode(code: string, email: string, markAsUsed: boolean = false): Promise<boolean> {
  const firestoreDb = ensureDb();
  const codeRef = doc(firestoreDb, 'invite_codes', code.trim());
  
  try {
      const codeSnap = await getDoc(codeRef);

      if (
        !codeSnap.exists() ||
        codeSnap.data().isUsed ||
        codeSnap.data().email.trim().toLowerCase() !== email.trim().toLowerCase()
      ) {
        return false;
      }
      
      if (markAsUsed) {
        await updateDoc(codeRef, { isUsed: true });
      }

      return true;

  } catch (error) {
      console.error("Validation logic failed:", error);
      return false; // Return false on any error to prevent proceeding
  }
}


export async function getAllInviteCodes(): Promise<InviteCode[]> {
    const firestoreDb = ensureDb();
    const codesCol = collection(firestoreDb, 'invite_codes');
    const q = query(codesCol, orderBy("createdAt", "desc"));
    const codeSnapshot = await getDocs(q);
    const codeList = codeSnapshot.docs.map(doc => ({
        code: doc.id,
        ...doc.data()
    } as InviteCode));
    return codeList;
}

export async function getMissionApplications(): Promise<MissionApplication[]> {
    const firestoreDb = ensureDb();
    const applicationsCol = collection(firestoreDb, 'missionApplications');
    const q = query(applicationsCol, orderBy("applicationDate", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MissionApplication));
}

export async function approveMissionApplication(application: MissionApplication): Promise<void> {
    const firestoreDb = ensureDb();
    const missionRef = doc(firestoreDb, 'missions', application.missionId);
    const applicationRef = doc(firestoreDb, 'missionApplications', application.id);

    try {
        await runTransaction(firestoreDb, async (transaction) => {
            const missionDoc = await transaction.get(missionRef);
            if (!missionDoc.exists()) {
                throw new Error("Mission does not exist!");
            }

            const missionData = missionDoc.data() as Mission;
            const obcIds = missionData.obcIds || [];
            const obcAmount = missionData.obcAmount || 1;

             if (obcIds.includes(application.obcId)) {
                transaction.update(applicationRef, { status: 'approved' });
                return;
            }

            if (obcIds.length >= obcAmount) {
                throw new Error("Mission is already fully assigned.");
            }

            const newObcIds = [...obcIds, application.obcId];
            transaction.update(missionRef, { obcIds: newObcIds });
            transaction.update(applicationRef, { status: 'approved' });

            if (newObcIds.length >= obcAmount) {
                transaction.update(missionRef, { status: 'Booked' });
            }
        });
    } catch (e) {
        console.error("Transaction failed: ", e);
        throw e;
    }
}

export async function rejectMissionApplication(applicationId: string): Promise<void> {
    const firestoreDb = ensureDb();
    const applicationRef = doc(firestoreDb, 'missionApplications', applicationId);
    await updateDoc(applicationRef, { status: 'rejected' });
}

export async function deleteMissionApplication(missionId: string, obcId: string): Promise<void> {
    const firestoreDb = ensureDb();
    const applicationsCol = collection(firestoreDb, 'missionApplications');
    const q = query(applicationsCol, where("missionId", "==", missionId), where("obcId", "==", obcId), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        const docToDelete = snapshot.docs[0];
        await deleteDoc(doc(firestoreDb, 'missionApplications', docToDelete.id));
    } else {
        console.warn(`No application found to delete for mission ${missionId} and OBC ${obcId}`);
    }
}

export async function getApplicationsForOBC(obcId: string): Promise<MissionApplication[]> {
    const firestoreDb = ensureDb();
    const applicationsCol = collection(firestoreDb, 'missionApplications');
    const q = query(applicationsCol, where("obcId", "==", obcId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MissionApplication));
}

export function onApplicationsUpdate(userId: string, callback: (applications: MissionApplication[]) => void): () => void {
    const firestoreDb = ensureDb();
    const applicationsCol = collection(firestoreDb, 'missionApplications');
    const q = query(applicationsCol, where("obcId", "==", userId));

    return onSnapshot(q, (snapshot) => {
        const applications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MissionApplication));
        callback(applications);
    });
}

export async function getMission(missionId: string): Promise<Mission | null> {
    const firestoreDb = ensureDb();
    const missionRef = doc(firestoreDb, 'missions', missionId);
    const missionSnap = await getDoc(missionRef);
    if (missionSnap.exists()) {
        return { id: missionSnap.id, ...missionSnap.data() } as Mission;
    }
    return null;
}

// EXPENSE REPORTS
async function _createNotification(userId: string, notificationData: { message: string, type: NotificationType, relatedId: string }) {
    const firestoreDb = ensureDb();
    const notificationsColRef = collection(firestoreDb, `users/${userId}/notifications`);
    
    // Set createdAt timestamp on the client-side to ensure consistency for sorting
    const notificationPayload = {
      ...notificationData,
      read: false,
      createdAt: new Date().toISOString(),
    };

    // Add the new notification
    await addDoc(notificationsColRef, notificationPayload);
    
    // Capping logic: Check if we exceed the limit and delete the oldest if so.
    const q = query(notificationsColRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    if (snapshot.docs.length > 10) {
      // Delete the oldest ones beyond the 10th
      const batch = writeBatch(firestoreDb);
      for (let i = 10; i < snapshot.docs.length; i++) {
        batch.delete(snapshot.docs[i].ref);
      }
      await batch.commit();
    }
}

export async function submitExpenseReport(mission: Mission, user: User, items: (Omit<ExpenseItem, 'receiptUrl'> & { receipt: FileList })[]) {
    const firestoreDb = ensureDb();

    // 1. Upload all receipt files
    const uploadedItems: ExpenseItem[] = await Promise.all(
        items.map(async (item) => {
            const file = item.receipt[0];
            const filePath = `expense-receipts/${user.id}/${mission.id}/${Date.now()}-${file.name}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            return {
                category: item.category as ExpenseCategory,
                amount: Number(item.amount),
                currency: item.currency,
                receiptUrl: downloadURL,
            };
        })
    );
    
    // 2. Calculate total
    const totalAmount = uploadedItems.reduce((sum, item) => sum + item.amount, 0); // Note: This doesn't account for currency conversion.

    // 3. Create the report document
    const reportData: Omit<ExpenseReport, 'id'> = {
        missionId: mission.id,
        missionTitle: mission.title,
        obcId: user.id,
        obcName: user.name,
        submittedAt: new Date().toISOString(),
        items: uploadedItems,
        totalAmount,
        status: 'Pending',
    };
    
    const reportDocRef = await addDoc(collection(firestoreDb, 'expenseReports'), reportData);

    // 4. Notify all admins
    const usersCol = collection(firestoreDb, 'users');
    const adminQuery = query(usersCol, where("role", "==", "admin"));
    const adminSnapshot = await getDocs(adminQuery);
    
    const notificationPromises = adminSnapshot.docs.map(adminDoc => {
        return _createNotification(adminDoc.id, {
            message: `${user.name} submitted an expense report for mission: ${mission.title}.`,
            type: 'expense_submitted',
            relatedId: reportDocRef.id,
        });
    });
    
    await Promise.all(notificationPromises);
}

export async function getExpenseReports(): Promise<ExpenseReport[]> {
    const firestoreDb = ensureDb();
    const reportsCol = collection(firestoreDb, 'expenseReports');
    const q = query(reportsCol, orderBy('submittedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExpenseReport));
}

export async function getExpenseReportForMission(missionId: string, obcId: string): Promise<ExpenseReport | null> {
    const firestoreDb = ensureDb();
    const reportsCol = collection(firestoreDb, 'expenseReports');
    const q = query(reportsCol, where('missionId', '==', missionId), where('obcId', '==', obcId), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as ExpenseReport;
}

export async function updateExpenseReportStatus(reportId: string, status: 'Approved' | 'Rejected' | 'Paid', finalAmount?: number, finalCurrency?: Currency): Promise<void> {
    const firestoreDb = ensureDb();
    const reportRef = doc(firestoreDb, 'expenseReports', reportId);
    
    const updateData: Partial<ExpenseReport> = { status };
    if (status === 'Approved') {
        updateData.approvedAt = new Date().toISOString();
        if (finalAmount !== undefined && finalCurrency) {
            updateData.finalAmount = finalAmount;
            updateData.finalCurrency = finalCurrency;
        }
    }

    await updateDoc(reportRef, updateData as any);

    const reportSnap = await getDoc(reportRef);
    if (!reportSnap.exists()) {
        console.error(`Expense report with ID ${reportId} not found after update.`);
        return;
    };
    const report = reportSnap.data() as ExpenseReport;

    if (status === 'Approved') {
        await _createNotification(report.obcId, {
            message: `Your expense report for mission "${report.missionTitle}" has been approved.`,
            type: 'expense_approved',
            relatedId: reportId,
        });
    } else if (status === 'Paid') {
        // Mark mission as Paid
        const missionRef = doc(firestoreDb, 'missions', report.missionId);
        await updateDoc(missionRef, { status: 'Paid' });
        // Notify OBC
        await _createNotification(report.obcId, {
            message: `Your payment for mission "${report.missionTitle}" has been processed.`,
            type: 'expense_paid',
            relatedId: reportId,
        });
    }
}

export async function getExpenseReportById(reportId: string): Promise<ExpenseReport | null> {
    const firestoreDb = ensureDb();
    const reportRef = doc(firestoreDb, 'expenseReports', reportId);
    const docSnap = await getDoc(reportRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as ExpenseReport;
    }
    return null;
}

export async function submitInvoice(reportId: string, userId: string, invoiceFile: File): Promise<void> {
    const firestoreDb = ensureDb();
    const batch = writeBatch(firestoreDb);

    // 1. Upload file to storage
    const filePath = `invoices/${userId}/${Date.now()}-${invoiceFile.name}`;
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, invoiceFile);
    const downloadURL = await getDownloadURL(storageRef);
    
    // 2. Get Expense Report data for notification message
    const reportRef = doc(firestoreDb, 'expenseReports', reportId);
    const reportSnap = await getDoc(reportRef);
    if (!reportSnap.exists()) {
        throw new Error("Could not find the related expense report.");
    }
    const reportData = reportSnap.data() as ExpenseReport;


    // 3. Update documents
    // Update the expense report document with the invoice URL
    batch.update(reportRef, { invoiceUrl: downloadURL });

    // 4. Create notifications for all admins
    const usersCol = collection(firestoreDb, 'users');
    const adminQuery = query(usersCol, where("role", "==", "admin"));
    const adminSnapshot = await getDocs(adminQuery);
    
    const notificationPromises = adminSnapshot.docs.map(adminDoc => {
         return _createNotification(adminDoc.id, {
            message: `${reportData.obcName} submitted an invoice for mission: ${reportData.missionTitle}.`,
            type: 'invoice_submitted',
            relatedId: reportId,
        });
    });

    await Promise.all(notificationPromises);
}


// CHAT
const TEAM_ADMIN_ID = 'alphajet-team-admin';

export async function getConversation(conversationId: string): Promise<Conversation | null> {
    const firestoreDb = ensureDb();
    const conversationRef = doc(firestoreDb, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    if (conversationSnap.exists()) {
        return { id: conversationSnap.id, ...conversationSnap.data() } as Conversation;
    }
    return null;
}

// Definitive function to get or create a general chat between an OBC and all Admins.
export async function getOrCreateGeneralChatForOBC(obcUser: User): Promise<Conversation | null> {
    const firestoreDb = ensureDb();
    // A consistent ID based on the OBC's user ID and the static admin team ID.
    const conversationId = [obcUser.id, TEAM_ADMIN_ID].sort().join('_');
    const conversationRef = doc(firestoreDb, 'conversations', conversationId);

    try {
        const conversationSnap = await getDoc(conversationRef);

        if (conversationSnap.exists()) {
            return { id: conversationSnap.id, ...conversationSnap.data() } as Conversation;
        } else {
            // Conversation does not exist, so we create it.
            const participantIds = [obcUser.id];
            const participants: Conversation['participants'] = {
                [obcUser.id]: { id: obcUser.id, name: obcUser.name, avatar: obcUser.avatar || '', role: 'obc' },
                [TEAM_ADMIN_ID]: { id: TEAM_ADMIN_ID, name: 'AlphaJet Team', avatar: 'https://firebasestorage.googleapis.com/v0/b/alphaclub-ev7kl.firebasestorage.app/o/logo%2FLogo%20(1).png?alt=media&token=533c6cbd-0524-454e-ad2a-e0dba243b2c1', role: 'admin' },
            };

            // Add all admins to the participants list for access control and display.
            const usersCol = collection(firestoreDb, 'users');
            const adminQuery = query(usersCol, where("role", "==", "admin"));
            const adminSnapshot = await getDocs(adminQuery);

            adminSnapshot.forEach(adminDoc => {
                const adminData = adminDoc.data() as User;
                if (!participantIds.includes(adminDoc.id)) {
                    participantIds.push(adminDoc.id);
                }
                participants[adminDoc.id] = { id: adminDoc.id, name: adminData.name, avatar: adminData.avatar || '', role: 'admin' };
            });
            participantIds.push(TEAM_ADMIN_ID); // Ensure the team ID is in the list for queries

            const newConversationData: Omit<Conversation, 'id'> = {
                missionId: `general-${obcUser.id}`,
                missionTitle: 'General Chat',
                participantIds: participantIds,
                participants: participants,
                lastMessage: {
                    text: 'Chat created.',
                    timestamp: new Date().toISOString(),
                }
            };

            await setDoc(conversationRef, newConversationData);
            return {
                id: conversationId,
                ...newConversationData,
            };
        }
    } catch (error) {
        console.error("Error in getOrCreateGeneralChatForOBC:", error);
        throw error; // Re-throw the error to be handled by the caller.
    }
}

export function getMessages(conversationId: string, callback: (messages: ChatMessage[]) => void): () => void {
    const firestoreDb = ensureDb();
    const messagesCol = collection(firestoreDb, `conversations/${conversationId}/messages`);
    const q = query(messagesCol, orderBy('timestamp', 'asc'), limit(50));

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => {
            const data = doc.data();
            const timestamp = data.timestamp;
            
            let timestampString: string;
            if (timestamp instanceof Timestamp) {
                timestampString = timestamp.toDate().toISOString();
            } else if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
                timestampString = new Date(timestamp.seconds * 1000).toISOString();
            } else {
                timestampString = new Date().toISOString();
            }
            
            return {
                id: doc.id,
                ...data,
                timestamp: timestampString
            } as ChatMessage;
        });
        callback(messages);
    }, (error) => {
        console.error("Error in getMessages:", error);
        callback([]);
    });
}

export async function addMessage(conversationId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) {
    const firestoreDb = ensureDb();
    const batch = writeBatch(firestoreDb);
    
    const messagesCol = collection(firestoreDb, `conversations/${conversationId}/messages`);
    const newMessageRef = doc(messagesCol);
    const timestamp = serverTimestamp();

    let finalMessage = { ...message };

    // If the sender is an admin, always post as the AlphaJet Team
    const userDoc = await getDoc(doc(db, 'users', message.senderId));
    if (userDoc.exists() && userDoc.data().role === 'admin') {
        finalMessage = {
             ...finalMessage,
             senderId: TEAM_ADMIN_ID,
             senderName: 'AlphaJet Team',
             senderAvatar: 'https://firebasestorage.googleapis.com/v0/b/alphaclub-ev7kl.firebasestorage.app/o/logo%2FLogo%20(1).png?alt=media&token=533c6cbd-0524-454e-ad2a-e0dba243b2c1'
        }
    }
    
    batch.set(newMessageRef, { ...finalMessage, timestamp });

    const conversationRef = doc(firestoreDb, 'conversations', conversationId);
    batch.update(conversationRef, {
        lastMessage: {
            text: finalMessage.text,
            timestamp: timestamp
        }
    });

    await batch.commit();
}

// NOTIFICATIONS
export function onNotificationsUpdate(userId: string, callback: (notifications: Notification[]) => void): () => void {
    const firestoreDb = ensureDb();
    const notificationsCol = collection(firestoreDb, `users/${userId}/notifications`);
    const q = query(notificationsCol, orderBy('createdAt', 'desc'), limit(10));
    
    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => {
            const data = doc.data();
            let createdAtStr: string;

            if (data.createdAt instanceof Timestamp) {
                createdAtStr = data.createdAt.toDate().toISOString();
            } else if (typeof data.createdAt === 'string') {
                createdAtStr = data.createdAt;
            } else {
                createdAtStr = new Date().toISOString(); 
            }

            return { 
                id: doc.id, 
                ...data,
                createdAt: createdAtStr,
            } as Notification;
        });
        callback(notifications);
    }, (error) => {
        console.error("Failed to subscribe to notifications:", error);
    });
}

export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    const firestoreDb = ensureDb();
    const notificationRef = doc(firestoreDb, `users/${userId}/notifications`, notificationId);
    await updateDoc(notificationRef, { read: true });
}


// COMMENTS
export async function addUserComment(userId: string, commentData: Omit<UserComment, 'id' | 'createdAt'>): Promise<void> {
    const firestoreDb = ensureDb();
    const commentsCol = collection(firestoreDb, `users/${userId}/comments`);
    await addDoc(commentsCol, {
        ...commentData,
        createdAt: serverTimestamp(),
    });
}

export function onUserCommentsUpdate(userId: string, callback: (comments: UserComment[]) => void): () => void {
    const firestoreDb = ensureDb();
    const commentsCol = collection(firestoreDb, `users/${userId}/comments`);
    const q = query(commentsCol, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
        const comments = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Ensure createdAt is always a string
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            } as UserComment;
        });
        callback(comments);
    }, (error) => {
        console.error("Error listening to user comments:", error);
        callback([]); 
    });
}

export async function getOrCreateMissionConversation(mission: Mission, user: User): Promise<Conversation | null> {
    const firestoreDb = ensureDb();
    const conversationId = `mission-chat-${mission.id}`;
    const conversationRef = doc(firestoreDb, 'conversations', conversationId);

    try {
        const conversationSnap = await getDoc(conversationRef);

        if (conversationSnap.exists()) {
             const conversationData = conversationSnap.data();
            
            let lastMessage = undefined;
            if (conversationData.lastMessage && conversationData.lastMessage.timestamp) {
                const timestamp = (conversationData.lastMessage.timestamp as Timestamp).toDate();
                lastMessage = {
                    ...conversationData.lastMessage,
                    timestamp: timestamp.toISOString()
                };
            }

            return {
                id: conversationSnap.id,
                ...conversationData,
                lastMessage: lastMessage,
            } as Conversation;
        }

        if (!mission.obcIds || mission.obcIds.length === 0) {
            throw new Error("Mission has no assigned OBCs to start a chat.");
        }

        const participants: { [key: string]: { id: string; name: string; avatar: string; role: UserRole } } = {};
        const participantIds: string[] = [];

        // Fetch all admins
        const usersCol = collection(firestoreDb, 'users');
        const adminQuery = query(usersCol, where("role", "==", "admin"));
        const adminsSnap = await getDocs(adminQuery);
        adminsSnap.forEach(doc => {
            const adminData = doc.data() as User;
             participants[doc.id] = { id: doc.id, name: adminData.name, avatar: adminData.avatar || '', role: 'admin' };
             participantIds.push(doc.id);
        });
        
        // Fetch all assigned OBCs
        const obcProfiles = await Promise.all(
            mission.obcIds.map(id => getOBCProfile(id))
        );
        
        obcProfiles.forEach(obcProfile => {
            if (obcProfile && !participantIds.includes(obcProfile.id)) {
                participants[obcProfile.id] = { id: obcProfile.id, name: obcProfile.name, avatar: obcProfile.avatar || '', role: 'obc' };
                participantIds.push(obcProfile.id);
            }
        });


        const newConversation: Omit<Conversation, 'id'> = {
            missionId: mission.id,
            missionTitle: mission.title,
            participantIds,
            participants,
        };
        await setDoc(conversationRef, newConversation);
        const createdConvo = { id: conversationId, ...newConversation };

        return { ...createdConvo, lastMessage: undefined } as Conversation;

    } catch (error) {
        console.error("Error in getOrCreateMissionConversation:", error);
        return null;
    }
}
