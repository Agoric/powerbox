/**
 * Create a object that speaks to this Powerbox Extension.
 *
 * NOTE: You may be tempted to break up this function, but it is designed to be
 * evaluated as a string.  Therefore, it must not directly reach for any
 * functions or globals which aren't available in a standard JavaScript
 * environment.
 *
 * @param {Window} window the browser window
 * @returns {void}
 */
export const createPowerboxInBrowser = ({ window }) => {
  const { apply } = Reflect;
  const { postMessage } = window;
  const PromiseConstructor = Promise;
  const { freeze } = Object;
  const connectIdToConnection = new Map();

  const noop = () => {};
  const uncurryThis = fn => (thisArg, ...args) => apply(fn, thisArg, args);

  const promiseResolve = uncurryThis(PromiseConstructor.resolve);

  const dispatchCache = {};
  const dispatchPetdata = ({
    petdata = dispatchCache.petdata,
    onPetdata = dispatchCache.onPetdata,
  }) => {
    dispatchCache.petdata = petdata;
    dispatchCache.onPetdata = onPetdata;
    if (petdata === undefined || onPetdata === undefined) {
      return;
    }
    promiseResolve(PromiseConstructor, petdata)
      .then(onPetdata)
      .catch(noop);
  };

  const dispatchPrivileged = ({
    isPrivileged = dispatchCache.isPrivileged,
    onPrivileged = dispatchCache.onPrivileged,
    resolvePrivileged = dispatchCache.resolvePrivileged,
  }) => {
    dispatchCache.isPrivileged = isPrivileged;
    dispatchCache.onPrivileged = onPrivileged;
    dispatchCache.resolvePrivileged = resolvePrivileged;
    if (isPrivileged === undefined) {
      return;
    }
    const p = promiseResolve(PromiseConstructor, isPrivileged);
    if (onPrivileged !== undefined) {
      p.then(onPrivileged).catch(noop);
    }
    if (resolvePrivileged !== undefined) {
      p.then(resolvePrivileged).catch(noop);
    }
  };

  let resolvePowerboxReady;
  const powerboxReadyP = new PromiseConstructor(resolve => {
    resolvePowerboxReady = resolve;
  });
  window.addEventListener('message', ev => {
    if (ev.source !== window) {
      return;
    }
    const obj = ev.data;
    switch (obj.type) {
      case 'POWERBOX_PAGE_IS_PRIVILEGED': {
        const { isPrivileged } = obj;
        dispatchPrivileged({ isPrivileged });
        break;
      }
      case 'POWERBOX_CONNECTING': {
        const { connectId } = obj;
        const { resolve, dispatch } = connectIdToConnection.get(connectId);
        connectIdToConnection.delete(connectId);
        const port = ev.ports[0];
        port.addEventListener('message', e => {
          promiseResolve(PromiseConstructor, e.data)
            .then(dispatch)
            .catch(noop);
        });
        port.start();
        port.postMessage({ type: 'POWERBOX_CLIENT_INIT' });
        resolve(port);
        break;
      }
      case 'POWERBOX_PETDATA': {
        const { petdata } = obj;
        dispatchPetdata({ petdata });
        break;
      }
      case 'POWERBOX_READY': {
        resolvePowerboxReady();
        break;
      }
      default:
    }
  });

  let lastConnectId = 0;
  const powerbox = freeze({
    connect: dispatch => {
      lastConnectId += 1;
      const connectId = lastConnectId;
      const portP = new PromiseConstructor((resolve, reject) => {
        connectIdToConnection.set(connectId, { dispatch, resolve, reject });
      });
      // Don't actually try to connect until the powerbox is ready.
      powerboxReadyP.then(() =>
        postMessage({ type: 'POWERBOX_CONNECT', connectId }),
      );
      return freeze({
        send: freeze(async o => {
          const port = await portP;
          port.postMessage(o);
        }),
        disconnect: freeze(async () => {
          const port = await portP;
          port.postMessage({
            type: 'POWERBOX_CLIENT_DISCONNECTED',
          });
          port.close();
        }),
      });
    },
    expandPetdata: onPetdata => {
      powerboxReadyP.then(() => {
        postMessage({ type: 'POWERBOX_EXPAND_PETDATA' });
        dispatchPetdata({ onPetdata });
      });
    },
    setPetdata: (id, petdata) => {
      powerboxReadyP.then(() => {
        postMessage({ type: 'POWERBOX_SET_PETDATA', id, petdata });
      });
    },
    isPrivileged: onPrivileged => {
      return new PromiseConstructor(resolvePrivileged => {
        dispatchPrivileged({ onPrivileged, resolvePrivileged });
      });
    },
    isReady: () => {
      return powerboxReadyP;
    },
  });

  return powerbox;
};
