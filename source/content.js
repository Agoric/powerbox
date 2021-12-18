/* global window, document */
/* eslint-disable import/no-extraneous-dependencies */
import browser from 'webextension-polyfill';

import optionsStorage from './options-storage.js';

import { makeConnect } from './connect.js';
import { makeRefreshPetdata } from './petdata.js';
import { checkPrivileged, makeRefreshPrivileged } from './privs.js';
import { createAgoricPowerboxInBrowser } from './powerbox.js';
import { makeInjectScript } from './inject.js';
import { makeBrowserMessageHandler } from './browser-messages.js';

const injectScript = makeInjectScript({ document });
const send = (o, ...opts) => window.postMessage(o, '*', ...opts);
const refreshPetdata = makeRefreshPetdata({ send, document });
const refreshPrivileged = makeRefreshPrivileged({ send });
const connect = makeConnect({ document, window });

// If the injection throws, refuse to listen to messages.
try {
  injectScript(
    `globalThis.agoricPowerbox = (${createAgoricPowerboxInBrowser})(window);`,
  );
} catch (e) {
  console.error('Failed to inject agoricPowerbox:', e);
  throw e;
}

const browserMessageHandler = makeBrowserMessageHandler({
  connect,
  location: window.location,
  refreshPetdata,
  refreshPrivileged,
  getOptions: () => optionsStorage.getAll(),
  setOptions: options => optionsStorage.set(options),
  send,
});
window.addEventListener('message', ev => {
  if (ev.source === window) {
    browserMessageHandler(ev.data);
  }
});

browser.storage.onChanged.addListener(async changes => {
  const optionsChanged = !!changes[optionsStorage.storageName];
  if (!optionsChanged) {
    return;
  }

  // Refresh any dependent data.
  const { petdata = {}, powerboxUrls = [] } = await optionsStorage.getAll();

  const privileged = checkPrivileged({
    location: window.location,
    powerboxUrls,
  });
  refreshPrivileged({ privileged });
  refreshPetdata({ privileged, petdata });
});

// Tell our caller we're ready.
send({ type: 'AGORIC_POWERBOX_READY' });
