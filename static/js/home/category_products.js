class CategoryProductsManager {
    constructor() {
        this.section = document.getElementById('category-products-section');
        this.productGrid = document.getElementById('category-products-grid');
        this.paginationControls = document.getElementById('category-products-pagination-controls');
        this.tabs = document.querySelectorAll('.category-tab');
        this.currentFilter = 'all';
        this.currentPage = 1;
        this.debounceTimeout = null;
        this.homeUrl = window.homeUrl || window.location.origin; // Use window.homeUrl with fallback to current origin

        if (!this.section || !this.productGrid || !this.paginationControls) {
            console.error('CategoryProductsManager initialization failed: Missing section, grid, or pagination controls');
            return;
        }

        console.debug('CategoryProductsManager initialized successfully');
        console.debug('Using homeUrl:', this.homeUrl);
        this.initEventListeners();
    }

    initEventListeners() {
        this.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                console.debug(`Category tab clicked: filter=${tab.dataset.filter}`);
                this.switchTab(tab);
            });
        });

        this.section.addEventListener('click', (e) => {
            const pageBtn = e.target.closest('.category-prev-btn, .category-next-btn');
            const quickViewBtn = e.target.closest('.quick-view-btn');
            if (pageBtn && !pageBtn.disabled) {
                e.preventDefault();
                this.currentPage = pageBtn.dataset.page;
                this.currentFilter = pageBtn.dataset.filter || this.currentFilter;
                console.debug(`Pagination clicked: page=${this.currentPage}, filter=${this.currentFilter}`);
                this.fetchProducts();
            } else if (quickViewBtn) {
                e.preventDefault();
                this.quickView(quickViewBtn);
            }
        });
    }

    switchTab(tab) {
        this.tabs.forEach(t => {
            t.classList.remove('bg-blue-600', 'text-white', 'hover:bg-blue-700');
            t.classList.add('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
        });
        tab.classList.remove('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
        tab.classList.add('bg-blue-600', 'text-white', 'hover:bg-blue-700');

        this.currentFilter = tab.dataset.filter || 'all';
        this.currentPage = 1;
        console.debug(`Switching to tab: filter=${this.currentFilter}, page=${this.currentPage}`);
        this.fetchProducts();
    }

    async fetchProducts() {
        try {
            // Ensure homeUrl is a valid base URL
            let baseUrl = this.homeUrl;
            if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
                baseUrl = window.location.origin + (baseUrl.startsWith('/') ? baseUrl : '/' + baseUrl);
            }
            const url = new URL(baseUrl);
            console.debug(`Base URL: ${baseUrl}`);
            url.searchParams.set('section', 'category_products');
            url.searchParams.set('filter', this.currentFilter);
            url.searchParams.set('page', this.currentPage);

            console.debug(`Fetching products with URL: ${url.toString()}`);
            this.productGrid.innerHTML = '<p class="text-center text-gray-500 py-4 col-span-full">Loading...</p>';
            const response = await fetch(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': window.csrfToken || ''
                }
            });

            if (!response.ok) {
                const text = await response.text();
                console.error(`Server returned ${response.status}: ${text.slice(0, 200)}...`);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.debug('AJAX response:', JSON.stringify(data, null, 2));
            if (data.success) {
                console.debug(`Received ${data.product_count} products for filter=${this.currentFilter}`);
                this.section.outerHTML = data.section_html;
                this.paginationControls.style.display = data.product_count <= 20 ? 'none' : 'flex';
                console.debug(`Pagination controls ${data.product_count <= 20 ? 'hidden' : 'shown'}`);

                const newUrl = new URL(window.location);
                newUrl.searchParams.set('section', 'category_products');
                newUrl.searchParams.set('filter', this.currentFilter);
                newUrl.searchParams.set('page', this.currentPage);
                window.history.pushState({}, '', newUrl);
                console.debug(`Updated browser URL: ${newUrl.toString()}`);

                if (typeof ProductManager !== 'undefined') {
                    console.debug('Reinitializing ProductManager');
                    new ProductManager();
                } else {
                    console.warn('ProductManager is not defined');
                }

                console.debug('Reinitializing CategoryProductsManager');
                new CategoryProductsManager();
            } else {
                console.error('AJAX error:', data.message || 'Unknown error');
                this.showToast(data.message || 'Error loading products', 'danger');
            }
        } catch (error) {
            console.error('Fetch error:', error.message);
            this.showToast('An error occurred while loading products', 'danger');
        }
    }

    quickView(button) {
        const productId = button.closest('.bg-white').dataset.productId;
        console.debug(`Quick view triggered for product ID: ${productId}`);
        this.showToast(`Quick view for product ${productId}`, 'info');
    }

    showToast(message, type = 'info') {
        console.debug(`Showing toast: ${message} (type: ${type})`);
        if (typeof window.toastManager !== 'undefined') {
            window.toastManager.buildToast()
                .setMessage(message)
                .setType(type)
                .setPosition('top-right')
                .setDuration(5000)
                .show();
        } else {
            console.warn('toastManager not available, falling back to alert');
            alert(message);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('category-products-section')) {
        console.debug('Initializing CategoryProductsManager on DOMContentLoaded');
        new CategoryProductsManager();
    } else {
        console.error('Category products section not found on DOMContentLoaded');
    }
});