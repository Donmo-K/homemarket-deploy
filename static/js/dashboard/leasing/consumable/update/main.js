/**
 * Manages the consumable update page interactions and form submissions
 */
class UpdateConsumableManager {
    constructor() {
        // Initialize forms
        this.consumableForm = document.getElementById('consumable-form');

        // Initialize buttons
        this.saveButton = document.getElementById('save-button');
        this.discardButton = document.getElementById('discard-button');

        // Initialize section loader
        this.sectionLoader = new SectionLoaderManager(null, 'fill-tertiary', 0.3);

        // Setup event listeners
        this.setupEventListeners();

        // Initialize image preview if exists
        this.initializeImagePreview();
    }

    /**
     * Set up event listeners for buttons, forms, and drag-and-drop
     */
    setupEventListeners() {
        // Consumable form submission
        this.consumableForm.addEventListener('submit', e => this.handleConsumableFormSubmit(e));

        // Save button
        this.saveButton.addEventListener('click', () => this.consumableForm.submit());

        // Discard button
        this.discardButton.addEventListener('click', () => {
            window.location.href = window.AppConfig.urls.consumableList;
        });

        // Drag-and-drop events
        this.setupDragAndDrop();
    }

    /**
     * Initialize image preview if an image exists
     */
    initializeImagePreview() {
        const preview = document.getElementById('image-preview');
        const existingImageLink = document.getElementById('current-image');

        if (preview && existingImageLink) {
            preview.innerHTML = `
                <div class="mt-1 w-46 h-46 p-6 border border-gray-200 bg-gray-50/40 rounded-md relative mb-2">
                    <img alt="" src="${existingImageLink.href}" class="h-full w-auto flex">
                    <button data-id="${existingImageLink.dataset.id}" type="button" class="cursor-pointer text-red-500 hover:text-red-600 absolute bottom-1 left-1" id="image-delete" title="${gettext("Remove image")}">
                        <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                            <path fill-rule="evenodd" d="M8.586 2.586A2 2 0 0 1 10 2h4a2 2 0 0 1 2 2v2h3a1 1 0 1 1 0 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a1 1 0 0 1 0-2h3V4a2 2 0 0 1 .586-1.414ZM10 6h4V4h-4v2Zm1 4a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Zm4 0a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                </div>
            `;
        }
    }

