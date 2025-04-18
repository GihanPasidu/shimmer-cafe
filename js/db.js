/**
 * Database management module for Shimmer Cafe
 * Handles local storage operations and data management
 */
class ShimmerDB {
    constructor() {
        this.storagePrefix = 'shimmer_cafe_';
        this.inventoryKey = this.storagePrefix + 'inventory';
        this.ordersKey = this.storagePrefix + 'orders';
        this.menuKey = this.storagePrefix + 'menu';
        this.settingsKey = this.storagePrefix + 'settings';
        
        // Initialize default data if needed
        this.initializeData();
    }

    /**
     * Initialize default data if storage is empty
     */
    async initializeData() {
        // Initialize inventory data if not present
        if (!localStorage.getItem(this.inventoryKey)) {
            try {
                const response = await fetch('data/inventory.json');
                const inventoryData = await response.json();
                this.saveInventory(inventoryData);
            } catch (error) {
                console.error('Failed to load inventory data:', error);
                // Fallback to empty inventory
                this.saveInventory([]);
            }
        }

        // Initialize settings with defaults if not present
        if (!localStorage.getItem(this.settingsKey)) {
            const defaultSettings = {
                cafeName: 'Shimmer Cafe',
                taxRate: 10,
                theme: 'purple',
                currency: '$',
                dateFormat: 'MM/DD/YYYY',
                lastBackup: null
            };
            this.saveSettings(defaultSettings);
        }

        // Initialize menu items if not present
        if (!localStorage.getItem(this.menuKey)) {
            const defaultMenu = [
                { id: 1, name: 'Espresso', category: 'coffee', price: 3.50, image: 'espresso.jpg' },
                { id: 2, name: 'Cappuccino', category: 'coffee', price: 4.50, image: 'cappuccino.jpg' },
                { id: 3, name: 'Latte', category: 'coffee', price: 4.75, image: 'latte.jpg' },
                { id: 4, name: 'Mocha', category: 'coffee', price: 5.00, image: 'mocha.jpg' },
                { id: 5, name: 'Earl Grey', category: 'tea', price: 3.50, image: 'earl-grey.jpg' },
                { id: 6, name: 'Green Tea', category: 'tea', price: 3.50, image: 'green-tea.jpg' },
                { id: 7, name: 'Croissant', category: 'pastries', price: 3.25, image: 'croissant.jpg' },
                { id: 8, name: 'Chocolate Muffin', category: 'pastries', price: 3.75, image: 'choc-muffin.jpg' },
                { id: 9, name: 'Sandwich', category: 'snacks', price: 6.50, image: 'sandwich.jpg' },
                { id: 10, name: 'Avocado Toast', category: 'snacks', price: 7.50, image: 'avocado-toast.jpg' }
            ];
            this.saveMenu(defaultMenu);
        }

        // Initialize orders array if not present
        if (!localStorage.getItem(this.ordersKey)) {
            this.saveOrders([]);
        }
    }

    // Inventory Management
    getInventory() {
        const data = localStorage.getItem(this.inventoryKey);
        return data ? JSON.parse(data) : [];
    }

    saveInventory(inventory) {
        localStorage.setItem(this.inventoryKey, JSON.stringify(inventory));
    }

    updateInventoryItem(itemId, changes) {
        const inventory = this.getInventory();
        const updatedInventory = inventory.map(item => {
            if (item.id === itemId) {
                return { ...item, ...changes };
            }
            return item;
        });
        this.saveInventory(updatedInventory);
        return updatedInventory;
    }

    // Menu Management
    getMenu() {
        const data = localStorage.getItem(this.menuKey);
        return data ? JSON.parse(data) : [];
    }

    saveMenu(menu) {
        localStorage.setItem(this.menuKey, JSON.stringify(menu));
    }

    getMenuItemsByCategory(category) {
        const menu = this.getMenu();
        return category ? menu.filter(item => item.category === category) : menu;
    }

    // Order Management
    getOrders() {
        const data = localStorage.getItem(this.ordersKey);
        return data ? JSON.parse(data) : [];
    }

    saveOrders(orders) {
        localStorage.setItem(this.ordersKey, JSON.stringify(orders));
    }

    addOrder(order) {
        const orders = this.getOrders();
        // Generate order ID
        const orderId = Date.now().toString();
        const newOrder = { 
            id: orderId, 
            ...order, 
            timestamp: new Date().toISOString() 
        };
        orders.push(newOrder);
        this.saveOrders(orders);
        
        // Update inventory based on order items
        this.updateInventoryFromOrder(order.items);
        
        return newOrder;
    }

    updateInventoryFromOrder(orderItems) {
        const inventory = this.getInventory();
        
        // Map of item consumption rates
        const consumptionRates = {
            'coffee': 0.05, // kg per coffee drink
            'milk': 0.2,    // liters per milk-based drink
            'tea': 1,       // 1 tea bag per tea
        };
        
        // For each order item, reduce relevant inventory
        orderItems.forEach(orderItem => {
            const menuItem = this.getMenuItemById(orderItem.id);
            
            if (menuItem.category === 'coffee') {
                this.reduceInventoryStock('Coffee Beans', consumptionRates.coffee * orderItem.quantity);
                if (menuItem.name !== 'Espresso') { // milk-based coffee
                    this.reduceInventoryStock('Milk', consumptionRates.milk * orderItem.quantity);
                }
            } else if (menuItem.category === 'tea') {
                this.reduceInventoryStock('Tea Bags', consumptionRates.tea * orderItem.quantity);
            }
            // Add other inventory reductions for pastries and snacks
        });
    }
    
    reduceInventoryStock(itemName, amount) {
        const inventory = this.getInventory();
        const itemIndex = inventory.findIndex(item => item.name === itemName);
        
        if (itemIndex !== -1) {
            inventory[itemIndex].stock -= amount;
            // Round to 2 decimal places for display purposes
            inventory[itemIndex].stock = Math.round(inventory[itemIndex].stock * 100) / 100;
            this.saveInventory(inventory);
        }
    }
    
    getMenuItemById(id) {
        const menu = this.getMenu();
        return menu.find(item => item.id === id) || null;
    }

    // Settings Management
    getSettings() {
        const data = localStorage.getItem(this.settingsKey);
        return data ? JSON.parse(data) : {};
    }

    saveSettings(settings) {
        localStorage.setItem(this.settingsKey, JSON.stringify(settings));
    }

    updateSetting(key, value) {
        const settings = this.getSettings();
        settings[key] = value;
        this.saveSettings(settings);
        return settings;
    }

    // Backup and Restore
    createBackup() {
        const backup = {
            inventory: this.getInventory(),
            menu: this.getMenu(),
            orders: this.getOrders(),
            settings: this.getSettings(),
            timestamp: new Date().toISOString()
        };
        
        // Update last backup time
        const settings = this.getSettings();
        settings.lastBackup = backup.timestamp;
        this.saveSettings(settings);
        
        return backup;
    }

    restoreBackup(backupData) {
        try {
            if (backupData.inventory) this.saveInventory(backupData.inventory);
            if (backupData.menu) this.saveMenu(backupData.menu);
            if (backupData.orders) this.saveOrders(backupData.orders);
            if (backupData.settings) this.saveSettings(backupData.settings);
            return true;
        } catch (error) {
            console.error('Failed to restore backup:', error);
            return false;
        }
    }
}

// Initialize the database and make it globally available
const db = new ShimmerDB();
