RSGCore.Functions.CreateCallback('rsg-inventory:server:attemptPurchase', function(source, cb, data)
    local itemInfo = data.item
    local amount = math.round(data.amount)
    local shop = string.gsub(data.shop, '^shop%-', '')
    local price = itemInfo.price
    local sinvtype = data.sourceinvtype
    local targetSlot = data.targetslot

    if itemInfo.unique and amount > 1 then
        amount = 1
    end

    if price then
        price = math.round(itemInfo.price * amount, 2)
    end
    local Player = RSGCore.Functions.GetPlayer(source)

    if not Player then
        cb(false)
        return
    end

    local shopInfo = RegisteredShops[shop]
    if not shopInfo then
        cb(false)
        return
    end

    local playerPed = GetPlayerPed(source)
    local playerCoords = GetEntityCoords(playerPed)
    if shopInfo.coords then
        local shopCoords = vector3(shopInfo.coords.x, shopInfo.coords.y, shopInfo.coords.z)
        if #(playerCoords - shopCoords) > 10 then
            cb(false)
            return
        end
    end

    if sinvtype == 'player' then
        for slot, item in ipairs(shopInfo.items) do 
            if itemInfo.name == item.name and item.buyPrice ~= nil then 

                if itemInfo.info.quality and itemInfo.info.quality < (item.minQuality or 1) then
                    TriggerClientEvent('ox_lib:notify', source, {title = 'The quality of this item is too low!', type = 'error', duration = 5000 })
                    cb(false)
                    return
                end

                if item.maxStock and item.maxStock < (item.amount + amount) then
                    TriggerClientEvent('ox_lib:notify', source, {title = 'This item is fully stocked, shop wont buy more!', type = 'error', duration = 5000 })
                    cb(false)
                    return
                end

                if Inventory.HasItem(source, itemInfo.name, amount) then
                    if item.amount then 
                        item.amount = item.amount + amount
                    end

                    local buyprice = (item.buyPrice * amount)
                    if itemInfo.info.quality and itemInfo.info.quality then 
                        buyprice = buyprice * (itemInfo.info.quality / 100)
                    end

                    buyprice = math.round(buyprice, 2)
                    
                    if buyprice < 0.01 then 
                        TriggerClientEvent('ox_lib:notify', source, {title = 'This is worthless! Try selling a larger quantity.', type = 'error', duration = 5000 })
                        cb(false)
                        return
                    end

                    Inventory.RemoveItem(source, itemInfo.name, amount, itemInfo.slot, 'shop-sell')
                    Player.Functions.AddMoney('cash', buyprice, 'shop-sell')
                    TriggerClientEvent('rsg-inventory:client:updateInventory', source)
                    cb(true)
                    return
                else
                    TriggerClientEvent('ox_lib:notify', source, {title = 'Not enough items to sell!', type = 'error', duration = 5000 })
                    cb(false)
                    return
                end
            end
        end

        TriggerClientEvent('ox_lib:notify', source, {title = 'This shop do not buy this item!', type = 'error', duration = 5000 })
        cb(false)
        return
    end

    if shopInfo.items[itemInfo.slot].name ~= itemInfo.name then -- Check if item name passed is the same as the item in that slot
        cb(false)
        return
    end

    if shopInfo.items[itemInfo.slot].amount and amount > shopInfo.items[itemInfo.slot].amount then
        TriggerClientEvent('ox_lib:notify', source, {title = 'Cannot purchase larger quantity than currently in stock', type = 'error', duration = 5000 })
        cb(false)
        return
    end

    if price then
        if Player.PlayerData.money.cash >= price then
            if shopInfo.items[itemInfo.slot].amount then 
                shopInfo.items[itemInfo.slot].amount = shopInfo.items[itemInfo.slot].amount - amount
            end

            Player.Functions.RemoveMoney('cash', price, 'shop-purchase')

            if not Inventory.AddItem(source, itemInfo.name, amount, targetSlot, itemInfo.info, 'shop-purchase') then
                local playerPed = GetPlayerPed(source)
                local playerCoords = GetEntityCoords(playerPed)
                TaskPlayAnim(playerPed, 'pickup_object', 'pickup_low', 8.0, -8.0, 2000, 0, 0, false, false, false)
                local itemToDrop = {
                    name = itemInfo.name,
                    amount = amount,
                    info = itemInfo.info,
                    type = itemInfo.type,
                    label = itemInfo.label or itemInfo.name,
                    description = itemInfo.description or '',
                    weight = itemInfo.weight or 0,
                    image = itemInfo.image or '',
                    unique = itemInfo.unique or false,
                    useable = itemInfo.useable or false,
                    shouldClose = itemInfo.shouldClose or true,
                    combinable = itemInfo.combinable or nil
                }
                local bag = CreateObjectNoOffset(Config.ItemDropObject, playerCoords.x + 0.5, playerCoords.y + 0.5, playerCoords.z, true, true, false)
                while not DoesEntityExist(bag) do Wait(0) end
                local dropId = NetworkGetNetworkIdFromEntity(bag)
                local newDropId = Helpers.CreateDropId(dropId)
                local itemsTable = setmetatable({ itemToDrop }, {
                    __len = function(t)
                        local length = 0
                        for _ in pairs(t) do length += 1 end
                        return length
                    end
                })
                Drops[newDropId] = {
                    name = newDropId,
                    label = 'Drop',
                    items = itemsTable,
                    entityId = dropId,
                    createdTime = os.time(),
                    coords = playerCoords,
                    maxweight = Config.DropSize.maxweight,
                    slots = Config.DropSize.slots,
                    isOpen = false
                }
                TriggerClientEvent('rsg-inventory:client:setupDropTarget', -1, dropId)
                TriggerClientEvent('ox_lib:notify', source, {title = 'Inventory full - item dropped!', type = 'info', duration = 5000 })
            end

            TriggerClientEvent('rsg-inventory:client:updateInventory', source)
            cb(true)
        else
            TriggerClientEvent('ox_lib:notify', source, {title = 'You do not have enough money', type = 'error', duration = 5000 })
            cb(false)
        end
    else
        TriggerClientEvent('ox_lib:notify', source, {title = 'Item has no price or is not for sale', type = 'error', duration = 5000 })
        cb(false)
    end
end)
