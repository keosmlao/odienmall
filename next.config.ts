import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server to be opened from other devices on the LAN (phones,
  // tablets, other PCs). Next blocks a bare "*", so we whitelist the private
  // network ranges + .local mDNS hosts — effectively "allow all" for dev.
  allowedDevOrigins: [
    "10.*.*.*", // 10.0.0.0/8  (e.g. 10.0.21.161)
    "172.*.*.*", // 172.16.0.0/12 and nearby
    "192.168.*.*", // 192.168.0.0/16
    "*.local", // mDNS hostnames (e.g. macs-macbook-air.local)
  ],
  // Baseline security headers for the whole site (payment + admin). Conservative
  // set that won't break Next inline scripts / OnePay / PubNub (no strict CSP).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Force HTTPS for 2 years incl. subdomains (no effect over plain http).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Anti-clickjacking — the storefront/admin shouldn't be framed.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Stop MIME sniffing.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak full URLs (order ids, etc.) to third parties.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable powerful APIs the app doesn't use.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
