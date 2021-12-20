/* global globalThis */
import { makePowerboxKit } from './powerbox.js';

const { powerbox, init } = makePowerboxKit({ window: globalThis.window });
globalThis.powerbox = powerbox;
init();
