/**
 * run-applescript/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: run-applescript@7.1.0
 * pieces: chunk-j8hasev3.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { promisify } from "util";
import { execFile } from "child_process";
import { default as E } from "process";

//@ chunk-j8hasev3.js:2588-2602 esm-layout
var execFileAsync_3 = promisify(execFile);
//@ chunk-j8hasev3.js:2602-2818 esm-fingerprint
async function runAppleScript(script, { humanReadableOutput = true, signal } = {}) {
  if (E.platform !== "darwin") throw Error("macOS only");
  let outputArguments = humanReadableOutput ? [] : ["-ss"];
  let execOptions = {};
  if (signal) execOptions.signal = signal;
  let { stdout } = await execFileAsync_3("osascript", ["-e", script, outputArguments], execOptions);
  return stdout.trim();
}
export { runAppleScript };
