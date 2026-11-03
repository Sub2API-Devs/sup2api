/**
 * utils/worktreeResumeHint.ts
 *
 * 2.1.316 新增：会话在 worktree 中运行时的恢复提示；"运行某命令"提示文本等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (5)
 * attribution: placement 5
 */
import { Vt } from "./agentId.js";
import { ca } from "../skills/syncedSkills.js";
import { validateWorktreeSlug_2 } from "./worktree.js";
import { bunStringWidth } from "../ink/stringWidth.js";

/**
 * 是否为可直接放进命令的参数。
 */
//@ chunk-dcmhvw5a.js:14849-14893 placement
function isSafeCliArg(e) {
  return /^\w[\w.@-]*$/.test(e);
}
/**
 * 生成 claude 子命令文本。
 */
//@ chunk-dcmhvw5a.js:14893-14974 placement
function claudeCommand(e, n, r) {
  if (!isSafeCliArg(n)) return null;
  return `claude ${e} ${n}${r ? ` ${r}` : ""}`;
}
/**
 * "运行某命令"提示文本。
 */
//@ chunk-dcmhvw5a.js:14974-15086 placement
function runCommandHint(e, n, { extra: extra, tail: tail = "", fallback: fallback }) {
  let c = claudeCommand(e, n, extra);
  return c === null ? fallback : `run \`${c}\`${tail ? ` ${tail}` : ""}`;
}
//@ chunk-dcmhvw5a.js:15086-15228 placement
var WORKTREE_RESUME_LINES = [
  "This session ran in a worktree",
  "In its folder, run the command below to resume in it",
  "To find that folder, try git worktree list",
];
/**
 * 会话在 worktree 中运行时的恢复提示。
 */
//@ chunk-dcmhvw5a.js:15228-15920 placement
function worktreeResumeHint({
  sessionId: sessionId,
  worktree: worktree,
  columns: columns,
  envAssignment: envAssignment,
}) {
  let a = envAssignment === void 0 ? "claude" : `${envAssignment} claude`,
    c = Vt(sessionId),
    g = c === null ? "none" : "id",
    m = c === null ? "" : ` ${c}`;
  if (worktree === void 0) return { advice: [], command: `${a} --resume${m}`, arg: g, worktree: "absent" };
  let { name: f, recordCleared: recordCleared } = worktree,
    y = ca(columns),
    b =
      typeof f === "string" && !f.startsWith("-") && validateWorktreeSlug_2(f) === void 0
        ? [
            { command: `${a} --worktree "${f}" --resume${m}`, worktree: "printed" },
            { command: `${a} -w "${f}" -r${m}`, worktree: "printed_short_flags" },
          ]
        : [],
    found = b.find(({ command: command }) => y !== void 0 && bunStringWidth(command) <= y);
  if (found !== void 0) return { advice: [], arg: g, ...found };
  return {
    advice: recordCleared ? WORKTREE_RESUME_LINES : [],
    command: `${a} --resume${m}`,
    arg: g,
    worktree: b.length === 0 ? "refused" : y !== void 0 ? "too_wide" : "width_unknown",
  };
}

export { runCommandHint, claudeCommand, isSafeCliArg, worktreeResumeHint };
