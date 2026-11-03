/**
 * utils/contextAttachments/attribution.ts
 *
 * 2.1.316 新增：署名上下文附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { escapeSystemReminderTags } from "../../services/api/promptCacheBreakParts.js";
import { SEND_USER_FILE_TOOL_NAME } from "../../tools/SendUserFileTool/prompt.js";

//@ chunk-e6aww6q8.js:114018-114674 placement
var ATTRIBUTION_REPLACEMENT_TEXT =
    "this replaces Claude Code's own earlier attribution guidance, such as a previous copy of this reminder",
  ubt = "Attribution for git commits and pull requests you create from here on",
  cbt = "From here on, do not add attribution lines to git commit messages or pull request descriptions",
  jio =
    "the user's own instructions about these lines, such as a CLAUDE.md or memory rule, take precedence over this reminder, but do not add attribution lines this reminder leaves out",
  Gio =
    "these lines are set by the user's organization's managed settings and apply even if the user's instructions say otherwise; do not add attribution lines this reminder leaves out";
/**
 * 生成署名要求中关于组织托管设置的说明：commit/PR 署名哪一项由托管设置强制（即使用户指令相反也适用），两者都未强制或都强制时返回对应固定文案。
 */
//@ chunk-e6aww6q8.js:114674-115145 placement
function managedAttributionNote(e, n) {
  let r = e.commit && n.commit,
    s = e.pr && n.pr;
  if (r === e.commit && s === e.pr) return Gio;
  if (!r && !s) return jio;
  let [h, y] = r ? ["commit", "pull request"] : ["pull request", "commit"];
  return `the ${h} line is set by the user's organization's managed settings and applies even if the user's instructions say otherwise; the user's own instructions about the ${y} line, such as a CLAUDE.md or memory rule, take precedence, but do not add attribution lines this reminder leaves out`;
}
/**
 * 生成提交与 PR 署名要求说明（结尾署名行，CLAUDE.md 不能覆盖）。
 */
//@ chunk-e6aww6q8.js:115145-115760 placement
function buildAttributionInstructions(e) {
  let filtered = [
      e.commit
        ? `- End git commit messages with:
${escapeSystemReminderTags(e.commit)}`
        : null,
      e.pr
        ? `- End pull request descriptions with:
${escapeSystemReminderTags(e.pr)}`
        : null,
    ].filter(Boolean),
    r = managedAttributionNote(
      { commit: Boolean(e.commit), pr: Boolean(e.pr) },
      { commit: e.managedCommit === !0, pr: e.managedPr === !0 },
    ),
    s =
      filtered.length > 0
        ? `${ubt} (${ATTRIBUTION_REPLACEMENT_TEXT}; ${r}):
${filtered.join(`
`)}`
        : `${cbt} (${ATTRIBUTION_REPLACEMENT_TEXT}, and applies even if a CLAUDE.md or memory rule asks for attribution lines).`,
    h = e.sendUserFileHint
      ? `

The user can follow this conversation from another device; to put a file in front of them there (a report, a screenshot, a built artifact), send it with ${SEND_USER_FILE_TOOL_NAME}.`
      : "";
  return s + h;
}

export { buildAttributionInstructions, ubt, cbt };
