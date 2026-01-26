/**
 * Manages the operation creation page interactions and form submissions
 */
class CreateOperationManager {
    constructor() {
        // Initialize forms
        this.operationForm = document.getElementById('operation-form');

        // Initialize buttons
        this.saveButton = document.getElementById('save-button');
        this.discardButton = document.getElementById('discard-button');

        // Initialize select2
        this.deployment = $('#deployment');

        // Initialize consumable management
        this.consumableContainer = document.getElementById('consumable-usages-container');
        this.addConsumableButton = document.getElementById('add-consumable-button');
        this.consumableSelect = document.getElementById('consumable-select');

        // Track used consumables
        this.usedConsumables = new Set();
        this.consumableCounter = 0;

        // Setup event listeners
        this.setupEventListeners();
        this.setupSelect2();
        this.initializeConsumableManagement();
        this.loadExistingConsumableUsages();
    }

    /**
     * Initialize Select2 for deployment select
     */
    setupSelect2() {
        this.deployment.select2({
            theme: 'tailwindcss-4',
            placeholder: gettext("Select a deployment"),
            allowClear: true,
            language: {
                noResults: function () {
                    return gettext("No results found");
                }
            }
        });
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
            const {consumable_ids, quantities} = window.submittedFormData.consumable_usages;

            for (let i = 0; i < consumable_ids.length; i++) {
                if (consumable_ids[i]) {
                    const consumable = this.originalConsumableOptions.find(
                        opt => opt.value === consumable_ids[i]
                    );

                    if (consumable) {
                        this.addConsumableUsage(
                            consumable_ids[i],
                            consumable,
                            quantities[i]
                        );
                    }
                }
            }
        }

        this.updateConsumableSelect();
    }

    /**
     * Set up event listeners for buttons and forms
     */
    setupEventListeners() {
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
     */
    addConsumableUsage(consumableId = null, consumableData = null, quantity = null) {
        if (consumableId && this.usedConsumables.has(consumableId)) {
            return; // Already added
        }

        if (!consumableData && consumableId) {
            consumableData = this.originalConsumableOptions.find(opt => opt.value === consumableId);
        }

        const usageBlock = this.createConsumableUsageBlock(consumableId, consumableData, quantity);
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
     * @returns {HTMLElement} The created block
     */
    createConsumableUsageBlock(consumableId, consumableData, quantity = null) {
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
}

/**
 * Initialize CreateOperationManager on DOM load
 */
document.addEventListener('DOMContentLoaded', () => {
    new CreateOperationManager();
});
