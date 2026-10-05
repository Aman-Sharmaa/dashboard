/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Gzip/Brotli compression for all responses
  compress: true,

  // Remove the X-Powered-By header (small security + byte saving)
  poweredByHeader: false,

  // Do not generate client source maps in production to keep bundles lightweight
  productionBrowserSourceMaps: false,

  // Compiler optimizations
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  // Server-only packages that should NOT be bundled for the client
  serverExternalPackages: ["ssh2", "mongoose", "bcryptjs"],

  // Tree-shake heavy icon/utility/ui packages automatically
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "framer-motion",
      "recharts",
      "clsx",
      "tailwind-merge",
      "@radix-ui/react-avatar",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-popover",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-switch",
      "@radix-ui/react-separator",
    ],
  },

  images: {
    // Prefer AVIF first (smallest), fallback to WebP
    formats: ["image/avif", "image/webp"],

    // Increase cache TTL to 7 days
    minimumCacheTTL: 604800,

    remotePatterns: [
      { protocol: "https", hostname: "kalpintelligence.com" },
      { protocol: "https", hostname: "www.kalpintelligence.com" },
      { protocol: "https", hostname: "*.s3.*.amazonaws.com" },
      { protocol: "https", hostname: "*.s3.amazonaws.com" },
    ],
  },

  // Aggressive route-level caching headers for static assets
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/(clients|team|images|uploads)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/:path*.(svg|png|jpg|jpeg|webp|avif|ico|mp3|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=2592000",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
