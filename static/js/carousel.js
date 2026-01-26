class Carousel {
    constructor(containerId, prevBtnId, nextBtnId, indicatorClass) {
        this.container = document.getElementById(containerId);
        this.slides = this.container.children;
        this.prevBtn = document.getElementById(prevBtnId);
        this.nextBtn = document.getElementById(nextBtnId);
        this.indicators = document.getElementsByClassName(indicatorClass);
        this.currentIndex = 0;
        this.totalSlides = this.slides.length;
        this.autoSlideInterval = null;

        this.init();
    }

    init() {
        // Initialize event listeners
        this.prevBtn.addEventListener('click', () => this.prevSlide());
        this.nextBtn.addEventListener('click', () => this.nextSlide());
        
        // Initialize indicators
        Array.from(this.indicators).forEach((indicator, index) => {
            indicator.addEventListener('click', () => this.goToSlide(index));
        });

        // Start auto-slide
        this.startAutoSlide();

        // Update initial state
        this.updateCarousel();
    }

    updateCarousel() {
        // Update slide position
        this.container.style.transform = `translateX(-${this.currentIndex * 100}%)`;

        // Update indicators
        Array.from(this.indicators).forEach((indicator, index) => {
            indicator.classList.toggle('bg-white', index === this.currentIndex);
            indicator.classList.toggle('bg-white/50', index !== this.currentIndex);
        });
    }

    prevSlide() {
        this.currentIndex = (this.currentIndex - 1 + this.totalSlides) % this.totalSlides;
        this.updateCarousel();
        this.resetAutoSlide();
    }

    nextSlide() {
        this.currentIndex = (this.currentIndex + 1) % this.totalSlides;
        this.updateCarousel();
        this.resetAutoSlide();
    }

    goToSlide(index) {
        this.currentIndex = index;
        this.updateCarousel();
        this.resetAutoSlide();
    }

    startAutoSlide() {
        this.autoSlideInterval = setInterval(() => {
            this.nextSlide();
        }, 5000); // Change slide every 5 seconds
    }

    resetAutoSlide() {
        clearInterval(this.autoSlideInterval);
        this.startAutoSlide();
    }
}

// Initialize carousel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Carousel('carousel', 'prev', 'next', 'carousel-indicator');
});