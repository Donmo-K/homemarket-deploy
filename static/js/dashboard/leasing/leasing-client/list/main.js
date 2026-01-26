/**
 * Manages the leasing client list page interactions, including details, deletion, sorting, and searching.
 */
class ListLeasingClientManager {
    constructor() {
        // Initialize section loader
        this.sectionLoader = new SectionLoaderManager(null, 'fill-tertiary', 0.5);

        // Initialize modal
        this.detailsModal = new Modal(document.getElementById('client-details-modal'), {
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
        const searchInput = document.getElementById('users-search');
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
                    aValue = aValue === '-' ? 0 : parseFloat(aValue);
                    bValue = bValue === '-' ? 0 : parseFloat(bValue);
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

        // Update sort indicators (optional, add visual feedback if needed)
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
            const name = row.getAttribute('data-name').toLowerCase();
            const email = row.getAttribute('data-email').toLowerCase();
            const location = row.getAttribute('data-location').toLowerCase();
            const contractNumber = row.getAttribute('data-contract-number').toLowerCase();

            if (name.includes(searchTerm) || email.includes(searchTerm) || location.includes(searchTerm) || contractNumber.includes(searchTerm)) {
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
        const name = event.target.closest('.delete-btn').dataset.name;
        const message = gettext('Are you sure you want to delete the client "{name}"?').replace('{name}', name);
        const confirmText = gettext('Yes, delete');
        const cancelText = gettext('Cancel');
        this.detailsModal.hide();

        const confirmed = await window.deleteModalManager.show(message, confirmText, cancelText);

        if (confirmed) {
            this.sectionLoader.showLoader();

            try {
                const deleteUrl = window.AppConfig.urls.deleteLeasingClient.replace('placeholder', pk);
                const response = await fetch(deleteUrl, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': this.csrfToken,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                if (response.ok) {
                    window.toastManager.buildToast()
                        .setMessage(gettext('Leasing client deleted successfully'))
                        .setType('success')
                        .setPosition('top-right')
                        .setDuration(3000)
                        .show();
                    // Reload the page or remove the row
                    window.location.reload();
                } else {
                    throw new Error(gettext('Error deleting client'));
                }
            } catch (error) {
                window.toastManager.buildToast()
                    .setMessage(gettext('Error deleting client: ') + error.message)
                    .setType('danger')
                    .setPosition('top-right')
                    .setDuration(5000)
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
            const detailsUrl = window.AppConfig.urls.retrieveLeasingClient.replace('placeholder', pk);
            const response = await fetch(detailsUrl, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.populateDetailsModal(data.data);
                this.detailsModal.show();
            } else {
                throw new Error(gettext('Error fetching client details'), {
                    cause: 'fetching error'
                });
            }
        } catch (error) {
            window.toastManager.buildToast()
                .setMessage(error.cause !== 'fetching error' ? gettext('Error fetching client details: ') + error.message : gettext('Error fetching client details.'))
                .setType('danger')
                .setPosition('top-right')
                .setDuration(5000)
                .show();
        } finally {
            this.sectionLoader.hideLoader();
        }
    }

    /**
     * Populate the details modal with client data
     * @param {Object} data - Client data from API
     */
    populateDetailsModal(data) {
        // Update profile picture
        const profilePictureContainer = document.getElementById('details-profile-picture');
        profilePictureContainer.innerHTML = data.profile_picture ?
            `<img class="fhCwost7CSNRc2WSHLFW upPzuI0jdXVPOpgOwfrU yD3CkTNbBj1zsvysfuUm RpVwy4sO7Asb86CncKJ_ fqL_oteKquEXvTu6w4NP w-10 h-10 rounded-full" src="${data.profile_picture}" alt="${gettext('Profile Picture')}">` :
            `<svg class="w-10 h-10 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd" d="M12 20a7.966 7.966 0 0 1-5.002-1.756l.002.001v-.683c0-1.794 1.492-3.25 3.333-3.25h3.334c1.84 0 3.333 1.456 3.333 3.25v.683A7.966 7.966 0 0 1 12 20ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10c0 5.5-4.44 9.963-9.932 10h-.138C6.438 21.962 2 17.5 2 12Zm10-5c-1.84 0-3.333 1.455-3.333 3.25S10.159 13.5 12 13.5c1.84 0 3.333-1.455 3.333-3.25S13.841 7 12 7Z" clip-rule="evenodd"></path>
            </svg>`;

        // Update other fields
        document.getElementById('details-name').textContent = data.name || "";
        document.getElementById('details-email').textContent = data.email || "-";
        document.getElementById('details-location').querySelector('span').textContent = data.location || "-";
        document.getElementById('details-contract-number').querySelector('span').textContent = data.contract_number || "-";
        document.getElementById('details-contract-date').textContent = data.contract_date || "-";
        document.getElementById('details-contract-duration').textContent = data.contract_duration || "-";
        document.getElementById('details-created').textContent = data.created || "-";
        document.getElementById('details-updated').textContent = data.updated || "-";

        // Update delete button data attributes
        const deleteButton = document.querySelector('#client-details-modal .delete-btn');
        deleteButton.dataset.pk = data.pk || "";
        deleteButton.dataset.name = data.name || data.email || "";

        // Update edit link attributes
        const editButton = document.querySelector('#client-details-modal .edit-btn');
        editButton.href = window.AppConfig.urls.updateLeasingClient.replace('placeholder', data.pk);
    }
}

/**
 * Initialize ListLeasingClientManager on DOM load
 */
document.addEventListener('DOMContentLoaded', () => {
    new ListLeasingClientManager();
});
