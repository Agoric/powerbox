const debounceMap = new Map();

export default (fn, delay) => {
  const timeout = debounceMap.get(fn);
  if (timeout) {
    clearTimeout(timeout);
  }
  debounceMap.set(fn, setTimeout(() => {
    debounceMap.delete(fn);
    fn();
  }, delay));
};
