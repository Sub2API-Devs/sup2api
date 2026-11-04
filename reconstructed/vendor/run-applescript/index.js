/**
 * run-applescript/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: run-applescript@7.1.0
 * pieces: chunk-20ppca50.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { promisify } from "util";
import { execFile } from "child_process";
import { default as E } from "process";

//@ chunk-20ppca50.js:2588-2602 esm-layout
var execFileAsync_3 = promisify(execFile);
//@ chunk-20ppca50.js:2602-2818 esm-fingerprint
async function runAppleScript(script, { humanReadableOutput = true, signal } = {}) {
  if (E.platform !== "darwin") throw Error("macOS only");
  let outputArguments = humanReadableOutput ? [] : ["-ss"];
  let execOptions = {};
  if (signal) execOptions.signal = signal;
  let { stdout } = await execFileAsync_3("osascript", ["-e", script, outputArguments], execOptions);
  return stdout.trim();
}
export { runAppleScript };
