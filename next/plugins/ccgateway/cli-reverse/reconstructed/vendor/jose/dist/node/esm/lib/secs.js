/**
 * jose/dist/node/esm/lib/secs.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __esm } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-pd6th42n.js:38867-38881 esm-layout
var noopJwtClaims = () => {};
//@ chunk-pd6th42n.js:38881-39404 esm-layout
var timePeriodRegex;
var parseSecs = (str) => {
  let matched = timePeriodRegex.exec(str);
  if (!matched) throw TypeError("Invalid time period format");
  let value = parseFloat(matched[1]);
  switch (matched[2].toLowerCase()) {
    case "sec":
    case "secs":
    case "second":
    case "seconds":
    case "s":
      return Math.round(value);
    case "minute":
    case "minutes":
    case "min":
    case "mins":
    case "m":
      return Math.round(value * 60);
    case "hour":
    case "hours":
    case "hr":
    case "hrs":
    case "h":
      return Math.round(value * 3600);
    case "day":
    case "days":
    case "d":
      return Math.round(value * 86400);
    case "week":
    case "weeks":
    case "w":
      return Math.round(value * 604800);
    default:
      return Math.round(value * 31557600);
  }
};
//@ chunk-pd6th42n.js:39404-39526 esm-fingerprint
var init_secs = __esm(() => {
  timePeriodRegex =
    /^(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)$/i;
});
export { parseSecs, noopJwtClaims, init_secs };
