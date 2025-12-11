"use client";

import { formatDistance } from "date-fns";
import {
  CheckCircleIcon,
  CodeIcon,
  CopyIcon,
  FileTextIcon,
  ImageIcon,
  SheetIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import type { ArtifactKind } from "@/components/artifact";
import { useArtifact } from "@/hooks/use-artifact";
import { cn } from "@/lib/utils";

interface ArtifactCardProps {
  id: string;
  title: string;
  kind: ArtifactKind;
  createdAt?: Date;
  isReadonly: boolean;
  action?: "created" | "updated";
}

// Get icon component based on artifact kind
function getArtifactIcon(kind: ArtifactKind): ReactNode {
  switch (kind) {
    case "text":
      return <FileTextIcon className="size-5" />;
    case "code":
      return <CodeIcon className="size-5" />;
    case "image":
      return <ImageIcon className="size-5" />;
    case "sheet":
      return <SheetIcon className="size-5" />;
    default:
      return <FileTextIcon className="size-5" />;
  }
}

// Get label for artifact kind
function getArtifactLabel(kind: ArtifactKind): string {
  switch (kind) {
    case "text":
      return "Document";
    case "code":
      return "Code";
    case "image":
      return "Image";
    case "sheet":
      return "Spreadsheet";
    default:
      return "Document";
  }
}

// Get color scheme for artifact kind
function getArtifactColors(kind: ArtifactKind): {
  iconBg: string;
  iconColor: string;
  border: string;
} {
  switch (kind) {
    case "text":
      return {
        iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
        iconColor: "text-blue-600 dark:text-blue-400",
        border: "border-blue-500/30 hover:border-blue-500/50",
      };
    case "code":
      return {
        iconBg: "bg-purple-500/10 dark:bg-purple-500/20",
        iconColor: "text-purple-600 dark:text-purple-400",
        border: "border-purple-500/30 hover:border-purple-500/50",
      };
    case "image":
      return {
        iconBg: "bg-pink-500/10 dark:bg-pink-500/20",
        iconColor: "text-pink-600 dark:text-pink-400",
        border: "border-pink-500/30 hover:border-pink-500/50",
      };
    case "sheet":
      return {
        iconBg: "bg-green-500/10 dark:bg-green-500/20",
        iconColor: "text-green-600 dark:text-green-400",
        border: "border-green-500/30 hover:border-green-500/50",
      };
    default:
      return {
        iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
        iconColor: "text-blue-600 dark:text-blue-400",
        border: "border-blue-500/30 hover:border-blue-500/50",
      };
  }
}

/**
 * ArtifactCard - An in-chat reference element for artifacts
 * Provides a visual card similar to tool execution summaries, allowing users to:
 * - See artifact metadata (type, title, timestamp)
 * - Open the artifact with a tap/click
 * - Copy a shareable link to the artifact
 */
export function ArtifactCard({
  id,
  title,
  kind,
  createdAt,
  isReadonly,
  action = "created",
}: ArtifactCardProps) {
  const { setArtifact } = useArtifact();
  const colors = getArtifactColors(kind);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isReadonly) {
      toast.error("Viewing files in shared chats is currently not supported.");
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    const boundingBox = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };

    setArtifact((currentArtifact) => ({
      documentId: id,
      kind,
      content: currentArtifact.content,
      title,
      isVisible: true,
      status: "idle",
      boundingBox,
    }));
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}#artifact-${id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied to clipboard");
    });
  };

  return (
    <div
      className={cn(
        "not-prose group relative w-full max-w-2xl overflow-hidden rounded-2xl border-2 bg-gradient-to-b from-muted/40 to-muted/15 shadow-sm transition-all duration-200 hover:shadow-lg",
        colors.border,
      )}
      data-testid="artifact-card"
    >
      <button
        className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/30"
        onClick={handleOpen}
        type="button"
      >
        {/* Icon */}
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-border/50",
            colors.iconBg,
            colors.iconColor,
          )}
        >
          {getArtifactIcon(kind)}
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/* Header row with action status */}
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="text-muted-foreground text-sm font-medium">
              {action === "created" ? "Artifact Created" : "Artifact Updated"}
            </span>
          </div>

          {/* Title */}
          <div className="truncate font-semibold text-base">{title}</div>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-background/50 px-2 py-0.5 ring-1 ring-border/50">
              {getArtifactLabel(kind)}
            </span>
            {createdAt && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span>
                  {formatDistance(createdAt, new Date(), {
                    addSuffix: true,
                  })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            onClick={handleCopyLink}
            title="Copy link"
            type="button"
            aria-label="Copy link to artifact"
          >
            <CopyIcon className="size-4" />
          </button>
          <div className="rounded-lg bg-orange-500/10 px-3 py-1.5 text-orange-600 text-sm font-medium dark:text-orange-400">
            Open →
          </div>
        </div>
      </button>
    </div>
  );
}
