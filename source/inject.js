/* global globalThis */

export const makeInjectScript = ({ document = globalThis.document }) => {
  /**
   * Thanks to MetaMask for this snippet to inject a script for immediate
   * evaluation before any other page scripts.
   *
   * @param {string} content
   */
  return content => {
    const container = document.head || document.documentElement;
    const scriptTag = document.createElement('script');
    scriptTag.setAttribute('async', false);
    scriptTag.textContent = content;
    container.insertBefore(scriptTag, container.children[0]);
    container.removeChild(scriptTag);
  };
};
