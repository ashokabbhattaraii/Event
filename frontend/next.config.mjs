/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      { source: "/attendee", destination: "/dashboard", permanent: true },
      { source: "/attendee/tickets", destination: "/my-tickets", permanent: true },
      { source: "/attendee/saved", destination: "/saved-events", permanent: true },
      { source: "/attendee/check-in", destination: "/check-in", permanent: true },
      { source: "/attendee/recommendations", destination: "/recommendations", permanent: true },
      { source: "/attendee/notifications", destination: "/notifications", permanent: true },
      { source: "/attendee/settings", destination: "/settings", permanent: true },
      { source: "/attendee/checkout/success", destination: "/checkout/success", permanent: true },
      { source: "/attendee/:id([0-9a-f]{24})", destination: "/event/:id", permanent: true },
    ]
  },
}

export default nextConfig
