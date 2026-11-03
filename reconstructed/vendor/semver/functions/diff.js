/**
 * semver/functions/diff.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { ze } from "./parse.js";

//@ chunk-bwbq4xvm.js:10738-11216 cjs-fingerprint
var zi = x(function (t2, ki) {
  var vi = ze(),
    wv = (e, s) => {
      let n = vi(e, null, !0),
        r = vi(s, null, !0),
        compare = n.compare(r);
      if (compare === 0) return null;
      let l = compare > 0,
        c = l ? n : r,
        h = l ? r : n,
        m = !!c.prerelease.length;
      if (!!h.prerelease.length && !m) {
        if (!h.patch && !h.minor) return "major";
        if (h.compareMain(c) === 0) {
          if (h.minor && !h.patch) return "minor";
          return "patch";
        }
      }
      let w = m ? "pre" : "";
      if (n.major !== r.major) return w + "major";
      if (n.minor !== r.minor) return w + "minor";
      if (n.patch !== r.patch) return w + "patch";
      return "prerelease";
    };
  ki.exports = wv;
});

export { zi };
