/**
 * services/daemon/jobFolder.ts
 *
 * 后台作业目录（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gqnn9g49.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { mkdir } from "fs/promises";
import { join } from "path";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { isValidKeySegment } from "../../utils/storage/storageSpaces.js";
import { getJobDir } from "./jobState.js";
import { storageErrorCode, formatStorageError } from "../../utils/storage/storageErrors.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";

//@ chunk-gqnn9g49.js:436-561 placement
/**
 * 创建作业目录：存储 v5 启用时在存储中建 job 作用域，否则在磁盘上建目录。
 */
async function ensureJobFolder(jobId, storage) {
  if (isStorageV5Enabled() && storage !== undefined && isValidKeySegment(jobId)) {
    await ensureStorageScope(storage, {
      namespace: "job",
      jobId,
    });
    return;
  }
  await mkdir(getJobDir(jobId), {
    recursive: true,
  });
}
//@ chunk-gqnn9g49.js:561-674 placement
/**
 * 确保任务的临时目录存在（启用存储 v5 时走存储层）。
 */
async function ensureJobTmpFolder(short, storage) {
  if (isStorageV5Enabled() && storage !== undefined && isValidKeySegment(short)) {
    await ensureStorageScope(storage, jobTmpScope(short));
    return;
  }
  await mkdir(join(getJobDir(short), "tmp"), {
    recursive: true,
  });
}
//@ chunk-gqnn9g49.js:674-736 placement
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
//@ chunk-gqnn9g49.js:736-928 placement
async function ensureStorageScope(storage, scope) {
  let result = await storage.ensureScope(scope);
  if (!result.ok) {
    let errorCode = storageErrorCode(result.error);
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `job folder not made (${formatStorageError(result.error)})`,
        "job folder not made",
      ),
      errorCode !== undefined
        ? {
            code: errorCode,
          }
        : {},
    );
  }
}
export { ensureJobTmpFolder, ensureJobFolder };
