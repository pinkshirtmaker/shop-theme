import { publish, subscribe } from '~/event-bus';
import { capitalize, debounce, getTargets, throttle } from '~/helpers';

document.addEventListener('DOMContentLoaded', () => {
  /**
   * Keyboard events.
   */
  document.addEventListener('keyup', (event) => {
    if (event.key === 'Escape') {
      publish('key:escape');
    }
  });
});

/**
 * Provides useful functions for select elements.
 */
customElements.define(
  'select-provider',
  class SelectProvider extends HTMLElement {
    connectedCallback() {
      const selector = this.querySelector('select');

      if (!selector) {
        console.error('The `select-provider` element must contain a select element.');
        return;
      }

      if (this.dataset.default) {
        /**
         * Sets the default selected value.
         * - Useful for if you don't have access to the `option` elements in Liquid.
         */
        for (let i = 0, count = selector.options.length; i < count; i++) {
          const option = selector.options[i];

          if (this.dataset.default === option.value || this.dataset.default === option.innerHTML) {
            selector.selectedIndex = i;
          }
        }
      }
    }
  }
);

/**
 * General custom element helpers, such as target selectors.
 */
export class HTMLCustomElement extends HTMLElement {
  constructor() {
    super();
    this.resetTargets();
  }

  /**
   * Returns elements related to the custom element.
   * @returns {ReturnType<typeof import('./helpers').getTargets>}
   */
  get targets() {
    return this.cachedTargets ?? {};
  }

  /**
   * Queries the targets again.
   */
  resetTargets() {
    this.cachedTargets = getTargets(this);
  }
}

/**
 * Applies section specific helpers.
 * - Extend this custom element to hook into theme editor events.
 */
export class HTMLShopifySectionElement extends HTMLCustomElement {
  /**
   * Returns the Shopify section container.
   * @returns {HTMLElement}
   */
  get container() {
    return this.closest('.shopify-section');
  }

  /**
   * The Shopify theme editor event names.
   * @returns {String[]}
   */
  get eventNames() {
    return [
      'shopify:section:select',
      'shopify:section:deselect',
      'shopify:section:reorder',
      'shopify:block:select',
      'shopify:block:deselect',
    ];
  }

  /**
   * Maps the event names into an array of event objects, with their handlers.
   * @returns {{
   *   name: String
   *   handler: Function
   * }[]}
   */
  get events() {
    return this.eventNames.reduce((handlers, name) => {
      const methodName = this.convertEventToMethodName(name);
      const handler = this[methodName];

      if (typeof handler === 'function') {
        handlers.push({
          name,
          handler: (event) => handler.call(this, event),
        });
      }

      return handlers;
    }, []);
  }

  /**
   * Applies the theme editor event listeners.
   */
  setThemeEditorEventListeners() {
    if (!this.container) {
      return;
    }

    this.events.forEach(({ name, handler }) => {
      this.container.addEventListener(name, handler);
    });
  }

  /**
   * Removes the theme editor event listeners.
   */
  removeThemeEditorEventListeners() {
    if (!this.container) {
      return;
    }

    this.events.forEach(({ name, handler }) => {
      this.container.removeEventListener(name, handler);
    });
  }

  /**
   * Converts a theme editor event name into it's corresponding method.
   * @param {String} eventName - The original event name.
   * @returns {String}
   */
  convertEventToMethodName(eventName) {
    return `on${eventName.split(':').slice(1).map(capitalize).join('')}`;
  }

  /**
   * Called each time the element is added to the document.
   */
  connectedCallback() {
    this.setThemeEditorEventListeners();

    if (typeof this.extendedConnectedCallback === 'function') {
      this.extendedConnectedCallback();
    }
  }

  /**
   * Called each time the element is removed from the document.
   */
  disconnectedCallback() {
    this.removeThemeEditorEventListeners();

    if (typeof this.extendedDisconnectedCallback === 'function') {
      this.extendedDisconnectedCallback();
    }
  }
}

/**
 * A backdrop element for drawers and modals.
 */
customElements.define(
  'window-overlay',
  class WindowOverlay extends HTMLElement {
    connectedCallback() {
      this.unsubscribe = subscribe('window-overlay', ({ show = true, transitionend } = {}) => {
        if (transitionend) {
          this.addEventListener('transitionend', transitionend, { once: true });
        }

        if (show) {
          this.show();
          return;
        }

        this.hide();
      });

      this.addEventListener('click', this.handleClick);
    }

    /**
     * Shows the overlay.
     */
    show() {
      if (this.classList.contains('is-active')) {
        return;
      }

      this.classList.add('is-active');
      document.body.classList.add('overflow-hidden');
    }

    /**
     * Hides the overlay.
     */
    hide() {
      if (!this.classList.contains('is-active')) {
        return;
      }

      this.classList.remove('is-active');
      document.body.classList.remove('overflow-hidden');
    }

    /**
     * Handles the click event.
     */
    handleClick() {
      this.hide();

      publish('toggle-element');
      publish('window-overlay-closed');
    }

    disconnectedCallback() {
      this.unsubscribe();
      this.removeEventListener('click', this.handleClick);
    }
  }
);

