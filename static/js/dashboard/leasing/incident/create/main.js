/**
 * Manages the incident creation page interactions and form submissions
 */
class CreateIncidentManager {
    constructor() {
        // Initialize forms
        this.incidentForm = document.getElementById('incident-form');

        // Initialize buttons
        this.saveButton = document.getElementById('save-button');
        this.discardButton = document.getElementById('discard-button');

        // Initialize section loader
        this.sectionLoader = new SectionLoaderManager(null, 'fill-tertiary', 0.3);

        // Initialize select2
        this.responsibleUserSelect = $('#responsible_user');
        this.deploymentSelect = $('#deployment');
        this.incidentTypeSelect = $('#incident_type');
        this.statusSelect = $('#status');

        // Initialize validators
        this.incidentValidators = [];

        // Setup event listeners
        this.setupEventListeners();

        // Initialize Select2
        this.setupSelect2();
    }

    /**
     * Set up event listeners for buttons and forms
     */
    setupEventListeners() {
        // Incident form submission
        this.incidentForm.addEventListener('submit', e => this.handleIncidentFormSubmit(e));

        // Save button submission
        this.saveButton.addEventListener('click', () => this.incidentForm.submit());

        // Discard button
        this.discardButton.addEventListener('click', () => {
            window.location.href = window.AppConfig.urls.incidentList;
        });
    }

    /**
     * Initialize Select2 for selects
     */
    setupSelect2() {
        this.responsibleUserSelect.select2({
            theme: 'tailwindcss-4',
            placeholder: gettext("Select a user (optional)"),
            allowClear: true,
            language: {
                noResults: function () {
                    return gettext("No results found");
                }
            }
        });
        this.deploymentSelect.select2({
            theme: 'tailwindcss-4',
            placeholder: gettext("Select a deployment"),
            allowClear: false,
            language: {
                noResults: function () {
                    return gettext("No results found");
                }
            }
        });
        this.incidentTypeSelect.select2({
            theme: 'tailwindcss-4',
            placeholder: gettext("Select an incident type"),
            allowClear: false,
            language: {
                noResults: function () {
                    return gettext("No results found");
                }
            }
        });
        this.statusSelect.select2({
            theme: 'tailwindcss-4',
            placeholder: gettext("Select a status"),
            allowClear: false,
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
     * Handle incident form submission
     * @param {Event} event - Form submission event
     */
    async handleIncidentFormSubmit(event) {
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

            await this.handleResponse(response, form, this.incidentValidators);

            window.toastManager.buildToast()
                .setMessage(gettext('Incident created successfully'))
                .setType('success')
                .setPosition('top-right')
                .setDuration(3000)
                .show();

            window.location.href = window.AppConfig.urls.incidentList;
        } catch (error) {
            this.handleError(error, gettext('Error creating incident'), gettext('Please correct the errors and try again.'));
        } finally {
            this.sectionLoader.hideLoader();
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
                            const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
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
 * Initialize CreateIncidentManager on DOM load
 */
document.addEventListener('DOMContentLoaded', () => {
    new CreateIncidentManager();
});
