/* global MessageChannel */
import { assertAgoricId } from './petdata.js';
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
      case 'AGORIC_POWERBOX_CONNECT': {
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
            if (ev.data && ev.data.type === 'AGORIC_CLIENT_DISCONNECTED') {
              disconnect();
            }
          });
        }

        send({ type: 'AGORIC_POWERBOX_CONNECTING', connectId }, [port2]);
        break;
      }
      case 'AGORIC_POWERBOX_EXPAND_PETDATA': {
        const { petdata = {}, powerboxUrls = [] } = await getOptions();
        const privileged = checkPrivileged({
          location,
          powerboxUrls,
        });
        refreshPetdata({ privileged, petdata }, true);
        refreshPrivileged({ privileged }, true);
        break;
      }
      case 'AGORIC_POWERBOX_SET_PETDATA': {
        const { petdata = {}, powerboxUrls = [] } = await getOptions();
        if (checkPrivileged({ location, powerboxUrls })) {
          const { id, petdata: rawPet } = obj;
          const pet = {};
          assertAgoricId(id);
          Object.entries(rawPet).forEach(([k, v]) => {
            assertAgoricId(k);
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
