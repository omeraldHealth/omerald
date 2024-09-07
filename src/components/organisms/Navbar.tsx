'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/router';

export default function Navbar() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Show sidebar on home page and static pages
  const showSidebar = router.pathname === '/' || 
    ['/about', '/pricing', '/faq', '/contact'].includes(router.pathname);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <>
      {/* Left Sidebar for Home Page */}
      {showSidebar && (
        <>
          {/* Left Sidebar - Mobile Only */}
          <div
            className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out md:hidden ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex flex-col h-full">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <Link href="/" className="flex items-center space-x-2" onClick={closeSidebar}>
                  <Image 
                    src="/logo.jpg" 
                    alt="Omerald Logo" 
                    width={171} 
                    height={57.75}
                    className="h-8 w-auto"
                  />
                  <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
                    OMERALD
                  </span>
                </Link>
                <button
                  onClick={closeSidebar}
                  className="p-2 rounded-md text-gray-700 hover:text-purple-600 hover:bg-gray-100 md:hidden"
                >
                  <svg
                    className="h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Sidebar Navigation */}
              <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-2">
                  <Link
                    href="/"
                    onClick={closeSidebar}
                    className="block px-4 py-3 text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                  >
                    Home
                  </Link>
                  <Link
                    href="/about"
                    onClick={closeSidebar}
                    className="block px-4 py-3 text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                  >
                    About
                  </Link>
                  <Link
                    href="/pricing"
                    onClick={closeSidebar}
                    className="block px-4 py-3 text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                  >
                    Pricing
                  </Link>
                  <Link
                    href="/faq"
                    onClick={closeSidebar}
                    className="block px-4 py-3 text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                  >
                    FAQ
                  </Link>
                  <Link
                    href="/contact"
                    onClick={closeSidebar}
                    className="block px-4 py-3 text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                  >
                    Contact
                  </Link>
                  {isSignedIn ? (
                    <div className="pt-4 border-t mt-4">
                      <Link
                        href="/dashboard"
                        onClick={closeSidebar}
                        className="block px-4 py-3 text-base font-medium text-center bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-md hover:from-purple-700 hover:to-orange-600 transition-colors shadow-md hover:shadow-lg"
                      >
                        Dashboard
                      </Link>
                    </div>
                  ) : (
                    <div className="pt-4 border-t mt-4 space-y-2">
                      <Link
                        href="/signIn"
                        onClick={closeSidebar}
                        className="block px-4 py-3 text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/signUp"
                        onClick={closeSidebar}
                        className="block px-4 py-3 text-base font-medium text-center bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-md hover:from-purple-700 hover:to-orange-600 transition-colors"
                      >
                        Sign Up
                      </Link>
                    </div>
                  )}
                </nav>
              </div>
            </div>
          </div>

          {/* Sidebar Overlay for Mobile */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-white/30 backdrop-blur-md z-30 md:hidden"
              onClick={closeSidebar}
            />
          )}
        </>
      )}

      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {showSidebar && (
                <div className="ml-16 md:ml-0">
                  <Link href="/" className="flex items-center space-x-2 sm:space-x-3">
                    <Image 
                      src="/logo.jpg" 
                      alt="Omerald Logo" 
                      width={171} 
                      height={57.75}
                      className="h-8 sm:h-10 w-auto"
                      priority
                    />
                    <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
                      OMERALD
                    </span>
                  </Link>
                </div>
              )}
              {!showSidebar && (
                <Link href="/" className="flex items-center space-x-2 sm:space-x-3">
                  <Image 
                    src="/logo.jpg" 
                    alt="Omerald Logo" 
                    width={171} 
                    height={57.75}
                    className="h-8 sm:h-10 w-auto"
                    priority
                  />
                  <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
                    OMERALD
                  </span>
                </Link>
              )}
            </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
              {!isSignedIn && (
                <>
                  <Link
                    href="/about"
                    className="text-gray-700 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    About
                  </Link>
                  <Link
                    href="/pricing"
                    className="text-gray-700 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Pricing
                  </Link>
                  <Link
                    href="/faq"
                    className="text-gray-700 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    FAQ
                  </Link>
                  <Link
                    href="/contact"
                    className="text-gray-700 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Contact
                  </Link>
                </>
              )}
              {isSignedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    className="bg-gradient-to-r from-purple-600 to-orange-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:from-purple-700 hover:to-orange-600 transition-all shadow-md hover:shadow-lg"
                  >
                    Dashboard
                  </Link>
                  <UserButton afterSignOutUrl="/" />
                </>
              ) : (
                <>
                  <Link
                    href="/signIn"
                    className="text-gray-700 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signUp"
                    className="bg-gradient-to-r from-purple-600 to-orange-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:from-purple-700 hover:to-orange-600 transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            {showSidebar && (
              <button
                onClick={toggleSidebar}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-purple-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500 transition-all"
                aria-label="Toggle sidebar"
              >
                {isSidebarOpen ? (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            )}
            {isSignedIn && (
              <div className={showSidebar ? '' : 'mr-2'}>
                <UserButton afterSignOutUrl="/" />
              </div>
            )}
          </div>
        </div>
      </div>
      </nav>
    </>
  );
}

