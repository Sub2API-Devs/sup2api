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
var PLUGIN_PROMPT_TEXTS =
    `

This is how Claude Code surfaces a prompt a plugin submits between ` +
    "turns \u2014 it starts this turn in the user's place. Address the message above.",
  Xys = (t) =>
    "The " +
    t +
    ` plugin sent a message:
`,
  Edo = (t) => `Prompt from the ${t} plugin`,
  m = (t) =>
    typeof t === "object" && t !== null && "text" in t && typeof t.text === "string" && t.text !== "",
  _ = (t) =>
    t.length > 28 &&
    t.startsWith("The ") &&
    t.endsWith(` plugin sent a message:
`);
/**
 * 解析插件提交的包装提示：首行为插件前缀、末尾为固定后缀时返回插件标签与原文。
 */
//@ chunk-5k94rwtv.js:682-812 placement
function parseWrappedPluginPrompt(t, n) {
  let sliced = t.slice(
    0,
    t.indexOf(`
`) + 1,
  );
  return m(n) && _(sliced) && t === sliced + n.text + PLUGIN_PROMPT_TEXTS
    ? { label: sliced.slice(4, -24), text: n.text }
    : void 0;
}
//@ chunk-5k94rwtv.js:812-905 placement
function l(t, n, r) {
  let s = parseWrappedPluginPrompt(t, n);
  if (s === void 0) return t;
  return `${Edo(s.label)}${r}${s.text}`;
}
//@ chunk-5k94rwtv.js:905-953 placement
var t7 = (t, n) => l(t, n, ": "),
  Jys = (t, n) =>
    l(
      t,
      n,
      `
`,
    );
/**
 * 匹配以标签或"用户中断请求"开头的文本的正则，以及提取 command-name 标签内容的正则。
 */
//@ chunk-5k94rwtv.js:953-1067 placement
var TAG_OR_INTERRUPT_START_RE = /^(?:\s*<[a-z][\w-]*[\s>]|\[Request interrupted by user[^\]]*\])/,
  COMMAND_NAME_TAG_RE = /<command-name>(.*?)<\/command-name>/;
//@ chunk-5k94rwtv.js:1067-1818 placement
function renderPluginPrompt(t, n, r = "stored") {
  if (t.type !== "user") return;
  if (t.isMeta === !0 || t.isCompactSummary === !0) return;
  let message = t.message;
  if (!message) return;
  let content = message.content,
    u = r === "shown" && typeof content === "string" ? t7(content, t.pluginPrompt) : content,
    c = u !== content,
    p = [];
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
  t7,
  renderPluginPrompt,
  Jys,
  parseWrappedPluginPrompt,
  Edo,
  Xys,
  PLUGIN_PROMPT_TEXTS,
  TAG_OR_INTERRUPT_START_RE,
};
