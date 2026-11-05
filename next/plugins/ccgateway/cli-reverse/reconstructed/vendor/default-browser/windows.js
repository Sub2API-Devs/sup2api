/**
 * default-browser/windows.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: default-browser@5.5.1
 * pieces: chunk-j8hasev3.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { promisify } from "util";
import { execFile } from "child_process";

//@ chunk-j8hasev3.js:3149-3679 esm-layout
var WINDOWS_BROWSER_PROG_IDS = promisify(execFile);
var windowsBrowserProgIds = {
  AppXq0fevzme2pys62n3e0fbqa7peapykr8v: {
    name: "Edge",
    id: "com.microsoft.edge.old",
  },
  MSEdgeDHTML: {
    name: "Edge",
    id: "com.microsoft.edge",
  },
  MSEdgeHTM: {
    name: "Edge",
    id: "com.microsoft.edge",
  },
  "IE.HTTP": {
    name: "Internet Explorer",
    id: "com.microsoft.ie",
  },
  FirefoxURL: {
    name: "Firefox",
    id: "org.mozilla.firefox",
  },
  ChromeHTML: {
    name: "Chrome",
    id: "com.google.chrome",
  },
  BraveHTML: {
    name: "Brave",
    id: "com.brave.Browser",
  },
  BraveBHTML: {
    name: "Brave Beta",
    id: "com.brave.Browser.beta",
  },
  BraveSSHTM: {
    name: "Brave Nightly",
    id: "com.brave.Browser.nightly",
  },
};
//@ chunk-j8hasev3.js:3679-3702 esm-layout
class UnknownBrowserError extends Error {}
//@ chunk-j8hasev3.js:3702-4089 esm-fingerprint
async function getWindowsDefaultBrowser(_execFileAsync = WINDOWS_BROWSER_PROG_IDS) {
  let { stdout } = await _execFileAsync("reg", [
    "QUERY",
    " HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice",
    "/v",
    "ProgId",
  ]);
  let match = /ProgId\s*REG_SZ\s*(?<id>\S+)/.exec(stdout);
  if (!match)
    throw new UnknownBrowserError(`Cannot find Windows browser in stdout: ${JSON.stringify(stdout)}`);
  let { id: hyphenIndex } = match.groups;
  let id = windowsBrowserProgIds[hyphenIndex];
  if (!id) throw new UnknownBrowserError(`Unknown browser ID: ${hyphenIndex}`);
  return id;
}
export { getWindowsDefaultBrowser };
