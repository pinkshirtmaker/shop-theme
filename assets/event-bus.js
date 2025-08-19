/**
 * Subscribes a callback to an event.
 *
 * @param {String} eventName - The event name.
 * @param {Function} callback - Runs when the event is published.
 * @returns {Function}
 */
export function subscribe(eventName, callback) {
  const handler = (event) => callback(event.detail ?? undefined);

  document.addEventListener(eventName, handler);

  /**
   * Unsubscribes the handler from the event.
   */
  return function unsubscribe() {
    document.removeEventListener(eventName, handler);
  };
}

/**
 * Publishes an event, which triggers any subscribed callbacks.
 *
 * @param {String} eventName - The event name.
 * @param {any} detail - The event payload.
 */
export function publish(eventName, detail) {
  document.dispatchEvent(new CustomEvent(eventName, { detail }));
}
