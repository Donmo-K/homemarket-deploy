document.addEventListener('DOMContentLoaded', function() {
    // Initialize loader manager for the body
    const loaderManager = window.SectionLoaderManager ? new SectionLoaderManager() : null;

    // Handle detail buttons
    const detailButtons = document.querySelectorAll('.detail-instance-btn');
    const detailModal = document.getElementById('detail-modal');
    const closeDetailBtn = document.getElementById('close-detail-btn');

    detailButtons.forEach(button => {
        button.addEventListener('click', function() {
            document.getElementById('detail-type').textContent = this.dataset.type;
            document.getElementById('detail-user').textContent = this.dataset.user;
            document.getElementById('detail-responsable').textContent = this.dataset.responsable;
            document.getElementById('detail-numero').textContent = this.dataset.numero;
            document.getElementById('detail-besoin').textContent = this.dataset.besoin;
            document.getElementById('detail-statut').textContent = this.dataset.statut;
            document.getElementById('detail-facturable').textContent = this.dataset.facturable;
            document.getElementById('detail-action').textContent = this.dataset.action;

            const rapportImg = document.getElementById('detail-rapport');
            const noRapport = document.getElementById('detail-no-rapport');
            
            if (this.dataset.rapport) {
                rapportImg.src = this.dataset.rapport;
                rapportImg.classList.remove('hidden');
                noRapport.classList.add('hidden');
            } else {
                rapportImg.classList.add('hidden');
                noRapport.classList.remove('hidden');
            }

            detailModal.classList.remove('hidden');
        });
    });

    // Close detail modal
    closeDetailBtn.addEventListener('click', function() {
        detailModal.classList.add('hidden');
    });

    // Close detail modal on outside click
    detailModal.addEventListener('click', function(e) {
        if (e.target === detailModal) {
            detailModal.classList.add('hidden');
        }
    });

    // Handle form submission
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (loaderManager) loaderManager.showLoader(); 
            const formData = new FormData(form);
            const url = window.location.href;

            fetch(url, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => {
                if (loaderManager) loaderManager.hideLoader(); 
                if (!response.ok) {
                    throw new Error(gettext('An error occurred while submitting the form.'));
                }
                return response.json();
            })
            .then(data => {
                const toastType = data.success ? 'success' : 'danger';
                window.toastManager.buildToast()
                    .setMessage(data.message)
                    .setType(toastType)
                    .setPosition('top-right')
                    .setDuration(500)
                    .show();
                if (data.success) {
                    setTimeout(() => {
                        window.location.href = window.urls.instances.list;
                    }, 500); 
                }
            })
            .catch(error => {
                if (loaderManager) loaderManager.hideLoader(); 
                window.toastManager.buildToast()
                    .setMessage(gettext('An unexpected error has occurred. Please try again.'))
                    .setType('danger')
                    .setPosition('top-right')
                    .setDuration(500)
                    .show();
            });
        });
    }

    // Handle file input
    const fileInput = document.getElementById('rapport_technique');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const fileName = this.files[0] ? this.files[0].name : gettext('No files selected');
            document.getElementById('file_name').textContent = fileName;
        });
    }

    // Handle client search
    const userSearch = document.getElementById('user_search');
    const clientResults = document.getElementById('client_results');
    const userSelect = document.getElementById('user');
    let allOptions = [];

    if (userSearch && clientResults && userSelect) {
        allOptions = Array.from(userSelect.options).slice(1); 

        userSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            userSelect.innerHTML = `<option value="" disabled selected class="text-gray-500">${gettext('Select a customer from the results')}</option>`;
            const filteredOptions = allOptions.filter(option => option.text.toLowerCase().includes(searchTerm));
            filteredOptions.forEach(option => {
                userSelect.appendChild(option.cloneNode(true));
            });
            clientResults.classList.toggle('hidden', searchTerm === '');
        });

        userSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption.value !== '') {
                userSearch.value = selectedOption.text;
                clientResults.classList.add('hidden');
            }
        });

        if (userSearch.value === '') {
            clientResults.classList.add('hidden');
        }
    }

    // Handle delete buttons
    const deleteButtons = document.querySelectorAll('.delete-instance-btn');
    const deleteModal = document.getElementById('delete-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const deleteConfirmationText = document.getElementById('delete-confirmation-text');

    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const instanceId = this.getAttribute('data-id');
            const instanceNumero = this.getAttribute('data-numero');
            deleteConfirmationText.textContent = gettext('Are you sure you want to delete the instance?') + ` #${instanceNumero} ?`;
            deleteModal.classList.remove('hidden');
            confirmDeleteBtn.setAttribute('data-id', instanceId);
        });
    });

    // Handle cancel button
    cancelDeleteBtn.addEventListener('click', function() {
        deleteModal.classList.add('hidden');
    });

    // Handle confirm delete button
    confirmDeleteBtn.addEventListener('click', function() {
        const instanceId = this.getAttribute('data-id');
        const url = window.urls.instances.delete(instanceId);

        if (loaderManager) loaderManager.showLoader(); 
        deleteModal.classList.add('hidden'); 

        fetch(url, {
            method: 'POST',
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        })
        .then(response => {
            if (loaderManager) loaderManager.hideLoader(); 
            if (!response.ok) {
                throw new Error(gettext('An error occurred while deleting the instance.'));
            }
            return response.json();
        })
        .then(data => {
            window.toastManager.buildToast()
                .setMessage(data.message)
                .setType(data.success ? 'success' : 'danger')
                .setPosition('top-right')
                .setDuration(500)
                .show();
            if (data.success) {
                setTimeout(() => {
                    window.location.reload();
                }, 500); 
            }
        })
        .catch(error => {
            if (loaderManager) loaderManager.hideLoader(); 
            window.toastManager.buildToast()
                .setMessage(gettext('Cannot delete this instance because it is referenced by one or more recovery records. Please delete or update the related records first'))
                .setType('danger')
                .setPosition('top-right')
                .setDuration(7000)
                .show();
        });
    });
});

