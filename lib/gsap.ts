"use client"

import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

let registered = false

export function ensureGsap() {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger)
    registered = true
  }
  return gsap
}

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export { gsap, ScrollTrigger }
