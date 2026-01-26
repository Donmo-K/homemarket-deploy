// soprescom/static/js/home/products.js
class ProductManager {
    constructor() {
        this.productGrids = document.querySelectorAll('.product-grid');
        this.pagination = document.getElementById('pagination');
        this.paginationContainer = document.getElementById('pagination-container');
        this.searchInput = document.getElementById('product-search');
        this.tabs = document.querySelectorAll('.product-tab');
        this.wishlistCount = document.querySelector('.wishlist-count');
        this.cartCount = document.querySelector('.cart-count');
        this.currentFilter = new URLSearchParams(window.location.search).get('filter') || '';
        this.searchQuery = new URLSearchParams(window.location.search).get('search') || '';
        this.currentPage = parseInt(new URLSearchParams(window.location.search).get('page')) || 1;
        this.currentSection = new URLSearchParams(window.location.search).get('section') || '';
        this.debounceTimeout = null;
        this.isLoading = false;

        console.log('ProductManager initialized:', {
            productGridsCount: this.productGrids.length,
            paginationExists: !!this.pagination,
            paginationContainerExists: !!this.paginationContainer,
            currentFilter: this.currentFilter,
            currentPage: this.currentPage,
            currentSection: this.currentSection,
            wishlistUrl: window.wishlistUrl,
            homeUrl: window.homeUrl,
            cartUrl: window.cartUrl,
            csrfToken: window.csrfToken,
            cookies: document.cookie,
            csrfCookie: this.getCookie('csrftoken')
        });

        if (!window.wishlistUrl || !window.homeUrl || !window.csrfToken || !window.cartUrl) {
            console.error('Missing global variables.');
            window.toastManager.buildToast()
                .setMessage('Initialization error: Required configuration is missing')
                .setType('danger')
                .setPosition('top-right')
                .setDuration(5000)
                .show();
        }

        if (!this.cartCount) console.warn('Cart count element (.cart-count) not found.');
        if (this.productGrids.length === 0) console.warn('No product grids found.');
        if (!this.pagination || !this.paginationContainer) {
            console.error('Pagination element (#pagination) or container (#pagination-container) not found.');
            if (!this.paginationContainer) {
                const container = document.createElement('div');
                container.id = 'pagination-container';
                container.className = 'flex justify-center mt-12';
                container.innerHTML = '<nav id="pagination" class="flex items-center space-x-2" style="display: none;"></nav>';
                document.querySelector('.container.mx-auto.px-4').appendChild(container);
                this.paginationContainer = container;
                this.pagination = document.getElementById('pagination');
                console.log('Created fallback pagination container.');
            }
            window.toastManager.buildToast()
                .setMessage('Error: Pagination element missing in the page.')
                .setType('danger')
                .setPosition('top-right')
                .setDuration(5000)
                .show();
        }

        this.initEventListeners();
        this.updateWishlistCount();
        this.updateCartCount();
    }

    initEventListeners() {
        this.tabs.forEach(tab => {
            tab.removeEventListener('click', this.handleTabClick);
            tab.addEventListener('click', this.handleTabClick.bind(this));
        });

        if (this.searchInput) {
            this.searchInput.removeEventListener('input', this.handleSearchInput);
            this.searchInput.addEventListener('input', this.handleSearchInput.bind(this));
        }

        this.productGrids.forEach(grid => {
            grid.removeEventListener('click', this.handleGridClick);
            grid.addEventListener('click', this.handleGridClick.bind(this));
        });

        if (this.pagination) {
            this.pagination.removeEventListener('click', this.handlePaginationClick);
            this.pagination.addEventListener('click', this.handlePaginationClick.bind(this));
        }

        const viewMoreCategories = document.querySelector('#view-more-categories');
        if (viewMoreCategories) {
            viewMoreCategories.removeEventListener('click', this.handleViewMoreCategories);
            viewMoreCategories.addEventListener('click', this.handleViewMoreCategories.bind(this));
        }
    }

    handleTabClick(e) {
        e.preventDefault();
        if (this.isLoading) return;
        const tab = e.currentTarget;
        this.switchTab(tab);
    }

