/**
 * Manages the operation update page interactions and form submissions
 */
class UpdateOperationManager {
    constructor() {
        // Initialize forms
        this.operationForm = document.getElementById('operation-form');

        // Initialize buttons
        this.saveButton = document.getElementById('save-button');
        this.discardButton = document.getElementById('discard-button');

        // Initialize section loader
        this.sectionLoader = new SectionLoaderManager(null, 'fill-tertiary', 0.3);

        // Initialize consumable management
        this.consumableContainer = document.getElementById('consumable-usages-container');
        this.addConsumableButton = document.getElementById('add-consumable-button');
        this.consumableSelect = document.getElementById('consumable-select');

        // Track used consumables
        this.usedConsumables = new Set();
        this.consumableCounter = 0;

        // Setup event listeners
        this.setupEventListeners();
        this.initializeConsumableManagement();
        this.loadExistingConsumableUsages();
    }

    /**
     * Initialize consumable management
     */
    initializeConsumableManagement() {
        // Store original consumable options
        this.originalConsumableOptions = Array.from(this.consumableSelect.options).map(option => ({
            value: option.value,
            text: option.text,
            element: option.cloneNode(true)
        }));
    }

    /**
     * Load existing or submitted consumable usages
     */
    loadExistingConsumableUsages() {
        // First check if we have submitted form data
        if (window.submittedFormData && window.submittedFormData.consumable_usages) {
            const {consumable_ids, quantities, usage_ids} = window.submittedFormData.consumable_usages;

            for (let i = 0; i < consumable_ids.length; i++) {
                if (consumable_ids[i]) {
                    const consumable = this.originalConsumableOptions.find(
                        opt => opt.value === consumable_ids[i]
                    );

                    if (consumable) {
                        this.addConsumableUsage(
                            consumable_ids[i],
                            consumable,
                            quantities[i],
                            usage_ids[i]
                        );
                    }
                }
            }
        }
        // Otherwise load from existing usages
        else {
            const existingUsages = window.existingConsumableUsages || [];
            existingUsages.forEach(usage => {
                this.addConsumableUsage(usage.consumable_id, {
                    value: usage.consumable_id,
                    text: `${usage.consumable_reference} - ${usage.consumable_designation}`
                }, usage.quantity, usage.id);
            });
        }

        this.updateConsumableSelect();
    }

    /**
     * Set up event listeners for buttons and forms
     */
    setupEventListeners() {
        // Operation form submission
        this.operationForm.addEventListener('submit', e => this.handleOperationFormSubmit(e));

        // Save button
        this.saveButton.addEventListener('click', () => this.operationForm.submit());

        // Discard button
        this.discardButton.addEventListener('click', () => {
            window.location.href = window.AppConfig.urls.operationList;
        });

        // Add consumable button
        this.addConsumableButton.addEventListener('click', () => {
            const selectedOption = this.consumableSelect.options[this.consumableSelect.selectedIndex];
            if (selectedOption && selectedOption.value && selectedOption.value.trim() !== '') {
                this.addConsumableUsage(selectedOption.value);
                this.consumableSelect.selectedIndex = 0;
            }
        });
    }

    /**
     * Add a new consumable usage block
     * @param {string} consumableId - Optional consumable ID to pre-select
     * @param {Object} consumableData - Optional consumable data
     * @param {number} quantity - Optional quantity for existing usages
     * @param {string} usageId - Optional usage ID for existing usages
     */
    addConsumableUsage(consumableId = null, consumableData = null, quantity = null, usageId = null) {
        if (consumableId && this.usedConsumables.has(consumableId)) {
            return; // Already added
        }

        if (!consumableData && consumableId) {
            consumableData = this.originalConsumableOptions.find(opt => opt.value === consumableId);
        }

        const usageBlock = this.createConsumableUsageBlock(consumableId, consumableData, quantity, usageId);
        this.consumableContainer.appendChild(usageBlock);

        if (consumableId) {
            this.usedConsumables.add(consumableId);
            this.updateConsumableSelect();
        }

        this.consumableCounter++;
    }

