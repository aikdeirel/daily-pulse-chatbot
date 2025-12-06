"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type GoogleToolGroupId,
  googleToolGroups,
} from "@/lib/ai/tools/google/groups";
import { cn } from "@/lib/utils";
import { GoogleIcon } from "./icons";

export function GoogleToolSelector({
  selectedGroupIds,
  onChange,
  disabled,
}: {
  selectedGroupIds: GoogleToolGroupId[];
  onChange: (next: GoogleToolGroupId[]) => void;
  disabled?: boolean;
}) {
  // Track if component has mounted (client-side only)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use empty array during SSR to match initial localStorage state
  const effectiveSelectedGroupIds = mounted ? selectedGroupIds : [];

  // Use useMemo to stabilize the selection calculation
  const selection = useMemo(
    () => new Set(effectiveSelectedGroupIds),
    [effectiveSelectedGroupIds],
  );
  const totalGroups = googleToolGroups.length;
  const enabledCount = selection.size;
  const isNoneEnabled = enabledCount === 0;
  const isAllEnabled = enabledCount === totalGroups && totalGroups > 0;

  // Use useMemo to stabilize the summary text to prevent hydration mismatches
  const summary = useMemo(() => {
    return isNoneEnabled
      ? "Google tools disabled"
      : `${enabledCount}/${totalGroups} groups enabled`;
  }, [isNoneEnabled, enabledCount, totalGroups]);

  // Use useMemo to stabilize button classes to prevent hydration mismatches
  const buttonClasses = useMemo(() => {
    if (isAllEnabled) {
      return "bg-gradient-to-br from-[#4285F4] via-[#EA4335] to-[#FBBC05] text-white hover:opacity-90";
    } else if (isNoneEnabled) {
      return "hover:bg-accent";
    } else {
      return "bg-gradient-to-br from-[#4285F4] via-[#EA4335] to-[#FBBC05] text-white hover:opacity-90";
    }
  }, [isAllEnabled, isNoneEnabled]);

  const handleToggle = (groupId: GoogleToolGroupId, checked: boolean) => {
    const next = new Set(selection);
    if (checked) {
      next.add(groupId);
    } else {
      next.delete(groupId);
    }
    onChange(Array.from(next));
  };

  const handleSetAll = (enabled: boolean) => {
    if (enabled) {
      onChange(googleToolGroups.map((group) => group.id));
    } else {
      onChange([]);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn(
            "aspect-square h-8 shrink-0 rounded-lg p-1 transition-colors",
            buttonClasses,
          )}
          data-testid="google-groups-toggle"
          disabled={disabled}
          title={summary}
          variant="ghost"
        >
          <GoogleIcon size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-2">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Google tool groups
          <div className="font-medium text-foreground">{summary}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {googleToolGroups.map((group) => {
          const checked = selection.has(group.id);
          return (
            <DropdownMenuCheckboxItem
              checked={checked}
              className="flex flex-col gap-1 py-2"
              key={group.id}
              onCheckedChange={(nextChecked) =>
                handleToggle(group.id, Boolean(nextChecked))
              }
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-sm font-medium">{group.label}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {group.tools.length} tools
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {group.description}
              </p>
            </DropdownMenuCheckboxItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-xs"
          onSelect={(event) => {
            event.preventDefault();
            handleSetAll(true);
          }}
        >
          Enable all groups
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-xs"
          onSelect={(event) => {
            event.preventDefault();
            handleSetAll(false);
          }}
        >
          Disable all groups
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
