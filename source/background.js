import browser from 'webextension-polyfill';

import optionsStorage from './options-storage.js';

console.log('background is running');

const handler = (req, sender, sendResponse) => {
  console.log('background got request', req);
  sendResponse({
    response: 'background got request',
  });
};

browser.runtime.onMessage.addListener(handler);
