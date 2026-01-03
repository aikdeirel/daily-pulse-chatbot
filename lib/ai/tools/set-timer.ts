import { tool } from "ai";
import { z } from "zod";

export const setTimer = tool({
  description:
    "Set a countdown timer for a specified duration. The user might say things like 'set a timer for 5 minutes' or 'Stelle einen Timer auf 8 Minuten'. Convert the duration to seconds and return it along with an optional label.",
  inputSchema: z.object({
    seconds: z
      .number()
      .min(1)
      .max(86400) // Max 24 hours
      .describe("Duration of the timer in seconds"),
    label: z
      .string()
      .optional()
      .describe(
        "Optional label for the timer (e.g., 'Tea timer', 'Break reminder')",
      ),
  }),
  execute: async (input) => {
    return {
      seconds: input.seconds,
      label: input.label || "Timer",
      startedAt: Date.now(),
    };
  },
});
