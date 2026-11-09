import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer-core', 'puppeteer', '@sparticuz/chromium-min'],
  outputFileTracingIncludes: {
    '/api/document/*': ['./.chromium/*.br', './lib/pdf/templates/*.html'],
    '/admin/documents': ['./.chromium/*.br', './lib/pdf/templates/*.html'],
    '/admin/documents/*': ['./.chromium/*.br', './lib/pdf/templates/*.html'],
  },
  experimental: {
    serverActions: {
      // Allow multipart metadata in addition to the validated 5 MB ID image.
      bodySizeLimit: "6mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
