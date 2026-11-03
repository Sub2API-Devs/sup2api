/**
 * execa/lib/verbose.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: execa@8.0.1
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: esm-fingerprint 1
 */
import { debuglog } from "util";
import { default as Mr } from "process";

//@ chunk-m4p5zn6n.js:27567-27831 esm-fingerprint
var verboseDefault = debuglog("execa").enabled;
var padField = (field, padding) => String(field).padStart(padding, "0");
var getTimestamp = () => {
  let date = new Date();
  return `${padField(date.getHours(), 2)}:${padField(date.getMinutes(), 2)}:${padField(date.getSeconds(), 2)}.${padField(date.getMilliseconds(), 3)}`;
};
var logCommand = (escapedCommand, { verbose }) => {
  if (!verbose) return;
  Mr.stderr.write(`[${getTimestamp()}] ${escapedCommand}
`);
};
export { verboseDefault, logCommand };
