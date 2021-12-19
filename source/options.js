/* global document */
/* eslint-disable import/no-extraneous-dependencies */
import optionsStorage from './options-storage.js';
import debounce from './debounce.js';
import '@material/mwc-radio';
import '@material/mwc-textfield';
import '@material/mwc-button';
import '@material/mwc-icon-button';

const awu = document.querySelector('#agoric-powerbox-urls');
const newUrl = document.querySelector('#new-powerbox-url');

let powerboxUrls = [];
let defaultUrl;

const makeListItem = (url, isDefault) => {
  const li = document.createElement('li');

  const div = document.createElement('div');
  const radio = document.createElement('mwc-radio');
  radio.name = 'defaultPowerbox';
  radio.value = url;
  if (isDefault) {
    radio.checked = true;
  }
  radio.addEventListener('click', _e => {
    defaultUrl = url;
    optionsStorage.set({ defaultUrl });
  });
  div.append(radio);

  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.textContent = url;
  div.append(link);
  li.append(div);

  const button = document.createElement('mwc-icon-button');
  button.icon = 'close';
  button.addEventListener('click', async e => {
    e.preventDefault();
    e.stopPropagation();
    powerboxUrls = powerboxUrls.filter(w => w !== url);
    li.remove();
    if (defaultUrl === url && newUrl.nextElementSibling) {
      const nextInput = newUrl.nextElementSibling.querySelector('input');
      nextInput.checked = true;
      defaultUrl = nextInput.value;
    }

    await optionsStorage.set({ powerboxUrls, defaultUrl });
  });
  li.append(button);

  return li;
};

async function init() {
  ({ powerboxUrls, defaultUrl } = await optionsStorage.getAll());
  for (const url of powerboxUrls) {
    awu.append(makeListItem(url, url === defaultUrl));
  }

  const textfield = newUrl.querySelector('mwc-textfield');
  const save = () => optionsStorage.set({ powerboxUrls, defaultUrl });

  const addUrl = value => {
    if (!value) return;

    const li = makeListItem(value, false);
    awu.prepend(li);

    powerboxUrls = [value, ...powerboxUrls];
    textfield.value = '';

    debounce(save, 1000);
  };

  textfield.addEventListener('keydown', async e => {
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      addUrl(e.target.value.trim());
    }
  });

  newUrl.querySelector('mwc-button').addEventListener('click', async e => {
    e.preventDefault();
    addUrl(textfield.value.trim());
  });
}

init();
