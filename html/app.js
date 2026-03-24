/**
 * RSG Inventory - Vue 3 Application
 * Optimized for performance
 */

const InventoryContainer = Vue.createApp({
    data() {
        return this.getInitialState();
    },

    computed: {
        playerWeight() {
            let weight = 0;
            for (const key in this.playerInventory) {
                const item = this.playerInventory[key];
                const itemWeight = item?.weight || 0;
                if (item && item.amount) {
                    weight += itemWeight * item.amount;
                }
            }
            return weight;
        },

        playerMoney() {
            let total = 0;
            for (const key in this.playerInventory) {
                const item = this.playerInventory[key];
                if (!item) continue;
                if (item.name === 'dollar') total += (item.amount || 0) * 100;
                else if (item.name === 'cent') total += item.amount || 0;
            }
            return total;
        },

        otherInventoryWeight() {
            let weight = 0;
            for (const key in this.otherInventory) {
                const item = this.otherInventory[key];
                const itemWeight = item?.weight || 0;
                if (item && item.amount) {
                    weight += itemWeight * item.amount;
                }
            }
            return weight;
        },

        shouldCenterInventory() {
            return this.isOtherInventoryEmpty;
        },

        weightBarClass() {
            const pct = (this.playerWeight / this.maxWeight) * 100;
            return pct < 50 ? 'low' : pct < 75 ? 'medium' : 'high';
        },

        otherWeightBarClass() {
            const pct = (this.otherInventoryWeight / this.otherInventoryMaxWeight) * 100;
            return pct < 50 ? 'low' : pct < 75 ? 'medium' : 'high';
        },

        playerWindowStyle() {
            const { x, y } = this.playerWindowOffset;
            if (x === 0 && y === 0) return {};
            return { transform: `translate(calc(-50% + ${x}px), ${y}px)` };
        },

        playerWindowBgStyle() {
            const { x, y } = this.playerWindowOffset;
            if (x === 0 && y === 0) return {};
            return { transform: `translateX(${x}px) translateY(${y}px)` };
        },

        otherWindowStyle() {
            const { x, y } = this.otherWindowOffset;
            if (x === 0 && y === 0) return {};
            return { transform: `translate(calc(50% + ${x}px), ${y}px)` };
        },

        otherWindowBgStyle() {
            const { x, y } = this.otherWindowOffset;
            if (x === 0 && y === 0) return {};
            return { transform: `translateX(${x}px) translateY(${y}px)` };
        },

        otherWindowInputStyle() {
            const { x, y } = this.otherWindowOffset;
            if (x === 0 && y === 0) return {};
            return {
                transform: `translateY(${y}px)`,
                left: `calc(100vw - 13vw - var(--bg-width) + ${x}px)`
            };
        },

        centeredWindowStyle() {
            const { x, y } = this.playerWindowOffset;
            if (x === 0 && y === 0) return {};
            return { transform: `translate(calc(-50% + ${x}px), ${y}px)` };
        },

        centeredWindowBgStyle() {
            const { x, y } = this.playerWindowOffset;
            if (x === 0 && y === 0) return {};
            return { transform: `translateX(calc(-50% + ${x}px)) translateY(${y}px)` };
        },
    },

    watch: {
        transferAmount(val) {
            if (val !== null && val < 1) this.transferAmount = 1;
        },
    },

    methods: {
        getInitialState() {
            return {
                maxWeight: 0,
                totalSlots: 40,
                isInventoryOpen: false,
                additionalCloseKey: 'KeyI',
                isOtherInventoryEmpty: true,
                errorSlot: null,
                playerInventory: {},
                inventoryLabel: 'Satchel',
                totalWeight: 0,
                otherInventory: {},
                otherInventoryName: '',
                otherInventoryLabel: 'Drop',
                otherInventoryMaxWeight: 1000000,
                otherInventorySlots: 100,
                isShopInventory: false,
                inventory: '',
                showContextMenu: false,
                contextMenuPosition: { top: '0px', left: '0px' },
                contextMenuItem: null,
                showSubmenu: false,
                showHotbar: false,
                hotbarItems: [],
                wasHotbarEnabled: false,
                showNotification: false,
                notificationText: '',
                notificationImage: '',
                notificationType: 'added',
                notificationAmount: 1,
                notificationDescription: '',
                notificationTimeout: null,
                requiredItems: [],
                selectedWeapon: null,
                showWeaponAttachments: false,
                selectedWeaponAttachments: [],
                selectedItem: null,
                tooltipPosition: { topVh: 0, leftVw: 0 },
                playerId: null,
                currentlyDraggingItem: null,
                currentlyDraggingSlot: null,
                dragStartX: 0,
                dragStartY: 0,
                ghostElement: null,
                dragStartInventoryType: 'player',
                transferAmount: null,
                busy: false,
                dragThreshold: 5,
                isMouseDown: false,
                mouseDownX: 0,
                mouseDownY: 0,
                scrollBoundElements: [],
                isDraggingWindow: false,
                activeWindowDrag: null,
                windowDragStartX: 0,
                windowDragStartY: 0,
                playerWindowOffset: { x: 0, y: 0 },
                otherWindowOffset: { x: 0, y: 0 },
                initialWindowOffset: { x: 0, y: 0 },
            };
        },

        nui(endpoint) {
            const resource = typeof GetParentResourceName === 'function' 
                ? GetParentResourceName() 
                : 'rsg-inventory';
            return `https://${resource}/${endpoint}`;
        },

        async validateToken(csrfToken) {
            try {
                const response = await axios.post('https://rsg-core/validateCSRF', { clientToken: csrfToken });
                return response.data.valid;
            } catch {
                return false;
            }
        },

        // Window Dragging
        startWindowDrag(event, windowType) {
            if (event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();

            // Cancel any item dragging in progress
            this.clearDragData();
            this.isMouseDown = false;

            this.isDraggingWindow = true;
            this.activeWindowDrag = windowType;
            this.windowDragStartX = event.clientX;
            this.windowDragStartY = event.clientY;
            this.initialWindowOffset = { 
                ...(windowType === 'player' ? this.playerWindowOffset : this.otherWindowOffset) 
            };

            document.addEventListener('mousemove', this.handleWindowDrag);
            document.addEventListener('mouseup', this.endWindowDrag);
        },

        handleWindowDrag(event) {
            if (!this.isDraggingWindow) return;
            event.preventDefault();

            const deltaX = event.clientX - this.windowDragStartX;
            const deltaY = event.clientY - this.windowDragStartY;
            const newOffset = {
                x: this.initialWindowOffset.x + deltaX,
                y: this.initialWindowOffset.y + deltaY
            };

            if (this.activeWindowDrag === 'player') {
                this.playerWindowOffset = newOffset;
            } else {
                this.otherWindowOffset = newOffset;
            }
        },

        endWindowDrag(event) {
            if (!this.isDraggingWindow) return;
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            this.isDraggingWindow = false;
            this.activeWindowDrag = null;
            document.removeEventListener('mousemove', this.handleWindowDrag);
            document.removeEventListener('mouseup', this.endWindowDrag);
        },

        resetWindowPositions() {
            this.playerWindowOffset = { x: 0, y: 0 };
            this.otherWindowOffset = { x: 0, y: 0 };
        },

        // Inventory Operations
        openInventory(data) {
            if (this.showHotbar) {
                this.wasHotbarEnabled = true;
                this.toggleHotbar(false);
            } else {
                this.wasHotbarEnabled = false;
            }

            this.isInventoryOpen = true;
            this.maxWeight = Number(data.maxweight ?? data.maxWeight ?? data.playerMaxWeight ?? 0) || 0;
            this.totalSlots = Number(data.slots ?? data.maxslots ?? data.maxSlots ?? 40) || 40;
            this.playerId = data.playerId || null;
            this.playerInventory = {};
            this.otherInventory = {};
            this.resetWindowPositions();

            this.processInventoryData(data.inventory, this.playerInventory);

            if (data.other) {
                this.processInventoryData(data.other.inventory, this.otherInventory);
                this.otherInventoryName = data.other.name;
                this.otherInventoryLabel = data.other.label;
                this.otherInventoryMaxWeight = Number(data.other.maxweight ?? data.other.maxWeight ?? 1000000);
                this.otherInventorySlots = Number(data.other.slots ?? data.other.maxslots ?? 100);
                this.isShopInventory = this.otherInventoryName?.startsWith('shop-') || false;
                this.isOtherInventoryEmpty = false;
            }

            this.$nextTick(() => this.attachGridScrollListeners());
        },

        processInventoryData(source, target) {
            if (!source) return;

            const items = Array.isArray(source) ? source : Object.values(source);
            items.forEach((item, index) => {
                if (!item) return;
                const slot = Number(item.slot ?? (index + 1));
                if (slot > 0) {
                    item.slot = slot;
                    target[slot] = item;
                }
            });
        },

        updateInventory(data) {
            if (!data?.inventory) return;

            const merged = { ...this.playerInventory };
            const items = Array.isArray(data.inventory) ? data.inventory : Object.values(data.inventory);

            items.forEach(item => {
                if (!item?.slot) return;
                if (item.remove || item.amount === 0) {
                    delete merged[item.slot];
                } else {
                    merged[item.slot] = item;
                }
            });

            if (Array.isArray(data.removedSlots)) {
                data.removedSlots.forEach(slot => delete merged[slot]);
            }

            this.playerInventory = merged;
        },

        async closeInventory() {
            const inventoryName = this.otherInventoryName;
            const wasHotbarEnabled = this.wasHotbarEnabled;
            let hotbarItems = [];

            if (wasHotbarEnabled) {
                hotbarItems = Array(5).fill(null).map((_, i) => this.playerInventory[i + 1] || null);
            }

            Object.assign(this, this.getInitialState());

            try {
                await axios.post(this.nui('CloseInventory'), { name: inventoryName });
                if (wasHotbarEnabled) {
                    this.toggleHotbar({ open: true, items: hotbarItems });
                }
            } catch (error) {
                console.error('Error closing inventory:', error);
            }
        },

        clearTransferAmount() {
            this.transferAmount = null;
        },

        getItemInSlot(slot, inventoryType) {
            const inv = inventoryType === 'player' ? this.playerInventory : this.otherInventory;
            return inv[slot] || null;
        },

        showItemInfo(item, evt) {
            if (!item || this.showContextMenu || this.currentlyDraggingItem || this.isMouseDown || this.isDraggingWindow) return;

            this.selectedItem = item;

            if (evt?.clientX !== undefined) {
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const tooltipW = vw * 0.22;
                const tooltipH = vh * 0.20;
                const pad = 10;

                let left = evt.clientX + pad;
                let top = evt.clientY - tooltipH / 2;

                if (left + tooltipW > vw) left = vw - tooltipW - pad;
                if (top + tooltipH > vh) top = vh - tooltipH - pad;
                if (top < 0) top = pad;

                this.tooltipPosition = {
                    topVh: (top / vh) * 100,
                    leftVw: (left / vw) * 100
                };
            }
        },

        hideItemInfo() {
            this.selectedItem = null;
        },

        getHotbarItemInSlot(slot) {
            return this.hotbarItems[slot - 1] || null;
        },

        containerMouseDownAction(event) {
            if (event.button === 0 && this.showContextMenu) {
                this.showContextMenu = false;
            }
            this.hideItemInfo();
        },

        handleMouseDown(event, slot, inventory) {
            if (event.button === 1 || this.isDraggingWindow) return;
            event.preventDefault();
            event.stopPropagation();

            const item = this.getItemInSlot(slot, inventory);

            if (event.button === 0) {
                if (event.shiftKey && item) {
                    this.splitAndPlaceItem(item, inventory);
                } else if (item) {
                    this.isMouseDown = true;
                    this.mouseDownX = event.clientX;
                    this.mouseDownY = event.clientY;
                    this.currentlyDraggingSlot = slot;
                    this.dragStartInventoryType = inventory;
                }
            } else if (event.button === 2 && item) {
                if (this.otherInventoryName?.startsWith('shop-')) {
                    this.handlePurchase(item.slot, item, 1, inventory);
                } else if (!this.isOtherInventoryEmpty) {
                    this.moveItemBetweenInventories(item, inventory);
                } else {
                    this.showContextMenuOptions(event, item);
                }
            }
        },

        moveItemBetweenInventories(item, sourceInventoryType) {
            if (this.busy) return;
            this.busy = true;

            const sourceInventory = sourceInventoryType === 'player' ? this.playerInventory : this.otherInventory;
            const targetInventory = sourceInventoryType === 'player' ? this.otherInventory : this.playerInventory;
            const amountToTransfer = this.transferAmount !== null ? this.transferAmount : 1;
            let targetSlot = null;

            const sourceItem = sourceInventory[item.slot];
            if (!sourceItem || sourceItem.amount < amountToTransfer) {
                this.inventoryError(item.slot);
                this.busy = false;
                return;
            }

            const itemWeight = Number(sourceItem.weight) || 0;
            const currentWeight = Number(this.otherInventoryWeight) || 0;
            const maxWeight = Number(this.otherInventoryMaxWeight) || Infinity;
            const totalWeightAfterTransfer = currentWeight + itemWeight * amountToTransfer;
            if (totalWeightAfterTransfer > maxWeight) {
                this.inventoryError(item.slot);
                this.busy = false;
                return;
            }

            if (this.playerInventory !== targetInventory) {
                if (this.findNextAvailableSlot(targetInventory) > this.otherInventorySlots) {
                    this.inventoryError(item.slot);
                    this.busy = false;
                    return;
                }
            }

            if (item.unique) {
                targetSlot = this.findNextAvailableSlot(targetInventory);
                if (targetSlot === null) {
                    this.inventoryError(item.slot);
                    this.busy = false;
                    return;
                }

                const newItem = {
                    ...item,
                    inventory: sourceInventoryType === 'player' ? 'other' : 'player',
                    amount: amountToTransfer,
                };
                targetInventory[targetSlot] = newItem;
                newItem.slot = targetSlot;
            } else {
                const targetItemKey = Object.keys(targetInventory).find(
                    (key) => targetInventory[key] && targetInventory[key].name === item.name
                );
                const targetItem = targetInventory[targetItemKey];

                if (!targetItem) {
                    const newItem = {
                        ...item,
                        inventory: sourceInventoryType === 'player' ? 'other' : 'player',
                        amount: amountToTransfer,
                    };

                    targetSlot = this.findNextAvailableSlot(targetInventory);
                    if (targetSlot === null) {
                        this.inventoryError(item.slot);
                        this.busy = false;
                        return;
                    }

                    targetInventory[targetSlot] = newItem;
                    newItem.slot = targetSlot;
                } else {
                    targetItem.amount += amountToTransfer;
                    targetSlot = targetItem.slot;
                }
            }

            sourceItem.amount -= amountToTransfer;
            if (sourceItem.amount <= 0) {
                delete sourceInventory[item.slot];
            }

            this.postInventoryData(
                sourceInventoryType,
                sourceInventoryType === 'player' ? 'other' : 'player',
                item.slot,
                targetSlot,
                sourceItem.amount,
                amountToTransfer
            );
        },

        startDrag(event, slot, inventoryType) {
            if (this.isDraggingWindow) return;
            event.preventDefault();
            event.stopPropagation();
            
            const item = this.getItemInSlot(slot, inventoryType);
            if (!item) return;

            const slotEl = event.target.closest('.item-slot');
            if (!slotEl) return;

            this.hideItemInfo();
            this.dragStartInventoryType = inventoryType;
            
            const ghost = this.createGhostElement(slotEl);
            document.body.appendChild(ghost);
            
            const offsetX = ghost.offsetWidth / 2;
            const offsetY = ghost.offsetHeight / 2;
            ghost.style.left = `${event.clientX - offsetX}px`;
            ghost.style.top = `${event.clientY - offsetY}px`;

            this.ghostElement = ghost;
            this.currentlyDraggingItem = item;
            this.currentlyDraggingSlot = slot;
            this.dragStartX = event.clientX;
            this.dragStartY = event.clientY;
            this.showContextMenu = false;
        },

        createGhostElement(slotEl) {
            const ghost = slotEl.cloneNode(true);
            Object.assign(ghost.style, {
                position: 'absolute',
                pointerEvents: 'none',
                opacity: '0.8',
                zIndex: '9999',
                width: getComputedStyle(slotEl).width,
                height: getComputedStyle(slotEl).height,
                boxSizing: 'border-box',
                transform: 'scale(1.05)',
                boxShadow: '0 0 30px rgba(0,0,0,0.7)'
            });

            const amountEl = ghost.querySelector('.item-slot-amount p');
            if (amountEl) {
                const isShop = this.otherInventoryName.indexOf('shop-') !== -1;
                if (this.transferAmount) {
                    amountEl.textContent = `x${this.transferAmount}`;
                } else if (isShop && this.dragStartInventoryType === 'other') {
                    amountEl.textContent = 'x1';
                }
            }

            return ghost;
        },

        drag(event) {
            // Priority check: If window is being dragged, don't drag items
            if (this.isDraggingWindow) {
                // Cancel any pending item drag
                if (this.isMouseDown && !this.ghostElement) {
                    this.isMouseDown = false;
                    this.currentlyDraggingSlot = null;
                }
                return;
            }

            // Start item drag if threshold met
            if (this.isMouseDown && !this.ghostElement) {
                const dx = Math.abs(event.clientX - this.mouseDownX);
                const dy = Math.abs(event.clientY - this.mouseDownY);
                if (dx >= this.dragThreshold || dy >= this.dragThreshold) {
                    this.startDrag(event, this.currentlyDraggingSlot, this.dragStartInventoryType);
                }
                return;
            }

            // Update ghost element position
            if (!this.currentlyDraggingItem || !this.ghostElement) return;

            const x = event.clientX - this.ghostElement.offsetWidth / 2;
            const y = event.clientY - this.ghostElement.offsetHeight / 2;
            this.ghostElement.style.left = `${x}px`;
            this.ghostElement.style.top = `${y}px`;
        },

        endDrag(event) {
            this.isMouseDown = false;
            
            // Don't process item drops if we were dragging a window
            if (this.isDraggingWindow) {
                this.clearDragData();
                return;
            }
            
            if (!this.currentlyDraggingItem) {
                this.clearDragData();
                return;
            }

            const playerSlot = event.target.closest('.player-inventory .item-slot');
            const otherSlot = event.target.closest('.other-inventory .item-slot');
            const container = event.target.closest('.inventory-container');

            if (playerSlot) {
                const slot = Number(playerSlot.dataset.slot);
                if (slot && !(slot === this.currentlyDraggingSlot && this.dragStartInventoryType === 'player')) {
                    this.handleDropOnPlayerSlot(slot);
                }
            } else if (otherSlot) {
                const slot = Number(otherSlot.dataset.slot);
                if (slot && !(slot === this.currentlyDraggingSlot && this.dragStartInventoryType === 'other')) {
                    this.handleDropOnOtherSlot(slot);
                }
            } else if (container && !playerSlot && !otherSlot) {
                this.handleDropOnInventoryContainer();
            }

            this.clearDragData();
        },

        handleDropOnPlayerSlot(targetSlot) {
            if (this.isShopInventory && this.dragStartInventoryType === 'other') {
                const { currentlyDraggingSlot, currentlyDraggingItem, transferAmount } = this;
                const targetInventory = this.getInventoryByType('player');
                const targetItem = targetInventory[targetSlot];
                
                if (
                    (targetItem && targetItem.name !== currentlyDraggingItem.name) ||
                    (targetItem && targetItem.name === currentlyDraggingItem.name && currentlyDraggingItem.unique) ||
                    (targetItem && targetItem.name === currentlyDraggingItem.name && targetItem.info?.quality && targetItem.info.quality !== 100)
                ) {
                    this.inventoryError(currentlyDraggingSlot);
                    return;
                }
                this.handlePurchase(currentlyDraggingSlot, currentlyDraggingItem, transferAmount, this.dragStartInventoryType, targetSlot);
            } else {
                this.handleItemDrop('player', targetSlot);
            }
        },

        handleDropOnOtherSlot(targetSlot) {
            this.handleItemDrop('other', targetSlot);
        },

        async handleDropOnInventoryContainer() {
            if (this.isOtherInventoryEmpty && this.dragStartInventoryType === 'player') {
                const newItem = {
                    ...this.currentlyDraggingItem,
                    amount: this.currentlyDraggingItem.amount,
                    slot: 1,
                    inventory: 'other',
                };
                const draggingItem = this.currentlyDraggingItem;
                
                try {
                    const response = await axios.post(this.nui('DropItem'), {
                        ...newItem,
                        fromSlot: this.currentlyDraggingSlot,
                    });

                    if (response.data) {
                        this.otherInventory[1] = newItem;
                        const draggingItemKey = Object.keys(this.playerInventory).find(
                            (key) => this.playerInventory[key] === draggingItem
                        );
                        if (draggingItemKey) {
                            delete this.playerInventory[draggingItemKey];
                        }
                        this.otherInventoryName = response.data;
                        this.otherInventoryLabel = response.data;
                        this.isOtherInventoryEmpty = false;
                        this.clearDragData();
                    }
                } catch (error) {
                    this.inventoryError(this.currentlyDraggingSlot);
                }
            }
            this.clearDragData();
        },

        clearDragData() {
            if (this.ghostElement) {
                try {
                    document.body.removeChild(this.ghostElement);
                } catch (e) {
                    // Ghost element might already be removed
                }
                this.ghostElement = null;
            }
            this.currentlyDraggingItem = null;
            this.currentlyDraggingSlot = null;
            this.isMouseDown = false;
        },

        getInventoryByType(type) {
            return type === 'player' ? this.playerInventory : this.otherInventory;
        },

        handleItemDrop(targetInventoryType, targetSlot) {
            try {
                const isShop = this.otherInventoryName.indexOf('shop-');
                if (this.dragStartInventoryType === 'other' && targetInventoryType === 'other' && isShop !== -1) {
                    return;
                }

                const targetSlotNumber = parseInt(targetSlot, 10);
                if (isNaN(targetSlotNumber)) {
                    throw new Error('Invalid target slot number');
                }

                const sourceInventory = this.getInventoryByType(this.dragStartInventoryType);
                const targetInventory = this.getInventoryByType(targetInventoryType);

                const sourceItem = sourceInventory[this.currentlyDraggingSlot];
                if (!sourceItem) {
                    throw new Error('No item in the source slot to transfer');
                }

                const amountToTransfer = this.transferAmount !== null ? this.transferAmount : sourceItem.amount;
                if (sourceItem.amount < amountToTransfer) {
                    throw new Error('Insufficient amount of item in source inventory');
                }

                if (this.dragStartInventoryType === 'player' && targetInventoryType === 'other' && isShop !== -1) {
                    this.handlePurchase(
                        this.currentlyDraggingSlot,
                        sourceItem,
                        this.transferAmount !== null ? this.transferAmount : sourceItem.amount,
                        this.dragStartInventoryType
                    );
                    return;
                }

                if (targetInventoryType !== this.dragStartInventoryType) {
                    if (targetInventoryType === 'other') {
                        const itemWeight = Number(sourceItem.weight) || 0;
                        const currentWeight = Number(this.otherInventoryWeight) || 0;
                        const maxWeight = Number(this.otherInventoryMaxWeight) || Infinity;
                        const totalWeightAfterTransfer = currentWeight + itemWeight * amountToTransfer;
                        if (totalWeightAfterTransfer > maxWeight) {
                            throw new Error('Insufficient weight capacity in target inventory');
                        }
                    } else if (targetInventoryType === 'player') {
                        const itemWeight = Number(sourceItem.weight) || 0;
                        const currentWeight = Number(this.playerWeight) || 0;
                        const maxWeight = Number(this.maxWeight) || Infinity;
                        const totalWeightAfterTransfer = currentWeight + (itemWeight * amountToTransfer);
                        if (totalWeightAfterTransfer > maxWeight) {
                            throw new Error('Insufficient weight capacity in player inventory');
                        }
                    }
                }

                const targetItem = targetInventory[targetSlotNumber];

                if (targetItem) {
                    if (sourceItem.name === targetItem.name && targetItem.unique) {
                        this.inventoryError(this.currentlyDraggingSlot);
                        return;
                    }
                    if (sourceItem.name === targetItem.name && !targetItem.unique && sourceItem.info?.quality === targetItem.info?.quality) {
                        targetItem.amount += amountToTransfer;
                        sourceItem.amount -= amountToTransfer;
                        if (sourceItem.amount <= 0) {
                            delete sourceInventory[this.currentlyDraggingSlot];
                        }
                        this.postInventoryData(this.dragStartInventoryType, targetInventoryType, this.currentlyDraggingSlot, targetSlotNumber, sourceItem.amount, amountToTransfer);
                    } else {
                        sourceInventory[this.currentlyDraggingSlot] = targetItem;
                        targetInventory[targetSlotNumber] = sourceItem;
                        sourceInventory[this.currentlyDraggingSlot].slot = this.currentlyDraggingSlot;
                        targetInventory[targetSlotNumber].slot = targetSlotNumber;
                        this.postInventoryData(this.dragStartInventoryType, targetInventoryType, this.currentlyDraggingSlot, targetSlotNumber, sourceItem.amount, targetItem.amount);
                    }
                } else {
                    sourceItem.amount -= amountToTransfer;
                    if (sourceItem.amount <= 0) {
                        delete sourceInventory[this.currentlyDraggingSlot];
                    }
                    targetInventory[targetSlotNumber] = { ...sourceItem, amount: amountToTransfer, slot: targetSlotNumber };
                    this.postInventoryData(this.dragStartInventoryType, targetInventoryType, this.currentlyDraggingSlot, targetSlotNumber, sourceItem.amount, amountToTransfer);
                }
            } catch (error) {
                console.error(error.message);
                this.inventoryError(this.currentlyDraggingSlot);
            } finally {
                this.clearDragData();
            }
        },

        async handlePurchase(sourceSlot, sourceItem, transferAmount, sourceInventoryType, targetSlot = null) {
            if (this.busy) return;

            if (sourceItem.amount < 1) {
                this.inventoryError(sourceSlot);
                return;
            }

            this.busy = true;
            try {
                const response = await axios.post(this.nui('AttemptPurchase'), {
                    item: sourceItem,
                    amount: transferAmount || 1,
                    shop: this.otherInventoryName,
                    sourceinvtype: sourceInventoryType,
                    targetslot: targetSlot,
                });

                if (response.data) {
                    if (!sourceItem.amount) {
                        this.busy = false;
                        return;
                    }

                    const amountToTransfer = transferAmount !== null ? transferAmount : 1;
                    if (sourceInventoryType === 'player') {
                        for (const key in this.otherInventory) {
                            const item = this.otherInventory[key];
                            if (item.name === sourceItem.name && item.amount) {
                                this.otherInventory[key].amount += amountToTransfer;
                                break;
                            }
                        }
                    } else {
                        if (sourceItem.amount < amountToTransfer) {
                            this.inventoryError(sourceSlot);
                            this.busy = false;
                            return;
                        }
                        sourceItem.amount -= amountToTransfer;
                    }

                    this.busy = false;
                } else {
                    this.inventoryError(sourceSlot);
                    this.busy = false;
                }
            } catch (error) {
                this.inventoryError(sourceSlot);
                this.busy = false;
            }
        },

        // ============================================
        // DROP ITEM - FIXED
        // ============================================
        async dropItem(item, quantity) {
            if (item && item.name) {
                const playerItemKey = Object.keys(this.playerInventory).find(
                    (key) => this.playerInventory[key] && this.playerInventory[key].slot === item.slot
                );

                if (playerItemKey) {
                    let amountToGive;

                    if (typeof quantity === 'string') {
                        switch (quantity) {
                            case 'half':
                                amountToGive = Math.ceil(item.amount / 2);
                                break;
                            case 'all':
                                amountToGive = item.amount;
                                break;
                            case 'enteramount':
                                const amountResponse = await axios.post(this.nui('GiveItemAmount'));
                                amountToGive = amountResponse.data;
                                break;
                            default:
                                console.error('Invalid quantity specified.');
                                return;
                        }
                    } else if (typeof quantity === 'number' && quantity > 0) {
                        amountToGive = quantity;
                    } else {
                        console.error('Invalid quantity type specified.');
                        return;
                    }

                    if (amountToGive > item.amount) {
                        amountToGive = item.amount;
                    }

                    const newItem = {
                        ...item,
                        amount: amountToGive,
                        slot: 1,
                        inventory: 'other',
                    };

                    try {
                        const response = await axios.post(this.nui('DropItem'), {
                            ...newItem,
                            fromSlot: item.slot,
                        });

                        if (response.data) {
                            const remainingAmount = this.playerInventory[playerItemKey].amount - amountToGive;
                            if (remainingAmount <= 0) {
                                delete this.playerInventory[playerItemKey];
                            } else {
                                this.playerInventory[playerItemKey].amount = remainingAmount;
                            }

                            this.otherInventory[1] = newItem;
                            this.otherInventoryName = response.data;
                            this.otherInventoryLabel = response.data;
                            this.isOtherInventoryEmpty = false;
                        }
                    } catch (error) {
                        this.inventoryError(item.slot);
                    }
                }
            }
            this.showContextMenu = false;
        },

        // ============================================
        // USE ITEM - FIXED
        // ============================================
        async useItem(item) {
            if (!item || item.useable === false) {
                return;
            }
            const playerItemKey = Object.keys(this.playerInventory).find(
                (key) => this.playerInventory[key] && this.playerInventory[key].slot === item.slot
            );
            if (playerItemKey) {
                try {
                    if (item.shouldClose) {
                        this.closeInventory();
                    }
                    await axios.post(this.nui('UseItem'), {
                        inventory: 'player',
                        item: item,
                    });
                } catch (error) {
                    console.error('Error using the item:', error);
                }
            }
            this.showContextMenu = false;
        },

        showContextMenuOptions(event, item) {
            event.preventDefault();
            if (this.contextMenuItem && this.contextMenuItem.name === item.name && this.showContextMenu) {
                this.showContextMenu = false;
                this.contextMenuItem = null;
            } else {
                this.hideItemInfo();
                if (item.inventory === 'other') {
                    const matchingItemKey = Object.keys(this.playerInventory).find(
                        (key) => this.playerInventory[key].name === item.name
                    );
                    const matchingItem = this.playerInventory[matchingItemKey];

                    if (matchingItem && matchingItem.unique) {
                        const newItemKey = Object.keys(this.playerInventory).length + 1;
                        const newItem = {
                            ...item,
                            inventory: 'player',
                            amount: 1,
                        };
                        this.playerInventory[newItemKey] = newItem;
                    } else if (matchingItem) {
                        matchingItem.amount++;
                    } else {
                        const newItemKey = Object.keys(this.playerInventory).length + 1;
                        const newItem = {
                            ...item,
                            inventory: 'player',
                            amount: 1,
                        };
                        this.playerInventory[newItemKey] = newItem;
                    }
                    item.amount--;

                    if (item.amount <= 0) {
                        const itemKey = Object.keys(this.otherInventory).find(
                            (key) => this.otherInventory[key] === item
                        );
                        if (itemKey) {
                            delete this.otherInventory[itemKey];
                        }
                    }
                }
                const menuLeft = event.clientX;
                const menuTop = event.clientY;
                this.showContextMenu = true;
                this.contextMenuPosition = {
                    top: `${menuTop}px`,
                    left: `${menuLeft}px`,
                };
                this.contextMenuItem = item;
            }
        },

        attachGridScrollListeners() {
            if (this.scrollBoundElements && this.scrollBoundElements.length) {
                this.scrollBoundElements.forEach((el) => {
                    el.removeEventListener('scroll', this.hideItemInfo);
                    el.removeEventListener('wheel', this.hideItemInfo);
                });
            }
            this.scrollBoundElements = [];

            const grids = document.querySelectorAll('.item-grid');
            grids.forEach((el) => {
                el.addEventListener('scroll', this.hideItemInfo, { passive: true });
                el.addEventListener('wheel', this.hideItemInfo, { passive: true });
                this.scrollBoundElements.push(el);
            });
        },

        detachGridScrollListeners() {
            if (!this.scrollBoundElements) return;
            this.scrollBoundElements.forEach((el) => {
                el.removeEventListener('scroll', this.hideItemInfo);
                el.removeEventListener('wheel', this.hideItemInfo);
            });
            this.scrollBoundElements = [];
        },

        // ============================================
        // GIVE ITEM - FIXED
        // ============================================
        async giveItem(item, quantity) {
            if (item && item.name) {
                const selectedItem = item;
                const playerHasItem = Object.values(this.playerInventory).some(
                    (invItem) => invItem && invItem.name === selectedItem.name
                );

                if (playerHasItem) {
                    let amountToGive;
                    if (typeof quantity === 'string') {
                        switch (quantity) {
                            case 'half':
                                amountToGive = Math.ceil(selectedItem.amount / 2);
                                break;
                            case 'all':
                                amountToGive = selectedItem.amount;
                                break;
                            case 'enteramount':
                                const amountResponse = await axios.post(this.nui('GiveItemAmount'));
                                amountToGive = amountResponse.data;
                                break;
                            default:
                                console.error('Invalid quantity specified.');
                                return;
                        }
                    } else {
                        amountToGive = quantity;
                    }

                    if (amountToGive > selectedItem.amount) {
                        console.error('Specified quantity exceeds available amount.');
                        return;
                    }

                    try {
                        const response = await axios.post(this.nui('GiveItem'), {
                            item: selectedItem,
                            amount: amountToGive,
                            slot: selectedItem.slot,
                            info: selectedItem.info,
                        });
                        if (!response.data) return;

                        this.playerInventory[selectedItem.slot].amount -= amountToGive;
                        if (this.playerInventory[selectedItem.slot].amount === 0) {
                            delete this.playerInventory[selectedItem.slot];
                        }
                    } catch (error) {
                        console.error('An error occurred while giving the item:', error);
                    }
                } else {
                    console.error('Player does not have the item in their inventory.');
                }
            }
            this.showContextMenu = false;
        },

        findNextAvailableSlot(inventory) {
            for (let slot = 1; slot <= this.totalSlots; slot++) {
                if (!inventory[slot]) {
                    return slot;
                }
            }
            return null;
        },

        // ============================================
        // SPLIT AND PLACE ITEM - FIXED
        // ============================================
        async splitAndPlaceItem(item, inventoryType, splitamount = 'half') {
            const inventoryRef = inventoryType === 'player' ? this.playerInventory : this.otherInventory;
            let amount = 1;
            
            if (item && item.amount > 1) {
                if (splitamount === 'half') {
                    amount = Math.ceil(item.amount / 2);
                } else if (splitamount === 'enteramount') {
                    const inputAmount = await axios.post(this.nui('GiveItemAmount'));
                    amount = inputAmount.data;

                    if (amount < 1) {
                        amount = 1;
                    } else if (amount > item.amount) {
                        amount = item.amount;
                    }
                } else if (typeof splitamount === 'number') {
                    amount = splitamount;
                }

                const originalSlot = Object.keys(inventoryRef).find((key) => inventoryRef[key] === item);
                if (originalSlot !== undefined) {
                    const newItem = { ...item, amount: amount };
                    const nextSlot = this.findNextAvailableSlot(inventoryRef);
                    if (nextSlot !== null) {
                        inventoryRef[nextSlot] = newItem;
                        inventoryRef[originalSlot] = { ...item, amount: item.amount - amount };
                        this.postInventoryData(inventoryType, inventoryType, originalSlot, nextSlot, item.amount, newItem.amount);
                    }
                }
            }
            this.showContextMenu = false;
        },

        toggleHotbar(data) {
            if (data.open) {
                this.hotbarItems = data.items;
                this.showHotbar = true;
            } else {
                this.showHotbar = false;
                this.hotbarItems = [];
            }
        },

        showItemNotification(itemData) {
            const item = itemData.item || {};
            const rawType = (itemData.type || '').toLowerCase();
            this.notificationText = item.label || '';
            this.notificationImage = item.image ? 'images/' + item.image : '';
            this.notificationType = rawType === 'add' ? 'Received' : rawType === 'use' ? 'Used' : (rawType === 'drop' || rawType === 'remove') ? 'Removed' : '';
            this.notificationAmount = itemData.amount || 1;
            const desc = item.info?.description || item.description || '';
            this.notificationDescription = typeof desc === 'string' ? desc : '';
            this.showNotification = true;

            if (this.notificationTimeout) {
                clearTimeout(this.notificationTimeout);
            }

            this.notificationTimeout = setTimeout(() => {
                this.showNotification = false;
                this.notificationDescription = '';
                this.notificationTimeout = null;
            }, 3000);
        },

        inventoryError(slot) {
            const slotElement = document.getElementById(`slot-${slot}`);
            if (slotElement) {
                slotElement.style.backgroundColor = 'red';
            }
            axios.post(this.nui('PlayDropFail'), {}).catch((error) => {
                console.error('Error playing drop fail:', error);
            });
            setTimeout(() => {
                if (slotElement) {
                    slotElement.style.backgroundColor = '';
                }
            }, 1000);
        },

        copySerial() {
            if (!this.contextMenuItem) {
                return;
            }
            const item = this.contextMenuItem;
            if (item) {
                const el = document.createElement('textarea');
                el.value = item.info.serie;
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
            }
            this.showContextMenu = false;
        },

        formatKey(key) {
            return key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.slice(1);
        },

        postInventoryData(fromInventory, toInventory, fromSlot, toSlot, fromAmount, toAmount) {
            this.busy = true;
            let fromInventoryName = fromInventory === 'other' ? this.otherInventoryName : fromInventory;
            let toInventoryName = toInventory === 'other' ? this.otherInventoryName : toInventory;

            axios
                .post(this.nui('SetInventoryData'), {
                    fromInventory: fromInventoryName,
                    toInventory: toInventoryName,
                    fromSlot,
                    toSlot,
                    fromAmount,
                    toAmount,
                })
                .then((response) => {
                    this.clearDragData();
                    this.busy = false;
                })
                .catch((error) => {
                    console.error('Error posting inventory data:', error);
                    this.busy = false;
                });
        },
    },

    mounted() {
        window.addEventListener('keyup', (event) => {
            const code = event.code;
            if (code === 'Escape' || code === 'Tab' || code === this.additionalCloseKey) {
                if (this.isInventoryOpen) {
                    this.closeInventory();
                }
            }
        });

        window.addEventListener('message', async (event) => {
            switch (event.data.action) {
                case 'open':
                    let isValid = await this.validateToken(event.data.token);
                    if (isValid) {
                        this.openInventory(event.data);
                    }
                    break;
                case 'close':
                    this.closeInventory();
                    break;
                case 'update':
                    if (await this.validateToken(event.data.token)) {
                        this.updateInventory(event.data);
                        this.$nextTick(() => this.attachGridScrollListeners());
                    }
                    break;
                case 'toggleHotbar':
                    if (await this.validateToken(event.data.token)) {
                        this.toggleHotbar(event.data);
                    }
                    break;
                case 'itemBox':
                    this.showItemNotification(event.data);
                    break;
                case 'updateHotbar':
                    if (await this.validateToken(event.data.token)) {
                        this.hotbarItems = event.data.items;
                    }
                    break;
                default:
                    console.warn(`Unexpected action: ${event.data.action}`);
            }
        });
    },

    beforeUnmount() {
        this.detachGridScrollListeners();
        document.removeEventListener('mousemove', this.handleWindowDrag);
        document.removeEventListener('mouseup', this.endWindowDrag);
    },
});

InventoryContainer.use(FloatingVue);
InventoryContainer.mount('#app');