document.addEventListener('DOMContentLoaded', function () {
    console.log('contactListManager.js loaded');
    
    const detailModal = document.getElementById('contact-detail-modal');
    const deleteModal = document.getElementById('contact-delete-modal');
    const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]')?.value;

    if (!detailModal) console.error('Detail modal not found');
    if (!deleteModal) console.error('Delete modal not found');
    if (!csrfToken) console.error('CSRF token not found');

    // Detail buttons
    const detailButtons = document.querySelectorAll('.detail-contact-btn');
    console.log('Number of "View" buttons found:', detailButtons.length);
    
    detailButtons.forEach(button => {
        button.addEventListener('click', function () {
            console.log('Click on "View" button', this.dataset);
            const data = {
                id: this.dataset.id,
                name: this.dataset.name || '-',
                email: this.dataset.email || '-',
                subject: this.dataset.subject || '-',
                message: this.dataset.message || '-',
                created: this.dataset.created || '-',
                isRead: this.dataset.isRead === 'true'
            };

            // Populate detail modal
            const nameElement = document.getElementById('contact-detail-name');
            const emailElement = document.getElementById('contact-detail-email');
            const subjectElement = document.getElementById('contact-detail-subject');
            const messageElement = document.getElementById('contact-detail-message');
            const createdElement = document.getElementById('contact-detail-created');
            const statusElement = document.getElementById('contact-detail-status');

            if (nameElement) nameElement.textContent = data.name;
            if (emailElement) emailElement.textContent = data.email;
            if (subjectElement) subjectElement.textContent = data.subject;
            if (messageElement) messageElement.textContent = data.message;
            if (createdElement) createdElement.textContent = data.created;
            
            if (statusElement) {
                statusElement.textContent = data.isRead ? 'Read' : 'Unread';
                statusElement.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ' +
                    (data.isRead ? 'bg-green-500 text-white' : 'bg-red-500 text-white');
            }

            // Show detail modal
            if (detailModal) {
                detailModal.classList.remove('hidden');
                console.log('Detail modal displayed');
            } else {
                console.error('Cannot display detail modal');
            }

            // If unread, mark as read via AJAX
            if (!data.isRead && window.urls.contacts.markAsRead) {
                const markUrl = window.urls.contacts.markAsRead(data.id);
                console.log('AJAX call to mark as read:', markUrl);
                fetch(markUrl, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrfToken,
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => {
                    console.log('AJAX markAsRead response:', response.status);
                    if (!response.ok) throw new Error('Network error: ' + response.status);
                    return response.json();
                })
                .then(data => {
                    if (data.status === 'success') {
                        const statusBadge = button.closest('tr').querySelector('td:nth-child(6) span');
                        if (statusBadge) {
                            statusBadge.textContent = 'Read';
                            statusBadge.classList.remove('bg-red-100', 'text-red-800');
                            statusBadge.classList.add('bg-green-100', 'text-green-800');
                        }
                        button.dataset.isRead = 'true';
                        updateUnreadCount();
                    }
                })
                .catch(error => console.error('Error marking as read:', error));
            }
        });
    });

    // Close detail modal
    const closeDetailButtons = document.querySelectorAll('#close-contact-detail-btn, #close-contact-detail-btn-bottom');
    console.log('Number of detail modal close buttons:', closeDetailButtons.length);
    closeDetailButtons.forEach(button => {
        button.addEventListener('click', () => {
            console.log('Click on detail modal close button');
            if (detailModal) detailModal.classList.add('hidden');
        });
    });

    // Close modal when clicking outside
    detailModal?.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.add('hidden');
        }
    });

    // Delete buttons
    const deleteButtons = document.querySelectorAll('.delete-contact-btn');
    console.log('Number of "Delete" buttons found:', deleteButtons.length);
    deleteButtons.forEach(button => {
        button.addEventListener('click', function () {
            console.log('Click on "Delete" button', this.dataset);
            const contactId = this.dataset.id;
            const subject = this.dataset.subject || '-';

            const subjectElement = document.getElementById('contact-delete-subject');
            const confirmButton = document.getElementById('confirm-contact-delete-btn');
            
            if (subjectElement) subjectElement.textContent = subject;
            if (confirmButton) confirmButton.dataset.id = contactId;

            if (deleteModal) {
                deleteModal.classList.remove('hidden');
                console.log('Delete modal displayed');
            } else {
                console.error('Cannot display delete modal');
            }
        });
    });

    // Close delete modal
    const closeDeleteButton = document.getElementById('close-contact-delete-btn');
    const cancelDeleteButton = document.getElementById('cancel-contact-delete-btn');
    [closeDeleteButton, cancelDeleteButton].forEach(button => {
        if (button) {
            button.addEventListener('click', () => {
                console.log('Click on delete modal close/cancel button');
                if (deleteModal) deleteModal.classList.add('hidden');
            });
        }
    });

    // Close delete modal when clicking outside
    deleteModal?.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.add('hidden');
        }
    });

    // Confirm delete
    const confirmDeleteButton = document.getElementById('confirm-contact-delete-btn');
    if (confirmDeleteButton) {
        confirmDeleteButton.addEventListener('click', function () {
            const contactId = this.dataset.id;
            console.log('Delete confirmation for ID:', contactId);
            
            if (!window.urls || !window.urls.contacts || !window.urls.contacts.delete) {
                console.error('URLs not defined');
                return;
            }
            
            const url = window.urls.contacts.delete(contactId);
            console.log('AJAX call for deletion:', url);
            
            fetch(url, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                console.log('AJAX delete response:', response.status);
                if (!response.ok) throw new Error('Network error: ' + response.status);
                return response.json();
            })
            .then(data => {
                console.log('Received data:', data);
                if (data.status === 'success') {
                    const row = document.querySelector(`.delete-contact-btn[data-id="${contactId}"]`)?.closest('tr');
                    if (row) row.remove();
                    if (deleteModal) deleteModal.classList.add('hidden');
                    
                    if (window.toastManager) {
                        window.toastManager.showToast({
                            message: data.message,
                            type: 'success',
                            duration: 4000
                        });
                    } else {
                        alert(data.message);
                    }
                    
                    updateUnreadCount();
                } else {
                    if (deleteModal) deleteModal.classList.add('hidden');
                    
                    if (window.toastManager) {
                        window.toastManager.showToast({
                            message: 'Failed to delete the message.',
                            type: 'danger',
                            duration: 4000
                        });
                    } else {
                        alert('Failed to delete the message.');
                    }
                }
            })
            .catch(error => {
                console.error('Error during deletion:', error);
                if (deleteModal) deleteModal.classList.add('hidden');
                
                if (window.toastManager) {
                    window.toastManager.showToast({
                        message: 'An error occurred. Please try again.',
                        type: 'danger',
                        duration: 4000
                    });
                } else {
                    alert('An error occurred. Please try again.');
                }
            });
        });
    }

    // Update unread badge
    function updateUnreadCount() {
        const unreadCountBadge = document.getElementById('unread-contact-count');
        
        if (!window.urls || !window.urls.contacts || !window.urls.contacts.checkNew) {
            console.warn('URL for check_new_contacts not defined');
            return;
        }
        
        if (unreadCountBadge) {
            const checkUrl = window.urls.contacts.checkNew;
            console.log('Calling to update badge:', checkUrl);
            fetch(checkUrl, {
                method: 'GET',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                console.log('Badge response:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('Updating badge:', data.new_contacts);
                const count = data.new_contacts;
                unreadCountBadge.textContent = count;
                unreadCountBadge.classList.toggle('hidden', count === 0);
            })
            .catch(error => {
                console.error('Error updating badge:', error);
            });
        }
    }

    // Initial call for badge
    updateUnreadCount();
    setInterval(updateUnreadCount, 30000);
});
