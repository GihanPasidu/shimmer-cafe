/**
 * Shimmer Cafe - Database Module
 * Handles all data storage, retrieval and manipulation
 */

const db = (function() {
    // Private variables
    const DATA_FOLDER = 'data';
    let settings = null;
    let menuItems = [];
    let inventory = [];
    let orders = [];
    
    // Check if running in a browser environment
    const isBrowser = typeof window !== 'undefined';
    
    /**
     * Save data to JSON/localStorage
     * @param {string} filename - The name of the file to save to
     * @param {object} data - The data to save
     */
    const saveToJSON = function(filename, data) {
        if (!isBrowser) return; // Only run in browser
        
        try {
            localStorage.setItem(`shimmer_${filename}`, JSON.stringify(data));
            console.log(`Data saved to ${filename}`);
            
            // In a real application with backend, we would save to actual JSON files
            if (window.DEBUG_MODE) {
                console.log(`Data that would be saved to ${DATA_FOLDER}/${filename}:`, data);
            }
        } catch (error) {
            console.error(`Error saving to ${filename}:`, error);
            toastr.error(`Failed to save data: ${error.message}`);
        }
    };
    
    /**
     * Load data from JSON/localStorage
     * @param {string} filename - The name of the file to load from
     * @param {*} defaultValue - Default value if file doesn't exist
     * @returns {*} The loaded data or default value
     */
    const loadFromJSON = function(filename, defaultValue = null) {
        if (!isBrowser) return defaultValue;
        
        try {
            const data = localStorage.getItem(`shimmer_${filename}`);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error(`Error loading from ${filename}:`, error);
            toastr.error(`Failed to load data: ${error.message}`);
            return defaultValue;
        }
    };
    
    /**
     * Initialize the database with data
     */
    const init = function() {
        if (settings === null) {
            settings = loadFromJSON('settings.json', {
                cafeName: 'Shimmer Cafe',
                taxRate: 10,
                currency: '$',
                theme: 'purple',
                animations: true,
                version: '1.0.0',
                lastUpdated: new Date().toISOString()
            });
        }
        
        menuItems = loadFromJSON('menuItems.json', []);
        if (menuItems.length === 0) {
            // Initialize with sample data
            menuItems = getSampleMenuItems();
            saveToJSON('menuItems.json', menuItems);
        }
        
        inventory = loadFromJSON('inventory.json', []);
        if (inventory.length === 0) {
            // Initialize with sample data
            inventory = getSampleInventory();
            saveToJSON('inventory.json', inventory);
        }
        
        orders = loadFromJSON('orders.json', []);
        if (orders.length === 0) {
            // Initialize with sample data
            orders = getSampleOrders();
            saveToJSON('orders.json', orders);
        }
    };
    
    /**
     * Generate sample menu items
     * @returns {Array} Sample menu items
     */
    const getSampleMenuItems = function() {
        return [
            {
                id: 1,
                name: 'Cappuccino',
                category: 'coffee',
                price: 4.99,
                image: 'cappuccino.jpg',
                description: 'Rich espresso with steamed milk and foam',
                ingredients: ['espresso', 'steamed milk', 'milk foam'],
                popular: true
            },
            {
                id: 2,
                name: 'Latte',
                category: 'coffee',
                price: 4.50,
                image: 'latte.jpg',
                description: 'Smooth espresso with velvety steamed milk',
                ingredients: ['espresso', 'steamed milk'],
                popular: true
            },
            {
                id: 3,
                name: 'Espresso',
                category: 'coffee',
                price: 3.50,
                image: 'espresso.jpg',
                description: 'Pure, intense coffee experience in a small cup',
                ingredients: ['espresso'],
                popular: false
            },
            {
                id: 4,
                name: 'Green Tea',
                category: 'tea',
                price: 3.99,
                image: 'green-tea.jpg',
                description: 'Delicate tea with antioxidant properties',
                ingredients: ['green tea leaves', 'hot water'],
                popular: true
            },
            {
                id: 5,
                name: 'Earl Grey',
                category: 'tea',
                price: 3.99,
                image: 'earl-grey.jpg',
                description: 'Classic black tea infused with bergamot oil',
                ingredients: ['black tea', 'bergamot'],
                popular: false
            },
            {
                id: 6,
                name: 'Croissant',
                category: 'pastries',
                price: 3.50,
                image: 'croissant.jpg',
                description: 'Buttery, flaky French pastry',
                ingredients: ['flour', 'butter', 'yeast'],
                popular: true
            },
            {
                id: 7,
                name: 'Chocolate Muffin',
                category: 'pastries',
                price: 3.99,
                image: 'choc-muffin.jpg',
                description: 'Rich chocolate muffin with chocolate chips',
                ingredients: ['flour', 'chocolate', 'sugar', 'eggs'],
                popular: true
            },
            {
                id: 8,
                name: 'Ham Sandwich',
                category: 'snacks',
                price: 5.99,
                image: 'ham-sandwich.jpg',
                description: 'Classic ham sandwich with fresh vegetables',
                ingredients: ['bread', 'ham', 'lettuce', 'tomato'],
                popular: false
            },
            {
                id: 9,
                name: 'Chicken Wrap',
                category: 'snacks',
                price: 6.99,
                image: 'chicken-wrap.jpg',
                description: 'Grilled chicken wrap with fresh vegetables',
                ingredients: ['tortilla', 'chicken', 'lettuce', 'sauce'],
                popular: true
            }
        ];
    };
    
    /**
     * Generate sample inventory items
     * @returns {Array} Sample inventory items
     */
    const getSampleInventory = function() {
        return [
            {
                id: 1,
                name: 'Coffee Beans',
                category: 'ingredients',
                stock: 25,
                unit: 'kg',
                reorderLevel: 5,
                supplier: 'Premium Coffee Co.',
                costPerUnit: 15.50
            },
            {
                id: 2,
                name: 'Milk',
                category: 'ingredients',
                stock: 35,
                unit: 'liters',
                reorderLevel: 10,
                supplier: 'Local Dairy Farm',
                costPerUnit: 2.25
            },
            {
                id: 3,
                name: 'Tea Bags',
                category: 'ingredients',
                stock: 150,
                unit: 'boxes',
                reorderLevel: 20,
                supplier: 'Fine Tea Importers',
                costPerUnit: 5.75
            },
            {
                id: 4,
                name: 'Flour',
                category: 'baking',
                stock: 45,
                unit: 'kg',
                reorderLevel: 10,
                supplier: 'Baker\'s Supply Co.',
                costPerUnit: 1.20
            },
            {
                id: 5,
                name: 'Sugar',
                category: 'baking',
                stock: 30,
                unit: 'kg',
                reorderLevel: 8,
                supplier: 'Sweet Supplies Inc.',
                costPerUnit: 0.95
            },
            {
                id: 6,
                name: 'Cups (8oz)',
                category: 'supplies',
                stock: 500,
                unit: 'pieces',
                reorderLevel: 100,
                supplier: 'Cafe Essentials',
                costPerUnit: 0.15
            },
            {
                id: 7,
                name: 'Cups (12oz)',
                category: 'supplies',
                stock: 350,
                unit: 'pieces',
                reorderLevel: 75,
                supplier: 'Cafe Essentials',
                costPerUnit: 0.20
            },
            {
                id: 8,
                name: 'Napkins',
                category: 'supplies',
                stock: 800,
                unit: 'pieces',
                reorderLevel: 150,
                supplier: 'Cafe Essentials',
                costPerUnit: 0.05
            }
        ];
    };
    
    /**
     * Generate sample orders
     * @returns {Array} Sample orders
     */
    const getSampleOrders = function() {
        return [
            {
                id: 1,
                items: [
                    {
                        id: 1,
                        name: 'Cappuccino',
                        price: 4.99,
                        quantity: 2
                    },
                    {
                        id: 6,
                        name: 'Croissant',
                        price: 3.50,
                        quantity: 1
                    }
                ],
                subtotal: 13.48,
                tax: 1.35,
                total: 14.83,
                paymentMethod: 'card',
                date: '2023-09-15T09:23:18.452Z',
                status: 'completed'
            },
            {
                id: 2,
                items: [
                    {
                        id: 2,
                        name: 'Latte',
                        price: 4.50,
                        quantity: 1
                    },
                    {
                        id: 7,
                        name: 'Chocolate Muffin',
                        price: 3.99,
                        quantity: 2
                    }
                ],
                subtotal: 12.48,
                tax: 1.25,
                total: 13.73,
                paymentMethod: 'cash',
                date: '2023-09-15T10:45:22.452Z',
                status: 'completed'
            }
        ];
    };
    
    // Public API
    return {
        init: init,
        
        // Settings
        getSettings: function() {
            if (settings === null) init();
            return settings;
        },
        
        updateSettings: function(newSettings) {
            settings = { ...settings, ...newSettings, lastUpdated: new Date().toISOString() };
            saveToJSON('settings.json', settings);
            return settings;
        },
        
        // Menu Items
        getMenuItems: function() {
            if (menuItems.length === 0) init();
            return menuItems;
        },
        
        getMenuItemsByCategory: function(category) {
            if (menuItems.length === 0) init();
            return menuItems.filter(item => item.category === category);
        },
        
        getMenuItem: function(id) {
            if (menuItems.length === 0) init();
            return menuItems.find(item => item.id === parseInt(id)) || null;
        },
        
        getPopularMenuItems: function() {
            if (menuItems.length === 0) init();
            return menuItems.filter(item => item.popular);
        },
        
        addMenuItem: function(item) {
            if (menuItems.length === 0) init();
            const newId = menuItems.length > 0 ? Math.max(...menuItems.map(i => i.id)) + 1 : 1;
            const newItem = { ...item, id: newId };
            menuItems.push(newItem);
            saveToJSON('menuItems.json', menuItems);
            return newItem;
        },
        
        updateMenuItem: function(id, itemData) {
            if (menuItems.length === 0) init();
            const index = menuItems.findIndex(item => item.id === parseInt(id));
            if (index !== -1) {
                menuItems[index] = { ...menuItems[index], ...itemData };
                saveToJSON('menuItems.json', menuItems);
                return menuItems[index];
            }
            return null;
        },
        
        deleteMenuItem: function(id) {
            if (menuItems.length === 0) init();
            const index = menuItems.findIndex(item => item.id === parseInt(id));
            if (index !== -1) {
                menuItems.splice(index, 1);
                saveToJSON('menuItems.json', menuItems);
                return true;
            }
            return false;
        },
        
        // Inventory
        getInventory: function() {
            if (inventory.length === 0) init();
            return inventory;
        },
        
        getLowStockItems: function() {
            if (inventory.length === 0) init();
            return inventory.filter(item => item.stock <= item.reorderLevel);
        },
        
        getInventoryItem: function(id) {
            if (inventory.length === 0) init();
            return inventory.find(item => item.id === parseInt(id)) || null;
        },
        
        addInventoryItem: function(item) {
            if (inventory.length === 0) init();
            const newId = inventory.length > 0 ? Math.max(...inventory.map(i => i.id)) + 1 : 1;
            const newItem = { ...item, id: newId };
            inventory.push(newItem);
            saveToJSON('inventory.json', inventory);
            return newItem;
        },
        
        updateInventoryItem: function(id, itemData) {
            if (inventory.length === 0) init();
            const index = inventory.findIndex(item => item.id === parseInt(id));
            if (index !== -1) {
                inventory[index] = { ...inventory[index], ...itemData };
                saveToJSON('inventory.json', inventory);
                return inventory[index];
            }
            return null;
        },
        
        deleteInventoryItem: function(id) {
            if (inventory.length === 0) init();
            const index = inventory.findIndex(item => item.id === parseInt(id));
            if (index !== -1) {
                inventory.splice(index, 1);
                saveToJSON('inventory.json', inventory);
                return true;
            }
            return false;
        },
        
        // Orders
        getOrders: function() {
            if (orders.length === 0) init();
            return orders;
        },
        
        createOrder: function(items, subtotal, tax, total, paymentMethod) {
            if (orders.length === 0) init();
            const newId = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1;
            const newOrder = {
                id: newId,
                items: items,
                subtotal: subtotal,
                tax: tax,
                total: total,
                paymentMethod: paymentMethod,
                date: new Date().toISOString(),
                status: 'completed'
            };
            orders.push(newOrder);
            saveToJSON('orders.json', orders);
            
            // Update inventory (decrease stock)
            this.updateInventoryFromOrder(newOrder);
            
            return newOrder;
        },
        
        updateInventoryFromOrder: function(order) {
            // This is a simplified mapping between menu items and inventory
            order.items.forEach(item => {
                const menuItem = this.getMenuItem(item.id);
                if (menuItem && menuItem.ingredients) {
                    menuItem.ingredients.forEach(ing => {
                        const inventoryItem = inventory.find(invItem => 
                            invItem.name.toLowerCase().includes(ing.toLowerCase()));
                        
                        if (inventoryItem) {
                            inventoryItem.stock = Math.max(0, inventoryItem.stock - (item.quantity * 0.1));
                        }
                    });
                }
            });
            saveToJSON('inventory.json', inventory);
        },
        
        getDailySales: function(date) {
            if (orders.length === 0) init();
            
            const targetDate = new Date(date);
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            return orders.filter(order => {
                const orderDate = new Date(order.date);
                return orderDate >= startOfDay && orderDate <= endOfDay;
            });
        },
        
        getWeeklySales: function(date) {
            if (orders.length === 0) init();
            
            const targetDate = new Date(date);
            const day = targetDate.getDay(); // 0 = Sunday, 6 = Saturday
            
            // Calculate start of week (Sunday)
            const startOfWeek = new Date(targetDate);
            startOfWeek.setDate(targetDate.getDate() - day);
            startOfWeek.setHours(0, 0, 0, 0);
            
            // Calculate end of week (Saturday)
            const endOfWeek = new Date(targetDate);
            endOfWeek.setDate(targetDate.getDate() + (6 - day));
            endOfWeek.setHours(23, 59, 59, 999);
            
            return orders.filter(order => {
                const orderDate = new Date(order.date);
                return orderDate >= startOfWeek && orderDate <= endOfWeek;
            });
        },
        
        getMonthlySales: function(date) {
            if (orders.length === 0) init();
            
            const targetDate = new Date(date);
            const year = targetDate.getFullYear();
            const month = targetDate.getMonth();
            
            const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
            const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
            
            return orders.filter(order => {
                const orderDate = new Date(order.date);
                return orderDate >= startOfMonth && orderDate <= endOfMonth;
            });
        },
        
        getPopularItems: function() {
            if (orders.length === 0) init();
            
            const itemCounts = {};
            
            orders.forEach(order => {
                order.items.forEach(item => {
                    if (!itemCounts[item.id]) {
                        itemCounts[item.id] = {
                            id: item.id,
                            name: item.name,
                            count: 0,
                            revenue: 0
                        };
                    }
                    itemCounts[item.id].count += item.quantity;
                    itemCounts[item.id].revenue += item.price * item.quantity;
                });
            });
            
            return Object.values(itemCounts).sort((a, b) => b.count - a.count);
        },
        
        // Data Export/Import
        exportData: function() {
            const data = {
                settings: settings,
                menuItems: menuItems,
                inventory: inventory,
                orders: orders,
                exportDate: new Date().toISOString(),
                appVersion: "1.0.0"
            };
            
            return JSON.stringify(data, null, 2);
        },
        
        importData: function(jsonData) {
            try {
                const data = JSON.parse(jsonData);
                
                if (data.settings) {
                    settings = data.settings;
                    saveToJSON('settings.json', settings);
                }
                
                if (data.menuItems) {
                    menuItems = data.menuItems;
                    saveToJSON('menuItems.json', menuItems);
                }
                
                if (data.inventory) {
                    inventory = data.inventory;
                    saveToJSON('inventory.json', inventory);
                }
                
                if (data.orders) {
                    orders = data.orders;
                    saveToJSON('orders.json', orders);
                }
                
                return true;
            } catch (error) {
                console.error('Error importing data:', error);
                return false;
            }
        },
        
        // File Handling
        downloadJSONFile: function(filename, data) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },
        
        backupData: function() {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            this.downloadJSONFile(`shimmer-cafe-backup-${timestamp}.json`, {
                settings: settings,
                menuItems: menuItems,
                inventory: inventory,
                orders: orders,
                exportDate: new Date().toISOString(),
                appVersion: "1.0.0"
            });
        }
    };
})();

// Initialize the database on page load
document.addEventListener('DOMContentLoaded', function() {
    window.DEBUG_MODE = false; // Set to true for debug logging
    db.init();
});
