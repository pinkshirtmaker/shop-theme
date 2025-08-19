import { subscribe, publish } from '~/event-bus';
import { HTMLShopifySectionElement } from '~/theme';

customElements.define(
  'toggle-element',
  class ToggleElement extends HTMLShopifySectionElement {
    constructor() {
      super();

      if (this.hasAttribute('data-hoist')) {
        document.body.appendChild(this);
      }
    }

    /**
     * Called each time the element is added to the document.
     */
    extendedConnectedCallback() {
      if (!this.dataset.namespace) {
        console.error('A `data-namespace` attribute is required.');
        return;
      }

      this.setEventListeners();
      this.setToggleEvents();
    }

    /**
     * Sets the event listeners.
     */
    setEventListeners() {
      /** @todo figure out a way to use targets */
      [...document.querySelectorAll(`[data-toggle="${this.dataset.namespace}"]`)].forEach((element) => {
        element.addEventListener('click', (event) => {
          event.preventDefault();
          this.toggle();
        });
      });

      this.escapeKeyUnsubscribe = subscribe('key:escape', () => this.close());

      /**
       * Closes this element if another is opening.
       */
      this.openingUnsubscribe = subscribe('toggle-element:opening', (namespace) => {
        const openingElement = document.querySelector(`toggle-element[data-namespace="${namespace}"]`);

        if (namespace === this.dataset.namespace) {
          return;
        }

        if (this.contains(openingElement)) {
          if (!openingElement.hasAttribute('keep-parent-open')) {
            this.classList.add('display-contents');
          }

          subscribe('toggle-element-closing', (namespace) => {
            const closingElement = document.querySelector(`toggle-element[data-namespace="${namespace}"]`);

            if (this.contains(closingElement)) {
              this.classList.remove('display-contents');
            }
          });
          return;
        }

        this.close();
      });

      if (this.dataset.event) {
        this.eventUnsubscribe = subscribe(this.dataset.event, () => this.open());
      }
    }

    /**
     * Sets the base toggle events.
     */
    setToggleEvents() {
      this.toggleElementUnsubscribe = subscribe('toggle-element', (event) => {
        if (!event) {
          this.close();
          return;
        }

        /**
         * If the payload is the namespace, run a simple toggle or close.
         */
        if (typeof event === 'string') {
          if (event === this.dataset.namespace) {
            this.toggle();
            return;
          }
          return;
        }

        /**
         * Otherwise, assume an object has been passed.
         * - This accepts `namespace` and `action` properties.
         */
        if (event.namespace !== this.dataset.namespace) {
          this.close();
          return;
        }

        if (!event.action) {
          this.toggle();
          return;
        }

        switch (event.action) {
          case 'open':
            this.open();
            break;

          case 'close':
            this.close();
            break;
        }
      });
    }

    /**
     * Switches between the active state.
     */
    toggle() {
      if (this.classList.contains('is-active')) {
        this.close();
        return;
      }

      if (this.dataset.excludedPageTypes) {
        const types = this.dataset.excludedPageTypes.split(', ');

        if (types.includes(theme.page_type)) {
          return;
        }
      }

      this.open();
    }

    /**
     * Sets the active state.
     * @param {Boolean} showOverlay - Enables the window overlay.
     */
    open(showOverlay = true) {
      this.classList.add('is-active');

      publish('toggle-element:opening', this.dataset.namespace);

      this.dispatchEvent(new CustomEvent('opening'));

      if (Boolean(this.dataset.disableOverlay) !== true && showOverlay) {
        publish('window-overlay');
      }
    }

    /**
     * Removes the active state.
     * @param {Boolean} removeOverlay - Enables hiding the window overlay.
     */
    close(removeOverlay = true) {
      if (!this.classList.contains('is-active')) {
        return;
      }

      this.classList.remove('is-active');

      publish('toggle-element-closing', this.dataset.namespace);

      if (removeOverlay && !this.hasActiveParentToggleElement()) {
        publish('window-overlay', { show: false });
      }
    }

    /**
     * Returns if this element has a parent toggle element that is active.
     * @returns {Boolean}
     */
    hasActiveParentToggleElement() {
      return !!this.closest('toggle-element.is-active');
    }

    /**
     * Called when the parent section is selected in the theme editor.
     */
    onSectionSelect() {
      this.open();
    }

    /**
     * Called when the parent section is de-selected in the theme editor.
     */
    onSectionDeselect() {
      this.close();
    }

    /**
     * Called each time the element is removed from the document.
     */
    extendedDisconnectedCallback() {
      this.escapeKeyUnsubscribe();
      this.openingUnsubscribe();
      this.toggleElementUnsubscribe();

      if (this.eventUnsubscribe) {
        this.eventUnsubscribe();
      }
    }
  }
);
