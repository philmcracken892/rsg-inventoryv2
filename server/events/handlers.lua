AddEventHandler('playerDropped', function()
    for _, inv in pairs(Inventories) do
        if inv.isOpen == source then
            inv.isOpen = false
        end
    end
end)

AddEventHandler('txAdmin:events:serverShuttingDown', function()
    for inventory, data in pairs(Inventories) do
        if data.isOpen then
            MySQL.prepare('INSERT INTO inventories (identifier, items) VALUES (?, ?) ON DUPLICATE KEY UPDATE items = ?', { inventory, json.encode(data.items), json.encode(data.items) })
        end
    end
end)

RegisterNetEvent('RSGCore:Server:UpdateObject', function()
    if source ~= '' then return end
    RSGCore = exports['rsg-core']:GetCoreObject()
end)

AddEventHandler('RSGCore:Server:PlayerLoaded', function(Player)
    local src = Player.PlayerData.source

    
    RSGCore.Functions.AddPlayerMethod(src, 'AddItem', function(item, amount, slot, info, reason)
        amount = tonumber(amount) or 1

        local canCarry, failReason = Inventory.CanAddItem(src, item, amount)
        
        if not canCarry then
            local msg = 'You cannot carry this item.'
            if failReason == 'weight' then
                msg = 'You are carrying too much weight.'
            elseif failReason == 'slots' then
                msg = 'Your inventory slots are full.'
            end

            TriggerClientEvent('ox_lib:notify', src, {
                 title = 'Inventory',
                 description = msg,
                 type = 'error',
                 duration = 4000
             })

            return false, failReason
        end

        return Inventory.AddItem(src, item, amount, slot, info, reason)
    end)

   
    RSGCore.Functions.AddPlayerMethod(src, 'RemoveItem', function(item, amount, slot, reason, isMove)
        return Inventory.RemoveItem(src, item, amount, slot, reason, isMove)
    end)

    RSGCore.Functions.AddPlayerMethod(src, 'GetItemBySlot', function(slot)
        return Inventory.GetItemBySlot(src, slot)
    end)

    RSGCore.Functions.AddPlayerMethod(src, 'GetItemByName', function(item)
        return Inventory.GetItemByName(src, item)
    end)

    RSGCore.Functions.AddPlayerMethod(src, 'GetItemsByName', function(item)
        return Inventory.GetItemsByName(src, item)
    end)

    RSGCore.Functions.AddPlayerMethod(src, 'ClearInventory', function(filterItems)
        Inventory.ClearInventory(src, filterItems)
    end)

    RSGCore.Functions.AddPlayerMethod(src, 'SetInventory', function(items)
        Inventory.SetInventory(src, items)
    end)
end)

AddEventHandler('onResourceStart', function(resourceName)
    if resourceName ~= GetCurrentResourceName() then return end
    local Players = RSGCore.Functions.GetRSGPlayers()
    for k in pairs(Players) do
        RSGCore.Functions.AddPlayerMethod(k, 'AddItem', function(item, amount, slot, info)
            return Inventory.AddItem(k, item, amount, slot, info)
        end)

        RSGCore.Functions.AddPlayerMethod(k, 'RemoveItem', function(item, amount, slot)
            return Inventory.RemoveItem(k, item, amount, slot)
        end)

        RSGCore.Functions.AddPlayerMethod(k, 'GetItemBySlot', function(slot)
            return Inventory.GetItemBySlot(k, slot)
        end)

        RSGCore.Functions.AddPlayerMethod(k, 'GetItemByName', function(item)
            return Inventory.GetItemByName(k, item)
        end)

        RSGCore.Functions.AddPlayerMethod(k, 'GetItemsByName', function(item)
            return Inventory.GetItemsByName(k, item)
        end)

        RSGCore.Functions.AddPlayerMethod(k, 'ClearInventory', function(filterItems)
            Inventory.ClearInventory(k, filterItems)
        end)

        RSGCore.Functions.AddPlayerMethod(k, 'SetInventory', function(items)
            Inventory.SetInventory(k, items)
        end)

        Player(k).state.inv_busy = false
    end
end)