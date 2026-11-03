/**
 * semver/internal/lrucache.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:13833-14215 cjs-fingerprint
var require_lrucache = x(function (cjsExports, cjsModule) {
  class LRUCache {
    constructor() {
      this.max = 1000;
      this.map = new Map();
    }
    get(key) {
      let value = this.map.get(key);
      if (value === undefined) return;
      else {
        this.map.delete(key);
        this.map.set(key, value);
        return value;
      }
    }
    delete(key) {
      return this.map.delete(key);
    }
    set(key, value) {
      if (!this.delete(key) && value !== undefined) {
        if (this.map.size >= this.max) {
          let firstKey = this.map.keys().next().value;
          this.delete(firstKey);
        }
        this.map.set(key, value);
      }
      return this;
    }
  }
  cjsModule.exports = LRUCache;
});
export { require_lrucache };
