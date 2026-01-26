// soprescom/static/js/cart/buy_now.js
class BuyNowHandler {
    constructor() {
        this.cartManager = window.cartManager || {
            showToast: (message, type) => console.log(`${type}: ${message}`),
            updateCartCount: () => {},
            renderCartItems: () => {}
        };
        this.init();
    }

    init() {
        const container = document.getElementById('category-products-section') || document;
        console.log('BuyNowHandler initialized, attaching listener to:', container === document ? 'document' : '#category-products-section');
        container.addEventListener('click', (e) => {
            const button = e.target.closest('.quick-buy-btn');
            if (button) {
                e.preventDefault();
                console.log('Quick Buy button clicked:', button.getAttribute('data-product-id'));
                this.handleBuyNow(button);
            }
        });
        console.log('Quick Buy buttons found:', document.querySelectorAll('.quick-buy-btn').length);
    }

    async handleBuyNow(button) {
        if (!button || typeof button.getAttribute !== 'function') {
            console.error('Invalid button element:', button);
            this.showToast('Error: Invalid button element.', 'error');
            return;
        }

        const productId = button.getAttribute('data-product-id');
        if (!productId || !this.isValidUUID(productId)) {
            console.error('Invalid product ID:', productId);
            this.showToast('Error: Invalid product ID.', 'error');
            return;
        }

        // Adjust DOM traversal to match original structure
        const productCard = button.closest('.flex')?.parentElement?.parentElement || button.closest('.bg-white');
        if (!productCard) {
            console.error('Product card not found for product:', productId);
            this.showToast('Error: Product card not found.', 'error');
            return;
        }

        const quantitySelector = productCard.querySelector('.quantity-selector');
        if (!quantitySelector) {
            console.error('Quantity selector not found for product:', productId);
            this.showToast('Error: Quantity selector not found.', 'error');
            return;
        }

        const quantityDisplay = quantitySelector.querySelector('.quantity-display');
        if (!quantityDisplay) {
            console.error('Quantity display not found for product:', productId);
            this.showToast('Error: Quantity display not found.', 'error');
            return;
        }

        const quantity = parseInt(quantityDisplay.textContent);
        const maxQuantity = parseInt(quantitySelector.getAttribute('data-max-quantity'));

        if (isNaN(quantity) || quantity <= 0 || quantity > maxQuantity) {
            console.error('Invalid quantity:', { quantity, maxQuantity });
            this.showToast('Invalid quantity selected.', 'error');
            return;
        }

        try {
            const shippingInfo = await this.checkShippingInfo();
            if (!shippingInfo) {
                this.showToast('No shipping address found. Please add one.', 'info');
                this.showAddressModal(productId, quantity);
            } else {
                this.createOrder(productId, quantity, shippingInfo.id);
            }
        } catch (error) {
            console.error('Error checking shipping info:', error);
            this.showToast('An error occurred while checking shipping information.', 'error');
        }
    }

    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    async checkShippingInfo() {
        const response = await fetch(window.getShippingAddressesUrl, {
            method: 'GET',
            headers: {
                'X-CSRFToken': window.csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        if (data.status !== 'success') {
            throw new Error(data.message || 'Failed to fetch shipping addresses');
        }

        const addresses = data.shipping_addresses || [];
        return addresses.find(addr => addr.default_address) || addresses[0] || null;
    }

    showAddressModal(productId, quantity) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded-lg max-w-md w-full">
                <h2 class="text-xl font-bold mb-4">Add Shipping Address</h2>
                <form id="address-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Address</label>
                        <input type="text" name="address" required class="mt-1 block w-full border rounded-md p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Address Line 2 (optional)</label>
                        <input type="text" name="address2" class="mt-1 block w-full border rounded-md p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">City</label>
                        <input type="text" name="city" required class="mt-1 block w-full border rounded-md p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">State</label>
                        <input type="text" name="state" required class="mt-1 block w-full border rounded-md p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Zip Code</label>
                        <input type="text" name="zip_code" required class="mt-1 block w-full border rounded-md p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Country</label>
                        <input type="text" name="country" required class="mt-1 block w-full border rounded-md p-2">
                    </div>
                    <div class="flex items-center">
                        <input type="checkbox" name="default_address" id="default_address" class="mr-2">
                        <label for="default_address">Set as default address</label>
                    </div>
                    <div class="flex justify-end space-x-2">
                        <button type="button" class="cancel-btn bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400">Cancel</button>
                        <button type="submit" class="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark">Save Address</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        const form = modal.querySelector('#address-form');
        const cancelBtn = modal.querySelector('.cancel-btn');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveAddress(form, productId, quantity, modal);
        });

        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    async saveAddress(form, productId, quantity, modal) {
        const formData = new FormData(form);
        try {
            const response = await fetch(window.checkoutUrl, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': window.csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            });

            const text = await response.text();
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}, Response: ${text}`);
            }

            const shippingInfo = await this.checkShippingInfo();
            if (shippingInfo) {
                this.showToast('Address saved successfully.', 'success');
                modal.remove();
                this.createOrder(productId, quantity, shippingInfo.id);
            } else {
                this.showToast('Failed to retrieve new address.', 'error');
            }
        } catch (error) {
            console.error('Error saving address:', error);
            this.showToast('An error occurred while saving the address.', 'error');
        }
    }

    createOrder(productId, quantity, shippingInfoId) {
        if (!this.isValidUUID(productId)) {
            console.error('Invalid product ID in createOrder:', productId);
            this.showToast('Error: Invalid product ID.', 'error');
            return;
        }

        this.showToast('Creating your order...', 'info');

        const data = {
            currency: 'XOF',
            items: [{ product_id: productId, quantity }],
            promo_code: '',
            shipping_info_id: shippingInfoId
        };

        fetch(window.createOrderUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                this.showToast(data.message, 'success');
                window.location.href = data.data.redirect_url;
            } else {
                this.showToast(data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error creating order:', error);
            this.showToast('An error occurred while creating the order.', 'error');
        });
    }

    showToast(message, type) {
        if (window.toastManager && typeof window.toastManager.buildToast === 'function') {
            window.toastManager.buildToast()
                .setMessage(message)
                .setType(type)
                .show();
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BuyNowHandler();
});