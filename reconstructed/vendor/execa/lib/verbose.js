/**
 * execa/lib/verbose.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: execa@8.0.1
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: esm-fingerprint 1
 */
import { debuglog } from "util";
import pe, { default as re, default as Mr, default as No } from "process";

//@ chunk-m4p5zn6n.js:27567-27831 esm-fingerprint
var enabled = debuglog("execa").enabled,
  fe = (e, n) => String(e).padStart(n, "0"),
  Lo = () => {
    let date = new Date();
    return `${fe(date.getHours(), 2)}:${fe(date.getMinutes(), 2)}:${fe(date.getSeconds(), 2)}.${fe(date.getMilliseconds(), 3)}`;
  },
  We = (e, { verbose: verbose }) => {
    if (!verbose) return;
    No.stderr.write(`[${Lo()}] ${e}
`);
  };

export { enabled, We };
