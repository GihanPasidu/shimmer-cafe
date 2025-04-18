/**
 * Main application logic for Shimmer Cafe
 * Handles UI interactions, page navigation, and business logic
 */
class ShimmerCafeApp {
    constructor() {
        this.currentPage = 'pos'; // Default page
        this.currentOrder = { items: [], subtotal: 0, tax: 0, total: 0 };
        this.activeCategoryTab = 'coffee'; // Default menu category
        
        // Apply user settings
        this.applySettings();
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Load initial page
        this.loadPage(this.currentPage);
    }
    
    applySettings() {
        const settings = db.getSettings();
        
        // Apply theme from settings
        document.documentElement.setAttribute('data-theme', settings.theme || 'purple');
        
        // Apply cafe name
        document.title = `${settings.cafeName || 'Shimmer Cafe'} - Management System`;
        
        // Configure toastr notifications
        toastr.options = {
            closeButton: true,
            progressBar: true,
            positionClass: "toast-bottom-right",
            timeOut: 3000
        };
    }
    
    initEventListeners() {
        // Navigation event listeners
        document.querySelectorAll('nav a').forEach(navLink => {
            navLink.addEventListener('click', (e) => {
                e.preventDefault();
                const page = navLink.getAttribute('data-page');
                this.loadPage(page);
            });
        });
        
        // Global event delegator for dynamic elements
        document.addEventListener('click', (e) => {
            // Handle category tab clicks
            if (e.target.classList.contains('category-tab') || e.target.parentElement.classList.contains('category-tab')) {
                const tab = e.target.closest('.category-tab');
                const category = tab.getAttribute('data-category');
                this.switchCategory(category);
            }
            
            // Handle report button clicks
            if (e.target.hasAttribute('data-report') || e.target.parentElement.hasAttribute('data-report')) {
                const button = e.target.closest('[data-report]');
                const reportType = button.getAttribute('data-report');
                this.generateReport(reportType);
            }
        });
    }
    
