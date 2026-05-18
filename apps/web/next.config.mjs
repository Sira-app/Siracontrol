/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@siracontrol/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
};

export default nextConfig;
