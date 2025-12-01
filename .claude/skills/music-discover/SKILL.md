---
name: music-discover
description: Discover music news and personalized recommendations based on the user's Spotify listening history. Use when the user asks about music news, new releases, music recommendations, what to listen to in specific situations (commute, workout, travel, long train ride), updates from favorite artists, concert announcements, or anything music-discovery related.
---

# Music Discover

Provide personalized music news and recommendations based on the user's Spotify top artists.

## Workflow

Follow these steps in order:

### Step 1: Fetch User's Music Profile

Always fetch the latest data at the start of each conversation:

```bash
web_fetch https://aikdeirel.github.io/spotify-stats/spotify_top.json
```

This JSON contains the user's top 10 Spotify artists with their genres, albums, and top tracks. Analyze this to understand the user's taste profile.

### Step 2: Search for News (Conditional)

Search for recent news about the user's top artists. Focus on:

- New album releases (within last 4 weeks)
- Upcoming album announcements (with confirmed dates)
- Concert tour announcements (especially if they include Berlin or Germany)
- Significant artist news (collaborations, major announcements)

**What counts as "recent/relevant":**

- Album releases: Last 4 weeks
- Tour announcements: Any timeframe if newly announced
- Other news: Last 2 weeks

Use web_search with artist names. If no recent news is found for any artist, skip the news section entirely.

### Step 3: Generate Recommendations

Always provide recommendations. Focus on:

**Priority 1: Similar artists**

- Find artists similar to user's top artists (especially the top 5)
- Look for artists in the same genres (post-rock, trip hop, shoegaze, etc.)
- Search for "artists similar to [artist name]" or "if you like [artist] you'll like [similar artist]"

**Priority 2: New releases from similar artists**

- Recent albums from artists in the same genre space
- Focus on releases from last 2-3 months

**Priority 3: Deep cuts from known artists**

- Lesser-known albums from the user's top artists
- Older albums they might have missed

Tailor recommendations to the user's context if specified (e.g., "long train ride" → longer, atmospheric albums).

## Output Format

Structure the response as follows:

1. **Brief, excited intro** (1-2 sentences)

   - Be enthusiastic but concise
   - Examples: "Hey, hab was Cooles für dich gefunden! 🎵" or "Spannende Updates aus deiner Musikwelt:"

2. **News section** (only if relevant news exists)

   - Use bullet points
   - Format: `• Artist - "Title/Event" (Date) - Brief description [Link]`
   - Keep descriptions to one sentence max

3. **Empfehlungen section** (always include)
   - Use bullet points
   - Format: `• Artist - "Album/Song" - Why this fits (1 sentence) [Link if available]`
   - Include 3-5 recommendations

**Example:**

```
Hey, hab spannende Updates für dich! 🎵

News:
• Mogwai - "The Bad Fire" (24. Jan 2025) - Neues Album mit düsterem Post-Rock
• Queens of the Stone Age - Europa-Tour angekündigt, Berlin: 15. März 2025

Empfehlungen:
• Russian Circles - "Gnosis" - Ähnlicher instrumentaler Post-Rock wie Mogwai
• Burial - "Antidawn" - Atmospheric Trip Hop, passt zu deinem Death In Vegas Vibe
• Swans - "The Beggar" - Intensiver, experimenteller Sound wenn du Latitudes magst
```

**Keep it short:** Entire response should be readable in under 30 seconds.
