/* global setTimeout, clearTimeout */
export const DEFAULT_DEBOUNCE_DELAY_MS = 1000;

const debounceMap = new Map();

export default (fn, delay = DEFAULT_DEBOUNCE_DELAY_MS) => {
  const timeout = debounceMap.get(fn);
  if (timeout) {
    clearTimeout(timeout);
  }
  debounceMap.set(
    fn,
    setTimeout(() => {
      debounceMap.delete(fn);
      fn();
    }, delay),
  );
};
