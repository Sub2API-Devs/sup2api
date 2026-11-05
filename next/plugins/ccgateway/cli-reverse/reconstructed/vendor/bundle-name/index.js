/**
 * bundle-name/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: bundle-name@4.1.1
 * pieces: chunk-j8hasev3.js (1)
 * attribution: esm-fingerprint 1
 */
import { runAppleScript } from "../run-applescript/index.js";

//@ chunk-j8hasev3.js:2818-3073 esm-fingerprint
async function bundleName(bundleId) {
  return runAppleScript(`tell application "Finder" to set app_path to application file id "${bundleId}" as string
tell application "System Events" to get value of property list item "CFBundleName" of property list file (app_path & ":Contents:Info.plist")`);
}
export { bundleName };
