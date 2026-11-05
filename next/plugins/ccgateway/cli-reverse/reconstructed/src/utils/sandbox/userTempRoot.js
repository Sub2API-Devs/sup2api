/**
 * utils/sandbox/userTempRoot.ts
 *
 * 2.1.316 新增：沙箱相关的按用户私有临时根目录（bash-edit-diff 等），校验属主与权限
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qg41pqt6.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { lstat, mkdir, realpath } from "fs/promises";
import { join, dirname, basename } from "path";
import { isENOENT } from "../errors.js";
import { getClaudeTempDirRealpath } from "../tempDirRealpaths.js";
import { getPlatform } from "../platform.js";

//@ chunk-qg41pqt6.js:639238-639245 placement
var userTempRoot;
//@ chunk-qg41pqt6.js:639245-639267 placement
/**
 * setUserTempRoot：设置用户临时根目录。
 */
function setUserTempRoot(root) {
  userTempRoot ??= root;
}
//@ chunk-qg41pqt6.js:639267-639290 placement
/**
 * neverTempRoot：恒 false 占位。
 */
function neverTempRoot() {
  return false;
}
//@ chunk-qg41pqt6.js:639290-639374 placement
function wrapEvalOrTrue(command) {
  return `'eval' '${command.replaceAll("'", "'\\''")}' 2>/dev/null || 'true'`;
}
//@ chunk-qg41pqt6.js:639374-639392 placement
var SL_GATE = "sl-gate";
//@ chunk-qg41pqt6.js:639604-639787 placement
/**
 * 检查目录存在且属于当前用户、权限私有，否则返回 null。
 */
async function statOwnedPrivateDir(path) {
  let stats;
  try {
    stats = await lstat(path, {
      bigint: true,
    });
  } catch (error) {
    if (isENOENT(error)) return null;
    throw error;
  }
  let uid = process.getuid?.();
  return stats.isDirectory() && (uid === undefined || stats.uid === BigInt(uid)) ? stats : null;
}
//@ chunk-qg41pqt6.js:639787-639847 placement
var BASH_EDIT_DIFF = "bash-edit-diff";
var BASH_EDIT_DIFF_DIR_RE = /^[0-9a-f-]+-\d+-[0-9a-f]{16}$/;
//@ chunk-qg41pqt6.js:639847-639882 placement
function getBashEditDiffDir() {
  return join(getClaudeTempDirRealpath(), BASH_EDIT_DIFF);
}
//@ chunk-qg41pqt6.js:639882-640165 placement
async function ensurePrivateTempRoot() {
  let bashEditDiffDir = getBashEditDiffDir();
  await mkdir(bashEditDiffDir, {
    recursive: true,
    mode: 448,
  });
  let stats = await lstat(bashEditDiffDir, {
    bigint: true,
  });
  let uid = process.getuid?.();
  return stats.isDirectory() &&
    !stats.isSymbolicLink() &&
    (getPlatform() === "windows" ||
      ((uid === undefined || stats.uid === BigInt(uid)) && (stats.mode & 0o077n) === 0n))
    ? {
        root: bashEditDiffDir,
        identity: {
          dev: stats.dev,
          ino: stats.ino,
        },
      }
    : null;
}
//@ chunk-qg41pqt6.js:640165-640218 placement
async function getPrivateTempRoot() {
  return (await ensurePrivateTempRoot())?.root ?? null;
}
//@ chunk-qg41pqt6.js:640218-640399 placement (2.1.88 match: getFileIdentity, 0.795)
async function getFileIdentity(path, identity) {
  let bashEditDiffDir = getBashEditDiffDir();
  let rootStats = await statOwnedPrivateDir(bashEditDiffDir);
  return (
    rootStats?.ino === identity.ino &&
    rootStats.dev === identity.dev &&
    dirname(path) === bashEditDiffDir &&
    BASH_EDIT_DIFF_DIR_RE.test(basename(path)) &&
    (await statOwnedPrivateDir(path)) !== null &&
    (await realpath(path)) === join(await realpath(dirname(bashEditDiffDir)), BASH_EDIT_DIFF, basename(path))
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