    /**
     * Set up drag-and-drop functionality for the image field
     */
    setupDragAndDrop() {
        const dropZone = document.querySelector('.drag-drop-zone');
        const fileInput = document.getElementById('image');
        const preview = document.getElementById('image-preview');
        const imageInputContainer = document.getElementById('image-input-container');

        if (!dropZone || !fileInput || !preview || !imageInputContainer) return;

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        // Highlight drop zone on dragover
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('bg-gray-200', 'border-blue-500');
            }, false);
        });

        // Remove highlight on dragleave
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('bg-gray-200', 'border-blue-500');
        }, false);

        // Handle file drop
        dropZone.addEventListener('drop', e => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                const allowedTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/gif'];
                const maxSize = 10 * 1024 * 1024; // 10MB
                if (!allowedTypes.includes(file.type)) {
                    window.toastManager.buildToast()
                        .setMessage(gettext('Invalid file type. Only SVG, PNG, JPG, or GIF are allowed.'))
                        .setType('danger')
                        .setPosition('top-right')
                        .setDuration(5000)
                        .show();
                    return;
                }
                if (file.size > maxSize) {
                    window.toastManager.buildToast()
                        .setMessage(gettext('File is too large. Maximum size is 10MB.'))
                        .setType('danger')
                        .setPosition('top-right')
                        .setDuration(5000)
                        .show();
                    return;
                }
                fileInput.files = files;
                dropZone.classList.remove('bg-gray-200', 'border-blue-500');
                const changeEvent = new Event('change', {bubbles: true});
                fileInput.dispatchEvent(changeEvent);
            }
        }, false);

        // Events on image selected and for remove selected image
        fileInput.addEventListener('change', (e) => {
            const file = e.currentTarget.files[0];
            preview.innerHTML = ''; // Clear previous content
            if (file) {
                const imageURL = URL.createObjectURL(file);
                preview.innerHTML = `
                    <div class="mt-1 w-46 h-46 p-6 border border-gray-200 bg-gray-50/40 rounded-md relative mb-2">
                        <img alt="${file.name}" src="${imageURL}" class="h-full w-auto flex">
                        <button type="button" class="cursor-pointer text-red-500 hover:text-red-600 absolute bottom-1 left-1" id="image-clear" title="${gettext("Remove image")}">
                            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                <path fill-rule="evenodd" d="M8.586 2.586A2 2 0 0 1 10 2h4a2 2 0 0 1 2 2v2h3a1 1 0 1 1 0 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a1 1 0 0 1 0-2h3V4a2 2 0 0 1 .586-1.414ZM10 6h4V4h-4v2Zm1 4a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Zm4 0a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Z" clip-rule="evenodd"/>
                            </svg>
                        </button>
                    </div>
                `;
                imageInputContainer.classList.add("hidden");
                preview.classList.remove("hidden");
            } else {
                imageInputContainer.classList.remove("hidden");
                preview.classList.add("hidden");
            }
        });

        preview.addEventListener('click', (e) => {
            const clearImage = e.target.closest('#image-clear');
            if (clearImage) {
                fileInput.value = '';
                preview.innerHTML = '';
                // Trigger change event to reset any validation
                const changeEvent = new Event('change', {bubbles: true});
                fileInput.dispatchEvent(changeEvent);
            }
        });

        // Handle image deletion
        preview.addEventListener('click', async (e) => {
            const deleteImage = e.target.closest('#image-delete');
            const message = gettext('Are you sure you want to delete the image"?');
            const confirmText = gettext('Yes, delete');
            const cancelText = gettext('Cancel');

            if (deleteImage) {
                const confirmed = await window.deleteModalManager.show(message, confirmText, cancelText);
                if (confirmed) {
                    const consumableId = deleteImage.dataset.id;
                    this.sectionLoader.showLoader();
                    try {
                        const response = await fetch(window.AppConfig.urls.consumableImageDelete.replace("placeholder", consumableId), {
                            method: 'POST',
                            headers: {
                                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                                'X-Requested-With': 'XMLHttpRequest'
                            }
                        });
                        const data = await response.json();
                        if (data.success) {
                            window.toastManager.buildToast()
                                .setMessage(gettext('Consumable image deleted successfully'))
                                .setType('success')
                                .setPosition('top-right')
                                .setDuration(3000)
                                .show();
                            // Clear the preview and remove the current image display
                            preview.innerHTML = '';
                            const currentImage = document.getElementById('current-image');
                            if (currentImage) {
                                currentImage.remove();
                            }
                            // Clear file input
                            fileInput.value = '';
                            const changeEvent = new Event('change', {bubbles: true});
                            fileInput.dispatchEvent(changeEvent);
                        } else {
                            window.toastManager.buildToast()
                                .setMessage(gettext(data.error || 'Error deleting consumable image'))
                                .setType('danger')
                                .setPosition('top-right')
                                .setDuration(5000)
                                .show();
                        }
                    } catch (error) {
                        window.toastManager.buildToast()
                            .setMessage(gettext('Error deleting consumable image: ') + error.message)
                            .setType('danger')
                            .setPosition('top-right')
                            .setDuration(5000)
                            .show();
                    } finally {
                        this.sectionLoader.hideLoader();
                    }
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
    }

    /**
     * Handle consumable form submission
     * @param {Event} event - Form submission event
     */
    async handleConsumableFormSubmit(event) {
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

            await this.handleResponse(response, form, this.consumableValidators);

            window.toastManager.buildToast()
                .setMessage(gettext('Consumable updated successfully'))
                .setType('success')
                .setPosition('top-right')
                .setDuration(3000)
                .show();

            window.location.href = window.AppConfig.urls.consumableList;
        } catch (error) {
            this.handleError(error, gettext('Error updating consumable'), gettext('Please correct the errors and try again.'));
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
                            const inputs = Array.from(form.querySelectorAll('input, textarea'));
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
 * Initialize UpdateConsumableManager on DOM load
 */
document.addEventListener('DOMContentLoaded', () => {
    new UpdateConsumableManager();
});