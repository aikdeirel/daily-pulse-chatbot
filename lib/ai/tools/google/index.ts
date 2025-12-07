// Google Tools Index
// Exports all Google-related AI tools for use in the chat route

export { googleCalendars } from "./google-calendars";
export { googleEvents } from "./google-events";
export { gmailMessages } from "./gmail-messages";
export { gmailLabels } from "./gmail-labels";

// Type for tool props
export type GoogleToolProps = {
  userId: string;
};