    /**
     * Create a consumable usage block
     * @param {string} consumableId - Consumable ID
     * @param {Object} consumableData - Consumable data
     * @param {number} quantity - Quantity value
     * @param {string} usageId - Usage ID for existing usages
     * @returns {HTMLElement} The created block
     */
    createConsumableUsageBlock(consumableId, consumableData, quantity = null, usageId = null) {
        const blockId = `consumable-usage-${this.consumableCounter}`;
        const block = document.createElement('div');
        block.className = 'consumable-usage-block bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4';
        block.id = blockId;
        block.dataset.consumableId = consumableId || '';

        const consumableText = consumableData ?
            `${consumableData.text}` :
            gettext('Select a consumable');

        block.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="flex-1">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        ${gettext('Consumable')}
                        <span class="text-red-500">*</span>
                    </label>
                    <div class="bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 truncate">
                        ${consumableText}
                    </div>
                    <input type="hidden" name="consumable_usage_consumable" value="${consumableId || ''}" />
                    ${usageId ? `<input type="hidden" name="consumable_usage_id" value="${usageId}" />` : ''}
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        ${gettext('Quantity')}
                        <span class="text-red-500">*</span>
                    </label>
                    <div class="flex items-center gap-4">
                        <input type="number"
                           name="consumable_usage_quantity"
                           min="1"
                           value="${quantity || ''}"
                           class="shadow-sm bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-0 focus:border-tertiary/70 block w-full p-2.5"
                           placeholder="${gettext('Qty')}"
                           required />
                        <button type="button"
                            class="remove-consumable-btn cursor-pointer text-red-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            data-block-id="${blockId}"
                            data-consumable-id="${consumableId || ''}"
                            title="${gettext('Remove consumable')}">
                            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                <path fill-rule="evenodd" d="M8.586 2.586A2 2 0 0 1 10 2h4a2 2 0 0 1 2 2v2h3a1 1 0 1 1 0 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a1 1 0 1 1 0-2h3V4a2 2 0 0 1 .586-1.414ZM10 6h4V4h-4v2Zm1 4a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Zm4 0a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Z" clip-rule="evenodd"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add event listener for remove button
        const removeButton = block.querySelector('.remove-consumable-btn');
        removeButton.addEventListener('click', () => this.removeConsumableUsage(blockId, consumableId));

        return block;
    }

    /**
     * Remove a consumable usage block
     * @param {string} blockId - Block ID to remove
     * @param {string} consumableId - Consumable ID to make available again
     */
    removeConsumableUsage(blockId, consumableId) {
        const block = document.getElementById(blockId);
        if (block) {
            block.remove();

            if (consumableId) {
                this.usedConsumables.delete(consumableId);
                this.updateConsumableSelect();
            }
        }
    }

    /**
     * Update the consumable select options based on used consumables
     */
    updateConsumableSelect() {
        // Clear current options except the first empty option
        while (this.consumableSelect.children.length > 1) {
            this.consumableSelect.removeChild(this.consumableSelect.lastChild);
        }

        // Add available options
        this.originalConsumableOptions.forEach(option => {
            if (option.value && !this.usedConsumables.has(option.value)) {
                this.consumableSelect.appendChild(option.element.cloneNode(true));
            }
        });

        // Update button state
        this.addConsumableButton.disabled = this.consumableSelect.children.length <= 1;
        if (this.addConsumableButton.disabled) {
            this.addConsumableButton.classList.add('opacity-50', 'cursor-not-allowed');
            this.addConsumableButton.classList.remove('hover:bg-tertiary/95');
        } else {
            this.addConsumableButton.classList.remove('opacity-50', 'cursor-not-allowed');
            this.addConsumableButton.classList.add('hover:bg-tertiary/95');
        }
    }

    /**
     * Clear form errors and reset fields
     * @param {HTMLFormElement} form - The form to clear
     * @param {Array<InputValidationManager>} validators - Form validators
     */
    clearFormErrors(form, validators) {
        if (validators) {
            validators.forEach(validator => validator.clearErrors());
        }
    }

    /**
     * Handle operation form submission
     * @param {Event} event - Form submission event
     */
    async handleOperationFormSubmit(event) {
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

            await this.handleResponse(response, form, this.operationValidators);

            window.toastManager.buildToast()
                .setMessage(gettext('Operation updated successfully'))
                .setType('success')
                .setPosition('top-right')
                .setDuration(3000)
                .show();

            window.location.href = window.AppConfig.urls.operationList;
        } catch (error) {
            this.handleError(error, gettext('Error updating operation'), gettext('Please correct the errors and try again.'));
        } finally {
            this.sectionLoader.hideLoader();
        }
    }

    /**
     * Handle API response and display form errors
     * @param {Response} response - API response
     * @param {HTMLFormElement} form - Form element
     * @param {Array<InputValidationManager>} validators - Form validators
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
                            const inputs = Array.from(form.querySelectorAll('input, textarea, select'));
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
 * Initialize UpdateOperationManager on DOM load
 */
document.addEventListener('DOMContentLoaded', () => {
    new UpdateOperationManager();
});
