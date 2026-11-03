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
import { lstat, mkdir, realpath } from "fs/promises";
import { join, dirname, basename } from "path";
import { isENOENT } from "../errors.js";
import { getClaudeTempDirRealpath } from "../tempDirRealpaths.js";
import { getPlatform } from "../platform.js";

//@ chunk-fq0cr76a.js:638753-638760 placement
var userTempRoot;
//@ chunk-fq0cr76a.js:638760-638782 placement
/**
 * setUserTempRoot：设置用户临时根目录。
 */
function setUserTempRoot(e) {
  userTempRoot ??= e;
}
//@ chunk-fq0cr76a.js:638782-638805 placement
/**
 * neverTempRoot：恒 false 占位。
 */
function neverTempRoot() {
  return false;
}
//@ chunk-fq0cr76a.js:638805-638889 placement
function wrapEvalOrTrue(e) {
  return `'eval' '${e.replaceAll("'", "'\\''")}' 2>/dev/null || 'true'`;
}
//@ chunk-fq0cr76a.js:638889-638907 placement
var SL_GATE = "sl-gate";
//@ chunk-fq0cr76a.js:639119-639302 placement
/**
 * 检查目录存在且属于当前用户、权限私有，否则返回 null。
 */
async function statOwnedPrivateDir(e) {
  let n;
  try {
    n = await lstat(e, {
      bigint: true,
    });
  } catch (error) {
    if (isENOENT(error)) return null;
    throw error;
  }
  let r = process.getuid?.();
  return n.isDirectory() && (r === undefined || n.uid === BigInt(r)) ? n : null;
}
//@ chunk-fq0cr76a.js:639302-639362 placement
var BASH_EDIT_DIFF = "bash-edit-diff";
var BASH_EDIT_DIFF_DIR_RE = /^[0-9a-f-]+-\d+-[0-9a-f]{16}$/;
//@ chunk-fq0cr76a.js:639362-639397 placement
function getBashEditDiffDir() {
  return join(getClaudeTempDirRealpath(), BASH_EDIT_DIFF);
}
//@ chunk-fq0cr76a.js:639397-639680 placement
async function ensurePrivateTempRoot() {
  let bashEditDiffDir = getBashEditDiffDir();
  await mkdir(bashEditDiffDir, {
    recursive: true,
    mode: 448,
  });
  let n = await lstat(bashEditDiffDir, {
    bigint: true,
  });
  let r = process.getuid?.();
  return n.isDirectory() &&
    !n.isSymbolicLink() &&
    (getPlatform() === "windows" || ((r === undefined || n.uid === BigInt(r)) && (n.mode & 0o077n) === 0n))
    ? {
        root: bashEditDiffDir,
        identity: {
          dev: n.dev,
          ino: n.ino,
        },
      }
    : null;
}
//@ chunk-fq0cr76a.js:639680-639733 placement
async function getPrivateTempRoot() {
  return (await ensurePrivateTempRoot())?.root ?? null;
}
//@ chunk-fq0cr76a.js:639733-639914 placement = getFileIdentity (0.794)
async function getFileIdentity(e, n) {
  let bashEditDiffDir = getBashEditDiffDir();
  let s = await statOwnedPrivateDir(bashEditDiffDir);
  return (
    s?.ino === n.ino &&
    s.dev === n.dev &&
    dirname(e) === bashEditDiffDir &&
    BASH_EDIT_DIFF_DIR_RE.test(basename(e)) &&
    (await statOwnedPrivateDir(e)) !== null &&
    (await realpath(e)) === join(await realpath(dirname(bashEditDiffDir)), BASH_EDIT_DIFF, basename(e))
  );
}
export {
  getBashEditDiffDir,
  statOwnedPrivateDir,
  BASH_EDIT_DIFF,
  getFileIdentity,
  setUserTempRoot,
  neverTempRoot,
  wrapEvalOrTrue,
  ensurePrivateTempRoot,
  getPrivateTempRoot,
};
