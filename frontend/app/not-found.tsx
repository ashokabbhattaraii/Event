import { NotFoundScreen } from "@/components/app/not-found-screen"

// Global 404 for unknown URLs and every notFound() call in the app. Without
// this, Next.js served its bare default page — no branding, no way back to
// the right console for whoever hit it.
export default function NotFound() {
  return <NotFoundScreen />
}
