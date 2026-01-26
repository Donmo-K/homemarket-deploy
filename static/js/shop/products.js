// Corrected js/home/products.js
/**
 * Gère le filtrage et la mise à jour des produits pour la page shop e-commerce avec des fonctionnalités avancées.
 * Inclut un design modulaire, des logs horodatés, une logique de retry, un affichage des headers, et une gestion robuste des erreurs.
 * Ajouts: debounce pour search/price, mise à jour de pagination, gestion radio pour stock/type.
 * 
 * Manages product filtering and updates for the e-commerce shop page with professional-grade features.
 * Includes modular design, timestamped logging, retry mechanism, header logging, and robust error handling.
 * Additions: debounce for search/price, pagination update, radio handling for stock/type.
 */
class ProductFilterManager {
    constructor() {
        this.endpoints = {
            shop: '/shop/'  // Adjust if your shop URL is different
        };
        this.selectors = {
            search: '#search',
            category: 'input[name="category"]:checked',
            minPrice: '#min-price',
            maxPrice: '#max-price',
            tags: 'input[name="tags"]:checked',
            sort: '#sort',
            productGrid: '#product-grid',
            pagination: '#pagination',  // Assume pagination.html has id="pagination"
            loading: '#loading',
            filterNow: '#filter-now',
            clearFilters: '#clear-filters',
            paginationButton: 'button[data-page]',
            priceRange: '#price-range'
        };
        this.logPrefix = `[ProductFilterManager] [${new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' })}]`;
        this.maxRetries = 2; // Maximum number of retry attempts
        this.debounceDelay = 300; // Debounce delay in ms
    }

    /**
     * Initialise les écouteurs d'événements pour les actions de filtre.
     * Initializes event listeners for filter actions.
     */
    init() {
        this.bindEventListeners();
    }

