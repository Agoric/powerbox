/* global document */
import optionsStorage from './options-storage.js';
import debounce from './debounce.js';

const awu = document.querySelector('#agoric-powerbox-urls');
const newUrl = document.querySelector('#new-powerbox-url');

let powerboxUrls = [];
let defaultUrl;

const makeListItem = (url, isDefault) => {
  const li = document.createElement('li');
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'defaultPowerbox';
  input.value = url;
  if (isDefault) {
    input.checked = true;
  }

  input.addEventListener('click', _e => {
    defaultUrl = url;
    optionsStorage.set({ defaultUrl });
  });
  li.append(input);
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.textContent = url;
  li.append(link);

  const button = document.createElement('button');
  button.textContent = 'X';
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

  const save = () => optionsStorage.set({ powerboxUrls, defaultUrl });

  newUrl.querySelector('input').addEventListener('keydown', async e => {
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      const li = makeListItem(e.target.value, false);
      awu.insertBefore(li, newUrl.nextSibling);

      powerboxUrls = [e.target.value, ...powerboxUrls];
      e.target.value = '';

      debounce(save, 1000);
    }
  });
}

init();
