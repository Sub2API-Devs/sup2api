/**
 * main/resumeFlagScan.ts
 *
 * 2.1.316 新增：扫描命令行是否带 --resume/--from-pr 等恢复参数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7dqf31r1.js (2)
 * attribution: placement 2
 */

//@ chunk-7dqf31r1.js:10192-10259 placement
function argsBeforeDoubleDash(e) {
  let index = e.indexOf("--");
  return index === -1 ? e : e.slice(0, index);
}
//@ chunk-7dqf31r1.js:10259-10517 placement
function hasResumeFlag(e) {
  let t = argsBeforeDoubleDash(e);
  if (
    t.includes("-r") ||
    t.includes("--resume") ||
    t.includes("--from-pr") ||
    t.some((o) => o.startsWith("--resume=") || o.startsWith("--from-pr="))
  )
    return "resume";
  if (t.includes("-c") || t.includes("--continue")) return "continue";
  return "fresh";
}
export { hasResumeFlag, argsBeforeDoubleDash };
