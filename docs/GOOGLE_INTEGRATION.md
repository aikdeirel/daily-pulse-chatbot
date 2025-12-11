# Google Integration Documentation

> **Status:** ✅ Fully Implemented | Last Updated: 2025-12-08

This document describes the Google Calendar and Google Tasks integration for AI agents, providing guidance on available tools, actions, and common usage patterns.

---

## Quick Reference for AI Agents

### Tool Group Selector

The chat UI now exposes a "Google" button next to the web search toggle. When clicked, users can enable any of three tool groups (persisted per browser, defaulting to disabled):

1. **Calendar Management** – `googleCalendars`, `googleEvents`
2. **Gmail** – `gmailMessages`, `gmailLabels`
3. **Google Tasks** – `googleTaskLists`, `googleTasks`

Only the enabled groups are injected into the system prompt and made available as tools, keeping context compact.

### Available Tools & Actions

The Google integration includes multiple specialized tools:

## Calendar Tools

#### googleCalendars
| Action | Description | Required Params | Notes |
|--------|-------------|-----------------|-------|
| `list_calendars` | List all user calendars | None | Returns all accessible calendars |
| `get_calendar` | Get calendar details | `calendarId` | Retrieve specific calendar info |

**Optional params:** None

#### googleEvents
| Action | Description | Required Params | Notes |
|--------|-------------|-----------------|-------|
| `list_events` | List events from calendar | `calendarId` | Returns events with optional filters |
| `get_event` | Get event details | `calendarId`, `eventId` | Retrieve specific event info |
| `create_event` | Create new event | `calendarId`, `eventData` | Create calendar event |
| `update_event` | Update existing event | `calendarId`, `eventId`, `eventData` | Modify event details |
| `delete_event` | Delete an event | `calendarId`, `eventId` | Remove event from calendar |

**Optional params:** `timeMin`, `timeMax`, `maxResults` (for list_events)

**Event Data Structure:**
```typescript
{
  summary: string;              // Event title (required)
  description?: string;         // Event description
  location?: string;            // Event location
  start: {
    dateTime: string;           // RFC3339 timestamp
    timeZone: string;           // e.g., "Europe/Berlin"
  };
  end: {
    dateTime: string;           // RFC3339 timestamp
    timeZone: string;           // e.g., "Europe/Berlin"
  };
  attendees?: [{
    email: string;              // Attendee email
    displayName?: string;       // Attendee name
  }];
  reminders?: {
    useDefault?: boolean;
    overrides?: [{
      method: string;           // "email" or "popup"
      minutes: number;          // Minutes before event
    }];
  };
  recurrence?: string[];        // RRULE strings for recurring events
}
```

## Tasks Tools

#### googleTaskLists
| Action | Description | Required Params | Notes |
|--------|-------------|-----------------|-------|
| `list_tasklists` | List all task lists | None | Returns all accessible task lists |
| `get_tasklist` | Get task list details | `tasklistId` | Retrieve specific task list info |
| `create_tasklist` | Create new task list | `title` | Create new task list |
| `update_tasklist` | Update task list | `tasklistId`, `title` | Modify task list details |
| `delete_tasklist` | Delete task list | `tasklistId` | Remove task list |

**Optional params:** None

#### googleTasks
| Action | Description | Required Params | Notes |
|--------|-------------|-----------------|-------|
| `list_tasks` | List tasks in task list | `tasklistId` | Returns tasks with optional filters |
| `get_task` | Get task details | `tasklistId`, `taskId` | Retrieve specific task info |
| `create_task` | Create new task | `tasklistId`, `title` | Create task with optional due date, notes, parent |
| `update_task` | Update existing task | `tasklistId`, `taskId` | Modify task details |
| `delete_task` | Delete a task | `tasklistId`, `taskId` | Remove task |
| `move_task` | Move task position | `tasklistId`, `taskId` | Reorder task within list |
| `clear_completed` | Clear completed tasks | `tasklistId` | Remove all completed tasks |

**Optional params for list_tasks:** `showCompleted`, `showHidden`, `maxResults`, `dueMin`, `dueMax`

**Important:** To see completed tasks including hidden ones, you must set **BOTH** `showCompleted=true` **AND** `showHidden=true`. When `showCompleted=true` but `showHidden` is not explicitly set to `true`, hidden tasks are automatically filtered out to maintain consistent behavior.

**Optional params for create_task/update_task:** `notes`, `due`, `status`, `parent` (for subtasks)

