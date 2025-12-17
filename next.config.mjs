// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   eslint: {
//     ignoreDuringBuilds: true,
//   },
//   typescript: {
//     ignoreBuildErrors: true,
//   },
//   // Increase body size limits for uploads
//   experimental: {
//     serverActions: {
//       bodySizeLimit: '10mb',
//     },
//   },
//   api: {
//     bodyParser: {
//       sizeLimit: '10mb',
//     },
//   },
//   images: {
//     unoptimized: true,
//   },
//   webpack(config) {
//     config.module.rules.push({
//       test: /\.svg$/,
//       use: ['@svgr/webpack'],
//     })
//     return config
//   },
// }

// export default nextConfig





/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {}, // ✅ required to silence error
}

export default nextConfig
