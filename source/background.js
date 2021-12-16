import browser from 'webextension-polyfill';

console.log('background is running');

const handler = (request, sender, sendResponse) => {
	console.log('background got request', request);
	sendResponse({
		response: 'background got request',
	});
};

browser.runtime.onMessage.addListener(handler);
