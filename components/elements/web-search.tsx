"use client";

import { motion } from "framer-motion";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  GlobeIcon,
  Loader2Icon,
  SearchIcon,
} from "lucide-react";
import type { ComponentProps } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * Vercel AI SDK source part structure (transformed from OpenRouter)
 * The SDK combines type+sourceType into "source-url"
 */
export type OpenRouterSourcePart = {
  type: "source-url";
  id: string;
  url: string;
  title?: string;
  providerMetadata?: {
    openrouter?: {
      content?: string;
    };
  };
};

export type WebSearchProps = ComponentProps<typeof Collapsible>;

export const WebSearch = ({ className, ...props }: WebSearchProps) => (
  <Collapsible
    className={cn(
      "not-prose mb-4 w-full max-w-full overflow-hidden rounded-2xl border-2 border-border/50 bg-gradient-to-b from-muted/40 to-muted/15 shadow-sm transition-all duration-200 hover:border-sky-500/30 hover:shadow-lg",
      className,
    )}
    {...props}
  />
);

export type WebSearchHeaderProps = {
  isSearching: boolean;
  sourceCount: number;
  className?: string;
};

export const WebSearchHeader = ({
  isSearching,
  sourceCount,
  className,
}: WebSearchHeaderProps) => {
  return (
    <CollapsibleTrigger
      className={cn(
        "group flex w-full min-w-0 items-center gap-3 p-4 transition-colors hover:bg-muted/50",
        className,
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 text-sky-600 shadow-sm ring-1 ring-sky-500/30 dark:from-sky-500/30 dark:to-blue-500/30 dark:text-sky-400 dark:ring-sky-500/40">
        {isSearching ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <SearchIcon className="size-4" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start">
        <span className="truncate font-medium text-base max-w-full">
          {isSearching ? "Searching the web..." : "Web Search"}
        </span>
        <span className="truncate text-muted-foreground text-sm max-w-full hidden sm:block">
          {isSearching
            ? "Finding relevant information"
            : `Found ${sourceCount} source${sourceCount !== 1 ? "s" : ""}`}
        </span>
      </div>
      <div
        className={cn(
          "flex size-7 items-center justify-center rounded-lg transition-colors",
          isSearching
            ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        )}
      >
        {isSearching ? (
          <span className="size-2.5 rounded-full bg-sky-500 animate-pulse" />
        ) : (
          <CheckCircleIcon className="size-4" />
        )}
      </div>
      <ChevronDownIcon className="hidden size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 sm:block" />
    </CollapsibleTrigger>
  );
};

export type WebSearchContentProps = ComponentProps<typeof CollapsibleContent>;

export const WebSearchContent = ({
  className,
  ...props
}: WebSearchContentProps) => (
  <CollapsibleContent
    className={cn(
      "overflow-hidden border-t border-border/50 bg-background/50",
      "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
      className,
    )}
    {...props}
  />
);

export type WebSearchSourcesProps = ComponentProps<"div"> & {
  sources: OpenRouterSourcePart[];
};

export const WebSearchSources = ({
  sources,
  className,
  ...props
}: WebSearchSourcesProps) => (
  <div className={cn("space-y-2 p-4", className)} {...props}>
    <div className="flex items-center gap-2 mb-3">
      <div className="size-2 rounded-full bg-sky-500" />
      <h4 className="font-medium text-muted-foreground text-sm uppercase tracking-wider">
        Sources
      </h4>
    </div>
    <div className="grid gap-2">
      {sources.map((source, index) => (
        <WebSearchSourceItem key={source.id || index} source={source} />
      ))}
    </div>
  </div>
);

type WebSearchSourceItemProps = {
  source: OpenRouterSourcePart;
};

const WebSearchSourceItem = ({ source }: WebSearchSourceItemProps) => {
  let hostname = "";
  try {
    hostname = new URL(source.url).hostname;
  } catch {
    hostname = source.url.substring(0, 30);
  }

  // Extract content from providerMetadata
  const content = source.providerMetadata?.openrouter?.content;

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group/source flex items-start gap-3 rounded-xl bg-muted/50 p-3 ring-1 ring-border/50 transition-all hover:bg-muted hover:ring-sky-500/30"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
        <GlobeIcon className="size-4" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {source.title || hostname}
          </span>
          <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/source:opacity-100" />
        </div>
        <span className="text-xs text-muted-foreground truncate block">
          {hostname}
        </span>
        {content && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {content.substring(0, 150)}
            {content.length > 150 ? "..." : ""}
          </p>
        )}
      </div>
    </a>
  );
};

/**
 * Compact inline web search status indicator
 * Shows a small pill with icon and status (similar to ToolStatus)
 */
export type WebSearchStatusProps = {
  isSearching: boolean;
  sourceCount?: number;
};

export function WebSearchStatus({
  isSearching,
  sourceCount = 0,
}: WebSearchStatusProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
        isSearching
          ? "text-sky-500 bg-sky-500/10 border-sky-500/20"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      )}
    >
      {isSearching ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : (
        <CheckCircleIcon className="size-3.5" />
      )}
      <span>
        {isSearching
          ? "Searching..."
          : `${sourceCount} source${sourceCount !== 1 ? "s" : ""}`}
      </span>
    </motion.div>
  );
}
