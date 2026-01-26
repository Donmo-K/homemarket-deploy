document.addEventListener("DOMContentLoaded", () => {
    // Check if Stripe and STRIPE_PUBLIC_KEY are available, retry if not
    function initStripePayment() {
        if (typeof Stripe === 'undefined') {
            console.error('Stripe is not loaded yet.');
            return false;
        }
        if (!window.STRIPE_PUBLIC_KEY) {
            console.error('STRIPE_PUBLIC_KEY is missing.');
            return false;
        }

        const payNowBtn = document.getElementById('pay-now');
        const payNowText = document.getElementById('pay-now-text');
        const payNowSpinner = document.getElementById('pay-now-spinner');
        const paymentMethodInputs = document.querySelectorAll('input[name="payment"]');

        if (!payNowBtn || !payNowText || !payNowSpinner) {
            console.error('Required payment button elements not found.');
            return false;
        }

        const stripe = Stripe(window.STRIPE_PUBLIC_KEY);
        console.log('Stripe initialized with key:', window.STRIPE_PUBLIC_KEY);

        // Toggle loading state for payment button
        function togglePayNowLoading(isLoading) {
            payNowBtn.disabled = isLoading;
            payNowSpinner.classList.toggle('hidden', !isLoading);
            payNowText.textContent = isLoading ? 'Processing...' : 'Pay Now';
        }

        // Show toast notification with fallback to console
        function showToast(message, type) {
            if (window.toastManager?.showToast) {
                window.toastManager.showToast({ message, type });
            } else if (window.cartManager?.showToast) {
                window.cartManager.showToast(message, type);
            } else {
                console.log(`${type.toUpperCase()}: ${message}`);
            }
        }

        // Initiate Stripe payment
        async function initiateStripePayment(orderId) {
            try {
                const currentPath = window.location.pathname.split('/')[1];
                const stripeUrl = `/${currentPath}/payment/stripe/`;

                const response = await fetch(stripeUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    },
                    body: JSON.stringify({ order_id: orderId }),
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.message || `Server error: ${response.status}`);
                }

                if (result.status === 'success') {
                    const { checkout_session_id } = result.data;
                    const { error } = await stripe.redirectToCheckout({ sessionId: checkout_session_id });
                    if (error) throw new Error(error.message);
                } else {
                    throw new Error(result.message || 'Failed to initiate Stripe payment.');
                }
            } catch (error) {
                throw new Error(error.message || 'An error occurred while processing the payment.');
            }
        }

        // Prevent multiple event listeners
        payNowBtn.replaceWith(payNowBtn.cloneNode(true));
        const newPayNowBtn = document.getElementById('pay-now');

        newPayNowBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            console.log('Pay Now button clicked');

            const selectedMethod = Array.from(paymentMethodInputs).find(input => input.checked)?.id;
            console.log('Selected payment method:', selectedMethod);

            if (!selectedMethod) {
                showToast('Please select a payment method.', 'error');
                return;
            }

            togglePayNowLoading(true);
            try {
                const orderId = payNowBtn.dataset.orderId || window.orderId;
                if (!orderId) {
                    throw new Error('Order ID not found.');
                }

                if (['bank-transfer', 'credit-card'].includes(selectedMethod)) {
                    await initiateStripePayment(orderId);
                } else {
                    showToast('Payment method coming soon!', 'info');
                }
            } catch (error) {
                showToast(error.message || 'An error occurred while processing the payment.', 'error');
            } finally {
                togglePayNowLoading(false);
            }
        });

        return true;
    }

    // Initialize or retry Stripe initialization
    if (!initStripePayment()) {
        console.warn('Waiting for Stripe to load...');
        const interval = setInterval(() => {
            if (initStripePayment()) {
                clearInterval(interval);
            }
        }, 300);
    }
});