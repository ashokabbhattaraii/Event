"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { ensureGsap, prefersReducedMotion } from "@/lib/gsap"

type RevealProps = {
  children: ReactNode
  className?: string
  /** initial vertical offset in px */
  y?: number
  /** initial horizontal offset in px */
  x?: number
  delay?: number
  duration?: number
  /** when set, animates the element's direct children with this stagger */
  stagger?: number
  /** initial scale (e.g. 0.96) */
  scale?: number
  /** scroll start position, e.g. "top 85%" */
  start?: string
  as?: "div" | "section" | "ul" | "li" | "span" | "header" | "footer" | "nav" | "tr"
}

export function Reveal({
  children,
  className,
  y = 32,
  x = 0,
  delay = 0,
  duration = 0.7,
  stagger,
  scale,
  start = "top 86%",
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const gsap = ensureGsap()
    const el = ref.current
    if (!el) return

    const targets: gsap.TweenTarget = stagger ? Array.from(el.children) : el

    if (prefersReducedMotion()) {
      gsap.set(targets, { opacity: 1, x: 0, y: 0, scale: 1, clearProps: "all" })
      return
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y, x, ...(scale ? { scale } : {}) },
        {
          opacity: 1,
          y: 0,
          x: 0,
          ...(scale ? { scale: 1 } : {}),
          duration,
          delay,
          ease: "power3.out",
          stagger: stagger || 0,
          scrollTrigger: {
            trigger: el,
            start,
            toggleActions: "play none none none",
          },
        },
      )
    }, ref)

    return () => ctx.revert()
  }, [y, x, delay, duration, stagger, scale, start])

  // @ts-expect-error - polymorphic ref
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}
