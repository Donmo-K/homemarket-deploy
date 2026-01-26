/**
 * Manages the leasing operation list page interactions, including details, deletion, sorting, and searching.
 */
class ListLeasingOperationManager {
    constructor() {
        // Initialize section loader
        this.sectionLoader = new SectionLoaderManager(null, 'fill-tertiary', 0.5);

        // Initialize modal
        this.detailsModal = new Modal(document.getElementById('operation-details-modal'), {
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
        const searchInput = document.getElementById('operations-search');
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
                    aValue = aValue ? aValue.toLowerCase() : '';
                    bValue = bValue ? bValue.toLowerCase() : '';
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
            const interventionType = row.getAttribute('data-intervention-type')?.toLowerCase() || '';
            const status = row.getAttribute('data-status')?.toLowerCase() || '';
            const observation = row.getAttribute('data-observation')?.toLowerCase() || '';

            if (interventionType.includes(searchTerm) || status.includes(searchTerm) || observation.includes(searchTerm)) {
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
        const interventionType = event.target.closest('.delete-btn').dataset.interventionType;
        const message = gettext('Are you sure you want to delete the operation "{interventionType}"?').replace('{interventionType}', interventionType);
        const confirmText = gettext('Yes, delete');
        const cancelText = gettext('Cancel');
        this.detailsModal.hide();

        const confirmed = await window.deleteModalManager.show(message, confirmText, cancelText);

        if (confirmed) {
            this.sectionLoader.showLoader();

            try {
                console.log('Deleting operation with PK:', pk);
                const deleteUrl = window.AppConfig.urls.deleteOperation.replace('placeholder', pk);
                const response = await fetch(deleteUrl, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': this.csrfToken,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                if (response.ok) {
                    window.toastManager.buildToast()
                        .setMessage(gettext('Leasing operation deleted successfully'))
                        .setType('success')
                        .setPosition('top-right')
                        .setDuration(1500)
                        .show();
                    // Reload the page to reflect changes
                    // wait for a short delay to ensure the toast is shown
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    window.location.reload();
                } else {
                    const errorData = await response.json();
                    window.toastManager.buildToast()
                        .setMessage(gettext('Failed to delete operation: ') + errorData.error)
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
            const detailsUrl = window.AppConfig.urls.retrieveOperation.replace('placeholder', pk);
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
                throw new Error(gettext('Error fetching operation details'));
            }
        } catch (error) {
            window.toastManager.buildToast()
                .setMessage(gettext('Error fetching operation details: ') + error.message)
                .setType('error')
                .setPosition('top-right')
                .setDuration(3000)
                .show();
        } finally {
            this.sectionLoader.hideLoader();
        }
    }

    /**
     * Populate the details modal with operation data
     * @param {Object} data - Operation data from API
     */
    populateDetailsModal(data) {
        // Update fields
        console.log(document.getElementById('details-operation-date'));
        document.getElementById('details-operation-date').textContent = data.operation_date || "-";
        document.getElementById('details-intervention-type').textContent = data.intervention_type || "-";
        document.getElementById('details-toner-level').textContent = data.toner_level || "-";
        document.getElementById('details-photoconductor-level').textContent = data.photoconductor_level || "-";
        document.getElementById('details-maintenance-kit-level').textContent = data.maintenance_kit_level || "-";
        document.getElementById('details-previous-index').textContent = data.previous_index || "-";
        document.getElementById('details-new-index').textContent = data.new_index || "-";
        document.getElementById('details-average-impressions').textContent = data.average_impressions || "-";
        document.getElementById('details-status').textContent = data.status || "-";
        document.getElementById('details-observation').textContent = data.observation || "-";

        // Update consumables
        const consumablesContainer = document.getElementById('details-consumables');
        if (data.consumable_usages && data.consumable_usages.length > 0) {
            let consumablesHtml = '<div class="space-y-2">';
            data.consumable_usages.forEach(usage => {
                consumablesHtml += `
                    <div class="flex justify-between items-center bg-gray-50 p-2 rounded">
                        <span class="font-medium">${usage.reference} - ${usage.consumable}</span>
                        <span class="text-sm text-gray-600">${gettext('Qty')}: ${usage.quantity}</span>
                    </div>
                `;
            });
            consumablesHtml += '</div>';
            consumablesContainer.innerHTML = consumablesHtml;
        } else {
            consumablesContainer.textContent = gettext('No consumables used');
        }

        document.getElementById('details-created').textContent = data.created || "-";
        document.getElementById('details-updated').textContent = data.updated || "-";

        // Update button attributes
        const editButton = document.querySelector('#operation-details-modal .edit-btn');
        editButton.href = window.AppConfig.urls.updateOperation.replace('placeholder', data.pk);

        const deleteButton = document.querySelector('#operation-details-modal .delete-btn');
        deleteButton.dataset.pk = data.pk;
        deleteButton.dataset.interventionType = data.intervention_type || "-";
    }
}

/**
 * Initialize ListLeasingOperationManager on DOM load
 */
document.addEventListener('DOMContentLoaded', () => {
    new ListLeasingOperationManager();
});
