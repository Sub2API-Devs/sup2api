/**
 * jsonwebtoken/lib/timespan.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_ms } from "../../ms/index.js";

//@ chunk-mrx6y2r5.js:4528-4769 cjs-fingerprint
var require_timespan = x(function (cjsExports, cjsModule) {
  var ms = require_ms();
  cjsModule.exports = function (time, iat) {
    var timestamp = iat || Math.floor(Date.now() / 1000);
    if (typeof time === "string") {
      var milliseconds = ms(time);
      if (typeof milliseconds === "undefined") return;
      return Math.floor(timestamp + milliseconds / 1000);
    } else if (typeof time === "number") return timestamp + time;
    else return;
  };
});
export { require_timespan };
