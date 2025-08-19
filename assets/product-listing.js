import { publish } from '~/event-bus';
import { getTargets, parseHTML, replaceElement } from '~/helpers';
import { HTMLCustomElement } from '~/theme';

customElements.define(
  'product-listing',
  class ProductListing extends HTMLCustomElement {
    connectedCallback() {
      this.setEventListeners();
    }

    /**
     * Sets the event listeners.
     */
    setEventListeners() {
      if (this.targets['filter-form']) {
        this.targets['filter-form'].addEventListener('submit', (event) => {
          const params = new URLSearchParams(event.detail);
          const query = [];

          params.forEach((value, key) => {
            /**
             * Filter out empty or default values.
             */
            if (value === '' || (key === 'sort_by' && value === this.targets['filter-form'].dataset.defaultSortBy)) {
              return;
            }

            query.push(`${key}=${value}`);
          });

          this.setSection(query.join('&'));
        });

        this.targets['filter-form'].addEventListener('grid-option', (event) => {
          if (this.targets.grid) {
            this.targets.grid.dataset.grid = event.detail;
          }
        });
      }

      if (this.targets['load-next']) {
        this.targets['load-next'].addEventListener('click', (event) => {
          this.handleLoadNext(event);
        });
      }
    }

    /**
     * Handles the load next event.
     * @param {Event} event - The event payload.
     */
    async handleLoadNext(event) {
      event.preventDefault();

      if (!this.targets['load-next']) {
        return;
      }

      this.targets['load-next'].classList.add('is-loading');

      const { searchParams } = new URL(this.targets['load-next'].href);
      const nextPageSection = parseHTML(await this.fetchSection(searchParams.toString()), 'product-listing');
      const targets = getTargets(nextPageSection);

      if (targets['load-next']) {
        this.targets['load-next'].href = targets['load-next'].href;
        this.targets['load-next'].innerHTML = targets['load-next'].innerHTML;

        this.targets['load-next'].classList.remove('is-loading');
      } else {
        this.targets['load-next'].remove();
      }

      if (targets['paginate-count']) {
        this.targets['paginate-count'].innerHTML = targets['paginate-count'].innerHTML;
      }

      this.targets['grid'].innerHTML += targets.grid.innerHTML;

      this.setQueryParams(searchParams.toString());
    }

    /**
     * Fetches and returns the section content.
     * @param {String} query - Optional query parameters.
     * @returns {Promise}
     */
    fetchSection(query) {
      return fetch(`${window.location.pathname}?section_id=${this.dataset.sectionId}${query ? `&${query}` : ''}`).then(
        (response) => response.text()
      );
    }

    /**
     * Sets the section.
     * - Fetches the section content, and injects it.
     * @param {String} query - Optional query parameters.
     */
    async setSection(query) {
      const section = await this.fetchSection(query);
      const main = parseHTML(section, 'product-listing');

      replaceElement(this, main);

      this.setQueryParams(query);
      this.resetTargets();
      this.setEventListeners();

      publish('window-overlay', { show: false });
    }

    /**
     * Sets the collection query parameters.
     * @param {String} query - Optional query parameters.
     */
    setQueryParams(query) {
      window.history.pushState(null, null, query === '' ? window.location.pathname : `?${query}`);
    }
  }
);
