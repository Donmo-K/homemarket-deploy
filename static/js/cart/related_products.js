// document.addEventListener('DOMContentLoaded', function() {
//     const cart = JSON.parse(localStorage.getItem('cart') || '{}');
//     const productIds = Object.values(cart).map(item => item.id);
//     console.log('Product IDs from localStorage:', productIds);

//     if (productIds.length > 0) {
//         const apiUrl = window.relatedProductsUrl;
//         const queryString = productIds.map(id => `product_ids[]=${encodeURIComponent(id)}`).join('&');
//         const url = `${apiUrl}?${queryString}`;
//         console.log('Fetching URL:', url);

//         fetch(url, {
//             method: 'GET',
//             headers: {
//                 'X-CSRFToken': window.csrfToken
//             }
//         })
//         .then(response => response.json())
//         .then(data => {
//             console.log('API Response:', data);
//             const container = document.getElementById('related-products-grid');
//             if (data.related_products && data.related_products.length > 0) {
//                 data.related_products.forEach(product => {
//                     const stars = Array(5).fill().map((_, i) => {
//                         if (i < Math.floor(product.avg_rating)) {
//                             return `<svg class="w-4 h-4 fill-current text-yellow-400" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.39 2.46a1 1 0 00-.364 1.118l1.287 3.97c.3.921-.755 1.688-1.54 1.118l-3.39-2.46a1 1 0 00-1.175 0l-3.39 2.46c-.784.57-1.838-.197-1.54-1.118l1.287-3.97a1 1 0 00-.364-1.118L2.81 9.397c-.783-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.97z"></path></svg>`;
//                         } else if (i < product.avg_rating) {
//                             return `<svg class="w-4 h-4 fill-current text-yellow-400" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.39 2.46a1 1 0 00-.364 1.118l1.287 3.97c.3.921-.755 1.688-1.54 1.118l-3.39-2.46a1 1 0 00-.588-.15v-8.846a1 1 0 01.588-.15l3.39-2.46c.783-.57.38-1.81-.588-1.81h4.18a1 1 0 00-.95.69L9.049 2.927z"></path></svg>`;
//                         } else {
//                             return `<svg class="w-4 h-4 fill-none stroke-current text-gray-400" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.39 2.46a1 1 0 00-.364 1.118l1.287 3.97c.3.921-.755 1.688-1.54 1.118l-3.39-2.46a1 1 0 00-1.175 0l-3.39 2.46c-.784.57-1.838-.197-1.54-1.118l1.287-3.97a1 1 0 00-.364-1.118L2.81 9.397c-.783-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.97z"></path></svg>`;
//                         }
//                     }).join('');

//                     container.innerHTML += `
//                         <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
//                             <div class="relative">
//                                 <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover">
//                                 <button class="wishlist-btn absolute top-2 right-2 bg-white rounded-full p-2 text-gray-700 hover:text-secondary transition" data-product-id="${product.id}" onclick="productManager.toggleWishlist(this)">
//                                     <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
//                                     </svg>
//                                 </button>
//                             </div>
//                             <div class="p-4">
//                                 <h3 class="font-semibold text-lg mb-1">${product.name}</h3>
//                                 <div class="flex items-center mb-2">
//                                     <div class="flex">${stars}</div>
//                                     <span class="text-gray-500 text-sm ml-2">(${product.reviews_count})</span>
//                                 </div>
//                                 <div class="flex justify-between items-center mb-3">
//                                     <span class="font-bold text-primary">${product.price.currency} ${product.price.amount}</span>
//                                     <span class="text-gray-500 text-sm">Available: ${product.quantity}</span>
//                                 </div>
//                                 <div class="flex items-center justify-between">
//                                     <div class="flex items-center border border-gray-300 rounded-md quantity-selector" data-quantity="1" data-max-quantity="${product.quantity}">
//                                         <button class="minus-btn px-2 py-1 text-gray-600 hover:text-primary">
//                                             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"></path>
//                                             </svg>
//                                         </button>
//                                         <span class="px-2 text-sm quantity-display">1</span>
//                                         <button class="plus-btn px-2 py-1 text-gray-600 hover:text-primary">
//                                             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
//                                             </svg>
//                                         </button>
//                                     </div>
//                                     <div class="flex space-x-2">
//                                         <button class="add-to-cart-btn bg-primary text-white px-3 py-1 rounded-full hover:bg-blue-800 transition text-xs flex items-center" data-product-id="${product.id}" onclick="cartManager.addToCart('${product.id}', '${product.name.replace(/'/g, "\\'")}', '${product.price.amount}', '${product.price.currency}', '${product.image}', '${product.category.replace(/'/g, "\\'")}', '1', '${product.reviews_count}', '${product.avg_rating}')">
//                                             <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
//                                             </svg>
//                                             Add to Cart
//                                         </button>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     `;
//                 });
//             } else {
//                 container.innerHTML = '<p class="font-montserrat text-gray-700 text-center py-6 col-span-full">No related products found</p>';
//             }
//         })
//         .catch(error => {
//             console.error('Error fetching related products:', error);
//             document.getElementById('related-products-grid').innerHTML = '<p class="font-montserrat text-gray-700 text-center py-6 col-span-full">No related products found</p>';
//         });
//     } else {
//         document.getElementById('related-products-grid').innerHTML = '<p class="font-montserrat text-gray-700 text-center py-6 col-span-full">Add items to cart to see related products</p>';
//     }
// });