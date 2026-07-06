/**
 * @param {() => void} callback
 */
export function onDomReady(callback) {
  const readyStates = ['interactive', 'complete'];
  if (readyStates.includes(document.readyState)) {
    callback();
    return;
  }
  document.addEventListener('DOMContentLoaded', callback, { once: true });
}
