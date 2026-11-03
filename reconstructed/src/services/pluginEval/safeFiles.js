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
import path, {
  default as path_2,
  default as path_3,
  default as path_4,
  default as path_5,
  default as path_6,
  default as path_7,
  default as path_8,
  default as path_9,
  default as path_10,
  default as path_11,
  default as path_12,
  default as path_13,
  default as path_14,
  default as path_15,
  default as path_16,
  default as path_17,
  default as path_18,
} from "path";
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  readlink,
  readlink as readlink_2,
  readlink as readlink_3,
  readlink as readlink_4,
  readlink as readlink_5,
  unlink,
} from "fs/promises";
import {
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
} from "fs";
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
import { zq } from "../../utils/platformTargets.js";

//@ chunk-qchp9vrd.js:109492-109573 placement
function Fa(e, n = []) {
  let r = getCwd();
  return checkRepoAuthoredPath(r, path_11.resolve(r, e), "target", [getClaudeConfigDir(), ...n]);
}
/**
 * 以不跟随链接方式打开普通文件，检测打开过程中被替换。
 */
//@ chunk-qchp9vrd.js:109702-112323 placement
async function openRegularFileSafely(e, n, r) {
  let base = path_12.basename(e),
    s = () =>
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${base} is a symlink; use a regular file`,
        `${r}: symlink refused`,
      ),
    h = () =>
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${base} vanished while being opened; try again`,
        `${r}: removed between lstat and open`,
      ),
    w,
    b = null,
    y = !1;
  try {
    if (getPlatform() === "windows") {
      let T = null;
      try {
        T = await lstat_8(e, { bigint: !0 });
      } catch (error) {
        if (!isENOENT(error)) throw error;
      }
      if (T === null)
        try {
          ((w = await open_4(e, "wx+")), (y = !0));
        } catch (error) {
          if (getErrnoCode(error) !== "EEXIST") throw error;
          T = await lstat_8(e, { bigint: !0 }).catch((x) => {
            throw isENOENT(x) ? h() : x;
          });
        }
      if (y) {
        let N = await lstat_8(e, { bigint: !0 }).catch(() => null);
        if (N === null)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${base} could not be examined after being created; refusing to use it`,
            `${r}: post-create lstat failed`,
          );
        if (N.isSymbolicLink()) {
          let x = await readlink_4(e).catch(() => "?");
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${base} became a symlink while being created; refusing it (an empty file may have been created at its target, ${escapeNonAscii(x)})`,
            `${r}: symlink raced in during create`,
          );
        }
        b = { ino: N.ino, dev: N.dev };
      } else if (T !== null) {
        if (n === "create")
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${base} already exists; refusing to overwrite it`,
            `${r}: exists (exclusive create)`,
          );
        if (T.isSymbolicLink()) throw s();
        try {
          w = await open_4(e, "r+");
        } catch (error) {
          if (isENOENT(error)) throw h();
          throw error;
        }
        b = { ino: T.ino, dev: T.dev };
      }
    } else {
      let T = zq();
      try {
        ((w = await open_4(e, constants_4.O_RDWR | constants_4.O_CREAT | constants_4.O_EXCL | T, 420)),
          (y = !0));
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
        if (n === "create")
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${base} already exists; refusing to overwrite it`,
            `${r}: exists (exclusive create)`,
          );
        w = await open_4(e, constants_4.O_RDWR | T).catch((x) => {
          throw isENOENT(x) ? h() : x;
        });
      }
    }
  } catch (error) {
    if (y) {
      let N = (await w?.stat({ bigint: !0 }).catch(() => null)) ?? null;
      if ((await w?.close().catch(() => {}), N !== null)) await getFileIdentity(e, N);
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
  if (w === void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${base} could not be opened`,
      `${r}: no handle (unreachable)`,
    );
  let R = w,
    S = null;
  try {
    let T = (S = await R.stat({ bigint: !0 }));
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
    return { handle: R, size: Number(T.size), created: y, identity: { ino: T.ino, dev: T.dev } };
  } catch (error) {
    if ((await R.close().catch(() => {}), y && S !== null)) await getFileIdentity(e, S);
    throw error;
  }
}
//@ chunk-qchp9vrd.js:112323-112502 placement = getFileIdentity (0.865)
async function getFileIdentity(e, n) {
  if (n.ino === 0n) return;
  let r = await lstat_8(e, { bigint: !0 }).catch(() => null);
  if (r !== null && !r.isSymbolicLink() && r.ino === n.ino && r.dev === n.dev)
    await unlink(e).catch(() => {});
}
//@ chunk-qchp9vrd.js:112502-112515 placement
var Ga = 30000;

export { Ga, Fa, openRegularFileSafely, getFileIdentity };
