import { subscribe } from '~/event-bus';
import { getTargets, parseHTML, replaceElement } from '~/helpers';
import { HTMLCustomElement } from '~/theme';

if (!customElements.get('cart-section')) {
  customElements.define(
    'cart-section',
    class CartSection extends HTMLCustomElement {
      connectedCallback() {
        subscribe('cart:update', (event) => {
          if (this.targets.added) {
            this.targets.added.classList.remove('is-active');
          }

          if (event.sections) {
            const section = event.sections[this.getAttribute('section-name')];

            if (section) {
              this.updateSection(section);
            }
          }
        });

        subscribe('cart:added', () => {
          if (this.targets.added) {
            this.targets.added.classList.add('is-active');
          }
        });
      }

      /**
       * Handles the incoming section and updates elements accordingly.
       * @param {String} section - The section content.
       */
      updateSection(section) {
        let selector = this.tagName;

        if (this.hasAttribute('part')) {
          selector = `${this.tagName}[part="${this.getAttribute('part')}"]`;
        }

        const element = parseHTML(section, selector);
        const updatedTargets = getTargets(element);

        if (this.hasStateChange(element)) {
          /**
           * If the empty state has changed, replace everything.
           */
          this.replaceWith(element);
          return;
        }

        ['count', 'subtotal', 'discounts', 'summary-heading', 'total'].forEach((key) => {
          replaceElement(this.targets[key], updatedTargets[key]);
        });

        this.updateLineItems(updatedTargets);
        this.resetTargets();
      }

      /**
       * Returns if the updated node has a different "empty" state.
       * @param {HTMLElement} updatedNode - The updated version of this component.
       * @returns {Boolean}
       */
      hasStateChange(updatedNode) {
        return (
          (this.hasAttribute('is-empty') && !updatedNode.hasAttribute('is-empty')) ||
          (!this.hasAttribute('is-empty') && updatedNode.hasAttribute('is-empty'))
        );
      }

      /**
       * Replaces, removes or injects line items based on the updated node.
       * @param {HTMLElement[]} updatedTargets - Targets from the updated node.
       */
      updateLineItems(updatedTargets) {
        if (!this.targets.items || !updatedTargets.items) {
          return;
        }

        const currentItemIds = [...this.targets.items.children].map((item) => item.dataset.id);

        [...this.targets.items.children].forEach((item) => {
          if (![...updatedTargets.items.children].find((updatedItem) => updatedItem.dataset.id === item.dataset.id)) {
            item.remove();
          }
        });

        [...updatedTargets.items.children].forEach((updatedElement) => {
          if (currentItemIds.find((id) => id === updatedElement.dataset.id)) {
            /**
             * Returns if the item exists.
             * - The `line-item` component handles line specific updates.
             */
            return;
          }

          this.targets.items.insertBefore(updatedElement, this.targets.items.firstChild);
        });
      }
    }
  );
}
