/* global globalThis, window */
const DEFAULT_PET_IMAGE =
  'https://agoric.com/wp-content/themes/agoric_2021_theme/assets/android-icon-192x192.png';
const UNKNOWN_PET_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/d/d9/Icon-round-Question_mark.svg';

const DEFAULT_TEXT_STYLE_WIDTH = '8em';
const DEFAULT_TEXT_STYLE_HEIGHT = '1.5em';

export const assertPowerboxId = id => {
  if (typeof id !== 'string' || !id.match(/^[a-z0-9]/i)) {
    throw new Error(`Invalid Powerbox id ${id}`);
  }
  return true;
};

export const makeExpandPetdata = ({
  document = globalThis.document,
  textStyleWidth = DEFAULT_TEXT_STYLE_WIDTH,
  textStyleHeight = DEFAULT_TEXT_STYLE_HEIGHT,
} = {}) => {
  /** @type {WeakMap<HTMLElement, { shadow: ShadowRoot, hidden?: HTMLElement }>} */
  const elementToData = new WeakMap();

  return ({ petdata }) => {
    const selector = '[data-powerbox-id]';
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

        const { powerboxTarget = 'text', powerboxId = '???' } = el.dataset;
        const { petname: rawPetname, petimage: rawPetimage } =
          petdata[powerboxId] || {};
        let petimage = rawPetimage;
        if (!petimage && rawPetname) {
          petimage = DEFAULT_PET_IMAGE;
        }
        const petname = rawPetname || `Unknown.${powerboxId}`;

        let n = hidden;
        switch (powerboxTarget) {
          case 'img-if-known':
          case 'img': {
            if (powerboxTarget === 'img-if-known' && !petimage) {
              n = '';
            } else if (!petimage) {
              petimage = UNKNOWN_PET_IMAGE;
            }
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
              // Using 100% ensures our image size cannot be sniffed via box sizing.
              n.style.width = '100%';
              n.style.height = '100%';
              n.style.objectFit = 'contain';
              break;
            }
            // Fall through to text mode.
          }
          case 'text-if-known':
          default: {
            if (powerboxTarget === 'text-if-known' && !rawPetname) {
              n = '';
            } else if (
              !hidden ||
              !hidden.tagName ||
              hidden.tagName.toLowerCase() !== 'span'
            ) {
              n = document.createElement('span');
            } else if (
              petname !== hidden.title ||
              petname !== hidden.textContent
            ) {
              n = hidden;
            } else {
              // Nothing needs to change.
              return;
            }
            n.title = petname;
            n.textContent = petname;

            // These properties ensure we always use the same (determined only
            // by the host) size to prevent the untrusted dapp from sniffing
            // text via box sizing.
            n.style.display = 'inline-block';
            n.style.whiteSpace = 'nowrap';
            n.style.overflow = 'hidden';
            n.style.textOverflow = 'ellipsis';
            n.style.width = textStyleWidth;
            n.style.height = textStyleHeight;
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
};

export const makeRefreshPetdata = ({
  document = globalThis.document,
  expandPetdata = makeExpandPetdata({ document }),
  send = obj => window.postMessage(obj, '*'),
} = {}) => {
  let isSubscribed = false;
  return ({ privileged = false, petdata = {} }, subscribe = false) => {
    if (subscribe) {
      isSubscribed = true;
    }
    if (!isSubscribed) {
      return;
    }
    expandPetdata({ petdata });
    if (privileged) {
      send({ type: 'POWERBOX_PETDATA', petdata });
    }
  };
};
