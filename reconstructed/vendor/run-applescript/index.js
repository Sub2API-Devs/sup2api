/**
 * run-applescript/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: run-applescript@7.1.0
 * pieces: chunk-20ppca50.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
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

//@ chunk-20ppca50.js:2588-2602 esm-layout
var se = promisify_4(execFile_3);
//@ chunk-20ppca50.js:2602-2818 esm-fingerprint
async function W(e, { humanReadableOutput: r = !0, signal: o } = {}) {
  if (te.platform !== "darwin") throw Error("macOS only");
  let n = r ? [] : ["-ss"],
    t = {};
  if (o) t.signal = o;
  let { stdout: stdout } = await se("osascript", ["-e", e, n], t);
  return stdout.trim();
}

export { W };
