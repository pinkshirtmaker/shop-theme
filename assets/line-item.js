import { publish, subscribe } from '~/event-bus';
import { getTargets, parseHTML, replaceElement } from '~/helpers';
import { getCartSectionNames, HTMLCustomElement } from '~/theme';

if (!customElements.get('line-item')) {
  customElements.define(
    'line-item',
    class LineItem extends HTMLCustomElement {
      connectedCallback() {
        this.setEventListeners();

        subscribe('cart:update', (event) => {
          if (event.sections) {
            const section = event.sections[this.getAttribute('section-name')];

            if (section) {
              const element = parseHTML(section, `${this.tagName.toLowerCase()}[data-id="${this.dataset.id}"]`);
              const updatedTargets = getTargets(element);

              if (updatedTargets) {
                replaceElement(this.getQuantityInput(), this.getQuantityInput(element), ['value']);
                replaceElement(this.targets.total, updatedTargets.total);
                replaceElement(this.targets.price, updatedTargets.price);

                this.resetTargets();

                this.classList.remove('is-loading');
              }
            }
          }
        });
      }

      /**
       * Returns the quantity selector.
       * @param {HTMLElement} container - The container, defaults to `this`.
       * @returns {HTMLElement}
       */
      getQuantityInput(container = this) {
        return container.querySelector('input[name="updates[]"]');
      }

      /**
       * Sets the event listeners.
       */
      setEventListeners() {
        const quantity = this.getQuantityInput();

        if (quantity) {
          quantity.addEventListener('change', (event) => {
            this.updateItem({
              quantity: Number(event.target.value),
            });
          });
        }

        if (this.targets.remove) {
          this.targets.remove.addEventListener('click', (event) => {
            event.preventDefault();

            this.updateItem({
              quantity: 0,
            });
          });
        }
      }

      /**
       * Updates the line item in the cart.
       * @param {Object} updates - The update data.
       * @param {Number} updates.quantity - The line item quantity.
       */
      async updateItem({ quantity }) {
        if (typeof quantity === 'undefined') {
          return;
        }

        /**
         * Prevents the event.
         * @param {MouseEvent} event - The event payload.
         */
        function prevent(event) {
          event.preventDefault();
        }

        this.classList.add('is-loading');

        /**
         * Stops the customer from triggering any actions whilst loading.
         */
        this.addEventListener('mousedown', prevent);

        await fetch(`${theme.routes.cart_update_url}.js`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            updates: {
              [this.dataset.id]: quantity,
            },
            sections: getCartSectionNames().join(','),
          }),
        })
          .then((response) => response.json())
          .then((response) => {
            this.classList.remove('is-loading');

            /**
             * Allows mouse events after loading.
             */
            this.removeEventListener('mousedown', prevent);

            publish('cart:update', response);
          })
          .catch(() => {
            this.classList.remove('is-loading');
          });
      }
    }
  );
}
