"use client";
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

// Define the type for a single category item
export interface Category {
  id: string | number;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  featured?: boolean;
}

// Define the props for the CategoryList component
export interface CategoryListProps {
  title: string;
  subtitle?: string;
  categories: Category[];
  headerIcon?: React.ReactNode;
  className?: string;
}

export const CategoryList = ({
  title,
  subtitle,
  categories,
  headerIcon,
  className,
}: CategoryListProps) => {
  const [hoveredItem, setHoveredItem] = useState<string | number | null>(null);

  return (
    <div className={cn("relative isolate w-full overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(17,19,32,0.96),rgba(10,11,21,0.94))] p-6 text-white shadow-[0_30px_120px_-48px_rgba(0,0,0,0.75)] sm:p-8 lg:p-10", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute -left-24 top-10 h-56 w-56 rounded-full bg-[#5b4cf5]/12 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[#00c9a7]/10 blur-3xl" />

      <div className="relative mx-auto max-w-5xl">
        {/* Header Section */}
        <div className="text-center mb-10 md:mb-14">
          {headerIcon && (
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-primary-foreground shadow-[0_20px_50px_-24px_rgba(91,76,245,0.6)] backdrop-blur">
              {headerIcon}
            </div>
          )}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
            Platform Friction Points
          </div>
          <h2 className="mt-5 text-balance text-4xl font-extrabold tracking-tight font-display text-white md:text-5xl">{title}</h2>
          {subtitle && (
            <p className="mx-auto mt-3 max-w-2xl text-balance text-2xl font-semibold text-white/55 font-display md:text-3xl">{subtitle}</p>
          )}
        </div>

        {/* Categories List */}
        <div className="grid gap-4 md:grid-cols-2 xl:gap-5">
          {categories.map((category, index) => (
            <div
              key={category.id}
              className={cn("relative group", category.featured && "md:col-span-2")}
              onMouseEnter={() => setHoveredItem(category.id)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={category.onClick}
            >
              <div
                className={cn(
                  "relative h-full overflow-hidden rounded-[1.75rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] p-6 transition-all duration-300 ease-out cursor-pointer backdrop-blur-sm",
                  hoveredItem === category.id
                    ? 'border-[#00c9a7]/45 bg-[linear-gradient(180deg,rgba(0,201,167,0.12),rgba(255,255,255,0.02))] shadow-[0_24px_60px_-32px_rgba(0,201,167,0.35)] -translate-y-1'
                    : 'hover:border-white/15 hover:-translate-y-0.5'
                )}
              >
                <div aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
                <div aria-hidden className={cn("pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl transition-opacity duration-300", hoveredItem === category.id ? "bg-[#00c9a7]/14 opacity-100" : "bg-[#5b4cf5]/10 opacity-70")} />

                {/* Content */}
                <div className="flex h-full flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <div className="mb-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/35">
                      <span>{`Issue 0${index + 1}`}</span>
                      {category.featured && <span className="rounded-full border border-[#00c9a7]/25 bg-[#00c9a7]/10 px-2.5 py-1 text-[10px] tracking-[0.18em] text-[#00c9a7]">Priority</span>}
                    </div>
                    <h3
                      className={cn(
                        "font-bold transition-colors duration-300 font-display text-balance",
                        category.featured ? 'text-2xl md:text-[2rem]' : 'text-xl md:text-2xl',
                        hoveredItem === category.id ? 'text-[#00c9a7]' : 'text-white'
                      )}
                    >
                      {category.title}
                    </h3>
                    {category.subtitle && (
                      <p
                        className={cn(
                          "mt-3 max-w-xl transition-colors duration-300 text-sm leading-relaxed md:text-[15px]",
                          hoveredItem === category.id ? 'text-white/88' : 'text-white/60'
                        )}
                      >
                        {category.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Icon */}
                  {category.icon && (
                    <div className={cn(
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 transition-all duration-300",
                      hoveredItem === category.id 
                        ? 'text-[#00c9a7] bg-[#00c9a7]/12 scale-105 opacity-100 shadow-[0_12px_32px_-18px_rgba(0,201,167,0.6)]' 
                        : 'bg-white/[0.03] text-white/45 opacity-100'
                    )}>
                      {category.icon}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
