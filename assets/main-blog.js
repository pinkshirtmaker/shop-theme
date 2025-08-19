import { getTargets, parseHTML } from '~/helpers';
import { HTMLCustomElement } from '~/theme';

if (!customElements.get('main-blog')) {
  customElements.define(
    'main-blog',
    class MainBlog extends HTMLCustomElement {
      connectedCallback() {
        if (this.targets['load-next']) {
          this.targets['load-next'].addEventListener('click', async (event) => {
            event.preventDefault();

            this.targets['load-next'].classList.add('is-loading');

            const { searchParams } = new URL(this.targets['load-next'].href);
            const nextPageSection = parseHTML(
              await fetch(
                `${window.location.pathname}?section_id=${this.getAttribute('section-id')}&${searchParams.toString()}`
              ).then((response) => response.text()),
              'main-blog'
            );
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
          });
        }
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
}
