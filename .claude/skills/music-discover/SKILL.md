---
name: music-discover
description: Music news and recommendations based on Spotify listening history. Use for music news, new releases, recommendations, what to listen to in specific situations (commute, workout, travel), artist updates, or concert announcements.
---

# Music Discover

Personalized music news and recommendations based on the user's Spotify top tracks and top artists.

**TOOL RESTRICTION:** Never use the `webFetch` tool for web searching. Use the model's built-in web search if available.

## Workflow

### Step 1: Fetch User's Music Profile

Call the `spotify` tool with action: `top_tracks` to get the user's top 10 most-played tracks, and action: `top_artists` to get the user's top 10 most-listened artists.

**If Spotify not connected** (error: `"not_connected"`): Tell user to connect Spotify from the sidebar menu, then skip to Step 3 with generic recommendations.

### Step 2: Search for News

**If web search is available:** Search for recent news about the user's top artists:

- New album releases (last 4 weeks)
- Upcoming album announcements
- Concert tour announcements (especially Berlin/Germany)
- Major artist news (collaborations, announcements)

Skip the news section if no relevant news found.

**If web search is NOT available:**

1. Tell the user: "Web search is not enabled. Enable it in settings for current music news."
2. Skip to Step 3 with internal knowledge only.

### Step 3: Generate Recommendations

Always provide 3-5 recommendations based on:

1. **Similar artists** to user's top artists (from `top_artists` data)
2. **New releases** from similar artists (last 2-3 months)
3. **Deep cuts** from known artists (lesser-known albums)
4. **Genre exploration** based on top artists' genres

Tailor to context if specified (e.g., "long train ride" → longer, atmospheric albums).

## Output Format

```
[Brief excited intro with emoji]

News: (only if web search available and news found)
• Artist - "Title/Event" (Date) - Brief description [Link] \
• Artist - "Title/Event" (Date) - Brief description [Link] \
...

Recommendations:
• Artist - "Album/Song" - Why this fits [Link if available] \
• Artist - "Album/Song" - Why this fits [Link if available] \
...
```

**Keep it short:** Readable in under 30 seconds.
