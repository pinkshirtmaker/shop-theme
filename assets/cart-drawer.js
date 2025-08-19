import { publish, subscribe } from '~/event-bus';
import { getTargets, parseHTML } from '~/helpers';
import { HTMLCustomElement } from '~/theme';

if (!customElements.get('cart-drawer')) {
  customElements.define(
    'cart-drawer',
    class CartDrawer extends HTMLCustomElement {
      connectedCallback() {
        subscribe('cart:added', (payload) => {
          fetch(`${theme.routes.product_recommendations_url}?product_id=${payload.product_id}&section_id=cart-drawer`)
            .then((response) => response.text())
            .then((response) => {
              const element = parseHTML(response, 'cart-drawer');
              const targets = getTargets(element);

              this.targets.recommendations.innerHTML = targets.recommendations.innerHTML;

              requestAnimationFrame(() => {
                setTimeout(() => {
                  publish('toggle-element', 'cart-drawer-recommendations');
                });
              });
            });
        });

        subscribe('toggle-element-closing', (namespace) => {
          if (namespace === 'cart-drawer') {
            publish('toggle-element', {
              namespace: 'cart-drawer-recommendations',
              action: 'close',
            });
          }
        });
      }
    }
  );
}
