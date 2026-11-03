/**
 * commands/model/modelMessages.ts
 *
 * 2.1.316 新增：/model 与 /fast 切换结果的提示文案（含云会话切换失败）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */

/**
 * 把文本包成 Markdown 行内代码：换行换成空格，反引号围栏比内容里最长的反引号串多一个，首尾是反引号时补空格。
 */
//@ chunk-e6aww6q8.js:4861199-4861423 placement
function toInlineCode(e) {
  let replaced = e.replace(/\r\n?|\n/g, " ");
  if (replaced === "") return "` `";
  let r = replaced.match(/`+/g)?.reduce((y, S) => Math.max(y, S.length), 0) ?? 0,
    repeat = "`".repeat(r + 1),
    h = replaced.startsWith("`") || replaced.endsWith("`") ? " " : "";
  return `${repeat}${h}${replaced}${h}${repeat}`;
}
/**
 * 把文本里的行内代码片段逐个交给回调替换（去掉围栏内两侧的单个空格）。
 */
//@ chunk-e6aww6q8.js:4861423-4861569 placement
function replaceInlineCode(e, n) {
  return e.replace(/(`+)(.+?)\1/g, (r, s, h) => {
    let y = h.startsWith(" ") && h.endsWith(" ") && h.trim() !== "";
    return n(y ? h.slice(1, -1) : h);
  });
}
/**
 * /model、/fast 和沙箱切换结果消息的固定文案前缀（VAs 汇总，用于识别这类结果消息）。
 */
//@ chunk-e6aww6q8.js:4861569-4861936 placement
var SET_MODEL_PREFIX = "Set model to ",
  SAVED_AS_DEFAULT_SUFFIX = " and saved as your default for new sessions",
  KEPT_MODEL_PREFIX = "Kept model as ",
  CURRENT_MODEL_PREFIX = "Current model: ",
  CLOUD_SWITCH_NO_RESPONSE_PREFIX = "No response from the cloud session \u2014 the switch to ",
  CLOUD_SWITCH_FAILED_PREFIX = "Cloud session couldn't switch to ",
  SANDBOX_NOT_CHANGED_PREFIX = "\u2717 Sandbox settings not changed: ",
  FAST_MODE_ON_TEXT = "Fast mode ON",
  MODEL_SET_TO_INFIX = " \xB7 model set to ",
  MODEL_RESULT_PREFIXES = [
    SET_MODEL_PREFIX,
    KEPT_MODEL_PREFIX,
    CURRENT_MODEL_PREFIX,
    CLOUD_SWITCH_NO_RESPONSE_PREFIX,
    CLOUD_SWITCH_FAILED_PREFIX,
    SANDBOX_NOT_CHANGED_PREFIX,
  ],
  ANSI_SGR_REGEX = /\x1b\[[0-9;]*m/g,
  MODEL_RESULT_MAX_LINES = 4;

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
  KEPT_MODEL_PREFIX,
  CLOUD_SWITCH_NO_RESPONSE_PREFIX,
  CLOUD_SWITCH_FAILED_PREFIX,
  CURRENT_MODEL_PREFIX,
  SANDBOX_NOT_CHANGED_PREFIX,
};
