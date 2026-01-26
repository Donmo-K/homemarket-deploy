/**
 * Manages the leasing client creation page interactions and form submissions
 */
class CreateLeasingClientManager {
    constructor() {
        // Initialize modal
        this.userModal = new Modal(document.getElementById('add-user-modal'), {
            backdrop: 'static',
            backdropClasses: 'bg-gray-900/50 fixed inset-0 z-[10000001]',
            closable: true
        });

        // Initialize forms
        this.leasingClientForm = document.getElementById('leasing-client-form');
        this.addUserForm = document.getElementById('add-user-form');

        // Initialize buttons
        this.addUserButton = document.getElementById('add-user-button');
        this.saveButton = document.getElementById('save-button');
        this.userSubmitButton = document.getElementById('user-submit-button');
        this.discardButton = document.getElementById('discard-button');

        // Initialize section loader
        this.sectionLoader = new SectionLoaderManager(null, 'fill-tertiary', 0.3);

        // Initialize select2
        this.userSelect = $('#user');

        // Initialize validators
        this.leasingClientValidators = [];
        this.userValidators = [];

        // Setup event listeners
        this.setupEventListeners();

        // Initialize Select2
        this.setupSelect2();
    }

    /**
     * Set up event listeners for buttons and forms
     */
    setupEventListeners() {
        // User form validators
        const userInputs = this.addUserForm.querySelectorAll('input');
        this.userValidators = Array.from(userInputs).map(input => {
            return new InputValidationManager(input, {
                iconErrors: ['required', 'format', 'server'],
                feedbackId: `${input.id}_feedback`
            });
        });

        // Leasing client form submission
        this.leasingClientForm.addEventListener('submit', e => this.handleLeasingClientFormSubmit(e));

        // Leasing client button submission
        this.saveButton.addEventListener('click', () => this.leasingClientForm.submit());

        // Add user button
        this.addUserButton.addEventListener('click', () => this.showUserModal());

        // User form submission
        this.userSubmitButton.addEventListener('click', e => this.handleUserFormSubmit(e));

        // Close user modal
        document.getElementById('close-user-modal').addEventListener('click', () => {
            if (!this.sectionLoader.isLoading()) {
                this.userModal.hide();
            }
        });

        // Discard button
        this.discardButton.addEventListener('click', () => {
            window.location.href = window.AppConfig.urls.clientList;
        });

        // Close modal on backdrop click
        window.addEventListener('click', event => {
            if (event.target === document.getElementById('add-user-modal') && !this.sectionLoader.isLoading()) {
                this.userModal.hide();
            }
        });
    }

    /**
     * Initialize Select2 for user select
     */
    setupSelect2() {
        this.userSelect.select2({
            theme: 'tailwindcss-4',
            placeholder: gettext("Select a user or add new"),
            allowClear: true,
            language: {
                noResults: function () {
                    return gettext("No results found");
                }
            }
        });
    }

    /**
     * Clear form errors and reset fields
     * @param {HTMLFormElement} form - The form to clear
     * @param {Array<InputValidationManager>} validators - Form validators
     */
    clearFormErrors(form, validators) {
        validators.forEach(validator => validator.clearErrors());
        $(form).find('.select2-hidden-accessible').select2('val', '');
    }

    /**
     * Handle leasing client form submission
     * @param {Event} event - Form submission event
     */
    async handleLeasingClientFormSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        this.sectionLoader.showLoader();

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': form.querySelector('[name=csrfmiddlewaretoken]').value
                }
            });

            await this.handleResponse(response, form, this.leasingClientValidators);

            window.toastManager.buildToast()
                .setMessage(gettext('Leasing client created successfully'))
                .setType('success')
                .setPosition('top-right')
                .setDuration(3000)
                .show();

            window.location.href = window.AppConfig.urls.clientList;
        } catch (error) {
            this.handleError(error, gettext('Error creating leasing client'), gettext('Please correct the errors and try again.'));
        } finally {
            this.sectionLoader.hideLoader();
        }
    }

    /**
     * Handle user form submission
     * @param {Event} event - Button click event
     */
    async handleUserFormSubmit(event) {
        event.preventDefault();
        const form = this.addUserForm;
        const formData = new FormData(form);

        this.sectionLoader.showLoader();

        try {
            const response = await fetch(window.AppConfig.urls.userAdd, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': form.querySelector('[name=csrfmiddlewaretoken]').value
                }
            });

            const data = await this.handleResponse(response, form, this.userValidators);

            // Add new user to select2 and select it
            const newOption = new Option(`${data.data.first_name} ${data.data.last_name} - ${data.data.email}`, data.data.id, true, true);
            this.userSelect.append(newOption).trigger('change');

            window.toastManager.buildToast()
                .setMessage(gettext('User added successfully'))
                .setType('success')
                .setPosition('top-right')
                .setDuration(3000)
                .show();

            this.clearFormErrors(form, this.userValidators);
            this.userModal.hide();
        } catch (error) {
            this.handleError(error, gettext('Error adding user'), gettext('Please correct the errors and try again.'));
        } finally {
            this.sectionLoader.hideLoader();
        }
    }

    /**
     * Show user creation modal
     */
    showUserModal() {
        this.addUserForm.reset();
        this.clearFormErrors(this.addUserForm, this.userValidators);
        this.userModal.show();
        const emailInput = document.getElementById('id_email');
        if (emailInput) {
            emailInput.focus();
        }
    }

    /**
     * Handle API response and display form errors
     * @param {Response} response - API response
     * @param {HTMLFormElement} form - Form element
     * @param {Array<InputValidationManager>|null} validators - Form validators
     * @returns {Promise<Object>} Parsed response data
     */
    async handleResponse(response, form, validators) {
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = {};
            }

            if (response.status === 400 && errorData?.errors) {
                this.clearFormErrors(form, validators);
                if (typeof errorData?.errors === 'string') {
                    throw new Error(errorData?.errors);
                } else {
                    let firstErrorInput = null;
                    Object.entries(errorData.errors).forEach(([field, messages]) => {
                        const input = form.querySelector(`[name="${field}"]`);
                        if (input && validators) {
                            const validator = validators.find(v => v.input === input);
                            if (validator) {
                                const errorMessages = Array.isArray(messages) ? messages : [messages];
                                validator.setInvalid(errorMessages.map(msg => ({type: 'server', message: msg})));
                            }
                            const inputs = Array.from(form.querySelectorAll('input, select'));
                            if (!firstErrorInput || inputs.indexOf(input) < inputs.indexOf(firstErrorInput)) {
                                firstErrorInput = input;
                            }
                        }
                    });
                    if (firstErrorInput) {
                        firstErrorInput.focus();
                    }
                }
                throw new Error(gettext('Invalid form data.'));
            }

            let message = errorData?.error || '';
            if (response.status === 403) {
                message = gettext('You are not authorized to perform this action.');
            } else if (response.status === 500) {
                message = gettext('Server error occurred. Please try again later.');
            }
            throw new Error(message);
        }

        return await response.json();
    }

    /**
     * Handle errors and display toast
     * @param {Error} error - Error object
     * @param {string} title - Error title
     * @param {string} message - Error message
     */
    handleError(error, title, message) {
        window.toastManager.buildToast()
            .setMessage(`${title}: ${error.message || message}`)
            .setType('danger')
            .setPosition('top-right')
            .setDuration(5000)
            .show();
    }
}

/**
 * Initialize CreateLeasingClientManager on DOM load
 */
document.addEventListener('DOMContentLoaded', () => {
    new CreateLeasingClientManager();
});
