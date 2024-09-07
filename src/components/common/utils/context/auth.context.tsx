'use client';

import {
  createContext,
  useContext,
  useMemo,
  ReactNode,
} from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useGetProfileByPhone } from '@/hooks/reactQuery/profile';
import { useQueryClient } from '@tanstack/react-query';

interface Profile {
  id?: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  [key: string]: any;
}

interface AuthContextType {
  user: any;
  logOut: () => Promise<void>;
  profile: Profile | null;
  phoneNumber: string | undefined;
  isProfileLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthContextProvider({ children }: { children: ReactNode }) {
  const { user: ClerkUser, isLoaded: isUserLoaded } = useUser();
  const { signOut: logOut } = useClerk();
  const queryClient = useQueryClient();

  const phoneNumber = ClerkUser?.phoneNumbers[0]?.phoneNumber;

  // Use React Query hook for profile fetching with automatic caching
  const {
    data: profile,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useGetProfileByPhone(phoneNumber);

  // Refresh profile function that invalidates cache and refetches
  const refreshProfile = async () => {
    if (phoneNumber) {
      queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber', phoneNumber] });
      await refetchProfile();
    }
  };

  const authContextValue: AuthContextType = useMemo(
    () => ({
    user: ClerkUser,
    logOut,
      profile: profile || null,
    phoneNumber,
      isProfileLoading: !isUserLoaded || isProfileLoading,
      refreshProfile,
    }),
    [ClerkUser, logOut, profile, phoneNumber, isUserLoaded, isProfileLoading, refreshProfile]
  );

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthContextProvider');
  }
  return context;
}

