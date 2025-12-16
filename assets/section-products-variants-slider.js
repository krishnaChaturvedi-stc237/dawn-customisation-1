class ProductsVariantsSlider extends HTMLElement {
  constructor() {
    super();
    this._abortController = null;
  }

  connectedCallback() {
    // Prevent double-init.
    if (this.dataset.initialized === 'true') return;
    this.dataset.initialized = 'true';

    this.statusEl = this.querySelector('[data-pvs-status]');
    this.productsEl = this.querySelector('[data-pvs-products]');

    const endpoint = this.dataset.endpoint;
    const token = this.dataset.token;

    if (window.StorefrontAPI && endpoint) {
      window.StorefrontAPI.setConfig({ endpoint, token: token || null });
    }

    this.load();
  }

  disconnectedCallback() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
  }

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  formatMoney({ amount, currencyCode }) {
    const num = Number(amount);
    if (!Number.isFinite(num)) return `${amount || ''} ${currencyCode || ''}`.trim();

    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode || 'USD',
      }).format(num);
    } catch (e) {
      return `${amount} ${currencyCode || ''}`.trim();
    }
  }

  productUrl(handle) {
    // In themes, /products/{handle} is stable.
    return `/products/${handle}`;
  }

  setStatus(text) {
    if (!this.statusEl) return;
    if (text) {
      this.statusEl.textContent = text;
      this.statusEl.removeAttribute('hidden');
    } else {
      this.statusEl.textContent = '';
      this.statusEl.setAttribute('hidden', 'hidden');
    }
  }

  async load() {
    if (!window.StorefrontAPI) {
      this.setStatus('StorefrontAPI helper not loaded.');
      return;
    }

    const productsFirst = Number(this.dataset.productsFirst || 10);
    const variantsFirst = Number(this.dataset.variantsFirst || 6);

    this.setStatus('Loading products…');

    try {
      const data = await window.StorefrontAPI.query(window.StorefrontAPI.queries.productsWithVariants, {
        productsFirst,
        variantsFirst,
      });

      const products = (data && data.products && data.products.nodes) || [];
      this.render(products);
      this.setStatus(products.length ? '' : 'No products found.');

      // After DOM updates, ask slider-components to recalc pages.
      requestAnimationFrame(() => {
        this.querySelectorAll('slider-component').forEach((el) => {
          if (typeof el.resetPages === 'function') el.resetPages();
        });
      });
    } catch (err) {
      this.setStatus('Failed to load products.');
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  render(products) {
    if (!this.productsEl) return;

    const sectionId = this.dataset.sectionId || 'pvs';

    const html = products
      .map((p, productIndex) => {
        const title = this.escapeHtml(p.title);
        const handle = p.handle;
        const url = handle ? this.productUrl(handle) : '#';

        const variants = (p.variants && p.variants.nodes) || [];
        const variantsCount = variants.length;

        const sliderId = `Slider-${sectionId}-${productIndex + 1}`;

        const slidesHtml = variants
          .map((v, variantIndex) => {
            const vTitle = this.escapeHtml(v.title);
            const imgUrl = v.image && v.image.url;
            const imgAlt = this.escapeHtml((v.image && v.image.altText) || vTitle || title);
            const price = v.price ? this.formatMoney(v.price) : '';

            return `
<li id="Slide-${sectionId}-${productIndex + 1}-${variantIndex + 1}" class="grid__item slider__slide">
  <a class="pvs-variant-card" href="${url}">
    <div class="pvs-variant-media">
      ${
        imgUrl
          ? `<img class="pvs-variant-image" src="${imgUrl}" alt="${imgAlt}" loading="lazy" decoding="async">`
          : `<div class="pvs-variant-image pvs-variant-image--placeholder" aria-hidden="true"></div>`
      }
    </div>
    <div class="pvs-variant-meta">
      <div class="pvs-variant-title">${vTitle}</div>
      ${price ? `<div class="pvs-variant-price">${this.escapeHtml(price)}</div>` : ''}
    </div>
  </a>
</li>`;
          })
          .join('');

        const sliderButtonsHtml =
          variantsCount > 1
            ? `
<div class="slider-buttons">
  <button
    type="button"
    class="slider-button slider-button--prev"
    name="previous"
    aria-label="Previous slide"
    aria-controls="${sliderId}"
  >
    <span class="svg-wrapper">${this.getCaretIcon()}</span>
  </button>
  <div class="slider-counter caption">
    <span class="slider-counter--current">1</span>
    <span aria-hidden="true"> / </span>
    <span class="visually-hidden">of</span>
    <span class="slider-counter--total">${variantsCount}</span>
  </div>
  <button
    type="button"
    class="slider-button slider-button--next"
    name="next"
    aria-label="Next slide"
    aria-controls="${sliderId}"
  >
    <span class="svg-wrapper">${this.getCaretIcon()}</span>
  </button>
</div>`
            : '';

        return `
<div class="pvs-product">
  <div class="pvs-product-header">
    <h3 class="pvs-product-title"><a href="${url}">${title}</a></h3>
  </div>

  <slider-component class="pvs-variants-slider slider-mobile-gutter">
    <ul
      id="${sliderId}"
      class="pvs-variants grid grid--2-col-tablet-down grid--3-col-desktop slider slider--tablet slider--desktop"
      role="list"
      aria-label="Variants"
    >
      ${slidesHtml}
    </ul>
    ${sliderButtonsHtml}
  </slider-component>
</div>`;
      })
      .join('');

    this.productsEl.innerHTML = html;
  }

  getCaretIcon() {
    // Reuse Dawn’s inline caret icon (scoped to this section instance).
    // Fallback: simple text.
    const template = this.querySelector('template[data-pvs-icon-caret]');
    if (template && template.tagName === 'TEMPLATE') {
      return template.innerHTML;
    }
    return '&#x203A;';
  }
}

customElements.define('products-variants-slider', ProductsVariantsSlider);
