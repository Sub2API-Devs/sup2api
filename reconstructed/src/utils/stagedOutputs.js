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
import { bde, Cj, readFileHandleChecked } from "./fileRead.js";
import { limitConcurrency } from "./concurrencyLimit.js";
import { ge } from "./identity.js";
import { nonblockingReadFlags } from "./fsOperations.js";
import { isFullFileView, tv, y1 } from "./remoteFileState.js";

//@ chunk-qqey4ng3.js:1204-1223 placement
var m = 10485760,
  u = 4;
/**
 * 读取并记录暂存输出文件；二进制、notebook 或文件不存在等返回 not_recordable，其他错误返回 read_failed。
 */
//@ chunk-qqey4ng3.js:1223-1436 placement
async function recordStagedOutput(r, o) {
  try {
    let t = expandPath(o);
    if (hasBinaryExtension(t) || isNotebookPath(t)) return "not_recordable";
    return await f.readAndRecord(r, t);
  } catch (error) {
    let n = getErrnoCode(error);
    return n === "ENOENT" || n === "EISDIR" || bde(error) || Cj(error) ? "not_recordable" : "read_failed";
  }
}
//@ chunk-qqey4ng3.js:1436-1464 placement
function c() {
  return limitConcurrency(u, recordStagedOutput_2);
}
//@ chunk-qqey4ng3.js:1464-1521 placement
var f = ge({ readAndRecord: c() }, (r) => {
  r.readAndRecord = c();
});
//@ chunk-qqey4ng3.js:1521-2059 placement
async function recordStagedOutput_2(r, o) {
  await using t = await open(o, nonblockingReadFlags());
  let floored = Math.floor((await t.stat()).mtimeMs),
    e = r.get(o);
  if (
    e !== void 0 &&
    !(e.contentFromTranscript && e.limit === void 0 && isFullFileView(e) && e.timestamp < floored)
  )
    return "kept_existing";
  let i = await readFileHandleChecked(t, o, m);
  if (i.content.slice(0, 4096).includes("\x00")) return "not_recordable";
  let a = tv(i.content);
  if (e !== void 0 && !y1(e, a.trim())) return "kept_existing";
  let d = r.get(o);
  if (d !== void 0 && d !== e) return "kept_existing";
  return (
    r.set(o, { content: a, timestamp: floored, offset: void 0, limit: void 0, contentNotInModelContext: !0 }),
    "recorded"
  );
}
