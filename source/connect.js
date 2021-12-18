/* global globalThis */
export const DEFAULT_CONNECTION_TIMEOUT = 5000;

export const makeConnect = ({
  document = globalThis.document,
  window = globalThis.window,
  setTimeout = globalThis.setTimeout,
  clearTimeout = globalThis.clearTimeout,
} = {}) => {
  /**
   * @param {Object} opts
   * @param {MessagePort} opts.port
   * @param {string} opts.url
   * @param {(...args: any[]) => void} opts.log
   * @param {number} opts.connectionTimeout
   */
  return ({
    port,
    url,
    log = (...args) => console.log(...args),
    connectionTimeout = DEFAULT_CONNECTION_TIMEOUT,
  } = {}) => {
    const disconnect = () => {
      port.postMessage({ type: 'AGORIC_POWERBOX_DISCONNECT' });
      port.close();
    };

    const shadow = document.createElement('div');
    shadow.style.display = 'none';
    const shadowRoot = shadow.attachShadow({ mode: 'closed' });

    const origin = new URL(url).origin;

    // Make an iframe.
    const iframe = document.createElement('iframe');
    iframe.src = url;
    shadowRoot.appendChild(iframe);
    document.body.appendChild(shadow);

    let openTimeout;
    const messageHandler = ev => {
      if (ev.source !== iframe.contentWindow) {
        return;
      }
      if (openTimeout) {
        clearTimeout(openTimeout);
        openTimeout = null;
        port.postMessage({ type: 'AGORIC_POWERBOX_CONNECTED' });
      }
      port.postMessage(ev.data);
    };

    window.addEventListener('message', messageHandler);

    const errorHandler = err => {
      log('Got error', err);
      window.removeEventListener('message', messageHandler);
      port.postMessage({ type: 'AGORIC_POWERBOX_ERROR', error: `${err}` });
      document.body.removeChild(shadow);
      disconnect();
    };

    openTimeout = setTimeout(() => {
      openTimeout = null;
      log('Connection timeout');
      errorHandler(new Error('Connection timeout'));
    }, connectionTimeout);

    port.addEventListener('message', ev => {
      try {
        iframe.contentWindow.postMessage(ev.data, origin);
      } catch (err) {
        errorHandler(err);
      }
    });

    port.addEventListener('messageerror', ev => {
      errorHandler(new Error(ev.error));
    });
    port.start();

    return disconnect;
  };
};
