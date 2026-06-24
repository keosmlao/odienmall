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
};

export default nextConfig;
