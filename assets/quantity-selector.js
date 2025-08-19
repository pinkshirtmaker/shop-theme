import { HTMLCustomElement } from '~/theme';

if (!customElements.get('quantity-selector')) {
  customElements.define(
    'quantity-selector',
    class QuantitySelector extends HTMLCustomElement {
      connectedCallback() {
        if (this.targets.decrease) {
          this.targets.decrease.addEventListener('click', () => {
            if (this.targets.input.min === this.targets.input.value) {
              return;
            }

            this.targets.input.value = Number(this.targets.input.value) - 1;

            this.emitNativeEvent();
          });
        }

        if (this.targets.increase) {
          this.targets.increase.addEventListener('click', () => {
            if (this.targets.input.max === this.targets.input.value) {
              return;
            }

            this.targets.input.value = Number(this.targets.input.value) + 1;

            this.emitNativeEvent();
          });
        }
      }

      /**
       * Emits the native change event.
       */
      emitNativeEvent() {
        this.targets.input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  );
}
