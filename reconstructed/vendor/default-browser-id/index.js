/**
 * default-browser-id/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: default-browser-id@5.0.1
 * pieces: chunk-20ppca50.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { promisify } from "util";
import { execFile } from "child_process";
import { default as E } from "process";

//@ chunk-20ppca50.js:1739-1943 esm-layout
function defineLazyProperty(apps, key, getter) {
  let setValue = (value) =>
    Object.defineProperty(apps, key, {
      value,
      enumerable: true,
      writable: true,
    });
  Object.defineProperty(apps, key, {
    configurable: true,
    enumerable: true,
    get() {
      let value = getter();
      setValue(value);
      return value;
    },
    set(newValue) {
      setValue(newValue);
    },
  });
  return apps;
}
//@ chunk-20ppca50.js:2141-2154 esm-layout
var execFileAsync = promisify(execFile);
//@ chunk-20ppca50.js:2154-2469 esm-fingerprint
async function defaultBrowserId() {
  if (E.platform !== "darwin") throw Error("macOS only");
  let { stdout } = await execFileAsync("defaults", [
    "read",
    "com.apple.LaunchServices/com.apple.launchservices.secure",
    "LSHandlers",
  ]);
  return (
    /LSHandlerRoleAll = "(?!-)(?<id>[^"]+?)";\s+?LSHandlerURLScheme = (?:http|https);/.exec(stdout)?.groups
      .id ?? "com.apple.Safari"
  );
}
export { defaultBrowserId, defineLazyProperty };
