---
name: Context Handover
description: Create concise handover summary for seamless continuation in new chat session
version: 1.0.0
triggers:
  - handover
  - context summary
  - session summary
  - continue in new chat
  - save context
  - export session
---

# Context Handover Skill

Create a context handover summary for a new chat session.

## Goal

Enable seamless continuation of work in a fresh chat instance.

## Output Structure

Generate summary with exactly these 3 sections:

### 1. [[Current Status]]

- Where we are right now
- What's working, what's broken
- Blockers if any

### 2. [[Core Code/Logic]]

- Key snippets decided so far
- Architecture decisions
- File paths modified
- Critical config

### 3. [[Next Steps]]

- What exactly needs to be done next
- Priority order
- Dependencies between tasks

## Style Constraints

- **Extremely concise** - sacrifice grammar for brevity
- **Telegraphic style** - no filler words
- Use bullet points, not paragraphs
- Code snippets: only critical parts, with file paths
- Max ~500 words total

## Example Output

```
## [[Current Status]]
- Auth system: DONE, JWT + refresh tokens
- API routes: 3/5 complete
- Blocker: DB migration failing on prod

## [[Core Code/Logic]]
`/lib/auth.ts` - main auth logic
`/app/api/auth/[...nextauth]/route.ts` - NextAuth config
Key decision: using Drizzle ORM, not Prisma

## [[Next Steps]]
1. Fix DB migration (check connection string)
2. Complete `/api/users` endpoint
3. Add rate limiting middleware
```

## When to Use

- User asks to "save progress"
- Switching to new chat due to context limits
- End of work session
- Before major refactoring
- Handing off to another person/session
