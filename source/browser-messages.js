/* global MessageChannel */
import { assertPowerboxId } from './petdata.js';
import { checkPrivileged } from './privs.js';

export const makeBrowserMessageHandler = ({
  connect,
  location,
  refreshPetdata,
  refreshPrivileged,
  getOptions,
  setOptions,
  send,
}) => {
  return async obj => {
    switch (obj.type) {
      case 'POWERBOX_INIT': {
        // Tell our caller we're ready.
        send({ type: 'POWERBOX_READY' });
        break;
      }
      case 'POWERBOX_CONNECT': {
        const { connectId } = obj;
        const { defaultUrl } = await getOptions();
        const { port1, port2 } = new MessageChannel();
        const disconnect = connect({
          port: port1,
          clientOrigin: location.origin,
          url: defaultUrl,
          connectId,
        });
        if (disconnect) {
          port2.addEventListener('message', ev => {
            if (ev.data && ev.data.type === 'POWERBOX_CLIENT_DISCONNECTED') {
              disconnect();
            }
          });
        }

        send({ type: 'POWERBOX_CONNECTING', connectId }, [port2]);
        break;
      }
      case 'POWERBOX_EXPAND_PETDATA': {
        const { petdata = {}, powerboxUrls = [] } = await getOptions();
        const privileged = checkPrivileged({
          location,
          powerboxUrls,
        });
        refreshPetdata({ privileged, petdata }, true);
        refreshPrivileged({ privileged }, true);
        break;
      }
      case 'POWERBOX_SET_PETDATA': {
        const { petdata = {}, powerboxUrls = [] } = await getOptions();
        if (checkPrivileged({ location, powerboxUrls })) {
          const { id, petdata: rawPet } = obj;
          const pet = {};
          assertPowerboxId(id);
          Object.entries(rawPet).forEach(([k, v]) => {
            assertPowerboxId(k);
            if (typeof v === 'string' && v) {
              pet[k] = v;
            }
          });
          petdata[id] = pet;
          await setOptions({ petdata: { ...petdata } });
        }
        break;
      }
      default:
    }
  };
};
