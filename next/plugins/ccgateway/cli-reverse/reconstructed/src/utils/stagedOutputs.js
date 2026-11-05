/**
 * utils/stagedOutputs.ts
 *
 * 暂存输出记录（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-cyc73458.js (5)
 * attribution: placement 5
 */
import { open } from "fs/promises";
import { expandPath, isNotebookPath } from "./path.js";
import { hasBinaryExtension } from "../constants/files.js";
import { getErrnoCode } from "./errors.js";
import { isNotRegularFileError, isFileTooLargeError, readFileHandleChecked } from "./fileRead.js";
import { limitConcurrency } from "./concurrencyLimit.js";
import { identity } from "./identity.js";
import { nonblockingReadFlags } from "./fsOperations.js";
import { isFullFileView, stripBom, matchesContentHash } from "./remoteFileState.js";

//@ chunk-cyc73458.js:1316-1335 placement
var MAX_STAGED_OUTPUT_BYTES = 10485760;
var STAGED_OUTPUT_CONCURRENCY = 4;
//@ chunk-cyc73458.js:1335-1548 placement
/**
 * 读取并记录暂存输出文件；二进制、notebook 或文件不存在等返回 not_recordable，其他错误返回 read_failed。
 */
async function recordStagedOutput(store, filePath) {
  try {
    let expandedPath = expandPath(filePath);
    if (hasBinaryExtension(expandedPath) || isNotebookPath(expandedPath)) return "not_recordable";
    return await stagedOutputStore.readAndRecord(store, expandedPath);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" ||
      errnoCode === "EISDIR" ||
      isNotRegularFileError(error) ||
      isFileTooLargeError(error)
      ? "not_recordable"
      : "read_failed";
  }
}
//@ chunk-cyc73458.js:1548-1576 placement
function createStagedOutputLimiter() {
  return limitConcurrency(STAGED_OUTPUT_CONCURRENCY, recordStagedOutput_2);
}
//@ chunk-cyc73458.js:1576-1633 placement
var stagedOutputStore = identity(
  {
    readAndRecord: createStagedOutputLimiter(),
  },
  (store) => {
    store.readAndRecord = createStagedOutputLimiter();
  },
);
//@ chunk-cyc73458.js:1633-2171 placement
async function recordStagedOutput_2(store, filePath) {
  await using fileHandle = await open(filePath, nonblockingReadFlags());
  let floored = Math.floor((await fileHandle.stat()).mtimeMs);
  let existing = store.get(filePath);
  if (
    existing !== undefined &&
    !(
      existing.contentFromTranscript &&
      existing.limit === undefined &&
      isFullFileView(existing) &&
      existing.timestamp < floored
    )
  )
    return "kept_existing";
  let fileHandleChecked = await readFileHandleChecked(fileHandle, filePath, MAX_STAGED_OUTPUT_BYTES);
  if (fileHandleChecked.content.slice(0, 4096).includes("\x00")) return "not_recordable";
  let bomStripped = stripBom(fileHandleChecked.content);
  if (existing !== undefined && !matchesContentHash(existing, bomStripped.trim())) return "kept_existing";
  let currentEntry = store.get(filePath);
  if (currentEntry !== undefined && currentEntry !== existing) return "kept_existing";
  store.set(filePath, {
    content: bomStripped,
    timestamp: floored,
    offset: undefined,
    limit: undefined,
    contentNotInModelContext: true,
  });
  return "recorded";
}
export { recordStagedOutput };