/**
 * Returns the names of cart-related sections.
 * @returns {String[]}
 */
export function getCartSectionNames() {
  return [
    'header',
    document.querySelector('cart-drawer cart-section').getAttribute('section-name'),
    ...(theme.page_type === 'cart' ? ['main-cart'] : []),
  ];
}

/**
 * Breakpoints.
 */
export const breakpoints = {
  small: 576,
  medium: 768,
  large: 1024,
  xlarge: 1328,
};

/**
 * Custom video wrapper for handling mobile and desktop video sources.
 * - Use the `data-desktop` attribute on each `source` element.
 * - Lazy load the video (so the original doesn't load by default) by using `data-src` instead of `src`.
 */
if (!customElements.get('responsive-video')) {
  customElements.define(
    'responsive-video',
    class ResponsiveVideo extends HTMLElement {
      connectedCallback() {
        this.video = this.querySelector('video');

        if (!this.video) {
          return;
        }

        this.handlers = {
          resize: debounce(this.setDefaultState.bind(this)),
        };

        this.setDefaultState();

        window.addEventListener('resize', this.handlers.resize);
      }

      /**
       * Sets the default video source state.
       */
      setDefaultState() {
        [...this.video.children].forEach((element) => {
          if (element.tagName === 'SOURCE') {
            this.setSourceDefaultState(element);
          }
        });
      }

      /**
       * Sets the default video state based on viewport.
       * @param {HTMLSourceElement} element - The video source element.
       */
      setSourceDefaultState(element) {
        const reset = () => {
          if (element.hasAttribute('data-src')) {
            this.setSourceSrc(element, element.dataset.src);
          }
        };

        if (!element.hasAttribute('data-desktop')) {
          /**
           * Loads the default video, if lazy loaded.
           */
          reset();
          return;
        }

        if (window.matchMedia(`(min-width: ${breakpoints.large}px)`).matches) {
          if (!element.hasAttribute('data-src')) {
            element.dataset.src = element.src;
          }

          this.setSourceSrc(element, element.dataset.desktop);
          return;
        }

        reset();
      }

      /**
       * Sets a `source` element's `src` value.
       * @param {HTMLSourceElement} element - The video source element.
       * @param {String} src - The updated source.
       */
      setSourceSrc(element, src) {
        if (element.getAttribute('src') === src) {
          return;
        }

        element.src = src;

        /**
         * Reload the video with the new source.
         */
        this.video.load();

        if (this.video.autoplay) {
          this.video.play();
        }
      }

      disconnectedCallback() {
        window.removeEventListener('resize', this.handlers.resize);
      }
    }
  );
}

/**
 * Detect overflow.
 */
if (!customElements.get('detect-overflow')) {
  customElements.define(
    'detect-overflow',
    class DetectOverflow extends HTMLCustomElement {
      connectedCallback() {
        this.element = this.targets['scroll-container'] ?? this;

        this.handlers = {
          resize: debounce(() =>
            this.classList.toggle('is-overflowing', this.element.scrollWidth > this.element.clientWidth)
          ),
          scroll: throttle(() => {
            this.classList.toggle(
              'is-at-end',
              this.element.scrollWidth - this.element.clientWidth === this.element.scrollLeft
            );

            this.classList.toggle('is-at-start', this.element.scrollLeft === 0);
          }),
        };

        this.element.addEventListener('scroll', this.handlers.scroll);
        window.addEventListener('resize', this.handlers.resize);

        /**
         * Set default state.
         */
        this.handlers.resize();
      }

      disconnectedCallback() {
        window.removeEventListener('resize', this.handlers.resize);
        this.element.removeEventListener('scroll', this.handlers.scroll);
      }
    }
  );
}

/**
 * Toggles the truncated content based on if it's overflowing.
 */
customElements.define(
  'truncate-content',
  class TruncateContent extends HTMLCustomElement {
    connectedCallback() {
      this.setEventListeners();
      this.setOverflowState();
    }
    /**
     * Sets the event listeners.
     */
    setEventListeners() {
      this.resizeObserver = new ResizeObserver(
        debounce(() => {
          this.setOverflowState();
        })
      );

      this.resizeObserver.observe(this.targets.content);

      if (this.targets.button) {
        this.targets.button.addEventListener('click', () => {
          this.classList.toggle('is-active');

          requestAnimationFrame(() => {
            this.setOverflowState();
          });
        });
      }
    }

    /**
     * Sets the overflow state.
     */
    setOverflowState() {
      const { scrollHeight, clientHeight } = this.targets.content;

      if (this.classList.contains('is-active')) {
        return;
      }

      if (scrollHeight > clientHeight) {
        this.classList.add('is-overflowing');
        return;
      }

      this.classList.remove('is-overflowing');
    }
  }
);

