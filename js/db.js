class ShimmerCafeDB {
    constructor() {
        this.dbName = 'shimmer_cafe_db';
        this.initialize();
    }

    async initialize() {
        // Check if database exists, if not create and populate with sample data
        if (!localStorage.getItem(this.dbName)) {
            // Initialize with default data
            const initialData = {
                menu: [
                    { id: 1, name: 'Espresso', category: 'coffee', price: 2.50, image: 'espresso.jpg' },
                    { id: 2, name: 'Cappuccino', category: 'coffee', price: 3.50, image: 'cappuccino.jpg' },
                    { id: 3, name: 'Latte', category: 'coffee', price: 3.75, image: 'latte.jpg' },
                    { id: 4, name: 'Americano', category: 'coffee', price: 2.75, image: 'americano.jpg' },
                    { id: 5, name: 'Green Tea', category: 'tea', price: 2.25, image: 'green-tea.jpg' },
                    { id: 6, name: 'Earl Grey', category: 'tea', price: 2.25, image: 'earl-grey.jpg' },
                    { id: 7, name: 'Chai Latte', category: 'tea', price: 3.50, image: 'chai-latte.jpg' },
                    { id: 8, name: 'Croissant', category: 'pastries', price: 2.50, image: 'croissant.jpg' },
                    { id: 9, name: 'Chocolate Muffin', category: 'pastries', price: 2.75, image: 'chocolate-muffin.jpg' },
                    { id: 10, name: 'Blueberry Muffin', category: 'pastries', price: 2.75, image: 'blueberry-muffin.jpg' },
                    { id: 11, name: 'Sandwich', category: 'snacks', price: 4.50, image: 'sandwich.jpg' },
                    { id: 12, name: 'Bagel', category: 'snacks', price: 3.50, image: 'bagel.jpg' }
                ],
                inventory: [
                    { id: 1, name: 'Coffee Beans', category: 'ingredients', stock: 5000, unit: 'g', reorderLevel: 1000 },
                    { id: 2, name: 'Milk', category: 'ingredients', stock: 10, unit: 'L', reorderLevel: 2 },
                    { id: 3, name: 'Sugar', category: 'ingredients', stock: 3000, unit: 'g', reorderLevel: 500 },
                    { id: 4, name: 'Tea Bags', category: 'ingredients', stock: 100, unit: 'pcs', reorderLevel: 20 },
                    { id: 5, name: 'Croissants', category: 'bakery', stock: 20, unit: 'pcs', reorderLevel: 5 },
                    { id: 6, name: 'Chocolate Muffins', category: 'bakery', stock: 15, unit: 'pcs', reorderLevel: 5 },
                    { id: 7, name: 'Blueberry Muffins', category: 'bakery', stock: 15, unit: 'pcs', reorderLevel: 5 },
                    { id: 8, name: 'Sandwiches', category: 'food', stock: 10, unit: 'pcs', reorderLevel: 3 },
                    { id: 9, name: 'Bagels', category: 'bakery', stock: 12, unit: 'pcs', reorderLevel: 4 }
                ],
                orders: [],
                settings: {
                    cafeName: 'Shimmer Cafe',
                    taxRate: 10,
                    currency: '$'
                }
            };
            this.saveData(initialData);
        }
    }

    getData() {
        const data = localStorage.getItem(this.dbName);
        return data ? JSON.parse(data) : null;
    }

    saveData(data) {
        localStorage.setItem(this.dbName, JSON.stringify(data));
    }

    getMenu() {
        const data = this.getData();
        return data ? data.menu : [];
    }

    getMenuItemsByCategory(category) {
        const menu = this.getMenu();
        return category === 'all' ? menu : menu.filter(item => item.category === category);
    }

    getMenuItem(id) {
        const menu = this.getMenu();
        return menu.find(item => item.id === id);
    }

    addMenuItem(item) {
        const data = this.getData();
        const menu = data.menu;
        
        // Generate new ID
        const maxId = menu.reduce((max, item) => Math.max(max, item.id), 0);
        item.id = maxId + 1;
        
        menu.push(item);
        this.saveData(data);
        return item;
    }

    updateMenuItem(updatedItem) {
        const data = this.getData();
        const menu = data.menu;
        const index = menu.findIndex(item => item.id === updatedItem.id);
        
        if (index !== -1) {
            menu[index] = updatedItem;
            this.saveData(data);
            return true;
        }
        return false;
    }

    deleteMenuItem(id) {
        const data = this.getData();
        const menu = data.menu;
        const index = menu.findIndex(item => item.id === id);
        
        if (index !== -1) {
            menu.splice(index, 1);
            this.saveData(data);
            return true;
        }
        return false;
    }

    getInventory() {
        const data = this.getData();
        return data ? data.inventory : [];
    }

    getInventoryItem(id) {
        const inventory = this.getInventory();
        return inventory.find(item => item.id === id);
    }

    updateInventoryItem(updatedItem) {
        const data = this.getData();
        const inventory = data.inventory;
        const index = inventory.findIndex(item => item.id === updatedItem.id);
        
        if (index !== -1) {
            inventory[index] = updatedItem;
            this.saveData(data);
            return true;
        }
        return false;
    }

    addInventoryItem(item) {
        const data = this.getData();
        const inventory = data.inventory;
        
        // Generate new ID
        const maxId = inventory.reduce((max, item) => Math.max(max, item.id), 0);
        item.id = maxId + 1;
        
        inventory.push(item);
        this.saveData(data);
        return item;
    }

    deleteInventoryItem(id) {
        const data = this.getData();
        const inventory = data.inventory;
        const index = inventory.findIndex(item => item.id === id);
        
        if (index !== -1) {
            inventory.splice(index, 1);
            this.saveData(data);
            return true;
        }
        return false;
    }

    createOrder(orderItems, subtotal, tax, total, paymentMethod) {
        const data = this.getData();
        const orders = data.orders;
        
        const order = {
            id: Date.now(), // Using timestamp as unique ID
            date: new Date(),
            items: orderItems,
            subtotal,
            tax,
            total,
            paymentMethod
        };
        
        orders.push(order);
        this.saveData(data);
        
        // Update inventory
        orderItems.forEach(item => {
            // Logic to update inventory based on order
            // This is simplified; in a real system would need to map menu items to inventory items
            const menuItem = this.getMenuItem(item.id);
            if (menuItem && menuItem.category === 'pastries' || menuItem.category === 'snacks') {
                const inventoryItem = this.getInventory().find(
                    invItem => invItem.name.toLowerCase().includes(menuItem.name.toLowerCase())
                );
                
                if (inventoryItem) {
                    inventoryItem.stock -= item.quantity;
                    this.updateInventoryItem(inventoryItem);
                }
            }
        });
        
        return order;
    }

    getOrders(startDate = null, endDate = null) {
        const data = this.getData();
        let orders = data ? data.orders : [];
        
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            orders = orders.filter(order => {
                const orderDate = new Date(order.date);
                return orderDate >= start && orderDate <= end;
            });
        }
        
        return orders;
    }

    getDailySales(date) {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        return this.getOrders(targetDate, nextDay);
    }

    getWeeklySales(startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        
        return this.getOrders(start, end);
    }

    getMonthlySales(year, month) {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        end.setHours(23, 59, 59, 999);
        
        return this.getOrders(start, end);
    }

    getPopularItems(startDate = null, endDate = null) {
        const orders = this.getOrders(startDate, endDate);
        const itemCounts = {};
        
        orders.forEach(order => {
            order.items.forEach(item => {
                if (!itemCounts[item.id]) {
                    itemCounts[item.id] = 0;
                }
                itemCounts[item.id] += item.quantity;
            });
        });
        
        // Convert to array for sorting
        const popularItems = Object.entries(itemCounts).map(([id, count]) => {
            const menuItem = this.getMenuItem(parseInt(id));
            return {
                id: parseInt(id),
                name: menuItem ? menuItem.name : 'Unknown Item',
                count
            };
        });
        
        // Sort by count in descending order
        return popularItems.sort((a, b) => b.count - a.count);
    }

    getSettings() {
        const data = this.getData();
        return data ? data.settings : null;
    }

    updateSettings(updatedSettings) {
        const data = this.getData();
        data.settings = updatedSettings;
        this.saveData(data);
        return true;
    }

    exportData() {
        return this.getData();
    }

    importData(data) {
        try {
            // Basic validation
            if (!data.menu || !data.inventory || !data.orders || !data.settings) {
                throw new Error('Invalid data format');
            }
            
            this.saveData(data);
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
}

// Initialize the database
const db = new ShimmerCafeDB();
