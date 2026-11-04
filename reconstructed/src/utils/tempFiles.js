/**
 * utils/tempFiles.ts
 *
 * 2.1.316 新增：临时文件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kjv7wcqr.js (3)
 * attribution: placement 3
 */
import { join, dirname, basename } from "path";
import { mkdir, writeFile } from "fs/promises";
import { randomBytes } from "crypto";
import { constants } from "fs";
import { claudeTempDir, verifyTempDirOwnership } from "./tempDir.js";
import { readFlagWithOverride } from "../services/analytics/flagOverrides.js";
import { safeResolvePath, getFsImplementation } from "./fsOperations.js";
import { pinWriteTarget, rethrowWithPath } from "./fsSafety/pathRevalidation.js";
import { assertPathSafeAsync } from "./atomicPublishWrite.js";
import { READ_LIMITS, O_NOFOLLOW_FLAG } from "./fsBoundRead.js";

//@ chunk-kjv7wcqr.js:561-587 placement
var TENGU_MOSSY_KNUTH = "tengu_mossy_knuth";
//@ chunk-kjv7wcqr.js:587-896 placement
/**
 * 写入临时文件（校验临时目录所有权，随机名）。
 */
async function writeTempFile(prefix, suffix, content, subdir) {
  let tempDir = claudeTempDir();
  if (
    !readFlagWithOverride(TENGU_MOSSY_KNUTH, {
      safe: true,
    })
  ) {
    let targetDir = subdir ? join(tempDir, subdir) : tempDir;
    await mkdir(targetDir, {
      recursive: true,
      mode: 448,
    });
    let filePath = join(targetDir, `${prefix}${Date.now()}${suffix}`);
    await writeFile(filePath, content);
    return filePath;
  }
  await mkdir(tempDir, {
    recursive: true,
    mode: 448,
  });
  verifyTempDirOwnership(tempDir);
  let filePath = join(
    safeResolvePath(getFsImplementation(), dirname(tempDir)).resolvedPath,
    basename(tempDir),
    `${prefix}${randomBytes(8).toString("hex")}${suffix}`,
  );
  await writeNewFileExclusive(filePath, content);
  return filePath;
}
//@ chunk-kjv7wcqr.js:896-1128 placement
/**
 * 以排他方式创建并写入文件（权限 600）。
 */
async function writeNewFileExclusive(path, content) {
  let pinned = await pinWriteTarget(path, [path], {
    leaf: "replace",
  });
  try {
    await pinned.recheckBeforeWrite();
    await assertPathSafeAsync(pinned.ioPath);
    await writeFile(pinned.ioPath, content, {
      mode: 384,
      flag: constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS | O_NOFOLLOW_FLAG,
    });
  } catch (error) {
    rethrowWithPath(error, pinned, path);
  } finally {
    await pinned.close();
  }
}
export { writeTempFile, writeNewFileExclusive };
