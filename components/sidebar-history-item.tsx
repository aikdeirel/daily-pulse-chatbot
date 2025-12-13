import { motion } from "framer-motion";
import Link from "next/link";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import type { Chat } from "@/lib/db/schema";
import { useTitleForChat } from "./chat-title-context";
import {
  CheckCircleFillIcon,
  GlobeIcon,
  LockIcon,
  MoreHorizontalIcon,
  PencilEditIcon,
  ShareIcon,
  TrashIcon,
} from "./icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";

const PureChatItem = ({
  chat,
  isActive,
  onDelete,
  setOpenMobile,
}: {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  setOpenMobile: (open: boolean) => void;
}) => {
  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId: chat.id,
    initialVisibilityType: chat.visibility,
  });

  // Use the context-based title state for reactive updates
  const {
    title: displayTitle,
    isGenerating: isTitleGenerating,
    setTitle,
  } = useTitleForChat(chat.id, chat.title);

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(displayTitle || chat.title);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sidebarItemRef = useRef<HTMLLIElement>(null);

  // Update editedTitle when displayTitle changes
  useEffect(() => {
    if (!isEditing) {
      setEditedTitle(displayTitle || chat.title);
    }
  }, [displayTitle, chat.title, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEditStart = () => {
    setIsEditing(true);
  };

  const handleEditCancel = useCallback(() => {
    setEditedTitle(displayTitle || chat.title);
    setIsEditing(false);
  }, [displayTitle, chat.title]);

  const handleEditSave = async () => {
    // Prevent multiple save attempts
    if (isSaving) return;

    const trimmedTitle = editedTitle.trim();

    if (!trimmedTitle) {
      toast.error("Title cannot be empty");
      setEditedTitle(displayTitle || chat.title);
      setIsEditing(false);
      return;
    }

    if (trimmedTitle === (displayTitle || chat.title)) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/chat?id=${chat.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: trimmedTitle }),
      });

      if (!response.ok) {
        throw new Error("Failed to update title");
      }

      const result = await response.json();
      setTitle(chat.id, result.title);
      toast.success("Title updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating chat title:", error);
      toast.error("Failed to update title");
      setEditedTitle(displayTitle || chat.title);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleEditCancel();
    }
  };

  // Handle click outside to cancel edit
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Don't cancel if clicking within the sidebar item (including dropdown)
      if (sidebarItemRef.current?.contains(event.target as Node)) {
        return;
      }

      // Cancel edit if clicking outside the sidebar item
      handleEditCancel();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing, handleEditCancel]);

  return (
    <SidebarMenuItem data-testid="sidebar-history-item" ref={sidebarItemRef}>
      <SidebarMenuButton asChild isActive={isActive}>
        {isEditing ? (
          <div className="flex items-center gap-2 w-full px-2">
            <Input
              ref={inputRef}
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm"
              data-testid="sidebar-history-item-title-input"
              aria-label="Edit chat title"
              disabled={isSaving}
            />
          </div>
        ) : (
          <Link href={`/chat/${chat.id}`} onClick={() => setOpenMobile(false)}>
            {isTitleGenerating ? (
              <motion.div
                className="flex items-center gap-2 w-full"
                data-testid="sidebar-history-item-generating"
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="h-4 flex-1 max-w-[120px] animate-pulse rounded bg-sidebar-accent-foreground/20" />
                <span className="text-[10px] text-sidebar-foreground/40 animate-pulse shrink-0"></span>
              </motion.div>
            ) : (
              <span data-testid="sidebar-history-item-title">
                {displayTitle || chat.title}
              </span>
            )}
          </Link>
        )}
      </SidebarMenuButton>

      <DropdownMenu modal={true}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            className="mr-0.5 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            showOnHover={!isActive}
          >
            <MoreHorizontalIcon />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={handleEditStart}
          >
            <PencilEditIcon />
            <span>Edit Title</span>
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <ShareIcon />
              <span>Share</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  className="cursor-pointer flex-row justify-between"
                  onClick={() => {
                    setVisibilityType("private");
                  }}
                >
                  <div className="flex flex-row items-center gap-2">
                    <LockIcon size={12} />
                    <span>Private</span>
                  </div>
                  {visibilityType === "private" ? (
                    <CheckCircleFillIcon />
                  ) : null}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer flex-row justify-between"
                  onClick={() => {
                    setVisibilityType("public");
                  }}
                >
                  <div className="flex flex-row items-center gap-2">
                    <GlobeIcon />
                    <span>Public</span>
                  </div>
                  {visibilityType === "public" ? <CheckCircleFillIcon /> : null}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
            onSelect={() => onDelete(chat.id)}
          >
            <TrashIcon />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

export const ChatItem = memo(PureChatItem);
