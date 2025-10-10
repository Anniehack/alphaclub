
"use client";

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { doc, onSnapshot, getDoc, writeBatch, collection } from 'firebase/firestore';
import { auth, db, storage, firebaseInitialized } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { validateAndUseInviteCode } from '@/services/firestore';
import type { User } from '@/types';

export interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseAuthUser | null;
  loading: boolean;
  isFirebaseReady: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

declare global {
  interface Window {
    __TEMP_REGISTRATION_FILES?: Record<string, File>;
  }
}

async function completeRegistration(fbUser: FirebaseAuthUser) {
  const registrationDataString = sessionStorage.getItem('pendingRegistrationData');
  const tempFiles = window.__TEMP_REGISTRATION_FILES;

  if (!registrationDataString || !tempFiles) return;

  console.log("Found pending registration data, completing sign-up...");
  const data = JSON.parse(registrationDataString);
  
  try {
      const uploadDoc = async (file: File | undefined, type: string): Promise<string | null> => {
        if (!file) return null;
        const path = `users/${fbUser.uid}/documents/${type}-${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
      };

      const [
          passportUrl,
          visaUrl,
          driversLicenseUrl,
          globalEntryUrl,
          apecUrl,
      ] = await Promise.all([
          uploadDoc(tempFiles.passportImage, 'passport'),
          uploadDoc(tempFiles.visaImage, 'visa'),
          uploadDoc(tempFiles.driversLicenseImage, 'drivers-license'),
          uploadDoc(tempFiles.globalEntryImage, 'global-entry'),
          uploadDoc(tempFiles.apecImage, 'apec'),
      ]);

      const batch = writeBatch(db);
      const userRef = doc(db, 'users', fbUser.uid);

      batch.set(userRef, {
        name: data.name,
        email: data.email,
        role: 'obc',
        registrationStatus: 'pending',
        avatar: 'https://placehold.co/128x128.png',
        address: data.address,
        mobileNumber: data.mobileNumber,
        baseCity: data.baseCity,
        airlineLoyaltyPrograms: data.airlineLoyaltyPrograms || [],
        units: data.units || [],
        creditCardLimit: data.creditCardLimit || null,
        rfc: data.rfc || null,
        bankDetails: (data.bankDetails && (data.bankDetails.bankName || data.bankDetails.iban || data.bankDetails.swift)) ? data.bankDetails : null,
        availability: 'Available',
        currentLocation: data.baseCity,
        specialization: 'General',
        location: null
      });

      const documentsCollection = collection(db, 'users', fbUser.uid, 'documents');

      if (passportUrl) batch.set(doc(documentsCollection), { type: 'Passport', expiryDate: data.passportExpiry || '', image: passportUrl });
      if (driversLicenseUrl && data.driversLicenseExpiry) batch.set(doc(documentsCollection), { type: 'DriversLicense', expiryDate: data.driversLicenseExpiry, image: driversLicenseUrl });
      if (visaUrl && data.visaExpiry) batch.set(doc(documentsCollection), { type: 'Visa', expiryDate: data.visaExpiry, image: visaUrl });
      if (globalEntryUrl) batch.set(doc(documentsCollection), { type: 'GlobalEntry', image: globalEntryUrl, expiryDate: '' });
      if (apecUrl) batch.set(doc(documentsCollection), { type: 'APEC', image: apecUrl, expiryDate: '' });

      await batch.commit();

      if (data.inviteCode) {
        await validateAndUseInviteCode(data.inviteCode, data.email, true);
      }

  } catch(error) {
    console.error("Failed to complete registration:", error);
    // Optionally, delete the created auth user if the db write fails
    // await fbUser.delete();
    // throw error; // re-throw to be handled by caller if needed
  } finally {
    sessionStorage.removeItem('pendingRegistrationData');
    delete window.__TEMP_REGISTRATION_FILES;
    console.log("Cleaned up temporary registration data.");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseInitialized) {
        setLoading(false);
        return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          // This is a new user, complete their registration
          await completeRegistration(fbUser);
        }
        
        const unsubscribeSnapshot = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            setUser({ id: userDoc.id, ...userDoc.data() } as User);
          } else {
            setUser(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user document:", error);
          setUser(null);
          setLoading(false);
        });
        
        return () => unsubscribeSnapshot();
      } else {
        setFirebaseUser(null);
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, isFirebaseReady: firebaseInitialized }}>
      {children}
    </AuthContext.Provider>
  );
}
