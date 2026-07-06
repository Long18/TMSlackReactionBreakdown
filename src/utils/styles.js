/**
 * @param {string} css
 */
export function addStyle(css) {
  // eslint-disable-next-line no-undef
  if (typeof GM_addStyle === 'function') {
    // eslint-disable-next-line no-undef
    GM_addStyle(css);
    return;
  }
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}
