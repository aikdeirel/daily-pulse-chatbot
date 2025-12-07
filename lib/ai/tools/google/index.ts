// Google Tools Index
// Exports all Google-related AI tools for use in the chat route

export { gmailLabels } from "./gmail-labels";
export { gmailMessages } from "./gmail-messages";
export { googleCalendars } from "./google-calendars";
export { googleEvents } from "./google-events";

// Type for tool props
export type GoogleToolProps = {
  userId: string;
};
