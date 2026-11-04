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
import { normalizeUuidOrNull } from "./agentId.js";
import { parseSkillLimit } from "../skills/syncedSkills.js";
import { validateWorktreeSlug_2 } from "./worktree.js";
import { bunStringWidth } from "../ink/stringWidth.js";

//@ chunk-dcmhvw5a.js:14849-14893 placement
/**
 * 是否为可直接放进命令的参数。
 */
function isSafeCliArg(arg) {
  return /^\w[\w.@-]*$/.test(arg);
}
//@ chunk-dcmhvw5a.js:14893-14974 placement
/**
 * 生成 claude 子命令文本。
 */
function claudeCommand(flag, sessionId, extra) {
  if (!isSafeCliArg(sessionId)) return null;
  return `claude ${flag} ${sessionId}${extra ? ` ${extra}` : ""}`;
}
//@ chunk-dcmhvw5a.js:14974-15086 placement
/**
 * "运行某命令"提示文本。
 */
function runCommandHint(flag, sessionId, { extra, tail = "", fallback }) {
  let command = claudeCommand(flag, sessionId, extra);
  return command === null ? fallback : `run \`${command}\`${tail ? ` ${tail}` : ""}`;
}
//@ chunk-dcmhvw5a.js:15086-15228 placement
var WORKTREE_RESUME_LINES = [
  "This session ran in a worktree",
  "In its folder, run the command below to resume in it",
  "To find that folder, try git worktree list",
];
//@ chunk-dcmhvw5a.js:15228-15920 placement
/**
 * 会话在 worktree 中运行时的恢复提示。
 */
function worktreeResumeHint({ sessionId, worktree, columns, envAssignment }) {
  let launcher = envAssignment === undefined ? "claude" : `${envAssignment} claude`;
  let uuid = normalizeUuidOrNull(sessionId);
  let arg = uuid === null ? "none" : "id";
  let idSuffix = uuid === null ? "" : ` ${uuid}`;
  if (worktree === undefined)
    return {
      advice: [],
      command: `${launcher} --resume${idSuffix}`,
      arg,
      worktree: "absent",
    };
  let { name: slug, recordCleared } = worktree;
  let skillLimit = parseSkillLimit(columns);
  let candidates =
    typeof slug === "string" && !slug.startsWith("-") && validateWorktreeSlug_2(slug) === undefined
      ? [
          {
            command: `${launcher} --worktree "${slug}" --resume${idSuffix}`,
            worktree: "printed",
          },
          {
            command: `${launcher} -w "${slug}" -r${idSuffix}`,
            worktree: "printed_short_flags",
          },
        ]
      : [];
  let found = candidates.find(
    ({ command }) => skillLimit !== undefined && bunStringWidth(command) <= skillLimit,
  );
  if (found !== undefined)
    return {
      advice: [],
      arg,
      ...found,
    };
  return {
    advice: recordCleared ? WORKTREE_RESUME_LINES : [],
    command: `${launcher} --resume${idSuffix}`,
    arg,
    worktree: candidates.length === 0 ? "refused" : skillLimit !== undefined ? "too_wide" : "width_unknown",
  };
}
export { runCommandHint, claudeCommand, isSafeCliArg, worktreeResumeHint };
