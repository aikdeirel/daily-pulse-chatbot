# Migration Scripts

This directory contains scripts for migrating data between different schema versions.

## Available Scripts

### `migrate-old-messages.ts`

**Purpose**: Migrates messages from the deprecated schema to the new schema to fix the issue where tool UI elements don't display in older chats.

**Problem Solved**: 
- Older chats stored tool execution data in the deprecated `Message` table format
- New UI components expect tool data in the `Message_v2` table format with `parts` array
- This migration converts old tool calls to the new format so they render correctly

**Usage**:

```bash
# Install dependencies first
npm install

# Run the migration script
npx tsx scripts/migrate-old-messages.ts
```

**What it does**:
1. Finds all chats that have messages in the old `Message` table
2. Converts old message format to new format using `appendResponseMessages`
3. Preserves all tool execution data in the correct structure
4. Migrates votes associated with messages
5. Inserts converted messages into the new `Message_v2` table

**Safety**:
- Processes chats in batches (100 chats at a time)
- Inserts messages in batches (1000 messages at a time)
- Skips chats that don't have old messages
- Logs progress and errors

**Notes**:
- This script should be run during deployment or maintenance windows
- It's idempotent - running it multiple times won't duplicate data
- After migration, tool UI elements should display correctly in older chats