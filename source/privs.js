/* global window */

export const makeRefreshPrivileged = ({
  send = obj => window.postMessage(obj, '*'),
}) => {
  let lastIsPrivileged = null;
  return ({ privileged = false }) => {
    if (privileged) {
      if (!lastIsPrivileged) {
        lastIsPrivileged = true;
        send({
          type: 'AGORIC_POWERBOX_PAGE_IS_PRIVILEGED',
          isPrivileged: true,
        });
      }
    } else if (lastIsPrivileged === null || lastIsPrivileged) {
      lastIsPrivileged = false;
      send({
        type: 'AGORIC_POWERBOX_PAGE_IS_PRIVILEGED',
        isPrivileged: false,
      });
    }
  };
};

export const checkPrivileged = ({
  location = window.location,
  walletUrls = [],
}) => {
  const href = location.href;
  const origin = location.origin;
  for (const allowedUrl of walletUrls) {
    try {
      if (href === allowedUrl) {
        // Exact match.
        return true;
      }
      // Only allow origin matches if it's not a file (which needs explicit
      // urls).
      const allowedOrigin = new URL(allowedUrl).origin;
      if (allowedOrigin !== 'file://' && allowedOrigin === origin) {
        return true;
      }
    } catch (e) {
      console.error(`Invalid wallet URL: ${allowedUrl}`);
    }
  }
  return false;
};
