/**
 * tools/AskUserQuestionTool/prompt.ts
 *
 * AskUserQuestion 工具名常量与 ui.render 请求识别；本模块还混入了 DOM innerHTML 访问与模型限制提示等误归代码
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AskUserQuestionTool/prompt.ts
 * pieces: chunk-5btfj7kh.js (4), chunk-c0pq6qyx.js (1)
 * attribution: placement 1, layout 2, callgraph-fingerprint 1, fingerprint 1
 */
import { ENTER_PLAN_MODE_TOOL_NAME } from "../EnterPlanModeTool/constants.js";
import { EXITPLANMODE } from "../ExitPlanModeTool/constants.js";
import { fetchAnchorPageSource } from "../../services/artifacts/comments/pageAnchors.js";

//@ chunk-5btfj7kh.js:263-418 placement (2.1.88 match: ASK_USER_QUESTION_TOOL_NAME, 0.446)
/**
 * AskUserQuestion 名称常量、header 最长 12 字符、追问请求文本。
 */
var ASKUSERQUESTION = "AskUserQuestion";
var MAX_QUESTION_HEADER_CHARS = 12;
var FOLLOW_UP_REQUEST_TEXT = "The user asked for more questions";
var FOLLOW_UP_REQUEST_NOTE = `${FOLLOW_UP_REQUEST_TEXT} before answering; this is a request for another round, not an answer.`;
//@ chunk-5btfj7kh.js:418-553 layout
/**
 * 把值规整为单行并转义反斜杠与双引号，非字符串返回空串。
 */
function escapeDoubleQuoted(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\s\u0085]+/g, " ")
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}
//@ chunk-5btfj7kh.js:553-645 layout
/**
 * 数字或布尔直接转字符串，其余交给 escapeDoubleQuoted 规整并转义，用于把预览规格值写进提示词。
 */
function stringifyPromptScalar(value) {
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return escapeDoubleQuoted(value);
}
//@ chunk-5btfj7kh.js:645-4504 callgraph-fingerprint (2.1.88 match: DESCRIPTION, 0.26)
/**
 * AskUserQuestion 的 description 与各段 prompt 文本（基础用法、计划模式说明、扩展问题说明、只在必要时提问、问题需自足、preview 说明）。
 */
var ASK_USER_QUESTION_DESCRIPTION =
  "Asks the user multiple choice questions to gather information, clarify ambiguity, understand preferences, make decisions or offer them choices.";
var PREVIEW_FEATURE_PROMPTS = {
  markdown: `
Preview feature:
Use the optional \`preview\` field on options when presenting concrete artifacts that users need to visually compare:
- ASCII mockups of UI layouts or components
- Code snippets showing different implementations
- Diagram variations
- Configuration examples

Preview content is rendered as markdown in a monospace box. Multi-line text with newlines is supported. When any option has a preview, the UI switches to a side-by-side layout with a vertical option list on the left and preview on the right. Do not use previews for simple preference questions where labels and descriptions suffice. Note: previews are only supported for single-select questions (not multiSelect).
`,
  html: `
Preview feature:
Use the optional \`preview\` field on options when presenting concrete artifacts that users need to visually compare:
- HTML mockups of UI layouts or components
- Formatted code snippets showing different implementations
- Visual comparisons or diagrams

Preview content must be a self-contained HTML fragment (no <html>/<body> wrapper, no <script> or <style> tags \u2014 use inline style attributes instead). Do not use previews for simple preference questions where labels and descriptions suffice. Note: previews are only supported for single-select questions (not multiSelect).
`,
};
var ASK_USER_QUESTION_BASE_PROMPT = `Use this tool only when you are blocked on a decision that is genuinely the user's to make: one you cannot resolve from the request, the code, or sensible defaults.

Usage notes:
- Users will always be able to select "Other" to provide custom text input
- Use multiSelect: true to allow multiple answers to be selected for a question
- If you recommend a specific option, make that the first option in the list and add "(Recommended)" at the end of the label
`;
var ASK_USER_QUESTION_PROMPT_WITH_PLAN_NOTE = `${ASK_USER_QUESTION_BASE_PROMPT}
Plan mode note: To switch into plan mode, use ${ENTER_PLAN_MODE_TOOL_NAME} (not this tool). Once in plan mode, use this tool to clarify requirements or choose between approaches BEFORE finalizing your plan. Do NOT use this tool to ask "Is my plan ready?", "Should I proceed?", or otherwise reference "the plan" in questions \u2014 the user cannot see the plan until you call ${EXITPLANMODE} for approval.
`;
var EXTENDED_QUESTIONS_PROMPT = `
Extended questions (this host renders them):
- Put the most important question first.
- Omit "kind" for an ordinary choice question. Use "kind": "text" for an open-ended question (a text box, no options) and "kind": "number" with "min"/"max" (optionally "step", "defaultValue", "unit") for a quantity. Prefer choices whenever the likely answers can be listed.
- Set multiSelect: true on choice questions unless the options are mutually exclusive (people answering are often still exploring).
- Optional "title" is one short line above the questions; optional per-question "description" is one helper line. Option descriptions are optional here too: add one only when the label alone would be ambiguous.
- Do not add "Other" or "Skip" options: the user can always type their own answer or leave a question unanswered. The user can also ask you for more questions; when the result says so, call this tool again with follow-up questions before doing the task.
`;
var ASK_ONLY_WHEN_NEEDED_PROMPT = `
Reserve this for decisions where the user's answer changes what you do next \u2014 not for choices with a conventional default or facts you can verify in the codebase yourself. In those cases pick the obvious option, mention it in your response, and proceed.
`;
var STANDALONE_QUESTION_PROMPT = `
The user may see only the question dialog: tool results and text you wrote earlier in this turn may not be on their screen while it is open. Make each question stand on its own: if it depends on something you found, say so briefly, and name the items you are asking about in the question itself.
`;
//@ chunk-c0pq6qyx.js:31131-31245 fingerprint (2.1.88 match: PREVIEW_FEATURE_PROMPT, 0.335)
async function PREVIEW_FEATURE_PROMPT(request) {
  let anchorPageSource = await fetchAnchorPageSource(request);
  return anchorPageSource === undefined ||
    (request.quotedToAudience === true && !anchorPageSource.audienceSees)
    ? undefined
    : anchorPageSource.html;
}
export {
  ASKUSERQUESTION,
  FOLLOW_UP_REQUEST_TEXT,
  FOLLOW_UP_REQUEST_NOTE,
  MAX_QUESTION_HEADER_CHARS,
  ASK_USER_QUESTION_DESCRIPTION,
  ASK_USER_QUESTION_BASE_PROMPT,
  ASK_USER_QUESTION_PROMPT_WITH_PLAN_NOTE,
  ASK_ONLY_WHEN_NEEDED_PROMPT,
  EXTENDED_QUESTIONS_PROMPT,
  STANDALONE_QUESTION_PROMPT,
  PREVIEW_FEATURE_PROMPTS,
  escapeDoubleQuoted,
  stringifyPromptScalar,
  PREVIEW_FEATURE_PROMPT,
};
