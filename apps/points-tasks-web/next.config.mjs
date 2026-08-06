/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@ryvra/ui",
    "@ryvra/auth",
    "@ryvra/api-client",
    "@ryvra/config",
    "@ryvra/domain-tokenomics",
    "@ryvra/domain-payments",
    "@ryvra/domain-markets",
    "@ryvra/observability",
  ],
};

export default nextConfig;
