/* global window, document */
import browser from 'webextension-polyfill';

import optionsStorage from './options-storage.js';

const DEFAULT_PET_IMAGE =
  'https://agoric.com/wp-content/themes/agoric_2021_theme/assets/android-icon-192x192.png';
const UNKNOWN_PET_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/d/d9/Icon-round-Question_mark.svg';

const accessCheck = walletUrls => {
  const href = window.location.href;
  const origin = window.location.origin;
  for (const url of walletUrls) {
    try {
      if (href === url) {
        // Exact match.
        return true;
      }
      const allowedOrigin = new URL(url).origin;
      if (allowedOrigin !== 'file://' && allowedOrigin === origin) {
        return true;
      }
    } catch (e) {
      console.error(`Invalid wallet URL: ${url}`);
    }
  }
  return false;
};

/** @type {WeakMap<HTMLElement, { shadow: ShadowRoot, hidden?: HTMLElement }>} */
const elementToData = new WeakMap();

const send = o => window.postMessage(o);
window.addEventListener('message', async ev => {
  const obj = ev.data;
  switch (obj.type) {
    case 'AGORIC_POWERBOX_EXPAND_PETNAMES': {
      // eslint-disable-next-line no-use-before-define
      await refreshPetnames(true);
      break;
    }
    case 'AGORIC_POWERBOX_GET_URL': {
      // eslint-disable-next-line no-use-before-define
      await refreshUrl(true);
      break;
    }
    case 'AGORIC_POWERBOX_SET_PETDATA': {
      const { petdata = {}, walletUrls = [] } = await optionsStorage.getAll();
      if (accessCheck(walletUrls)) {
        const { id, petdata: pet } = obj;
        petdata[id] = pet;
        await optionsStorage.set({ petdata: { ...petdata } });
      }
      break;
    }
    default:
  }
});

const expandPetnames = async () => {
  const selector = '[data-agoric-id]';
  const { petdata = {} } = await optionsStorage.getAll();
  /** @type {NodeListOf<HTMLElement>} */
  const els = document.querySelectorAll(selector);
  [...els].forEach(el => {
    try {
      if (!elementToData.has(el)) {
        elementToData.set(el, {
          shadow: el.attachShadow({ mode: 'closed' }),
        });
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
        petname = `Unknown.${agoricId}`;
      }

      let n = hidden;
      switch (agoricTarget) {
        case 'img': {
          if (petimage) {
            if (
              !hidden ||
              !hidden.tagName ||
              hidden.tagName.toLowerCase() !== 'img'
            ) {
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
};

let keepExpandingPetnames = false;
let lastIsPrivileged = null;
const refreshPetnames = async force => {
  const { petdata = {}, walletUrls = [] } = await optionsStorage.getAll();
  if (force) {
    keepExpandingPetnames = true;
  }
  if (keepExpandingPetnames) {
    await expandPetnames();
  }
  if (accessCheck(walletUrls)) {
    if (!lastIsPrivileged) {
      lastIsPrivileged = true;
      window.postMessage({
        type: 'AGORIC_POWERBOX_PAGE_IS_PRIVILEGED',
        isPrivileged: true,
      });
    }
    window.postMessage({ type: 'AGORIC_POWERBOX_PETDATA', petdata });
  } else if (lastIsPrivileged === null || lastIsPrivileged) {
    lastIsPrivileged = false;
    window.postMessage({
      type: 'AGORIC_POWERBOX_PAGE_IS_PRIVILEGED',
      isPrivileged: false,
    });
  }
};

// Initialize the petnames.
window.postMessage({ type: 'AGORIC_POWERBOX_READY' });

let keepRefreshingUrl = false;
const refreshUrl = async force => {
  if (force) {
    keepRefreshingUrl = true;
  }
  if (!keepRefreshingUrl) {
    return;
  }
  const { defaultUrl } = await optionsStorage.getAll();
  send({ type: 'AGORIC_POWERBOX_URL', url: defaultUrl });
};

browser.storage.onChanged.addListener(async changes => {
  const optionsChanged = !!changes[optionsStorage.storageName];
  if (!optionsChanged) {
    return;
  }

  // Try updating the petnames immediately.
  await refreshPetnames();
  await refreshUrl();
});
