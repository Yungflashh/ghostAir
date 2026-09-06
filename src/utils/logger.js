/* eslint-disable no-console */
const stamp = () => new Date().toISOString();

module.exports = {
  info: (...args) => console.log(`[${stamp()}] [INFO ]`, ...args),
  warn: (...args) => console.warn(`[${stamp()}] [WARN ]`, ...args),
  error: (...args) => console.error(`[${stamp()}] [ERROR]`, ...args),
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${stamp()}] [DEBUG]`, ...args);
    }
  },
};
