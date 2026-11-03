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

//@ chunk-f2zt4n31.js:436-561 placement
/**
 * 创建作业目录：存储 v5 启用时在存储中建 job 作用域，否则在磁盘上建目录。
 */
async function ensureJobFolder(e, storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined && isValidKeySegment(e)) {
    await ensureStorageScope(storageV5, {
      namespace: "job",
      jobId: e,
    });
    return;
  }
  await mkdir(getJobDir(e), {
    recursive: true,
  });
}
//@ chunk-f2zt4n31.js:561-674 placement
/**
 * 确保任务的临时目录存在（启用存储 v5 时走存储层）。
 */
async function ensureJobTmpFolder(jobId, r) {
  if (isStorageV5Enabled() && r !== undefined && isValidKeySegment(jobId)) {
    await ensureStorageScope(r, jobTmpScope(jobId));
    return;
  }
  await mkdir(join(getJobDir(jobId), "tmp"), {
    recursive: true,
  });
}
//@ chunk-f2zt4n31.js:674-736 placement
/**
 * 作业临时目录的存储作用域（job/<id>/tmp）。
 */
function jobTmpScope(jobId) {
  return {
    namespace: "job",
    jobId,
    relPath: ["tmp"],
  };
}
//@ chunk-f2zt4n31.js:736-928 placement
async function ensureStorageScope(e, r) {
  let o = await e.ensureScope(r);
  if (!o.ok) {
    let t = storageErrorCode(o.error);
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `job folder not made (${formatStorageError(o.error)})`,
        "job folder not made",
      ),
      t !== undefined
        ? {
            code: t,
          }
        : {},
    );
  }
}
export { ensureJobTmpFolder, ensureJobFolder };
