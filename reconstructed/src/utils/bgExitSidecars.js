/**
 * utils/bgExitSidecars.ts
 *
 * 2.1.316 新增。记录后台进程退出原因/详情的旁路文件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-j3nx1xyn.js (7)
 * attribution: placement 7
 */
import { writeFileSync, lstatSync, rmSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";

//@ chunk-j3nx1xyn.js:462-524 placement
var EXIT_CAUSE = "exit-cause",
  BG_EXIT_CAUSE_SESSION_IN_USE = "session_in_use",
  EXIT_DETAIL = "exit-detail",
  P = 200;
//@ chunk-j3nx1xyn.js:524-614 placement
function setBgExitCause(e, t) {
  let r = t ?? process.env.CLAUDE_JOB_DIR;
  if (!r) return;
  try {
    writeFileSync(join(r, EXIT_CAUSE), e);
  } catch {}
}
/**
 * 记录后台进程退出原因/详情的旁路文件。
 */
//@ chunk-j3nx1xyn.js:614-743 placement
function setBgExitDetail(e, t, r) {
  let n = r ?? process.env.CLAUDE_JOB_DIR,
    trimmed = t.trim();
  if (!n || !trimmed) return;
  try {
    writeFileSync(
      join(n, EXIT_DETAIL),
      `${e}
${trimmed.slice(0, P)}`,
    );
  } catch {}
}
/**
 * 删除退出原因/详情文件（名字配错，与插件无关）。
 */
//@ chunk-j3nx1xyn.js:743-779 placement
function discardBgExitSidecars(e) {
  (readAndDeleteSmallFile(join(e, EXIT_CAUSE)), readAndDeleteSmallFile(join(e, EXIT_DETAIL)));
}
//@ chunk-j3nx1xyn.js:779-812 placement
function readAndClearBgExitCause(e) {
  return readAndDeleteSmallFile(join(e, EXIT_CAUSE));
}
/**
 * 读取匹配的退出详情（名字配错）。
 */
//@ chunk-j3nx1xyn.js:812-932 placement
function readAndClearBgExitDetail(e, t) {
  let r = readAndDeleteSmallFile(join(e, EXIT_DETAIL));
  if (!r) return;
  let index = r.indexOf(`
`);
  return index !== -1 && r.slice(0, index) === t ? r.slice(index + 1) : void 0;
}
//@ chunk-j3nx1xyn.js:932-1084 placement = convertDirectoryToZipInPlace (1)
function readAndDeleteSmallFile(e) {
  try {
    let t = lstatSync(e);
    if (!t.isFile() || t.size > 65536) {
      try {
        rmSync(e, { recursive: !0, force: !0 });
      } catch {}
      return;
    }
    let r = readFileSync(e, "utf8");
    return (unlinkSync(e), r);
  } catch {
    return;
  }
}

export {
  BG_EXIT_CAUSE_SESSION_IN_USE,
  setBgExitCause,
  discardBgExitSidecars,
  readAndClearBgExitCause,
  readAndClearBgExitDetail,
};
