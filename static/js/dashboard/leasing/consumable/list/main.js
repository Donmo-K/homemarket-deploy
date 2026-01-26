/**
 * Manages the leasing consumable list page interactions, including details, deletion, sorting, and searching.
 */
class ListLeasingConsumableManager {
    constructor() {
        // Initialize section loader
        this.sectionLoader = new SectionLoaderManager(null, 'fill-tertiary', 0.5);

        // Initialize modal
        this.detailsModal = new Modal(document.getElementById('consumable-details-modal'), {
            backdrop: 'static',
            backdropClasses: 'bg-gray-900/50 fixed inset-0 z-[10000001]',
            closable: true
        });

        // CSRF token
        this.csrfToken = document.getElementById('csrf-token').value;

        // State for sorting
        this.sortColumn = null;
        this.sortDirection = 'asc';

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for delete, details, sort, and search buttons
     */
    setupEventListeners() {
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleDelete(e));
        });

        const detailsButtons = document.querySelectorAll('.details-btn');
        detailsButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleDetails(e));
        });

        // Sort listeners
        const headers = document.querySelectorAll('th[data-sort]');
        headers.forEach(header => {
            header.addEventListener('click', () => this.handleSort(header));
        });

        // Search listener
        const searchInput = document.getElementById('consumables-search');
        searchInput.addEventListener('input', () => this.handleSearch(searchInput));
    }

    /**
     * Handle sort button click
     * @param {HTMLElement} header - The header element clicked
     */
    handleSort(header) {
        const column = header.getAttribute('data-sort');
        const type = header.getAttribute('data-type');
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        const tbody = document.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr:not(.no-data)'));

        rows.sort((a, b) => {
            let aValue = a.getAttribute(`data-${column}`);
            let bValue = b.getAttribute(`data-${column}`);

            // Handle type-specific comparison
            switch (type) {
                case 'date':
                    aValue = new Date(aValue);
                    bValue = new Date(bValue);
                    if (isNaN(aValue)) aValue = new Date(0);
                    if (isNaN(bValue)) bValue = new Date(0);
                    break;
                case 'number':
                    aValue = parseFloat(aValue) || 0;
                    bValue = parseFloat(bValue) || 0;
                    break;
                case 'string':
                default:
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                    break;
            }

            if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        // Re-append sorted rows
        rows.forEach(row => tbody.appendChild(row));

        // Update sort indicators
        const headers = document.querySelectorAll('th[data-sort]');
        headers.forEach(h => h.classList.remove('sorted-asc', 'sorted-desc'));
        header.classList.add(`sorted-${this.sortDirection}`);
    }

    /**
     * Handle search input
     * @param {HTMLInputElement} input - The search input element
     */
    handleSearch(input) {
        const searchTerm = input.value.toLowerCase();
        const rows = document.querySelectorAll('tbody tr:not(.no-data)');

        rows.forEach(row => {
            const designation = row.getAttribute('data-designation').toLowerCase();
            const reference = row.getAttribute('data-reference').toLowerCase();
            const brand = row.getAttribute('data-brand').toLowerCase();

            if (designation.includes(searchTerm) || reference.includes(searchTerm) || brand.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });

        // Hide "no data" row if there are visible rows, show it if none
        const noDataRow = document.querySelector('tr.no-data');
        const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none');
        noDataRow.style.display = visibleRows.length === 0 ? '' : 'none';
    }

    /**
     * Handle delete button click
     * @param {Event} event - Button click event
     */
    async handleDelete(event) {
        const pk = event.target.closest('.delete-btn').dataset.pk;
        const designation = event.target.closest('.delete-btn').dataset.designation;
        const message = gettext('Are you sure you want to delete the consumable "{designation}"?').replace('{designation}', designation);
        const confirmText = gettext('Yes, delete');
        const cancelText = gettext('Cancel');
        this.detailsModal.hide();

        const confirmed = await window.deleteModalManager.show(message, confirmText, cancelText);

        if (confirmed) {
            this.sectionLoader.showLoader();

            try {
                const deleteUrl = window.AppConfig.urls.deleteConsumable.replace('placeholder', pk);
                const response = await fetch(deleteUrl, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': this.csrfToken,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                if (response.ok) {
                    window.toastManager.buildToast()
                        .setMessage(gettext('Leasing consumable deleted successfully'))
                        .setType('success')
                        .setPosition('top-right')
                        .setDuration(3000)
                        .show();
                    // Reload the page to reflect changes
                    window.location.reload();
                } else {
                    const errorData = await response.json();
                    window.toastManager.buildToast()
                        .setMessage(gettext('Failed to delete consumable: ') + errorData.error)
                        .setType('error')
                        .setPosition('top-right')
                        .setDuration(3000)
                        .show();
                }
            } catch (error) {
                window.toastManager.buildToast()
                    .setMessage(gettext('An unexpected error occurred: ') + error.message)
                    .setType('error')
                    .setPosition('top-right')
                    .setDuration(3000)
                    .show();
            } finally {
                this.sectionLoader.hideLoader();
            }
        }
    }

    /**
     * Handle details button click
     * @param {Event} event - Button click event
     */
    async handleDetails(event) {
        const pk = event.target.closest('.details-btn').dataset.pk;
        this.sectionLoader.showLoader();

        try {
            const detailsUrl = window.AppConfig.urls.retrieveConsumable.replace('placeholder', pk);
            const response = await fetch(detailsUrl, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.populateDetailsModal(data.data);
                    this.detailsModal.show();
                } else {
                    throw new Error(data.error);
                }
            } else {
                throw new Error(gettext('Error fetching consumable details'));
            }
        } catch (error) {
            window.toastManager.buildToast()
                .setMessage(gettext('Error fetching consumable details: ') + error.message)
                .setType('error')
                .setPosition('top-right')
                .setDuration(3000)
                .show();
        } finally {
            this.sectionLoader.hideLoader();
        }
    }

    /**
     * Populate the details modal with consumable data
     * @param {Object} data - Consumable data from API
     */
    populateDetailsModal(data) {
        // Update profile picture
        const profilePicture = document.getElementById('details-designation').querySelector('img');
        profilePicture.src = data.image_url || "{% static 'images/consumable/consumable.jpg' %}";
        profilePicture.alt = data.designation ? gettext('Image of ') + data.designation : gettext('Consumable Image');

        // Update fields
        document.getElementById('details-exit-slip').textContent = data.exit_slip || "-";
        document.getElementById('details-brand').textContent = data.brand || "-";
        document.getElementById('details-printer-model').textContent = data.printer_model || "-";
        document.getElementById('details-type').textContent = data.type || "-";
        document.getElementById('details-reference').textContent = data.reference || "-";
        // document.getElementById('details-designation').textContent = data.designation || "-";
        document.getElementById('details-quantity').textContent = data.quantity != null ? data.quantity : "-";
        document.getElementById('details-threshold').textContent = data.threshold != null ? data.threshold : "-";
        document.getElementById('details-description').textContent = data.description || "-";
        document.getElementById('details-created').textContent = data.created || "-";
        document.getElementById('details-updated').textContent = data.updated || "-";

        // Update button attributes
        const editButton = document.querySelector('#consumable-details-modal .edit-btn');
        editButton.href = window.AppConfig.urls.updateConsumable.replace('placeholder', data.pk);

        const deleteButton = document.querySelector('#consumable-details-modal .delete-btn');
        deleteButton.dataset.pk = data.pk;
        deleteButton.dataset.designation = data.designation || "-";
    }
}

/**
 * Initialize ListLeasingConsumableManager on DOM load
 */
document.addEventListener('DOMContentLoaded', () => {
    new ListLeasingConsumableManager();
});