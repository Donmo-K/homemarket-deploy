/**
 * Manages interactions on the leasing deployment list page, including displaying, creating, updating, and deleting deployments.
 * Integrates with DataTable for table rendering and Select2 for enhanced dropdowns.
 */
class ListDeploymentManager extends BaseHandler {
    /**
     * Initializes the manager, setting up the modal, form, table, and event listeners.
     */
    constructor() {
        super();

        // CSRF token for secure API requests
        this.csrfToken = document.getElementById('csrf-token').value;

        // Initialize section loader for loading states
        this.sectionLoader = new SectionLoaderManager(null, 'fill-tertiary', 0.5);

        // Deployment data from template context
        this.deployments = JSON.parse(document.getElementById('deployment-data').textContent) || [];

        // Modal for creating/updating deployments
        this.deploymentModal = new Modal(document.getElementById('deployment-modal'), {
            backdrop: 'dynamic',
            backdropClasses: 'bg-gray-900/50 fixed inset-0 z-10000001',
            closable: false
        });

        // Form and submit button elements
        this.deploymentForm = document.querySelector('#deployment-modal form');
        this.deploymentSubmitButton = document.getElementById('deployment-submit-button');

        // Input validators for form fields
        this.deploymentValidators = [];

        // API instance for deployment-related requests
        this.api = new DeploymentAPI();

        // Track the original printer options and temporary printer added for updates
        this.printerOptions = Array.from(document.querySelectorAll('#printer option:not([value=""])')).map(opt => ({
            value: opt.value,
            text: opt.text,
            serialNumber: opt.dataset.serialNumber || '',
            reference: opt.dataset.reference || ''
        }));
        this.temporaryPrinter = null;

        // Initialize components
        this.setupEventListeners();
        this.setupDatatable();
        this.setupSelect2();
    }

    // --- Initialization Methods ---

    /**
     * Sets up event listeners for buttons, form submission, table interactions, and modal close.
     */
    setupEventListeners() {
        // Initialize validators for form inputs
        const deploymentInputs = this.deploymentForm.querySelectorAll('input, select, textarea');
        this.deploymentValidators = Array.from(deploymentInputs).map(input => {
            const options = {
                iconErrors: ['required', 'format', 'maxlength', 'server'],
                feedbackId: `${input.id}_feedback`
            };
            return new InputValidationManager(input, options);
        });

        // Add new deployment button
        document.getElementById('add-deployment-button').addEventListener('click', () => this.showAddModal());

        // Close modal button
        document.getElementById('close-deployment-modal').addEventListener('click', () => {
            this.handleModalClose();
            this.deploymentModal.hide();
        });

        // Form submission
        this.deploymentForm.addEventListener('submit', (e) => this.handleDeploymentFormSubmit(e));

        // Table row actions (update/delete)
        document.getElementById('deployments-content').addEventListener('click', async (event) => {
            const updateButton = event.target.closest('.edit-btn');
            const deleteButton = event.target.closest('.delete-btn');
            const row = event.target.closest('tr');

            if (updateButton && row) {
                await this.handleUpdate(row);
            } else if (deleteButton && row) {
                await this.handleDelete(row);
            }
        });
    }

