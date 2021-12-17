/* global window, document, MessageChannel */
import browser from 'webextension-polyfill';

import optionsStorage from './options-storage.js';

import { makeConnect } from './connect.js';
import { assertAgoricId, makeRefreshPetdata } from './petdata.js';
import { checkPrivileged, makeRefreshPrivileged } from './privs.js';

const send = (o, ...opts) => {
  console.log('content', o);
  window.postMessage(o, '*', ...opts);
};
const refreshPetdata = makeRefreshPetdata({ send, document });
const refreshPrivileged = makeRefreshPrivileged({ send });
const connect = makeConnect({ document, window });

window.addEventListener('message', async ev => {
  const obj = ev.data;
  switch (obj.type) {
    case 'AGORIC_POWERBOX_CONNECT': {
      const { defaultUrl } = await optionsStorage.getAll();
      const { port1, port2 } = new MessageChannel();
      const url = new URL('/wallet-bridge.html', defaultUrl);
      connect({ port: port1, url: url.href });
      send({ type: 'AGORIC_POWERBOX_CONNECTING' }, [port2]);
      break;
    }
    case 'AGORIC_POWERBOX_EXPAND_PETDATA': {
      const { petdata = {}, powerboxUrls = [] } = await optionsStorage.getAll();
      const privileged = checkPrivileged({
        location: window.location,
        powerboxUrls,
      });
      refreshPetdata({ privileged, petdata }, true);
      refreshPrivileged({ privileged }, true);
      break;
    }
    case 'AGORIC_POWERBOX_SET_PETDATA': {
      const { petdata = {}, powerboxUrls = [] } = await optionsStorage.getAll();
      if (checkPrivileged({ location: window.location, powerboxUrls })) {
        const { id, petdata: rawPet } = obj;
        const pet = {};
        assertAgoricId(id);
        Object.entries(rawPet).forEach(([k, v]) => {
          assertAgoricId(k);
          if (typeof v === 'string' && v) {
            pet[k] = v;
          }
        });
        petdata[id] = pet;
        await optionsStorage.set({ petdata: { ...petdata } });
      }
      break;
    }
    default:
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
