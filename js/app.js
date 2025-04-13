document.addEventListener('DOMContentLoaded', function() {
    const app = new ShimmerCafeApp();
    app.init();
});

class ShimmerCafeApp {
    constructor() {
        this.currentPage = 'pos';
        this.currentOrder = {
            items: [],
            subtotal: 0,
            tax: 0,
            total: 0
        };
        this.settings = db.getSettings();
        this.setupToastr();
        this.charts = {};
    }

    init() {
        this.setupNavigation();
        this.loadPage(this.currentPage);
        this.addRippleEffect();
    }

    setupToastr() {
        // Configure toastr notification library
        toastr.options = {
            closeButton: true,
            progressBar: true,
            positionClass: "toast-bottom-right",
            timeOut: 3000,
            showMethod: "fadeIn",
            hideMethod: "fadeOut"
        };
    }

    addRippleEffect() {
        // Add ripple effect to all buttons with ripple class
        document.addEventListener('click', function(e) {
            const target = e.target.closest('.ripple');
            if (!target) return;
            
            const rect = target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement('div');
            ripple.className = 'ripple-effect';
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            target.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                
                // Don't reload if we're already on this page
                if (this.currentPage === page) return;
                
                // Update active link
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                this.loadPage(page);
            });
        });
    }

    loadPage(page) {
        this.currentPage = page;
        const mainContent = document.getElementById('main-content');
        const template = document.getElementById(`${page}-template`);
        
        if (template) {
            // Add exit animation
            mainContent.classList.remove('animate__fadeIn');
            mainContent.classList.add('animate__fadeOut');
            
            setTimeout(() => {
                mainContent.innerHTML = '';
                const content = template.content.cloneNode(true);
                mainContent.appendChild(content);
                
                // Add entrance animation
                mainContent.classList.remove('animate__fadeOut');
                mainContent.classList.add('animate__fadeIn');
                
                // Initialize page specific functionality
                this[`init${this.capitalizeFirstLetter(page)}Page`]();
            }, 300);
        } else {
            mainContent.innerHTML = '<p>Page not found</p>';
        }
    }

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // POS Page Functions
    initPosPage() {
        this.loadMenuItems('coffee');
        this.setupCategoryTabs();
        this.setupOrderActions();
        this.renderCurrentOrder();
    }

    loadMenuItems(category) {
        const menuItems = db.getMenuItemsByCategory(category);
        const menuContainer = document.querySelector('.menu-items');
        menuContainer.innerHTML = '';
        
        menuItems.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'menu-item animate__animated animate__fadeIn';
            itemElement.style.animationDelay = `${index * 0.05}s`;
            itemElement.setAttribute('data-id', item.id);
            
            // Create the menu item content
            let imageContent = '';
            if (item.image) {
                imageContent = `<div class="menu-item-image">
                    <img src="images/${item.image}" alt="${item.name}" onerror="this.parentNode.classList.add('no-image')">
                </div>`;
            } else {
                imageContent = `<div class="menu-item-image no-image">
                    <span class="item-initial">${item.name.charAt(0)}</span>
                </div>`;
            }
            
            itemElement.innerHTML = `
                ${imageContent}
                <div class="menu-item-name">${item.name}</div>
                <div class="menu-item-price">${this.settings.currency}${item.price.toFixed(2)}</div>
            `;
            
            itemElement.addEventListener('click', () => this.addItemToOrder(item));
            menuContainer.appendChild(itemElement);
        });
    }

    setupCategoryTabs() {
        const categoryTabs = document.querySelectorAll('.category-tab');
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const category = tab.getAttribute('data-category');
                
                // Update active tab
                categoryTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                this.loadMenuItems(category);
            });
        });
    }

    setupOrderActions() {
        const clearOrderBtn = document.getElementById('clear-order');
        if (clearOrderBtn) {
            clearOrderBtn.addEventListener('click', () => this.clearOrder());
        }
        
        const processPaymentBtn = document.getElementById('process-payment');
        if (processPaymentBtn) {
            processPaymentBtn.addEventListener('click', () => this.showPaymentModal());
        }
    }

    addItemToOrder(item) {
        // Check if item already exists in the order
        const existingItemIndex = this.currentOrder.items.findIndex(orderItem => orderItem.id === item.id);
        
        if (existingItemIndex !== -1) {
            // Increment quantity if item already exists
            this.currentOrder.items[existingItemIndex].quantity++;
            toastr.info(`Increased ${item.name} quantity to ${this.currentOrder.items[existingItemIndex].quantity}`);
        } else {
            // Add new item to the order
            this.currentOrder.items.push({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: 1
            });
            toastr.success(`Added ${item.name} to order`);
        }
        
        this.updateOrderTotals();
        this.renderCurrentOrder();
    }

    removeItemFromOrder(itemId) {
        const index = this.currentOrder.items.findIndex(item => item.id === itemId);
        
        if (index !== -1) {
            const itemName = this.currentOrder.items[index].name;
            this.currentOrder.items.splice(index, 1);
            this.updateOrderTotals();
            this.renderCurrentOrder();
            toastr.warning(`Removed ${itemName} from order`);
        }
    }

    updateItemQuantity(itemId, newQuantity) {
        const item = this.currentOrder.items.find(item => item.id === itemId);
        
        if (item && newQuantity > 0) {
            item.quantity = newQuantity;
            this.updateOrderTotals();
            this.renderCurrentOrder();
        } else if (item && newQuantity <= 0) {
            this.removeItemFromOrder(itemId);
        }
    }

    updateOrderTotals() {
        // Calculate subtotal
        this.currentOrder.subtotal = this.currentOrder.items.reduce(
            (total, item) => total + (item.price * item.quantity), 0
        );
        
        // Calculate tax
        this.currentOrder.tax = this.currentOrder.subtotal * (this.settings.taxRate / 100);
        
        // Calculate total
        this.currentOrder.total = this.currentOrder.subtotal + this.currentOrder.tax;
    }

    renderCurrentOrder() {
        const orderItemsContainer = document.querySelector('.order-items');
        
        if (!orderItemsContainer) return;
        
        orderItemsContainer.innerHTML = '';
        
        if (this.currentOrder.items.length === 0) {
            orderItemsContainer.innerHTML = '<p class="empty-order">No items added</p>';
        } else {
            this.currentOrder.items.forEach(item => {
                const orderItemElement = document.createElement('div');
                orderItemElement.className = 'order-item animate__animated animate__fadeInRight';
                orderItemElement.innerHTML = `
                    <div class="order-item-details">
                        <div class="order-item-name">${item.name}</div>
                        <div class="order-item-price">${this.settings.currency}${item.price.toFixed(2)} x 
                            <input type="number" class="quantity-input" value="${item.quantity}" min="1">
                        </div>
                    </div>
                    <div class="order-item-total">${this.settings.currency}${(item.price * item.quantity).toFixed(2)}</div>
                    <div class="order-item-actions">
                        <button class="remove-item"><i class="fas fa-times"></i></button>
                    </div>
                `;
                
                // Setup quantity change
                const quantityInput = orderItemElement.querySelector('.quantity-input');
                quantityInput.addEventListener('change', (e) => {
                    const newQuantity = parseInt(e.target.value);
                    this.updateItemQuantity(item.id, newQuantity);
                });
                
                // Setup remove button
                const removeButton = orderItemElement.querySelector('.remove-item');
                removeButton.addEventListener('click', () => this.removeItemFromOrder(item.id));
                
                orderItemsContainer.appendChild(orderItemElement);
            });
        }
        
        // Update the order summary
        document.getElementById('subtotal').textContent = this.currentOrder.subtotal.toFixed(2);
        document.getElementById('tax').textContent = this.currentOrder.tax.toFixed(2);
        document.getElementById('total').textContent = this.currentOrder.total.toFixed(2);
    }

    clearOrder() {
        Swal.fire({
            title: 'Clear Order',
            text: 'Are you sure you want to clear the current order?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f44336',
            cancelButtonColor: '#6a1b9a',
            confirmButtonText: 'Yes, clear it!',
            cancelButtonText: 'No, keep it'
        }).then((result) => {
            if (result.isConfirmed) {
                this.currentOrder = {
                    items: [],
                    subtotal: 0,
                    tax: 0,
                    total: 0
                };
                this.renderCurrentOrder();
                toastr.success('Order cleared successfully');
            }
        });
    }

    showPaymentModal() {
        if (this.currentOrder.items.length === 0) {
            Swal.fire({
                title: 'Empty Order',
                text: 'Please add items to the order before processing payment.',
                icon: 'info',
                confirmButtonColor: '#6a1b9a'
            });
            return;
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        // Clone payment modal template
        const template = document.getElementById('payment-modal-template');
        const modalContent = template.content.cloneNode(true);
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Set payment amount
        document.getElementById('payment-amount').textContent = this.currentOrder.total.toFixed(2);
        
        // Setup payment method selection
        const paymentMethods = modal.querySelectorAll('.payment-methods button');
        let selectedMethod = 'cash'; // Default
        
        paymentMethods.forEach(button => {
            button.addEventListener('click', () => {
                paymentMethods.forEach(b => b.classList.remove('selected'));
                button.classList.add('selected');
                selectedMethod = button.getAttribute('data-method');
                
                // Show/hide cash input
                const cashInput = document.getElementById('cash-input');
                if (selectedMethod === 'cash') {
                    cashInput.classList.remove('hidden');
                    cashInput.classList.add('animate__animated', 'animate__fadeIn');
                } else {
                    cashInput.classList.add('hidden');
                }
            });
        });
        
        // Select cash by default
        paymentMethods[0].classList.add('selected');
        
        // Setup cash amount input
        const cashAmountInput = document.getElementById('cash-amount');
        if (cashAmountInput) {
            cashAmountInput.addEventListener('input', () => {
                const cashAmount = parseFloat(cashAmountInput.value) || 0;
                const change = cashAmount - this.currentOrder.total;
                document.getElementById('change').textContent = change >= 0 ? change.toFixed(2) : '0.00';
            });
        }
        
        // Setup cancel button
        const cancelButton = document.getElementById('cancel-payment');
        cancelButton.addEventListener('click', () => {
            modal.classList.add('animate__animated', 'animate__fadeOut');
            setTimeout(() => {
                document.body.removeChild(modal);
            }, 300);
        });
        
        // Setup complete button
        const completeButton = document.getElementById('complete-payment');
        completeButton.addEventListener('click', () => {
            if (selectedMethod === 'cash') {
                const cashAmount = parseFloat(cashAmountInput.value) || 0;
                if (cashAmount < this.currentOrder.total) {
                    Swal.fire({
                        title: 'Insufficient Cash',
                        text: 'Cash amount is less than the total amount.',
                        icon: 'error',
                        confirmButtonColor: '#6a1b9a'
                    });
                    return;
                }
            }
            
            // Process the order
            this.processOrder(selectedMethod);
            
            // Close the modal
            modal.classList.add('animate__animated', 'animate__fadeOut');
            setTimeout(() => {
                document.body.removeChild(modal);
            }, 300);
        });
    }

    processOrder(paymentMethod) {
        // Create a new order in the database
        const order = db.createOrder(
            this.currentOrder.items,
            this.currentOrder.subtotal,
            this.currentOrder.tax,
            this.currentOrder.total,
            paymentMethod
        );
        
        // Print or display receipt (enhanced)
        Swal.fire({
            title: 'Order Completed!',
            html: `
                <div class="receipt">
                    <h3>${this.settings.cafeName}</h3>
                    <p>Order #${order.id}</p>
                    <p>${new Date(order.date).toLocaleString()}</p>
                    <hr>
                    <div class="receipt-items">
                        ${order.items.map(item => `
                            <div class="receipt-item">
                                <span>${item.quantity} x ${item.name}</span>
                                <span>${this.settings.currency}${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <hr>
                    <div class="receipt-totals">
                        <div><span>Subtotal:</span> <span>${this.settings.currency}${order.subtotal.toFixed(2)}</span></div>
                        <div><span>Tax (${this.settings.taxRate}%):</span> <span>${this.settings.currency}${order.tax.toFixed(2)}</span></div>
                        <div class="receipt-total"><span>Total:</span> <span>${this.settings.currency}${order.total.toFixed(2)}</span></div>
                        <div><span>Payment Method:</span> <span>${paymentMethod.toUpperCase()}</span></div>
                    </div>
                    <hr>
                    <p>Thank you for your purchase!</p>
                </div>
            `,
            icon: 'success',
            confirmButtonText: 'Print',
            showCancelButton: true,
            cancelButtonText: 'Close',
            confirmButtonColor: '#6a1b9a',
            cancelButtonColor: '#9e9e9e'
        }).then((result) => {
            if (result.isConfirmed) {
                window.print();
            }
        });
        
        // Clear the current order
        this.currentOrder = {
            items: [],
            subtotal: 0,
            tax: 0,
            total: 0
        };
        this.renderCurrentOrder();
    }

    // Inventory Page Functions
    initInventoryPage() {
        this.loadInventoryItems();
        this.setupInventoryActions();
    }

    loadInventoryItems() {
        const inventoryItems = db.getInventory();
        const inventoryList = document.getElementById('inventory-list');
        
        if (!inventoryList) return;
        
        inventoryList.innerHTML = '';
        
        inventoryItems.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'animate__animated animate__fadeIn';
            row.style.animationDelay = `${index * 0.05}s`;
            
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
                    <button class="action-btn edit-btn ripple" data-id="${item.id}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="action-btn delete-btn ripple" data-id="${item.id}"><i class="fas fa-trash"></i> Delete</button>
                </td>
            `;
            
            inventoryList.appendChild(row);
        });
        
        // Setup edit buttons
        const editButtons = document.querySelectorAll('.edit-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', () => {
                const itemId = parseInt(button.getAttribute('data-id'));
                this.showEditInventoryModal(itemId);
            });
        });
        
        // Setup delete buttons
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', () => {
                const itemId = parseInt(button.getAttribute('data-id'));
                if (confirm('Are you sure you want to delete this item?')) {
                    db.deleteInventoryItem(itemId);
                    this.loadInventoryItems(); // Refresh the list
                }
            });
        });
    }

    setupInventoryActions() {
        const addItemButton = document.getElementById('add-item');
        if (addItemButton) {
            addItemButton.addEventListener('click', () => this.showAddInventoryModal());
        }
        
        const updateStockButton = document.getElementById('update-stock');
        if (updateStockButton) {
            updateStockButton.addEventListener('click', () => this.showUpdateStockModal());
        }
    }

    showAddInventoryModal() {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Add Inventory Item</h2>
                <form id="add-inventory-form">
                    <div class="form-control">
                        <label for="item-name">Item Name</label>
                        <input type="text" id="item-name" required>
                    </div>
                    <div class="form-control">
                        <label for="item-category">Category</label>
                        <select id="item-category" required>
                            <option value="ingredients">Ingredients</option>
                            <option value="bakery">Bakery</option>
                            <option value="food">Food</option>
                            <option value="supplies">Supplies</option>
                        </select>
                    </div>
                    <div class="form-control">
                        <label for="item-stock">Current Stock</label>
                        <input type="number" id="item-stock" min="0" required>
                    </div>
                    <div class="form-control">
                        <label for="item-unit">Unit</label>
                        <input type="text" id="item-unit" required>
                    </div>
                    <div class="form-control">
                        <label for="item-reorder">Reorder Level</label>
                        <input type="number" id="item-reorder" min="0" required>
                    </div>
                    <div class="modal-actions">
                        <button type="button" id="cancel-add">Cancel</button>
                        <button type="submit">Add Item</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup form submission with enhanced UX
        const form = document.getElementById('add-inventory-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Show loading
            Swal.fire({
                title: 'Adding item...',
                text: 'Please wait',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            const newItem = {
                name: document.getElementById('item-name').value,
                category: document.getElementById('item-category').value,
                stock: parseInt(document.getElementById('item-stock').value),
                unit: document.getElementById('item-unit').value,
                reorderLevel: parseInt(document.getElementById('item-reorder').value)
            };
            
            // Simulate a slight delay to show the loading state
            setTimeout(() => {
                db.addInventoryItem(newItem);
                this.loadInventoryItems(); // Refresh the list
                document.body.removeChild(modal);
                
                // Show success message
                Swal.fire({
                    title: 'Success!',
                    text: `${newItem.name} has been added to inventory.`,
                    icon: 'success',
                    confirmButtonColor: '#6a1b9a'
                });
            }, 800);
        });
        
        // Setup cancel button
        const cancelButton = document.getElementById('cancel-add');
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    showEditInventoryModal(itemId) {
        const item = db.getInventoryItem(itemId);
        
        if (!item) {
            alert('Item not found');
            return;
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Edit Inventory Item</h2>
                <form id="edit-inventory-form">
                    <div class="form-control">
                        <label for="edit-item-name">Item Name</label>
                        <input type="text" id="edit-item-name" value="${item.name}" required>
                    </div>
                    <div class="form-control">
                        <label for="edit-item-category">Category</label>
                        <select id="edit-item-category" required>
                            <option value="ingredients" ${item.category === 'ingredients' ? 'selected' : ''}>Ingredients</option>
                            <option value="bakery" ${item.category === 'bakery' ? 'selected' : ''}>Bakery</option>
                            <option value="food" ${item.category === 'food' ? 'selected' : ''}>Food</option>
                            <option value="supplies" ${item.category === 'supplies' ? 'selected' : ''}>Supplies</option>
                        </select>
                    </div>
                    <div class="form-control">
                        <label for="edit-item-stock">Current Stock</label>
                        <input type="number" id="edit-item-stock" value="${item.stock}" min="0" required>
                    </div>
                    <div class="form-control">
                        <label for="edit-item-unit">Unit</label>
                        <input type="text" id="edit-item-unit" value="${item.unit}" required>
                    </div>
                    <div class="form-control">
                        <label for="edit-item-reorder">Reorder Level</label>
                        <input type="number" id="edit-item-reorder" value="${item.reorderLevel}" min="0" required>
                    </div>
                    <div class="modal-actions">
                        <button type="button" id="cancel-edit">Cancel</button>
                        <button type="submit">Save Changes</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup form submission
        const form = document.getElementById('edit-inventory-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const updatedItem = {
                id: itemId,
                name: document.getElementById('edit-item-name').value,
                category: document.getElementById('edit-item-category').value,
                stock: parseInt(document.getElementById('edit-item-stock').value),
                unit: document.getElementById('edit-item-unit').value,
                reorderLevel: parseInt(document.getElementById('edit-item-reorder').value)
            };
            
            db.updateInventoryItem(updatedItem);
            this.loadInventoryItems(); // Refresh the list
            document.body.removeChild(modal);
        });
        
        // Setup cancel button
        const cancelButton = document.getElementById('cancel-edit');
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    showUpdateStockModal() {
        // Create modal with a list of all inventory items
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Update Stock</h2>
                <form id="update-stock-form">
                    <div class="inventory-list">
                        <table>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Current Stock</th>
                                    <th>New Stock</th>
                                </tr>
                            </thead>
                            <tbody id="stock-update-list"></tbody>
                        </table>
                    </div>
                    <div class="modal-actions">
                        <button type="button" id="cancel-update">Cancel</button>
                        <button type="submit">Update Stock</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Populate the list with inventory items
        const stockUpdateList = document.getElementById('stock-update-list');
        const inventoryItems = db.getInventory();
        
        inventoryItems.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.stock} ${item.unit}</td>
                <td>
                    <input type="number" class="stock-input" data-id="${item.id}" value="${item.stock}" min="0">
                </td>
            `;
            stockUpdateList.appendChild(row);
        });
        
        // Setup form submission
        const form = document.getElementById('update-stock-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const stockInputs = document.querySelectorAll('.stock-input');
            stockInputs.forEach(input => {
                const itemId = parseInt(input.getAttribute('data-id'));
                const newStock = parseInt(input.value);
                
                const item = db.getInventoryItem(itemId);
                item.stock = newStock;
                db.updateInventoryItem(item);
            });
            
            this.loadInventoryItems(); // Refresh the list
            document.body.removeChild(modal);
        });
        
        // Setup cancel button
        const cancelButton = document.getElementById('cancel-update');
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    // Reports Page Functions
    initReportsPage() {
        this.setupReportOptions();
        this.loadDailySalesReport(); // Load default report
    }

    setupReportOptions() {
        const reportButtons = document.querySelectorAll('.report-options button');
        reportButtons.forEach(button => {
            button.addEventListener('click', () => {
                const reportType = button.getAttribute('data-report');
                
                // Update active button
                reportButtons.forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                
                // Load the appropriate report
                switch (reportType) {
                    case 'daily':
                        this.loadDailySalesReport();
                        break;
                    case 'weekly':
                        this.loadWeeklySalesReport();
                        break;
                    case 'monthly':
                        this.loadMonthlySalesReport();
                        break;
                    case 'popular':
                        this.loadPopularItemsReport();
                        break;
                }
            });
        });
        
        // Activate the first button by default
        reportButtons[0].classList.add('active');
    }

    loadDailySalesReport() {
        const today = new Date();
        const sales = db.getDailySales(today);
        
        const reportDetails = document.getElementById('report-details');
        if (!reportDetails) return;
        
        // Create summary
        const totalRevenue = sales.reduce((sum, order) => sum + order.total, 0);
        
        reportDetails.innerHTML = `
            <h3 class="animate__animated animate__fadeIn">Daily Sales (${today.toLocaleDateString()})</h3>
            <div class="report-summary animate__animated animate__fadeIn">
                <div class="summary-item">
                    <span class="summary-label">Total Orders</span>
                    <span class="summary-value">${sales.length}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Total Revenue</span>
                    <span class="summary-value">${this.settings.currency}${totalRevenue.toFixed(2)}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Average Order</span>
                    <span class="summary-value">${this.settings.currency}${sales.length ? (totalRevenue / sales.length).toFixed(2) : '0.00'}</span>
                </div>
            </div>
            <div class="animate__animated animate__fadeIn" style="animation-delay: 0.2s;">
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Time</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Payment</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sales.map(order => `
                            <tr>
                                <td>${order.id}</td>
                                <td>${new Date(order.date).toLocaleTimeString()}</td>
                                <td>${order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                                <td>${this.settings.currency}${order.total.toFixed(2)}</td>
                                <td>${order.paymentMethod}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        // Create chart
        const reportChart = document.getElementById('report-chart');
        if (reportChart) {
            // Clear previous chart if exists
            if (this.charts.dailyChart) {
                this.charts.dailyChart.destroy();
            }
            
            // Group orders by hour
            const hourlyData = new Array(24).fill(0);
            const hourlyLabels = [];
            
            for (let i = 0; i < 24; i++) {
                const hour = i % 12 || 12;
                const ampm = i < 12 ? 'AM' : 'PM';
                hourlyLabels.push(`${hour} ${ampm}`);
            }
            
            sales.forEach(order => {
                const orderHour = new Date(order.date).getHours();
                hourlyData[orderHour] += order.total;
            });
            
            const ctx = document.createElement('canvas');
            reportChart.innerHTML = '';
            reportChart.appendChild(ctx);
            
            this.charts.dailyChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: hourlyLabels,
                    datasets: [{
                        label: 'Sales by Hour',
                        data: hourlyData,
                        backgroundColor: 'rgba(156, 39, 176, 0.6)',
                        borderColor: 'rgba(156, 39, 176, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 1000,
                        easing: 'easeOutQuart'
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Sales by Hour'
                        },
                        legend: {
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => `${this.settings.currency}${value}`
                            }
                        }
                    }
                }
            });
        }
    }

    loadWeeklySalesReport() {
        // Get the start of the current week (Sunday)
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Go to Sunday
        startOfWeek.setHours(0, 0, 0, 0);
        
        const sales = db.getWeeklySales(startOfWeek);
        
        // Group sales by day
        const dailySales = {};
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        // Initialize all days with zero
        days.forEach(day => {
            dailySales[day] = {
                count: 0,
                revenue: 0
            };
        });
        
        // Fill in actual data
        sales.forEach(order => {
            const orderDate = new Date(order.date);
            const dayName = days[orderDate.getDay()];
            
            dailySales[dayName].count++;
            dailySales[dayName].revenue += order.total;
        });
        
        const reportDetails = document.getElementById('report-details');
        if (!reportDetails) return;
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        reportDetails.innerHTML = `
            <h3>Weekly Sales (${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()})</h3>
            <div class="report-summary">
                <div class="summary-item">
                    <span class="summary-label">Total Orders:</span>
                    <span class="summary-value">${sales.length}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Total Revenue:</span>
                    <span class="summary-value">${this.settings.currency}${sales.reduce((sum, order) => sum + order.total, 0).toFixed(2)}</span>
                </div>
            </div>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Day</th>
                        <th>Orders</th>
                        <th>Revenue</th>
                    </tr>
                </thead>
                <tbody>
                    ${days.map(day => `
                        <tr>
                            <td>${day}</td>
                            <td>${dailySales[day].count}</td>
                            <td>${this.settings.currency}${dailySales[day].revenue.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        // Simple chart visualization would go here
        const reportChart = document.getElementById('report-chart');
        reportChart.innerHTML = '<div class="placeholder-chart">Weekly sales chart would appear here</div>';
    }

    loadMonthlySalesReport() {
        const today = new Date();
        const currentMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
        const currentYear = today.getFullYear();
        
        const sales = db.getMonthlySales(currentYear, currentMonth);
        
        // Group by week
        const weeklySales = [
            { name: 'Week 1', count: 0, revenue: 0 },
            { name: 'Week 2', count: 0, revenue: 0 },
            { name: 'Week 3', count: 0, revenue: 0 },
            { name: 'Week 4', count: 0, revenue: 0 },
            { name: 'Week 5', count: 0, revenue: 0 } // Some months have a partial 5th week
        ];
        
        sales.forEach(order => {
            const orderDate = new Date(order.date);
            const day = orderDate.getDate();
            
            // Determine which week the order belongs to
            let weekIndex = Math.floor((day - 1) / 7);
            if (weekIndex > 4) weekIndex = 4; // Assign to Week 5 if needed
            
            weeklySales[weekIndex].count++;
            weeklySales[weekIndex].revenue += order.total;
        });
        
        const reportDetails = document.getElementById('report-details');
        if (!reportDetails) return;
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        reportDetails.innerHTML = `
            <h3>Monthly Sales (${monthNames[currentMonth - 1]} ${currentYear})</h3>
            <div class="report-summary">
                <div class="summary-item">
                    <span class="summary-label">Total Orders:</span>
                    <span class="summary-value">${sales.length}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Total Revenue:</span>
                    <span class="summary-value">${this.settings.currency}${sales.reduce((sum, order) => sum + order.total, 0).toFixed(2)}</span>
                </div>
            </div>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Week</th>
                        <th>Orders</th>
                        <th>Revenue</th>
                    </tr>
                </thead>
                <tbody>
                    ${weeklySales.map(week => `
                        <tr>
                            <td>${week.name}</td>
                            <td>${week.count}</td>
                            <td>${this.settings.currency}${week.revenue.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        // Simple chart visualization would go here
        const reportChart = document.getElementById('report-chart');
        reportChart.innerHTML = '<div class="placeholder-chart">Monthly sales chart would appear here</div>';
    }

    loadPopularItemsReport() {
        // Get popular items for the current month
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const popularItems = db.getPopularItems(startOfMonth);
        
        const reportDetails = document.getElementById('report-details');
        if (!reportDetails) return;
        
        reportDetails.innerHTML = `
            <h3>Popular Items (This Month)</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Quantity Sold</th>
                    </tr>
                </thead>
                <tbody>
                    ${popularItems.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.count}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        // Simple chart visualization would go here
        const reportChart = document.getElementById('report-chart');
        reportChart.innerHTML = '<div class="placeholder-chart">Popular items chart would appear here</div>';
    }

    // Settings Page Functions
    initSettingsPage() {
        this.loadSettings();
        this.setupSettingsForm();
        this.setupBackupRestore();
    }

    loadSettings() {
        const settings = db.getSettings();
        
        if (settings) {
            document.getElementById('cafe-name').value = settings.cafeName;
            document.getElementById('tax-rate').value = settings.taxRate;
        }
    }

    setupSettingsForm() {
        const settingsForm = document.getElementById('settings-form');
        
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const updatedSettings = {
                    cafeName: document.getElementById('cafe-name').value,
                    taxRate: parseFloat(document.getElementById('tax-rate').value),
                    currency: this.settings.currency // Keep the current currency
                };
                
                // Add loading indicator
                Swal.fire({
                    title: 'Saving settings...',
                    text: 'Please wait',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
                
                // Simulate a slight delay for better UX
                setTimeout(() => {
                    db.updateSettings(updatedSettings);
                    this.settings = updatedSettings;
                    
                    Swal.fire({
                        title: 'Success!',
                        text: 'Settings updated successfully!',
                        icon: 'success',
                        confirmButtonColor: '#6a1b9a'
                    });
                }, 800);
            });
        }
    }

    setupBackupRestore() {
        const backupButton = document.getElementById('backup-data');
        if (backupButton) {
            backupButton.addEventListener('click', () => this.backupData());
        }
        
        const restoreButton = document.getElementById('restore-data');
        if (restoreButton) {
            restoreButton.addEventListener('click', () => this.restoreData());
        }
    }

    backupData() {
        const data = db.exportData();
        const dataStr = JSON.stringify(data);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileName = `shimmer_cafe_backup_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();
    }

    restoreData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    const success = db.importData(data);
                    
                    if (success) {
                        alert('Data restored successfully! The page will reload.');
                        window.location.reload();
                    } else {
                        alert('Failed to restore data. Invalid format.');
                    }
                } catch (error) {
                    alert('Failed to parse backup file.');
                    console.error(error);
                }
            };
            reader.readAsText(file);
        });
        
        input.click();
    }
}
