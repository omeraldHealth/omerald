'use client';

import React, { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Head from 'next/head';

const Navbar = dynamic(() => import('@/components/organisms/Navbar'), {
  ssr: false,
});
const Footer = dynamic(() => import('@/components/molecules/home/footer/Footer'));

const ROUTES_WITHOUT_SIDEBAR = [
  '',
  '/',
  '/signIn',
  '/signUp',
  '/verify',
  '/onboard',
  '/404',
  '/about',
  '/pricing',
  '/pricingTab',
  '/faq',
  '/info/disclaimer',
  '/info/privacy',
  '/info/terms',
  '/info/consent',
  '/info/support',
  '/info/documentation',
  '/info/team',
  '/info/partners',
  '/contact',
];

export const UserLayout = ({
  tabName,
  tabDescription,
  children,
}: {
  tabName: string;
  tabDescription: string;
  children: ReactNode;
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const { pathname } = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const shouldShowNavbar =
    isMounted && ROUTES_WITHOUT_SIDEBAR.includes(pathname);
  const shouldShowFooter =
    isMounted && ROUTES_WITHOUT_SIDEBAR.includes(pathname);
  
  // Show sidebar on home page and static pages
  const showSidebar = pathname === '/' || 
    ['/about', '/pricing', '/faq', '/contact'].includes(pathname);

  return (
    <div>
      <Head>
        <title>{tabName}</title>
        <meta name="description" content={tabDescription} />
        <link rel="icon" href="/logo.jpg" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
      </Head>
      {shouldShowNavbar ? <Navbar /> : null}
      <div className={showSidebar ? 'md:ml-0 transition-all duration-300' : ''}>
        {children}
      </div>
      {shouldShowFooter ? <Footer /> : null}
    </div>
  );
};

