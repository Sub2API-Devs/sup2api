/**
 * utils/claudeInChrome/_new/isAcceptableHostSymlink.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (1)
 * attribution: sole-consumer-new 1
 */
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
} from "fs/promises";
import { getPlatform as getPlatform_2 } from "../../platform.js";
import { isSymlinkIntoInstallDir, isNpmSymlink } from "../../nativeInstaller/installer.js";
import { getErrnoCode } from "../../errors.js";

/**
 * Windows 上直接返回 true；其他平台要求路径是符号链接且目标通过两项检查之一才返回 true；路径不存在类错误返回 false。
 */
//@ chunk-s61vbvea.js:504981-505163 sole-consumer-new
async function isAcceptableHostSymlink(e) {
  if (getPlatform_2() === "windows") return !0;
  try {
    let n = await lstat_7(e);
    if (!n.isSymbolicLink()) return !1;
    return (await isSymlinkIntoInstallDir(e, n)) || (await isNpmSymlink(e));
  } catch (error) {
    if (getErrnoCode(error) !== void 0) return !1;
    throw error;
  }
}

export { isAcceptableHostSymlink };
