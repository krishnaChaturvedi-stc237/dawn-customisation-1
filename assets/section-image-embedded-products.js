(() => {
  const SELECTORS = {
    section: '[data-image-embedded-products]',
    slide: '[data-iep-slide]',
    hotspotButton: '[data-hotspot-button]',
    productCard: '[data-hotspot-product]',
    closeButton: '[data-hotspot-close]'
  };

  function hideAllCardsInSlide(slide) {
    slide.querySelectorAll(SELECTORS.productCard).forEach((card) => {
      card.hidden = true;
    });
    slide.querySelectorAll(SELECTORS.hotspotButton).forEach((btn) => {
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  function showCard(slide, idToShow, clickedButton) {
    hideAllCardsInSlide(slide);
    const mySelectorId=`#${CSS.escape(idToShow)}`
    const card = slide.querySelector(mySelectorId);
    if (!card) return;

    card.hidden = false;
    if (clickedButton) clickedButton.setAttribute('aria-expanded', 'true');
  }

  function openDefaultCard(slide) {
    const firstBtn = slide.querySelector(SELECTORS.hotspotButton);
    if (!firstBtn) return;

    const targetId = firstBtn.getAttribute('aria-controls');
    if (!targetId) return;

    showCard(slide, targetId, firstBtn);
  }

  function initSection(sectionEl) {
    sectionEl.addEventListener('click', (event) => {
      const hotspotBtn = event.target.closest(SELECTORS.hotspotButton);
      if (hotspotBtn && sectionEl.contains(hotspotBtn)) {
        event.preventDefault();
        const slide = hotspotBtn.closest(SELECTORS.slide);
        if (!slide) return;

        const targetId = hotspotBtn.getAttribute('aria-controls');
        if (!targetId) return;

        showCard(slide, targetId, hotspotBtn);
        return;
      }

      const closeBtn = event.target.closest(SELECTORS.closeButton);
      if (closeBtn && sectionEl.contains(closeBtn)) {
        event.preventDefault();
        const slide = closeBtn.closest(SELECTORS.slide);
        if (!slide) return;
        hideAllCardsInSlide(slide);
      }
    });

    const sliderComponent = sectionEl.querySelector('slider-component');
    if (sliderComponent) {
      sliderComponent.addEventListener('slideChanged', (event) => {
        const currentEl = event.detail && event.detail.currentElement ? event.detail.currentElement : null;
        const currentSlide = currentEl ? currentEl.closest(SELECTORS.slide) : null;

        sectionEl.querySelectorAll(SELECTORS.slide).forEach(hideAllCardsInSlide);
        if (currentSlide) openDefaultCard(currentSlide);
      });
    }

    // Default open: first hotspot on each slide
    sectionEl.querySelectorAll(SELECTORS.slide).forEach((slide) => {
      hideAllCardsInSlide(slide);
      openDefaultCard(slide);
    });

    // Position hotspots based on image display size so positions remain fixed
    function positionHotspotsInSlide(slide) {
      const media = slide.querySelector('.image-embedded-products__media');
      const img = slide.querySelector('.image-embedded-products__image');
      if (!media || !img) return;

      const mediaRect = media.getBoundingClientRect();
      const width = media.clientWidth;
      const height = media.clientHeight;

      slide.querySelectorAll(SELECTORS.hotspotButton).forEach((btn) => {
        const x = parseFloat(btn.getAttribute('data-hotspot-x')) || 0;
        const y = parseFloat(btn.getAttribute('data-hotspot-y')) || 0;
        // compute pixel coordinates relative to media element
        const leftPx = (x / 110) * width;
        const topPx = (y / 100) * height;
        btn.style.left = `${leftPx}px`;
        btn.style.top = `${topPx}px`;
      });
    }

    // position hotspots for all slides initially
    sectionEl.querySelectorAll(SELECTORS.slide).forEach(positionHotspotsInSlide);

    // reposition on resize (debounced)
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        sectionEl.querySelectorAll(SELECTORS.slide).forEach(positionHotspotsInSlide);
      }, 100);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll(SELECTORS.section).forEach(initSection);
  });
})();
