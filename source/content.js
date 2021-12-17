import browser from 'webextension-polyfill';

import optionsStorage from './options-storage.js';

const DEFAULT_PET_IMAGE = 'https://agoric.com/wp-content/themes/agoric_2021_theme/assets/android-icon-192x192.png';
const UNKNOWN_PET_IMAGE = 'https://upload.wikimedia.org/wikipedia/commons/2/25/Icon-round-Question_mark.jpg';

const accessCheck = (walletUrls, myOrigin) => {
  for (const url of walletUrls) {
    try {
      const allowedOrigin = new URL(url).origin;
      if (allowedOrigin === myOrigin) {
        return true;
      }
    } catch (e) {
      console.error(`Invalid wallet URL: ${url}`);
    }
  }
  return false;
}

/** @type {WeakMap<HTMLElement, { shadow: ShadowRoot, hidden?: HTMLElement }>} */
const elementToData = new WeakMap();

window.addEventListener('message', async ev => {
  const obj = ev.data;
  const send = obj => window.postMessage(obj);
  switch (obj.type) {
    case 'AGORIC_POWERBOX_READY':
    case 'AGORIC_POWERBOX_EXPAND_PETNAMES': {
      const { petdata = {} } = await optionsStorage.getAll();
      const { selector = '[data-agoric-id]' } = obj;
      /** @type {NodeListOf<HTMLElement>} */
      const els = document.querySelectorAll(selector);
      [...els].forEach(el => {
        try {
          if (!elementToData.has(el)) {
            elementToData.set(el, { shadow: el.attachShadow({ mode: 'closed' }) });
          }
          const { shadow, hidden } = elementToData.get(el);

          const { agoricTarget = 'text', agoricId = '???' } = el.dataset;
          let { petname, petimage } = petdata[agoricId] || {};
          if (!petimage && petname) {
            petimage = DEFAULT_PET_IMAGE;
          }
          if (!petimage) {
            petimage = UNKNOWN_PET_IMAGE;
          }
          if (!petname) {
            petname = `Unknown.${agoricId}`
          }

          let n = hidden;
          switch (agoricTarget) {
            case 'img': {
              if (petimage) {
                if (!hidden || !hidden.tagName || hidden.tagName.toLowerCase() !== 'img') {
                  // Our existing tag is not an img.
                  n = document.createElement('img');
                } else if (petimage !== hidden.src || petname !== hidden.alt) {
                  // Use the existing tag, and mutate it.
                  n = hidden;
                } else {
                  // Nothing needs to change.
                  return;
                }
                n.src = petimage;
                if (petname) {
                  n.alt = petname;
                }
                n.style.width = '100%';
                n.style.height = '100%';
                n.style.objectFit = 'contain';
                break;
              }
              // Fall through to text mode.
            }
            default: {
              if (!hidden) {
                n = petname;
              } else if (petname !== hidden) {
                n = petname;
              } else {
                // Nothing needs to change.
                return;
              }
              break;
            }
          }
          if (n !== hidden) {
            // Replace the existing hidden node with our new node.
            elementToData.set(el, { shadow, hidden: n });
            shadow.replaceChildren(n);
          }
        } catch (e) {
          console.error(e);
        }
      });
      break;
    }
    case 'AGORIC_POWERBOX_GET_URL': {
      const { defaultUrl } = await optionsStorage.getAll();
      send({ type: 'AGORIC_POWERBOX_URL', url: defaultUrl });
      break;
    }
    case 'AGORIC_POWERBOX_SET_PETDATA': {
      const { petdata = {}, walletUrls = []} = await optionsStorage.getAll();
      const myOrigin = new URL(window.location.href).origin;
      if (accessCheck(walletUrls, myOrigin)) {
        const { id, petdata: pet } = obj;
        petdata[id] = pet;
        await optionsStorage.set({ petdata: { ...petdata }});
      }
      break;
    }
  }
});

let lastIsPrivileged = null;
const updatePetData = async () => {
  const { petdata = {}, walletUrls = []} = await optionsStorage.getAll();
  if (accessCheck(walletUrls, new URL(window.location.href).origin)) {
    if (!lastIsPrivileged) {
      lastIsPrivileged = true;
      window.postMessage({ type: 'AGORIC_POWERBOX_PAGE_IS_PRIVILEGED', isPrivileged: true });
    }
    window.postMessage({ type: 'AGORIC_POWERBOX_PETDATA', petdata });
  } else if (lastIsPrivileged === null || lastIsPrivileged) {
    lastIsPrivileged = false;
    window.postMessage({ type: 'AGORIC_POWERBOX_PAGE_IS_PRIVILEGED', isPrivileged: false });
  }
}

// Initialize the petnames.
window.postMessage({ type: 'AGORIC_POWERBOX_READY' });
updatePetData();

browser.storage.onChanged.addListener(async changes => {
  const optionsChanged = !!changes[optionsStorage.storageName];
  if (!optionsChanged) {
    return;
  }

  // Try updating the petnames immediately.
  window.postMessage({ type: 'AGORIC_POWERBOX_EXPAND_PETNAMES' });
  await updatePetData();
});