    loadPage(page) {
        const mainContent = document.getElementById('main-content');
        const navLinks = document.querySelectorAll('nav a');
        
        // Update navigation
        navLinks.forEach(link => {
            if (link.getAttribute('data-page') === page) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        
        // Set current page
        this.currentPage = page;
        
        // Clear current content with animation
        mainContent.classList.remove('animate__fadeIn');
        mainContent.classList.add('animate__fadeOut');
        
        setTimeout(() => {
            // Load new content
            mainContent.innerHTML = '';
            const template = document.getElementById(`${page}-template`);
            if (template) {
                mainContent.appendChild(document.importNode(template.content, true));
                
                // Initialize page specific content
                switch (page) {
                    case 'pos':
                        this.initPOS();
                        break;
                    case 'inventory':
                        this.initInventory();
                        break;
                    case 'reports':
                        this.initReports();
                        break;
                    case 'settings':
                        this.initSettings();
                        break;
                }
                
                // Animation for new content
                mainContent.classList.remove('animate__fadeOut');
                mainContent.classList.add('animate__fadeIn');
            } else {
                mainContent.innerHTML = '<div class="error-message">Page template not found!</div>';
            }
        }, 300); // Match with CSS transition time
    }
    
    // POS Page Methods
    initPOS() {
        // Reset current order
        this.currentOrder = { items: [], subtotal: 0, tax: 0, total: 0 };
        this.updateOrderSummary();
        
        // Load menu items for default category
        this.switchCategory(this.activeCategoryTab);
        
        // Set up POS event listeners
        document.getElementById('clear-order').addEventListener('click', () => this.clearOrder());
        document.getElementById('process-payment').addEventListener('click', () => this.openPaymentModal());
    }
    
    switchCategory(category) {
        // Update active tab
        const tabs = document.querySelectorAll('.category-tab');
        tabs.forEach(tab => {
            if (tab.getAttribute('data-category') === category) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        this.activeCategoryTab = category;
        
        // Load menu items
        const menuItems = db.getMenuItemsByCategory(category);
        const menuContainer = document.querySelector('.menu-items');
        
        menuContainer.innerHTML = '';
        menuItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'menu-item ripple';
            itemElement.setAttribute('data-id', item.id);
            
            // Format price with 2 decimal places
            const formattedPrice = parseFloat(item.price).toFixed(2);
            
            itemElement.innerHTML = `
                <div class="menu-item-image">
                    <img src="images/menu/${item.image || 'placeholder.jpg'}" alt="${item.name}">
                </div>
                <div class="menu-item-details">
                    <h3>${item.name}</h3>
                    <p class="price">$${formattedPrice}</p>
                </div>
            `;
            
            itemElement.addEventListener('click', () => this.addItemToOrder(item));
            menuContainer.appendChild(itemElement);
        });
    }
    
    addItemToOrder(item) {
        // Check if item already exists in order
        const existingItemIndex = this.currentOrder.items.findIndex(orderItem => orderItem.id === item.id);
        
        if (existingItemIndex !== -1) {
            // Increase quantity if item already in order
            this.currentOrder.items[existingItemIndex].quantity += 1;
            this.currentOrder.items[existingItemIndex].total = 
                this.currentOrder.items[existingItemIndex].quantity * this.currentOrder.items[existingItemIndex].price;
        } else {
            // Add new item to order
            this.currentOrder.items.push({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: 1,
                total: item.price
            });
        }
        
        this.updateOrderDisplay();
        this.updateOrderSummary();
        
        // Show notification
        toastr.success(`Added ${item.name} to order`);
    }
    
    updateOrderDisplay() {
        const orderItems = document.querySelector('.order-items');
        orderItems.innerHTML = '';
        
        if (this.currentOrder.items.length === 0) {
            orderItems.innerHTML = '<div class="empty-order">No items in current order</div>';
            return;
        }
        
        this.currentOrder.items.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'order-item';
            itemElement.innerHTML = `
                <div class="order-item-details">
                    <span class="order-item-name">${item.name}</span>
                    <span class="order-item-price">$${parseFloat(item.price).toFixed(2)} × ${item.quantity}</span>
                </div>
                <div class="order-item-total">$${parseFloat(item.total).toFixed(2)}</div>
                <div class="order-item-actions">
                    <button class="btn-circle decrease-item" data-index="${index}">-</button>
                    <button class="btn-circle increase-item" data-index="${index}">+</button>
                    <button class="btn-circle remove-item" data-index="${index}">×</button>
                </div>
            `;
            orderItems.appendChild(itemElement);
        });
        
        // Add event listeners for order item actions
        document.querySelectorAll('.decrease-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.decreaseItemQuantity(index);
            });
        });
        
        document.querySelectorAll('.increase-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.increaseItemQuantity(index);
            });
        });
        
        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.removeItemFromOrder(index);
            });
        });
    }
    
    decreaseItemQuantity(index) {
        if (this.currentOrder.items[index].quantity > 1) {
            this.currentOrder.items[index].quantity -= 1;
            this.currentOrder.items[index].total = 
                this.currentOrder.items[index].quantity * this.currentOrder.items[index].price;
            this.updateOrderDisplay();
            this.updateOrderSummary();
        } else {
            this.removeItemFromOrder(index);
        }
    }
    
    increaseItemQuantity(index) {
        this.currentOrder.items[index].quantity += 1;
        this.currentOrder.items[index].total = 
            this.currentOrder.items[index].quantity * this.currentOrder.items[index].price;
        this.updateOrderDisplay();
        this.updateOrderSummary();
    }
    
    removeItemFromOrder(index) {
        const itemName = this.currentOrder.items[index].name;
        this.currentOrder.items.splice(index, 1);
        this.updateOrderDisplay();
        this.updateOrderSummary();
        toastr.info(`Removed ${itemName} from order`);
    }
    
    updateOrderSummary() {
        // Calculate subtotal
        this.currentOrder.subtotal = this.currentOrder.items.reduce((sum, item) => sum + item.total, 0);
        
        // Get tax rate from settings
        const settings = db.getSettings();
        const taxRate = settings.taxRate || 10;
        
        // Calculate tax and total
        this.currentOrder.tax = this.currentOrder.subtotal * (taxRate / 100);
        this.currentOrder.total = this.currentOrder.subtotal + this.currentOrder.tax;
        
        // Update UI
        document.getElementById('subtotal').textContent = this.currentOrder.subtotal.toFixed(2);
        document.getElementById('tax').textContent = this.currentOrder.tax.toFixed(2);
        document.getElementById('total').textContent = this.currentOrder.total.toFixed(2);
        
        // Enable/disable payment button
        const paymentButton = document.getElementById('process-payment');
        if (this.currentOrder.items.length > 0) {
            paymentButton.removeAttribute('disabled');
        } else {
            paymentButton.setAttribute('disabled', 'disabled');
        }
    }
    
    clearOrder() {
        if (this.currentOrder.items.length === 0) return;
        
        Swal.fire({
            title: 'Clear Order',
            text: 'Are you sure you want to clear the current order?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, clear it!'
        }).then((result) => {
            if (result.isConfirmed) {
                this.currentOrder = { items: [], subtotal: 0, tax: 0, total: 0 };
                this.updateOrderDisplay();
                this.updateOrderSummary();
                toastr.info('Order has been cleared');
            }
        });
    }
    
    openPaymentModal() {
        if (this.currentOrder.items.length === 0) return;
        
        // Create modal backdrop
        const modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'modal-backdrop';
        
        // Create modal container
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal';
        
        // Get payment modal content from template
        const template = document.getElementById('payment-modal-template');
        modalContainer.appendChild(document.importNode(template.content, true));
        
        // Add total amount to modal
        modalContainer.querySelector('#payment-amount').textContent = this.currentOrder.total.toFixed(2);
        
        // Add to document
        document.body.appendChild(modalBackdrop);
        document.body.appendChild(modalContainer);
        
        // Add event listeners
        modalContainer.querySelector('#cancel-payment').addEventListener('click', () => {
            this.closePaymentModal(modalBackdrop, modalContainer);
        });
        
        modalBackdrop.addEventListener('click', () => {
            this.closePaymentModal(modalBackdrop, modalContainer);
        });
        
        // Payment method buttons
        modalContainer.querySelectorAll('.btn-payment').forEach(button => {
            button.addEventListener('click', (e) => {
                const method = e.target.getAttribute('data-method');
                this.selectPaymentMethod(method, modalContainer);
            });
        });
        
        // Cash amount input
        const cashInput = modalContainer.querySelector('#cash-amount');
        cashInput.addEventListener('input', () => {
            const cashAmount = parseFloat(cashInput.value) || 0;
            const change = cashAmount - this.currentOrder.total;
            modalContainer.querySelector('#change').textContent = change >= 0 ? change.toFixed(2) : '0.00';
        });
        
        // Complete payment button
        modalContainer.querySelector('#complete-payment').addEventListener('click', () => {
            this.completePayment(modalBackdrop, modalContainer);
        });
    }
    
    selectPaymentMethod(method, modalContainer) {
        // Highlight selected payment method
        modalContainer.querySelectorAll('.btn-payment').forEach(btn => {
            if (btn.getAttribute('data-method') === method) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
        
        // Show/hide cash input for cash payments
        if (method === 'cash') {
            modalContainer.querySelector('#cash-input').classList.remove('hidden');
            modalContainer.querySelector('#cash-amount').focus();
        } else {
            modalContainer.querySelector('#cash-input').classList.add('hidden');
        }
        
        // Store selected method
        this.selectedPaymentMethod = method;
    }
    
    closePaymentModal(backdrop, modal) {
        modal.classList.add('animate__fadeOutUp');
        backdrop.classList.add('fade-out');
        
        setTimeout(() => {
            document.body.removeChild(backdrop);
            document.body.removeChild(modal);
        }, 300);
    }
    
    completePayment(backdrop, modal) {
        // Validate payment
        if (!this.selectedPaymentMethod) {
            toastr.error('Please select a payment method');
            return;
        }
        
        if (this.selectedPaymentMethod === 'cash') {
            const cashAmount = parseFloat(modal.querySelector('#cash-amount').value) || 0;
            if (cashAmount < this.currentOrder.total) {
                toastr.error('Insufficient cash amount');
                return;
            }
        }
        
        // Create order record
        const order = {
            items: this.currentOrder.items,
            subtotal: this.currentOrder.subtotal,
            tax: this.currentOrder.tax,
            total: this.currentOrder.total,
            paymentMethod: this.selectedPaymentMethod,
            date: new Date().toISOString()
        };
        
        // Save order
        db.addOrder(order);
        
        // Show success message
        Swal.fire({
            title: 'Payment Successful',
            text: 'Order has been processed successfully!',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
        
        // Close modal
        this.closePaymentModal(backdrop, modal);
        
        // Reset order
        this.currentOrder = { items: [], subtotal: 0, tax: 0, total: 0 };
        this.updateOrderDisplay();
        this.updateOrderSummary();
    }
    
    // Inventory Page Methods
    initInventory() {
        this.displayInventory();
        
        // Set up inventory event listeners
        document.getElementById('add-item').addEventListener('click', () => this.showAddItemModal());
        document.getElementById('update-stock').addEventListener('click', () => this.showUpdateStockModal());
    }
    
    displayInventory() {
        const inventory = db.getInventory();
        const inventoryList = document.getElementById('inventory-list');
        
        inventoryList.innerHTML = '';
        
        if (inventory.length === 0) {
            inventoryList.innerHTML = '<tr><td colspan="5" class="empty-table">No inventory items found</td></tr>';
            return;
        }
        
        inventory.forEach(item => {
            const row = document.createElement('tr');
            
            // Add warning class if stock is below reorder level
            if (item.stock <= item.reorderLevel) {
                row.classList.add('low-stock');
            }
            
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.stock} ${item.unit}</td>
                <td>${item.reorderLevel} ${item.unit}</td>
                <td class="actions">
                    <button class="btn-circle edit-item" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn-circle delete-item" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            inventoryList.appendChild(row);
        });
        
        // Add event listeners for inventory actions
        document.querySelectorAll('.edit-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('.edit-item').getAttribute('data-id'));
                this.showEditItemModal(id);
            });
        });
        
        document.querySelectorAll('.delete-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('.delete-item').getAttribute('data-id'));
                this.confirmDeleteItem(id);
            });
        });
    }
    
    showAddItemModal() {
        Swal.fire({
            title: 'Add Inventory Item',
            html: `
                <div class="form-control">
                    <label for="item-name">Item Name</label>
                    <input type="text" id="item-name" class="swal2-input">
                </div>
                <div class="form-control">
                    <label for="item-category">Category</label>
                    <select id="item-category" class="swal2-input">
                        <option value="ingredients">Ingredients</option>
                        <option value="supplies">Supplies</option>
                        <option value="equipment">Equipment</option>
                    </select>
                </div>
                <div class="form-control">
                    <label for="item-stock">Initial Stock</label>
                    <input type="number" id="item-stock" class="swal2-input" min="0" step="0.01">
                </div>
                <div class="form-control">
                    <label for="item-unit">Unit</label>
                    <input type="text" id="item-unit" class="swal2-input" placeholder="kg, liters, boxes, etc.">
                </div>
                <div class="form-control">
                    <label for="item-reorder">Reorder Level</label>
                    <input type="number" id="item-reorder" class="swal2-input" min="0" step="0.01">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Add Item',
            showLoaderOnConfirm: true,
            preConfirm: () => {
                const name = document.getElementById('item-name').value;
                const category = document.getElementById('item-category').value;
                const stock = parseFloat(document.getElementById('item-stock').value);
                const unit = document.getElementById('item-unit').value;
                const reorderLevel = parseFloat(document.getElementById('item-reorder').value);
                
                if (!name || isNaN(stock) || !unit || isNaN(reorderLevel)) {
                    Swal.showValidationMessage('Please fill all fields correctly');
                    return false;
                }
                
                return { name, category, stock, unit, reorderLevel };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const inventory = db.getInventory();
                const newItem = {
                    id: Date.now(),
                    ...result.value
                };
                
                inventory.push(newItem);
                db.saveInventory(inventory);
                
                this.displayInventory();
                toastr.success(`${newItem.name} added to inventory`);
            }
        });
    }
    
    showEditItemModal(itemId) {
        const inventory = db.getInventory();
        const item = inventory.find(i => i.id === itemId);
        
        if (!item) {
            toastr.error('Item not found');
            return;
        }
        
        Swal.fire({
            title: 'Edit Inventory Item',
            html: `
                <div class="form-control">
                    <label for="edit-name">Item Name</label>
                    <input type="text" id="edit-name" class="swal2-input" value="${item.name}">
                </div>
                <div class="form-control">
                    <label for="edit-category">Category</label>
                    <select id="edit-category" class="swal2-input">
                        <option value="ingredients" ${item.category === 'ingredients' ? 'selected' : ''}>Ingredients</option>
                        <option value="supplies" ${item.category === 'supplies' ? 'selected' : ''}>Supplies</option>
                        <option value="equipment" ${item.category === 'equipment' ? 'selected' : ''}>Equipment</option>
                    </select>
                </div>
                <div class="form-control">
                    <label for="edit-stock">Current Stock</label>
                    <input type="number" id="edit-stock" class="swal2-input" min="0" step="0.01" value="${item.stock}">
                </div>
                <div class="form-control">
                    <label for="edit-unit">Unit</label>
                    <input type="text" id="edit-unit" class="swal2-input" value="${item.unit}">
                </div>
                <div class="form-control">
                    <label for="edit-reorder">Reorder Level</label>
                    <input type="number" id="edit-reorder" class="swal2-input" min="0" step="0.01" value="${item.reorderLevel}">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Update Item',
            showLoaderOnConfirm: true,
            preConfirm: () => {
                const name = document.getElementById('edit-name').value;
                const category = document.getElementById('edit-category').value;
                const stock = parseFloat(document.getElementById('edit-stock').value);
                const unit = document.getElementById('edit-unit').value;
                const reorderLevel = parseFloat(document.getElementById('edit-reorder').value);
                
                if (!name || isNaN(stock) || !unit || isNaN(reorderLevel)) {
                    Swal.showValidationMessage('Please fill all fields correctly');
                    return false;
                }
                
                return { name, category, stock, unit, reorderLevel };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                db.updateInventoryItem(itemId, result.value);
                this.displayInventory();
                toastr.success(`${result.value.name} updated successfully`);
            }
        });
    }
    
    confirmDeleteItem(itemId) {
        const inventory = db.getInventory();
        const item = inventory.find(i => i.id === itemId);
        
        if (!item) {
            toastr.error('Item not found');
            return;
        }
        
        Swal.fire({
            title: 'Delete Item',
            text: `Are you sure you want to delete ${item.name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                const updatedInventory = inventory.filter(i => i.id !== itemId);
                db.saveInventory(updatedInventory);
                this.displayInventory();
                toastr.success(`${item.name} has been deleted`);
            }
        });
    }
    
    showUpdateStockModal() {
        // Create an array of options for the select element
        const inventory = db.getInventory();
        let optionsHtml = '';
        
        inventory.forEach(item => {
            optionsHtml += `<option value="${item.id}">${item.name} (Current: ${item.stock} ${item.unit})</option>`;
        });
        
        Swal.fire({
            title: 'Update Stock',
            html: `
                <div class="form-control">
                    <label for="stock-item">Select Item</label>
                    <select id="stock-item" class="swal2-input">
                        ${optionsHtml}
                    </select>
                </div>
                <div class="form-control">
                    <label for="stock-adjustment">Adjustment</label>
                    <div class="input-group">
                        <select id="stock-adjustment-type" class="swal2-input">
                            <option value="add">Add</option>
                            <option value="subtract">Subtract</option>
                            <option value="set">Set to</option>
                        </select>
                        <input type="number" id="stock-adjustment-value" class="swal2-input" min="0" step="0.01">
                    </div>
                </div>
                <div class="form-control">
                    <label for="stock-notes">Notes (Optional)</label>
                    <textarea id="stock-notes" class="swal2-textarea" placeholder="Reason for adjustment"></textarea>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Update Stock',
            showLoaderOnConfirm: true,
            preConfirm: () => {
                const itemId = parseInt(document.getElementById('stock-item').value);
                const adjustmentType = document.getElementById('stock-adjustment-type').value;
                const adjustmentValue = parseFloat(document.getElementById('stock-adjustment-value').value);
                const notes = document.getElementById('stock-notes').value;
                
                if (isNaN(adjustmentValue) || adjustmentValue < 0) {
                    Swal.showValidationMessage('Please enter a valid adjustment value');
                    return false;
                }
                
                return { itemId, adjustmentType, adjustmentValue, notes };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const { itemId, adjustmentType, adjustmentValue, notes } = result.value;
                const inventory = db.getInventory();
                const item = inventory.find(i => i.id === itemId);
                
                let newStock;
                switch (adjustmentType) {
                    case 'add':
                        newStock = item.stock + adjustmentValue;
                        break;
                    case 'subtract':
                        newStock = Math.max(0, item.stock - adjustmentValue);
                        break;
                    case 'set':
                        newStock = adjustmentValue;
                        break;
                }
                
                db.updateInventoryItem(itemId, { stock: newStock });
                this.displayInventory();
                toastr.success(`Stock updated for ${item.name}`);
            }
        });
    }
    
    // Reports Page Methods
    initReports() {
        // Default to showing daily sales report
        this.generateReport('daily');
    }
    
    generateReport(reportType) {
        const reportChartContainer = document.getElementById('report-chart');
        const reportDetails = document.getElementById('report-details');
        const orders = db.getOrders();
        
        // Clear previous chart if exists
        if (this.currentChart) {
            this.currentChart.destroy();
        }
        
        // Make all report buttons inactive
        document.querySelectorAll('[data-report]').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Make selected report button active
        document.querySelector(`[data-report="${reportType}"]`).classList.add('active');
        
        // If no orders, show message
        if (orders.length === 0) {
            reportChartContainer.innerHTML = '<div class="empty-data">No order data available</div>';
            reportDetails.innerHTML = '';
            return;
        }
        
        // Process data based on report type
        let chartData;
        let detailsHtml;
        
        switch (reportType) {
            case 'daily':
                chartData = this.generateDailyReportData(orders);
                detailsHtml = this.generateDailyReportDetails(chartData);
                break;
            case 'weekly':
                chartData = this.generateWeeklyReportData(orders);
                detailsHtml = this.generateWeeklyReportDetails(chartData);
                break;
            case 'monthly':
                chartData = this.generateMonthlyReportData(orders);
                detailsHtml = this.generateMonthlyReportDetails(chartData);
                break;
            case 'popular':
                chartData = this.generatePopularItemsData(orders);
                detailsHtml = this.generatePopularItemsDetails(chartData);
                break;
        }
        
        // Create chart
        reportChartContainer.innerHTML = '<canvas id="chart"></canvas>';
        const ctx = document.getElementById('chart').getContext('2d');
        
        this.currentChart = new Chart(ctx, {
            type: reportType === 'popular' ? 'pie' : 'bar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: reportType === 'popular' ? 'Items Sold' : 'Sales',
                    data: chartData.values,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)',
                        'rgba(199, 199, 199, 0.7)',
                        'rgba(83, 102, 255, 0.7)',
                        'rgba(40, 159, 64, 0.7)',
                        'rgba(210, 199, 199, 0.7)',
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(159, 159, 159, 1)',
                        'rgba(83, 102, 255, 1)',
                        'rgba(40, 159, 64, 1)',
                        'rgba(210, 199, 199, 1)',
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: reportType === 'popular',
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (reportType === 'popular') {
                                    return ` ${context.label}: ${context.raw} items`;
                                } else {
                                    return ` $${context.raw.toFixed(2)}`;
                                }
                            }
                        }
                    }
                },
                scales: reportType === 'popular' ? undefined : {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
        
        // Update details
        reportDetails.innerHTML = detailsHtml;
    }
    
    generateDailyReportData(orders) {
        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get hours for today
        const hours = [];
        for (let i = 0; i < 24; i++) {
            hours.push(i);
        }
        
        // Initialize sales data
        const salesData = new Array(24).fill(0);
        
        // Filter orders for today and populate sales data
        orders.forEach(order => {
            const orderDate = new Date(order.date);
            const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
            
            if (orderDay.getTime() === today.getTime()) {
                const hour = orderDate.getHours();
                salesData[hour] += order.total;
            }
        });
        
        // Format hour labels
        const hourLabels = hours.map(hour => {
            const ampm = hour < 12 ? 'AM' : 'PM';
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            return `${displayHour} ${ampm}`;
        });
        
        return {
            labels: hourLabels,
            values: salesData
        };
    }
    
    generateDailyReportDetails(chartData) {
        const totalSales = chartData.values.reduce((total, amount) => total + amount, 0);
        const peakHourIndex = chartData.values.indexOf(Math.max(...chartData.values));
        const peakHour = chartData.labels[peakHourIndex];
        
        return `
            <div class="report-summary">
                <div class="summary-item">
                    <h3>Total Sales Today</h3>
                    <p class="highlight">$${totalSales.toFixed(2)}</p>
                </div>
                <div class="summary-item">
                    <h3>Peak Hour</h3>
                    <p class="highlight">${peakHour}</p>
                </div>
                <div class="summary-item">
                    <h3>Peak Hour Sales</h3>
                    <p class="highlight">$${chartData.values[peakHourIndex].toFixed(2)}</p>
                </div>
            </div>
        `;
    }
    
    generateWeeklyReportData(orders) {
        // Get start of current week (Sunday)
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        // Day names
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        // Initialize sales data
        const salesData = new Array(7).fill(0);
        
        // Filter orders for this week and populate sales data
        orders.forEach(order => {
            const orderDate = new Date(order.date);
            
            if (orderDate.getTime() >= startOfWeek.getTime()) {
                const dayOfWeek = orderDate.getDay();
                salesData[dayOfWeek] += order.total;
            }
        });
        
        return {
            labels: dayNames,
            values: salesData
        };
    }
    
    generateWeeklyReportDetails(chartData) {
        const totalSales = chartData.values.reduce((total, amount) => total + amount, 0);
        const peakDayIndex = chartData.values.indexOf(Math.max(...chartData.values));
        const peakDay = chartData.labels[peakDayIndex];
        
        return `
            <div class="report-summary">
                <div class="summary-item">
                    <h3>Weekly Sales</h3>
                    <p class="highlight">$${totalSales.toFixed(2)}</p>
                </div>
                <div class="summary-item">
                    <h3>Peak Day</h3>
                    <p class="highlight">${peakDay}</p>
                </div>
                <div class="summary-item">
                    <h3>Peak Day Sales</h3>
                    <p class="highlight">$${chartData.values[peakDayIndex].toFixed(2)}</p>
                </div>
                <div class="summary-item">
                    <h3>Daily Average</h3>
                    <p class="highlight">$${(totalSales / 7).toFixed(2)}</p>
                </div>
            </div>
        `;
    }
    
    generateMonthlyReportData(orders) {
        // Get current month and year
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        // Get number of days in the month
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        // Day labels
        const dayLabels = [];
        for (let i = 1; i <= daysInMonth; i++) {
            dayLabels.push(`${i}`);
        }
        
        // Initialize sales data
        const salesData = new Array(daysInMonth).fill(0);
        
        // Filter orders for this month and populate sales data
        orders.forEach(order => {
            const orderDate = new Date(order.date);
            
            if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
                const dayOfMonth = orderDate.getDate() - 1; // Array is 0-indexed
                salesData[dayOfMonth] += order.total;
            }
        });
        
        return {
            labels: dayLabels,
            values: salesData
        };
    }
    
    generateMonthlyReportDetails(chartData) {
        const totalSales = chartData.values.reduce((total, amount) => total + amount, 0);
        const peakDayIndex = chartData.values.indexOf(Math.max(...chartData.values));
        const peakDay = chartData.labels[peakDayIndex];
        
        // Get month name
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const currentMonth = new Date().getMonth();
        
        return `
            <div class="report-summary">
                <div class="summary-item">
                    <h3>${monthNames[currentMonth]} Sales</h3>
                    <p class="highlight">$${totalSales.toFixed(2)}</p>
                </div>
                <div class="summary-item">
                    <h3>Peak Day</h3>
                    <p class="highlight">${monthNames[currentMonth]} ${peakDay}</p>
                </div>
                <div class="summary-item">
                    <h3>Peak Day Sales</h3>
                    <p class="highlight">$${chartData.values[peakDayIndex].toFixed(2)}</p>
                </div>
                <div class="summary-item">
                    <h3>Daily Average</h3>
                    <p class="highlight">$${(totalSales / chartData.labels.length).toFixed(2)}</p>
                </div>
            </div>
        `;
    }
    
    generatePopularItemsData(orders) {
        // Item sales counter
        const itemSales = {};
        
        // Count item quantities across all orders
        orders.forEach(order => {
            order.items.forEach(item => {
                if (itemSales[item.name]) {
                    itemSales[item.name] += item.quantity;
                } else {
                    itemSales[item.name] = item.quantity;
                }
            });
        });
        
        // Convert to arrays for sorting
        const items = Object.keys(itemSales);
        const quantities = Object.values(itemSales);
        
        // Sort by quantity (descending)
        const sorted = items.map((item, i) => ({ name: item, quantity: quantities[i] }))
                           .sort((a, b) => b.quantity - a.quantity)
                           .slice(0, 10); // Top 10 items
        
        return {
            labels: sorted.map(item => item.name),
            values: sorted.map(item => item.quantity)
        };
    }
    
    generatePopularItemsDetails(chartData) {
        const totalItems = chartData.values.reduce((total, quantity) => total + quantity, 0);
        
        // Create top items list
        let topItemsHtml = '';
        for (let i = 0; i < chartData.labels.length; i++) {
            const percentage = ((chartData.values[i] / totalItems) * 100).toFixed(1);
            topItemsHtml += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${chartData.labels[i]}</td>
                    <td>${chartData.values[i]}</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        }
        
        return `
            <div class="report-summary">
                <div class="summary-item">
                    <h3>Total Items Sold</h3>
                    <p class="highlight">${totalItems}</p>
                </div>
                <div class="popular-items-table">
                    <h3>Top Selling Items</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Item</th>
                                <th>Quantity</th>
                                <th>% of Sales</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topItemsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    // Settings Page Methods
    initSettings() {
        const settings = db.getSettings();
        
        // Populate settings form
        document.getElementById('cafe-name').value = settings.cafeName || 'Shimmer Cafe';
        document.getElementById('tax-rate').value = settings.taxRate || 10;
        
        // Set up settings event listeners
        document.getElementById('settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });
        
        document.getElementById('backup-data').addEventListener('click', () => this.backupData());
        document.getElementById('restore-data').addEventListener('click', () => this.restoreData());
    }
    
    saveSettings() {
        const cafeName = document.getElementById('cafe-name').value.trim();
        const taxRate = parseFloat(document.getElementById('tax-rate').value);
        
        // Validate inputs
        if (!cafeName) {
            toastr.error('Cafe name cannot be empty');
            return;
        }
        
        if (isNaN(taxRate) || taxRate < 0) {
            toastr.error('Please enter a valid tax rate');
            return;
        }
        
        // Save settings
        const settings = db.getSettings();
        settings.cafeName = cafeName;
        settings.taxRate = taxRate;
        db.saveSettings(settings);
        
        // Apply settings
        this.applySettings();
        
        toastr.success('Settings saved successfully');
    }
    
    backupData() {
        // Create backup
        const backup = db.createBackup();
        
        // Convert to JSON string
        const backupJson = JSON.stringify(backup, null, 2);
        
        // Create download link
        const blob = new Blob([backupJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `shimmer_cafe_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        toastr.success('Backup created successfully');
    }
    
    restoreData() {
        // Create file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'application/json';
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const backupData = JSON.parse(event.target.result);
                    
                    // Confirm restore
                    Swal.fire({
                        title: 'Restore Data',
                        text: `Are you sure you want to restore data from ${new Date(backupData.timestamp).toLocaleString()}? This will overwrite all current data.`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Yes, restore it!'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            const success = db.restoreBackup(backupData);
                            
                            if (success) {
                                toastr.success('Data restored successfully');
                                // Reload page to apply changes
                                setTimeout(() => {
                                    window.location.reload();
                                }, 1500);
                            } else {
                                toastr.error('Failed to restore data');
                            }
                        }
                    });
                } catch (error) {
                    toastr.error('Invalid backup file');
                    console.error(error);
                }
            };
            
            reader.readAsText(file);
        });
        
        // Trigger file selection
        fileInput.click();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ShimmerCafeApp();
});
