/**
 * utils/messages/pluginPrompts.ts
 *
 * 插件提交的提示词呈现（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1vkx5nq0.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { flattenPastedBlocks } from "../pastedContent.js";
import { truncateToLength } from "../stringUtils.js";

//@ chunk-1vkx5nq0.js:263-681 placement
/**
 * 插件在回合间提交提示时的说明文本，以及插件消息前缀与判断/提取该包装的函数。
 */
var PLUGIN_PROMPT_TEXTS =
  `

This is how Claude Code surfaces a prompt a plugin submits between ` +
  "turns \u2014 it starts this turn in the user's place. Address the message above.";
var pluginMessagePrefix = (label) =>
  "The " +
  label +
  ` plugin sent a message:
`;
var pluginPromptLabel = (label) => `Prompt from the ${label} plugin`;
var isTextObject = (value) =>
  typeof value === "object" &&
  value !== null &&
  "text" in value &&
  typeof value.text === "string" &&
  value.text !== "";
var isPluginMessagePrefix = (text) =>
  text.length > 28 &&
  text.startsWith("The ") &&
  text.endsWith(` plugin sent a message:
`);
//@ chunk-1vkx5nq0.js:681-811 placement
/**
 * 解析插件提交的包装提示：首行为插件前缀、末尾为固定后缀时返回插件标签与原文。
 */
function parseWrappedPluginPrompt(content, pluginPrompt) {
  let text = content.slice(
    0,
    content.indexOf(`
`) + 1,
  );
  return isTextObject(pluginPrompt) &&
    isPluginMessagePrefix(text) &&
    content === text + pluginPrompt.text + PLUGIN_PROMPT_TEXTS
    ? {
        label: text.slice(4, -24),
        text: pluginPrompt.text,
      }
    : undefined;
}
//@ chunk-1vkx5nq0.js:811-904 placement
function renderPluginPromptWithJoiner(content, pluginPrompt, joiner) {
  let wrappedPluginPrompt = parseWrappedPluginPrompt(content, pluginPrompt);
  if (wrappedPluginPrompt === undefined) return content;
  return `${pluginPromptLabel(wrappedPluginPrompt.label)}${joiner}${wrappedPluginPrompt.text}`;
}
//@ chunk-1vkx5nq0.js:904-953 placement
/**
 * 用 ": " 或空格连接插件名与原提示的渲染函数。
 */
var renderPluginPromptColon = (content, pluginPrompt) =>
  renderPluginPromptWithJoiner(content, pluginPrompt, ": ");
var renderPluginPromptSpace = (content, pluginPrompt) =>
  renderPluginPromptWithJoiner(
    content,
    pluginPrompt,
    `
`,
  );
//@ chunk-1vkx5nq0.js:953-1067 placement
/**
 * 匹配以标签或"用户中断请求"开头的文本的正则，以及提取 command-name 标签内容的正则。
 */
var TAG_OR_INTERRUPT_START_RE = /^(?:\s*<[a-z][\w-]*[\s>]|\[Request interrupted by user[^\]]*\])/;
var COMMAND_NAME_TAG_RE = /<command-name>(.*?)<\/command-name>/;
//@ chunk-1vkx5nq0.js:1067-1818 placement
function renderPluginPrompt(message, state, mode = "stored") {
  if (message.type !== "user") return;
  if (message.isMeta === true || message.isCompactSummary === true) return;
  let message_2 = message.message;
  if (!message_2) return;
  let content = message_2.content;
  let shownContent =
    mode === "shown" && typeof content === "string"
      ? renderPluginPromptColon(content, message.pluginPrompt)
      : content;
  let rewritten = shownContent !== content;
  let texts = [];
  if (typeof shownContent === "string") texts.push(shownContent);
  else if (Array.isArray(content))
    for (let block of content) {
      if (!block || typeof block !== "object") continue;
      if (block.type === "tool_result") return;
      if (block.type === "text" && typeof block.text === "string") texts.push(block.text);
    }
  for (let text of texts) {
    let trimmed = flattenPastedBlocks(text)
      .replaceAll(
        `
`,
        " ",
      )
      .trim();
    if (!trimmed) continue;
    let commandMatch = rewritten ? null : COMMAND_NAME_TAG_RE.exec(trimmed);
    if (commandMatch) {
      if (!state.commandFallback) state.commandFallback = commandMatch[1];
      continue;
    }
    let bashMatch = rewritten ? null : /<bash-input>([\s\S]*?)<\/bash-input>/.exec(trimmed);
    if (bashMatch) return `! ${bashMatch[1].trim()}`;
    if (TAG_OR_INTERRUPT_START_RE.test(trimmed)) continue;
    if (trimmed.length > 200) trimmed = truncateToLength(trimmed, 200).trim() + "\u2026";
    return trimmed;
  }
  return;
}
export {
  renderPluginPromptColon,
  renderPluginPrompt,
  pluginMessagePrefix,
  PLUGIN_PROMPT_TEXTS,
  parseWrappedPluginPrompt,
  renderPluginPromptSpace,
  pluginPromptLabel,
  TAG_OR_INTERRUPT_START_RE,
};
