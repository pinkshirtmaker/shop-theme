import { getTargets, localiseUrl, parseHTML, replaceElement } from '~/helpers';
import { HTMLCustomElement } from '~/theme';

customElements.define(
  'main-product',
  class MainProduct extends HTMLCustomElement {
    connectedCallback() {
      this.setEventListeners();
    }

    /**
     * Sets the event listeners.
     */
    setEventListeners() {
      if (this.targets.form) {
        this.targets.form.addEventListener('variant', (event) => {
          if (!this.closest('quick-buy-modal')) {
            this.setQueryParam(event.detail);
          }

          this.setVariantSection(event.detail);
        });

        /**
         * Updates available options based on a staged variant, in the case that not all options have been selected.
         */
        this.targets.form.addEventListener('staged-variant', async (event) => {
          const section = await this.fetchVariantSection(event.detail);
          const main = parseHTML(section, 'product-form', true);
          const updatedTargets = getTargets(main);

          if (!updatedTargets) {
            return;
          }

          this.replaceOptions(updatedTargets);
        });
      }

      if (this.targets['notify-form']) {
        this.targets['notify-form'].addEventListener('submit', this.handleNotifyFormSubmit.bind(this));
      }
    }

    /**
     * Replaces option inputs.
     * @param {ReturnType<typeof import('./helpers').getTargets>} updatedTargets - The updated targets.
     */
    replaceOptions(updatedTargets) {
      getTargets(this.targets.form).option.all.forEach((element) => {
        /**
         * The first option is the control.
         */
        if (element.dataset.optionIndex0 === '0') {
          return;
        }

        const pair = updatedTargets.option?.all.find((updatedTarget) =>
          element.tagName === 'SELECT'
            ? updatedTarget.name === element.name
            : updatedTarget.name === element.name && updatedTarget.value === element.value
        );

        if (!pair) {
          return;
        }

        if (element.tagName === 'SELECT' || !!element.closest('select-dropdown')) {
          /**
           * If it's a select element, replace the fieldset to include it's fieldset.
           */
          element.parentElement.parentElement.replaceWith(pair.parentElement.parentElement);
        } else {
          const newElement = pair.cloneNode(true);

          /**
           * Preserve the checked state.
           */
          newElement.checked = element.checked;

          element.replaceWith(newElement);
        }

        this.targets.form.resetTargets();
        this.targets.form.setEventListeners();
      });
    }

    /**
     * Fetches and returns the variant's section content.
     * @param {Object} variant - The variant object.
     * @returns {Promise}
     */
    fetchVariantSection(variant) {
      return fetch(
        `${localiseUrl(`/products/${this.dataset.productHandle}`)}?section_id=${this.dataset.sectionId}&variant=${
          variant.id
        }`
      ).then((response) => response.text());
    }

    /**
     * Sets the variant section.
     * - Fetches the section content, and injects it.
     * @param {Object} variant - The variant object.
     */
    async setVariantSection(variant) {
      this.classList.add('is-loading');

      const section = await this.fetchVariantSection(variant);
      const main = parseHTML(section, 'main-product', true);
      const updatedTargets = getTargets(main);

      if (!updatedTargets) {
        return;
      }

      /**
       * Variant-specific elements.
       */
      ['gallery', 'price', 'add-to-cart', 'pick-up'].forEach((key) => {
        replaceElement(this.targets[key], updatedTargets[key]);
      });

      const productFormTargets = {
        current: getTargets(this.querySelector('product-form')),
        updated: getTargets(main.querySelector('product-form')),
      };

      replaceElement(productFormTargets.current['variant-selector'], productFormTargets.updated['variant-selector'], [
        'value',
      ]);

      this.querySelector('product-form').resetTargets();

      this.replaceOptions(productFormTargets.updated);
      this.resetTargets();

      this.classList.remove('is-loading');
    }

    /**
     * Sets the variant query parameter.
     * @param {Object} variant - The variant object.
     */
    setQueryParam(variant) {
      const params = new URLSearchParams(window.location.search);

      params.set('variant', variant.id);

      window.history.replaceState(null, null, `?${params.toString()}`);
    }

    /**
     * Handles the notify form submit event.
     */
    async handleNotifyFormSubmit(event) {
      const form = new FormData(this.targets['notify-form']);

      event.preventDefault();

      if (this.targets['notify-submit']) {
        this.targets['notify-submit'].classList.add('is-loading');
      }

      try {
        await fetch(
          `https://a.klaviyo.com/client/back-in-stock-subscriptions/?company_id=${theme.settings.klaviyo_public_api_key}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              revision: '2024-10-15',
            },
            body: JSON.stringify({
              data: {
                type: 'back-in-stock-subscription',
                attributes: {
                  profile: {
                    data: {
                      type: 'profile',
                      attributes: {
                        email: form.get('email'),
                      },
                    },
                  },
                  channels: ['EMAIL'],
                },
                relationships: {
                  variant: {
                    data: {
                      type: 'catalog-variant',
                      id: `$shopify:::$default:::${form.get('variant')}`,
                    },
                  },
                },
              },
            }),
          }
        );

        this.targets['notify-form'].classList.add('has-success');
        this.targets['notify-form'].classList.remove('has-error');
      } catch {
        this.targets['notify-form'].classList.remove('has-success');
        this.targets['notify-form'].classList.add('has-error');
      }

      if (this.targets['notify-submit']) {
        this.targets['notify-submit'].classList.remove('is-loading');
      }
    }
  }
);
