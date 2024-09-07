'use client';

import { useRouter } from 'next/router';
import { useState, useEffect, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { Spinner } from '@/components/atoms/loader';
import { useAuthContext } from '../context/auth.context';

const allowedPaths = [
  '',
  '/',
  '/signIn',
  '/signUp',
  '/verify',
  '/404',
  '/about',
  '/pricingTab',
  '/faq',
  '/info/disclaimer',
  '/info/privacy',
  '/info/terms',
  '/info/consent',
  '/info/support',
  '/info/partners',
  '/contact',
];

const Allowed = ({ children }: { children: ReactNode }) => {
  const [isMounted, setIsMounted] = useState(false);
  const { profile, isProfileLoading } = useAuthContext();
  const router = useRouter();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // During SSR and before mount, render nothing to prevent hydration mismatch
  if (!isMounted) {
    return <Spinner message="Loading..." />;
  }

  // Allow access to public paths
  if (allowedPaths.includes(router.pathname)) {
    return <>{children}</>;
  }

  // Show loading while checking auth
  if (!isLoaded || isProfileLoading) {
    return <Spinner message="Loading..." />;
  }

  // Check if user is authenticated
  if (user) {
    // Check if email or phone is verified
    const emailVerified = user.emailAddresses?.some(
      (email) => email.verification?.status === 'verified'
    );
    const phoneVerified = user.phoneNumbers?.some(
      (phone) => phone.verification?.status === 'verified'
    );
    const isVerified = emailVerified || phoneVerified;

    // If on verify page and already verified, redirect appropriately
    if (router.pathname === '/verify' && isVerified) {
      if (profile) {
        router.push('/dashboard');
      } else {
        router.push('/onboard');
      }
      return null;
    }

    // If not verified and not on verify/onboard page, redirect to verify (for new signups)
    if (
      !isVerified &&
      router.pathname !== '/verify' &&
      router.pathname !== '/onboard' &&
      router.pathname !== '/signUp'
    ) {
      router.push('/verify');
      return null;
    }

    if (profile && profile !== null) {
      // User has profile - allow access to dashboard and other authenticated routes
      if (router.pathname === '/onboard') {
        router.push('/dashboard');
        return null;
      }
      // Allow access to dashboard and other authenticated routes
      return <>{children}</>;
    } else {
      // User authenticated but no profile - must complete onboarding
      if (router.pathname === '/onboard' || router.pathname === '/verify') {
        return <>{children}</>;
      } else {
        router.push('/onboard');
        return null;
      }
    }
  } else {
    // Not authenticated - redirect to home
    router?.push('/');
    return null;
  }
};

export default Allowed;

