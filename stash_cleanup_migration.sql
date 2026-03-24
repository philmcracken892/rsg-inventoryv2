-- RSG Inventory Stash Cleanup Migration
-- This adds a last_accessed column to track when stashes were last opened
-- Run this query on your database to enable the stash cleanup feature

ALTER TABLE `inventories` 
ADD COLUMN `last_accessed` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP 
ON UPDATE CURRENT_TIMESTAMP 
AFTER `items`;

-- Update existing records to have current timestamp
UPDATE `inventories` SET `last_accessed` = CURRENT_TIMESTAMP WHERE `last_accessed` IS NULL;