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
            console.log("Disconnecting observer")
            this.observer.disconnect();
        }

        this.observer = new IntersectionObserver(
            entries => {
                const entry = entries[0];
                if (entry.isIntersecting) {
                    this.loadNextPage();
                }
                console.log("Obverer entries4:", entries)
            },
            {
                rootMargin: '200px', // preload before reaching bottom
            }
        );

        this.observer.observe(this.sentinel);
    }

    async loadNextPage() {
        console.log("Going inside loadNextPage")
        if (this.loading) return;

        const nextPageUrl = this.sentinel.dataset.nextPage;
        if (!nextPageUrl) {
            console.log("Cleanup here-1:", nextPageUrl)
            this.cleanup();
            return;
        }
        console.log("NEXTpAGEuRL:",nextPageUrl)

        this.loading = true;

        try {
            const url = new URL(nextPageUrl, window.location.origin);
            url.searchParams.set('sections', 'main-collection-product-grid');
            console.log("url:",url, url.toString())
            const response = await fetch(url.toString(), {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });

            if (!response.ok) throw new Error('Failed to fetch next page');

            const sections = await response.json();
            const html = sections['main-collection-product-grid'];

            if (!html) {
                console.log("Cleanup here-2:", html)
                this.cleanup();
                return;
            }

            const doc = new DOMParser().parseFromString(html, 'text/html');

            // ✅ Extract ONLY product <li> items
            const newItems = doc.querySelectorAll('#product-grid > li');
            console.log('newProducts:', newItems)
            newItems.forEach(item => this.grid.appendChild(item));

            // ✅ Replace sentinel with the new one
            const nextLink = doc.querySelector('link[rel="next"][data-next-page]');
            console.log("nextLink:",nextLink)
            if (nextLink?.getAttribute('href')) {
                this.sentinel.dataset.nextPage = nextLink.getAttribute('href');
            } else {
                console.log('Last page reached — stopping infinite scroll');
                this.cleanup();
            }
        } catch (error) {
            console.error('[InfiniteCollection]', error);
            console.log("Cleanup here-4:", error)
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
let infiniteInstance = null;

function initInfiniteCollection() {
  console.log("Cleanup-5 called")
//   infiniteInstance?.cleanup();
  infiniteInstance = new InfiniteCollection();
}

// Initial load
document.addEventListener('DOMContentLoaded', initInfiniteCollection);

// 🔥 Watch for DOM replacement (filters, sorting, pagination)
const gridContainer = document.querySelector('#ProductGridContainer');
console.log("gridContainer:",gridContainer)
if (gridContainer) {
  const mutationObserver = new MutationObserver(() => {
    // Sentinel re-added after filter update
    if (document.querySelector('#InfiniteScrollSentinel')) {
      console.log("initInfiniteCollection called from mutation")
      initInfiniteCollection();
    }
  });

  mutationObserver.observe(gridContainer, {
    childList: true,
    subtree: true
  });
}
