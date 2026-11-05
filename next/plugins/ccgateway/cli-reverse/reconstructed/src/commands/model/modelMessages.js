/**
 * commands/model/modelMessages.ts
 *
 * 2.1.316 新增：/model 与 /fast 切换结果的提示文案（含云会话切换失败）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-5xgkngpb.js:5002063-5002287 placement
/**
 * 把文本包成 Markdown 行内代码：换行换成空格，反引号围栏比内容里最长的反引号串多一个，首尾是反引号时补空格。
 */
function toInlineCode(text) {
  let replaced = text.replace(/\r\n?|\n/g, " ");
  if (replaced === "") return "` `";
  let longest = replaced.match(/`+/g)?.reduce((acc, run) => Math.max(acc, run.length), 0) ?? 0;
  let fence = "`".repeat(longest + 1);
  let pad = replaced.startsWith("`") || replaced.endsWith("`") ? " " : "";
  return `${fence}${pad}${replaced}${pad}${fence}`;
}
//@ chunk-5xgkngpb.js:5002287-5002433 placement
/**
 * 把文本里的行内代码片段逐个交给回调替换（去掉围栏内两侧的单个空格）。
 */
function replaceInlineCode(text, replacer) {
  return text.replace(/(`+)(.+?)\1/g, (match, fence, code) => {
    let hasPad = code.startsWith(" ") && code.endsWith(" ") && code.trim() !== "";
    return replacer(hasPad ? code.slice(1, -1) : code);
  });
}
//@ chunk-5xgkngpb.js:5002433-5002800 placement
/**
 * /model、/fast 和沙箱切换结果消息的固定文案前缀（VAs 汇总，用于识别这类结果消息）。
 */
var SET_MODEL_PREFIX = "Set model to ";
var SAVED_AS_DEFAULT_SUFFIX = " and saved as your default for new sessions";
var KEPT_MODEL_PREFIX = "Kept model as ";
var CURRENT_MODEL_PREFIX = "Current model: ";
var CLOUD_SWITCH_NO_RESPONSE_PREFIX = "No response from the cloud session \u2014 the switch to ";
var CLOUD_SWITCH_FAILED_PREFIX = "Cloud session couldn't switch to ";
var SANDBOX_NOT_CHANGED_PREFIX = "\u2717 Sandbox settings not changed: ";
var FAST_MODE_ON_TEXT = "Fast mode ON";
var MODEL_SET_TO_INFIX = " \xB7 model set to ";
var MODEL_RESULT_PREFIXES = [
  SET_MODEL_PREFIX,
  KEPT_MODEL_PREFIX,
  CURRENT_MODEL_PREFIX,
  CLOUD_SWITCH_NO_RESPONSE_PREFIX,
  CLOUD_SWITCH_FAILED_PREFIX,
  SANDBOX_NOT_CHANGED_PREFIX,
];
var ANSI_SGR_REGEX = /\x1b\[[0-9;]*m/g;
var MODEL_RESULT_MAX_LINES = 4;
export {
  ANSI_SGR_REGEX,
  FAST_MODE_ON_TEXT,
  MODEL_SET_TO_INFIX,
  MODEL_RESULT_MAX_LINES,
  MODEL_RESULT_PREFIXES,
  replaceInlineCode,
  SET_MODEL_PREFIX,
  toInlineCode,
  SAVED_AS_DEFAULT_SUFFIX,
  CURRENT_MODEL_PREFIX,
  KEPT_MODEL_PREFIX,
  CLOUD_SWITCH_NO_RESPONSE_PREFIX,
  CLOUD_SWITCH_FAILED_PREFIX,
  SANDBOX_NOT_CHANGED_PREFIX,
};
