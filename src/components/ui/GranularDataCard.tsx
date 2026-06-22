/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * GranularDataCard — Interactive expandable stat card with micro-interactions.
 * 
 * Hover: smooth scale(1.03) with snappy spring animation.
 * Click: gracefully expands downward to reveal extra details
 * using AnimatePresence + layout for jank-free height transitions.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface GranularDataCardProps {
  /** Icon element (Lucide component) */
  icon: React.ReactNode;
  /** Stat label (e.g., "Humidity") */
  label: string;
  /** Primary value (e.g., "72%") */
  value: string;
  /** Optional expanded detail content */
  details?: React.ReactNode;
  /** Additional className for the container */
  className?: string;
  /** Whether this card spans full width */
  fullWidth?: boolean;
}

export default function GranularDataCard({
  icon,
  label,
  value,
  details,
  className = "",
  fullWidth = false,
}: GranularDataCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      layout
      className={`bg-white/[0.04] backdrop-blur-[16px] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] rounded-3xl overflow-hidden cursor-pointer select-none ${
        fullWidth ? "col-span-2" : ""
      } ${className}`}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={() => details && setIsExpanded((prev) => !prev)}
    >
      <motion.div layout="position" className="p-4 flex items-center gap-3">
        <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400 shrink-0">
          {icon}
        </div>
        {fullWidth ? (
          <div className="flex-1 flex justify-between items-center pr-2">
            <div>
              <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                {label}
              </span>
              <span className="font-mono text-sm font-bold text-slate-100">
                {value}
              </span>
            </div>
            {details && (
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg font-mono"
              >
                {isExpanded ? "▲" : "▼"}
              </motion.div>
            )}
          </div>
        ) : (
          <div>
            <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              {label}
            </span>
            <span className="font-mono text-sm font-bold text-slate-100">
              {value}
            </span>
          </div>
        )}
      </motion.div>

      {/* Expandable detail section */}
      <AnimatePresence initial={false}>
        {isExpanded && details && (
          <motion.div
            layout
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-white/5">
              <div className="text-[11px] text-slate-300 leading-relaxed space-y-1">
                {details}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
