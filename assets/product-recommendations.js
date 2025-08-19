import { subscribe } from '~/event-bus';
import { parseHTML, replaceElement } from '~/helpers';

customElements.define(
  'product-recommendations',
  class ProductRecommendations extends HTMLElement {
    connectedCallback() {
      if (this.getAttribute('context') === 'cart') {
        this.setCartListener();
      }

      if (this.hasAttribute('recommendations-url')) {
        this.setIntersectionObserver();
        return;
      }

      this.classList.add('is-active');
    }

    /**
     * Sets the intersection observer events.
     */
    setIntersectionObserver() {
      this.observer = new IntersectionObserver((entries) => this.handleIntersection(entries));

      this.observer.observe(this);
    }

    /**
     * Handles cart updates.
     */
    setCartListener() {
      subscribe('cart:update', () => {
        /**
         * Reloads the entire section when the cart updates.
         */
        this.parentElement.style.minHeight = `${this.parentElement.offsetHeight}px`;

        fetch(`${window.location.pathname}?section_id=${this.getAttribute('section-id')}`)
          .then((response) => response.text())
          .then((response) => {
            const section = parseHTML(response, 'product-recommendations');

            if (section && !(section.getAttribute('cart-keys') === this.getAttribute('cart-keys'))) {
              this.addEventListener(
                'transitionend',
                () => {
                  this.replaceWith(section);

                  requestAnimationFrame(() => {
                    this.parentElement.style.minHeight = 'initial';
                  });
                },
                { once: true }
              );

              this.classList.remove('is-active');
            }
          });
      });
    }

    /**
     * Handles the section intersection event.
     * @param {Array} entries - The event entries.
     */
    handleIntersection(entries) {
      const { isIntersecting } = entries[0];

      if (!isIntersecting || !this.hasAttribute('recommendations-url')) {
        return;
      }

      this.observer.unobserve(this);

      fetch(this.getAttribute('recommendations-url'))
        .then((response) => response.text())
        .then((response) => {
          this.innerHTML = parseHTML(response, 'product-recommendations').innerHTML;

          setTimeout(() => {
            this.classList.add('is-active');
          });
        });
    }
  }
);