**Task Data Structure:**
```typescript
{
  title: string;                // Task title (required)
  notes?: string;               // Task notes/description
  due?: string;                 // Due date in RFC3339 format
  status?: "needsAction" | "completed";  // Task status
  parent?: string;              // Parent task ID (for creating subtasks)
  position?: string;            // Position in task list
  links?: [{
    type: string;               // Link type
    description?: string;       // Link description
    link: string;               // URL
  }];
}
```

---

## Common User Requests & Tool Usage

```
User: "List my calendars"
→ googleCalendars: action: "list_calendars"

User: "Show me today's events"
→ googleEvents: action: "list_events", calendarId: "primary", timeMin: today, timeMax: today+1day

User: "What's on my calendar tomorrow?"
→ googleEvents: action: "search_events", timeMin: [RFC3339 tomorrow], timeMax: [RFC3339 tomorrow+1day]

User: "What meetings do I have next week?"
→ googleEvents: action: "search_events", timeMin: [RFC3339 nextMonday], timeMax: [RFC3339 nextSunday]

User: "Create a meeting with John tomorrow at 2pm"
→ googleEvents: action: "create_event", calendarId: "primary", eventData: {...}

User: "Find events about project X"
→ googleEvents: action: "list_events", calendarId: "primary", q: "project X" | # Text search in event content

User: "Delete event [eventId]"
→ googleEvents: action: "delete_event", calendarId: "primary", eventId: "xxx"

User: "Update my 3pm meeting to 4pm"
→ googleEvents: action: "update_event", calendarId: "primary", eventId: "xxx", eventData: {...}

User: "What's happening this weekend?"
→ googleEvents: action: "search_events", timeMin: [RFC3339 thisWeekend], timeMax: [RFC3339 thisWeekend+2days]

User: "Show me Christmas events this year"
→ googleEvents: action: "search_events", timeMin: [RFC3339 thisYearDec20], timeMax: [RFC3339 thisYearDec31]

User: "List my task lists"
→ googleTaskLists: action: "list_tasklists"

User: "Show my tasks"
→ googleTasks: action: "list_tasks", tasklistId: "@default"

User: "Add a task to buy groceries"
→ googleTasks: action: "create_task", tasklistId: "@default", title: "Buy groceries"

User: "Create a task with due date tomorrow"
→ googleTasks: action: "create_task", tasklistId: "@default", title: "Task title", due: [RFC3339 tomorrow]

User: "Mark task as completed"
→ googleTasks: action: "update_task", tasklistId: "@default", taskId: "xxx", status: "completed"

User: "Show completed tasks"
→ googleTasks: action: "list_tasks", tasklistId: "@default", showCompleted: true

User: "Show all completed tasks including hidden ones"
→ googleTasks: action: "list_tasks", tasklistId: "@default", showCompleted: true, showHidden: true

User: "Create a subtask"
→ googleTasks: action: "create_task", tasklistId: "@default", title: "Subtask", parent: "parent_task_id"

User: "Delete completed tasks"
→ googleTasks: action: "clear_completed", tasklistId: "@default"
```

---

## Text Search vs Date Filtering

### IMPORTANT: Understanding the q Parameter

The Google Calendar API has two distinct ways to filter events:

1. **Text Search (q parameter)**: Searches within event fields (summary, description, location, etc.)
2. **Date Filtering (timeMin/timeMax)**: Filters events by date/time ranges

**Key Differences:**

| Approach | Parameter | Purpose | Example |
|----------|-----------|---------|---------|
| Text Search | `q` | Search event content | `q: "project meeting"` |
| Date Filtering | `timeMin`, `timeMax` | Filter by date range | `timeMin: "2025-12-01T00:00:00Z"` |

### When to Use Each Approach

- **Use `q` parameter** when searching for events containing specific text (e.g., "project X", "team meeting")
- **Use `timeMin`/`timeMax`** when filtering events by date ranges

---

## Error Handling Guide

### Common Error Codes

| Error Code | Meaning | Response |
|------------|---------|----------|
| `not_connected` | User hasn't connected Google | Guide to user menu → Connect Google Calendar |
| `missing_calendar_id` | Calendar ID not provided | Include calendarId parameter |
| `missing_params` | Required parameters missing | Check required parameters for action |
| `missing_query` | Search query not provided | Include query parameter |
| `api_error` | Generic Google API error | Check error message |
| `unknown_action` | Invalid action name | Check available actions for the tool |
| `authentication_error` | OAuth authentication failed | Reconnect Google account |
| `permission_denied` | Missing required scope | Disconnect and reconnect with proper scopes |
| `not_found` | Calendar/event doesn't exist | Verify ID validity |
| `invalid_calendar` | Invalid calendar ID | Check calendar ID format |
| `invalid_event` | Invalid event data | Validate event data structure |
| `rate_limit` | API rate limit exceeded | Implement exponential backoff |

