document.addEventListener("DOMContentLoaded", function () {
    const showNewAddressBtn = document.getElementById("show-new-address");
    const newAddressForm = document.getElementById("new-address-form");

    if (showNewAddressBtn && newAddressForm) {
        showNewAddressBtn.addEventListener("click", function () {
            newAddressForm.classList.toggle("hidden");
        });
    }
    document.querySelectorAll('input[name="address"]').forEach(radio => {
        radio.addEventListener("change", function() {
            let addressId = this.value;

            fetch(window.setDefaultShippingUrl, { 
                method: "POST",
                headers: {
                    "X-CSRFToken": window.csrfToken,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    address_id: addressId
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                        window.cartManager.showToast("Default shipping address updated", "success");
                    
                } else {
                    if (window.cartManager) {
                        window.cartManager.showToast(data.error || "Failed to update shipping address", "error");
                    }
                }
            })
            .catch(err => {
                if (window.cartManager) {
                    window.cartManager.showToast("Network error while updating address", "error");
                } else {
                    window.cartManager.showToast("Network error", "error");
                }
            });
        });
    });
});

class ShippingSummary {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('cart')) || {};
        this.currency = Object.values(this.cart)[0]?.price.currency || 'XOF';
        this.renderSummary();
        this.setupPromoCode();
    }

    calculateSummary() {
        const items = Object.values(this.cart);
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        const subtotal = items.reduce((sum, item) => sum + item.price.amount * item.quantity, 0);
        const total = subtotal; // Total equals subtotal since shipping and tax are removed
        return { itemCount, subtotal, total };
    }

    renderSummary() {
        const { itemCount, subtotal, total } = this.calculateSummary();
        
        // Update summary values
        const itemCountElement = document.getElementById('item-count');
        const subtotalElement = document.getElementById('subtotal');
        const totalElement = document.getElementById('total');

        if (itemCountElement) itemCountElement.textContent = itemCount;
        if (subtotalElement) subtotalElement.textContent = `${this.currency} ${subtotal.toFixed(2)}`;
        if (totalElement) totalElement.textContent = `${this.currency} ${total.toFixed(2)}`;

        // Render cart items
        const cartItemsContainer = document.getElementById('cart-items');
        if (!cartItemsContainer) return;

        cartItemsContainer.innerHTML = '';
        if (itemCount === 0) {
            cartItemsContainer.innerHTML = `
                <div class="text-center py-10">
                    <p class="text-sm text-gray-500">Your cart is empty</p>
                    <a href="/" class="mt-4 inline-block bg-primary text-white font-montserrat font-semibold text-sm px-6 py-2 rounded-md hover:bg-blue-950 transition duration-200">
                        Browse Products
                    </a>
                </div>
            `;
            return;
        }

        Object.values(this.cart).forEach(item => {
            const itemHtml = `
                <div class="flex">
                    <div class="flex-shrink-0 h-16 w-16 border border-gray-200 rounded-md overflow-hidden">
                        <img src="${item.image}" alt="${item.name}" class="h-full w-full object-cover">
                    </div>
                    <div class="ml-4 flex-1">
                        <h4 class="text-sm font-medium">${item.name}</h4>
                        <p class="text-sm text-gray-500">Quatity: ${item.quantity}</p>
                        <p class="text-sm font-medium">${this.currency} ${(item.price.amount * item.quantity).toFixed(2)}</p>
                    </div>
                </div>
            `;
            cartItemsContainer.insertAdjacentHTML('beforeend', itemHtml);
        });
    }

    setupPromoCode() {
        const applyButton = document.getElementById('apply-promo');
        if (!applyButton) return;

        applyButton.addEventListener('click', () => {
            const promoCode = document.getElementById('promo-code').value.trim();
            if (promoCode) {
                // Placeholder for promo code logic (requires server-side validation)
                cartManager.showToast(`Promo code "${promoCode}" applied (placeholder)`, 'success');
                // TODO: Implement actual promo code logic with server-side validation
            } else {
                cartManager.showToast('Please enter a valid promo code', 'error');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ShippingSummary();
});