"use client";

import type { ToolUIPart } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpenIcon,
  CheckCircleIcon,
  CloudIcon,
  FileTextIcon,
  LightbulbIcon,
  Loader2Icon,
  PencilIcon,
  SparklesIcon,
  WrenchIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ToolStatusProps {
  type: string;
  state: ToolUIPart["state"];
  title?: string;
}

// Tool configuration for compact display - data only, no JSX
type ToolConfigEntry = { label: string; color: string };
const toolConfigData: Record<string, ToolConfigEntry> = {
  "tool-getWeather": {
    label: "Weather",
    color: "text-sky-500 bg-sky-500/10 border-sky-500/20",
  },
  "tool-createDocument": {
    label: "Creating",
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  "tool-updateDocument": {
    label: "Updating",
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  "tool-requestSuggestions": {
    label: "Suggestions",
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  },
  "tool-useSkill": {
    label: "Skill",
    color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  },
  "tool-getSkillResource": {
    label: "Resource",
    color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
  },
};

// Get icon component at render time
function getToolIcon(type: string, className: string = "size-3.5"): ReactNode {
  switch (type) {
    case "tool-getWeather":
      return <CloudIcon className={className} />;
    case "tool-createDocument":
      return <FileTextIcon className={className} />;
    case "tool-updateDocument":
      return <PencilIcon className={className} />;
    case "tool-requestSuggestions":
      return <LightbulbIcon className={className} />;
    case "tool-useSkill":
      return <SparklesIcon className={className} />;
    case "tool-getSkillResource":
      return <BookOpenIcon className={className} />;
    default:
      return <WrenchIcon className={className} />;
  }
}

/**
 * Compact inline tool status indicator
 * Shows a small pill with icon and status
 */
export function ToolStatus({ type, state, title }: ToolStatusProps) {
  const config = toolConfigData[type] || {
    label: type.replace("tool-", ""),
    color: "text-muted-foreground bg-muted border-border",
  };

  const isRunning = state === "input-available" || state === "input-streaming";
  const isComplete = state === "output-available";
  const isError = state === "output-error";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
        config.color,
        isComplete && "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        isError && "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
      )}
    >
      {isRunning ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : isComplete ? (
        <CheckCircleIcon className="size-3.5" />
      ) : (
        getToolIcon(type)
      )}
      <span>{title || config.label}</span>
    </motion.div>
  );
}

/**
 * Container for multiple tool status indicators
 */
export function ToolStatusBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <AnimatePresence mode="popLayout">
        {children}
      </AnimatePresence>
    </div>
  );
}
