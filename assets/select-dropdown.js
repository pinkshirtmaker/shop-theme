import { publish, subscribe } from '~/event-bus';
import { breakpoints, HTMLCustomElement } from '~/theme';

if (!customElements.get('select-dropdown')) {
  customElements.define(
    'select-dropdown',
    class SelectDropdown extends HTMLCustomElement {
      connectedCallback() {
        this.input = this.querySelector('select');

        if (!this.input) {
          return;
        }

        ['mousedown', 'keydown'].forEach((eventName) => {
          this.input.addEventListener(eventName, this.handleOpenEvent.bind(this));
        });

        [this.input, this.targets.button].forEach((element) => {
          if (!element) {
            return;
          }

          element.addEventListener('blur', () => {
            requestAnimationFrame(() => {
              /**
               * If the focused element is inside the component, keep the dropdown open.
               */
              if (this.contains(document.activeElement)) {
                return;
              }

              this.close();
            });
          });
        });

        if (this.targets.button) {
          this.targets.button.addEventListener('click', this.handleOpenEvent.bind(this));
        }

        this.setValueEventListeners();

        if (this.targets.close) {
          this.targets.close.all.forEach((element) => {
            element.addEventListener('click', this.close.bind(this));
          });
        }

        window.addEventListener('resize', () => {
          if (this.isOpen()) {
            /**
             * The overlay should only show on mobile.
             */
            publish('window-overlay', { show: !this.isDesktop() });

            if (this.isDesktop()) {
              this.input.classList.add('is-open');
            }

            return;
          }

          this.input.classList.remove('is-open');
        });
      }

      /**
       * Sets event listeners for the value buttons.
       */
      setValueEventListeners() {
        if (this.targets.value) {
          this.targets.value.all.forEach((element) => {
            element.addEventListener('click', this.handleValueSelect.bind(this));
          });
        }
      }

      /**
       * Returns if the current resolution is desktop.
       * @returns {Boolean}
       */
      isDesktop() {
        return window.matchMedia(`(min-width: ${breakpoints.large}px)`).matches;
      }

      /**
       * Handles events which open the native dropdown.
       * @param {Event} event - The event payload.
       */
      handleOpenEvent(event) {
        event.preventDefault();

        if (!this.isDesktop()) {
          publish('window-overlay');

          subscribe('window-overlay-closed', () => {
            this.close(false);
          });
        }

        if (this.isOpen()) {
          this.close();
          return;
        }

        this.open();
      }

      /**
       * Returns if the dropdown is open.
       * @returns {Boolean}
       */
      isOpen() {
        return this.classList.contains('is-open');
      }

      /**
       * Opens the dropdown.
       */
      open() {
        this.classList.add('is-open');

        /**
         * Only apply the native open styling on desktop (since mobile is an overlay).
         */
        if (this.isDesktop()) {
          this.input.classList.add('is-open');
        }

        this.input.focus();
      }

      /**
       * Closes the dropdown.
       */
      close(closeWindowOverlay = true) {
        if (!this.classList.contains('is-open')) {
          return;
        }

        if (closeWindowOverlay && !this.closest('toggle-element.is-active')) {
          publish('window-overlay', { show: false });
        }

        this.classList.remove('is-open');

        /**
         * Update the native select input.
         */
        this.input.classList.remove('is-open');
        this.input.blur();
      }

      /**
       * Handles select of a value element.
       * @param {MouseEvent} event - The select event.
       */
      handleValueSelect(event) {
        event.preventDefault();

        if (event.currentTarget.dataset.value) {
          this.input.value = event.currentTarget.dataset.value;

          if (this.targets.button) {
            this.targets.button.textContent = this.input.value;
          }

          /**
           * Emulates the native value change event.
           */
          this.input.dispatchEvent(new Event('change'));

          this.close();
        }
      }
    }
  );
}
