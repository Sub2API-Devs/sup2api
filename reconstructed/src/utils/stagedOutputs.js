/**
 * utils/stagedOutputs.ts
 *
 * 暂存输出记录（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qqey4ng3.js (5)
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

//@ chunk-qqey4ng3.js:1204-1223 placement
var MAX_STAGED_OUTPUT_BYTES = 10485760;
var STAGED_OUTPUT_CONCURRENCY = 4;
//@ chunk-qqey4ng3.js:1223-1436 placement
/**
 * 读取并记录暂存输出文件；二进制、notebook 或文件不存在等返回 not_recordable，其他错误返回 read_failed。
 */
async function recordStagedOutput(r, o) {
  try {
    let t = expandPath(o);
    if (hasBinaryExtension(t) || isNotebookPath(t)) return "not_recordable";
    return await stagedOutputStore.readAndRecord(r, t);
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
//@ chunk-qqey4ng3.js:1436-1464 placement
function createStagedOutputLimiter() {
  return limitConcurrency(STAGED_OUTPUT_CONCURRENCY, recordStagedOutput_2);
}
//@ chunk-qqey4ng3.js:1464-1521 placement
var stagedOutputStore = identity(
  {
    readAndRecord: createStagedOutputLimiter(),
  },
  (r) => {
    r.readAndRecord = createStagedOutputLimiter();
  },
);
//@ chunk-qqey4ng3.js:1521-2059 placement
async function recordStagedOutput_2(r, o) {
  await using t = await open(o, nonblockingReadFlags());
  let floored = Math.floor((await t.stat()).mtimeMs);
  let e = r.get(o);
  if (
    e !== undefined &&
    !(e.contentFromTranscript && e.limit === undefined && isFullFileView(e) && e.timestamp < floored)
  )
    return "kept_existing";
  let fileHandleChecked = await readFileHandleChecked(t, o, MAX_STAGED_OUTPUT_BYTES);
  if (fileHandleChecked.content.slice(0, 4096).includes("\x00")) return "not_recordable";
  let a = stripBom(fileHandleChecked.content);
  if (e !== undefined && !matchesContentHash(e, a.trim())) return "kept_existing";
  let d = r.get(o);
  if (d !== undefined && d !== e) return "kept_existing";
  r.set(o, {
    content: a,
    timestamp: floored,
    offset: undefined,
    limit: undefined,
    contentNotInModelContext: true,
  });
  return "recorded";
}
