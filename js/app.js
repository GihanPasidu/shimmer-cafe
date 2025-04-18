/**
 * Main application for Shimmer Cafe
 * Handles UI interactions and business logic
 */

// Initialize toastr notification settings
toastr.options = {
    closeButton: true,
    progressBar: true,
    positionClass: "toast-bottom-right",
    timeOut: 3000
};

// Application class
class CafeApp {
    constructor() {
        this.currentPage = 'pos';
        this.currentOrder = {
            items: [],
            subtotal: 0,
            tax: 0,
            total: 0
        };
        this.modalActive = false;
        this.activeCategoryTab = 'coffee';
    }

    // Initialize the application
    async init() {
        // Initialize database first
        const dbInitialized = await db.init();
        if (!dbInitialized) {
            Swal.fire({
                icon: 'error',
                title: 'Database Error',
                text: 'Failed to initialize the database. Please refresh or contact support.',
                confirmButtonText: 'Refresh',
            }).then(() => {
                window.location.reload();
            });
            return;
        }

        // Apply theme from settings
        this.applyTheme(db.getSettings().theme);

        // Set up navigation
        this.setupNavigation();

        // Load initial page (POS)
        this.loadPage('pos');

        // Register global event handlers
        this.setupEventListeners();

        // Log initialization
        console.log('Shimmer Cafe application initialized');
    }

