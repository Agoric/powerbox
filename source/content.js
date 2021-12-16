/* global window, document */
import optionsStorage from './options-storage.js';

const DEFAULT_ICON =
	'https://agoric.com/wp-content/themes/agoric_2021_theme/assets/android-icon-192x192.png';

/** @type {WeakMap<HTMLElement, { shadow: ShadowRoot, hidden?: HTMLElement }>} */
const elementToData = new WeakMap();

window.addEventListener('message', async ev => {
	const object = ev.data;
	const send = object_ => window.postMessage(object_);
	switch (object.type) {
		case 'AGORIC_POWERBOX_READY':
		case 'AGORIC_POWERBOX_EXPAND_PETNAMES': {
			const { petdata = {} } = await optionsStorage.getAll();
			const { selector = '[data-agoric-id]' } = object;
			/** @type {NodeListOf<HTMLElement>} */
			const els = document.querySelectorAll(selector);
			els.forEach(element => {
				try {
					if (!elementToData.has(element)) {
						elementToData.set(element, {
							shadow: element.attachShadow({ mode: 'closed' }),
						});
					}

					const { shadow, hidden } = elementToData.get(element);

					const {
						agoricTarget,
						agoricType = 'unknown',
						agoricId = '???',
					} = element.dataset;
					const properAgoricType =
						agoricType[0].toUpperCase() + agoricType.slice(1);
					const {
						petname = `${properAgoricType}.${agoricId}`,
						petimage = DEFAULT_ICON,
					} = petdata[agoricId] || {};

					let n = hidden;
					switch (agoricTarget) {
						case 'img': {
							if (!hidden || hidden.tagName.toLowerCase() !== 'img') {
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
							n.alt = petname;
							n.style.width = '100%';
							n.style.height = '100%';
							n.style.objectFit = 'contain';
							break;
						}

						case 'text': {
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

						default: {
							// Do nothing
							return;
						}
					}

					if (n !== hidden) {
						// Replace the existing hidden node with our new node.
						elementToData.set(element, { shadow, hidden: n });
						shadow.replaceChildren(n);
					}
				} catch (error) {
					console.error(error);
				}
			});

			break;
		}

		case 'AGORIC_POWERBOX_GET_URL': {
			const { defaultUrl } = await optionsStorage.getAll();
			send({ type: 'AGORIC_POWERBOX_URL', url: defaultUrl });
			break;
		}

		default: {
			// Do nothing
		}
	}
});

// Initialize the petnames.
window.postMessage({ type: 'AGORIC_POWERBOX_READY' });
