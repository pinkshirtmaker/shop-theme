import { publish, subscribe } from '~/event-bus';
import { debounce } from '~/helpers';
import { HTMLCustomElement } from '~/theme';

if (!customElements.get('site-header')) {
  customElements.define(
    'site-header',
    class SiteHeader extends HTMLCustomElement {
      connectedCallback() {
        this.handlers = {
          onScroll: this.onScroll.bind(this),
        };

        this.setHeightProperties();

        if (document.documentElement.scrollTop === 0) {
          this.setScrollListener();
        } else {
          /**
           * Waits briefly to avoid a dramatic element shift, since the announcement bar is hidden if scrolled.
           */
          setTimeout(() => {
            this.onScroll();
            this.setScrollListener();
          }, 750);
        }

        /**
         * Set the resize observer.
         */
        this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
        this.resizeObserver.observe(this);

        /**
         * Navigation.
         */
        if (this.targets['menu-toggle']) {
          this.targets['menu-toggle'].addEventListener('click', () => {
            if (this.classList.contains('is-menu-open')) {
              this.closeMobileMenu();
              return;
            }

            this.openMobileMenu();
          });
        }

        subscribe('toggle-element:opening', () => {
          this.closeMobileMenu();
        });

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

        /**
         * Mega-nav dropdowns.
         */
        if (this.targets.details) {
          this.targets.details.all.forEach((element) => {
            const summary = element.querySelector('summary');

            if (summary) {
              summary.addEventListener('click', this.handleDetailsSummaryClick.bind(this));
            }

            element.addEventListener('mouseenter', this.handleDetailsMouseenter.bind(this));
            element.addEventListener('mouseleave', this.handleDetailsMouseleave.bind(this));
            element.addEventListener('focusout', this.handleDetailsFocusout.bind(this));
          });
        }

        /**
         * Mobile search.
         */
        if (this.targets['mobile-search']) {
          if (this.targets['mobile-search-toggle']) {
            const input = this.targets['mobile-search'].querySelector('[name=q]');

            this.targets['mobile-search-toggle'].addEventListener('click', (event) => {
              event.preventDefault();

              this.targets['mobile-search'].classList.add('is-active');

              this.classList.add('above-window-overlay');

              publish('window-overlay');

              if (input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
              }
            });

            subscribe('window-overlay-closed', () => {
              this.closeMobileSearch();
            });
          }

          if (this.targets['mobile-search-close']) {
            this.targets['mobile-search-close'].addEventListener('click', () => {
              this.closeMobileSearch();
            });
          }

          window.addEventListener(
            'resize',
            debounce(() => {
              if (this.isDesktop()) {
                this.closeMobileSearch();
              }
            })
          );

          subscribe('key:escape', () => {
            this.closeMobileSearch();
          });
        }

        /**
         * Desktop search.
         */
        this.targets['desktop-search-toggle'].addEventListener('click', (event) => {
          if (this.targets['desktop-search'].classList.contains('is-active')) {
            return;
          }

          event.preventDefault();

          this.targets['desktop-search'].classList.add('is-active');

          this.targets['desktop-search-input'].addEventListener(
            'transitionend',
            () => {
              this.targets['desktop-search-input'].focus();
              this.targets['desktop-search-input'].setSelectionRange(
                this.targets['desktop-search-input'].value.length,
                this.targets['desktop-search-input'].value.length
              );
            },
            { once: true }
          );
        });

        this.targets['desktop-search-input'].addEventListener('blur', (event) => {
          if (
            this.targets['desktop-search'].contains(event.relatedTarget) ||
            this.targets['desktop-search-input'].value.length
          ) {
            return;
          }

          this.targets['desktop-search'].classList.remove('is-active');
        });
      }

      /**
       * Handles the details' `mouseenter` event.
       * @param {MouseEvent} event - The event payload.
       */
      handleDetailsMouseenter(event) {
        /**
         * Default to click events on non-hover devices.
         */
        if (window.matchMedia('(hover: none)').matches || !this.isDesktop()) {
          return;
        }

        this.openDetailsDropdown(event.target);
      }

      /**
       * Handles the details' `mouseleave` event.
       * @param {MouseEvent} event - The event payload.
       */
      handleDetailsMouseleave(event) {
        /**
         * Default to click events on non-hover devices.
         */
        if (window.matchMedia('(hover: none)').matches || !this.isDesktop()) {
          return;
        }

        this.closeDetailsDropdown(event.target);
      }

      /**
       * Handles the details' `focusout` event.
       * @param {FocusEvent} event - The event payload.
       */
      handleDetailsFocusout(event) {
        const currentTarget = event.currentTarget;

        requestAnimationFrame(() => {
          if (currentTarget.contains(event.relatedTarget)) {
            return;
          }

          this.closeDetailsDropdown(currentTarget);
        });
      }

      /**
       * Handles the details summary click event.
       * @param {MouseEvent} event - The event payload.
       */
      handleDetailsSummaryClick(event) {
        const details = event.target.closest('details');

        /**
         * Default to native behavior on mobile.
         */
        if (!this.isDesktop() || !details) {
          return;
        }

        event.preventDefault();

        /**
         * Default to `mouseenter` event on hover-enabled devices.
         */
        if (window.matchMedia('(hover: hover)').matches) {
          return;
        }

        if (details.open) {
          this.closeDetailsDropdown(details);
          return;
        }

        this.openDetailsDropdown(details);
      }

      /**
       * Opens a details element's dropdown.
       * @param {HTMLDetailsElement} element - The details element.
       */
      openDetailsDropdown(element) {
        const content = element.querySelector('.header-nav__dropdown--top');

        if (!content) {
          return;
        }

        this.targets.details.all.forEach((other) => {
          if (other !== element && other.open) {
            this.closeDetailsDropdown(other);
          }
        });

        element.open = true;

        requestAnimationFrame(() => {
          content.classList.add('is-open');
        });
      }

      /**
       * Closes a details element's dropdown.
       * @param {HTMLDetailsElement} element - The details element.
       */
      closeDetailsDropdown(element) {
        const dropdown = element.querySelector('.header-nav__dropdown--top');

        if (!dropdown) {
          return;
        }

        dropdown.addEventListener(
          'transitionend',
          () => {
            if (!dropdown.classList.contains('is-open')) {
              element.open = false;
            }
          },
          { once: true }
        );

        dropdown.classList.remove('is-open');
      }

      /**
       * Closes the mobile search overlay.
       */
      closeMobileSearch() {
        if (!this.targets['mobile-search'] || !this.targets['mobile-search'].classList.contains('is-active')) {
          return;
        }

        this.targets['mobile-search'].classList.remove('is-active');

        publish('window-overlay', {
          show: false,
          transitionend: () => {
            this.classList.remove('above-window-overlay');
          },
        });
      }

      /**
       * Opens the mobile menu.
       */
      openMobileMenu() {
        this.classList.add('is-menu-open');

        /**
         * Body scroll  lock.
         */
        document.body.classList.add('overflow-hidden');
      }

      /**
       * Closes the mobile menu.
       */
      closeMobileMenu() {
        this.classList.remove('is-menu-open');

        /**
         * Body scroll  lock.
         */
        document.body.classList.remove('overflow-hidden');
      }

      /**
       * Sets the scroll event listener.
       */
      setScrollListener() {
        window.addEventListener('scroll', this.handlers.onScroll);
      }

      /**
       * Handles the window scroll event.
       */
      onScroll() {
        /**
         * If the document has scrolled past 100px, set the header scrolled state.
         */
        if (document.documentElement.scrollTop >= 1) {
          this.classList.add('is-scrolled');
          return;
        }

        this.classList.remove('is-scrolled');
      }

      /**
       * Returns if the screen is desktop.
       * @returns {Boolean}
       */
      isDesktop() {
        return window.matchMedia('(min-width: 768px)').matches;
      }

      /**
       * Handler for the resize observer.
       */
      handleResize() {
        const isDesktop = this.isDesktop();

        this.setHeightProperties();

        if (isDesktop) {
          if (this.classList.contains('is-menu-open')) {
            this.closeMobileMenu();
          }

          if (this.targets.details) {
            this.targets.details.all.forEach((element) => {
              element.open = false;
            });
          }
        }

        if (this.targets['nested-details']) {
          this.targets['nested-details'].all.forEach((element) => {
            element.open = isDesktop;
          });
        }
      }

      /**
       * Sets body CSS properties with accurate heights of main and the announcement bar.
       */
      setHeightProperties() {
        if (this.targets.main) {
          const mainHeight = `${this.targets.main.offsetHeight}px`;

          if (mainHeight !== document.body.style.getPropertyValue('--header-main-height')) {
            document.body.style.setProperty('--header-main-height', `${this.targets.main.offsetHeight}px`);
          }
        }

        if (this.targets.announcement) {
          const announcementHeight = `${this.targets.announcement.offsetHeight}px`;

          if (announcementHeight !== document.body.style.getPropertyValue('--header-announcement-height')) {
            document.body.style.setProperty(
              '--header-announcement-height',
              `${this.targets.announcement.offsetHeight}px`
            );
          }
        }
      }

      /**
       * Returns if hover is allowed on this device.
       * @returns {Boolean}
       */
      hoverAllowed() {
        return window.matchMedia('(hover: hover)').matches;
      }

      disconnectedCallback() {
        window.removeEventListener('scroll', this.handlers.onScroll);

        /**
         * Remove the resize observer
         */
        this.resizeObserver.unobserve(this);
      }
    }
  );
}
