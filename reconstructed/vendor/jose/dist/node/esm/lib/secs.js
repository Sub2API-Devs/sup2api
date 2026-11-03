/**
 * jose/dist/node/esm/lib/secs.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { Xa } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-2tyrgda4.js:38867-38881 esm-layout
var er = () => {};
//@ chunk-2tyrgda4.js:38881-39404 esm-layout
var Vr;
var ct = (str) => {
  let matched = Vr.exec(str);
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
//@ chunk-2tyrgda4.js:39404-39526 esm-fingerprint
var init_secs = Xa(() => {
  Vr = /^(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)$/i;
});
export { ct, er, init_secs };
