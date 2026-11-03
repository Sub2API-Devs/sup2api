/**
 * utils/sandbox/userTempRoot.ts
 *
 * 2.1.316 新增：沙箱相关的按用户私有临时根目录（bash-edit-diff 等），校验属主与权限
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fq0cr76a.js (11)
 * attribution: placement 11
 */
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  realpath,
  realpath as realpath_2,
} from "fs/promises";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  basename,
  basename as basename_2,
} from "path";
import { isENOENT } from "../errors.js";
import { getClaudeTempDirRealpath } from "../tempDirRealpaths.js";
import { getPlatform } from "../platform.js";

//@ chunk-fq0cr76a.js:638753-638760 placement
var jV;
//@ chunk-fq0cr76a.js:638760-638782 placement
function Ww(e) {
  jV ??= e;
}
//@ chunk-fq0cr76a.js:638782-638805 placement
function Gw() {
  return !1;
}
//@ chunk-fq0cr76a.js:638805-638889 placement
function wrapEvalOrTrue(e) {
  return `'eval' '${e.replaceAll("'", "'\\''")}' 2>/dev/null || 'true'`;
}
//@ chunk-fq0cr76a.js:638889-638907 placement
var SL_GATE = "sl-gate";
/**
 * 检查目录存在且属于当前用户、权限私有，否则返回 null。
 */
//@ chunk-fq0cr76a.js:639119-639302 placement
async function statOwnedPrivateDir(e) {
  let n;
  try {
    n = await lstat_2(e, { bigint: !0 });
  } catch (error) {
    if (isENOENT(error)) return null;
    throw error;
  }
  let r = process.getuid?.();
  return n.isDirectory() && (r === void 0 || n.uid === BigInt(r)) ? n : null;
}
//@ chunk-fq0cr76a.js:639302-639362 placement
var BASH_EDIT_DIFF = "bash-edit-diff",
  XV = /^[0-9a-f-]+-\d+-[0-9a-f]{16}$/;
//@ chunk-fq0cr76a.js:639362-639397 placement
function getBashEditDiffDir() {
  return join(getClaudeTempDirRealpath(), BASH_EDIT_DIFF);
}
//@ chunk-fq0cr76a.js:639397-639680 placement
async function ensurePrivateTempRoot() {
  let e = getBashEditDiffDir();
  await mkdir(e, { recursive: !0, mode: 448 });
  let n = await lstat(e, { bigint: !0 }),
    r = process.getuid?.();
  return n.isDirectory() &&
    !n.isSymbolicLink() &&
    (getPlatform() === "windows" || ((r === void 0 || n.uid === BigInt(r)) && (n.mode & 0o077n) === 0n))
    ? { root: e, identity: { dev: n.dev, ino: n.ino } }
    : null;
}
//@ chunk-fq0cr76a.js:639680-639733 placement
async function getPrivateTempRoot() {
  return (await ensurePrivateTempRoot())?.root ?? null;
}
//@ chunk-fq0cr76a.js:639733-639914 placement = getFileIdentity (0.794)
async function getFileIdentity(e, n) {
  let r = getBashEditDiffDir(),
    s = await statOwnedPrivateDir(r);
  return (
    s?.ino === n.ino &&
    s.dev === n.dev &&
    dirname_2(e) === r &&
    XV.test(basename(e)) &&
    (await statOwnedPrivateDir(e)) !== null &&
    (await realpath(e)) === join(await realpath(dirname_2(r)), BASH_EDIT_DIFF, basename(e))
  );
}

export {
  getBashEditDiffDir,
  statOwnedPrivateDir,
  BASH_EDIT_DIFF,
  getFileIdentity,
  Ww,
  Gw,
  wrapEvalOrTrue,
  ensurePrivateTempRoot,
  getPrivateTempRoot,
};