    /**
     * Initializes Select2 for leasing_client and printer dropdowns with custom rendering.
     */
    setupSelect2() {
        // Select Modal
        const $modal = $('#deployment-modal');

        // Leasing Client Select2
        $('#leasing_client').select2({
            theme: 'tailwindcss-4',
            width: '100%',
            placeholder: gettext('Select a leasing client'),
            allowClear: true,
            language: {
                noResults: () => gettext('No clients found')
            },
            templateResult: (data) => {
                if (!data.element) return data.text;
                const email = $(data.element).data('email');
                const displayName = data.text || email;
                const showEmail = data.text && email;
                return $(
                    `<div class="flex flex-col">
                        <span class="font-bold">
                            ${displayName}
                            ${showEmail ? `<span class="font-medium">(${email})</span>` : ''}
                        </span>
                        <span class="text-xs">
                            <div class="flex items-center justify-start">
                                <span class="font-semibold me-0.5">${gettext("Contract N°")}</span>
                                ${$(data.element).data('contract-number')}
                            </div>
                        </span>
                    </div>`
                );
            },
            templateSelection: (data) => {
                if (!data.element) return data.text;
                const email = $(data.element).data('email');
                const displayName = data.text || email;
                const showEmail = data.text && email;
                return $(
                    `<div class="flex flex-col">
                        <span class="font-semibold">
                            ${displayName}
                            ${showEmail ? `<span class="font-normal">(${email})</span>` : ''}
                        </span>
                        <span class="text-xs">
                            <div class="flex items-center justify-start">
                                <span class="font-medium me-0.5">${gettext("Contract N°")}</span>
                                ${$(data.element).data('contract-number')}
                            </div>
                        </span>
                    </div>`
                );
            },
            dropdownParent: $modal,
        });

        // Printer Select2
        $('#printer').select2({
            theme: 'tailwindcss-4',
            width: '100%',
            placeholder: gettext('Select a printer'),
            allowClear: true,
            language: {
                noResults: () => gettext('No available printers found')
            },
            templateResult: (data) => {
                if (!data.element || !data.element.value) return data.text;
                return $(
                    `<div class="flex flex-col">
                        <span class="font-bold text-sm">${data.text}</span>
                        <span class="text-xs">
                            ${gettext('Serial Number')}: ${$(data.element).data('serial-number') || ''}
                            <br>
                            ${gettext('Reference')}: ${$(data.element).data('reference') || ''}
                        </span>
                    </div>`
                );
            },
            templateSelection: (data) => {
                if (!data.element || !data.element.value) return data.text;
                return $(
                    `<div class="flex flex-col text-sm">
                        <span>${data.text}</span>
                    </div>`
                );
            },
            dropdownParent: $modal,
        });
    }

