/**
 * utils/worktreeResumeHint.ts
 *
 * 2.1.316 新增：会话在 worktree 中运行时的恢复提示；"运行某命令"提示文本等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z20c443b.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { normalizeUuidOrNull } from "./agentId.js";
import { parseSkillLimit } from "../skills/syncedSkills.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { validateWorktreeSlug_2 } from "./worktree.js";

//@ chunk-z20c443b.js:14726-14770 placement
/**
 * 是否为可直接放进命令的参数。
 */
function isSafeCliArg(arg) {
  return /^\w[\w.@-]*$/.test(arg);
}
//@ chunk-z20c443b.js:14770-14851 placement
/**
 * 生成 claude 子命令文本。
 */
function claudeCommand(flag, sessionId, extra) {
  if (!isSafeCliArg(sessionId)) return null;
  return `claude ${flag} ${sessionId}${extra ? ` ${extra}` : ""}`;
}
//@ chunk-z20c443b.js:14851-14963 placement
/**
 * "运行某命令"提示文本。
 */
function runCommandHint(flag, sessionId, { extra, tail = "", fallback }) {
  let command = claudeCommand(flag, sessionId, extra);
  return command === null ? fallback : `run \`${command}\`${tail ? ` ${tail}` : ""}`;
}
//@ chunk-z20c443b.js:14963-15105 placement
var WORKTREE_RESUME_LINES = [
  "This session ran in a worktree",
  "In its folder, run the command below to resume in it",
  "To find that folder, try git worktree list",
];
//@ chunk-z20c443b.js:15105-15929 placement
/**
 * 会话在 worktree 中运行时的恢复提示。
 */
function worktreeResumeHint({ sessionId, worktree, columns, envAssignment, launchFlags = "" }) {
  let baseCommand = envAssignment === undefined ? "claude" : `${envAssignment} claude`;
  let uuid = normalizeUuidOrNull(sessionId);
  let arg = uuid === null ? "none" : "id";
  let idSuffix = uuid === null ? "" : ` ${uuid}`;
  let skillLimit = parseSkillLimit(columns);
  let fits =
    launchFlags !== "" &&
    (!/[/.]/.test(launchFlags) ||
      (skillLimit !== undefined &&
        bunStringWidth(`${baseCommand} ${launchFlags} --resume${idSuffix}`) <= skillLimit));
  let launcher = fits ? `${baseCommand} ${launchFlags}` : baseCommand;
  if (worktree === undefined)
    return {
      advice: [],
      command: `${launcher} --resume${idSuffix}`,
      arg,
      flags: fits,
      worktree: "absent",
    };
  let { name: slug, recordCleared } = worktree;
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
      flags: fits,
      ...found,
    };
  return {
    advice: recordCleared ? WORKTREE_RESUME_LINES : [],
    command: `${launcher} --resume${idSuffix}`,
    arg,
    flags: fits,
    worktree: candidates.length === 0 ? "refused" : skillLimit !== undefined ? "too_wide" : "width_unknown",
  };
}
export { runCommandHint, claudeCommand, isSafeCliArg, worktreeResumeHint };
