/**
 * utils/messages/pluginPrompts.ts
 *
 * 插件提交的提示词呈现（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5k94rwtv.js (6)
 * attribution: placement 6
 */
import { flattenPastedBlocks } from "../pastedContent.js";
import { truncateToLength } from "../stringUtils.js";

//@ chunk-5k94rwtv.js:264-682 placement
/**
 * 插件在回合间提交提示时的说明文本，以及插件消息前缀与判断/提取该包装的函数。
 */
var PLUGIN_PROMPT_TEXTS =
  `

This is how Claude Code surfaces a prompt a plugin submits between ` +
  "turns \u2014 it starts this turn in the user's place. Address the message above.";
var pluginMessagePrefix = (t) =>
  "The " +
  t +
  ` plugin sent a message:
`;
var pluginPromptLabel = (t) => `Prompt from the ${t} plugin`;
var isTextObject = (t) =>
  typeof t === "object" && t !== null && "text" in t && typeof t.text === "string" && t.text !== "";
var isPluginMessagePrefix = (t) =>
  t.length > 28 &&
  t.startsWith("The ") &&
  t.endsWith(` plugin sent a message:
`);
//@ chunk-5k94rwtv.js:682-812 placement
/**
 * 解析插件提交的包装提示：首行为插件前缀、末尾为固定后缀时返回插件标签与原文。
 */
function parseWrappedPluginPrompt(t, n) {
  let sliced = t.slice(
    0,
    t.indexOf(`
`) + 1,
  );
  return isTextObject(n) && isPluginMessagePrefix(sliced) && t === sliced + n.text + PLUGIN_PROMPT_TEXTS
    ? {
        label: sliced.slice(4, -24),
        text: n.text,
      }
    : undefined;
}
//@ chunk-5k94rwtv.js:812-905 placement
function renderPluginPromptWithJoiner(t, n, r) {
  let wrappedPluginPrompt = parseWrappedPluginPrompt(t, n);
  if (wrappedPluginPrompt === undefined) return t;
  return `${pluginPromptLabel(wrappedPluginPrompt.label)}${r}${wrappedPluginPrompt.text}`;
}
//@ chunk-5k94rwtv.js:905-953 placement
/**
 * 用 ": " 或空格连接插件名与原提示的渲染函数。
 */
var renderPluginPromptColon = (content, pluginPrompt) =>
  renderPluginPromptWithJoiner(content, pluginPrompt, ": ");
var renderPluginPromptSpace = (t, pluginPrompt) =>
  renderPluginPromptWithJoiner(
    t,
    pluginPrompt,
    `
`,
  );
//@ chunk-5k94rwtv.js:953-1067 placement
/**
 * 匹配以标签或"用户中断请求"开头的文本的正则，以及提取 command-name 标签内容的正则。
 */
var TAG_OR_INTERRUPT_START_RE = /^(?:\s*<[a-z][\w-]*[\s>]|\[Request interrupted by user[^\]]*\])/;
var COMMAND_NAME_TAG_RE = /<command-name>(.*?)<\/command-name>/;
//@ chunk-5k94rwtv.js:1067-1818 placement
function renderPluginPrompt(t, n, r = "stored") {
  if (t.type !== "user") return;
  if (t.isMeta === true || t.isCompactSummary === true) return;
  let message = t.message;
  if (!message) return;
  let content = message.content;
  let u =
    r === "shown" && typeof content === "string" ? renderPluginPromptColon(content, t.pluginPrompt) : content;
  let c = u !== content;
  let p = [];
  if (typeof u === "string") p.push(u);
  else if (Array.isArray(content))
    for (let e of content) {
      if (!e || typeof e !== "object") continue;
      if (e.type === "tool_result") return;
      if (e.type === "text" && typeof e.text === "string") p.push(e.text);
    }
  for (let e of p) {
    let trimmed = flattenPastedBlocks(e)
      .replaceAll(
        `
`,
        " ",
      )
      .trim();
    if (!trimmed) continue;
    let a = c ? null : COMMAND_NAME_TAG_RE.exec(trimmed);
    if (a) {
      if (!n.commandFallback) n.commandFallback = a[1];
      continue;
    }
    let g = c ? null : /<bash-input>([\s\S]*?)<\/bash-input>/.exec(trimmed);
    if (g) return `! ${g[1].trim()}`;
    if (TAG_OR_INTERRUPT_START_RE.test(trimmed)) continue;
    if (trimmed.length > 200) trimmed = truncateToLength(trimmed, 200).trim() + "\u2026";
    return trimmed;
  }
  return;
}
export {
  renderPluginPromptColon,
  renderPluginPrompt,
  renderPluginPromptSpace,
  parseWrappedPluginPrompt,
  pluginPromptLabel,
  pluginMessagePrefix,
  PLUGIN_PROMPT_TEXTS,
  TAG_OR_INTERRUPT_START_RE,
};
