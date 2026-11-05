/**
 * commands/review/reviewPosting.ts
 *
 * 2.1.316 新增：审查结果发到 GitHub/GitLab 评论与 --fix 修复段落
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ne2890fx.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getPrintOutputFormat } from "../../bootstrap/state.js";
import { matchesToolName } from "../../Tool.js";
import { REPORTFINDINGS } from "../../tools/ReportFindingsTool/constants.js";
import { env } from "../../utils/env.js";
import { isCoworkAny } from "../../utils/entrypointKinds.js";
import { isBridgeEnvironment } from "../../utils/remoteEnvironment.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";
import { glabMrId, glabMrProjectUrl } from "../../utils/detectRepository.js";
import { VERIFY } from "../../skills/bundled/bundledSkillNames.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ne2890fx.js:79698-79775 placement
var REMOTE_ENTRYPOINTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ne2890fx.js:79698", () => {
  REMOTE_ENTRYPOINTS = new Set(["remote", "remote_desktop", "remote_mobile", "remote_trigger"]);
});
//@ chunk-ne2890fx.js:79775-80216 placement
function getReportFindingsMode(context) {
  if (context.options?.isSkillPreload || context.agentId !== undefined) return;
  let printOutputFormat = getPrintOutputFormat();
  if (printOutputFormat === "text" || printOutputFormat === "json") return;
  if (!context.options?.tools?.some((tool) => matchesToolName(tool, REPORTFINDINGS))) return;
  if (env.CLAUDE_CODE_REPORT_FINDINGS) return "spawn";
  let messageClientPlatform = context.options?.messageClientPlatform;
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return (messageClientPlatform === "desktop_app" || messageClientPlatform === "web_claude_ai") &&
    !isCoworkAny() &&
    (isBridgeEnvironment() ||
      (Boolean(env.CLAUDE_CODE_REMOTE) &&
        CLAUDE_CODE_ENTRYPOINT !== undefined &&
        REMOTE_ENTRYPOINTS.has(CLAUDE_CODE_ENTRYPOINT))) &&
    getFeatureValue_SESSION_PINNED("tengu_purring_micali", true)
    ? "message"
    : undefined;
}
//@ chunk-ne2890fx.js:80216-80804 placement
var GITHUB_COMMENT_SECTION = `

## Posting to GitHub (--comment)

The \`--comment\` flag was passed. After producing the findings list, if the
review target is a GitHub PR, post each finding as an inline PR comment via
\`mcp__github_inline_comment__create_inline_comment\` (one call per finding;
include a suggestion block only when it fully fixes the issue). If that tool
is not available in this session, fall back to \`gh api\` (repos/{owner}/{repo}/pulls/{pr}/comments)
or print the findings instead. If the target is not a PR, print the findings
to the terminal and note that \`--comment\` was ignored.
`;
//@ chunk-ne2890fx.js:80804-81601 placement
function buildGitLabCommentSection(target) {
  let mrId = glabMrId(target);
  let projectUrl = glabMrProjectUrl(target);
  let repoArg = projectUrl ? ` -R ${projectUrl}` : "";
  return `

## Posting to GitLab (--comment)

The \`--comment\` flag was passed. After producing the findings list, if the
review target is a GitLab merge request, post the findings as one general MR
note via \`${`glab mr note${mrId ? ` ${mrId}` : ""}${repoArg} -m "<body>"`}\`${projectUrl ? "" : " from inside that project's checkout"}
(every finding with its file:line, the issue, and the suggested fix). glab has no single verb for line-anchored
comments; those require \`glab api projects/:id/merge_requests/:iid/discussions\`,
so post the general note unless the user asks for inline threads. If glab is
not available in this session, print the findings instead. If the target is
not an MR, print the findings to the terminal and note that \`--comment\` was
ignored.
`;
}
//@ chunk-ne2890fx.js:81601-82345 placement
/**
 * "若之后修复了发现"的提示段与逐行结果说明（报告工具再次调用带 outcome）。
 */
var REPORT_OUTCOMES_SECTION = `call ${REPORTFINDINGS} again with the same findings, each
carrying an \`outcome\`: \`fixed\`, \`no_change_needed\` (the finding was wrong or
already handled), or \`skipped\` (real but not applied). Do not repeat the
findings as text`;
var REPORT_OUTCOMES_LATER_SECTION = `

## If findings are fixed later

Whenever reported findings get fixed later in this session - the user asks you
to fix them, or later work fixes them incidentally - you MUST ${REPORT_OUTCOMES_SECTION}.
Make that call immediately after the fixes land, before any prose summary; the
host UI's per-finding status updates only from it, and without it the findings
stay marked unresolved.
`;
var REPORT_OUTCOMES_LINE_TEXT = `After the call, give one line per finding with its outcome: this session can
also be read from a client that does not show the tool call.
`;
//@ chunk-ne2890fx.js:82345-82985 placement
function buildFixSection(hasReportTool) {
  return `

## Applying fixes (--fix)

The \`--fix\` flag was passed. After producing the findings list, apply the
findings to the working tree instead of stopping at the report: fix each one
directly \u2014 correctness bugs and reuse/simplification/efficiency cleanups alike.
Skip any finding whose fix would change intended behavior, require changes well
outside the reviewed diff, or that you judge to be a false positive \u2014 note the
skip rather than arguing with it. ${
    hasReportTool
      ? `Then ${REPORT_OUTCOMES_SECTION}; after the call, give one line per skipped finding saying why.`
      : `Finish with a brief summary of what was fixed
and what was skipped.`
  }
`;
}
//@ chunk-ne2890fx.js:82985-83336 placement
var AFTER_REVIEW_SECTION = `

## After the review

After the findings are reported (and applied, when --fix was passed): if \`/${VERIFY}\` has not run this session and the diff has a runtime surface (not test-only or docs-only per the pre-ship exemptions), invoke \`/${VERIFY}\` now \u2014 this review checks that the diff reads right; \`/${VERIFY}\` checks that it runs right.
`;
export {
  AFTER_REVIEW_SECTION,
  getReportFindingsMode,
  buildGitLabCommentSection,
  GITHUB_COMMENT_SECTION,
  buildFixSection,
  REPORT_OUTCOMES_LATER_SECTION,
  REPORT_OUTCOMES_LINE_TEXT,
};
