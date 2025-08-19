import { publish, subscribe } from '~/event-bus';
import { debounce } from '~/helpers';
import { breakpoints, HTMLCustomElement } from '~/theme';

customElements.define(
  'filter-form',
  class FilterForm extends HTMLCustomElement {
    connectedCallback() {
      this.handlers = {
        resize: debounce(this.handleResize.bind(this)),
      };

      if (this.targets.form) {
        this.setEventListeners();
      }
    }

    /**
     * Sets the event listeners.
     */
    setEventListeners() {
      if (!(this.dataset.action === 'manual')) {
        if (this.targets.input) {
          this.targets.input.all.forEach((element) => {
            element.addEventListener('change', () => {
              if (this.dataset.action === 'emit') {
                this.dispatchEvent(
                  new CustomEvent('submit', {
                    detail: new FormData(this.targets.form),
                  })
                );

                return;
              }

              this.targets.form.submit();
            });
          });
        }
      }

      if (this.targets.toggle) {
        this.targets.toggle.addEventListener('click', () => {
          this.openFilterDrawer();
        });
      }

      if (this.targets.close) {
        this.targets.close.all.forEach((element) => {
          element.addEventListener('click', () => {
            this.closeFilterDrawer();
            this.closeFilterDrawer({ element: this.targets['sort-list'], toggle: this.targets['sort-toggle'] });
          });
        });
      }

      subscribe('window-overlay-closed', () => this.closeDrawers());
      subscribe('key:escape', () => this.closeDrawers());

      if (this.targets.filter) {
        this.targets.filter.all.forEach((element) => {
          element.addEventListener('toggle', (event) => {
            if (event.newState === 'open') {
              this.closeOtherFilters(event.target);
            }
          });
        });
      }

      if (this.targets.back) {
        this.targets.back.all.forEach((element) => {
          element.addEventListener('click', (event) => {
            event.preventDefault();

            const details = element.closest('details');

            if (details) {
              details.toggleAttribute('open');
            }
          });
        });
      }

      if (this.targets['sort-toggle']) {
        this.targets['sort-toggle'].addEventListener('click', () => {
          this.openSortList();
        });
      }

      if (this.targets['sort-option']) {
        this.targets['sort-option'].all.forEach((element) => {
          element.addEventListener('click', () => {
            const sortInput = this.querySelector('[name=sort_by]');

            this.setActiveSortOptionState(element);

            if (sortInput) {
              sortInput.value = element.dataset.value;
              sortInput.dispatchEvent(new Event('change'));
            }
          });
        });
      }

      if (this.targets['grid-option']) {
        this.targets['grid-option'].all.forEach((element) => {
          element.addEventListener('click', () => {
            this.targets['grid-option'].all.forEach((option) => {
              if (option === element) {
                option.classList.add('is-active');

                this.dispatchEvent(
                  new CustomEvent('grid-option', {
                    detail: element.dataset.option,
                  })
                );
                return;
              }

              option.classList.remove('is-active');
            });
          });
        });
      }

      window.addEventListener('resize', this.handlers.resize);
    }

    /**
     * Sets the active sort element state.
     * @param {HTMLElement} element - The active sort element.
     */
    setActiveSortOptionState(element) {
      this.targets['sort-option'].all.forEach((option) => {
        if (option === element) {
          return;
        }

        option.classList.remove('is-active');
      });

      element.classList.add('is-active');
    }

    /**
     * Closes all drawers.
     */
    closeDrawers() {
      this.closeFilterDrawer();
      this.closeFilterDrawer({ element: this.targets['sort-list'], toggle: this.targets['sort-toggle'] });
    }

    /**
     * Handles the resize event.
     */
    handleResize() {
      if (this.isDesktop()) {
        this.closeFilterDrawer({ immediate: true });

        if (this.targets['sort-list'].classList.contains('drawer')) {
          this.closeFilterDrawer({
            immediate: true,
            element: this.targets['sort-list'],
            toggle: this.targets['sort-toggle'],
          });
        }
        return;
      }

      if (!this.targets['sort-list'].classList.contains('drawer')) {
        this.closeFilterDrawer({
          immediate: true,
          element: this.targets['sort-list'],
          toggle: this.targets['sort-toggle'],
        });
      }
    }

    /**
     * Opens the filter drawer.
     * @param {HTMLElement} element - Optional element to open as a drawer.
     */
    openFilterDrawer(element = this.targets.filters) {
      if (!element) {
        return;
      }

      element.classList.add('drawer', 'drawer--up');

      requestAnimationFrame(() => {
        element.classList.add('is-active');
      });

      publish('window-overlay');
    }

    /**
     * Opens the sort by list.
     */
    openSortList() {
      if (!this.targets['sort-list']) {
        return;
      }

      this.targets['sort-toggle'].classList.toggle('is-active');

      if (this.isDesktop()) {
        this.targets['sort-list'].classList.toggle('is-active');
        return;
      }

      this.openFilterDrawer(this.targets['sort-list']);
    }

    /**
     * Closes the filter drawer.
     * @param {Object} options - The close options.
     * @param {Boolean} options.immediate - Closes the drawer without waiting for transitionend.
     * @param {HTMLElement} options.element - The drawer element to close.
     */
    closeFilterDrawer({ immediate = false, element = this.targets.filters, toggle } = {}) {
      if (!element || !element.classList.contains('is-active')) {
        return;
      }

      if (immediate) {
        element.classList.remove('drawer', 'drawer--up');
      } else {
        element.addEventListener(
          'transitionend',
          () => {
            element.classList.remove('drawer', 'drawer--up');
          },
          { once: true }
        );
      }

      element.classList.remove('is-active');

      if (toggle) {
        toggle.classList.remove('is-active');
      }

      publish('window-overlay', { show: false });
    }

    /**
     * Closes other filter elements.
     * @param {HTMLDetailsElement} activeFilterElement - The element to keep open.
     */
    closeOtherFilters(activeFilterElement) {
      this.targets.filter.all.forEach((element) => {
        if (element === activeFilterElement) {
          return;
        }

        element.open = false;
      });
    }

    /**
     * Returns if the current resolution is desktop.
     * @returns {Boolean}
     */
    isDesktop() {
      return window.matchMedia(`(min-width: ${breakpoints.large}px)`).matches;
    }

    disconnectedCallback() {
      window.removeEventListener('resize', this.handlers.resize);
    }
  }
);
