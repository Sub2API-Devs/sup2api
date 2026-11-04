/**
 * services/pluginEval/safeFiles.ts
 *
 * 2.1.316 新增：plugin eval 的安全文件读写（拒绝符号链接、lstat 与 open 之间被替换）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (4)
 * attribution: placement 4
 */
import path from "path";
import { lstat, open, readlink, unlink } from "fs/promises";
import { constants } from "fs";
import { getCwd } from "../../utils/cwd.js";
import { checkRepoAuthoredPath } from "../../cli/handlers/pluginEval/mockGuards.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isENOENT,
  getErrnoCode,
} from "../../utils/errors.js";
import { getPlatform } from "../../utils/platform.js";
import { escapeNonAscii } from "../../utils/resultError.js";
import { platformNoFollowFlags } from "../../utils/platformTargets.js";

//@ chunk-qchp9vrd.js:109492-109573 placement
/**
 * 以当前目录为基准检查路径是否属于仓库内容。
 */
function checkRepoAuthoredPathFromCwd(target, extraTrustedRoots = []) {
  let cwd = getCwd();
  return checkRepoAuthoredPath(cwd, path.resolve(cwd, target), "target", [
    getClaudeConfigDir(),
    ...extraTrustedRoots,
  ]);
}
//@ chunk-qchp9vrd.js:109702-112323 placement
/**
 * 以不跟随链接方式打开普通文件，检测打开过程中被替换。
 */
async function openRegularFileSafely(filePath, mode, label) {
  let base = path.basename(filePath);
  let symlinkError = () =>
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${base} is a symlink; use a regular file`,
      `${label}: symlink refused`,
    );
  let vanishedError = () =>
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${base} vanished while being opened; try again`,
      `${label}: removed between lstat and open`,
    );
  let handle;
  let expectedIdentity = null;
  let created = false;
  try {
    if (getPlatform() === "windows") {
      let beforeStats = null;
      try {
        beforeStats = await lstat(filePath, {
          bigint: true,
        });
      } catch (error) {
        if (!isENOENT(error)) throw error;
      }
      if (beforeStats === null)
        try {
          handle = await open(filePath, "wx+");
          created = true;
        } catch (error) {
          if (getErrnoCode(error) !== "EEXIST") throw error;
          beforeStats = await lstat(filePath, {
            bigint: true,
          }).catch((error) => {
            throw isENOENT(error) ? vanishedError() : error;
          });
        }
      if (created) {
        let afterStats = await lstat(filePath, {
          bigint: true,
        }).catch(() => null);
        if (afterStats === null)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${base} could not be examined after being created; refusing to use it`,
            `${label}: post-create lstat failed`,
          );
        if (afterStats.isSymbolicLink()) {
          let linkTarget = await readlink(filePath).catch(() => "?");
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${base} became a symlink while being created; refusing it (an empty file may have been created at its target, ${escapeNonAscii(linkTarget)})`,
            `${label}: symlink raced in during create`,
          );
        }
        expectedIdentity = {
          ino: afterStats.ino,
          dev: afterStats.dev,
        };
      } else if (beforeStats !== null) {
        if (mode === "create")
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${base} already exists; refusing to overwrite it`,
            `${label}: exists (exclusive create)`,
          );
        if (beforeStats.isSymbolicLink()) throw symlinkError();
        try {
          handle = await open(filePath, "r+");
        } catch (error) {
          if (isENOENT(error)) throw vanishedError();
          throw error;
        }
        expectedIdentity = {
          ino: beforeStats.ino,
          dev: beforeStats.dev,
        };
      }
    } else {
      let noFollowFlags = platformNoFollowFlags();
      try {
        handle = await open(
          filePath,
          constants.O_RDWR | constants.O_CREAT | constants.O_EXCL | noFollowFlags,
          420,
        );
        created = true;
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
        if (mode === "create")
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${base} already exists; refusing to overwrite it`,
            `${label}: exists (exclusive create)`,
          );
        handle = await open(filePath, constants.O_RDWR | noFollowFlags).catch((error) => {
          throw isENOENT(error) ? vanishedError() : error;
        });
      }
    }
  } catch (error) {
    if (created) {
      let stats =
        (await handle
          ?.stat({
            bigint: true,
          })
          .catch(() => null)) ?? null;
      await handle?.close().catch(() => {});
      if (stats !== null) await getFileIdentity(filePath, stats);
    }
    if (getErrnoCode(error) === "ELOOP")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${base} is a symlink (or its path loops through symlinks); use a regular file at a plain path`,
        `${label}: ELOOP (leaf symlink or path loop)`,
      );
    if (getErrnoCode(error) === "EISDIR")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${base} is a directory, not a file`,
        `${label}: leaf is a directory`,
      );
    throw error;
  }
  if (handle === undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${base} could not be opened`,
      `${label}: no handle (unreachable)`,
    );
  let fileHandle = handle;
  let readStats = null;
  try {
    let stats = (readStats = await fileHandle.stat({
      bigint: true,
    }));
    if ((expectedIdentity !== null || created) && stats.ino === 0n)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${base}: file identity cannot be verified on this filesystem; use a local volume`,
        `${label}: identity unverifiable (ino 0)`,
      );
    if (
      expectedIdentity !== null &&
      (stats.ino !== expectedIdentity.ino || stats.dev !== expectedIdentity.dev)
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${base} changed while being opened; try again`,
        `${label}: identity changed between lstat and open`,
      );
    if (!stats.isFile())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${base} is not a regular file`,
        `${label}: not a regular file`,
      );
    if (stats.nlink > 1n)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${base} is hard-linked elsewhere (${stats.nlink} links); use a plain copy`,
        `${label}: hard link refused`,
      );
    return {
      handle: fileHandle,
      size: Number(stats.size),
      created,
      identity: {
        ino: stats.ino,
        dev: stats.dev,
      },
    };
  } catch (error) {
    await fileHandle.close().catch(() => {});
    if (created && readStats !== null) await getFileIdentity(filePath, readStats);
    throw error;
  }
}
//@ chunk-qchp9vrd.js:112323-112502 placement (2.1.88 match: getFileIdentity, 0.865)
async function getFileIdentity(filePath, identity) {
  if (identity.ino === 0n) return;
  let stats = await lstat(filePath, {
    bigint: true,
  }).catch(() => null);
  if (stats !== null && !stats.isSymbolicLink() && stats.ino === identity.ino && stats.dev === identity.dev)
    await unlink(filePath).catch(() => {});
}
//@ chunk-qchp9vrd.js:112502-112515 placement
/**
 * 读取文件身份的超时（30000 毫秒）。
 */
var FILE_IDENTITY_TIMEOUT_MS = 30000;
export { FILE_IDENTITY_TIMEOUT_MS, checkRepoAuthoredPathFromCwd, openRegularFileSafely, getFileIdentity };
