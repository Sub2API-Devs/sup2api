/**
 * semver/functions/prerelease.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { ze } from "./parse.js";

//@ chunk-bwbq4xvm.js:11456-11583 cjs-fingerprint
var Di = x(function (o2, xi) {
  var Ov = ze(),
    Iv = (e, s) => {
      let n = Ov(e, s);
      return n && n.prerelease.length ? n.prerelease : null;
    };
  xi.exports = Iv;
});

export { Di };
