"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { PlusIcon, VercelIcon } from "./icons";
import { useSidebar } from "./ui/sidebar";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const router = useRouter();
  const { open } = useSidebar();

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/40 bg-background/90 px-3 py-3 backdrop-blur-md md:px-4">
      <SidebarToggle />

      <Button
        className={`order-2 ml-auto h-10 rounded-xl px-3 transition-colors md:order-1 md:ml-0 md:h-fit md:px-3 ${open ? "md:hidden" : ""}`}
        onClick={() => {
          router.push("/");
          router.refresh();
        }}
        variant="outline"
      >
        <PlusIcon />
        <span className="md:sr-only">New Chat</span>
      </Button>

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          className="order-1 md:order-2"
          selectedVisibilityType={selectedVisibilityType}
        />
      )}

      <Button
        asChild
        className="order-3 hidden rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 text-white shadow-md shadow-orange-500/20 transition-all hover:from-orange-400 hover:to-amber-400 hover:shadow-lg md:ml-auto md:flex md:h-fit dark:from-orange-500 dark:to-amber-500"
      >
        <Link
          href={"https://vercel.com/templates/next.js/nextjs-ai-chatbot"}
          rel="noreferrer"
          target="_noblank"
        >
          <VercelIcon size={16} />
          Deploy with Vercel
        </Link>
      </Button>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});
