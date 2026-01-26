class CartManager {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('cart')) || {};
        console.log('CartManager initialized. Cart items:', Object.keys(this.cart).length);
        this.updateCartCount();
        this.renderCartItems();
        this.setupCartDropdown();
    }

    setupCartDropdown() {
        const cartDropdowns = [
            {
                dropdown: document.querySelector('#navbar-cart-dropdown'),
                container: document.querySelector('#navbar-cart-dropdown-container'),
                itemsContainer: document.getElementById('navbar-cart-items')
            },
            {
                dropdown: document.querySelector('#navbar-cart-dropdown-mobile'),
                container: document.querySelector('#navbar-cart-dropdown-container-mobile'),
                itemsContainer: document.getElementById('navbar-cart-items-mobile')
            }
        ];

        const validDropdowns = cartDropdowns.filter(({dropdown, container, itemsContainer}) => {
            return dropdown && container && itemsContainer;
        });

        if (validDropdowns.length === 0) {
            console.error('No valid cart dropdowns found');
            return;
        }
        console.log('Cart dropdown setup complete for', validDropdowns.length, 'dropdowns');

        validDropdowns.forEach(({dropdown, container, itemsContainer}) => {
            dropdown.addEventListener('click', () => {
                console.log('Click detected, toggling dropdown for', dropdown.id);
                if (container.classList.contains('hidden')) {
                    this.renderCartDropdown(itemsContainer);
                    container.classList.remove('hidden');
                } else {
                    container.classList.add('hidden');
                }
            });
        });

        ['addToCart', 'removeFromCart'].forEach(method => {
            const original = this[method];
            this[method] = (...args) => {
                original.apply(this, args);
                validDropdowns.forEach(({itemsContainer}) => {
                    this.renderCartDropdown(itemsContainer);
                });
            };
        });
    }

    renderCartDropdown(container) {
        if (!container) {
            console.error('Cart dropdown container not provided');
            return;
        }
        console.log('Rendering cart dropdown. Cart items:', Object.keys(this.cart).length);

        container.innerHTML = '';
        if (Object.keys(this.cart).length === 0) {
            container.innerHTML = `
                <div class="text-center py-10">
                    <h2 class="font-montserrat font-semibold text-lg text-gray-700">${gettext("Your cart is empty")}</h2>
                    <p class="font-montserrat text-sm text-gray-500 mt-2">${gettext("Add some products to get started!")}</p>
                    <a href="/" class="mt-4 inline-block bg-primary text-white font-montserrat font-semibold text-sm px-6 py-2 rounded-md hover:bg-blue-950 transition duration-200">
                        ${gettext("Browse Products")}
                    </a>
                </div>
            `;
            return;
        }

        Object.values(this.cart).forEach(item => {
            const itemHtml = `
                <div class="flex items-center space-x-4 py-2 border-b border-gray-200">
                    <img src="${item.image}" alt="${item.name}" class="w-12 h-12 object-cover rounded-sm" />
                    <div class="flex-1">
                        <h3 class="font-montserrat font-medium text-sm">${item.name}</h3>
                        <p class="font-montserrat text-xs text-gray-500">${item.price.currency} ${item.price.amount.toFixed(2)}</p>
                    </div>
                    <button onclick="event.preventDefault(); cartManager.removeFromCart('${item.id}')" class="text-red-500 hover:text-red-700">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', itemHtml);
        });

        const total = Object.values(this.cart).reduce((sum, item) => sum + item.price.amount * item.quantity, 0).toFixed(2);
        const currency = Object.values(this.cart)[0]?.price.currency || 'XOF';
        container.insertAdjacentHTML('beforeend', `
            <div class="flex justify-between py-2">
                <span class="font-montserrat font-semibold text-sm">${gettext("Total:")}</span>
                <span class="font-montserrat font-semibold text-sm">${currency} ${total}</span>
            </div>
        `);
    }

    parsePrice(priceAmount) {
        const normalizedPrice = String(priceAmount).replace(',', '.');
        const floatValue = parseFloat(normalizedPrice);
        return isNaN(floatValue) ? 0 : floatValue;
    }

    addToCart(id, name, priceAmount, priceCurrency, image, category, quantity, reviews, avgRating) {
        console.log('addToCart called with ID:', id);
        if (this.cart[id]) {
            this.cart[id].quantity += parseInt(quantity);
            window.toastManager.buildToast()
                .setMessage(`${name} quantity updated in cart`)
                .setType('info')
                .show();
        } else {
            this.cart[id] = {
                id,
                name,
                price: { amount: this.parsePrice(priceAmount), currency: priceCurrency },
                image,
                category,
                quantity: parseInt(quantity),
                reviews: parseInt(reviews),
                avgRating: parseFloat(avgRating)
            };
            window.toastManager.buildToast()
                .setMessage(gettext(`%s has been added to your cart`).replace("%s", name))
                .setType('success')
                .show();
        }
        localStorage.setItem('cart', JSON.stringify(this.cart));
        this.updateCartCount();
        this.renderCartItems();
        
        // Removed automatic server sync - cart is now stored locally only
        // Server sync will happen only when user proceeds to checkout
    }

    async syncCartWithServer() {
        const items = Object.values(this.cart).map(item => ({
            product_id: item.id,
            quantity: item.quantity
        }));
        if (!items.length) return; // nothing to sync

        const getCookie = (name) => {
            let cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        };

        try {
            const response = await fetch(window.addToCartUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.csrfToken || getCookie('csrftoken'),
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    currency: 'XOF',
                    items: items
                })
            });
            const data = await response.json();
            if (data.status === 'success') {
                console.log('Cart synced with server:', data);
            } else {
                window.toastManager.buildToast()
                    .setMessage(data.message || 'Error syncing cart with server')
                    .setType('danger')
                    .show();
            }
        } catch (error) {
            console.error('Error syncing cart:', error);
            window.toastManager.buildToast()
                .setMessage('Error syncing cart with server')
                .setType('danger')
                .show();
        }
    }

    removeFromCart(id) {
        const itemName = this.cart[id]?.name;
        delete this.cart[id];
        localStorage.setItem('cart', JSON.stringify(this.cart));
        this.updateCartCount();
        this.renderCartItems();
        window.toastManager.buildToast()
            .setMessage(gettext(`"%s" has been removed from your cart`).replace("%s", itemName))
            .setType('success')
            .show();
        
        // Removed automatic server sync - cart is now stored locally only
    }

    updateCartCount() {
        const cartCount = Object.keys(this.cart).length;
        const cartNumbers = document.querySelectorAll('.cart-number');
        cartNumbers.forEach(cartNumber => {
            if (cartNumber) cartNumber.textContent = cartCount;
        });
    }

    calculateTotal() {
        const subtotal = Object.values(this.cart).reduce((sum, item) => sum + item.price.amount * item.quantity, 0);
        const currency = Object.values(this.cart)[0]?.price.currency || 'XOF';
        const subtotalElement = document.getElementById('cart-subtotal');
        const totalElement = document.getElementById('cart-total');
        if (subtotalElement) subtotalElement.textContent = `${currency} ${subtotal.toFixed(2)}`;
        if (totalElement) totalElement.textContent = `${currency} ${subtotal.toFixed(2)}`;
    }

    renderCartItems() {
        const container = document.getElementById('cart-items-container');
        if (!container) return;

        container.innerHTML = '';
        if (Object.keys(this.cart).length === 0) {
            container.innerHTML = `
                <div class="text-center py-10">
                    <h2 class="font-montserrat font-semibold text-lg text-gray-700">${gettext("Your cart is empty")}</h2>
                    <p class="font-montserrat text-sm text-gray-500 mt-2">${gettext("Add some products to get started!")}</p>
                    <a href="/" class="mt-4 inline-block bg-primary text-white font-montserrat font-semibold text-sm px-6 py-2 rounded-md hover:bg-blue-950 transition duration-200">
                        ${gettext("Browse Products")}
                    </a>
                </div>
            `;
            return;
        }

        Object.values(this.cart).forEach(item => {
            const itemHtml = `
                <div class="p-4">
                    <div class="flex flex-col md:flex-row md:items-center gap-4">
                        <div class="flex items-center md:w-5/12">
                            <button onclick="event.preventDefault(); cartManager.removeFromCart('${item.id}')" class="text-gray-400 hover:text-red-500 mr-4">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <img src="${item.image}" alt="${item.name}" class="w-20 h-20 object-cover rounded">
                            <div class="ml-4">
                                <h3 class="font-medium text-gray-800">${item.name}</h3>
                                <p class="text-sm text-gray-500">${item.category}</p>
                            </div>
                        </div>
                        <div class="md:w-2/12 text-center">
                            <span class="font-medium text-primary">${item.price.currency} ${item.price.amount.toFixed(2)}</span>
                            <span class="block md:hidden text-sm text-gray-500">Price</span>
                        </div>
                        <div class="md:w-3/12">
                            <div class="flex items-center justify-center quantity-selector" data-quantity="${item.quantity}" data-max-quantity="999">
                                <button class="minus-btn w-8 h-8 border border-gray-300 rounded-l-md flex items-center justify-center text-gray-600 hover:bg-gray-100" onclick="cartManager.decrementQuantity(this, '${item.id}')">
                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                                    </svg>
                                </button>
                                <input type="text" value="${item.quantity}" min="1" class="w-12 h-8 border-t border-b border-gray-300 text-center quantity-display">
                                <button class="plus-btn w-8 h-8 border border-gray-300 rounded-r-md flex items-center justify-center text-gray-600 hover:bg-gray-100" onclick="cartManager.incrementQuantity(this, '${item.id}')">
                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                            </div>
                            <span class="block md:hidden text-sm text-gray-500 text-center mt-1">Quantity</span>
                        </div>
                        <div class="md:w-2/12 text-right">
                            <span class="font-medium text-primary">${item.price.currency} ${(item.price.amount * item.quantity).toFixed(2)}</span>
                            <span class="block md:hidden text-sm text-gray-500">Subtotal</span>
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', itemHtml);
        });
        this.calculateTotal();
    }

    incrementQuantity(button, productId) {
        const selector = button.closest('.quantity-selector');
        const quantityDisplay = selector.querySelector('.quantity-display');
        let quantity = parseInt(selector.dataset.quantity, 10);

        quantity += 1;
        selector.dataset.quantity = quantity;
        quantityDisplay.value = quantity;
        this.cart[productId].quantity = quantity;
        localStorage.setItem('cart', JSON.stringify(this.cart));
        this.updateCartCount();
        this.renderCartItems();
        
        // Removed automatic server sync - cart is now stored locally only
    }

    decrementQuantity(button, productId) {
        const selector = button.closest('.quantity-selector');
        const quantityDisplay = selector.querySelector('.quantity-display');
        let quantity = parseInt(selector.dataset.quantity, 10);

        if (quantity > 1) {
            quantity -= 1;
            selector.dataset.quantity = quantity;
            quantityDisplay.value = quantity;
            this.cart[productId].quantity = quantity;
            localStorage.setItem('cart', JSON.stringify(this.cart));
            this.updateCartCount();
            this.renderCartItems();
            
            // Removed automatic server sync - cart is now stored locally only
        }
    }

    showToast(message, type = 'info') {
        // Check if toast manager is available
        if (window.toastManager && typeof window.toastManager.showToast === 'function') {
            window.toastManager.showToast({ message, type });
        } else {
            // Fallback to console log if toast manager is not available
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

const cartManager = new CartManager();