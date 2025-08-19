import { parseHTML } from '~/helpers';
import { HTMLCustomElement } from '~/theme';

if (!customElements.get('size-guide-modal')) {
  customElements.define(
    'size-guide-modal',
    class SizeGuideModal extends HTMLCustomElement {
      connectedCallback() {
        if (this.targets.modal) {
          this.targets.modal.addEventListener('opening', this.events.handleModalOpening);
        }
      }

      /**
       * Handles the modal opening event.
       */
      handleModalOpening() {
        if (!this.hasAttribute('page-url') || this.hasAttribute('page-loaded')) {
          return;
        }

        fetch(this.getAttribute('page-url'))
          .then((response) => response.text())
          .then((response) => {
            const page = parseHTML(response);
            const sections = [page.querySelector('.size-guide-table-section')];

            if (this.targets.body) {
              this.targets.body.insertAdjacentHTML('beforeend', sections.map((section) => section.outerHTML).join());

              if (this.targets.body.classList.contains('fade-in')) {
                this.targets.body.classList.add('is-active');
              }

              this.setAttribute('page-loaded', true);
            }

            if (this.targets.loader) {
              this.targets.loader.classList.remove('is-active');
            }
          });
      }

      get events() {
        return {
          handleModalOpening: this.handleModalOpening.bind(this),
        };
      }

      disconnectedCallback() {
        if (this.targets.modal) {
          this.targets.modal.removeEventListener('opening', this.events.handleModalOpening);
        }
      }
    }
  );
}
