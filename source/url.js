/* global window */
export const makeRefreshUrl = ({
  send = obj => window.postMessage(obj, '*'),
}) => {
  let isSubscribed = false;
  return ({ defaultUrl }, subscribe = false) => {
    if (subscribe) {
      isSubscribed = true;
    }
    if (!isSubscribed) {
      return;
    }
    send({ type: 'AGORIC_POWERBOX_URL', url: defaultUrl });
  };
};
