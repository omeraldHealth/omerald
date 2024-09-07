import withPWA from 'next-pwa';

const nextConfig = {
  reactStrictMode: true,
  images: {
    // Use remotePatterns instead of deprecated domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'medin.life',
      },
      {
        protocol: 'http',
        hostname: 'medin.life',
      },
      {
        protocol: 'https',
        hostname: 'omerald-prod.s3.ap-south-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'omerald-diag-s3.s3.us-east-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'images.clerk.dev',
      },
      {
        protocol: 'https',
        hostname: 'blog.omerald.com',
      },
    ],
  },
};

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

export default pwaConfig(nextConfig);