    // Apply theme from settings
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme || 'purple');
    }

    // Set up navigation event listeners
    setupNavigation() {
        const navLinks = document.querySelectorAll('nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.loadPage(page);
                
                // Update active navigation
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

    // Load page content
    loadPage(page) {
        this.currentPage = page;
        const mainContent = document.getElementById('main-content');
        
        // Clear previous content with animation
        mainContent.classList.remove('animate__fadeIn');
        void mainContent.offsetWidth; // Trigger reflow
        mainContent.classList.add('animate__fadeIn');
        
        // Load template for the selected page
        const template = document.getElementById(`${page}-template`);
        mainContent.innerHTML = template.innerHTML;
        
        // Initialize the appropriate page
        switch (page) {
            case 'pos':
                this.initPosPage();
                break;
            case 'inventory':
                this.initInventoryPage();
                break;
            case 'reports':
                this.initReportsPage();
                break;
            case 'settings':
                this.initSettingsPage();
                break;
        }
    }

    // Initialize POS page
    initPosPage() {
        // Load menu items for the active category
        this.loadMenuItems(this.activeCategoryTab);
        
        // Set up category tabs
        const categoryTabs = document.querySelectorAll('.category-tab');
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                categoryTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeCategoryTab = tab.getAttribute('data-category');
                this.loadMenuItems(this.activeCategoryTab);
            });
        });
        
        // Set up order actions
        document.getElementById('clear-order').addEventListener('click', () => this.clearOrder());
        document.getElementById('process-payment').addEventListener('click', () => this.showPaymentModal());
    }

    // Load menu items for selected category
    loadMenuItems(category) {
        const menuItems = db.getMenuItems(category);
        const menuContainer = document.querySelector('.menu-items');
        menuContainer.innerHTML = '';
        
        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'menu-item ripple';
            menuItem.innerHTML = `
                <img src="images/menu/${item.image}" alt="${item.name}">
                <div class="item-details">
                    <h3>${item.name}</h3>
                    <p class="price">$${item.price.toFixed(2)}</p>
                </div>
            `;
            menuItem.addEventListener('click', () => this.addToOrder(item));
            menuContainer.appendChild(menuItem);
        });
    }

    // Add item to current order
    addToOrder(item) {
        // Check if item already exists
        const existingItem = this.currentOrder.items.find(i => i.id === item.id);
        
        if (existingItem) {
            // Update quantity
            existingItem.quantity += 1;
        } else {
            // Add new item
            this.currentOrder.items.push({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: 1
            });
        }
        
        // Update order display
        this.updateOrderDisplay();
        
        // Show notification
        toastr.success(`Added ${item.name} to order`);
    }

    // Update order display
    updateOrderDisplay() {
        const orderItemsContainer = document.querySelector('.order-items');
        orderItemsContainer.innerHTML = '';
        
        if (this.currentOrder.items.length === 0) {
            orderItemsContainer.innerHTML = '<p class="empty-order">No items in order</p>';
            this.updateOrderSummary(0, 0, 0);
            return;
        }
        
        let subtotal = 0;
        
        // Add each item to the display
        this.currentOrder.items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            
            const orderItem = document.createElement('div');
            orderItem.className = 'order-item';
            orderItem.innerHTML = `
                <div class="item-info">
                    <span class="name">${item.name}</span>
                    <span class="price">$${item.price.toFixed(2)} × ${item.quantity}</span>
                </div>
                <div class="item-total">$${itemTotal.toFixed(2)}</div>
                <div class="item-actions">
                    <button class="btn-circle decrease-item" data-id="${item.id}">-</button>
                    <button class="btn-circle remove-item" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                    <button class="btn-circle increase-item" data-id="${item.id}">+</button>
                </div>
            `;
            orderItemsContainer.appendChild(orderItem);
        });
        
        // Add event listeners for item actions
        orderItemsContainer.querySelectorAll('.decrease-item').forEach(btn => {
            btn.addEventListener('click', () => this.decreaseItemQuantity(parseInt(btn.getAttribute('data-id'))));
        });
        
        orderItemsContainer.querySelectorAll('.increase-item').forEach(btn => {
            btn.addEventListener('click', () => this.increaseItemQuantity(parseInt(btn.getAttribute('data-id'))));
        });
        
        orderItemsContainer.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', () => this.removeOrderItem(parseInt(btn.getAttribute('data-id'))));
        });
        
        // Calculate tax and total
        const taxRate = db.getSettings().taxRate || 10;
        const tax = subtotal * (taxRate / 100);
        const total = subtotal + tax;
        
        // Update summary
        this.updateOrderSummary(subtotal, tax, total);
    }

    // Update the order summary
    updateOrderSummary(subtotal, tax, total) {
        document.getElementById('subtotal').textContent = subtotal.toFixed(2);
        document.getElementById('tax').textContent = tax.toFixed(2);
        document.getElementById('total').textContent = total.toFixed(2);
        
        // Update the current order object
        this.currentOrder.subtotal = subtotal;
        this.currentOrder.tax = tax;
        this.currentOrder.total = total;
        
        // Disable/enable payment button
        const processPaymentBtn = document.getElementById('process-payment');
        if (this.currentOrder.items.length === 0) {
            processPaymentBtn.disabled = true;
            processPaymentBtn.classList.add('disabled');
        } else {
            processPaymentBtn.disabled = false;
            processPaymentBtn.classList.remove('disabled');
        }
    }

    // Decrease item quantity
    decreaseItemQuantity(itemId) {
        const item = this.currentOrder.items.find(i => i.id === itemId);
        if (item && item.quantity > 1) {
            item.quantity -= 1;
            this.updateOrderDisplay();
        } else if (item && item.quantity === 1) {
            this.removeOrderItem(itemId);
        }
    }

    // Increase item quantity
    increaseItemQuantity(itemId) {
        const item = this.currentOrder.items.find(i => i.id === itemId);
        if (item) {
            item.quantity += 1;
            this.updateOrderDisplay();
        }
    }

    // Remove item from order
    removeOrderItem(itemId) {
        this.currentOrder.items = this.currentOrder.items.filter(i => i.id !== itemId);
        this.updateOrderDisplay();
    }

    // Clear entire order
    clearOrder() {
        if (this.currentOrder.items.length === 0) return;
        
        Swal.fire({
            title: 'Clear Order',
            text: 'Are you sure you want to clear the current order?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, clear it',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.currentOrder.items = [];
                this.updateOrderDisplay();
                toastr.info('Order has been cleared');
            }
        });
    }

    // Show payment modal
    showPaymentModal() {
        if (this.currentOrder.items.length === 0) return;
        
        // Create modal backdrop
        const modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'modal-backdrop';
        document.body.appendChild(modalBackdrop);
        
        // Create modal container
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-container';
        
        // Add content from template
        const modalTemplate = document.getElementById('payment-modal-template');
        modalContainer.innerHTML = modalTemplate.innerHTML;
        document.body.appendChild(modalContainer);
        
        // Set total amount
        document.getElementById('payment-amount').textContent = this.currentOrder.total.toFixed(2);
        
        // Setup payment method buttons
        const paymentButtons = modalContainer.querySelectorAll('.btn-payment');
        paymentButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const method = btn.getAttribute('data-method');
                paymentButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                if (method === 'cash') {
                    document.getElementById('cash-input').classList.remove('hidden');
                    document.getElementById('cash-amount').focus();
                } else {
                    document.getElementById('cash-input').classList.add('hidden');
                }
            });
        });
        
        // Setup cash amount input
        const cashInput = document.getElementById('cash-amount');
        cashInput.addEventListener('input', () => {
            const cashAmount = parseFloat(cashInput.value) || 0;
            const change = cashAmount - this.currentOrder.total;
            document.getElementById('change').textContent = change >= 0 ? change.toFixed(2) : '0.00';
        });
        
        // Setup action buttons
        document.getElementById('cancel-payment').addEventListener('click', () => {
            this.closeModal(modalContainer, modalBackdrop);
        });
        
        document.getElementById('complete-payment').addEventListener('click', () => {
            this.processOrder(modalContainer, modalBackdrop);
        });
        
        // Close on backdrop click
        modalBackdrop.addEventListener('click', () => {
            this.closeModal(modalContainer, modalBackdrop);
        });
        
        // Set modal active state
        this.modalActive = true;
    }

    // Close modal
    closeModal(modalContainer, modalBackdrop) {
        modalContainer.classList.add('animate__fadeOutUp');
        modalBackdrop.classList.add('fade-out');
        
        setTimeout(() => {
            document.body.removeChild(modalContainer);
            document.body.removeChild(modalBackdrop);
            this.modalActive = false;
        }, 300);
    }

    // Process order and complete payment
    processOrder(modalContainer, modalBackdrop) {
        const activeMethod = modalContainer.querySelector('.btn-payment.active');
        if (!activeMethod) {
            toastr.error('Please select a payment method');
            return;
        }
        
        const paymentMethod = activeMethod.getAttribute('data-method');
        
        // For cash payments, validate amount
        if (paymentMethod === 'cash') {
            const cashAmount = parseFloat(document.getElementById('cash-amount').value) || 0;
            if (cashAmount < this.currentOrder.total) {
                toastr.error('Insufficient cash amount');
                return;
            }
        }
        
        // Create order in database
        const orderData = {
            items: [...this.currentOrder.items],
            subtotal: this.currentOrder.subtotal,
            tax: this.currentOrder.tax,
            total: this.currentOrder.total,
            paymentMethod: paymentMethod
        };
        
        const order = db.createOrder(orderData);
        
        // Close modal
        this.closeModal(modalContainer, modalBackdrop);
        
        // Show success message
        Swal.fire({
            icon: 'success',
            title: 'Order Completed',
            text: `Order #${order.id} has been processed successfully`,
            confirmButtonText: 'Print Receipt',
            showCancelButton: true,
            cancelButtonText: 'Close'
        }).then((result) => {
            if (result.isConfirmed) {
                this.printReceipt(order);
            }
            // Clear the order
            this.currentOrder.items = [];
            this.updateOrderDisplay();
        });
    }

    // Print receipt (simulated)
    printReceipt(order) {
        console.log('Printing receipt for order:', order);
        toastr.info('Receipt sent to printer');
    }

    // Initialize inventory page
    initInventoryPage() {
        this.loadInventory();
        
        // Setup add item button
        document.getElementById('add-item').addEventListener('click', () => {
            this.showAddItemModal();
        });
        
        // Setup update stock button
        document.getElementById('update-stock').addEventListener('click', () => {
            this.showUpdateStockModal();
        });
    }

    // Load inventory items
    loadInventory() {
        const inventory = db.getInventory();
        const inventoryList = document.getElementById('inventory-list');
        inventoryList.innerHTML = '';
        
        inventory.forEach(item => {
            const row = document.createElement('tr');
            
            // Highlight low stock items
            if (item.stock <= item.reorderLevel) {
                row.classList.add('low-stock');
            }
            
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.stock} ${item.unit}</td>
                <td>${item.reorderLevel} ${item.unit}</td>
                <td>
                    <button class="btn-icon edit-item" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon update-stock-item" data-id="${item.id}"><i class="fas fa-plus-minus"></i></button>
                </td>
            `;
            inventoryList.appendChild(row);
        });
        
        // Add event listeners for item actions
        inventoryList.querySelectorAll('.edit-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = parseInt(btn.getAttribute('data-id'));
                this.editInventoryItem(itemId);
            });
        });
        
        inventoryList.querySelectorAll('.update-stock-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = parseInt(btn.getAttribute('data-id'));
                this.updateStockItem(itemId);
            });
        });
    }

    // Show add item modal (simulated)
    showAddItemModal() {
        Swal.fire({
            title: 'Add Inventory Item',
            text: 'This feature is not implemented in the demo',
            icon: 'info'
        });
    }

    // Show update stock modal (simulated)
    showUpdateStockModal() {
        Swal.fire({
            title: 'Update Stock Levels',
            text: 'This feature is not implemented in the demo',
            icon: 'info'
        });
    }

    // Edit inventory item (simulated)
    editInventoryItem(itemId) {
        const item = db.getInventory().find(i => i.id === itemId);
        
        Swal.fire({
            title: `Edit ${item.name}`,
            text: 'This feature is not fully implemented in the demo',
            icon: 'info'
        });
    }

    // Update stock of specific item (simulated)
    updateStockItem(itemId) {
        const item = db.getInventory().find(i => i.id === itemId);
        
        Swal.fire({
            title: `Update ${item.name} Stock`,
            input: 'number',
            inputLabel: 'New stock level',
            inputValue: item.stock,
            showCancelButton: true,
            confirmButtonText: 'Update',
            inputValidator: (value) => {
                if (!value || value < 0) {
                    return 'Please enter a valid stock level';
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const newStock = parseInt(result.value);
                db.updateInventoryItem(itemId, { stock: newStock });
                this.loadInventory();
                toastr.success(`Updated ${item.name} stock to ${newStock} ${item.unit}`);
            }
        });
    }

    // Initialize reports page
    initReportsPage() {
        // Setup report buttons
        const reportButtons = document.querySelectorAll('.report-options button');
        reportButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                reportButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const reportType = btn.getAttribute('data-report');
                this.loadReport(reportType);
            });
        });
        
        // Load default report
        this.loadReport('daily');
    }

    // Load report data and generate chart
    loadReport(reportType) {
        // Demo data for charts
        let chartData;
        let chartTitle;
        
        const reportDetails = document.getElementById('report-details');
        
        switch (reportType) {
            case 'daily':
                chartTitle = 'Daily Sales Report';
                chartData = {
                    labels: ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM'],
                    datasets: [{
                        label: 'Sales ($)',
                        data: [42, 85, 101, 120, 152, 110, 90, 65, 72],
                        backgroundColor: 'rgba(138, 43, 226, 0.2)',
                        borderColor: 'rgba(138, 43, 226, 1)',
                        borderWidth: 2,
                        tension: 0.3
                    }]
                };
                reportDetails.innerHTML = `
                    <h3>Daily Summary</h3>
                    <div class="report-summary">
                        <div class="summary-item">
                            <span class="label">Total Sales</span>
                            <span class="value">$837.00</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Orders</span>
                            <span class="value">42</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Avg Order Value</span>
                            <span class="value">$19.93</span>
                        </div>
                    </div>
                `;
                break;
                
            case 'weekly':
                chartTitle = 'Weekly Sales Report';
                chartData = {
                    labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                    datasets: [{
                        label: 'Sales ($)',
                        data: [720, 850, 795, 810, 920, 1100, 980],
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 2,
                        tension: 0.3
                    }]
                };
                reportDetails.innerHTML = `
                    <h3>Weekly Summary</h3>
                    <div class="report-summary">
                        <div class="summary-item">
                            <span class="label">Total Sales</span>
                            <span class="value">$6,175.00</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Orders</span>
                            <span class="value">315</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Busiest Day</span>
                            <span class="value">Saturday</span>
                        </div>
                    </div>
                `;
                break;
                
            case 'monthly':
                chartTitle = 'Monthly Sales Report';
                chartData = {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                        label: 'Sales ($)',
                        data: [18500, 17200, 21300, 19800, 22500, 25100, 27800, 26900, 24200, 21800, 23500, 28900],
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2,
                        tension: 0.3
                    }]
                };
                reportDetails.innerHTML = `
                    <h3>Yearly Summary</h3>
                    <div class="report-summary">
                        <div class="summary-item">
                            <span class="label">Total Sales</span>
                            <span class="value">$277,600.00</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Best Month</span>
                            <span class="value">December</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Growth</span>
                            <span class="value">+12.4%</span>
                        </div>
                    </div>
                `;
                break;
                
            case 'popular':
                chartTitle = 'Popular Items';
                chartData = {
                    labels: ['Cappuccino', 'Latte', 'Espresso', 'Mocha', 'Croissant', 'Muffin', 'Sandwich'],
                    datasets: [{
                        label: 'Units Sold',
                        data: [320, 280, 220, 190, 180, 150, 120],
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.5)',
                            'rgba(54, 162, 235, 0.5)',
                            'rgba(255, 206, 86, 0.5)',
                            'rgba(75, 192, 192, 0.5)',
                            'rgba(153, 102, 255, 0.5)',
                            'rgba(255, 159, 64, 0.5)',
                            'rgba(201, 203, 207, 0.5)'
                        ],
                        borderWidth: 1
                    }]
                };
                reportDetails.innerHTML = `
                    <h3>Most Popular Items</h3>
                    <div class="report-summary">
                        <div class="summary-item">
                            <span class="label">Top Seller</span>
                            <span class="value">Cappuccino</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Top Category</span>
                            <span class="value">Coffee</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Trending Item</span>
                            <span class="value">Mocha (+15%)</span>
                        </div>
                    </div>
                `;
                break;
        }
        
        // Create or update chart
        this.renderChart(chartData, chartTitle, reportType === 'popular' ? 'bar' : 'line');
    }

    // Render chart using Chart.js
    renderChart(data, title, type = 'line') {
        const chartContainer = document.getElementById('report-chart');
        
        // Destroy previous chart if exists
        if (this.currentChart) {
            this.currentChart.destroy();
        }
        
        // Create canvas if it doesn't exist
        if (!document.getElementById('report-canvas')) {
            const canvas = document.createElement('canvas');
            canvas.id = 'report-canvas';
            chartContainer.innerHTML = '';
            chartContainer.appendChild(canvas);
        }
        
        // Create chart
        const ctx = document.getElementById('report-canvas').getContext('2d');
        this.currentChart = new Chart(ctx, {
            type: type,
            data: data,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: title,
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Initialize settings page
    initSettingsPage() {
        const settings = db.getSettings();
        
        // Populate form with current settings
        document.getElementById('cafe-name').value = settings.cafeName;
        document.getElementById('tax-rate').value = settings.taxRate;
        
        // Setup form submission
        document.getElementById('settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });
        
        // Setup backup/restore buttons
        document.getElementById('backup-data').addEventListener('click', () => this.backupData());
        document.getElementById('restore-data').addEventListener('click', () => this.restoreData());
    }

    // Save settings
    saveSettings() {
        const cafeName = document.getElementById('cafe-name').value;
        const taxRate = parseFloat(document.getElementById('tax-rate').value);
        
        if (!cafeName || isNaN(taxRate)) {
            toastr.error('Please fill in all fields correctly');
            return;
        }
        
        const updatedSettings = db.updateSettings({
            cafeName: cafeName,
            taxRate: taxRate,
            lastUpdated: new Date().toISOString()
        });
        
        toastr.success('Settings saved successfully');
    }

    // Backup data (simulated)
    backupData() {
        const backup = db.generateBackup();
        const backupStr = JSON.stringify(backup);
        
        // In a real app, this would save to a file or cloud storage
        // For demo, we'll simulate a download
        const blob = new Blob([backupStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `shimmer-cafe-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toastr.success('Backup created successfully');
    }

    // Restore data (simulated)
    restoreData() {
        Swal.fire({
            title: 'Restore Data',
            text: 'This would normally allow you to upload a backup file. For this demo, we\'ll simulate a restore.',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Simulate Restore',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                // Simulate a restore by using current data
                const backup = db.generateBackup();
                db.restoreFromBackup(backup);
                
                toastr.success('Data restored successfully');
                
                // Reload current page to reflect changes
                this.loadPage(this.currentPage);
            }
        });
    }

    // Register global event listeners
    setupEventListeners() {
        // Add ripple effect to buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('ripple') || e.target.closest('.ripple')) {
                const button = e.target.classList.contains('ripple') ? e.target : e.target.closest('.ripple');
                const ripple = document.createElement('span');
                ripple.classList.add('ripple-effect');
                
                const rect = button.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                
                ripple.style.width = ripple.style.height = `${size}px`;
                ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
                ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
                
                button.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            }
        });
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new CafeApp();
    app.init();
    window.cafeApp = app; // Make available globally for debugging
});
