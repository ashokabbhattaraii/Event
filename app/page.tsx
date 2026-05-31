"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
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
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    document.documentElement.classList.add("gsap-init")

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const ctx = gsap.context((self) => {
      const q = self.selector!

      if (prefersReduced) {
        gsap.set("[data-reveal], .hero-line, .hero-visual", { opacity: 1, clearProps: "all" })
        return
      }

      // Hero load stagger
      gsap.from(q(".hero-line"), {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.12,
        delay: 0.1,
      })

      // Hero visual
      gsap.from(q(".hero-visual"), {
        opacity: 0,
        scale: 0.94,
        y: 30,
        duration: 1,
        ease: "power3.out",
        delay: 0.4,
      })

      // Hero bars grow
      gsap.from(q(".bar"), {
        scaleY: 0,
        transformOrigin: "bottom",
        duration: 0.7,
        ease: "power2.out",
        stagger: 0.05,
        delay: 0.9,
      })

      // Floating AI chip pulse
      gsap.to(q(".ai-chip"), {
        scale: 1.04,
        duration: 1.4,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      })

      // Scroll chevron bounce
      gsap.to(q(".scroll-chevron"), {
        y: 8,
        duration: 0.9,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      })

      // Generic scroll reveals (staggered within each section row)
      const reveals = q("[data-reveal]") as HTMLElement[]
      reveals.forEach((el) => {
        gsap.fromTo(
          el,
          { y: 34, opacity: 0, scale: 0.985 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.7,
            ease: "power2.out",
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              toggleActions: "play none none none",
            },
          },
        )
      })

      // Timeline progress line
      const progress = q(".timeline-progress")
      if (progress.length) {
        gsap.fromTo(
          progress,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: "#how",
              start: "top 60%",
              end: "bottom 70%",
              scrub: 1,
            },
          },
        )
      }

      // Count-up stats
      const counters = q(".count-up") as HTMLElement[]
      counters.forEach((el) => {
        const target = parseFloat(el.dataset.countTarget || "0")
        const suffix = el.dataset.countSuffix || ""
        const decimals = parseInt(el.dataset.countDecimals || "0", 10)
        const obj = { val: 0 }
        gsap.to(obj, {
          val: target,
          duration: 1.6,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 90%" },
          onUpdate: () => {
            el.textContent = obj.val.toFixed(decimals) + suffix
          },
        })
      })
    }, root)

    return () => {
      ctx.revert()
      document.documentElement.classList.remove("gsap-init")
    }
  }, [])

  return (
    <div ref={root} className="min-h-screen bg-background">
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
