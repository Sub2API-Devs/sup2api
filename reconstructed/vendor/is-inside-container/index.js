/**
 * is-inside-container/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: is-inside-container@1.0.0
 * pieces: chunk-20ppca50.js (2)
 * attribution: esm-layout 2
 */
import fs, { default as fs_2, default as fs_3 } from "fs";
import { h, G, X } from "../is-docker/index.js";

//@ chunk-20ppca50.js:749-796 esm-layout
function x() {
  if (h === void 0) h = G() || X();
  return h;
}
//@ chunk-20ppca50.js:796-873 esm-layout
var y,
  q = () => {
    try {
      return (fs_2.statSync("/run/.containerenv"), !0);
    } catch {
      return !1;
    }
  };

export { y, q, x };
