"use client";
import React from "react";
import { motion } from "framer-motion";
import { Sparkles, LineChart, QrCode, MessageSquareText, Shield, ArrowRight, CheckCircle, Flame } from "lucide-react";

export const BouncyCardsFeatures = () => {
  return (
    <div className="mx-auto max-w-7xl px-4 text-ink dark:text-white">
      <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end md:px-8">
        <div className="space-y-3">
          <span className="inline-block rounded-full bg-[#5b4cf5]/10 dark:bg-[#5b4cf5]/20 px-3.5 py-1 text-xs font-semibold text-primary dark:text-[#5b4cf5] tracking-wider uppercase">
            Everything Intelligently Connected
          </span>
          <h2 className="font-display max-w-2xl text-4xl font-extrabold tracking-tight md:text-5xl">
            Grow faster with our
            <span className="text-muted-foreground font-medium"> all-in-one event solution</span>
          </h2>
        </div>
        <motion.button
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.96 }}
          className="group whitespace-nowrap rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/95 flex items-center gap-2"
        >
          Explore All Features
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </motion.button>
      </div>

      {/* Row 1 */}
      <div className="mb-6 grid grid-cols-12 gap-6">
        {/* Card 1: col-span-4 - AI recommendations */}
        <BounceCard className="col-span-12 md:col-span-4 bg-muted/40 dark:bg-zinc-900/40 border border-border dark:border-white/5">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg text-white">
              <Sparkles className="size-4" />
            </span>
            <span className="size-fit rounded-full bg-secondary/15 px-2.5 py-0.5 text-[9px] font-bold text-secondary uppercase tracking-wider">
              AI MATCHING
            </span>
          </div>
          <CardTitle>Smart AI Recommendations</CardTitle>
          <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mt-2">
            Surfaces personalized matches based on attendee behavior and active interests.
          </p>
          
          {/* Custom high fidelity visual inside the card */}
          <div className="absolute bottom-0 left-6 right-6 top-48 translate-y-4 rounded-t-2xl bg-gradient-to-br from-violet-600/90 to-indigo-600 p-4 transition-transform duration-[300ms] group-hover:translate-y-1.5 group-hover:rotate-[1deg] border border-white/10 shadow-2xl flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-100">Recommended for Alex</span>
                <span className="text-[9px] font-bold bg-[#00c9a7] text-white px-2 py-0.5 rounded-full">98% Match</span>
              </div>
              <div className="bg-white/10 rounded-lg p-2.5 border border-white/15">
                <div className="font-bold text-white text-[11px] truncate">Decentralized Web Summit</div>
                <div className="text-[9px] text-indigo-200 mt-0.5">June 18 • San Francisco</div>
              </div>
            </div>
            <div className="flex -space-x-1 bg-white/5 py-1.5 px-2 rounded-lg border border-white/5 items-center justify-between text-[9px] text-indigo-100 font-mono">
              <span>Matching cohort parameters...</span>
              <span className="animate-pulse font-bold text-[#00c9a7]">ACTIVE</span>
            </div>
          </div>
        </BounceCard>

        {/* Card 2: col-span-8 - Predictive modeling */}
        <BounceCard className="col-span-12 md:col-span-8 bg-muted/40 dark:bg-zinc-900/40 border border-border dark:border-white/5">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg text-white">
              <LineChart className="size-4" />
            </span>
            <span className="size-fit rounded-full bg-secondary/15 px-2.5 py-0.5 text-[9px] font-bold text-secondary uppercase tracking-wider">
              DATA MODELING
            </span>
          </div>
          <CardTitle>Predictive Attendance Modeling</CardTitle>
          <p className="text-muted-foreground text-xs leading-relaxed max-w-sm mt-2">
            ML-based forecasting analyzes active reservation rates to predict overall venue capacity requirements.
          </p>
          
          {/* Custom high fidelity visual inside the card */}
          <div className="absolute bottom-0 left-6 right-6 top-48 translate-y-4 rounded-t-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-4 transition-transform duration-[300ms] group-hover:translate-y-1.5 group-hover:rotate-[0.5deg] border border-white/10 shadow-2xl flex flex-col justify-between">
            <div className="flex justify-between items-center text-white">
              <div>
                <span className="text-[10px] font-bold text-orange-100 uppercase tracking-wider block">Projection Index</span>
                <span className="text-sm font-extrabold font-mono">1,120 Predicted (±12)</span>
              </div>
              <div className="bg-white/10 rounded-lg px-2.5 py-1 flex items-center gap-1">
                <Flame className="size-3 text-yellow-300 animate-pulse" />
                <span className="text-[9px] font-bold">Optimal Window</span>
              </div>
            </div>

            {/* Micro Bars graph */}
            <div className="flex items-end gap-1.5 h-16 pt-2">
              {[25, 45, 30, 60, 40, 75, 55, 90, 85, 78, 95].map((val, i) => (
                <div key={i} className="flex-1 bg-white/20 hover:bg-white/40 transition-colors rounded-t h-full relative" style={{ height: `${val}%` }}>
                  {i === 8 && <div className="absolute inset-0 bg-[#00c9a7] rounded-t animate-pulse" />}
                </div>
              ))}
            </div>
          </div>
        </BounceCard>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-12 gap-6">
        {/* Card 3: col-span-8 - QR check-in */}
        <BounceCard className="col-span-12 md:col-span-8 bg-muted/40 dark:bg-zinc-900/40 border border-border dark:border-white/5">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg text-white">
              <QrCode className="size-4" />
            </span>
            <span className="size-fit rounded-full bg-secondary/15 px-2.5 py-0.5 text-[9px] font-bold text-secondary uppercase tracking-wider">
              TICKETING
            </span>
          </div>
          <CardTitle>Instant QR Code Ticketing</CardTitle>
          <p className="text-muted-foreground text-xs leading-relaxed max-w-sm mt-2">
            Frictionless and secure digital credentials enabling rapid contactless gate check-ins at entry.
          </p>
          
          {/* Custom high fidelity visual inside the card */}
          <div className="absolute bottom-0 left-6 right-6 top-48 translate-y-4 rounded-t-2xl bg-gradient-to-br from-green-600 to-emerald-600 p-5 transition-transform duration-[300ms] group-hover:translate-y-1.5 group-hover:rotate-[0.5deg] border border-white/10 shadow-2xl flex items-center justify-between">
            <div className="space-y-2 text-white">
              <span className="text-[10px] bg-white/10 rounded-full px-2 py-0.5 font-mono">Scan verified</span>
              <div className="space-y-0.5">
                <h5 className="font-extrabold text-sm tracking-tight">Tech Summit Entry VIP</h5>
                <p className="text-[10px] text-emerald-100">Gate #2 Staff Verified</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#00c9a7] font-bold bg-black/20 px-2 py-1 rounded-md w-fit">
                <CheckCircle className="size-3.5 text-secondary" />
                Checked in
              </div>
            </div>

            {/* Glowing mock QR code */}
            <div className="size-20 bg-white p-2 rounded-lg relative flex items-center justify-center shadow-lg transform rotate-3 shrink-0">
              <svg className="size-full text-black" viewBox="0 0 100 100" fill="currentColor">
                <rect x="0" y="0" width="20" height="20" />
                <rect x="80" y="0" width="20" height="20" />
                <rect x="0" y="80" width="20" height="20" />
                <rect x="35" y="35" width="30" height="30" />
                <rect x="10" y="30" width="10" height="10" />
                <rect x="60" y="10" width="10" height="10" />
                <rect x="75" y="55" width="15" height="15" />
                <rect x="25" y="70" width="10" height="15" />
              </svg>
              <div className="absolute -inset-1 rounded-lg border-2 border-[#00c9a7] animate-pulse" />
            </div>
          </div>
        </BounceCard>

        {/* Card 4: col-span-4 - AI chatbot */}
        <BounceCard className="col-span-12 md:col-span-4 bg-muted/40 dark:bg-zinc-900/40 border border-border dark:border-white/5">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg text-white">
              <MessageSquareText className="size-4" />
            </span>
            <span className="size-fit rounded-full bg-[#5b4cf5]/15 px-2.5 py-0.5 text-[9px] font-bold text-primary uppercase tracking-wider">
              SUPPORT
            </span>
          </div>
          <CardTitle>Autonomous AI Support</CardTitle>
          <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mt-2">
            24/7 intelligent EventBot responding to attendee inquiries instantly with personalized assistance.
          </p>
          
          {/* Custom high fidelity visual inside the card */}
          <div className="absolute bottom-0 left-6 right-6 top-48 translate-y-4 rounded-t-2xl bg-gradient-to-br from-pink-600/90 to-red-600 p-4 transition-transform duration-[300ms] group-hover:translate-y-1.5 group-hover:rotate-[-1deg] border border-white/10 shadow-2xl flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <div className="size-3.5 rounded-full bg-secondary animate-pulse" />
                <span className="text-[9px] font-extrabold text-white uppercase tracking-wider">Eventbot Assistance</span>
              </div>
              <div className="bg-black/20 rounded-xl p-2.5 border border-white/5 text-[10px] text-white space-y-1">
                <p className="opacity-90">"Where is the speaker deck?"</p>
                <div className="h-px bg-white/5 my-1" />
                <p className="font-semibold text-secondary flex items-center gap-1">
                  <span className="size-1 rounded-full bg-secondary" />
                  "Level 2, Main Exhibition Annex"
                </p>
              </div>
            </div>
            <div className="text-[8px] text-pink-200 text-center font-mono opacity-80 pt-1">
              96% resolution rate computed
            </div>
          </div>
        </BounceCard>
      </div>
    </div>
  );
};

interface BounceCardProps {
  className?: string;
  children: React.ReactNode;
}

const BounceCard = ({ className = "", children }: BounceCardProps) => {
  return (
    <motion.div
      whileHover={{ scale: 0.98, rotate: "-0.5deg" }}
      className={`group relative min-h-[460px] cursor-pointer overflow-hidden rounded-[24px] p-6 sm:p-8 transition-shadow hover:shadow-[0_20px_50px_rgba(91,76,245,0.08)] ${className}`}
    >
      {children}
    </motion.div>
  );
};

interface CardTitleProps {
  children: React.ReactNode;
}

const CardTitle = ({ children }: CardTitleProps) => {
  return (
    <h3 className="font-display text-2xl font-extrabold tracking-tight text-ink dark:text-white">
      {children}
    </h3>
  );
};
