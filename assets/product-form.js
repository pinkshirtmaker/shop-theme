import { publish } from '~/event-bus';
import { getCartSectionNames, HTMLCustomElement } from '~/theme';

customElements.define(
  'product-form',
  class ProductForm extends HTMLCustomElement {
    connectedCallback() {
      this.handlers = {
        formSubmit: this.handleFormSubmit.bind(this),
        formChange: this.handleFormChange.bind(this),
        optionChange: this.handleOptionChange.bind(this),
        variantChange: this.handleVariantChange.bind(this),
      };

      this.setEventListeners();
    }

    /**
     * Returns the product data, if exists.
     * @returns {Object}
     */
    getProductData() {
      if (!this.targets.data) {
        return null;
      }

      return Object.freeze(JSON.parse(this.targets.data.innerHTML));
    }

    /**
     * Returns the selected variant's identifier.
     * @returns {String}
     */
    getSelectedVariantId() {
      if (!this.targets['variant-selector']) {
        return;
      }

      return Number(this.targets['variant-selector'].value);
    }

    /**
     * Returns the selected variant object, if available.
     * @returns {Object|false}
     */
    getSelectedVariant() {
      const product = this.getProductData();

      if (!product) {
        return false;
      }

      return product.variants.find((variant) => {
        return variant.id === this.getSelectedVariantId();
      });
    }

    /**
     * Sets the event listeners.
     */
    setEventListeners() {
      if (this.targets.form) {
        this.targets.form.removeEventListener('submit', this.handlers.formSubmit);
        this.targets.form.addEventListener('submit', this.handlers.formSubmit);

        this.targets.form.removeEventListener('change', this.handlers.formChange);
        this.targets.form.addEventListener('change', this.handlers.formChange);
      }

      if (this.targets.option) {
        this.targets.option.all.forEach((element) => {
          element.removeEventListener('change', this.handlers.optionChange);
          element.addEventListener('change', this.handlers.optionChange);
        });
      }

      if (this.targets['variant-selector']) {
        this.targets['variant-selector'].removeEventListener('change', this.handlers.variantChange);
        this.targets['variant-selector'].addEventListener('change', this.handlers.variantChange);
      }
    }

    /**
     * Sets the add to cart state.
     * @param {String} state - The state to set.
     */
    setAddToCartState(state = 'idle') {
      const submit = this.targets.submit;

      if (state === 'adding') {
        submit.classList.add('is-loading');
        return;
      }

      if (state === 'idle') {
        submit.classList.remove('is-loading');
        return;
      }

      if (state === 'no_stock' && !this.hasAttribute('disable-add-to-cart-state')) {
        submit.innerHTML = theme.strings.sections.main_product.out_of_stock;
        submit.disabled = true;
      }
    }

    /**
     * Sets the form message state.
     * @param {String} text - The message to set.
     */
    setMessage(text) {
      if (!this.targets.message) {
        return;
      }

      if (text) {
        this.classList.add('has-error-message');
      } else {
        this.classList.remove('has-error-message');
      }

      this.targets.message.innerHTML = text ? `${theme.icons.misc.warning} ${text}` : '';
    }

    /**
     * Runs validation on all fields and manages the `has-error` state.
     */
    validateFields(fields) {
      const valid = [];
      const invalid = [];
      const elements = fields && fields.length ? fields : this.targets.option.all;

      if (!elements.length) {
        return;
      }

      elements.forEach((element) => {
        if (element.checkValidity()) {
          element.classList.remove('has-error');
          valid.push(element);
          return;
        }

        element.classList.add('has-error');
        invalid.push(element);
      });

      if (invalid.length) {
        const invalidFieldNames = invalid.map((element) => element.name.toLowerCase());

        const listFormatter = new Intl.ListFormat(Shopify.locale, {
          style: 'long',
          type: 'conjunction',
        });

        this.setMessage(`Please select ${listFormatter.format(invalidFieldNames)}`);
      } else {
        this.setMessage();
      }
    }

    /**
     * Handles the form submit event.
     */
    handleFormSubmit(event) {
      const formData = new FormData(event.target);

      event.preventDefault();

      if (!this.targets.form.checkValidity()) {
        /**
         * Validate all form fields.
         */
        this.validateFields();

        /**
         * Scrolls into view (since add to cart could be sticky).
         */
        this.targets.form.scrollIntoView({ block: 'nearest' });
        return;
      }

      this.setAddToCartState('adding');
      this.setMessage();

      formData.append('sections', getCartSectionNames());

      fetch(`${theme.routes.cart_add_url}.js`, {
        method: 'POST',
        body: formData,
      })
        .then((response) => response.json())
        .then((response) => {
          if (response.description) {
            this.setMessage(response.description);
          }

          publish('cart:update', response);
          publish('cart:added', response);

          const quantity = this.querySelector('input[name=quantity]');

          if (quantity) {
            quantity.value = 1;
          }
        })
        .finally(() => {
          this.setAddToCartState();
        });
    }

    /**
     * Handles the general form change event.
     */
    handleFormChange() {
      const data = new FormData(this.targets.form);
      const element = this.targets.form.elements['quantity'];
      const remove = () =>
        this.targets['max-quantity-warning'] && this.targets['max-quantity-warning'].classList.remove('is-active');

      if (!element) {
        remove();
        return;
      }

      if (Number(element.max) === Number(data.get('quantity')) && this.targets['max-quantity-warning']) {
        this.targets['max-quantity-warning'].classList.add('is-active');
        return;
      }

      remove();
    }

    /**
     * Handles the option change event.
     * @param {Event} event - The change event payload.
     */
    handleOptionChange(event) {
      const selectedVariant = this.getVariantBySelectedOptions();

      if (this.classList.contains('has-error-message')) {
        this.validateFields();
      }

      if (!selectedVariant) {
        const defaultVariant = this.getProductData().variants.find((variant) =>
          Object.values(this.getSelectedOptions()).every((option) => variant.options.includes(option))
        );

        if (!defaultVariant) {
          return;
        }

        this.dispatchEvent(
          new CustomEvent('staged-variant', {
            detail: defaultVariant,
          })
        );

        return;
      }

      this.targets['variant-selector'].value = selectedVariant.id;

      this.targets['variant-selector'].dispatchEvent(new Event('change'));
    }

    /**
     * Handles the variant change event.
     * - Sets the form state based on the selected variant.
     */
    handleVariantChange() {
      this.selected = this.getSelectedVariant();

      if (!this.selected) {
        return;
      }

      this.dispatchEvent(
        new CustomEvent('variant', {
          detail: this.selected,
        })
      );

      this.updateLinkedProducts();

      if (!this.selected.available) {
        this.setAddToCartState('no_stock');
        return;
      }

      this.setAddToCartState();
    }

    /**
     * Returns the selected option values.
     * @returns {Object}
     */
    getSelectedOptions() {
      const selected = {};

      if (this.targets.option) {
        this.targets.option.all.forEach((element) => {
          const name = element.name;
          const allow = () => (selected[name] = element.value);

          if (element.type === 'radio') {
            if (element.checked) {
              allow();
            }

            return;
          }

          allow();
        });
      }

      return selected;
    }

    /**
     * Returns the variant object by its selected options.
     * @returns {Object}
     */
    getVariantBySelectedOptions() {
      const selectedOptions = this.getSelectedOptions();
      const product = this.getProductData();

      return product.variants.find((variant) => {
        return Object.keys(selectedOptions).every((key, index) => variant.options[index] === selectedOptions[key]);
      });
    }

    /**
     * Updates each linked product with the variant that matches the selected options.
     * - Ensures the same options are selected when navigating to the linked product.
     */
    updateLinkedProducts() {
      if (!this.targets['linked-product']) {
        return;
      }

      this.targets['linked-product'].all.forEach((element) => {
        const data = JSON.parse(element.dataset.productData);

        data.variants.forEach((variant) => {
          if (variant.options.every((value, index) => value === this.selected.options[index])) {
            element.href = variant.url;
          }
        });
      });
    }
  }
);
