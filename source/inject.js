/* global globalThis */

export const makeInjectScript = ({ document = globalThis.document }) => {
  /**
   * Thanks to MetaMask for this snippet to inject a script for immediate
   * evaluation before any other page scripts.
   *
   * @param {string} contentUrl
   */
  return contentUrl => {
    const container = document.head || document.documentElement;
    const scriptTag = document.createElement('script');
    scriptTag.src = contentUrl;
    scriptTag.onload = () => scriptTag.remove();
    container.insertBefore(scriptTag, container.children[0]);
  };
};
