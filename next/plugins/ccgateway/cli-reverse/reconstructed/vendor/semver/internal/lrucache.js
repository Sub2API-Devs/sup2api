/**
 * semver/internal/lrucache.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-7kayq7nc.js:13916-14298 cjs-fingerprint
var require_lrucache = __commonJS(function (cjsExports, cjsModule) {
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
