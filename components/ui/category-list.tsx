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
    <div className={cn("w-full bg-[#13141f] text-white p-8 rounded-3xl border border-white/5", className)}>
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12 md:mb-16">
          {headerIcon && (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/80 to-primary mb-6 text-primary-foreground shadow-lg shadow-primary/20 animate-pulse">
              {headerIcon}
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight font-display text-white">{title}</h1>
          {subtitle && (
            <h2 className="text-4xl md:text-5xl font-bold text-muted-foreground font-display">{subtitle}</h2>
          )}
        </div>

        {/* Categories List */}
        <div className="space-y-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="relative group"
              onMouseEnter={() => setHoveredItem(category.id)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={category.onClick}
            >
              <div
                className={cn(
                  "relative overflow-hidden border bg-zinc-950/60 transition-all duration-300 ease-in-out cursor-pointer rounded-2xl",
                  // Hover state styles
                  hoveredItem === category.id
                    ? 'h-32 border-[#00c9a7] shadow-lg shadow-[#00c9a7]/10 bg-[#00c9a7]/5'
                    : 'h-24 border-white/5 hover:border-[#00c9a7]/40'
                )}
              >
                {/* Corner brackets that appear on hover */}
                {hoveredItem === category.id && (
                  <>
                    <div className="absolute top-4 left-4 w-6 h-6">
                      <div className="absolute top-0 left-0 w-4 h-0.5 bg-[#00c9a7]" />
                      <div className="absolute top-0 left-0 w-0.5 h-4 bg-[#00c9a7]" />
                    </div>
                    <div className="absolute bottom-4 right-4 w-6 h-6">
                      <div className="absolute bottom-0 right-0 w-4 h-0.5 bg-[#00c9a7]" />
                      <div className="absolute bottom-0 right-0 w-0.5 h-4 bg-[#00c9a7]" />
                    </div>
                  </>
                )}

                {/* Content */}
                <div className="flex items-center justify-between h-full px-6 md:px-8">
                  <div className="flex-1">
                    <h3
                      className={cn(
                        "font-bold transition-colors duration-300 font-display",
                        category.featured ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl',
                        hoveredItem === category.id ? 'text-[#00c9a7]' : 'text-white'
                      )}
                    >
                      {category.title}
                    </h3>
                    {category.subtitle && (
                      <p
                        className={cn(
                          "mt-1.5 transition-colors duration-300 text-xs md:text-sm",
                           hoveredItem === category.id ? 'text-white/95' : 'text-white/60'
                        )}
                      >
                        {category.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Icon appears on the right on hover */}
                  {category.icon && (
                    <div className={cn(
                      "transition-all duration-300 p-2 rounded-xl",
                      hoveredItem === category.id 
                        ? 'text-[#00c9a7] bg-[#00c9a7]/10 scale-110 opacity-100' 
                        : 'text-white/40 opacity-40'
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
