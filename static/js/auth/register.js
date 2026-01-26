class RegisterForm {
    constructor() {
        this.form = document.getElementById('register-form');
        this.passwordInput = document.getElementById('password');
        this.password2Input = document.getElementById('password2');
        this.togglePassword = document.getElementById('toggle-password');
        this.togglePassword2 = document.getElementById('toggle-password2');
        this.globalLoader = document.getElementById('global-loader');
        this.init();
    }

    init() {
        if (this.form) {
            this.form.addEventListener('submit', () => this.showLoading());
        }
        if (this.togglePassword) {
            this.togglePassword.addEventListener('click', () => this.togglePasswordVisibility('password', 'toggle-password'));
        }
        if (this.togglePassword2) {
            this.togglePassword2.addEventListener('click', () => this.togglePasswordVisibility('password2', 'toggle-password2'));
        }
    }

    showLoading() {
        if (this.globalLoader) {
            this.globalLoader.classList.remove('hidden');
        }
    }

    togglePasswordVisibility(inputId, toggleId) {
        const input = document.getElementById(inputId);
        const toggle = document.getElementById(toggleId);
        if (input.type === 'password') {
            input.type = 'text';
            toggle.innerHTML = `
                <svg class="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                    <path fill-rule="evenodd" d="M10 3C5.37 3 1.36 5.94 0 10c1.36 4.06 5.37 7 10 7s8.64-2.94 10-7c-1.36-4.06-5.37-7-10-7zm0 12a5 5 0 110-10 5 5 0 010 10z" clip-rule="evenodd"/>
                </svg>`;
        } else {
            input.type = 'password';
            toggle.innerHTML = `
                <svg class="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.232 5.946 14.232 3 10 3a9.97 9.97 0 00-4.879 1.25l-1.414-1.414zM10 5a5 5 0 015 5c0 .657-.127 1.286-.364 1.86l-1.414-1.414A3 3 0 0013 10a3 3 0 00-3-3c-.157 0-.313.012-.467.035L7.586 5.586A5.017 5.017 0 0110 5zm-4.879 1.25A9.97 9.97 0 000 10c1.36 4.06 5.37 7 10 7a9.97 9.97 0 004.879-1.25l-1.414-1.414A5.017 5.017 0 0110 15a5 5 0 01-5-5c0-.657.127-1.286.364-1.86l-1.414-1.414z" clip-rule="evenodd"/>
                </svg>`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new RegisterForm();
});