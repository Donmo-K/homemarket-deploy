class FeaturedProductsCarousel {
    constructor() {
        this.grid = document.getElementById('featured-products-grid');
        this.prevBtn = document.querySelector('.featured-prev-btn');
        this.nextBtn = document.querySelector('.featured-next-btn');
        this.scrollAmount = 0;
        this.scrollStep = 250; // Matches min-width in template

        if (!this.grid || !this.prevBtn || !this.nextBtn) {
            console.error('FeaturedProductsCarousel initialization failed: Missing grid or controls');
            return;
        }

        console.debug('FeaturedProductsCarousel initialized successfully');
        this.initEventListeners();
        this.updateButtonStates();
    }

    initEventListeners() {
        this.nextBtn.addEventListener('click', () => {
            this.scrollRight();
        });

        this.prevBtn.addEventListener('click', () => {
            this.scrollLeft();
        });

        this.grid.addEventListener('scroll', () => {
            this.debounce(this.updateButtonStates.bind(this), 100);
        });
    }

    scrollRight() {
        const maxScroll = this.grid.scrollWidth - this.grid.clientWidth;
        this.scrollAmount = Math.min(this.scrollAmount + this.scrollStep, maxScroll);
        this.grid.scrollTo({
            left: this.scrollAmount,
            behavior: 'smooth'
        });
        console.debug(`Scrolling right: scrollAmount=${this.scrollAmount}`);
        this.updateButtonStates();
    }

    scrollLeft() {
        this.scrollAmount = Math.max(this.scrollAmount - this.scrollStep, 0);
        this.grid.scrollTo({
            left: this.scrollAmount,
            behavior: 'smooth'
        });
        console.debug(`Scrolling left: scrollAmount=${this.scrollAmount}`);
        this.updateButtonStates();
    }

    updateButtonStates() {
        const maxScroll = this.grid.scrollWidth - this.grid.clientWidth;
        this.prevBtn.disabled = this.scrollAmount <= 0;
        this.nextBtn.disabled = this.scrollAmount >= maxScroll;
        this.prevBtn.classList.toggle('opacity-50', this.prevBtn.disabled);
        this.prevBtn.classList.toggle('cursor-not-allowed', this.prevBtn.disabled);
        this.nextBtn.classList.toggle('opacity-50', this.nextBtn.disabled);
        this.nextBtn.classList.toggle('cursor-not-allowed', this.nextBtn.disabled);
        console.debug(`Button states updated: prev=${this.prevBtn.disabled}, next=${this.nextBtn.disabled}`);
    }

    debounce(func, wait) {
        let timeout;
        return () => {
            clearTimeout(timeout);
            timeout = setTimeout(func, wait);
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('featured-products-grid')) {
        console.debug('Initializing FeaturedProductsCarousel on DOMContentLoaded');
        new FeaturedProductsCarousel();
    } else {
        console.error('Featured products grid not found on DOMContentLoaded');
    }
});