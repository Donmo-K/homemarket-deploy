class PayNowHandler {
    constructor() {
        this.payNowButtons = document.querySelectorAll('.pay-now-btn');
        this.init();
    }

    init() {
        this.payNowButtons.forEach(button => {
            button.addEventListener('click', () => this.handlePayNow(button));
        });
    }

    async handlePayNow(button) {
        // Extract order ID from URL (e.g., /en/order/orders/<uuid>/)
        let orderId = this.getOrderIdFromUrl();
        console.log('Order ID from URL:', orderId); // Debug log

        if (!orderId || !this.isValidUUID(orderId)) {
            // Fallback to data-order-id
            orderId = button.getAttribute('data-order-id');
            console.log('Order ID from button:', orderId); // Debug log
            if (!orderId || !this.isValidUUID(orderId)) {
                console.error('Invalid order ID:', orderId);
                this.showToast('Error: Invalid order ID.', 'error');
                return;
            }
        }

        try {
            // Disable button to prevent multiple clicks
            button.disabled = true;
            button.textContent = 'Processing...';

            // Send order_id to payment endpoint
            console.log('Sending POST to payment with order_id:', orderId); // Debug log
            const response = await fetch(window.checkoutUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.csrfToken
                },
                body: JSON.stringify({ order_id: orderId })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            this.showToast('Redirecting to payment...', 'info');
            setTimeout(() => {
                window.location.href = window.checkoutUrl;
            }, 1000); // Delay for toast visibility
        } catch (error) {
            console.error('Error proceeding to payment:', error);
            this.showToast('Error: Unable to proceed to payment.', 'error');
            button.disabled = false;
            button.textContent = 'Pay Now';
        }
    }

    getOrderIdFromUrl() {
        const path = window.location.pathname;
        // Match /orders/<uuid>/ or /orders/<uuid>
        const match = path.match(/\/orders\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i);
        console.log('Path:', path, 'Match:', match); // Debug log
        return match ? match[1] : null;
    }

    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
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
    new PayNowHandler();
});