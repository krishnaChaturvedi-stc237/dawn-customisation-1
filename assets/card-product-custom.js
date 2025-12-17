class CardProductCustom {
    constructor(parameters) {
        this.bindEvents()
    }
    bindEvents() {
        document.addEventListener('click', (event) => {
            const button = event.target.closest('[data-add-to-cart]')
            if (!button) return;
            this.addToCart(button)

        })
    }
    async addToCart(button) {
        const variantId = button.dataset.variantId;

        button.classList.add('loading')
        button.disabled = true;

        try {
            await fetch('/cart/add.js', {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: variantId,
                    quantity: 1
                })
            })
            this.updateCartDrawer()

        } catch (error) {
            console.error('Add to cart failed', error);
        } finally {
            button.classList.remove('loading')
            button.disabled = false;
        }
    }

    openCartDrawer() {
        const cartDrawer = document.querySelector('cart-drawer');
        if (!cartDrawer) return;

        cartDrawer.open();
    }

    async updateCartDrawer() {
        const response = await fetch('/?sections=cart-drawer,header');
        const sections = await response.json();

        const html = sections['cart-drawer'];
        const html_cartCountBubble = sections['header'];

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const doc_cartCountBubble = parser.parseFromString(html_cartCountBubble, 'text/html');

        const newSection = doc.querySelector('cart-drawer');
        const new_headerWithWrapper=doc_cartCountBubble.querySelector('#shopify-section-header')
        const new_mainHeader=new_headerWithWrapper.querySelector('header')
        const currentSection = document.querySelector('cart-drawer');
        const old_mainHeader=document.querySelector('header')
        
        if (!newSection) return;

        if (currentSection) {
            currentSection.replaceWith(newSection);
        } else {
            document.body.appendChild(newSection);
        }
        if(old_mainHeader && new_mainHeader ){
            old_mainHeader.replaceWith(new_mainHeader)
        }

        this.openCartDrawer();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CardProductCustom()
})