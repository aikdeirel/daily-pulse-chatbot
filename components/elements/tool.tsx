"use client";

import type { ToolUIPart } from "ai";
import {
  BookOpenIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  CloudIcon,
  FileTextIcon,
  LightbulbIcon,
  PencilIcon,
  SparklesIcon,
  WrenchIcon,
  XCircleIcon,
  ZapIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn(
      "not-prose mb-4 w-full overflow-hidden rounded-xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/10 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md",
      className
    )}
    {...props}
  />
);

export type ToolHeaderProps = {
  type: ToolUIPart["type"] | string;
  state: ToolUIPart["state"];
  className?: string;
  title?: string;
  description?: string;
};

// Tool configuration - using functions to create icons at render time
type ToolConfigEntry = { label: string; color: string; description: string };
const toolConfigData: Record<string, ToolConfigEntry> = {
  "tool-getWeather": {
    label: "Weather",
    color: "text-sky-500",
    description: "Fetching weather data",
  },
  "tool-createDocument": {
    label: "Create Document",
    color: "text-emerald-500",
    description: "Creating a new document",
  },
  "tool-updateDocument": {
    label: "Update Document",
    color: "text-amber-500",
    description: "Updating document content",
  },
  "tool-requestSuggestions": {
    label: "Suggestions",
    color: "text-purple-500",
    description: "Generating suggestions",
  },
  "tool-useSkill": {
    label: "Loading Skill",
    color: "text-indigo-500",
    description: "Activating specialized skill",
  },
  "tool-getSkillResource": {
    label: "Skill Resource",
    color: "text-cyan-500",
    description: "Loading skill resource",
  },
};

// Get icon component based on tool type
function getToolIcon(type: string, className: string = "size-4"): ReactNode {
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

// Get status icon based on state
function getStatusIcon(status: ToolUIPart["state"], className: string = "size-3.5"): ReactNode {
  switch (status) {
    case "input-streaming":
      return <CircleIcon className={className} />;
    case "input-available":
      return <ZapIcon className={cn(className, "animate-pulse")} />;
    case "output-available":
      return <CheckCircleIcon className={className} />;
    case "output-error":
      return <XCircleIcon className={className} />;
  }
}

type StatusConfig = { label: string; className: string; dotColor: string };
const statusConfigData: Record<ToolUIPart["state"], StatusConfig> = {
  "input-streaming": {
    label: "Preparing",
    className: "bg-muted text-muted-foreground",
    dotColor: "bg-muted-foreground",
  },
  "input-available": {
    label: "Running",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dotColor: "bg-amber-500",
  },
  "output-available": {
    label: "Completed",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
  },
  "output-error": {
    label: "Error",
    className: "bg-red-500/10 text-red-600 dark:text-red-400",
    dotColor: "bg-red-500",
  },
};

function StatusBadge({ status }: { status: ToolUIPart["state"] }) {
  const config = statusConfigData[status];

  return (
    <Badge
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        config.className
      )}
      variant="secondary"
    >
      <span className={cn("size-1.5 rounded-full animate-pulse", config.dotColor)} />
      {getStatusIcon(status)}
      <span>{config.label}</span>
    </Badge>
  );
}

export const ToolHeader = ({
  className,
  type,
  state,
  title,
  description,
}: ToolHeaderProps) => {
  const config = toolConfigData[type] || {
    label: type.replace("tool-", ""),
    color: "text-muted-foreground",
    description: "Processing",
  };

  return (
    <CollapsibleTrigger
      className={cn(
        "group flex w-full min-w-0 items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/50",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-background to-muted shadow-sm ring-1 ring-border/50",
          config.color
        )}>
          {getToolIcon(type)}
        </div>
        <div className="flex min-w-0 flex-col items-start gap-0.5">
          <span className="truncate font-semibold text-sm">
            {title || config.label}
          </span>
          <span className="truncate text-muted-foreground text-xs">
            {description || config.description}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StatusBadge status={state} />
        <ChevronDownIcon className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </div>
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "overflow-hidden border-t border-border/50 bg-background/50",
      "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
      className
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolUIPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("space-y-3 p-4", className)} {...props}>
    <div className="flex items-center gap-2">
      <div className="size-1.5 rounded-full bg-sky-500" />
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
        Parameters
      </h4>
    </div>
    <div className="overflow-hidden rounded-lg bg-muted/50 ring-1 ring-border/50">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ReactNode;
  errorText: ToolUIPart["errorText"];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  return (
    <div className={cn("space-y-3 p-4", className)} {...props}>
      <div className="flex items-center gap-2">
        <div className={cn(
          "size-1.5 rounded-full",
          errorText ? "bg-red-500" : "bg-emerald-500"
        )} />
        <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          {errorText ? "Error" : "Result"}
        </h4>
      </div>
      <div
        className={cn(
          "overflow-x-auto rounded-lg text-sm ring-1",
          errorText
            ? "bg-red-500/5 text-red-600 ring-red-500/20 dark:text-red-400"
            : "bg-muted/50 text-foreground ring-border/50"
        )}
      >
        {errorText && <div className="p-3">{errorText}</div>}
        {output && <div>{output}</div>}
      </div>
    </div>
  );
};

// Skill-specific output component for pretty rendering
export const SkillOutput = ({ 
  skillId, 
  skillName,
  instructions 
}: { 
  skillId: string; 
  skillName: string;
  instructions: string;
}) => (
  <div className="space-y-3 p-4">
    <div className="flex items-center gap-2">
      <div className="size-1.5 rounded-full bg-indigo-500" />
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
        Skill Loaded
      </h4>
    </div>
    <div className="rounded-lg bg-gradient-to-br from-indigo-500/5 to-purple-500/5 p-4 ring-1 ring-indigo-500/20">
      <div className="flex items-center gap-2 mb-2">
        <SparklesIcon className="size-4 text-indigo-500" />
        <span className="font-semibold text-sm">{skillName}</span>
        <Badge variant="outline" className="text-xs">{skillId}</Badge>
      </div>
      <p className="text-muted-foreground text-xs line-clamp-2">
        {instructions.substring(0, 150)}...
      </p>
    </div>
  </div>
);
