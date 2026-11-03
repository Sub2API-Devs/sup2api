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
import { READ_LIMITS, mMe } from "./fsBoundRead.js";

//@ chunk-kjv7wcqr.js:561-587 placement
var TENGU_MOSSY_KNUTH = "tengu_mossy_knuth";
/**
 * 写入临时文件（校验临时目录所有权，随机名）。
 */
//@ chunk-kjv7wcqr.js:587-896 placement
async function writeTempFile(t, i, r, o) {
  let e = claudeTempDir();
  if (!readFlagWithOverride(TENGU_MOSSY_KNUTH, { safe: !0 })) {
    let m = o ? join(e, o) : e;
    await mkdir(m, { recursive: !0, mode: 448 });
    let c = join(m, `${t}${Date.now()}${i}`);
    return (await writeFile(c, r), c);
  }
  (await mkdir(e, { recursive: !0, mode: 448 }), verifyTempDirOwnership(e));
  let s = join(
    safeResolvePath(getFsImplementation(), dirname(e)).resolvedPath,
    basename(e),
    `${t}${randomBytes(8).toString("hex")}${i}`,
  );
  return (await writeNewFileExclusive(s, r), s);
}
/**
 * 以排他方式创建并写入文件（权限 600）。
 */
//@ chunk-kjv7wcqr.js:896-1128 placement
async function writeNewFileExclusive(t, i) {
  let r = await pinWriteTarget(t, [t], { leaf: "replace" });
  try {
    (await r.recheckBeforeWrite(),
      await assertPathSafeAsync(r.ioPath),
      await writeFile(r.ioPath, i, {
        mode: 384,
        flag: constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS | mMe,
      }));
  } catch (error) {
    rethrowWithPath(error, r, t);
  } finally {
    await r.close();
  }
}

export { writeTempFile, writeNewFileExclusive };
