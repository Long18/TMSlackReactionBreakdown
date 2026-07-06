/** @returns {Window} */
export function getUnsafeWindow() {
  // Tampermonkey injects `unsafeWindow` when @grant unsafeWindow is set.
  // eslint-disable-next-line no-undef
  return typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
}
