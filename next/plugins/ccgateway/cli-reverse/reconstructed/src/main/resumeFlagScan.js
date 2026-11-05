/**
 * main/resumeFlagScan.ts
 *
 * 2.1.316 新增：扫描命令行是否带 --resume/--from-pr 等恢复参数
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9ys74nhz.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-9ys74nhz.js:10658-10725 placement
function argsBeforeDoubleDash(args) {
  let index = args.indexOf("--");
  return index === -1 ? args : args.slice(0, index);
}
//@ chunk-9ys74nhz.js:10725-10983 placement
function hasResumeFlag(args) {
  let flagArgs = argsBeforeDoubleDash(args);
  if (
    flagArgs.includes("-r") ||
    flagArgs.includes("--resume") ||
    flagArgs.includes("--from-pr") ||
    flagArgs.some((arg) => arg.startsWith("--resume=") || arg.startsWith("--from-pr="))
  )
    return "resume";
  if (flagArgs.includes("-c") || flagArgs.includes("--continue")) return "continue";
  return "fresh";
}
export { hasResumeFlag, argsBeforeDoubleDash };
