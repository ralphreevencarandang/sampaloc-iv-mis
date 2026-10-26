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
      bodySizeLimit: "5mb",
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
