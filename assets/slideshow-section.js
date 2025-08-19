import { preloadImage } from '~/helpers';
import { HTMLCustomElement } from '~/theme';

customElements.define(
  'slideshow-section',
  class SlideshowSection extends HTMLCustomElement {
    constructor() {
      super();

      this.observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          this.intersected = true;

          if (this.targets['main-slider'].swiper) {
            this.preloadImages(this.targets['main-slider'].swiper);
          }
        }
      });

      this.observer.observe(this);

      this.targets['main-slider'].addEventListener('swiperbeforeslidechangestart', ({ detail: [swiper] }) => {
        this.preloadImages(swiper);
      });

      this.targets['main-slider'].addEventListener('swiperafterinit', ({ detail: [swiper] }) => {
        this.resetSlides(swiper);

        this.targets['main-slider'].addEventListener('swiperslidechangetransitionend', ({ detail: [swiper] }) => {
          this.targets['header-slider'].swiper.slideTo(swiper.realIndex);
          this.targets['content-slider'].swiper.slideTo(swiper.realIndex);

          /**
           * Set the pagination state.
           */
          if (swiper.realIndex >= 1) {
            this.targets['pagination-current'].textContent = swiper.realIndex;
          }

          this.classList.toggle('at-start', swiper.realIndex === 0);
        });
      });

      this.targets['main-slider'].addEventListener('swiperresize', ({ detail: [swiper] }) => {
        this.resetSlides(swiper);
      });

      this.targets['previous'].addEventListener('click', () => {
        this.targets['main-slider'].swiper.slidePrev();
      });

      this.targets['next'].addEventListener('click', () => {
        this.targets['main-slider'].swiper.slideNext();
      });
    }

    /**
     * Resets the slides on the given Swiper instance.
     * @param {Object} swiper - A Swiper instance.
     */
    resetSlides(swiper) {
      swiper.slideNext(0, false);
      swiper.slidePrev(0, false);
    }

    /**
     * Preloads the slider images.
     * @param {Object} swiper - The Swiper instance.
     * @param {Number} swiper.activeIndex - The active slide index.
     * @param {Array} swiper.slides - The slider slides.
     */
    preloadImages({ activeIndex, slides }) {
      const range = 2;

      for (let offset = -range; offset <= range; offset++) {
        const index = (activeIndex + offset + slides.length) % slides.length;
        const slide = slides[index];
        const image = slide.querySelector('img');

        if (image && !image.dataset.loaded) {
          preloadImage(image);
        }
      }
    }

    disconnectedCallback() {
      this.observer.disconnect();
    }
  }
);
