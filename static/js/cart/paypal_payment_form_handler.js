document.addEventListener("DOMContentLoaded", () => {
    class PaypalPaymentHandler {
        constructor() {
            this.payNowBtn = document.getElementById("pay-now");
            this.payNowText = document.getElementById("pay-now-text");
            this.payNowSpinner = document.getElementById("pay-now-spinner");
            this.orderId = this.payNowBtn ? this.payNowBtn.dataset.orderId : null;
            this.initEventListeners();
            this.initializePaymentMethod(); // Initialize payment method immediately
        }

        initEventListeners() {
            if (this.payNowBtn) {
                this.payNowBtn.addEventListener("click", (e) => this.handlePayNowClick(e));
            }
            document.querySelectorAll('input[name="payment"]').forEach(method => {
                method.addEventListener("change", () => this.handlePaymentMethodChange());
            });
        }

        initializePaymentMethod() {
            const selectedMethod = document.querySelector('input[name="payment"]:checked')?.id;
            if (selectedMethod) {
                console.log("Initial payment method:", selectedMethod);
                // Ensure the parent div is marked as selected
                const parentDiv = document.querySelector(`#${selectedMethod}`)?.closest('.payment-method');
                if (parentDiv) {
                    document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('selected'));
                    parentDiv.classList.add('selected');
                }
            } else {
                console.warn("No payment method selected on page load");
            }
        }

        handlePaymentMethodChange() {
            const selectedMethod = document.querySelector('input[name="payment"]:checked')?.id;
            console.log("Selected payment method:", selectedMethod);
        }

        async handlePaypalPayment() {
            if (!this.orderId) {
                throw new Error("Order ID is missing.");
            }
            console.log(`Initiating PayPal payment for order_id: ${this.orderId}`);
            const response = await fetch(window.urls.payments.paypal_payment, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": this.getCsrfToken(),
                    "X-Requested-With": "XMLHttpRequest",
                },
                body: JSON.stringify({
                    action: "create_payment",
                    order_id: this.orderId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('PayPal error response:', errorData);
                if (errorData.message.includes("too small")) {
                    throw new Error("The order amount is too small for PayPal. Please add more items to your cart.");
                }
                throw new Error(errorData.message || "Failed to create PayPal payment.");
            }

            const result = await response.json();
            console.log("PayPal API response:", result);

            if (result.status === "success") {
                window.location.href = result.data.redirect_url;
            } else {
                this.handleError(result.message || "Failed to create PayPal payment.");
            }
        }

        async handleStripePayment() {
            if (!this.orderId) {
                throw new Error("Order ID is missing.");
            }
            if (typeof Stripe === 'undefined' || !window.STRIPE_PUBLIC_KEY) {
                throw new Error("Stripe is not properly loaded.");
            }
            const stripe = Stripe(window.STRIPE_PUBLIC_KEY);
            console.log(`Initiating Stripe payment for order_id: ${this.orderId}`);

            const response = await fetch(window.urls.payments.stripe_payment, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": this.getCsrfToken(),
                },
                body: JSON.stringify({ order_id: this.orderId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Server error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            if (result.status === 'success') {
                const { checkout_session_id } = result.data;
                const { error } = await stripe.redirectToCheckout({ sessionId: checkout_session_id });
                if (error) throw new Error(error.message);
            } else {
                throw new Error(result.message || 'Failed to initiate Stripe payment.');
            }
        }

        async handlePayNowClick(event) {
            event.preventDefault();
            const selectedMethod = document.querySelector('input[name="payment"]:checked')?.id;
            this.togglePayNowLoading(true);

            try {
                if (!selectedMethod) {
                    throw new Error("Please select a payment method.");
                }

                if (selectedMethod === "paypal") {
                    await this.handlePaypalPayment();
                } else if (["bank-transfer", "credit-card"].includes(selectedMethod)) {
                    await this.handleStripePayment();
                } else {
                    throw new Error("Invalid payment method selected.");
                }
            } catch (error) {
                this.handleError(error.message);
            } finally {
                this.togglePayNowLoading(false);
            }
        }

        togglePayNowLoading(isLoading) {
            this.payNowBtn.disabled = isLoading;
            this.payNowSpinner.classList.toggle("hidden", !isLoading);
            this.payNowText.textContent = isLoading ? "Processing..." : "Pay Now";
        }

        handleError(message) {
            console.error(`Error: ${message}`);
            if (typeof cartManager !== "undefined") {
                cartManager.showToast(message, "error");
            } else {
                alert(message);
            }
        }

        getCsrfToken() {
            const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
            return csrfInput ? csrfInput.value : null;
        }
    }

    // Initialize immediately
    new PaypalPaymentHandler();
});