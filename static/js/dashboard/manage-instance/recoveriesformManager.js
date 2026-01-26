document.addEventListener('DOMContentLoaded', function() {
    // Initialize SectionLoaderManager for the body
    const loaderManager = new SectionLoaderManager(null, 0.5, 'fill-indigo-600', 0.5);

    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            loaderManager.showLoader(); 
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
                loaderManager.hideLoader(); 
                if (!response.ok) {
                    throw new Error(gettext('An error occurred while submitting the form.'));
                }
                return response.json();
            })
            .then(data => {
                console.debug(gettext('Form submission response:'), data);
                if (data.success) {
                    const toast = window.toastManager.buildToast()
                        .setMessage(data.message)
                        .setType('success')
                        .setPosition('top-right')
                        .setDuration(500)
                        .show();

                    setTimeout(() => {
                        window.location.href = window.urls.recouvrement.list;
                    }, 500); 
                } else {
                    // Display backend-provided error message
                    window.toastManager.buildToast()
                        .setMessage(data.message)
                        .setType('danger')
                        .setPosition('top-right')
                        .setDuration(500)
                        .show();
                }
            })
            .catch(error => {
                loaderManager.hideLoader(); 
                window.toastManager.buildToast()
                    .setMessage(gettext('a recovery already exists with this Invoice Reference name'))
                    .setType('danger')
                    .setPosition('top-right')
                    .setDuration(500)
                    .show();
            });
        });
    }
});

