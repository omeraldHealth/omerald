import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import { UserLayout } from '@/components/templates/layouts/UserLayout';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import { Spinner } from '@/components/atoms/loader';
import toast from 'react-hot-toast';

export default function Verify() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { profile, isProfileLoading } = useAuthContext();
  const [verificationStatus, setVerificationStatus] = useState('checking');

  useEffect(() => {
    if (!isLoaded || isProfileLoading) return;

    // Check if user is authenticated
    if (!user) {
      router.push('/signIn');
      return;
    }

    // Check if email or phone is verified
    const emailVerified = user.emailAddresses?.some(
      (email) => email.verification?.status === 'verified'
    );
    const phoneVerified = user.phoneNumbers?.some(
      (phone) => phone.verification?.status === 'verified'
    );

    if (emailVerified || phoneVerified) {
      setVerificationStatus('verified');
      toast.success('Verification successful!');

      // Small delay for better UX
      setTimeout(() => {
        if (!profile) {
          router.push('/onboard');
        } else {
          router.push('/dashboard');
        }
      }, 1500);
    } else {
      setVerificationStatus('pending');
    }
  }, [user, isLoaded, profile, isProfileLoading, router]);

  if (!isLoaded || isProfileLoading || verificationStatus === 'checking') {
    return (
      <UserLayout
        tabName="Omerald | Verifying"
        tabDescription="Verifying your account"
      >
        <Spinner message="Verifying your account..." />
      </UserLayout>
    );
  }

  if (verificationStatus === 'verified') {
    return (
      <UserLayout
        tabName="Omerald | Verified"
        tabDescription="Account verified successfully"
      >
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-orange-50 px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-purple-500 to-orange-500">
                <svg
                  className="h-12 w-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Verified!</h1>
            <p className="text-gray-600 mb-6">
              Your account has been successfully verified. Redirecting you...
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout
      tabName="Omerald | Verify Account"
      tabDescription="Verify your account to continue"
    >
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-orange-50 px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-purple-100 to-orange-100 mb-4">
              <svg
                className="h-12 w-12 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Verify Your Account
            </h1>
            <p className="text-gray-600">
              Please check your email or phone to verify your account before
              continuing.
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-start">
                <svg
                  className="h-6 w-6 text-purple-600 mt-0.5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Check your email
                  </h3>
                  <p className="text-sm text-gray-600">
                    We&apos;ve sent a verification link to your email address.
                    Click the link to verify.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-start">
                <svg
                  className="h-6 w-6 text-orange-600 mt-0.5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Check your phone
                  </h3>
                  <p className="text-sm text-gray-600">
                    We&apos;ve sent a verification code to your phone. Enter the
                    code to verify.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              onClick={() => router.push('/signIn')}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Already Verified? Sign In
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 bg-white text-purple-600 font-semibold rounded-lg border-2 border-purple-600 hover:bg-purple-50 transition-all duration-200"
            >
              Refresh Status
            </button>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}

