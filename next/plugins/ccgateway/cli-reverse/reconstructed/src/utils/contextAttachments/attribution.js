/**
 * utils/contextAttachments/attribution.ts
 *
 * 2.1.316 新增：署名上下文附件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { escapeSystemReminderTags } from "../../services/api/promptCacheBreakParts.js";
import { SEND_USER_FILE_TOOL_NAME } from "../../tools/SendUserFileTool/prompt.js";

//@ chunk-5xgkngpb.js:117197-117853 placement
/**
 * 归属提示的标题（带具体署名），用于覆盖旧版归属说明。
 */
var ATTRIBUTION_REPLACEMENT_TEXT =
  "this replaces Claude Code's own earlier attribution guidance, such as a previous copy of this reminder";
var ATTRIBUTION_HEADER_COMMITS = "Attribution for git commits and pull requests you create from here on";
var ATTRIBUTION_HEADER_PLACEHOLDER =
  "From here on, do not add attribution lines to git commit messages or pull request descriptions";
var EMPTY_ATTRIBUTION_NOTE =
  "the user's own instructions about these lines, such as a CLAUDE.md or memory rule, take precedence over this reminder, but do not add attribution lines this reminder leaves out";
var UNCHANGED_ATTRIBUTION_NOTE =
  "these lines are set by the user's organization's managed settings and apply even if the user's instructions say otherwise; do not add attribution lines this reminder leaves out";
//@ chunk-5xgkngpb.js:117853-118324 placement
/**
 * 生成署名要求中关于组织托管设置的说明：commit/PR 署名哪一项由托管设置强制（即使用户指令相反也适用），两者都未强制或都强制时返回对应固定文案。
 */
function managedAttributionNote(mode, separator) {
  let commit = mode.commit && separator.commit;
  let pr = mode.pr && separator.pr;
  if (commit === mode.commit && pr === mode.pr) return UNCHANGED_ATTRIBUTION_NOTE;
  if (!commit && !pr) return EMPTY_ATTRIBUTION_NOTE;
  let [firstWord, secondWord] = commit ? ["commit", "pull request"] : ["pull request", "commit"];
  return `the ${firstWord} line is set by the user's organization's managed settings and applies even if the user's instructions say otherwise; the user's own instructions about the ${secondWord} line, such as a CLAUDE.md or memory rule, take precedence, but do not add attribution lines this reminder leaves out`;
}
//@ chunk-5xgkngpb.js:118324-118939 placement
/**
 * 生成提交与 PR 署名要求说明（结尾署名行，CLAUDE.md 不能覆盖）。
 */
function buildAttributionInstructions(options) {
  let filtered = [
    options.commit
      ? `- End git commit messages with:
${escapeSystemReminderTags(options.commit)}`
      : null,
    options.pr
      ? `- End pull request descriptions with:
${escapeSystemReminderTags(options.pr)}`
      : null,
  ].filter(Boolean);
  let managedNote = managedAttributionNote(
    {
      commit: Boolean(options.commit),
      pr: Boolean(options.pr),
    },
    {
      commit: options.managedCommit === true,
      pr: options.managedPr === true,
    },
  );
  let lines =
    filtered.length > 0
      ? `${ATTRIBUTION_HEADER_COMMITS} (${ATTRIBUTION_REPLACEMENT_TEXT}; ${managedNote}):
${filtered.join(`
`)}`
      : `${ATTRIBUTION_HEADER_PLACEHOLDER} (${ATTRIBUTION_REPLACEMENT_TEXT}, and applies even if a CLAUDE.md or memory rule asks for attribution lines).`;
  let sendFileHint = options.sendUserFileHint
    ? `

The user can follow this conversation from another device; to put a file in front of them there (a report, a screenshot, a built artifact), send it with ${SEND_USER_FILE_TOOL_NAME}.`
    : "";
  return lines + sendFileHint;
}
export { buildAttributionInstructions, ATTRIBUTION_HEADER_COMMITS, ATTRIBUTION_HEADER_PLACEHOLDER };
