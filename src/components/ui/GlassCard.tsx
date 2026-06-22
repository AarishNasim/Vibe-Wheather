/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * GlassCard — Reusable glassmorphism container component.
 * Applies backdrop-blur, translucent background, and subtle 1px
 * semi-transparent border with an optional inner glow.
 */

import React from "react";
import { motion } from "motion/react";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  /** 'default' = standard glass, 'heavy' = deeper blur + stronger bg */
  variant?: "default" | "heavy";
  /** Disable mount animation for static uses (e.g., skeleton) */
  animate?: boolean;
  onClick?: () => void;
  /** React key for list rendering */
  key?: React.Key;
}

export default function GlassCard({
  children,
  className = "",
  variant = "default",
  animate = true,
  onClick,
}: GlassCardProps) {
  const variantStyles =
    variant === "heavy"
      ? "bg-white/[0.07] backdrop-blur-[24px] border border-white/[0.12] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
      : "bg-white/[0.04] backdrop-blur-[16px] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]";

  if (!animate) {
    return (
      <div
        className={`rounded-3xl ${variantStyles} ${className}`}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`rounded-3xl ${variantStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
