/**
 * default-browser/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: default-browser@5.5.1
 * pieces: chunk-20ppca50.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { promisify } from "util";
import { execFile } from "child_process";
import { default as E } from "process";
import { defaultBrowserId } from "../default-browser-id/index.js";
import { bundleName } from "../bundle-name/index.js";
import { getWindowsDefaultBrowser } from "./windows.js";

//@ chunk-20ppca50.js:4089-4176 esm-layout
var execFileAsync_3 = promisify(execFile);
var titleize = (string) => string.toLowerCase().replaceAll(/(?:^|\s|-)\S/g, (x) => x.toUpperCase());
//@ chunk-20ppca50.js:4176-4541 esm-fingerprint
async function defaultBrowser() {
  if (E.platform === "darwin") {
    let id = await defaultBrowserId();
    return {
      name: await bundleName(id),
      id,
    };
  }
  if (E.platform === "linux") {
    let { stdout } = await execFileAsync_3("xdg-mime", ["query", "default", "x-scheme-handler/http"]);
    let id = stdout.trim();
    return {
      name: titleize(id.replace(/.desktop$/, "").replace("-", " ")),
      id,
    };
  }
  if (E.platform === "win32") return getWindowsDefaultBrowser();
  throw Error("Only macOS, Linux, and Windows are supported");
}
export { defaultBrowser };
