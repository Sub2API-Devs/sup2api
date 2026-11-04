/**
 * services/tips/focusTips.ts
 *
 * 2.1.316 新增：/focus 与解释型输出风格的提示文本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5tyj4c7k.js (2)
 * attribution: placement 2
 */
//@ chunk-5tyj4c7k.js:191-350 placement
/**
 * focus 视图与"边做边教"提示的文案：开启 /focus 的建议、已开启时如何关闭、显示次数上限，以及 outputStyle=explanatory 的提示。
 */
var FOCUS_ON_TIP = "Just want the answer? Run /focus now to hide the steps along the way";
var FOCUS_OFF_TIP = "Focus view is on and the steps are hidden. Run /focus to show them";
var FOCUS_TIP_MAX = 10;
//@ chunk-5tyj4c7k.js:350-524 placement
/**
 * "想让 Claude 边做边教吗？"提示的标题、命令名、设置值与完整文案。
 */
var TEACH_TIP_TITLE = "Want Claude to teach as it works?";
var CONFIG = "config";
var TEACH_TIP_SETTING = "outputStyle=explanatory";
var TEACH_TIP_TEXT = `${"Want Claude to teach as it works?"} \xB7 /${"config"} outputStyle=explanatory`;
export {
  FOCUS_ON_TIP,
  FOCUS_OFF_TIP,
  TEACH_TIP_TEXT,
  TEACH_TIP_TITLE,
  CONFIG,
  TEACH_TIP_SETTING,
  FOCUS_TIP_MAX,
};
