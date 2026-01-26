document.addEventListener('DOMContentLoaded', function() {
    const loaderManager = new SectionLoaderManager();

    // Handle form submission
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
                if (data.success) {
                    const toast = window.toastManager.buildToast()
                        .setMessage(data.message)
                        .setType('success')
                        .setPosition('top-right')
                        .setDuration(500)
                        .show();

                    // Wait for the toast duration before redirecting
                    setTimeout(() => {
                        window.location.href = window.urls.instances.list;
                    }, 500); // Match the toast duration
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
                    .setMessage(gettext('An unexpected error occurred. Please try again.'))
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
            const fileName = this.files[0] ? this.files[0].name : gettext('No file selected');
            document.getElementById('file_name').textContent = fileName;
            console.debug(gettext('Selected file:'), fileName);
        });
    }

    // Handle client search
    const userSearch = document.getElementById('user_search');
    const clientResults = document.getElementById('client_results');
    const userSelect = document.getElementById('user');
    let allOptions = [];

    if (userSearch && clientResults && userSelect) {
        allOptions = Array.from(userSelect.options).slice(1); 
        console.debug(gettext('Initialized client options:'), allOptions.length);

        userSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            userSelect.innerHTML = `<option value="" disabled selected class="text-gray-500">${gettext('Select a client from results')}</option>`;
            const filteredOptions = allOptions.filter(option => option.text.toLowerCase().includes(searchTerm));
            filteredOptions.forEach(option => {
                userSelect.appendChild(option.cloneNode(true));
            });
            clientResults.classList.toggle('hidden', searchTerm === '');
            console.debug(gettext('Filtered clients:'), filteredOptions.length);
        });

        userSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption.value !== '') {
                userSearch.value = selectedOption.text;
                clientResults.classList.add('hidden');
                console.debug(gettext('Selected client:'), selectedOption.text);
            }
        });

        if (userSearch.value === '') {
            clientResults.classList.add('hidden');
        }
    }
});

