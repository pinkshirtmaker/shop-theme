import { clamp, parseHTML } from '~/helpers';
import { HTMLCustomElement } from '~/theme';

if (!customElements.get('size-guide-table')) {
  customElements.define(
    'size-guide-table',
    class SizeGuideTable extends HTMLCustomElement {
      connectedCallback() {
        this.setActiveBlock(0);
        this.setNavigationEvents();
        this.setUnitEvents();
        this.setImageEvents();
      }

      /**
       * Sets the image related events.
       * @param {Boolean} remove - Removes the event listeners.
       */
      setImageEvents(remove = false) {
        /** @type {'addEventListener' | 'removeEventListener'} */
        const method = remove ? 'removeEventListener' : 'addEventListener';

        if (this.targets['front-image-button']) {
          this.targets['front-image-button'][method]('click', this.events.handleFrontImageButton);
        }

        if (this.targets['back-image-button']) {
          this.targets['back-image-button'][method]('click', this.events.handleBackImageButton);
        }
      }

      /**
       * Sets the navigation events.
       * @param {Boolean} remove - Removes the event listeners.
       */
      setNavigationEvents(remove = false) {
        /** @type {'addEventListener' | 'removeEventListener'} */
        const method = remove ? 'removeEventListener' : 'addEventListener';

        if (this.targets.previous) {
          this.targets.previous[method]('click', this.events.handlePreviousClick);
        }

        if (this.targets.next) {
          this.targets.next[method]('click', this.events.handleNextClick);
        }

        if (this.targets['block-button']) {
          this.targets['block-button'].all.forEach((element) => {
            element[method]('click', this.events.handleBlockButtonClick);
          });
        }
      }

      /**
       * Sets the unit events.
       * @param {Boolean} remove - Removes the event listeners.
       */
      setUnitEvents(remove = false) {
        /** @type {'addEventListener' | 'removeEventListener'} */
        const method = remove ? 'removeEventListener' : 'addEventListener';

        if (this.targets.unit) {
          this.targets.unit.all.forEach((element) => {
            element[method]('click', this.events.handleUnitClick);
          });
        }
      }

      /**
       * Sets the active block based on the 0-index position.
       * @param {Number} index - The block index.
       */
      setActiveBlock(index) {
        if (!this.targets.table) {
          return;
        }

        index = clamp(index, 0, Number(this.getAttribute('block-count')) - 1);

        for (let row of this.targets.table.rows) {
          [...row.cells].forEach((cell) => {
            if (Number(cell.dataset.blockIndex) === index) {
              cell.classList.add('is-active');
              return;
            }

            cell.classList.remove('is-active');
          });
        }

        if (this.targets['block-button']) {
          this.targets['block-button'].all.forEach((element) => {
            if (Number(element.dataset.blockIndex) === index) {
              element.classList.add('is-active');
              return;
            }

            element.classList.remove('is-active');
          });
        }

        /**
         * Scrols the column into view.
         */
        const firstCellIndex = this.hasAttribute('has-header-column') ? index + 1 : index;
        const firstCell = this.targets.table.rows[0].cells[firstCellIndex];
        const scrollOffset = this.hasAttribute('has-header-column')
          ? this.targets.table.rows[0].cells[0].offsetWidth
          : 0;

        this.targets.table.scrollTo({
          left: firstCell.offsetLeft - scrollOffset,
          behavior: 'smooth',
        });

        /**
         * Updates the front and back images.
         */
        if (this.blocks) {
          const front = this.blocks[index].front_image;
          const back = this.blocks[index].back_image;

          if (front && back) {
            this.showImagesNav();
          } else {
            this.hideImagesNav();
          }

          if (this.targets['front-image']) {
            this.targets['front-image'].replaceChildren(
              parseHTML(this.blocks[index].front_image ?? '').querySelector('img')
            );
          }

          if (this.targets['back-image']) {
            this.targets['back-image'].replaceChildren(
              parseHTML(this.blocks[index].back_image ?? '').querySelector('img')
            );
          }
        }

        this.activeBlockIndex = index;
      }

      /**
       * Hides the images nav element.
       */
      hideImagesNav() {
        if (this.targets['images-nav']) {
          this.targets['images-nav'].classList.add('is-hidden');
        }
      }

      /**
       * Shows the images nav element.
       */
      showImagesNav() {
        if (this.targets['images-nav']) {
          this.targets['images-nav'].classList.remove('is-hidden');
        }
      }

      /**
       * Handles the unit button click event.
       * @param {MouseEvent} event - The event payload.
       */
      handleUnitClick(event) {
        const multiplier = Number(event.currentTarget.dataset.multiplier);

        if (this.targets.value) {
          this.targets.value.all.forEach((element) => {
            element.textContent = Number(element.dataset.value) * multiplier;
          });
        }

        if (this.targets.unit) {
          this.targets.unit.all.forEach((element) => {
            if (event.currentTarget === element) {
              element.classList.add('is-active');
              return;
            }

            element.classList.remove('is-active');
          });
        }
      }

      /**
       * Sets the active image type.
       * @param {'front' | 'back'} type - The image type.
       */
      setActiveImage(type = 'front') {
        const frontClassListMethod = type === 'front' ? 'add' : 'remove';
        const backClassListMethod = type === 'back' ? 'add' : 'remove';

        if (this.targets['front-image']) {
          this.targets['front-image'].classList[frontClassListMethod]('is-active');

          if (this.targets['front-image-button']) {
            this.targets['front-image-button'].classList[frontClassListMethod]('is-active');
          }
        }

        if (this.targets['back-image']) {
          this.targets['back-image'].classList[backClassListMethod]('is-active');

          if (this.targets['back-image-button']) {
            this.targets['back-image-button'].classList[backClassListMethod]('is-active');
          }
        }
      }

      get events() {
        return {
          handlePreviousClick: (() => this.setActiveBlock((this.activeBlockIndex ?? 0) - 1)).bind(this),
          handleNextClick: (() => this.setActiveBlock((this.activeBlockIndex ?? 0) + 1)).bind(this),
          handleBlockButtonClick: ((event) => this.setActiveBlock(Number(event.currentTarget.dataset.blockIndex))).bind(
            this
          ),
          handleUnitClick: this.handleUnitClick.bind(this),
          handleFrontImageButton: (() => this.setActiveImage('front')).bind(this),
          handleBackImageButton: (() => this.setActiveImage('back')).bind(this),
        };
      }

      get blocks() {
        if (!this.targets['block-data']) {
          return null;
        }

        return Object.freeze(JSON.parse(this.targets['block-data'].innerHTML));
      }

      disconnectedCallback() {
        this.setNavigationEvents(true);
        this.setUnitEvents(true);
        this.setImageEvents(true);
      }
    }
  );
}
