
"use client";

import { useContext } from 'react';
import { AuthContext, AuthContextType } from '@/contexts/auth-context';

export const useUser = (): Omit<AuthContextType, 'firebaseUser'> => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useUser must be used within an AuthProvider');
  }
  // We typically don't expose the raw firebaseUser to the app components
  const { firebaseUser, ...rest } = context;
  return rest;
};
