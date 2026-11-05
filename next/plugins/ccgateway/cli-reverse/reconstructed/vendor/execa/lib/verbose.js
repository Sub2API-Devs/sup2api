/**
 * execa/lib/verbose.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: execa@8.0.1
 * pieces: chunk-t889g22j.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { debuglog } from "util";
import { default as Fo } from "process";

//@ chunk-t889g22j.js:27566-27830 esm-fingerprint
var verboseDefault = debuglog("execa").enabled;
var padField = (field, padding) => String(field).padStart(padding, "0");
var getTimestamp = () => {
  let date = new Date();
  return `${padField(date.getHours(), 2)}:${padField(date.getMinutes(), 2)}:${padField(date.getSeconds(), 2)}.${padField(date.getMilliseconds(), 3)}`;
};
var logCommand = (escapedCommand, { verbose }) => {
  if (!verbose) return;
  Fo.stderr.write(`[${getTimestamp()}] ${escapedCommand}
`);
};
export { verboseDefault, logCommand };