    /**
     * Initializes the DataTable for displaying deployments.
     */
    setupDatatable() {
        if (!document.getElementById('deployments-table')) return;

        this.table = new simpleDatatables.DataTable('#deployments-table', {
            selectable: false,
            tabIndex: 1,
            classes: {
                bottom: "datatable-bottom px-5 !mt-2 pb-1",
                container: "datatable-container",
                empty: "datatable-empty",
                table: "datatable-table",
                top: "datatable-top bg-white p-5 !m-0",
                wrapper: "datatable-wrapper bg-white",
            },
            rowRender: (row, tr, _index) => {
                tr.attributes = {
                    id: `deployment-row-${row.cells[5].data}`,
                    'data-id': row.cells[5].data,
                    ...tr.attributes
                };
                return tr;
            },
            columns: [
                {
                    select: 0,
                    sortable: false,
                    searchMethod: (terms, cell, row, column, source) => {
                        const [serialNumber, reference, designation, image] = cell.data;
                        // Construct the rendered text as it appears in the cell
                        const renderedText = [
                            designation || '',
                            reference ? `${pgettext("Printer Reference", "Ref")}: ${reference}` : '',
                            serialNumber ? `${pgettext("Printer Serial Number", "SN")}: ${serialNumber}` : ''
                        ].filter(Boolean).join(' ').toLowerCase();
                        // Normal search: check if any term is included in the rendered text
                        return terms.some(term => renderedText.includes(term.toLowerCase().trim()));
                    },
                    render: (data, cell) => {
                        cell.attributes = {class: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 w-full'};
                        const [serialNumber, reference, designation, image] = data;
                        return `
                            <div class="flex items-start justify-start gap-2 w-full me-3">
                                <img src="${image || window.AppConfig.urls.defaultPrinterURL}" class="w-12 h-12 rounded-md object-cover flex-shrink-0 mt-2" alt="">
                                <div>
                                    ${designation ? `<div class="text-sm font-semibold text-gray-900 truncate printer-designation" title="${designation}">${designation}</div>` : ''}
                                    ${reference ? `<div class="text-xs text-gray-600 truncate printer-ref">${pgettext("Printer Reference", "Ref")}: ${reference}</div>` : ''}
                                    ${serialNumber ? `<div class="text-xs text-gray-600 truncate printer-serial-number">${pgettext("Printer Serial Number", "SN")}: ${serialNumber}</div>` : ''}
                                </div>
                            </div>
                        `;
                    },
                },
                {
                    select: 1,
                    sortable: false,
                    searchMethod: (terms, cell, row, column, source) => {
                        const [fullName, email, profileImageURL, contractNumber] = cell.data;
                        const renderedText = [
                            fullName || '',
                            email || '',
                            contractNumber ? `${gettext("Contract N°")} ${contractNumber}` : ''
                        ].filter(Boolean).join(' ').toLowerCase();
                        return terms.some(term => renderedText.includes(term.toLowerCase().trim()));
                    },
                    render: (data, cell) => {
                        cell.attributes = {class: 'p-4 text-sm text-gray-900 align-top'};
                        const [fullName, email, profileImageURL, contractNumber] = data;
                        return `
                            <div class="flex items-center gap-1.5 min-w-0">
                                ${profileImageURL ? `
                                    <img src="${profileImageURL}" class="w-10 h-10 rounded-full flex-shrink-0" alt="">
                                ` : `
                                    <svg class="w-10 h-10 text-gray-400 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                        <path fill-rule="evenodd" d="M12 20a7.966 7.966 0 0 1-5.002-1.756l.002.001v-.683c0-1.794 1.492-3.25 3.333-3.25h3.334c1.84 0 3.333 1.456 3.333 3.25v.683A7.966 7.966 0 0 1 12 20ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10c0 5.5-4.44 9.963-9.932 10h-.138C6.438 21.962 2 17.5 2 12Zm10-5c-1.84 0-3.333 1.455-3.333 3.25S10.159 13.5 12 13.5c1.84 0 3.333-1.455 3.333-3.25S13.841 7 12 7Z" clip-rule="evenodd"></path>
                                    </svg>
                                `}
                                <div class="text-sm font-normal text-gray-500 min-w-0">
                                    ${fullName ? `<div class="text-sm font-semibold text-gray-900 truncate printer-full-name" title="${fullName}">${fullName}</div>` : ''}
                                    ${email ? `<div class="text-xs font-normal text-gray-500 truncate printer-email" title="${email}">${email}</div>` : ''}
                                    ${contractNumber ? `<div class="text-xs font-normal text-gray-500 truncate printer-contract-number">${gettext("Contract N°")} ${contractNumber}</div>` : ''}
                                </div>
                            </div>
                        `;
                    },
                },
                {
                    select: 2,
                    sort: 'asc',
                    type: 'string',
                    searchMethod: (terms, cell, row, column, source) => {
                        const renderedText = (cell.data || '').toLowerCase();
                        return terms.some(term => renderedText.includes(term.toLowerCase().trim()));
                    },
                    render: (data, cell) => {
                        cell.attributes = {class: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900'};
                        return `<div class="flex items-center">${data}</div>`;
                    }
                },
                {
                    select: 3,
                    sort: 'asc',
                    type: 'date',
                    format: "DD-MM-YYYY",
                    searchMethod: (terms, cell, row, column, source) => {
                        const renderedText = (cell.data || '').toLowerCase();
                        return terms.some(term => renderedText.includes(term.toLowerCase().trim()));
                    },
                    render: (data, cell) => {
                        cell.attributes = {class: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900'};
                        return `<div class="flex items-center" data-date-iso="${data}">${data}</div>`;
                    },
                },
                {
                    select: 4,
                    sort: 'asc',
                    type: 'string',
                    searchMethod: (terms, cell, row, column, source) => {
                        const renderedText = (cell.data || '').toLowerCase();
                        return terms.some(term => renderedText.includes(term.toLowerCase().trim()));
                    },
                    render: (data, cell) => {
                        cell.attributes = {class: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900'};
                        return `<div class="flex items-center">${data}</div>`;
                    }
                },
                {
                    select: 5,
                    sortable: false,
                    type: 'string',
                    render: (data, cell) => {
                        cell.attributes = {class: 'px-6 py-4 whitespace-nowrap text-sm'};
                        return `
                            <button type="button" class="edit-btn inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white rounded-lg bg-tertiary/90 hover:bg-tertiary/95 focus:ring-4 focus:ring-tertiary/15 cursor-pointer me-1.5">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path>
                                    <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path>
                                </svg>
                            </button>
                            <button type="button" class="delete-btn inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-red-600 rounded-lg hover:bg-red-800 focus:ring-4 focus:ring-red-300 cursor-pointer">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                                </svg>
                            </button>
                        `;
                    }
                }
            ], labels: {
                placeholder: gettext('Search...'),
                searchTitle: gettext('Search within table'),
                pageTitle: gettext('Page {page}'),
                perPage: gettext('entries per page'),
                noRows: gettext('No deployment found.'),
                info: gettext('Showing {start} to {end} of {rows} entries'),
                noResults: gettext('No results match your search query')
            }
        });

        // Transform deployment data for DataTable
        const tableData = this.deployments.map(deployment => [
            [
                deployment.printer?.serial_number || '',
                deployment.printer?.reference || '',
                deployment.printer?.designation || '',
                deployment.printer?.image_url || ''
            ],
            [
                deployment.leasing_client?.user.full_name || '',
                deployment.leasing_client?.user.email || '',
                deployment.leasing_client?.user.photo_url || '',
                deployment.leasing_client?.contract_number || ''
            ],
            deployment.site || '',
            deployment?.deployment_date?.iso || "",
            deployment.ip_address || '',
            deployment.pk
        ]);

        // Insert data into the table
        this.table.insert({data: tableData});
    }

    // --- Table Management Methods ---

    /**
     * Adds a new row to the DataTable.
     * @param {Object} data - Deployment data to add.
     */
    addRow(data) {
        this.table.rows.add([
            [
                data.printer?.serial_number || '',
                data.printer?.reference || '',
                data.printer?.designation || '',
                data.printer?.image_url || ''
            ],
            [
                data.leasing_client?.user.full_name || '',
                data.leasing_client?.user.email || '',
                data.leasing_client?.user.photo_url || '',
                data.leasing_client?.contract_number || ''
            ],
            data.site || '',
            data?.deployment_date?.iso || '',
            data.ip_address || '',
            data.pk
        ]);
    }

    /**
     * Removes a row from the DataTable by index.
     * @param {number} index - Index of the row to remove.
     */
    removeRow(index) {
        this.table.rows.remove(index);
    }

    // --- Modal Handling Methods ---

    /**
     * Displays the modal for creating a new deployment.
     */
    showAddModal() {
        this.deploymentForm.reset();
        this.clearFormErrors(this.deploymentForm, this.deploymentValidators);
        this.setDeploymentModalTitle(gettext('Create New Deployment'));
        this.deploymentForm.dataset.action = 'create';
        delete this.deploymentForm.dataset.id;
        this.deploymentSubmitButton.querySelector('span').textContent = gettext('Add new deployment');
        $('#leasing_client').val(null).trigger('change');
        $('#printer').val(null).trigger('change');

        // Reset printer options to only show non-deployed printers
        this.resetPrinterOptions();
        this.deploymentModal.show();
    }

    /**
     * Sets the title of the deployment modal.
     * @param {string} title - Title to set.
     */
    setDeploymentModalTitle(title) {
        document.querySelector('#deployment-modal h3').textContent = title;
    }

    /**
     * Resets the printer dropdown to only include non-deployed printers.
     */
    resetPrinterOptions() {
        const $printer = $('#printer');
        $printer.empty();
        this.printerOptions.forEach(opt => {
            // Only add non-deployed printers
            if (!this.deployments.some(d => d.printer?.pk === opt.value)) {
                $printer.append(
                    `<option value="${opt.value}" data-serial-number="${opt.serialNumber}" data-reference="${opt.reference}">${opt.text}</option>`
                );
            }
        });
        $printer.trigger('change');
    }

    /**
     * Adds a temporary printer option to the dropdown for updates.
     * @param {Object} printer - Printer data from API response.
     */
    addTemporaryPrinterOption(printer) {
        if (!printer) return;
        this.temporaryPrinter = {
            value: printer.pk,
            text: printer.designation,
            serialNumber: printer.serial_number || '',
            reference: printer.reference || ''
        };
        const $printer = $('#printer');
        // Check if the option already exists to avoid duplicates
        if (!$printer.find(`option[value="${this.temporaryPrinter.value}"]`).length) {
            $printer.append(
                `<option value="${this.temporaryPrinter.value}" data-serial-number="${this.temporaryPrinter.serialNumber}" data-reference="${this.temporaryPrinter.reference}">${this.temporaryPrinter.text}</option>`
            );
            $printer.trigger('change');
        }
    }

    /**
     * Handles modal close to clean up temporary printer options.
     */
    handleModalClose() {
        // Remove temporary printer option if it exists
        if (this.temporaryPrinter) {
            const $printer = $('#printer');
            $printer.find(`option[value="${this.temporaryPrinter.value}"]`).remove();
            $printer.trigger('change');
            this.temporaryPrinter = null;
        }
    }

    /**
     * Updates printerOptions after a create or update to reflect current state.
     * @param {string} removedPrinterPk - The printer PK to remove from printerOptions.
     * @param {Object} [addedPrinter] - The printer to add to printerOptions, if any.
     */
    updatePrinterOptions(removedPrinterPk, addedPrinter = null) {
        if (removedPrinterPk) {
            this.printerOptions = this.printerOptions.filter(opt => opt.value !== removedPrinterPk);
        }
        if (addedPrinter) {
            this.printerOptions.push({
                value: addedPrinter.pk,
                text: addedPrinter.designation,
                serialNumber: addedPrinter.serial_number || '',
                reference: addedPrinter.reference || ''
            });
        }
    }

    // --- Form Handling Methods ---

    /**
     * Clears all form errors, including feedback messages and styling.
     * @param {HTMLElement} form - Form element.
     * @param {Array} validators - Array of InputValidationManager instances.
     */
    clearFormErrors(form, validators) {
        validators.forEach(validator => validator.clearErrors());
    }

    /**
     * Handles form submission for creating or updating a deployment.
     * @param {Event} event - Form submission event.
     */
    async handleDeploymentFormSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const action = form.dataset.action;
        const id = form.dataset.id;
        const newPrinterPk = formData.get('printer');
        const previousPrinterPk = this.temporaryPrinter?.value;

        this.sectionLoader.showLoader();
        try {
            const response = action === 'create' ? await this.api.create(formData) : await this.api.update(id, formData);
            const data = await this.handleResponse(response, this.deploymentForm, this.deploymentValidators);

            window.toastManager.buildToast()
                .setMessage(action === 'create' ? gettext('Deployment created successfully') : gettext('Deployment updated successfully'))
                .setType('success')
                .setPosition('top-right')
                .setDuration(4000)
                .show();

            if (action === 'create') {
                this.addRow(data.data);
                // Remove the newly selected printer from the dropdown and update printerOptions
                if (newPrinterPk) {
                    const $printer = $('#printer');
                    $printer.find(`option[value="${newPrinterPk}"]`).remove();
                    $printer.trigger('change');
                    this.updatePrinterOptions(newPrinterPk);
                }
                this.deployments.push(data.data);
            } else {
                const rowElement = document.querySelector(`#deployments-table tbody tr[data-id="${id}"]`);
                if (rowElement) {
                    this.removeRow(parseInt(rowElement.dataset.index));
                    this.addRow(data.data);
                }
                // Handle printer dropdown updates
                const $printer = $('#printer');
                if (newPrinterPk === previousPrinterPk) {
                    // If the printer didn't change, remove the temporary printer option
                    if (this.temporaryPrinter) {
                        $printer.find(`option[value="${this.temporaryPrinter.value}"]`).remove();
                        $printer.trigger('change');
                        this.temporaryPrinter = null;
                    }
                } else {
                    // If the printer changed, remove the new printer and restore the previous one
                    if (newPrinterPk) {
                        $printer.find(`option[value="${newPrinterPk}"]`).remove();
                        this.deployments = this.deployments.filter(deployment => deployment.pk !== data.data.pk);
                        this.deployments.push(data.data);
                        this.updatePrinterOptions(newPrinterPk, {
                            pk: this.temporaryPrinter.value,
                            reference: this.temporaryPrinter.reference,
                            serial_number: this.temporaryPrinter.serialNumber,
                            designation: this.temporaryPrinter.text,
                        });
                        this.temporaryPrinter = null;
                        $printer.trigger('change');
                    }
                }
            }

            this.clearFormErrors(form, this.deploymentValidators);
            this.deploymentModal.hide();
        } catch (error) {
            this.handleError(error, 'Error processing deployment form', gettext('An error occurred while processing the deployment form.'));
        } finally {
            this.sectionLoader.hideLoader();
        }
    }

    /**
     * Handles updating a deployment by populating the modal with existing data.
     * @param {HTMLElement} row - Table row element.
     */
    async handleUpdate(row) {
        this.deploymentForm.reset();
        this.clearFormErrors(this.deploymentForm, this.deploymentValidators);
        const id = row.dataset.id;
        this.sectionLoader.showLoader();

        try {
            const response = await this.api.retrieve(id);
            const result = await this.handleResponse(response, this.deploymentForm, this.deploymentValidators);

            // Reset printer options and add the current printer if not in the list
            this.resetPrinterOptions();
            if (result.data.printer && !this.printerOptions.some(opt => opt.value === result.data.printer.pk)) {
                this.addTemporaryPrinterOption(result.data.printer);
            }

            // Populate form fields
            document.getElementById('site').value = result.data.site || '';
            document.getElementById('ip_address').value = result.data.ip_address || '';
            document.getElementById('deployment_date').value = result.data?.deployment_date?.iso || '';
            $('#leasing_client').val(result.data.leasing_client || '').trigger('change');
            $('#printer').val(result.data.printer?.pk || '').trigger('change');

            this.setDeploymentModalTitle(gettext('Edit Deployment'));
            this.deploymentForm.dataset.action = 'update';
            this.deploymentForm.dataset.id = id;
            this.deploymentSubmitButton.querySelector('span').textContent = gettext('Update deployment');
            this.deploymentModal.show();
        } catch (error) {
            this.handleError(error, 'Error retrieving deployment', gettext('An error occurred while retrieving the deployment.'));
        } finally {
            this.sectionLoader.hideLoader();
        }
    }

    /**
     * Handles deletion of a deployment with confirmation.
     * @param {HTMLElement} row - Table row element.
     */
    async handleDelete(row) {
        const id = row.dataset.id;
        const message = gettext('Are you sure you want to delete this deployment?');
        const confirmText = gettext('Yes, delete');
        const cancelText = gettext('Cancel');

        const confirmed = await window.deleteModalManager.show(message, confirmText, cancelText);
        if (!confirmed) return;

        this.sectionLoader.showLoader();

        try {
            const response = await this.api.delete(id);
            const result = await this.handleResponse(response, this.deploymentForm, this.deploymentValidators);

            window.toastManager.buildToast()
                .setMessage(gettext('Deployment deleted successfully'))
                .setType('success')
                .setPosition('top-right')
                .setDuration(4000)
                .show();

            // Restore the deleted deployment's printer to the dropdown and update printerOptions
            if (result.data.printer) {
                const $printer = $('#printer');
                const printer = result.data.printer;
                if (!$printer.find(`option[value="${printer.pk}"]`).length) {
                    $printer.append(
                        `<option value="${printer.pk}" data-serial-number="${printer.serial_number || ''}" data-reference="${printer.reference || ''}">${printer.designation}</option>`
                    );
                    this.updatePrinterOptions(null, printer);
                    $printer.trigger('change');
                }
            }

            this.removeRow(parseInt(row.dataset.index));
            this.deployments = this.deployments.filter(deployment => deployment.pk !== id);
        } catch (error) {
            this.handleError(error, 'Error deleting deployment', gettext('An error occurred while deleting the deployment.'));
        } finally {
            this.sectionLoader.hideLoader();
        }
    }

    // --- API Response Handling ---

    /**
     * Processes API responses and handles form errors.
     * @param {Response} response - API response.
     * @param {HTMLElement} form - Form element.
     * @param {Array} validators - Array of InputValidationManager instances.
     * @returns {Promise<Object>} Parsed JSON response.
     * @throws {Error} If the response is not OK.
     */
    async handleResponse(response, form, validators) {
        if (!response.ok) {
            let err;
            try {
                err = await response.json();
            } catch (jsonError) {
                throw new Error(gettext('Operation failed'));
            }

            if (response.status === 400 && err?.errors) {
                this.clearFormErrors(form, validators);
                let firstErrorField = null;
                Object.entries(err.errors).forEach(([field, messages]) => {
                    const input = form.querySelector(`[name="${field}"]`);
                    if (input) {
                        const validator = validators.find(v => v.input === input);
                        if (validator) {
                            const errorMessages = Array.isArray(messages) ? messages : [messages];
                            validator.setInvalid(errorMessages);
                        }
                        const inputs = Array.from(form.querySelectorAll('input, select'));
                        if (!firstErrorField || inputs.indexOf(input) < inputs.indexOf(firstErrorField)) {
                            firstErrorField = input;
                        }
                    }
                });
                throw new Error(gettext('Invalid form, please fill form correctly and try again.'));
            }

            let message = err?.error || gettext('Operation failed');
            if (response.status === 403) {
                message = gettext('You are not authorized. Please log in and try again.');
            } else if (response.status === 500) {
                message = gettext('Server error occurred. Please try again later.');
            } else if (response.status === 409) {
                message = gettext('Coming soon.');
            }
            throw new Error(message);
        }

        try {
            return await response.json();
        } catch {
            return {}
        }
    }
}

/**
 * Initializes ListDeploymentManager when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    new ListDeploymentManager();
});
