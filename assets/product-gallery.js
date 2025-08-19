import { debounce } from '~/helpers';
import { breakpoints, HTMLCustomElement } from '~/theme';

if (!customElements.get('product-gallery')) {
  customElements.define(
    'product-gallery',
    class ProductGallery extends HTMLCustomElement {
      connectedCallback() {
        this.handlers = {
          resize: debounce(this.handleResize.bind(this)),
        };

        this.targets['main-slider'].addEventListener('swiperslidechangetransitionend', ({ detail: [swiper] }) => {
          if (this.targets['zoom-slider'].swiper) {
            this.targets['zoom-slider'].swiper.slideToLoop(swiper.realIndex, 0, false);
          }
        });

        this.targets['zoom-slider'].addEventListener('swiperslidechangetransitionend', ({ detail: [swiper] }) => {
          if (this.targets['main-slider'].swiper) {
            this.targets['main-slider'].swiper.slideToLoop(swiper.realIndex, 0, false);
          }

          this.targets['zoom-container'].all.forEach((element) => {
            this.resetImageContainerZoom(element);
          });
        });

        this.targets['zoom-container'].all.forEach((element) => {
          let offsetX, offsetY;

          const image = element.querySelector('img');

          element.addEventListener('click', (event) => {
            if (!element.classList.contains('zoomed-in')) {
              /**
               * Zoom in on click.
               */
              element.classList.add('zoomed-in');

              /**
               * Calculate initial offset to center zoom on click.
               */
              const rect = element.getBoundingClientRect();

              offsetX = event.clientX - rect.left;
              offsetY = event.clientY - rect.top;

              if (image) {
                image.style.transformOrigin = `${offsetX}px ${offsetY}px`;
                image.style.transform = 'scale(2)';
              }
            } else {
              /**
               * Reset zoom on second click.
               */
              this.resetImageContainerZoom(element);
            }
          });

          element.addEventListener('mousemove', (event) => {
            if (element.classList.contains('zoomed-in')) {
              /**
               * Move the image around based on the cursor position.
               */
              const rect = element.getBoundingClientRect();
              const x = event.clientX - rect.left - offsetX;
              const y = event.clientY - rect.top - offsetY;

              image.style.transform = `scale(2) translate(${-x}px, ${-y}px)`;
            }
          });
        });

        this.targets['zoom-toggle'].all.forEach((element) => {
          element.addEventListener(
            'click',
            (event) => {
              if (!this.isDesktop() || this.closest('quick-buy-modal')) {
                event.stopImmediatePropagation();
              }
            },
            true
          );
        });

        window.addEventListener('resize', this.handlers.resize);
      }

      /**
       * Resets the container zoom state.
       * @param {HTMLElement} element - The image container.
       */
      resetImageContainerZoom(element) {
        const image = element.querySelector('img');

        element.classList.remove('zoomed-in');

        if (image) {
          image.style.transform = 'scale(1)';
        }
      }

      /**
       * Handles the window resize.
       */
      handleResize() {
        if (!this.isDesktop()) {
          this.targets['zoom-modal'].close();
        }
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
}
