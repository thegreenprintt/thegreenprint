/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hide tech stack from headers
  poweredByHeader: false,

  // No source maps in production — keeps your code private
  productionBrowserSourceMaps: false,

  // Gzip everything
  compress: true,

  // Image optimization
  images: {
    domains: ["pbs.twimg.com", "i.pravatar.cc", "images.unsplash.com"],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Block clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Safe referrer
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Lock down browser features
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // Force HTTPS for 2 years
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // XSS filter
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Speed up DNS resolution
          { key: "X-DNS-Prefetch-Control", value: "on" },
          // Content Security Policy — blocks injections, XSS, and rogue scripts
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https:",
              "frame-src https://js.stripe.com https://checkout.stripe.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self' https://checkout.stripe.com",
              "media-src 'self' blob: https:",
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
      // Immutable cache for hashed static assets (JS, CSS bundles)
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Long cache for images
      {
        source: "/images/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;
