document.addEventListener('DOMContentLoaded', function() {
    // Initialize loader manager
    const loaderManager = window.SectionLoaderManager ? new SectionLoaderManager() : null;

    // Handle delete buttons
    document.querySelectorAll('.delete-recouvrement-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.id;
            const reference = this.dataset.reference;
            const deleteModal = document.getElementById('delete-modal');
            const deleteText = document.getElementById('delete-confirmation-text');
            const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

            deleteText.textContent = gettext('Are you sure you want to delete the recovery instance?') + ` ${reference} ?`;
            confirmDeleteBtn.dataset.id = id;
            deleteModal.classList.remove('hidden');
        });
    });

    // Handle cancel button
    document.getElementById('cancel-delete-btn').addEventListener('click', function() {
        document.getElementById('delete-modal').classList.add('hidden');
    });

    // Handle confirm delete button
    document.getElementById('confirm-delete-btn').addEventListener('click', function() {
        const id = this.dataset.id;
        const deleteUrl = window.urls.recouvrement.delete(id);

        if (loaderManager) loaderManager.showLoader(); 
        document.getElementById('delete-modal').classList.add('hidden'); 

        fetch(deleteUrl, {
            method: 'POST',
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                'Content-Type': 'application/json'
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
                .setMessage(gettext('An unexpected error occurred while deleting. Please try again.'))
                .setType('danger')
                .setPosition('top-right')
                .setDuration(500)
                .show();
        });
    });

    // Handle detail buttons
    document.querySelectorAll('.detail-recouvrement-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('detail-reference').textContent = this.dataset.reference;
            document.getElementById('detail-instance').textContent = this.dataset.instance;
            document.getElementById('detail-montant').textContent = this.dataset.montant;
            document.getElementById('detail-statut').textContent = this.dataset.statut;
            document.getElementById('detail-flag').textContent = this.dataset.flag;

            document.getElementById('detail-modal').classList.remove('hidden');
        });
    });

    // Handle close detail button
    document.getElementById('close-detail-btn').addEventListener('click', function() {
        document.getElementById('detail-modal').classList.add('hidden');
    });
});


