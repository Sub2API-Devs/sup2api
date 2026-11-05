/**
 * proper-lockfile/lib/mtime-precision.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: proper-lockfile@4.1.2
 * pieces: chunk-3c7mkwg0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-3c7mkwg0.js:17126-17645 cjs-fingerprint
var require_mtime_precision = __commonJS(function (cjsExports, cjsModule) {
  var cacheSymbol = Symbol();
  function probe(file, fs, callback) {
    let cachedPrecision = fs[cacheSymbol];
    if (cachedPrecision)
      return fs.stat(file, (err, stat) => {
        if (err) return callback(err);
        callback(null, stat.mtime, cachedPrecision);
      });
    let mtime = new Date(Math.ceil(Date.now() / 1000) * 1000 + 5);
    fs.utimes(file, mtime, mtime, (err) => {
      if (err) return callback(err);
      fs.stat(file, (err, stat) => {
        if (err) return callback(err);
        let precision = stat.mtime.getTime() % 1000 === 0 ? "s" : "ms";
        if (!(cacheSymbol in fs))
          try {
            Object.defineProperty(fs, cacheSymbol, {
              value: precision,
              configurable: true,
            });
          } catch {}
        callback(null, stat.mtime, precision);
      });
    });
  }
  function getMtime(precision) {
    let now = Date.now();
    if (precision === "s") now = Math.ceil(now / 1000) * 1000;
    return new Date(now);
  }
  cjsExports.probe = probe;
  cjsExports.getMtime = getMtime;
});
export { require_mtime_precision };
