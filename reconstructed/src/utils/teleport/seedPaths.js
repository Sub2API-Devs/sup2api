/**
 * utils/teleport/seedPaths.ts
 *
 * 2.1.316 新增：云会话种子目录（.ccr-seed）中的文件路径与路径安全检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5kex67ak.js (6)
 * attribution: placement 6
 */
import { posix } from "path";

//@ chunk-5kex67ak.js:220-434 placement
var SEED_DIR = ".ccr-seed",
  NOT_IMPLEMENTED_STATUS = 501,
  joined = posix.join(SEED_DIR, "manifest.json"),
  joined_2 = posix.join(SEED_DIR, "ready.json"),
  joined_3 = posix.join(SEED_DIR, "laptop.json"),
  joined_4 = posix.join(SEED_DIR, "worker.json"),
  joined_5 = posix.join(SEED_DIR, "home", "pack.json"),
  joined_6 = posix.join(SEED_DIR, "home", "ready.json");
//@ chunk-5kex67ak.js:434-547 placement
var joined_7 = posix.join(SEED_DIR, "overlay.bundle"),
  s = 256,
  i = 500,
  _ = 4,
  c = 2,
  l = 1,
  r = _ + c + l,
  e = 200,
  E = 2,
  min = Math.min(e, i - r - E - e),
  L = s - r,
  IWs = 400;
//@ chunk-5kex67ak.js:547-651 placement
function isSeedPath(n) {
  let joined = posix.join("/", n.replaceAll("\\", "/"));
  return joined === `/${SEED_DIR}` || joined.startsWith(`/${SEED_DIR}/`);
}
//@ chunk-5kex67ak.js:651-724 placement
function isPlainRelativePath(n) {
  return !n.split("/").some((t) => t === "" || t === "." || t === "..");
}
//@ chunk-5kex67ak.js:724-749 placement
var R = /^\.\.namedfork$/i;
//@ chunk-5kex67ak.js:749-806 placement
function hasNamedForkSegment(n) {
  return n.split("/").some((t) => R.test(t));
}

export {
  joined,
  NOT_IMPLEMENTED_STATUS,
  SEED_DIR,
  isSeedPath,
  joined_5,
  isPlainRelativePath,
  hasNamedForkSegment,
  IWs,
  joined_6,
};
