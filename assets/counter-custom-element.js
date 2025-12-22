const template = document.createElement('template');
template.innerHTML = `
    <style>
      :host {
        display: inline-block;
        border: 2px solid #ccc;
        padding: 12px;
        border-radius: 8px;
        font-family: sans-serif;
        border: 2px solid var(--counter-border, #ccc);
        background: var(--counter-bg, transparent);
      }
      :host([disabled]){
        opacity: 0.5;
        pointer-events: none;
      }
      :host([variant="compact"]){
        padding : 6px;
        font-size : 12px;
      }
      :host([variant="large"]){
        padding : 15px;
        font-size: 20px;
      }
      ::slotted(h3){
        font-size: 24px;
      }
      ::slotted(p){
        font-weight: 800;
      }
    </style>
      <div>
        <slot name="title"></slot>
        <p>Count: <span id="value"></span></p>
        <slot name="description" ></slot>
        <button id="inc">+</button>
        <button id="dec">-</button>
      </div>
    `;

class CounterBox extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.appendChild(
            template.content.cloneNode(true)
        );
        //Element are cached from here - using template dom is created once.
        this._valueEle = this.shadowRoot.querySelector('#value');
        this._incBtn = this.shadowRoot.querySelector('#inc');
        this._decBtn = this.shadowRoot.querySelector('#dec');
        this._btns = this.shadowRoot.querySelectorAll('button');


        this.count = 0;
        this.step = 1;

    }

    static get observedAttributes() {
        return ["start", "step", "disabled"];
    }

    connectedCallback() {
        // this.render();
        this.attachEvents();
        this.initialiseFromAttributes()
        this.updateDisableState();
        this.update();
    }

    initialiseFromAttributes() {
        if (this.hasAttribute('start')) {
            this.count = Number(this.getAttribute('start'));
            this.update()
        }
        if (this.hasAttribute('step')) {
            this.step = Number(this.getAttribute('step'));
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        console.log("attributeChangedCallback->", name, oldValue, newValue);

        if (newValue === oldValue) return;

        if (name === "disabled") {
            this.updateDisableState()
        }
        if (name === "step") {
            this.step = Number(newValue);
        }
        if (name === "start") {
            this.count = Number(newValue);
            this.update()
        }

    }

    // render() {
    //     this.shadowRoot.innerHTML=``
    // }

    attachEvents() {
        // this.shadowRoot.querySelector("#inc").addEventListener("click", () =>
        //     this.increment()
        // );
        // this.shadowRoot.querySelector("#dec").addEventListener("click", () =>
        //     this.decrement()
        // );
        this._incBtn.addEventListener("click", () =>
            this.increment()
        );
        this._decBtn.addEventListener("click", () =>
            this.decrement()
        );

    }

    increment() {
        this.count += this.step;
        this.update();
        this.emitCountChangeEvent()
    }

    decrement() {
        this.count -= this.step;
        this.update();
        this.emitCountChangeEvent()
    }

    update() {
        // const valueEl = this.shadowRoot.querySelector("#value");
        // if (valueEl) _value.textContent = this.count;
        if (this._valueEle) {
            this._valueEle.textContent = this.count;
        }
    }

    updateDisableState() {
        const isDisabled = this.hasAttribute('disabled')
        this._btns.forEach((btn) => btn.disabled = isDisabled)
    }

    emitCountChangeEvent() {
        this.dispatchEvent(new CustomEvent('count-change', {
            detail: {
                value: this.count
            },
            bubbles: true,  // Allow bubble up in the dom
            composed: true  // Allow bubble to escape the shadow dom
        }))
    }

    // Basically setter and getter primally used to create a bridge between the html attributes and js properties
    // You use properties to set or get the attribues and that attribute is further impacts the actual working of the 
    // class or web component

    get disabled() {
        return this.hasAttribute('disabled')
    }

    set disabled(value) {
        if (value) {
            this.setAttribute('disabled', '');
        } else {
            this.removeAttribute('disabled');
        }
    }

    disconnectedCallback() {
        console.log("cleanup if needed");
    }

}

customElements.define("counter-box", CounterBox);