    handleSearchInput() {
        if (this.isLoading) return;
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => {
            this.searchQuery = this.searchInput.value.trim();
            this.currentPage = 1;
            this.currentSection = '';
            console.log('Search triggered:', { searchQuery: this.searchQuery });
            this.fetchProducts();
        }, 300);
    }

    handleGridClick(e) {
        if (this.isLoading) return;
        const wishlistBtn = e.target.closest('.wishlist-btn');
        const minusBtn = e.target.closest('.minus-btn');
        const plusBtn = e.target.closest('.plus-btn');
        const addToCartBtn = e.target.closest('.add-to-cart-btn');
        if (wishlistBtn) {
            e.preventDefault();
            this.toggleWishlist(wishlistBtn);
        } else if (minusBtn) {
            e.preventDefault();
            this.decrementQuantity(minusBtn);
        } else if (plusBtn) {
            e.preventDefault();
            this.incrementQuantity(plusBtn);
        } else if (addToCartBtn) {
            e.preventDefault();
            this.addToCart(addToCartBtn);
        }
    }

    handlePaginationClick(e) {
        const pageLink = e.target.closest('a');
        if (pageLink && !this.isLoading) {
            e.preventDefault();
            const url = new URL(pageLink.href);
            this.currentPage = parseInt(url.searchParams.get('page')) || 1;
            this.currentSection = url.searchParams.get('section') || 'category_products';
            console.log('Pagination clicked:', { page: this.currentPage, section: this.currentSection });
            this.fetchProducts();
        }
    }

    handleViewMoreCategories(e) {
        e.preventDefault();
        if (this.isLoading) return;
        this.currentSection = 'category_products';
        this.currentPage = 1;
        console.log('View more categories clicked:', { section: this.currentSection });
        this.fetchProducts();
    }

    switchTab(tab) {
        this.tabs.forEach(t => {
            t.classList.remove('text-primary', 'border-b-2', 'border-primary');
            t.classList.add('text-gray-500', 'hover:text-primary');
        });
        tab.classList.add('text-primary', 'border-b-2', 'border-primary');
        this.currentFilter = tab.dataset.filter;
        this.currentPage = 1;
        this.currentSection = '';
        console.log('Switching tab:', { filter: this.currentFilter, page: this.currentPage });
        this.fetchProducts();

        const sections = document.querySelectorAll('.category-section');
        sections.forEach(section => {
            section.style.display = this.currentFilter && section.dataset.categorySlug !== this.currentFilter ? 'none' : 'block';
        });
    }

    async fetchProducts() {
        if (!window.homeUrl) {
            console.error('Home URL is undefined.');
            window.toastManager.buildToast()
                .setMessage('Error: Unable to load products due to missing configuration')
                .setType('danger')
                .setPosition('top-right')
                .setDuration(5000)
                .show();
            return;
        }
        if (this.isLoading) {
            console.warn('Fetch already in progress.');
            return;
        }

        this.isLoading = true;
        const sectionsContainer = document.getElementById('category-products-section');
        if (!sectionsContainer) {
            console.error('Sections container (#category-products-section) not found.');
            window.toastManager.buildToast()
                .setMessage('Error: Product container not found on the page.')
                .setType('danger')
                .setPosition('top-right')
                .setDuration(5000)
                .show();
            this.isLoading = false;
            return;
        }
        const originalContent = sectionsContainer.innerHTML;
        sectionsContainer.innerHTML = '<div class="text-center py-4"><svg class="animate-spin h-8 w-8 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg><p>Loading products...</p></div>';

        this.tabs.forEach(tab => tab.classList.add('pointer-events-none', 'opacity-50'));
        if (this.searchInput) this.searchInput.disabled = true;
        if (this.pagination) this.pagination.classList.add('pointer-events-none', 'opacity-50');

        const url = new URL(window.homeUrl);
        if (this.currentFilter) url.searchParams.set('filter', this.currentFilter);
        if (this.searchQuery) url.searchParams.set('search', this.searchQuery);
        if (this.currentPage) url.searchParams.set('page', this.currentPage);
        if (this.currentSection) url.searchParams.set('section', this.currentSection);

        console.log('Fetching products:', url.toString());

        try {
            const response = await fetch(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': window.csrfToken
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Fetch response:', {
                success: data.success,
                product_count: data.product_count,
                section: this.currentSection,
                paginationHtmlLength: data.pagination ? data.pagination.length : 0,
                categorySectionsLength: data.category_sections ? data.category_sections.length : 0,
                sectionHtmlLength: data.section_html ? data.section_html.length : 0
            });

            if (data.success) {
                console.log('Received HTML:', data.section_html || data.category_sections);
                sectionsContainer.innerHTML = this.currentSection === 'category_products' ? data.section_html : data.category_sections;
                if (this.paginationContainer) {
                    this.paginationContainer.innerHTML = data.pagination || '<nav id="pagination" class="flex items-center space-x-2" style="display: none;"></nav>';
                    console.log('Pagination updated:', { product_count: data.product_count, display: data.product_count <= 15 ? 'none' : 'flex' });
                } else {
                    console.error('Pagination container (#pagination-container) not found after fetch.');
                    const container = document.createElement('div');
                    container.id = 'pagination-container';
                    container.className = 'flex justify-center mt-12';
                    container.innerHTML = data.pagination || '<nav id="pagination" class="flex items-center space-x-2" style="display: none;"></nav>';
                    document.querySelector('.container.mx-auto.px-4').appendChild(container);
                    this.paginationContainer = container;
                    console.log('Created fallback pagination container after fetch.');
                }

                if (data.product_count <= 15) {
                    if (this.pagination) this.pagination.style.display = 'none';
                } else {
                    if (this.pagination) this.pagination.style.display = 'flex';
                }

                const newUrl = new URL(window.location);
                newUrl.searchParams.set('filter', this.currentFilter || '');
                newUrl.searchParams.set('search', this.searchQuery || '');
                newUrl.searchParams.set('page', this.currentPage);
                if (this.currentSection) newUrl.searchParams.set('section', this.currentSection);
                window.history.pushState({}, '', newUrl);

                this.productGrids = document.querySelectorAll('.product-grid');
                this.pagination = document.getElementById('pagination');
                this.initEventListeners();
                // Reinitialize BuyNowHandler as a fallback
                if (typeof BuyNowHandler !== 'undefined') {
                    console.log('Reinitializing BuyNowHandler after pagination');
                    new BuyNowHandler();
                } else {
                    console.warn('BuyNowHandler class not found. Quick Buy buttons may not work.');
                }
                if (!this.pagination) {
                    console.error('Pagination element (#pagination) not found after fetch.');
                    window.toastManager.buildToast()
                        .setMessage('Error: Pagination element missing after update.')
                        .setType('danger')
                        .setPosition('top-right')
                        .setDuration(5000)
                        .show();
                }
            } else {
                throw new Error(data.message || 'Error loading products');
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            sectionsContainer.innerHTML = originalContent;
            window.toastManager.buildToast()
                .setMessage(`Failed to load products: ${error.message}`)
                .setType('danger')
                .setPosition('top-right')
                .setDuration(5000)
                .show();
        } finally {
            this.isLoading = false;
            this.tabs.forEach(tab => tab.classList.remove('pointer-events-none', 'opacity-50'));
            if (this.searchInput) this.searchInput.disabled = false;
            if (this.pagination) this.pagination.classList.remove('pointer-events-none', 'opacity-50');
        }
    }

    getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    async updateWishlistCount() {
        if (!window.wishlistUrl) return;
        try {
            const response = await fetch(window.wishlistUrl, {
                method: 'GET',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            this.wishlistCount.textContent = data.success ? (data.wishlist_count || 0) : '0';
        } catch (error) {
            console.error('Error fetching wishlist count:', error);
            this.wishlistCount.textContent = '0';
        }
    }

    async updateCartCount() {
        if (!window.cartUrl || !this.cartCount) return;
        try {
            const response = await fetch(window.cartUrl, {
                method: 'GET',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            this.cartCount.textContent = data.success ? (data.cart_count || 0) : '0';
        } catch (error) {
            console.error('Error fetching cart count:', error);
            this.cartCount.textContent = '0';
        }
    }

    async addToCart(button) {
        if (!window.cartUrl) {
            console.error('Cart URL is undefined.');
            return;
        }
        const productId = button.dataset.productId;
        const productElement = button.closest('.bg-white');
        const quantitySelector = productElement.querySelector('.quantity-selector');
        const quantityDisplay = quantitySelector?.querySelector('.quantity-display');
        if (!quantityDisplay) {
            console.error('Quantity display element not found for product:', productId);
            window.toastManager.buildToast()
                .setMessage('Error: Unable to add product to cart due to missing quantity information.')
                .setType('danger')
                .setPosition('top-right')
                .setDuration(5000)
                .show();
            return;
        }
        const quantity = quantityDisplay.textContent;
        const name = productElement.querySelector('h3').textContent;
        const priceElement = productElement.querySelector('.text-primary');
        const price = parseFloat(priceElement.textContent.replace('XOF ', ''));
        const image = productElement.querySelector('img').src;
        const category = productElement.closest('.category-section')?.querySelector('h3')?.textContent || '-';
        const reviews = productElement.querySelector('.text-gray-500.text-sm.ml-2')?.textContent.replace(/[()]/g, '') || '0';
        const avgRating = Array.from(productElement.querySelectorAll('.fill-current.text-yellow-400')).length + (productElement.querySelector('.fill-current.text-yellow-400 path[fill-rule="evenodd"]') ? 0.5 : 0);

        if (typeof cartManager !== 'undefined') {
            try {
                await cartManager.addToCart(productId, name, price, 'XOF', image, category, quantity, reviews, avgRating);
                this.updateCartCount();
                window.toastManager.buildToast()
                    .setMessage('Product added to cart!')
                    .setType('success')
                    .setPosition('top-right')
                    .setDuration(3000)
                    .show();
            } catch (error) {
                console.error('Error adding to cart:', error);
                window.toastManager.buildToast()
                    .setMessage(`Failed to add product to cart: ${error.message}`)
                    .setType('danger')
                    .setPosition('top-right')
                    .setDuration(5000)
                    .show();
            }
        } else {
            console.error('cartManager is not defined.');
            window.toastManager.buildToast()
                .setMessage('Error: Cart functionality is unavailable')
                .setType('danger')
                .setPosition('top-right')
                .setDuration(5000)
                .show();
        }
    }

    async toggleWishlist(button) {
        const productId = button.dataset.productId;
        const csrfToken = window.csrfToken || this.getCookie('csrftoken');
        if (!csrfToken || !window.wishlistUrl) {
            console.error('CSRF token or wishlist URL missing.');
            window.toastManager.buildToast()
                .setMessage('Security token or wishlist URL missing. Please refresh.')
                .setType('danger')
                .setPosition('top-right')
                .setDuration(5000)
                .show();
            return;
        }
        try {
            const response = await fetch(window.wishlistUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ product_id: productId })
            });
            if (response.status === 403) {
                console.error('403 Forbidden:', await response.text());
                window.toastManager.buildToast()
                    .setMessage('Security validation failed. Please refresh and ensure you are logged in.')
                    .setType('danger')
                    .setPosition('top-right')
                    .setDuration(5000)
                    .show();
                return;
            }
            if (response.status === 401 || response.redirected) {
                window.toastManager.buildToast()
                    .setMessage('Please log in to manage your wishlist.')
                    .setType('warning')
                    .setPosition('top-right')
                    .setDuration(5000)
                    .show();
                return;
            }
            const data = await response.json();
            if (data.success) {
                const svg = button.querySelector('svg');
                svg.classList.toggle('fill-current', data.in_wishlist);
                svg.classList.toggle('text-secondary', data.in_wishlist);
                window.toastManager.buildToast()
                    .setMessage(data.in_wishlist ? 'Added to wishlist!' : 'Removed from wishlist!')
                    .setType('success')
                    .setPosition('top-right')
                    .setDuration(3000)
                    .show();
                this.updateWishlistCount();
            } else {
                window.toastManager.buildToast()
                    .setMessage(data.message || 'Error updating wishlist.')
                    .setType('danger')
                    .setPosition('top-right')
                    .setDuration(5000)
                    .show();
            }
        } catch (error) {
            console.error('Error toggling wishlist:', error);
            window.toastManager.buildToast()
                .setMessage('You must be logged in to manage your wishlist.')
                .setType('warning')
                .setPosition('top-right')
                .setDuration(5000)
                .show();
        }
    }

    incrementQuantity(button) {
        const selector = button.closest('.quantity-selector');
        const quantityDisplay = selector.querySelector('.quantity-display');
        let quantity = parseInt(selector.dataset.quantity, 10);
        const maxQuantity = parseInt(selector.dataset.maxQuantity, 10);
        if (quantity < maxQuantity) {
            quantity += 1;
            selector.dataset.quantity = quantity;
            quantityDisplay.textContent = quantity;
        }
    }

    decrementQuantity(button) {
        const selector = button.closest('.quantity-selector');
        const quantityDisplay = selector.querySelector('.quantity-display');
        let quantity = parseInt(selector.dataset.quantity, 10);
        if (quantity > 1) {
            quantity -= 1;
            selector.dataset.quantity = quantity;
            quantityDisplay.textContent = quantity;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.product-grid')) {
        new ProductManager();
    } else {
        console.warn('ProductManager not initialized — no .product-grid elements found.');
    }
});