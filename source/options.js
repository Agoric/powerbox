// Don't forget to import this wherever you use it
import browser from 'webextension-polyfill';

import optionsStorage from './options-storage.js';

const awu = document.getElementById('agoric-wallet-urls');
const newUrl = document.getElementById('new-wallet-url');

let walletUrls = [];
let defaultUrl;

const makeListItem = (url, isDefault) => {
  const li = document.createElement('li');
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'defaultWallet';
  input.value = url;
  if (isDefault) {
    input.checked = true;
  }
  input.addEventListener('click', e => {
    defaultUrl = url;
    optionsStorage.set({ defaultUrl });
  });
  li.appendChild(input);
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.textContent = url;
  li.appendChild(link);

  const button = document.createElement('button');
  button.textContent = 'X';
  button.addEventListener('click', async e => {
    e.preventDefault();
    e.stopPropagation();
    walletUrls = walletUrls.filter(w => w !== url);
    awu.removeChild(li);
    if (defaultUrl === url) {
      if (newUrl.nextElementSibling) {
        const nextInput = newUrl.nextElementSibling.querySelector('input');
        nextInput.checked = true;
        defaultUrl = nextInput.value;
      }
    }
    await optionsStorage.set({ walletUrls, defaultUrl });
  });
  li.appendChild(button);
  return li;
};

async function init() {
  ({walletUrls, defaultUrl} = await optionsStorage.getAll());
  walletUrls.forEach(url => {
    awu.appendChild(makeListItem(url, url === defaultUrl));
  });

  newUrl.querySelector('input').addEventListener('keydown', async e => {
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      const li = makeListItem(e.target.value, false);
      awu.insertBefore(li, newUrl.nextSibling);
      e.target.value = '';

      walletUrls = [e.target.value, ...walletUrls];
      await optionsStorage.set({walletUrls, defaultUrl});
    }
  });
}

init();
