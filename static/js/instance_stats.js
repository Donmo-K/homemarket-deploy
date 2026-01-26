class InstanceStatsManager {
    constructor(config) {
        this.fetchUrl = config.fetchUrl;
        this.chartData = config.chartData || [];
        this.chartLabels = config.chartLabels || [];
        this.clientTable = null;
        this.responsibleTable = null;
        this.instanceTable = null;
        this.chart = null;
        this.chartType = 'line';
        this.colors = [
            'bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-yellow-100 text-yellow-800',
            'bg-red-100 text-red-800', 'bg-purple-100 text-purple-800', 'bg-indigo-100 text-indigo-800',
            'bg-pink-100 text-pink-800', 'bg-teal-100 text-teal-800', 'bg-cyan-100 text-cyan-800',
            'bg-orange-100 text-orange-800', 'bg-amber-100 text-amber-800', 'bg-lime-100 text-lime-800',
            'bg-emerald-100 text-emerald-800', 'bg-sky-100 text-sky-800', 'bg-violet-100 text-violet-800'
        ];
    }

    init() {
        this.initEventListeners();
        this.initDataTables();
        this.initChart();
        this.assignRandomBadgeColors();
    }

    initEventListeners() {
        // Toggle status progress
        const toggleButton = document.getElementById('toggle-status-progress');
        const hiddenStatus = document.getElementById('hidden-status');
        if (toggleButton && hiddenStatus) {
            let isExpanded = false;
            toggleButton.addEventListener('click', () => {
                hiddenStatus.classList.toggle('hidden');
                toggleButton.textContent = isExpanded ? 'View All' : 'Show Less';
                isExpanded = !isExpanded;
                this.assignRandomBadgeColors();
            });
        }

        // View instance buttons
        document.querySelectorAll('.view-instance-btn').forEach(button => {
            button.addEventListener('click', () => this.openInstanceModal(button));
        });

        // Close modal
        const modal = document.getElementById('instance-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeInstanceModal();
            });
        }

        // Close modal button
        const closeButton = document.getElementById('close-instance-modal-btn');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.closeInstanceModal());
        }

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                this.closeInstanceModal();
            }
        });

        // Filter form validation
        const filterForm = document.getElementById('instance-filter-form');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => {
                const startDate = new Date(document.getElementById('start_date').value);
                const endDate = new Date(document.getElementById('end_date').value);
                if (startDate && endDate && startDate > endDate) {
                    e.preventDefault();
                    alert('End date must be after start date');
                }
            });
        }

        // Toggle chart type
        const toggleChartButton = document.getElementById('toggleInstanceChartType');
        if (toggleChartButton) {
            toggleChartButton.addEventListener('click', () => this.toggleChartType());
        }
    }

    initDataTables() {
        if (typeof simpleDatatables === 'undefined') return;

        if (document.getElementById('client-instance-table')) {
            this.clientTable = new simpleDatatables.DataTable('#client-instance-table', {
                searchable: true,
                fixedHeight: false,
                perPage: 10,
                perPageSelect: [5, 10, 15, 20],
                labels: {
                    placeholder: "Search clients...",
                    perPage: "clients per page",
                    noRows: "No clients found",
                    info: "Showing {start} to {end} of {rows} clients"
                }
            });
        }

        if (document.getElementById('responsible-instance-table')) {
            this.responsibleTable = new simpleDatatables.DataTable('#responsible-instance-table', {
                searchable: true,
                fixedHeight: false,
                perPage: 10,
                perPageSelect: [5, 10, 15, 20],
                labels: {
                    placeholder: "Search responsibles...",
                    perPage: "responsibles per page",
                    noRows: "No responsibles found",
                    info: "Showing {start} to {end} of {rows} responsibles"
                }
            });
        }
    }

    initChart() {
        const ctx = document.getElementById('instanceTrendChart');
        if (!ctx) return;

        this.chart = new Chart(ctx.getContext('2d'), {
            type: this.chartType,
            data: {
                labels: this.chartLabels,
                datasets: this.chartData
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12, padding: 20, usePointStyle: true } },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 4,
                        displayColors: true,
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${context.parsed.y}`
                        }
                    },
                    datalabels: { display: false }
                },
                scales: {
                    x: { grid: { display: false, drawBorder: false }, ticks: { maxRotation: 45, minRotation: 45 } },
                    y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)', drawBorder: false } }
                },
                interaction: { mode: 'nearest', axis: 'x', intersect: false }
            },
            plugins: [ChartDataLabels]
        });
    }

    assignRandomBadgeColors() {
        document.querySelectorAll('.status-badge').forEach(badge => {
            const randomIndex = Math.floor(Math.random() * this.colors.length);
            badge.classList.add(...this.colors[randomIndex].split(' '));
        });
    }

    async openInstanceModal(button) {
        const modal = document.getElementById('instance-modal');
        const userName = button.getAttribute('data-user-name');
        const userId = button.getAttribute('data-user-id');
        const type = button.getAttribute('data-type') || 'client';
        const tableBody = document.getElementById('instance-details-table-body');
        const userNameSpan = document.getElementById('instance-modal-user-name');

        if (!modal || !tableBody || !userNameSpan) return;

        userNameSpan.textContent = userName;
        tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Loading...</td></tr>';

        try {
            const response = await fetch(`${this.fetchUrl}?user_id=${encodeURIComponent(userId)}&type=${type}`, {
                method: 'GET',
                headers: { 'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || '' }
            });

            if (!response.ok) throw new Error('Failed to fetch instances');
            const data = await response.json();
            tableBody.innerHTML = '';

            if (data.instances && data.instances.length > 0) {
                data.instances.forEach(instance => {
                    const row = document.createElement('tr');
                    row.className = 'hover:bg-gray-50';
                    row.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${instance.numero_dossier || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${instance.type_instance || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${this.getStatusColor(instance.statut)}">
                                ${instance.statut || 'N/A'}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${instance.is_facturable ? 'Yes' : 'No'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${instance.created || 'N/A'}</td>
                    `;
                    tableBody.appendChild(row);
                });
            } else {
                tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No instances found.</td></tr>';
            }

            this.initInstanceTable();
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Error loading instances: ${error.message}</td></tr>`;
            console.error('Fetch error:', error);
        }

        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    }

    initInstanceTable() {
        if (typeof simpleDatatables === 'undefined' || !document.getElementById('instance-details-table')) return;

        if (this.instanceTable) this.instanceTable.destroy();
        this.instanceTable = new simpleDatatables.DataTable('#instance-details-table', {
            searchable: true,
            fixedHeight: false,
            perPage: 5,
            perPageSelect: [5, 10, 15],
            labels: {
                placeholder: "Search instances...",
                perPage: "instances per page",
                noRows: "No instances found.",
                info: "Showing {start} to {end} of {rows} instances"
            }
        });
    }

    closeInstanceModal() {
        const modal = document.getElementById('instance-modal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }
        if (this.instanceTable) {
            this.instanceTable.destroy();
            this.instanceTable = null;
        }
    }

    toggleChartType() {
        this.chartType = this.chartType === 'line' ? 'bar' : 'line';
        if (this.chart) {
            this.chart.destroy();
            this.initChart();
        }
    }

    getStatusColor(status) {
        const statusColors = {
            'EN_COURS': 'bg-yellow-100 text-yellow-800',
            'TERMINE': 'bg-green-100 text-green-800',
            'EN_ATTENTE': 'bg-red-100 text-red-800'
            // Add more status-color mappings as needed
        };
        return statusColors[status] || 'bg-gray-100 text-gray-800';
    }
}