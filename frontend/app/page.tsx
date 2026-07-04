import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { TrustBar } from "@/components/landing/trust-bar"
import { ProblemStrip } from "@/components/landing/problem-strip"
import { Solution } from "@/components/landing/solution"
import { Features } from "@/components/landing/features"
import { HowItWorks } from "@/components/landing/how-it-works"
import { SurveyStats } from "@/components/landing/survey-stats"
import { Footer } from "@/components/landing/footer"

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <ProblemStrip />
        <Solution />
        <Features />
        <HowItWorks />
        <SurveyStats />
      </main>
      <Footer />
    </div>
  )
}
