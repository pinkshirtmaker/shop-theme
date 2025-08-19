/**
 * Replaces an element with it's updated version.
 * @param {HTMLElement} element - The current element.
 * @param {HTMLElement} updatedElement - The updated element.
 * @param {String[]} properties - An array of element properties to update, i.e. `element.value`, instead of replacing.
 */
export function replaceElement(element, updatedElement, properties) {
  if (!element) {
    return;
  }

  if (!updatedElement) {
    element.remove();
    return;
  }

  if (element.isEqualNode(updatedElement)) {
    return;
  }

  if (properties && properties.length) {
    properties.forEach((property) => {
      element[property] = updatedElement[property];
    });

    return;
  }

  element.replaceWith(updatedElement);
}

/**
 * Capitalizes the string.
 * @param {String} string - The source string to format.
 * @returns {String}
 */
export function capitalize(string) {
  return `${string.charAt(0).toUpperCase()}${string.slice(1)}`;
}

/**
 * Returns elements related to the parent element.
 *
 * @param {HTMLElement} element - The parent custom element.
 * @returns {Record<string, HTMLElement & { all: HTMLElement[] }>}
 * @example <div data-target="example-element.item"></div>
 */
export function getTargets(element) {
  if (!element) {
    return null;
  }

  const tagName = element.tagName.toLowerCase();

  return [...element.querySelectorAll(`[data-target^="${tagName}"]`)].reduce((targets, target) => {
    const key = target.dataset.target.replace(`${tagName}.`, '');

    if (!targets[key]) {
      targets[key] = target;

      /**
       * Define the `all` property, for multiple targets of the same name.
       */
      targets[key].all = [target];
    } else {
      targets[key].all.push(target);
    }

    return targets;
  }, {});
}

/**
 * Returns parsed HTML from a string.
 * @param {String} text - The text to parse.
 * @param {String} selector - Optional child selector.
 * @returns {Document|HTMLElement}
 */
export function parseHTML(text, selector) {
  const parsed = new DOMParser().parseFromString(text, 'text/html');

  if (selector) {
    return parsed.querySelector(selector);
  }

  return parsed;
}

/**
 * Debounces the run of a function.
 * @param {Function} callback - The function to debounce.
 * @param {Number} wait - The time to wait between running.
 * @returns {Function}
 */
export function debounce(callback, wait = 100) {
  let timeout;

  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback.apply(this, args), wait);
  };
}

/**
 * Returns a function, that, as long as it continues to be invoked,
 * will not be triggered. The function will be called after it stops
 * being called for N milliseconds. If `immediate` is passed, trigger
 * the function on the leading edge, instead of the trailing.
 *
 * @param {Function} callback - The function to execute when timer is passed.
 * @param {Number} wait - The amount of time before debounce call is triggered.
 * @param {Boolean} immediate - Trigger the immediately.
 */
export function throttle(callback, wait, immediate = false) {
  let timeout = null;
  let initialCall = true;

  return function (...args) {
    const callNow = immediate && initialCall;
    function next() {
      callback.apply(this, args);
      timeout = null;
    }

    if (callNow) {
      initialCall = false;
      next();
    }

    if (!timeout) {
      timeout = window.setTimeout(next, wait);
    }
  };
}

/**
 * Localises the path to the root url.
 * @param {String} path - The path to localise.
 * @returns
 */
export function localiseUrl(path) {
  const rootUrl = theme.routes.root_url.replace(/\/+$/, '');
  const sanitizedPath = path.replace(/^\/+/, '');

  return `${rootUrl}/${sanitizedPath}`;
}

/**
 * Preloads a given image.
 * @param {HTMLImageElement} image - The image path to preload.
 */
export function preloadImage(image) {
  new Image().src = image.src;
  image.dataset.loaded = true;
  image.loading = 'eager';
}

/**
 * Clamps the input to not exceed the boundaries.
 * @param {Number} input - The number input.
 * @returns {Number}
 */
export function clamp(input, min, max) {
  return Math.min(Math.max(input, min), max);
}
