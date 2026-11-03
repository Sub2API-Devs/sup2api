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
var Vr,
  ct = (e) => {
    let match = Vr.exec(e);
    if (!match) throw TypeError("Invalid time period format");
    let r = parseFloat(match[1]);
    switch (match[2].toLowerCase()) {
      case "sec":
      case "secs":
      case "second":
      case "seconds":
      case "s":
        return Math.round(r);
      case "minute":
      case "minutes":
      case "min":
      case "mins":
      case "m":
        return Math.round(r * 60);
      case "hour":
      case "hours":
      case "hr":
      case "hrs":
      case "h":
        return Math.round(r * 3600);
      case "day":
      case "days":
      case "d":
        return Math.round(r * 86400);
      case "week":
      case "weeks":
      case "w":
        return Math.round(r * 604800);
      default:
        return Math.round(r * 31557600);
    }
  };
//@ chunk-2tyrgda4.js:39404-39526 esm-fingerprint
var tr = Xa(() => {
  Vr = /^(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)$/i;
});

export { ct, er, tr };
