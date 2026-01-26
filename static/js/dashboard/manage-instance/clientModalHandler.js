document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('client-modal');
    const openBtn = document.getElementById('addNewClientBtn');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-modal');
    const form = document.getElementById('client-form');
    const saveBtn = document.getElementById('save-client');
    const saveText = document.getElementById('save-text');
    const saveSpinner = document.getElementById('save-spinner');
    const generalError = document.getElementById('general-error');
    const emailError = document.getElementById('email-error');
    const password1Error = document.getElementById('password1-error');
    const password2Error = document.getElementById('password2-error');

    const addClientUrl = window.urls.instances.add_client;

    function showToast(message, type = 'info') {
        window.toastManager.buildToast()
            .setMessage(message)
            .setType(type) // 'success', 'danger', etc.
            .setPosition('top-right')
            .setDuration(500)
            .show();
    }

    function openModal() {
        modal.classList.remove('hidden');
        form.reset();
        hideErrors();
        saveBtn.disabled = false;
        saveText.classList.remove('hidden');
        saveSpinner.classList.add('hidden');
        document.getElementById('client_email').focus();
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    function hideErrors() {
        [generalError, emailError, password1Error, password2Error].forEach(e => {
            e.textContent = '';
            e.classList.add('hidden');
        });
    }

    function validatePassword(password) {
        // Minimum 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-])[A-Za-z\d@$!%*?&_\-]{8,}$/;
        return regex.test(password);
    }

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (modal) {
        modal.addEventListener('click', function (event) {
            if (event.target === modal) closeModal();
        });
    }

    if (form) {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            event.stopPropagation();

            hideErrors();

            const password1 = document.getElementById('client_password1').value;
            const password2 = document.getElementById('client_password2').value;

            // Client-side quick check before sending to server
            if (!validatePassword(password1)) {
                const msg = "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.";
                password1Error.textContent = msg;
                password1Error.classList.remove('hidden');
                showToast(msg, "danger");
                return;
            }

            if (password1 !== password2) {
                const msg = "Passwords do not match.";
                password1Error.textContent = msg;
                password1Error.classList.remove('hidden');
                password2Error.textContent = msg;
                password2Error.classList.remove('hidden');
                showToast(msg, "danger");
                return;
            }

            saveBtn.disabled = true;
            saveText.classList.add('hidden');
            saveSpinner.classList.remove('hidden');

            const formData = new FormData(form);

            fetch(addClientUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': formData.get('csrfmiddlewaretoken'),
                    'Accept': 'application/json'
                }
            })
                .then(response => response.json().then(data => ({ status: response.status, body: data })))
                .then(({ status, body }) => {
                    if (body.success) {
                        // Add new client to select
                        const clientSelect = document.getElementById('user');
                        const newOption = document.createElement('option');
                        newOption.value = body.client.id;
                        newOption.textContent = body.client.full_name || body.client.email;
                        newOption.selected = true;
                        clientSelect.appendChild(newOption);

                        closeModal();
                        showToast(body.message, "success");
                    } else {
                        // Show error based on field returned by backend
                        switch (body.field) {
                            case "email":
                                emailError.textContent = body.error;
                                emailError.classList.remove('hidden');
                                break;
                            case "password":
                                password1Error.textContent = body.error;
                                password1Error.classList.remove('hidden');
                                password2Error.textContent = body.error;
                                password2Error.classList.remove('hidden');
                                break;
                            default:
                                generalError.textContent = body.error;
                                generalError.classList.remove('hidden');
                                break;
                        }
                        showToast(body.error, "danger");
                    }
                })
                .catch(() => {
                    const msg = "An unexpected error occurred. Please try again later.";
                    generalError.textContent = msg;
                    generalError.classList.remove('hidden');
                    showToast(msg, "danger");
                })
                .finally(() => {
                    saveBtn.disabled = false;
                    saveText.classList.remove('hidden');
                    saveSpinner.classList.add('hidden');
                });
        });
    }
});


