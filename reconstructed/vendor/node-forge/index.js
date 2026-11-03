/**
 * node-forge/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-layout 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { require_md } from "./lib/md.js";
import { require_md5 } from "./lib/md5.js";
import { require_sha1 } from "./lib/sha1.js";
import { require_sha256 } from "./lib/sha256.js";
import { require_sha512 } from "./lib/sha512.js";

//@ chunk-fq0cr76a.js:277737-277801 cjs-layout
var fC = x(function (Gfe, dC) {
  dC.exports = require_md();
  require_md5();
  require_sha1();
  require_sha256();
  require_sha512();
});
export { fC };
