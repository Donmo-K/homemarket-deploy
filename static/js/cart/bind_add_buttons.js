document.addEventListener('DOMContentLoaded', () => {
	if (typeof cartManager === 'undefined') {
		console.warn('cartManager not found; add_to_cart.js may not be loaded.');
		return;
	}

	const extractText = (el, selector, fallback = '') => {
		const node = el.querySelector(selector);
		return node ? node.textContent.trim() : fallback;
	};

	const extractPrice = (root) => {
		// Prefer primary price styling
		let el = root.querySelector('.text-primary');
		if (el) {
			const match = el.textContent.replace(',', '.').match(/([0-9]+(?:\.[0-9]+)?)/);
			if (match) return parseFloat(match[1]);
		}
		// Fallback: search in common price-like elements
		el = root.querySelector('[class*="price" i], .font-bold, .font-semibold');
		if (el) {
			const match = el.textContent.replace(',', '.').match(/([0-9]+(?:\.[0-9]+)?)/);
			if (match) return parseFloat(match[1]);
		}
		return 0;
	};

	const extractImage = (root) => {
		const img = root.querySelector('img');
		return img ? img.src : '';
	};

	const extractCategory = (root) => {
		// Try a subtle gray text often used for categories
		const cat = root.querySelector('.text-gray-500.text-sm');
		if (cat) {
			const parts = cat.textContent.split(':');
			return (parts[0] || cat.textContent).trim();
		}
		return '-';
	};

	const extractReviews = (root) => {
		const node = root.querySelector('.text-gray-500.text-sm.ml-2');
		if (!node) return 0;
		const num = node.textContent.replace(/[()]/g, '').trim();
		const parsed = parseInt(num, 10);
		return isNaN(parsed) ? 0 : parsed;
	};

	const extractAvgRating = (root) => {
		// Support Font Awesome stars used in templates
		const ratingContainer = root.querySelector('.text-yellow-400') || root;
		const full = ratingContainer.querySelectorAll('.fa-star').length;
		const half = ratingContainer.querySelectorAll('.fa-star-half-alt').length > 0 ? 0.5 : 0;
		return full + half;
	};

	const getQuantityFromContext = (button) => {
		// 1) Detail page quantity box (try broader ancestor later)
		let detailBox = button.closest('.flex')?.querySelector('.quantity-value');
		if (detailBox) return parseInt(detailBox.textContent.trim(), 10) || 1;
		// 2) Any quantity-selector pattern within a nearby card/container
		let selector = button.closest('.bg-white')?.querySelector('.quantity-selector');
		if (selector) {
			const display = selector.querySelector('.quantity-display');
			if (display) return parseInt(display.textContent.trim(), 10) || parseInt(display.value || '1', 10) || 1;
		}
		// 3) Fallback: search within closest section or card-like container
		const scope = button.closest('section') || button.closest('[data-product-card]') || document;
		detailBox = scope.querySelector('.quantity-value');
		if (detailBox) return parseInt(detailBox.textContent.trim(), 10) || 1;
		return 1;
	};

	// Global delegated handler to support late-loaded DOM too
	document.addEventListener('click', (e) => {
		const btn = e.target.closest('.add-to-cart-btn');
		if (!btn) return;
		// Avoid duplicate handling inside product grids where another manager binds
		if (btn.closest('.product-grid')) return;

		e.preventDefault();
		const productId = btn.dataset.productId;
		if (!productId) return;

		// Choose a reasonable context root for scraping details
		const card = btn.closest('.bg-white') || btn.closest('[data-product-card]') || document;
		const name = extractText(card, 'h1, h3', '');
		const price = extractPrice(card);
		const image = extractImage(card);
		const category = extractCategory(card);
		const quantity = getQuantityFromContext(btn);
		const reviews = extractReviews(card);
		const avgRating = extractAvgRating(card);

		cartManager.addToCart(productId, name, price, 'XOF', image, category, quantity, reviews, avgRating);
	});
}); 