/**
 * commands/background/index.ts
 *
 * 2.1.316 新增：/background 命令注册
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tgb8mh19.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-tgb8mh19.js:191-391 placement
/**
 * /background 命令对象（local-jsx）；描述：Send this session to the background and free the terminal；别名 ["bg"]；isEnabled: ()=>!0；实现 chunk-7c7hjd56.js 的 $ji。
 */
var backgroundCommandDefinition = {
  type: "local-jsx",
  name: "background",
  aliases: ["bg"],
  description: "Send this session to the background and free the terminal",
  argumentHint: "[prompt]",
  immediate: (args) => !args.trim(),
  isEnabled: () => true,
};
var backgroundCommand = backgroundCommandDefinition;
export { backgroundCommand };
