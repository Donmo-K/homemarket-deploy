/**
 * Manages the printer creation page interactions and form submissions
 */
class CreatePrinterManager {
    constructor() {
        // Initialize forms
        this.printerForm = document.getElementById('printer-form');

        // Initialize buttons
        this.saveButton = document.getElementById('save-button');
        this.discardButton = document.getElementById('discard-button');

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for buttons, forms, and drag-and-drop
     */
    setupEventListeners() {
        // Save button
        this.saveButton.addEventListener('click', () => this.printerForm.submit());

        // Discard button
        this.discardButton.addEventListener('click', () => {
            window.location.href = window.AppConfig.urls.printerList;
        });

        // Drag-and-drop events
        this.setupDragAndDrop();
    }

    /**
     * Set up drag-and-drop functionality for the image field
     */
    setupDragAndDrop() {
        const dropZone = document.querySelector('.drag-drop-zone');
        const fileInput = document.querySelector('#image');
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
                fileInput.files = files;
                const changeEvent = new Event('change', {bubbles: true});
                fileInput.dispatchEvent(changeEvent);
                dropZone.classList.remove('bg-gray-200', 'border-blue-500');
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
        })
        preview.addEventListener('click', (e) => {
            const clearImage = e.target.closest('#image-clear');
            if (clearImage) {
                fileInput.value = '';
                preview.innerHTML = '';
                const changeEvent = new Event('change', {bubbles: true});
                fileInput.dispatchEvent(changeEvent);
            }
        })
    }
}

/**
 * Initialize CreatePrinterManager on DOM load
 */
document.addEventListener('DOMContentLoaded', () => {
    new CreatePrinterManager();
});