### Scope-Related Errors

If a user connected before certain scopes were added, they'll need to disconnect and reconnect:

| Scope | Required For |
|-------|--------------|
| `https://www.googleapis.com/auth/calendar` | Full calendar access (read/write) |
| `https://www.googleapis.com/auth/calendar.events` | Event management operations |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AI Tool Layer                                │
│  ┌─────────────────────┐       ┌─────────────────────┐              │
│  │  googleCalendars    │       │   googleEvents      │              │
│  │  - list_calendars   │       │   - list_events     │              │
│  │  - get_calendar     │       │   - get_event       │              │
│  │                     │       │   - create_event    │              │
│  │                     │       │   - update_event    │              │
│  │                     │       │   - delete_event    │              │
│  │                     │       │   - search_smart    │              │
│  └──────────┬──────────┘       └──────────┬──────────┘              │
└─────────────┼────────────────────────────┼─────────────────────────┘
              │                            │
              ▼                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Service Layer: lib/services/google.ts                   │
│              GoogleService class - ALL API methods                   │
│  • Token management (auto-refresh with 5-min buffer)                │
│  • Error handling with Google API format                            │
│  • Calendar & event CRUD operations                                 │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Google Calendar API v3                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
lib/
├── services/
│   └── google.ts                  # GoogleService class - all API methods
├── ai/tools/
│   └── google/
│       ├── index.ts               # Exports all Google tools
│       ├── google-calendars.ts    # Calendar operations (2 actions)
│       ├── google-events.ts       # Event operations (6 actions)
│       ├── gmail-messages.ts      # Gmail message operations
│       ├── gmail-labels.ts        # Gmail label operations
│       ├── google-tasklists.ts    # Task list operations (5 actions)
│       ├── google-tasks.ts        # Task operations (7 actions)
│       └── groups.ts              # Tool group definitions
└── db/
    ├── schema.ts                  # oauthConnection table
    └── queries.ts                 # OAuth CRUD functions

components/
├── google-tool-selector.tsx       # UI component for tool group selection
├── google-calendar-display.tsx    # Calendar/event display component
├── google-calendar-status-indicator.tsx  # Status indicator (placeholder)
├── message.tsx                    # Tool rendering in chat
└── sidebar-user-nav.tsx           # Connect/disconnect menu

app/api/auth/google/
├── route.ts                       # OAuth initiation
├── callback/route.ts              # OAuth callback
├── disconnect/route.ts            # Disconnect endpoint
└── status/route.ts                # Connection status

app/api/google/
├── calendars/
│   └── route.ts                   # GET - list calendars
│       [calendarId]/
│       └── route.ts               # GET - calendar details
├── events/
│   └── route.ts                   # GET/POST - list/create events
│       [calendarId]/
│       └── [eventId]/
│           └── route.ts           # GET/PUT/DELETE - event operations
├── tasklists/
│   └── route.ts                   # GET/POST - list/create task lists
│       [tasklistId]/
│       └── route.ts               # GET/PATCH/DELETE - task list operations
└── tasks/
    └── route.ts                   # GET/POST - list/create tasks
        [tasklistId]/
        └── [taskId]/
            └── route.ts           # GET/PATCH/DELETE - task operations
```

---

## OAuth Scopes

The integration requests these Google API scopes:

| Scope | Purpose |
|-------|---------|
| `https://www.googleapis.com/auth/calendar` | Full calendar access (read/write all calendars) |
| `https://www.googleapis.com/auth/calendar.events` | Event management (create, read, update, delete events) |
| `https://www.googleapis.com/auth/gmail.readonly` | Read Gmail messages and labels |
| `https://www.googleapis.com/auth/gmail.modify` | Modify Gmail messages (labels, trash, etc.) |
| `https://www.googleapis.com/auth/gmail.labels` | Manage Gmail labels |
| `https://www.googleapis.com/auth/tasks` | Full access to Google Tasks (read/write) |
| `https://www.googleapis.com/auth/tasks.readonly` | Read-only access to Google Tasks |

**Note:** Both tasks scopes are requested to support future read-only features.

---

## Environment Variables

Required in `.env.local`:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

For production, update `GOOGLE_REDIRECT_URI` to your production domain.

### Setup Instructions

