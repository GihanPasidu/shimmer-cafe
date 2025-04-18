/**
 * Database handler for Shimmer Cafe
 * Manages all data operations and storage
 */

class CafeDatabase {
    constructor() {
        this.settings = null;
        this.menuItems = null;
        this.inventory = null;
        this.orders = null;
        this.initialized = false;
    }

    // Initialize database by loading all data files
    async init() {
        try {
            // Load all data in parallel
            const [settings, menuItems, inventory, orders] = await Promise.all([
                this.fetchData('data/settings.json'),
                this.fetchData('data/menuItems.json'),
                this.fetchData('data/inventory.json'),
                this.fetchData('data/orders.json')
            ]);

            this.settings = settings;
            this.menuItems = menuItems;
            this.inventory = inventory;
            this.orders = orders;
            this.initialized = true;
            
            console.log('Database initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize database:', error);
            return false;
        }
    }

    // Helper method to fetch JSON data
    async fetchData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching ${url}:`, error);
            // Return empty array/object as fallback
            return url.includes('settings') ? {} : [];
        }
    }

    // Get all menu items or filter by category
    getMenuItems(category = null) {
        if (!category) {
            return this.menuItems;
        }
        return this.menuItems.filter(item => item.category === category);
    }

    // Get inventory items
    getInventory() {
        return this.inventory;
    }

    // Get settings
    getSettings() {
        return this.settings;
    }

    // Get orders with optional filtering
    getOrders(filter = null) {
        if (!filter) {
            return this.orders;
        }
        
        // Apply filters based on date, status, etc.
        if (filter.date) {
            const filterDate = new Date(filter.date).setHours(0, 0, 0, 0);
            return this.orders.filter(order => {
                const orderDate = new Date(order.date).setHours(0, 0, 0, 0);
                return orderDate === filterDate;
            });
        }
        
        if (filter.status) {
            return this.orders.filter(order => order.status === filter.status);
        }
        
        return this.orders;
    }

    // Create a new order
    createOrder(orderData) {
        // Generate new ID
        const newId = this.orders.length > 0 
            ? Math.max(...this.orders.map(o => o.id)) + 1 
            : 1;
        
        // Create order with timestamp
        const order = {
            id: newId,
            ...orderData,
            date: new Date().toISOString(),
            status: 'completed'
        };
        
        this.orders.push(order);
        
        // In a real application, this would save to the server
        // For this demo, we're just updating the in-memory object
        console.log('Order created:', order);
        
        return order;
    }

    // Update settings
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // In a real application, this would save to the server
        console.log('Settings updated:', this.settings);
        
        return this.settings;
    }

    // Update inventory item
    updateInventoryItem(id, updates) {
        const index = this.inventory.findIndex(item => item.id === id);
        if (index === -1) return null;
        
        this.inventory[index] = { ...this.inventory[index], ...updates };
        
        // In a real application, this would save to the server
        console.log('Inventory updated:', this.inventory[index]);
        
        return this.inventory[index];
    }

    // Generate backup of all data
    generateBackup() {
        return {
            settings: this.settings,
            menuItems: this.menuItems,
            inventory: this.inventory,
            orders: this.orders,
            timestamp: new Date().toISOString()
        };
    }

    // Restore from backup
    restoreFromBackup(backupData) {
        if (!backupData) return false;
        
        this.settings = backupData.settings || this.settings;
        this.menuItems = backupData.menuItems || this.menuItems;
        this.inventory = backupData.inventory || this.inventory;
        this.orders = backupData.orders || this.orders;
        
        return true;
    }
}

// Create and export a singleton instance
const db = new CafeDatabase();
window.cafeDb = db; // Make available globally for debugging
