# RSG Inventory - Stash Cleanup Feature

This document describes the new stash cleanup feature that automatically removes unused stash entries from the database.

## Overview

The stash cleanup system automatically removes stash database entries that haven't been accessed for a configurable period of time (default: 60 days). This helps keep the database clean and prevents it from growing indefinitely with unused stashes.

**IMPORTANT**: This feature only affects stash inventories. Player inventories are never touched by the cleanup system.

## Installation

### 1. Run Database Migration

First, you need to add a new column to your database to track when stashes were last accessed:

```sql
-- Run this in your database:
ALTER TABLE `inventories` 
ADD COLUMN `last_accessed` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP 
ON UPDATE CURRENT_TIMESTAMP 
AFTER `items`;

-- Update existing records to have current timestamp
UPDATE `inventories` SET `last_accessed` = CURRENT_TIMESTAMP WHERE `last_accessed` IS NULL;
```

Alternatively, you can run the provided `stash_cleanup_migration.sql` file.

### 2. Configuration

The following options have been added to `config/config.lua`:

```lua
StashCleanupTime = 60,   -- in days, time after which unused stashes are removed
StashCleanupInterval = 24, -- in hours, how often to check for cleanup
```

- `StashCleanupTime`: How many days of inactivity before a stash is considered for removal
- `StashCleanupInterval`: How often (in hours) the cleanup process runs

### 3. Files Added

- `server/stash_cleanup.lua` - Main cleanup system
- `stash_cleanup_migration.sql` - Database migration script
- `STASH_CLEANUP_README.md` - This documentation file

The `fxmanifest.lua` has been updated to include the new cleanup script.

## How It Works

1. **Tracking Access**: Every time a player opens or closes a stash, the `last_accessed` timestamp is updated in the database.

2. **Automatic Cleanup**: The system runs periodically (default: every 24 hours) to check for stashes that haven't been accessed in the configured time period.

3. **Safe Removal**: The system only removes entries that are clearly stash inventories, avoiding player inventories by excluding common player identifier patterns.

4. **Logging**: All cleanup operations are logged to the server console with details about how many stashes were removed.

## Safety Features

- **Player Protection**: Player inventories are never affected by the cleanup system
- **Pattern Matching**: Uses multiple filters to identify stash vs player inventories
- **Database Column Check**: System only activates if the required database column exists
- **Duplicate Prevention**: Won't run multiple cleanup processes simultaneously

## Manual Cleanup

You can manually trigger a cleanup using the export:

```lua
exports['rsg-inventory']:CleanupOldStashes()
```

### Test Commands (Admin Only)

A test command has been added for administrators to manage and test the cleanup system:

- `/testcleanup` or `/testcleanup preview` - Shows how many stashes would be removed without actually removing them
- `/testcleanup run` - Manually executes the cleanup process immediately
- `/testcleanup status` - Shows current system configuration and status
- `/testcleanup help` - Shows available command options

**Note**: These commands require admin permissions and will display notifications in-game as well as console logs.

## Monitoring

The cleanup system provides console output when running:

- Startup messages confirming the system is enabled
- Regular cleanup results showing how many stashes were removed
- Warning messages if the database migration hasn't been run

## Database Patterns Excluded from Cleanup

The system excludes the following identifier patterns to protect player inventories:
- `^[A-Z]{3}[0-9]{5}$` (typical citizenid format)
- `citizenid-%`
- `player-%`

Only entries that don't match these patterns and are older than the configured time will be removed.

## Troubleshooting

**Q: The cleanup system isn't working**
A: Make sure you've run the database migration to add the `last_accessed` column. Check the server console for warning messages.

**Q: Can I disable the cleanup system?**
A: Yes, either don't run the database migration, or set `StashCleanupTime` to a very high number.

**Q: Will this affect my players' inventories?**
A: No, the system is designed specifically to only affect stash inventories, not player inventories.

**Q: How can I see what will be removed?**
A: You can run this query to see what would be removed (replace 60 with your configured days):
```sql
SELECT identifier, last_accessed FROM inventories 
WHERE last_accessed < DATE_SUB(NOW(), INTERVAL 60 DAY)
AND identifier NOT REGEXP '^[A-Z]{3}[0-9]{5}$'
AND identifier NOT LIKE 'citizenid-%'
AND identifier NOT LIKE 'player-%';
```