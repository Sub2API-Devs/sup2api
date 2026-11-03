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
function checkRepoAuthoredPathFromCwd(e, n = []) {
  let cwd = getCwd();
  return checkRepoAuthoredPath(cwd, path.resolve(cwd, e), "target", [getClaudeConfigDir(), ...n]);
}
//@ chunk-qchp9vrd.js:109702-112323 placement
/**
 * 以不跟随链接方式打开普通文件，检测打开过程中被替换。
 */
async function openRegularFileSafely(e, n, r) {
  let base = path.basename(e);
  let s = () =>
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${base} is a symlink; use a regular file`,
      `${r}: symlink refused`,
    );
  let h = () =>
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${base} vanished while being opened; try again`,
      `${r}: removed between lstat and open`,
    );
  let w;
  let b = null;
  let y = false;
  try {
    if (getPlatform() === "windows") {
      let T = null;
      try {
        T = await lstat(e, {
          bigint: true,
        });
      } catch (error) {
        if (!isENOENT(error)) throw error;
      }
      if (T === null)
        try {
          w = await open(e, "wx+");
          y = true;
        } catch (error) {
          if (getErrnoCode(error) !== "EEXIST") throw error;
          T = await lstat(e, {
            bigint: true,
          }).catch((error) => {
            throw isENOENT(error) ? h() : error;
          });
        }
      if (y) {
        let N = await lstat(e, {
          bigint: true,
        }).catch(() => null);
        if (N === null)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${base} could not be examined after being created; refusing to use it`,
            `${r}: post-create lstat failed`,
          );
        if (N.isSymbolicLink()) {
          let x = await readlink(e).catch(() => "?");
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${base} became a symlink while being created; refusing it (an empty file may have been created at its target, ${escapeNonAscii(x)})`,
            `${r}: symlink raced in during create`,
          );
        }
        b = {
          ino: N.ino,
          dev: N.dev,
        };
      } else if (T !== null) {
        if (n === "create")
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${base} already exists; refusing to overwrite it`,
            `${r}: exists (exclusive create)`,
          );
        if (T.isSymbolicLink()) throw s();
        try {
          w = await open(e, "r+");
        } catch (error) {
          if (isENOENT(error)) throw h();
          throw error;
        }
        b = {
          ino: T.ino,
          dev: T.dev,
        };
      }
    } else {
      let T = platformNoFollowFlags();
      try {
        w = await open(e, constants.O_RDWR | constants.O_CREAT | constants.O_EXCL | T, 420);
        y = true;
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
        if (n === "create")
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${base} already exists; refusing to overwrite it`,
            `${r}: exists (exclusive create)`,
          );
        w = await open(e, constants.O_RDWR | T).catch((error) => {
          throw isENOENT(error) ? h() : error;
        });
      }
    }
  } catch (error) {
    if (y) {
      let N =
        (await w
          ?.stat({
            bigint: true,
          })
          .catch(() => null)) ?? null;
      await w?.close().catch(() => {});
      if (N !== null) await getFileIdentity(e, N);
    }
    if (getErrnoCode(error) === "ELOOP")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${base} is a symlink (or its path loops through symlinks); use a regular file at a plain path`,
        `${r}: ELOOP (leaf symlink or path loop)`,
      );
    if (getErrnoCode(error) === "EISDIR")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${base} is a directory, not a file`,
        `${r}: leaf is a directory`,
      );
    throw error;
  }
  if (w === undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${base} could not be opened`,
      `${r}: no handle (unreachable)`,
    );
  let R = w;
  let S = null;
  try {
    let T = (S = await R.stat({
      bigint: true,
    }));
    if ((b !== null || y) && T.ino === 0n)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${base}: file identity cannot be verified on this filesystem; use a local volume`,
        `${r}: identity unverifiable (ino 0)`,
      );
    if (b !== null && (T.ino !== b.ino || T.dev !== b.dev))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${base} changed while being opened; try again`,
        `${r}: identity changed between lstat and open`,
      );
    if (!T.isFile())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${base} is not a regular file`,
        `${r}: not a regular file`,
      );
    if (T.nlink > 1n)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${base} is hard-linked elsewhere (${T.nlink} links); use a plain copy`,
        `${r}: hard link refused`,
      );
    return {
      handle: R,
      size: Number(T.size),
      created: y,
      identity: {
        ino: T.ino,
        dev: T.dev,
      },
    };
  } catch (error) {
    await R.close().catch(() => {});
    if (y && S !== null) await getFileIdentity(e, S);
    throw error;
  }
}
//@ chunk-qchp9vrd.js:112323-112502 placement = getFileIdentity (0.865)
async function getFileIdentity(e, n) {
  if (n.ino === 0n) return;
  let r = await lstat(e, {
    bigint: true,
  }).catch(() => null);
  if (r !== null && !r.isSymbolicLink() && r.ino === n.ino && r.dev === n.dev)
    await unlink(e).catch(() => {});
}
//@ chunk-qchp9vrd.js:112502-112515 placement
/**
 * 读取文件身份的超时（30000 毫秒）。
 */
var FILE_IDENTITY_TIMEOUT_MS = 30000;
export { FILE_IDENTITY_TIMEOUT_MS, checkRepoAuthoredPathFromCwd, openRegularFileSafely, getFileIdentity };
