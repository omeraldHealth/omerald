import React, { useState, useEffect } from 'react';
import 'react-phone-number-input/style.css';
import { UserLayout } from '@/components/templates/layouts/UserLayout';
import { SignIn } from '@clerk/nextjs';
import Image from 'next/image';

export default function SigninComp() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <UserLayout
        tabName="Omerald | Sign In"
        tabDescription="Omerald is a health management platform to connect people and doctors with ease."
      >
        <div className="h-[75vh] flex flex-col lg:flex-row">
          {/* Left Side - Login Form */}
          <div className="flex-1 bg-white flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden">
            {/* Green circular blob background */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-lime-300 via-lime-400 to-lime-300 rounded-full opacity-40 blur-3xl transform -translate-x-1/4 -translate-y-1/4"></div>
            
            <div className="w-full max-w-md z-10 relative">
              {/* Illustration Section */}
              <div className="mb-8 text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                  Login to our <span className="text-gray-400">Portal</span>
                </h1>
                <p className="text-gray-600 text-sm sm:text-base mb-8">
                  Manage your health reports, share and consult with experts
                </p>
                
                {/* Illustration placeholder - Using Next Image for the illustration */}
                <div className="mb-8 flex justify-center">
                  <div className="relative w-64 h-48 sm:w-80 sm:h-56">
                    <Image 
                      src="/pictures/login.png" 
                      alt="Login illustration" 
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Side - Purple Gradient */}
          <div className="flex-1 bg-gradient-to-br from-[#40189D] via-[#5020B8] to-[#6028D0] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 lg:py-24 relative overflow-hidden">
            {/* Decorative geometric patterns */}
            <div className="absolute top-10 right-10 w-32 h-32 border-4 border-white/10 transform rotate-45"></div>
            <div className="absolute top-32 right-48 w-24 h-24 border-4 border-white/10 transform rotate-12"></div>
            <div className="absolute bottom-20 right-20 w-40 h-40 bg-white/5 transform rotate-45"></div>
            
            {/* Profile Icon in top right */}
            <div className="absolute top-8 right-8 w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-[#40189D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>

            {/* <div className="max-w-lg text-center z-10">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Manage & Share Health Reports
              </h2>
              <p className="text-lg sm:text-xl text-white/90 italic leading-relaxed">
                Share your health reports with experts or family members,
                also get online consultation to resolve your queries
              </p>
            </div> */}

              {/* Clerk Sign In Component */}
              <div className="">
                <SignIn
                  redirectUrl="/dashboard"
                  signUpUrl="/signUp"
                  appearance={{
                    elements: {
                      rootBox: 'w-full',
                      card: 'shadow-none',
                      formButtonPrimary:
                        'bg-gray-900 hover:bg-gray-800 text-white normal-case',
                      footerActionLink: 'text-purple-600 hover:text-purple-700',
                      socialButtonsBlockButton:
                        'border-gray-300 hover:bg-purple-50',
                      formFieldInput: 'rounded-lg border-gray-300',
                      formFieldLabel: 'text-gray-700 font-medium',
                    },
                  }}
                />
              </div>
          </div>
        </div>
      </UserLayout>
    </>
  );
}

