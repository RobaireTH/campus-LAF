import type { NextConfig } from "next";

const production = process.env.NODE_ENV === "production";
function storageHost() {
  const endpoint = process.env.R2_ENDPOINT?.trim();
  if (endpoint) return new URL(endpoint).origin;
  const account = process.env.R2_ACCOUNT_ID?.trim();
  return account ? `https://${account}.r2.cloudflarestorage.com` : "";
}

const storageOrigin = storageHost();

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${production ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${storageOrigin}`,
  `media-src 'self' blob: ${storageOrigin}`,
  "font-src 'self'",
  `connect-src 'self' ${storageOrigin}${production ? "" : " ws: wss:"}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
]
  .map((directive) => directive.trim())
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  ...(production ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
