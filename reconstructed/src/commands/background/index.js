/**
 * commands/background/index.ts
 *
 * 2.1.316 新增：/background 命令注册
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3m7t4vj8.js (1)
 * attribution: placement 1
 */

/**
 * /background 命令对象（local-jsx）；描述：Send this session to the background and free the terminal；别名 ["bg"]；isEnabled: ()=>!0；实现 chunk-7c7hjd56.js 的 $ji。
 */
//@ chunk-3m7t4vj8.js:191-391 placement
var backgroundCommandDefinition = {
    type: "local-jsx",
    name: "background",
    aliases: ["bg"],
    description: "Send this session to the background and free the terminal",
    argumentHint: "[prompt]",
    immediate: (args) => !args.trim(),
    isEnabled: () => !0,
  },
  backgroundCommand = backgroundCommandDefinition;
