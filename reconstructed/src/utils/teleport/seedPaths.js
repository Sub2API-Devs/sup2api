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
var SEED_DIR = ".ccr-seed";
var NOT_IMPLEMENTED_STATUS = 501;
var joined = posix.join(SEED_DIR, "manifest.json");
var joined_2 = posix.join(SEED_DIR, "ready.json");
var joined_3 = posix.join(SEED_DIR, "laptop.json");
var joined_4 = posix.join(SEED_DIR, "worker.json");
var joined_5 = posix.join(SEED_DIR, "home", "pack.json");
var joined_6 = posix.join(SEED_DIR, "home", "ready.json");
//@ chunk-5kex67ak.js:434-547 placement
var joined_7 = posix.join(SEED_DIR, "overlay.bundle");
var MAX_SEED_PATH_CHARS = 256;
var MAX_SEED_PATH_BYTES = 500;
var _ = 4;
var SEED_PREFIX_LEN = 2;
var SEED_SUFFIX_LEN = 1;
var SEED_FIXED_LEN = _ + SEED_PREFIX_LEN + SEED_SUFFIX_LEN;
var MAX_LANE_NAME_CHARS = 200;
var MAX_LANE_EXTRA_CHARS = 2;
var min = Math.min(
  MAX_LANE_NAME_CHARS,
  MAX_SEED_PATH_BYTES - SEED_FIXED_LEN - MAX_LANE_EXTRA_CHARS - MAX_LANE_NAME_CHARS,
);
var MAX_SEED_NAME_CHARS = MAX_SEED_PATH_CHARS - SEED_FIXED_LEN;
var MAX_LANE_PATH_CHARS = 400;
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
var NAMED_FORK_SEGMENT_RE = /^\.\.namedfork$/i;
//@ chunk-5kex67ak.js:749-806 placement
function hasNamedForkSegment(forwardSlashes) {
  return forwardSlashes.split("/").some((t) => NAMED_FORK_SEGMENT_RE.test(t));
}
export {
  joined,
  NOT_IMPLEMENTED_STATUS,
  SEED_DIR,
  isSeedPath,
  joined_5,
  isPlainRelativePath,
  hasNamedForkSegment,
  MAX_LANE_PATH_CHARS,
  joined_6,
};
