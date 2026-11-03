/**
 * default-browser-id/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: default-browser-id@5.0.1
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
import N, { default as I, default as T, default as E, default as ee, default as te } from "process";

//@ chunk-20ppca50.js:1739-1943 esm-layout
function m(e, r, o) {
  let n = (t) => Object.defineProperty(e, r, { value: t, enumerable: !0, writable: !0 });
  return (
    Object.defineProperty(e, r, {
      configurable: !0,
      enumerable: !0,
      get() {
        let t = o();
        return (n(t), t);
      },
      set(t) {
        n(t);
      },
    }),
    e
  );
}
//@ chunk-20ppca50.js:2141-2154 esm-layout
var oe = promisify_3(execFile_2);
//@ chunk-20ppca50.js:2154-2469 esm-fingerprint
async function S() {
  if (ee.platform !== "darwin") throw Error("macOS only");
  let { stdout: stdout } = await oe("defaults", [
    "read",
    "com.apple.LaunchServices/com.apple.launchservices.secure",
    "LSHandlers",
  ]);
  return (
    /LSHandlerRoleAll = "(?!-)(?<id>[^"]+?)";\s+?LSHandlerURLScheme = (?:http|https);/.exec(stdout)?.groups
      .id ?? "com.apple.Safari"
  );
}

export { S, m };
