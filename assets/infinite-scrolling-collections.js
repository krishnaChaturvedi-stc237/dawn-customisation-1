/**
 * Infinite collection scrolling
 * Works with:
 * - Shopify Section Rendering API
 * - Facets (filters & sorting)
 * - Pagination
 *
 * Section required:
 * - id="product-grid"
 * - id="InfiniteScrollSentinel" with data-next-page
 */

class InfiniteCollection {
  constructor() {
    this.grid = document.querySelector('#product-grid');
    this.sentinel = document.querySelector('#InfiniteScrollSentinel');
    this.loading = false;
    this.observer = null;

    if (!this.grid || !this.sentinel) return;

    this.initObserver();
  }

  initObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          this.loadNextPage();
        }
      },
      {
        rootMargin: '200px', // preload before reaching bottom
      }
    );

    this.observer.observe(this.sentinel);
  }

  async loadNextPage() {
    if (this.loading) return;

    const nextPageUrl = this.sentinel.dataset.nextPage;
    if (!nextPageUrl) {
      this.cleanup();
      return;
    }

    this.loading = true;

    try {
      const url = new URL(nextPageUrl, window.location.origin);
      url.searchParams.set('sections', 'main-collection-product-grid');

      const response = await fetch(url.toString(), {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });

      if (!response.ok) throw new Error('Failed to fetch next page');

      const sections = await response.json();
      const html = sections['main-collection-product-grid'];

      if (!html) {
        this.cleanup();
        return;
      }

      const doc = new DOMParser().parseFromString(html, 'text/html');

      // ✅ Extract ONLY product <li> items
      const newItems = doc.querySelectorAll('#product-grid > li');
      newItems.forEach(item => this.grid.appendChild(item));

      // ✅ Replace sentinel with the new one
      const newSentinel = doc.querySelector('#InfiniteScrollSentinel');

      if (newSentinel?.dataset?.nextPage) {
        this.sentinel.dataset.nextPage = newSentinel.dataset.nextPage;
      } else {
        this.cleanup();
      }
    } catch (error) {
      console.error('[InfiniteCollection]', error);
      this.cleanup();
    } finally {
      this.loading = false;
    }
  }

  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }

    if (this.sentinel) {
      this.sentinel.remove();
    }
  }
}

/**
 * Initialize on:
 * - initial page load
 * - filter/sort updates
 * - section reloads
 */
function initInfiniteCollection() {
  new InfiniteCollection();
}

document.addEventListener('DOMContentLoaded', initInfiniteCollection);

// Required for Shopify filters & sorting
document.addEventListener('shopify:section:load', initInfiniteCollection);
document.addEventListener('facet:updated', initInfiniteCollection);