    debounce(func, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
        };
    }

    /**
     * Lie les écouteurs d'événements pour les filtres, le bouton clear, et la pagination.
     * Binds event listeners for filter, clear, and pagination actions.
     */
    bindEventListeners() {
        const filterNow = document.querySelector(this.selectors.filterNow);
        const clearFilters = document.querySelector(this.selectors.clearFilters);
        const priceRange = document.querySelector(this.selectors.priceRange);
        const minPrice = document.querySelector(this.selectors.minPrice);
        const maxPrice = document.querySelector(this.selectors.maxPrice);
        const searchInput = document.querySelector(this.selectors.search);
        const sortSelect = document.querySelector(this.selectors.sort);

        const debouncedUpdate = this.debounce(this.updateProducts.bind(this), this.debounceDelay);

        if (filterNow) {
            filterNow.addEventListener('click', () => {
                console.info(`${this.logPrefix} Filter Now button clicked`);
                this.updateProducts();
            });
        }

        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                console.info(`${this.logPrefix} Clear Filters button clicked`);
                this.clearFilters();
            });
        }

        document.addEventListener('click', (e) => {
            const button = e.target.closest(this.selectors.paginationButton);
            if (button) {
                const page = button.getAttribute('data-page');
                console.info(`${this.logPrefix} Pagination clicked, page: ${page}`);
                this.updateProducts(page);
            }
        });

        if (priceRange) {
            priceRange.addEventListener('input', () => {
                if (maxPrice) maxPrice.value = priceRange.value;
                console.info(`${this.logPrefix} Price range changed`);
                debouncedUpdate();
            });
        }

        if (minPrice) {
            minPrice.addEventListener('input', debouncedUpdate);
        }

        if (maxPrice) {
            maxPrice.addEventListener('input', debouncedUpdate);
        }

        if (searchInput) {
            searchInput.addEventListener('input', debouncedUpdate);
        }

        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                console.info(`${this.logPrefix} Sort option changed`);
                this.updateProducts();
            });
        }

        // Mise à jour AJAX automatique pour tous les filtres checkbox/radio
        // Automatic AJAX update for all filter checkboxes/radios
        ['stock', 'type', 'is_available', 'is_live', 'category', 'tags'].forEach(name => {
            document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
                input.addEventListener('change', () => {
                    this.updateProducts();
                });
            });
        });

        // Gère la logique spéciale pour la catégorie "All"
        // Handle special logic for the "All" category checkbox
        document.querySelectorAll('input[name="category"]').forEach((input) => {
            input.addEventListener('change', (e) => {
                setTimeout(() => {
                    if (input.value === '') {
                        if (input.checked) {
                            document.querySelectorAll('input[name="category"]').forEach(cb => {
                                if (cb !== input) cb.checked = false;
                            });
                        }
                    } else {
                        if (input.checked) {
                            const allBox = document.querySelector('input[name="category"][value=""]');
                            if (allBox) allBox.checked = false;
                        }
                    }
                }, 0);
            });
        });
    }

    /**
     * Récupère les valeurs des filtres depuis le DOM.
     * Collects filter values from the DOM.
     */
    collectFilters(page = 1) {
        let categories = Array.from(document.querySelectorAll('input[name="category"]:checked'))
            .map(input => input.value)
            .filter(value => value !== '');  // Exclude '' from categories list

        const filters = {
            search: this.getInputValue(this.selectors.search, '').trim(),
            category: categories,
            min: this.getInputValue(this.selectors.minPrice, '').trim(),
            max: this.getInputValue(this.selectors.maxPrice, '').trim(),
            tags: Array.from(document.querySelectorAll(this.selectors.tags))
                .map(input => input.value),
            sort: this.getInputValue(this.selectors.sort, 'featured'),
            stock: this.getInputValue('input[name="stock"]:checked', ''),
            type: this.getInputValue('input[name="type"]:checked', ''),
            is_available: this.getInputValue('input[name="is_available"]:checked', ''),
            is_live: this.getInputValue('input[name="is_live"]:checked', ''),
            page: Number(page) || 1
        };

        console.debug(`${this.logPrefix} Collected filters:`, filters);
        return filters;
    }

    /**
     * Récupère la valeur d'un input ou retourne une valeur par défaut.
     * Gets the value of an input or returns a default value.
     */
    getInputValue(selector, defaultValue) {
        const element = document.querySelector(selector);
        return element ? element.value : defaultValue;
    }

    /**
     * Construit la query string à partir des filtres.
     * Builds the query string from filter parameters.
     * @param {Object} filters - Filter parameters.
     * @returns {string} URL query string.
     */
    buildQueryString(filters) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                if (value.length > 0) {
                    value.forEach(v => params.append(key, v));
                }
            } else if (value !== '') {  // Skip empty strings
                params.set(key, value);
            }
        });
        const queryString = params.toString();
        console.debug(`${this.logPrefix} Query string: ${queryString}`);
        return queryString;
    }

    /**
     * Met à jour la grille des produits et la pagination via AJAX avec gestion des retries.
     * Updates the product grid and pagination via AJAX with retry logic.
     * @param {string|number} page - The page number for pagination.
     * @param {number} [retryCount=0] - Current retry attempt count.
     */
    async updateProducts(page = 1, retryCount = 0) {
        const filters = this.collectFilters(page);
        const queryString = this.buildQueryString(filters);
        const url = `${this.endpoints.shop}?${queryString}`;
        let response;

        try {
            this.showLoading();
            response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });
            console.debug(`${this.logPrefix} Request headers:`, {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            });
            console.debug(`${this.logPrefix} Response headers:`, Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}, Response: ${errorText.substring(0, 200)}...`);
            }
            const data = await response.json();
            console.debug(`${this.logPrefix} Response data:`, data);

            if (!data || !data.products || typeof data.products !== 'string' || !data.pagination || typeof data.pagination !== 'string') {
                throw new Error('Invalid response format: Missing or invalid "products" or "pagination" field');
            }
            this.updateGrid(data.products);
            this.updatePagination(data.pagination);
            history.pushState({}, document.title, `?${queryString}`);
            console.info(`${this.logPrefix} Products updated successfully`);
        } catch (error) {
            console.error(`${this.logPrefix} Error fetching products: ${error.message}`);
            if (retryCount < this.maxRetries && (error.name === 'TypeError' || (response && !response.ok))) {
                console.warn(`${this.logPrefix} Retrying (${retryCount + 1}/${this.maxRetries}) due to ${error.name}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                return this.updateProducts(page, retryCount + 1);
            }
            this.displayError(error.message, error.name === 'SyntaxError' ? 'Invalid JSON response from server' : '');
        } finally {
            this.hideLoading();
        }
    }

    updateGrid(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newGrid = doc.querySelector(this.selectors.productGrid);
        const oldGrid = document.querySelector(this.selectors.productGrid);

        if (newGrid && oldGrid) {
            oldGrid.replaceWith(newGrid);
        } else {
            console.error(`${this.logPrefix} Failed to update product grid`);
        }
    }

    updatePagination(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newPagination = doc.querySelector(this.selectors.pagination);
        const oldPagination = document.querySelector(this.selectors.pagination);

        if (newPagination && oldPagination) {
            oldPagination.replaceWith(newPagination);
        } else {
            console.error(`${this.logPrefix} Failed to update pagination`);
        }
    }

    /**
     * Affiche un message d'erreur dans la grille des produits avec un style professionnel et du contexte.
     * Displays an error message in the product grid with professional styling and context.
     * @param {string} message - The primary error message.
     * @param {string} [context] - Additional context for the error.
     */
    displayError(message, context = '') {
        const productGrid = document.querySelector(this.selectors.productGrid);
        if (productGrid) {
            productGrid.innerHTML = `
                <div class="text-center p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                    <p>{% trans "Error loading products:" %} ${message}</p>
                    ${context ? `<p>{% trans "Details:" %} ${context}</p>` : ''}
                    <p>{% trans "Please try again or contact support at support@example.com." %}</p>
                </div>`;
        }
    }

    /**
     * Affiche l'indicateur de chargement.
     * Shows the loading indicator with a professional check.
     */
    showLoading() {
        const loading = document.querySelector(this.selectors.loading);
        if (loading) {
            loading.classList.remove('hidden');
        } else {
            console.warn(`${this.logPrefix} Loading indicator not found`);
        }
    }

    /**
     * Masque l'indicateur de chargement.
     * Hides the loading indicator with a professional check.
     */
    hideLoading() {
        const loading = document.querySelector(this.selectors.loading);
        if (loading) {
            loading.classList.add('hidden');
        }
    }

    /**
     * Réinitialise tous les filtres et met à jour la liste des produits.
     * Clears all filters and updates the product list.
     */
    clearFilters() {
        // Uncheck all checkboxes/radios
        document.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(input => {
            input.checked = false;
        });
        // Check "All" for categories, stock, type
        const allCategory = document.querySelector('input[name="category"][value=""]');
        if (allCategory) allCategory.checked = true;
        const allStock = document.querySelector('input[name="stock"][value=""]');
        if (allStock) allStock.checked = true;
        const allType = document.querySelector('input[name="type"][value=""]');
        if (allType) allType.checked = true;
        // Reset other fields
        ['search', 'minPrice', 'maxPrice'].forEach(selector => {
            const element = document.querySelector(this.selectors[selector]);
            if (element) {
                element.value = '';
            }
        });
        const sort = document.querySelector(this.selectors.sort);
        if (sort) {
            sort.value = 'featured';
        }
        const priceRange = document.querySelector(this.selectors.priceRange);
        if (priceRange) {
            priceRange.value = 1000000;  // Reset to max
        }
        this.updateProducts();
    }
}

// Automatic initialization at the end of page load
document.addEventListener('DOMContentLoaded', function() {
    const manager = new ProductFilterManager();
    manager.init();
});