/**
 * utils/bgExitSidecars.ts
 *
 * 2.1.316 新增。记录后台进程退出原因/详情的旁路文件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ndcj3jv5.js (7)
 * attribution: placement 7
 */
import { writeFileSync, lstatSync, rmSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";

//@ chunk-ndcj3jv5.js:463-525 placement
/**
 * 退出详情文本的最大长度（200）。
 */
var EXIT_CAUSE = "exit-cause";
var BG_EXIT_CAUSE_SESSION_IN_USE = "session_in_use";
var EXIT_DETAIL = "exit-detail";
var MAX_EXIT_DETAIL_CHARS = 200;
//@ chunk-ndcj3jv5.js:525-615 placement
function setBgExitCause(cause, jobDir) {
  let dir = jobDir ?? process.env.CLAUDE_JOB_DIR;
  if (!dir) return;
  try {
    writeFileSync(join(dir, EXIT_CAUSE), cause);
  } catch {}
}
//@ chunk-ndcj3jv5.js:615-744 placement
/**
 * 记录后台进程退出原因/详情的旁路文件。
 */
function setBgExitDetail(cause, detail, jobDir) {
  let dir = jobDir ?? process.env.CLAUDE_JOB_DIR;
  let trimmed = detail.trim();
  if (!dir || !trimmed) return;
  try {
    writeFileSync(
      join(dir, EXIT_DETAIL),
      `${cause}
${trimmed.slice(0, MAX_EXIT_DETAIL_CHARS)}`,
    );
  } catch {}
}
//@ chunk-ndcj3jv5.js:744-780 placement
/**
 * 删除退出原因/详情文件（名字配错，与插件无关）。
 */
function discardBgExitSidecars(jobDir) {
  readAndDeleteSmallFile(join(jobDir, EXIT_CAUSE));
  readAndDeleteSmallFile(join(jobDir, EXIT_DETAIL));
}
//@ chunk-ndcj3jv5.js:780-813 placement
function readAndClearBgExitCause(jobDir) {
  return readAndDeleteSmallFile(join(jobDir, EXIT_CAUSE));
}
//@ chunk-ndcj3jv5.js:813-933 placement
/**
 * 读取匹配的退出详情（名字配错）。
 */
function readAndClearBgExitDetail(jobDir, expectedCause) {
  let contents = readAndDeleteSmallFile(join(jobDir, EXIT_DETAIL));
  if (!contents) return;
  let index = contents.indexOf(`
`);
  return index !== -1 && contents.slice(0, index) === expectedCause ? contents.slice(index + 1) : undefined;
}
//@ chunk-ndcj3jv5.js:933-1085 placement (2.1.88 match: convertDirectoryToZipInPlace, 1)
function readAndDeleteSmallFile(path) {
  try {
    let stats = lstatSync(path);
    if (!stats.isFile() || stats.size > 65536) {
      try {
        rmSync(path, {
          recursive: true,
          force: true,
        });
      } catch {}
      return;
    }
    let file = readFileSync(path, "utf8");
    unlinkSync(path);
    return file;
  } catch {
    return;
  }
}
export {
  setBgExitCause,
  BG_EXIT_CAUSE_SESSION_IN_USE,
  discardBgExitSidecars,
  readAndClearBgExitCause,
  readAndClearBgExitDetail,
  setBgExitDetail,
};
