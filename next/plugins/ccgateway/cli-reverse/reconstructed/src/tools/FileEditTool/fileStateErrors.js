/**
 * tools/FileEditTool/fileStateErrors.ts
 *
 * 2.1.316 新增：Edit/Write 拒绝写入的说明与错误类。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-p223w7hd.js (3)
 * attribution: placement 3
 */
import { UNWRITABLE_ENCODING_REASONS } from "./constants.js";

//@ chunk-p223w7hd.js:1511-1989 placement
/**
 * Edit/Write 拒绝写入时的说明：文件编码不是 UTF-8/UTF-16LE（或含无法解码字节）时提示改用其他方式修改。
 */
function fileWriteRefusalMessage(reason) {
  return `File ${UNWRITABLE_ENCODING_REASONS[reason]}. These tools write UTF-8 (or UTF-16LE behind its byte-order mark) and never convert a file's encoding on their own, so nothing was written. If the file is text, make the change with a shell command that reads and writes it in its own encoding (iconv, or PowerShell Get-Content/Set-Content -Encoding), or ask the user whether to convert it to UTF-8 first. To replace the whole file with new UTF-8 text anyway, delete it first, then Write it.`;
}
//@ chunk-p223w7hd.js:1989-2244 placement
/**
 * Read 结果尾部附加的编码提示：非 UTF-8 文件说明 U+FFFD 替换，并提醒 Edit/Write 会拒绝。
 */
function fileReadEncodingNote(notText) {
  let notTextReason = notText === "not_utf8" ? " Its undecodable bytes show above as U+FFFD." : "";
  return `[This file ${UNWRITABLE_ENCODING_REASONS[notText]}.${notTextReason} Edit and Write will refuse it: change it with a shell command that keeps its encoding, or ask the user whether to convert it to UTF-8.]`;
}
//@ chunk-p223w7hd.js:2244-2319 placement
class FileStateError extends Error {
  constructor(message) {
    super(message);
    this.name = "FileStateError";
  }
}
export { fileReadEncodingNote, FileStateError, fileWriteRefusalMessage };
