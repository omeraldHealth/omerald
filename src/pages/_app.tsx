import '@/styles/globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecoilRoot } from 'recoil';
import { ClerkProvider } from '@clerk/nextjs';
import { useEffect, useState, useMemo } from 'react';
import type { AppProps } from 'next/app';
import { AuthContextProvider } from '@/components/common/utils/context/auth.context';
import Allowed from '@/components/common/utils/permission';
import DisplayToaster from '@/components/organisms/common/toaster';
import ErrorBoundary from '@/components/common/utils/ErrorBoundary';
import dynamic from 'next/dynamic';

// Dynamically import ReactQueryDevtools only in development and client-side
const ReactQueryDevtools = dynamic(
  () =>
    process.env.NODE_ENV === 'development'
      ? import('@tanstack/react-query-devtools').then((mod) => ({
          default: mod.ReactQueryDevtools,
        }))
      : Promise.resolve({ default: () => null }),
  { ssr: false }
);

const clerkFrontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API;

export default function MyApp({ Component, pageProps }: AppProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Create QueryClient inside component to avoid SSR issues
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
            gcTime: 30 * 60 * 1000, // 30 minutes - cache persists for 30 minutes (formerly cacheTime)
            refetchOnWindowFocus: false,
            refetchOnMount: false, // Don't refetch on mount if data is fresh
            retry: 1, // Retry once on failure
          },
        },
      }),
    []
  );

  useEffect(() => {
    setIsMounted(true);
    // Only register service worker in production (PWA is disabled in development)
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registered:', registration);
          })
          .catch((error) => {
            console.log('Service Worker registration failed:', error);
          });
      });
    }
  }, []);

  const clerkPublishableKey =
    clerkFrontendApi ||
    'pk_test_Y29oZXJlbnQtaGFkZG9jay04MS5jbGVyay5hY2NvdW50cy5kZXYk';

  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={clerkPublishableKey} {...pageProps}>
        <QueryClientProvider client={queryClient}>
          <RecoilRoot>
            <DisplayToaster />
            <AuthContextProvider>
              <Allowed>
                <ErrorBoundary>
                  <Component {...pageProps} />
                </ErrorBoundary>
              </Allowed>
            </AuthContextProvider>
            {isMounted && process.env.NODE_ENV === 'development' && (
              <ReactQueryDevtools initialIsOpen={false} />
            )}
          </RecoilRoot>
        </QueryClientProvider>
      </ClerkProvider>
    </ErrorBoundary>
  );
}

