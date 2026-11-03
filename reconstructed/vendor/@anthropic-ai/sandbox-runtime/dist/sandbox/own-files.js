/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/own-files.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: esm-fingerprint 1
 */
import {
  fileURLToPath,
  fileURLToPath as fileURLToPath_2,
  fileURLToPath as fileURLToPath_3,
  fileURLToPath as fileURLToPath_4,
} from "url";
import * as pathModule from "path";
import * as pathModule_2 from "path";
import * as pathModule_3 from "path";
import * as pathModule_4 from "path";
import * as pathModule_5 from "path";
import * as fsModule from "fs";
import * as fsModule_2 from "fs";
import * as fsModule_3 from "fs";
import * as fsModule_4 from "fs";
import * as fsModule_5 from "fs";
import * as fsModule_6 from "fs";
import * as fsModule_7 from "fs";
import { Dqt, sS, oS } from "./sandbox-utils.js";

//@ chunk-fq0cr76a.js:817514-817926 esm-fingerprint
function mx(e, n = fileURLToPath_4(import.meta.url)) {
  let dir = pathModule_4.dirname(n);
  while (!fsModule_7.existsSync(pathModule_4.join(dir, "package.json"))) {
    if (dir === pathModule_4.dirname(dir)) return;
    dir = pathModule_4.dirname(dir);
  }
  if (!dir.split(pathModule_4.sep).includes("node_modules")) return;
  let flattened = e.flatMap((y) => Dqt(sS(y)));
  return Dqt(dir).some((y) => flattened.some((b) => oS(y, b)))
    ? `sandbox-runtime is installed in ${dir}, where a sandboxed command can write it - install it outside the allowed write paths`
    : void 0;
}

export { mx };
