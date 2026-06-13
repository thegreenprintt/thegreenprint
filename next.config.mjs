/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["pbs.twimg.com", "i.pravatar.cc", "images.unsplash.com"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=self, microphone=self, display-capture=self" },
        ],
      },
    ];
  },
};

export default nextConfig;
