-- RSG Inventory - Stash Cleanup System
-- Automatically removes unused stash entries from the database after configured time
-- Only affects stash inventories, does not touch player inventories

local cleanupRunning = false

-- Function to perform the cleanup
local function performStashCleanup()
    if cleanupRunning then
        return
    end
    
    cleanupRunning = true
    
    local cleanupDays = Config.StashCleanupTime or 60
    
    -- Query to find and delete old stash entries
    -- This only targets inventory entries that are likely stashes (not player inventories)
    -- Player inventories typically use citizenid format, stashes use custom identifiers
    local query = [[
        DELETE FROM inventories 
        WHERE last_accessed < DATE_SUB(NOW(), INTERVAL ? DAY)
        AND identifier NOT REGEXP '^[A-Z]{3}[0-9]{5}$'
        AND identifier NOT LIKE 'citizenid-%'
        AND identifier NOT LIKE 'player-%'
    ]]
    
    MySQL.prepare(query, { cleanupDays }, function(result)
        local deletedCount = result and result.affectedRows or 0
        cleanupRunning = false
    end)
end

-- Function to start the cleanup timer
local function startCleanupTimer()
    local intervalHours = Config.StashCleanupInterval or 24
    local intervalMs = intervalHours * 60 * 60 * 1000 -- Convert hours to milliseconds
    
    -- Run initial cleanup after 5 minutes
    SetTimeout(5 * 60 * 1000, performStashCleanup)
    
    -- Set up recurring timer
    CreateThread(function()
        while true do
            Wait(intervalMs)
            performStashCleanup()
        end
    end)
end

-- Initialize the cleanup system when server starts
CreateThread(function()
    -- Wait for dependencies to load
    Wait(10000)
    
    -- Check if the database has the required column
    MySQL.prepare('DESCRIBE inventories', {}, function(result)
        local hasColumn = false
        if result then
            for _, column in ipairs(result) do
                if column.Field == 'last_accessed' then
                    hasColumn = true
                    break
                end
            end
        end
        
        if hasColumn then
            startCleanupTimer()
        end
    end)
end)

-- Export cleanup function for manual use
exports('CleanupOldStashes', performStashCleanup)

-- Function to get cleanup statistics without removing anything
local function getCleanupStats()
    local cleanupDays = Config.StashCleanupTime or 60
    
    local query = [[
        SELECT COUNT(*) as count, 
               MIN(last_accessed) as oldest_access,
               MAX(last_accessed) as newest_access
        FROM inventories 
        WHERE last_accessed < DATE_SUB(NOW(), INTERVAL ? DAY)
        AND identifier NOT REGEXP '^[A-Z]{3}[0-9]{5}$'
        AND identifier NOT LIKE 'citizenid-%'
        AND identifier NOT LIKE 'player-%'
    ]]
    
    return MySQL.prepare.await(query, { cleanupDays })
end

-- Command to test/preview stash cleanup
RSGCore.Commands.Add('testcleanup', 'Test stash cleanup system (Admin only)', {}, false, function(source, args)
    local Player = RSGCore.Functions.GetPlayer(source)
    if not Player then return end
    
    -- Check if player is admin (adjust this check based on your permission system)
    if not RSGCore.Functions.HasPermission(source, 'admin') then
        TriggerClientEvent('ox_lib:notify', source, {
            title = 'No Permission',
            description = 'You need admin permissions to use this command',
            type = 'error'
        })
        return
    end
    
    local action = args[1] and args[1]:lower() or 'preview'
    
    if action == 'preview' or action == 'check' then
        -- Show what would be cleaned up without actually doing it
        local stats = getCleanupStats()
        if stats and stats[1] then
            local count = stats[1].count or 0
            local oldest = stats[1].oldest_access or 'N/A'
            local newest = stats[1].newest_access or 'N/A'
            
            TriggerClientEvent('ox_lib:notify', source, {
                title = 'Stash Cleanup Preview',
                description = string.format('Found %d stashes ready for cleanup\nOldest: %s\nNewest: %s', count, oldest, newest),
                type = 'info',
                duration = 8000
            })
        else
            TriggerClientEvent('ox_lib:notify', source, {
                title = 'Cleanup Preview Error',
                description = 'Could not get cleanup statistics',
                type = 'error'
            })
        end
        
    elseif action == 'run' or action == 'execute' then
        -- Actually perform the cleanup
        TriggerClientEvent('ox_lib:notify', source, {
            title = 'Cleanup Started',
            description = 'Manual stash cleanup initiated...',
            type = 'inform'
        })
        
        performStashCleanup()
        
    elseif action == 'status' then
        -- Show system status and configuration
        local cleanupDays = Config.StashCleanupTime or 60
        local intervalHours = Config.StashCleanupInterval or 24
        local isRunning = cleanupRunning and 'Yes' or 'No'
        
        TriggerClientEvent('ox_lib:notify', source, {
            title = 'Cleanup System Status',
            description = string.format('Cleanup Time: %d days\nInterval: %d hours\nCurrently Running: %s', cleanupDays, intervalHours, isRunning),
            type = 'info',
            duration = 6000
        })
        
    else
        -- Show help
        TriggerClientEvent('ox_lib:notify', source, {
            title = 'Stash Cleanup Commands',
            description = '/testcleanup preview - Show what would be cleaned\n/testcleanup run - Execute cleanup now\n/testcleanup status - Show system info',
            type = 'info',
            duration = 8000
        })
    end
end, 'admin')
