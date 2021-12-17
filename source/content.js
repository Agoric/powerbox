/* global window, document */
import browser from 'webextension-polyfill';

import optionsStorage from './options-storage.js';

import { assertAgoricId, makeRefreshPetdata } from './petdata.js';
import { checkPrivileged, makeRefreshPrivileged } from './privs.js';
import { makeRefreshUrl } from './url.js';

const send = o => window.postMessage(o);
const refreshUrl = makeRefreshUrl({ send });
const refreshPetdata = makeRefreshPetdata({ send, document });
const refreshPrivileged = makeRefreshPrivileged({ send });

window.addEventListener('message', async ev => {
  const obj = ev.data;
  switch (obj.type) {
    case 'AGORIC_POWERBOX_EXPAND_PETNAMES': {
      const { petdata = {}, powerboxUrls = [] } = await optionsStorage.getAll();
      const privileged = checkPrivileged({
        location: window.location,
        powerboxUrls,
      });
      refreshPetdata({ privileged, petdata }, true);
      refreshPrivileged({ privileged }, true);
      break;
    }
    case 'AGORIC_POWERBOX_GET_URL': {
      const { defaultUrl } = await optionsStorage.getAll();
      refreshUrl({ defaultUrl }, true);
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

// Initialize the petnames.
send({ type: 'AGORIC_POWERBOX_READY' });

browser.storage.onChanged.addListener(async changes => {
  const optionsChanged = !!changes[optionsStorage.storageName];
  if (!optionsChanged) {
    return;
  }

  // Refresh any dependent data.
  const {
    defaultUrl,
    petdata = {},
    powerboxUrls = [],
  } = await optionsStorage.getAll();

  const privileged = checkPrivileged({
    location: window.location,
    powerboxUrls,
  });
  refreshPrivileged({ privileged });
  refreshPetdata({ privileged, petdata });
  refreshUrl({ defaultUrl });
});
