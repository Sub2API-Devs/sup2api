/**
 * services/daemon/jobFolder.ts
 *
 * 后台作业目录（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f2zt4n31.js (4)
 * attribution: placement 4
 */
import { mkdir } from "fs/promises";
import { join } from "path";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { isValidKeySegment } from "../../utils/storage/storageSpaces.js";
import { getJobDir } from "./jobState.js";
import { storageErrorCode, formatStorageError } from "../../utils/storage/storageErrors.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";

/**
 * 创建作业目录：存储 v5 启用时在存储中建 job 作用域，否则在磁盘上建目录。
 */
//@ chunk-f2zt4n31.js:436-561 placement
async function ensureJobFolder(e, r) {
  if (isStorageV5Enabled() && r !== void 0 && isValidKeySegment(e)) {
    await ensureStorageScope(r, { namespace: "job", jobId: e });
    return;
  }
  await mkdir(getJobDir(e), { recursive: !0 });
}
/**
 * 确保任务的临时目录存在（启用存储 v5 时走存储层）。
 */
//@ chunk-f2zt4n31.js:561-674 placement
async function ensureJobTmpFolder(e, r) {
  if (isStorageV5Enabled() && r !== void 0 && isValidKeySegment(e)) {
    await ensureStorageScope(r, c(e));
    return;
  }
  await mkdir(join(getJobDir(e), "tmp"), { recursive: !0 });
}
//@ chunk-f2zt4n31.js:674-736 placement
function c(e) {
  return { namespace: "job", jobId: e, relPath: ["tmp"] };
}
//@ chunk-f2zt4n31.js:736-928 placement
async function ensureStorageScope(e, r) {
  let ensureScope = await e.ensureScope(r);
  if (!ensureScope.ok) {
    let t = storageErrorCode(ensureScope.error);
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `job folder not made (${formatStorageError(ensureScope.error)})`,
        "job folder not made",
      ),
      t !== void 0 ? { code: t } : {},
    );
  }
}

export { ensureJobTmpFolder, ensureJobFolder };
