import { publish, subscribe } from '~/event-bus';
import { localiseUrl, parseHTML } from '~/helpers';
import { HTMLCustomElement } from '~/theme';

customElements.define(
  'quick-buy-button',
  class QuickBuyButton extends HTMLCustomElement {
    connectedCallback() {
      this.targets.button.addEventListener('click', (event) => {
        event.preventDefault();

        publish('quick-buy-product', {
          handle: this.getAttribute('product-handle'),
        });
      });
    }
  }
);

customElements.define(
  'quick-buy-modal',
  class QuickBuyModal extends HTMLCustomElement {
    connectedCallback() {
      subscribe('quick-buy-product', (payload) => {
        if (payload.handle === this.handle) {
          publish('toggle-element', 'quick-buy');
          return;
        }

      const path = window.location.pathname;
const marketPrefixMatch = path.match(/^\/[a-z]{2}-[a-z]{2}\//);
const marketPrefix = marketPrefixMatch ? marketPrefixMatch[0] : '/';

// Prevent double slashes if root
const localizedUrl = `${marketPrefix}products/${payload.handle}`.replace(/\/{2,}/g, '/');

console.log('Fetching product from:', localizedUrl); // Optional debugging

fetch(localizedUrl)
  .then(response => response.text())
  .then(response => {
    this.targets.content.innerHTML = parseHTML(response, 'main-product').outerHTML;
    this.handle = payload.handle;
    this.targets.content.scrollTop = 0;

    // Refresh Global-E
   setTimeout(() => {
  if (window.GlobalE && typeof GlobalE.API.refresh === 'function') {
    GlobalE.API.refresh();
  }
}, 100);


    publish('toggle-element', 'quick-buy');
  });
      });
    }
  }
);
