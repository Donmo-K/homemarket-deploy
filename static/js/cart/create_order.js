class OrderCreator {
    constructor() {
        this.setupContinueToPayment();
    }

    setupContinueToPayment() {
        const continueButton = document.getElementById('continue-to-payment');
        if (!continueButton) {
            console.error('Continue to payment button not found');
            return;
        }

        continueButton.addEventListener('click', () => {
            const cart = JSON.parse(localStorage.getItem('cart')) || {};
            const promoCode = document.getElementById('promo-code')?.value.trim() || '';
            const addressId = document.querySelector('input[name="address"]:checked')?.value;

            if (!addressId) {
                cartManager.showToast('Please select a shipping address.', 'error');
                return;
            }

            const items = Object.values(cart).map(item => ({
                product_id: item.id,
                quantity: item.quantity
            }));

            if (items.length === 0) {
                cartManager.showToast('Your cart is empty.', 'error');
                return;
            }

            const data = {
                currency: Object.values(cart)[0]?.price.currency || 'XOF',
                items: items,
                promo_code: promoCode,
                shipping_info_id: addressId
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
                    // Clear the cart
                    localStorage.removeItem('cart');
                    cartManager.cart = {};
                    cartManager.updateCartCount();
                    cartManager.renderCartItems();
                    cartManager.showToast(data.message, 'success');
                    // Redirect with order_id in query parameter
                    window.location.href = data.data.redirect_url;
                } else {
                    cartManager.showToast(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error creating order:', error);
                cartManager.showToast('An error occurred while creating the order.', 'error');
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new OrderCreator();
});