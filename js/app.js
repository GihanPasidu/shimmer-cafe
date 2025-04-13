/**
 * Shimmer Cafe - Main Application
 * Controls all UI interactions and business logic
 */

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
        console.log('Initializing Shimmer Cafe Application...');
        this.setupNavigation();
        this.loadPage(this.currentPage);
        this.addRippleEffect();
        this.applyTheme(this.settings.theme || 'purple');
    }

    setupToastr() {
        // Configure toastr notification library
        toastr.options = {
            closeButton: true,
            progressBar: true,
            positionClass: "toast-bottom-right",
            timeOut: 3000,
            showMethod: "fadeIn",
            hideMethod: "fadeOut",
            preventDuplicates: true
        };
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
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
                const methodName = `init${this.capitalizeFirstLetter(page)}Page`;
                if (this[methodName] && typeof this[methodName] === 'function') {
                    this[methodName]();
                } else {
                    console.warn(`Method ${methodName} not found`);
                }
            }, 300);
        } else {
            console.error(`Template for page ${page} not found`);
            mainContent.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Page not found</div>';
        }
    }

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // POS Page Functions
    initPosPage() {
        this.loadCategory('coffee'); // Load default category
        this.setupCategoryTabs();
        this.renderCurrentOrder();
        this.setupOrderActions();
    }

    setupCategoryTabs() {
        const categoryTabs = document.querySelectorAll('.category-tab');
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                categoryTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const category = tab.getAttribute('data-category');
                this.loadCategory(category);
            });
        });
    }

    loadCategory(category) {
        const menuItems = db.getMenuItemsByCategory(category);
        const menuContainer = document.querySelector('.menu-items');
        menuContainer.innerHTML = '';
        
        if (menuItems.length === 0) {
            menuContainer.innerHTML = '<p class="empty-category">No items found in this category</p>';
            return;
        }
        
        menuItems.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'menu-item animate__animated animate__fadeInUp';
            itemElement.style.animationDelay = `${index * 0.05}s`;
            itemElement.setAttribute('data-id', item.id);
            
            // Create the menu item content
            let imageContent = '';
            if (item.image) {
                imageContent = `<div class="menu-item-image">
                    <img src="images/${item.image}" alt="${item.name}" onerror="this.parentNode.innerHTML = '<span class=\\'item-initial\\'>${item.name.charAt(0)}</span>'">
                </div>`;
            } else {
                imageContent = `<div class="menu-item-image no-image">
                    <span class="item-initial">${item.name.charAt(0)}</span>
                </div>`;
            }
            
            const popularBadge = item.popular ? '<span class="popular-badge"><i class="fas fa-star"></i> Popular</span>' : '';
            
            itemElement.innerHTML = `
                ${popularBadge}
                ${imageContent}
                <div class="menu-item-name">${item.name}</div>
                <div class="menu-item-description">${item.description || ''}</div>
                <div class="menu-item-price">${this.settings.currency}${item.price.toFixed(2)}</div>
                <button class="add-to-order ripple"><i class="fas fa-plus"></i> Add</button>
            `;
            
            itemElement.querySelector('.add-to-order').addEventListener('click', () => this.addItemToOrder(item));
            menuContainer.appendChild(itemElement);
        });
    }

    setupOrderActions() {
        const clearOrderBtn = document.getElementById('clear-order');
        const processPaymentBtn = document.getElementById('process-payment');
        
        if (clearOrderBtn) {
            clearOrderBtn.addEventListener('click', () => this.clearOrder());
        }
        
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

    updateOrderTotals() {
        this.currentOrder.subtotal = this.currentOrder.items.reduce((total, item) => 
            total + (item.price * item.quantity), 0);
        
        this.currentOrder.tax = this.currentOrder.subtotal * (this.settings.taxRate / 100);
        this.currentOrder.total = this.currentOrder.subtotal + this.currentOrder.tax;
    }

    updateItemQuantity(itemId, quantity) {
        if (quantity < 1) {
            this.removeItemFromOrder(itemId);
            return;
        }
        
        const index = this.currentOrder.items.findIndex(item => item.id === itemId);
        if (index !== -1) {
            this.currentOrder.items[index].quantity = quantity;
            this.updateOrderTotals();
            this.renderCurrentOrder();
        }
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

    renderCurrentOrder() {
        const orderItemsContainer = document.querySelector('.order-items');
        
        if (!orderItemsContainer) return;
        
        orderItemsContainer.innerHTML = '';
        
        if (this.currentOrder.items.length === 0) {
            orderItemsContainer.innerHTML = '<p class="empty-order">Your order is empty</p>';
        } else {
            this.currentOrder.items.forEach((item, index) => {
                const orderItemElement = document.createElement('div');
                orderItemElement.className = 'order-item animate__animated animate__fadeInRight';
                orderItemElement.style.animationDelay = `${index * 0.05}s`;
                orderItemElement.innerHTML = `
                    <div class="order-item-details">
                        <div class="order-item-name">${item.name}</div>
                        <div class="order-item-price">${this.settings.currency}${item.price.toFixed(2)} x 
                            <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="99">
                        </div>
                    </div>
                    <div class="order-item-total">${this.settings.currency}${(item.price * item.quantity).toFixed(2)}</div>
                    <div class="order-item-actions">
                        <button class="remove-item ripple"><i class="fas fa-times"></i></button>
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
        
        // Update Process Payment button state
        const processPaymentBtn = document.getElementById('process-payment');
        if (processPaymentBtn) {
            if (this.currentOrder.items.length === 0) {
                processPaymentBtn.setAttribute('disabled', true);
                processPaymentBtn.classList.add('disabled');
            } else {
                processPaymentBtn.removeAttribute('disabled');
                processPaymentBtn.classList.remove('disabled');
            }
        }
    }

    clearOrder() {
        if (this.currentOrder.items.length === 0) return;
        
        Swal.fire({
            title: 'Clear Order',
            text: 'Are you sure you want to clear the current order?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f44336',
            cancelButtonColor: '#6a1b9a',
            confirmButtonText: 'Yes, clear it!',
            cancelButtonText: 'No, keep it',
            customClass: {
                container: 'swal-container'
            }
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
                    cashInput.querySelector('input').focus();
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
            cashAmountInput.value = this.currentOrder.total.toFixed(2);
            cashAmountInput.addEventListener('input', () => {
                const cashAmount = parseFloat(cashAmountInput.value) || 0;
                const change = cashAmount - this.currentOrder.total;
                document.getElementById('change').textContent = change >= 0 ? change.toFixed(2) : '0.00';
            });
            cashAmountInput.focus();
            cashAmountInput.select();
            
            // Trigger input event to calculate initial change
            const event = new Event('input');
            cashAmountInput.dispatchEvent(event);
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
        
        // Print or display receipt
        Swal.fire({
            title: 'Order Completed!',
            html: this.generateReceiptHTML(order),
            icon: 'success',
            confirmButtonText: 'Print Receipt',
            showCancelButton: true,
            cancelButtonText: 'Close',
            confirmButtonColor: '#6a1b9a',
            cancelButtonColor: '#9e9e9e',
            customClass: {
                popup: 'receipt-popup'
            }
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
    
    generateReceiptHTML(order) {
        return `
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
        `;
    }

    // ... Other page initializer methods and helper functions ...
    
    // Inventory Page
    initInventoryPage() {
        this.loadInventoryItems();
        this.setupInventoryActions();
    }
    
    // ... Continue with detailed implementation of other pages ...
    
    // Settings Page Functions
    initSettingsPage() {
        this.populateSettingsForm();
        this.setupSettingsForm();
    }
    
    populateSettingsForm() {
        const cafeNameInput = document.getElementById('cafe-name');
        const taxRateInput = document.getElementById('tax-rate');
        
        if (cafeNameInput) cafeNameInput.value = this.settings.cafeName || 'Shimmer Cafe';
        if (taxRateInput) taxRateInput.value = this.settings.taxRate || 10;
        
        // Add theme switcher
        const themeSelector = document.createElement('div');
        themeSelector.className = 'form-control';
        themeSelector.innerHTML = `
            <label for="theme-selector">Theme</label>
            <select id="theme-selector" class="input-effect">
                <option value="purple" ${this.settings.theme === 'purple' ? 'selected' : ''}>Purple (Default)</option>
                <option value="blue" ${this.settings.theme === 'blue' ? 'selected' : ''}>Blue</option>
                <option value="teal" ${this.settings.theme === 'teal' ? 'selected' : ''}>Teal</option>
                <option value="dark" ${this.settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
            </select>
        `;
        
        const firstSettingGroup = document.querySelector('.setting-group');
        if (firstSettingGroup) {
            firstSettingGroup.appendChild(themeSelector);
        }
        
        // Add animation toggle
        const animationToggle = document.createElement('div');
        animationToggle.className = 'form-control';
        animationToggle.innerHTML = `
            <label for="animation-toggle">Enable Animations</label>
            <div class="toggle-switch">
                <input type="checkbox" id="animation-toggle" ${this.settings.animations !== false ? 'checked' : ''}>
                <span class="toggle-slider"></span>
            </div>
        `;
        
        if (firstSettingGroup) {
            firstSettingGroup.appendChild(animationToggle);
        }
        
        // Add theme change listener
        const themeSelectorElement = document.getElementById('theme-selector');
        if (themeSelectorElement) {
            themeSelectorElement.addEventListener('change', (e) => {
                this.applyTheme(e.target.value);
            });
        }
    }
    
    setupSettingsForm() {
        const settingsForm = document.getElementById('settings-form');
        
        if (!settingsForm) return;
        
        // Setup backup button
        const backupButton = document.getElementById('backup-data');
        if (backupButton) {
            backupButton.addEventListener('click', () => {
                db.backupData();
                toastr.success('Data backup created successfully!');
            });
        }
        
        // Setup restore button
        const restoreButton = document.getElementById('restore-data');
        if (restoreButton) {
            restoreButton.addEventListener('click', () => {
                // Create file input for JSON upload
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = '.json';
                fileInput.style.display = 'none';
                document.body.appendChild(fileInput);
                
                fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            try {
                                const result = db.importData(event.target.result);
                                if (result) {
                                    // Update settings
                                    this.settings = db.getSettings();
                                    
                                    // Show success message
                                    Swal.fire({
                                        title: 'Success!',
                                        text: 'Data has been restored successfully. The page will now reload.',
                                        icon: 'success',
                                        confirmButtonColor: '#6a1b9a'
                                    }).then(() => {
                                        window.location.reload();
                                    });
                                } else {
                                    Swal.fire({
                                        title: 'Error',
                                        text: 'Failed to restore data. The file might be corrupted.',
                                        icon: 'error',
                                        confirmButtonColor: '#6a1b9a'
                                    });
                                }
                            } catch (error) {
                                console.error('Import error:', error);
                                Swal.fire({
                                    title: 'Error',
                                    text: 'Invalid backup file format.',
                                    icon: 'error',
                                    confirmButtonColor: '#6a1b9a'
                                });
                            }
                            document.body.removeChild(fileInput);
                        };
                        reader.readAsText(file);
                    }
                });
                
                fileInput.click();
            });
        }
        
        // Handle form submission
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const updatedSettings = {
                cafeName: document.getElementById('cafe-name').value,
                taxRate: parseFloat(document.getElementById('tax-rate').value),
                theme: document.getElementById('theme-selector').value,
                animations: document.getElementById('animation-toggle').checked
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
                this.applyTheme(updatedSettings.theme);
                
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
