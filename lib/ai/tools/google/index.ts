// Google Calendar Tools Index
// Exports all Google Calendar-related AI tools for use in the chat route

export { googleCalendars } from "./google-calendars";
export { googleEvents } from "./google-events";

// Type for tool props
export type GoogleToolProps = {
  userId: string;
};
