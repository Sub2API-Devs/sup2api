/**
 * semver/internal/lrucache.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:13833-14215 cjs-fingerprint
var il = x(function (S2, al) {
  class ol {
    constructor() {
      ((this.max = 1000), (this.map = new Map()));
    }
    get(e) {
      let s = this.map.get(e);
      if (s === void 0) return;
      else return (this.map.delete(e), this.map.set(e, s), s);
    }
    delete(e) {
      return this.map.delete(e);
    }
    set(e, s) {
      if (!this.delete(e) && s !== void 0) {
        if (this.map.size >= this.max) {
          let r = this.map.keys().next().value;
          this.delete(r);
        }
        this.map.set(e, s);
      }
      return this;
    }
  }
  al.exports = ol;
});

export { il };
