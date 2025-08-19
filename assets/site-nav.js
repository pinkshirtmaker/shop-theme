import { HTMLCustomElement } from '~/theme';

customElements.define(
  'site-nav',
  class SiteNav extends HTMLCustomElement {
    connectedCallback() {
      this.setEventListeners();
    }

    /**
     * Sets event listeners.
     */
    setEventListeners() {
      if (this.targets.tier) {
        this.targets.tier.all.forEach((tier) => {
          tier.addEventListener('focusout', () => {
            setTimeout(() => {
              if (tier.contains(document.activeElement)) {
                return;
              }

              tier.removeAttribute('open');
            });
          });
        });
      }
    }
  }
);
