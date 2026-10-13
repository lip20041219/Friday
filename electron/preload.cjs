/**
 * J.A.R.V.I.S. — preload bridge.
 *
 * Runs in an isolated world with Node access. Exposes a tiny, audited
 * surface on `window.friday` so the renderer (sandboxed) can ask the main
 * process to show/hide the window, toggle widget mode, and report wake-word
 * events. No raw ipcRenderer reaches the page.
 */
const { contextBridge, ipcRenderer } = require("electron");

const ALLOWED_OUT = new Set([
  "friday:wake",
  "friday:show",
  "friday:hide",
  "friday:toggle-visibility",
  "friday:set-widget-mode",
  "friday:request-mode",
]);

contextBridge.exposeInMainWorld("friday", {
  // Renderer → main (fire-and-forget signal, no return).
  send: (channel, payload) => {
    if (!ALLOWED_OUT.has(channel)) return;
    ipcRenderer.send(channel, payload);
  },
  // Renderer → main with a reply (used for current mode lookup).
  invoke: (channel, payload) => {
    if (channel !== "friday:request-mode") return Promise.resolve(null);
    return ipcRenderer.invoke(channel, payload);
  },
  // Main → renderer subscription.
  on: (channel, cb) => {
    const valid = new Set(["friday:mode-changed", "friday:visibility-changed", "friday:trigger-wake"]);
    if (!valid.has(channel)) return () => {};
    const wrapped = (_evt, ...args) => cb(...args);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.removeListener(channel, wrapped);
  },
});
