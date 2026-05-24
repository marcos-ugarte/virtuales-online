/* Polyfills for Android 9 / Chrome 72 */
if (typeof globalThis === "undefined") {
  window.globalThis = window;
}
