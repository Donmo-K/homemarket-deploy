class VerifyEmail {
    constructor() {
        this.errorMessage = document.getElementById('error-message') || document.createElement('div');
        if (!this.errorMessage.id) {
            this.errorMessage.id = 'error-message';
            this.errorMessage.className = 'text-red-500 mb-4 text-center';
            document.querySelector('.p-8')?.prepend(this.errorMessage);
        }
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.remove('hidden');
    }

    async verify(token) {
        try {
            const response = await fetch(`/users/verify-email/?token=${encodeURIComponent(token)}`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            if (data.status === 'success') {
                window.location.href = data.data.redirect_url || '/users/login/';
            } else {
                this.showError(data.message || 'Verification failed. Please try again.');
            }
        } catch (error) {
            this.showError('An unexpected error occurred. Please try again.');
            console.error('Verification error:', error);
        }
    }
}