/* global globalThis, window */
const DEFAULT_PET_IMAGE =
  'https://agoric.com/wp-content/themes/agoric_2021_theme/assets/android-icon-192x192.png';
const UNKNOWN_PET_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/d/d9/Icon-round-Question_mark.svg';

export const assertAgoricId = id => {
  if (typeof id !== 'string' || !id.match(/^[a-z0-9]/i)) {
    throw new Error(`Invalid Agoric id ${id}`);
  }
  return true;
};

export const makeExpandPetdata = ({ document = globalThis.document }) => {
  /** @type {WeakMap<HTMLElement, { shadow: ShadowRoot, hidden?: HTMLElement }>} */
  const elementToData = new WeakMap();

  return ({ petdata }) => {
    const selector = '[data-agoric-id]';
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
};

export const makeRefreshPetdata = ({
  document = globalThis.document,
  expandPetdata = makeExpandPetdata({ document }),
  send = obj => window.postMessage(obj, '*'),
}) => {
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
      send({ type: 'AGORIC_POWERBOX_PETDATA', petdata });
    }
  };
};
