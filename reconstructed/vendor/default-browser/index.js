/**
 * default-browser/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: default-browser@5.5.1
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
import { S } from "../default-browser-id/index.js";
import { P } from "../bundle-name/index.js";
import { getWindowsDefaultBrowser } from "./windows.js";

//@ chunk-20ppca50.js:4089-4176 esm-layout
var ue = promisify_2(execFile),
  de = (e) => e.toLowerCase().replaceAll(/(?:^|\s|-)\S/g, (r) => r.toUpperCase());
//@ chunk-20ppca50.js:4176-4541 esm-fingerprint
async function B() {
  if (E.platform === "darwin") {
    let e = await S();
    return { name: await P(e), id: e };
  }
  if (E.platform === "linux") {
    let { stdout: stdout } = await ue("xdg-mime", ["query", "default", "x-scheme-handler/http"]),
      trimmed = stdout.trim();
    return { name: de(trimmed.replace(/.desktop$/, "").replace("-", " ")), id: trimmed };
  }
  if (E.platform === "win32") return getWindowsDefaultBrowser();
  throw Error("Only macOS, Linux, and Windows are supported");
}

export { B };
