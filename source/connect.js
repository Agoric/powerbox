/* global globalThis */
export const DEFAULT_CONNECTION_TIMEOUT_MS = 5000;

const makeQueuedSender = rawSend => {
  let sendQ = [];
  return {
    send: obj => {
      if (sendQ) {
        sendQ.push(obj);
        return;
      }
      rawSend(obj);
    },
    flush: () => {
      if (sendQ) {
        sendQ.forEach(obj => rawSend(obj));
        sendQ = null;
      }
    },
  };
};

const makeForcedInitSender = (rawSend, initPacket) => {
  let initSent = false;
  const qs = makeQueuedSender(rawSend);
  return {
    ...qs,
    send: obj => {
      if (obj && obj.type === initPacket.type) {
        // Ensure the init message is first and formatted correctly.
        obj = initPacket;
        initSent = true;
      }
      if (initSent) {
        qs.send(obj);
        return;
      }
      console.info(`${initPacket.type} not sent yet, dropping ${obj.type}`);
    },
  };
};

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
   * @param {string} opts.clientOrigin
   * @param {(...args: any[]) => void} opts.log
   * @param {number} opts.connectionTimeoutMs
   */
  return ({
    port,
    clientOrigin,
    url,
    log = (...args) => console.log(...args),
    connectionTimeoutMs = DEFAULT_CONNECTION_TIMEOUT_MS,
  } = {}) => {
    const disconnect = () => {
      port.postMessage({ type: 'AGORIC_POWERBOX_DISCONNECTED' });
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

    const toClient = makeQueuedSender(obj => port.postMessage(obj));
    const fromClient = makeForcedInitSender(
      obj => iframe.contentWindow.postMessage(obj, origin),
      { type: 'AGORIC_CLIENT_INIT', clientOrigin },
    );

    let openTimeout;
    const messageHandler = ev => {
      if (ev.source !== iframe.contentWindow) {
        return;
      }
      if (openTimeout) {
        clearTimeout(openTimeout);
        openTimeout = null;
        fromClient.flush();
        toClient.send({ type: 'AGORIC_POWERBOX_CONNECTED' });
      }
      toClient.send(ev.data);
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
    }, connectionTimeoutMs);

    port.addEventListener('message', ev => {
      toClient.flush();
      try {
        fromClient.send(ev.data);
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
