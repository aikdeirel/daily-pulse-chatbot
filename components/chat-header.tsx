"use client";

import { AnimatePresence, motion } from "framer-motion";
import { GlobeIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { SpotifyNowPlayingIndicator } from "@/components/spotify-now-playing-indicator";
import { Button } from "@/components/ui/button";
import { PlusIcon, VercelIcon } from "./icons";
import { useSidebar } from "./ui/sidebar";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

function PureChatHeader({
	chatId,
	selectedVisibilityType,
	isReadonly,
	isWebSearching,
	webSearchSourceCount,
}: {
	chatId: string;
	selectedVisibilityType: VisibilityType;
	isReadonly: boolean;
	isWebSearching?: boolean;
	webSearchSourceCount?: number;
}) {
	const router = useRouter();
	const { open } = useSidebar();

	return (
		<header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border/40 bg-background/90 px-3 py-3 backdrop-blur-md md:gap-3 md:px-4">
			<SidebarToggle />

			<Button
				className={`order-1 h-10 rounded-xl px-3 transition-colors md:h-fit md:px-3 ${open ? "md:hidden" : ""}`}
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
					className="order-2"
					selectedVisibilityType={selectedVisibilityType}
				/>
			)}

			{/* Spotify Now Playing Indicator - last element on left side */}
			<div className="order-3">
				<SpotifyNowPlayingIndicator />
			</div>

			{/* Web Search Indicator - shows when actively searching */}
			<AnimatePresence>
				{isWebSearching && (
					<motion.div
						initial={{ opacity: 0, scale: 0.8, x: -10 }}
						animate={{ opacity: 1, scale: 1, x: 0 }}
						exit={{ opacity: 0, scale: 0.8, x: -10 }}
						transition={{ duration: 0.2, ease: "easeOut" }}
						className="order-2 flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500/15 to-blue-500/15 px-3 py-1.5 ring-1 ring-sky-500/30 dark:from-sky-500/25 dark:to-blue-500/25"
					>
						<div className="relative flex items-center justify-center">
							<GlobeIcon className="size-4 text-sky-600 dark:text-sky-400" />
							<motion.div
								className="absolute inset-0 rounded-full bg-sky-500/30"
								animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
								transition={{
									duration: 1.5,
									repeat: Infinity,
									ease: "easeInOut",
								}}
							/>
						</div>
						<span className="text-sm font-medium text-sky-600 dark:text-sky-400">
							Searching
						</span>
						<span className="flex text-sky-600 dark:text-sky-400">
							<motion.span
								animate={{ opacity: [0, 1, 0] }}
								transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
							>
								.
							</motion.span>
							<motion.span
								animate={{ opacity: [0, 1, 0] }}
								transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
							>
								.
							</motion.span>
							<motion.span
								animate={{ opacity: [0, 1, 0] }}
								transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
							>
								.
							</motion.span>
						</span>
						{webSearchSourceCount !== undefined && webSearchSourceCount > 0 && (
							<motion.span
								initial={{ opacity: 0, scale: 0.5 }}
								animate={{ opacity: 1, scale: 1 }}
								className="ml-1 flex size-5 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white"
							>
								{webSearchSourceCount}
							</motion.span>
						)}
					</motion.div>
				)}
			</AnimatePresence>

			<Button
				asChild
				className="order-4 ml-auto hidden rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 text-white shadow-md shadow-orange-500/20 transition-all hover:from-orange-400 hover:to-amber-400 hover:shadow-lg md:flex md:h-fit dark:from-orange-500 dark:to-amber-500"
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
		prevProps.isReadonly === nextProps.isReadonly &&
		prevProps.isWebSearching === nextProps.isWebSearching &&
		prevProps.webSearchSourceCount === nextProps.webSearchSourceCount
	);
});