1. Create a Google Cloud Project at [console.cloud.google.com](https://console.cloud.google.com/)
2. Enable Google Calendar API
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs
6. Copy Client ID and Client Secret to `.env.local`

---

## Known Limitations

### Calendar ID Requirement
Most operations require a `calendarId`. Use `"primary"` for the user's primary calendar, or get the actual calendar ID from `list_calendars`.

### Time Zone Handling
The service defaults to `"Europe/Berlin"` timezone if not specified. Always specify time zones explicitly for different regions.

**Fixed in v1.1.0**: The search functionality now properly handles empty search queries and should return events within the specified date ranges.

### Rate Limits
Google Calendar API has rate limits. Heavy usage may result in temporary 429 errors. Implement exponential backoff for production use.

### No Batch Operations
Google Calendar API v3 doesn't support true batch operations. Multiple operations are performed sequentially.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Google not connected" | User menu → Connect Google Calendar |
| "Missing calendar ID" | Include calendarId parameter (use "primary" for main calendar) |
| "Authentication failed" | Reconnect Google account through sidebar |
| "Permission denied" | Disconnect and reconnect to grant proper scopes |
| "Event creation fails" | Verify event data structure (summary, start, end required) |
| "Calendar not found" | Check calendar ID validity with list_calendars |
| "Missing scopes" errors | Disconnect and reconnect to grant new scopes |
| "Time zone errors" | Always specify timeZone in start/end objects |

---

## Workflow Examples

### Creating a Meeting with Attendees

```
1. Create event with attendees:
   googleEvents: action: "create_event",
                 calendarId: "primary",
                 eventData: {
                   summary: "Project Kickoff",
                   description: "Initial planning meeting",
                   location: "Conference Room A",
                   start: {
                     dateTime: "2025-12-10T10:00:00+01:00",
                     timeZone: "Europe/Berlin"
                   },
                   end: {
                     dateTime: "2025-12-10T11:00:00+01:00",
                     timeZone: "Europe/Berlin"
                   },
                   attendees: [
                     { email: "john@example.com", displayName: "John Doe" },
                     { email: "jane@example.com", displayName: "Jane Smith" }
                   ],
                   reminders: {
                     useDefault: false,
                     overrides: [
                       { method: "email", minutes: 1440 },  // 1 day before
                       { method: "popup", minutes: 30 }     // 30 min before
                     ]
                   }
                 }
   → Returns created event with ID
```

### Finding and Updating Events

```
1. Search for events:
   googleEvents: action: "search_events",
                 date: "2025-12-10",
                 text: "Project Kickoff"
   → Returns events matching search

2. Get event details:
   googleEvents: action: "get_event",
                 calendarId: "primary",
                 eventId: "event_id_from_search"
   → Returns full event details

3. Update event:
   googleEvents: action: "update_event",
                 calendarId: "primary",
                 eventId: "event_id_from_search",
                 eventData: {
                   summary: "Updated Project Meeting",
                   description: "Updated description",
                   start: { ... },
                   end: { ... }
                 }
   → Returns updated event
```

### Managing Multiple Calendars

```
1. List all calendars:
   googleCalendars: action: "list_calendars"
   → Returns array of calendars with IDs

2. Get calendar details:
   googleCalendars: action: "get_calendar",
                    calendarId: "calendar_id_from_list"
   → Returns calendar details

3. List events from specific calendar:
   googleEvents: action: "list_events",
                 calendarId: "calendar_id_from_list",
                 timeMin: "2025-12-01T00:00:00Z",
                 timeMax: "2025-12-31T23:59:59Z"
   → Returns events from specified date range
```

### Creating Recurring Events

```
1. Create weekly recurring meeting:
   googleEvents: action: "create_event",
                 calendarId: "primary",
                 eventData: {
                   summary: "Weekly Team Sync",
                   start: {
                     dateTime: "2025-12-09T14:00:00+01:00",
                     timeZone: "Europe/Berlin"
                   },
                   end: {
                     dateTime: "2025-12-09T15:00:00+01:00",
                     timeZone: "Europe/Berlin"
                   },
                   recurrence: [
                     "RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=10"
                   ]
                 }
   → Creates recurring event (10 occurrences)
```

### Managing Task Lists and Tasks

```
1. List all task lists:
   googleTaskLists: action: "list_tasklists"
   → Returns array of task lists with IDs

2. Create a new task list:
   googleTaskLists: action: "create_tasklist",
                    title: "Project Tasks"
   → Returns created task list with ID

3. List tasks from a task list:
   googleTasks: action: "list_tasks",
                tasklistId: "tasklist_id",
                showCompleted: false
   → Returns pending tasks

4. Create a task with due date:
   googleTasks: action: "create_task",
                tasklistId: "tasklist_id",
                title: "Complete project proposal",
                notes: "Include budget and timeline",
                due: "2025-12-15T23:59:59Z"
   → Returns created task with ID

5. Create a subtask:
   googleTasks: action: "create_task",
                tasklistId: "tasklist_id",
                title: "Research competitors",
                parent: "parent_task_id"
   → Returns created subtask

6. Complete a task:
   googleTasks: action: "update_task",
                tasklistId: "tasklist_id",
                taskId: "task_id",
                status: "completed"
   → Marks task as completed

7. Clear all completed tasks:
   googleTasks: action: "clear_completed",
                tasklistId: "tasklist_id"
   → Removes all completed tasks from list
```

---

## Integration Status

### ✅ Completed Features

- Full calendar CRUD operations
- Event management (create, read, update, delete)
- Gmail message and label management
- **Google Tasks integration (NEW)**
  - Task list management (create, read, update, delete)
  - Task operations (create, read, update, delete, move, complete)
  - Subtask support
  - Due date management
- OAuth 2.0 authentication with token refresh
- Tool group selector UI
- Error handling and validation
- Sidebar integration for connect/disconnect
- Chat system integration
- Status indicator (placeholder for future enhancement)

### 🎯 Key Features of Google Tasks Integration

1. **Comprehensive Task Management**: Full CRUD operations for tasks and task lists
2. **Subtask Support**: Create hierarchical task structures with parent-child relationships
3. **Due Date Management**: Set and update task due dates in RFC3339 format
4. **Status Tracking**: Mark tasks as "needsAction" or "completed"
5. **Bulk Operations**: Clear all completed tasks at once
6. **Position Management**: Move tasks within lists to reorder them
7. **Consistent Design**: Follows same patterns as Calendar and Gmail integrations

---

## Best Practices for AI Agents

### Calendar Best Practices
1. **Always specify calendar ID**: Use "primary" when in doubt
2. **Include time zones**: Specify timeZone in all timed events
3. **Validate event data**: Check summary, start, and end before creating
4. **Handle errors gracefully**: Check for connection status before operations
5. **Provide context**: Include descriptions and locations for clarity
6. **Set appropriate reminders**: Configure reminders for important events
7. **Use recurring events**: Utilize RRULE for repeating events
8. **Check calendar access**: Verify user has access before operations
9. **Format dates properly**: Use RFC3339 timestamps (ISO 8601)

### Tasks Best Practices
1. **Use default task list**: Reference "@default" for the user's primary task list when unsure
2. **Format due dates properly**: Use RFC3339 timestamps for due dates
3. **Provide descriptive titles**: Task titles should be clear and actionable
4. **Add notes for context**: Include additional details in the notes field
5. **Leverage subtasks**: Break down complex tasks into subtasks using parent parameter
6. **Manage completed tasks**: Regularly clear completed tasks to keep lists clean
7. **Set realistic due dates**: Include due dates for time-sensitive tasks
8. **Use status updates**: Mark tasks as completed when done (status: "completed")
9. **Understand showCompleted/showHidden interaction**: 
   - `showCompleted=false`: Returns only active tasks (excludes all completed tasks)
   - `showCompleted=true` (without showHidden): Returns completed tasks that are NOT hidden
   - `showCompleted=true` AND `showHidden=true`: Returns ALL completed tasks including hidden ones
   - Hidden tasks are automatically filtered unless explicitly requested with `showHidden=true`

---

## Testing the Integration

### Test OAuth Flow
```bash
# Visit OAuth endpoint
http://localhost:3000/api/auth/google

# Check connection status
curl http://localhost:3000/api/auth/google/status
```

### Test Calendar Operations
```bash
# List calendars
curl http://localhost:3000/api/google/calendars \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# List events
curl http://localhost:3000/api/google/events?calendarId=primary \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

### Test Event Creation
```bash
curl -X POST http://localhost:3000/api/google/events?calendarId=primary \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Test Event",
    "start": {
      "dateTime": "2025-12-10T10:00:00+01:00",
      "timeZone": "Europe/Berlin"
    },
    "end": {
      "dateTime": "2025-12-10T11:00:00+01:00",
      "timeZone": "Europe/Berlin"
    }
  }'
```

---

## Additional Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/v3/reference)
- [OAuth 2.0 for Web Apps](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Recurring Events (RRULE)](https://datatracker.ietf.org/doc/html/rfc5545#section-3.8.5.3)
- [Time Zones Database](https://www.iana.org/time-zones)

---

**Documentation Version:** 2.0.0
**Last Updated:** 2025-12-08
**Status:** Production Ready ✅ (Added Google Tasks integration with full task and task list management)