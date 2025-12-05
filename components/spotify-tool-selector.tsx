"use client";

import { useMemo } from "react";
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
  type SpotifyToolGroupId,
  spotifyToolGroups,
} from "@/lib/ai/tools/spotify/groups";
import { cn } from "@/lib/utils";
import { SpotifyIcon } from "./icons";

export function SpotifyToolSelector({
  selectedGroupIds,
  onChange,
  disabled,
}: {
  selectedGroupIds: SpotifyToolGroupId[];
  onChange: (next: SpotifyToolGroupId[]) => void;
  disabled?: boolean;
}) {
  const selection = useMemo(
    () => new Set(selectedGroupIds),
    [selectedGroupIds],
  );
  const totalGroups = spotifyToolGroups.length;
  const enabledCount = selection.size;
  const isNoneEnabled = enabledCount === 0;
  const isAllEnabled = enabledCount === totalGroups && totalGroups > 0;

  const summary = isNoneEnabled
    ? "Spotify tools disabled"
    : `${enabledCount}/${totalGroups} groups enabled`;

  const handleToggle = (groupId: SpotifyToolGroupId, checked: boolean) => {
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
      onChange(spotifyToolGroups.map((group) => group.id));
    } else {
      onChange([]);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn(
            "aspect-square h-8 rounded-lg p-1 transition-colors",
            isAllEnabled
              ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400"
              : isNoneEnabled
                ? "hover:bg-accent"
                : "bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 dark:text-amber-400",
          )}
          data-testid="spotify-groups-toggle"
          disabled={disabled}
          title={summary}
          variant="ghost"
        >
          <SpotifyIcon size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-2">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Spotify tool groups
          <div className="font-medium text-foreground">{summary}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {spotifyToolGroups.map((group) => {
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