if (!customElements.get('scroll-to-top')) {
  customElements.define(
    'scroll-to-top',
    class ScrollToTop extends HTMLCustomElement {
      connectedCallback() {
        this.handlers = {
          scroll: throttle(this.handleScroll.bind(this), 100),
          buttonClick: this.handleClick.bind(this),
        };

        document.addEventListener('scroll', this.handlers.scroll);

        if (this.targets.button) {
          this.targets.button.addEventListener('click', this.handlers.buttonClick);
        }
      }

      /**
       * Handles the window scroll.
       */
      handleScroll() {
        if (window.scrollY >= 250) {
          this.classList.add('is-active');
          return;
        }

        this.classList.remove('is-active');
      }

      /**
       * Handles the click event.
       */
      handleClick() {
        document.body.scrollIntoView({
          behavior: 'smooth',
        });
      }

      disconnectedCallback() {
        document.removeEventListener('scroll', this.handlers.scroll);

        if (this.targets.button) {
          this.targets.button.removeEventListener('click', this.handlers.buttonClick);
        }
      }
    }
  );
}

customElements.define(
  'custom-cursor',
  class CustomCursor extends HTMLCustomElement {
    connectedCallback() {
      this.handlers = {
        mousemove: this.handleMouseMove.bind(this),
        mouseenter: this.handleMouseEnter.bind(this),
        mouseleave: this.handleMouseLeave.bind(this),
      };

      this.handleMouseLeave();

      this.parentElement.addEventListener('mousemove', this.handlers.mousemove);
      this.parentElement.addEventListener('mouseenter', this.handlers.mouseenter);
      this.parentElement.addEventListener('mouseleave', this.handlers.mouseleave);
      this.parentElement.addEventListener('focusout', this.handlers.mouseleave);

      /**
       * Hides the default cursor.
       */
      this.parentElement.style.cursor = 'none';
    }

    /**
     * Handles the `mousemove` event.
     * @param {MouseEvent} event - The event payload.
     */
    handleMouseMove(event) {
      const { left, top } = this.parentElement.getBoundingClientRect();
      const x = event.clientX - left;
      const y = event.clientY - top;

      this.style.left = `${x}px`;
      this.style.top = `${y}px`;
      this.style.transform = 'translate(-50%, -50%)';
    }

    /**
     * Handles the containr `mouseenter` event.
     * - Shows the cursor.
     */
    handleMouseEnter() {
      this.style.visibility = 'visible';
    }

    /**
     * Handles the containr `mouseleave` event.
     * - Hides the cursor.
     */
    handleMouseLeave() {
      this.style.visibility = 'hidden';
    }

    disconnectedCallback() {
      this.parentElement.removeEventListener('mousemove', this.handlers.mousemove);
      this.parentElement.removeEventListener('mouseenter', this.handlers.mouseenter);
      this.parentElement.removeEventListener('mouseleave', this.handlers.mouseleave);
      this.parentElement.removeEventListener('blur', this.handlers.mouseleave);
    }
  }
);

customElements.define(
  'disclosure-state',
  class DisclosureState extends HTMLCustomElement {
    connectedCallback() {
      this.handlers = {
        resize: debounce(this.setDefaultState.bind(this)),
        disclosure: {
          toggle: this.handleDisclosureToggle.bind(this),
        },
      };

      this.setDefaultState();
      this.setResizeListener();
      this.setToggleEvents();
    }

    /**
     * Sets the toggle event listeners.
     * @param {Boolean} remove - Removes the toggle event listeners.
     */
    setToggleEvents(remove = false) {
      [...this.querySelectorAll('details')].forEach((element) => {
        if (remove) {
          element.removeEventListener('toggle', this.handlers.disclosure.toggle);
          return;
        }

        element.addEventListener('toggle', this.handlers.disclosure.toggle);
      });
    }

    /**
     * Handles the disclosure toggle event.
     * @param {ToggleEvent} event - The disclosure toggle event.
     */
    handleDisclosureToggle(event) {
      if (this.hasAttribute('single-open') && event.newState === 'open') {
        if (this.getAttribute('single-open') === 'mobile' && this.isDesktop()) {
          return;
        }

        [...this.querySelectorAll('details')].forEach((element) => {
          if (element === event.target) {
            return;
          }

          element.open = false;
        });
      }
    }

    /**
     * Sets the window resize event listener.
     * @param {Boolean} remove - Removes the event listener.
     */
    setResizeListener(remove = false) {
      if (remove) {
        window.removeEventListener('resize', this.handlers.resize);
        return;
      }

      window.addEventListener('resize', this.handlers.resize);
    }

    /**
     * Sets the default open state.
     */
    setDefaultState() {
      const defaultState = this.getAttribute('default-state') ?? 'closed';
      const defaultDesktopState = this.getAttribute('default-desktop-state') ?? 'closed';

      if (this.isDesktop()) {
        [...this.querySelectorAll('details')].forEach((element) => {
          element.open = defaultDesktopState === 'open';
        });

        return;
      }

      [...this.querySelectorAll('details')].forEach((element) => {
        element.open = defaultState === 'open';
      });
    }

    /**
     * Returns if the current resolution is desktop.
     * @returns {Boolean}
     */
    isDesktop() {
      return window.matchMedia(`(min-width: ${breakpoints.large}px)`).matches;
    }

    disconnectedCallback() {
      this.setResizeListener(true);
      this.setToggleEvents(true);
    }
  }
);
