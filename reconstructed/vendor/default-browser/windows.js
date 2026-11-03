/**
 * default-browser/windows.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: default-browser@5.5.1
 * pieces: chunk-20ppca50.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import {
  promisify,
  promisify as promisify_2,
  promisify as promisify_3,
  promisify as promisify_4,
  promisify as promisify_5,
} from "util";
import {
  execFile,
  execFile as execFile_2,
  execFile as execFile_3,
  execFile as execFile_4,
} from "child_process";

//@ chunk-20ppca50.js:3149-3679 esm-layout
var WINDOWS_BROWSER_PROG_IDS = promisify_5(execFile_4),
  fe = {
    AppXq0fevzme2pys62n3e0fbqa7peapykr8v: { name: "Edge", id: "com.microsoft.edge.old" },
    MSEdgeDHTML: { name: "Edge", id: "com.microsoft.edge" },
    MSEdgeHTM: { name: "Edge", id: "com.microsoft.edge" },
    "IE.HTTP": { name: "Internet Explorer", id: "com.microsoft.ie" },
    FirefoxURL: { name: "Firefox", id: "org.mozilla.firefox" },
    ChromeHTML: { name: "Chrome", id: "com.google.chrome" },
    BraveHTML: { name: "Brave", id: "com.brave.Browser" },
    BraveBHTML: { name: "Brave Beta", id: "com.brave.Browser.beta" },
    BraveSSHTM: { name: "Brave Nightly", id: "com.brave.Browser.nightly" },
  };
//@ chunk-20ppca50.js:3679-3702 esm-layout
class UnknownBrowserError extends Error {}
//@ chunk-20ppca50.js:3702-4089 esm-fingerprint
async function getWindowsDefaultBrowser(e = WINDOWS_BROWSER_PROG_IDS) {
  let { stdout: stdout } = await e("reg", [
      "QUERY",
      " HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice",
      "/v",
      "ProgId",
    ]),
    match = /ProgId\s*REG_SZ\s*(?<id>\S+)/.exec(stdout);
  if (!match)
    throw new UnknownBrowserError(`Cannot find Windows browser in stdout: ${JSON.stringify(stdout)}`);
  let { id: id } = match.groups,
    t = fe[id];
  if (!t) throw new UnknownBrowserError(`Unknown browser ID: ${id}`);
  return t;
}

export { getWindowsDefaultBrowser };
