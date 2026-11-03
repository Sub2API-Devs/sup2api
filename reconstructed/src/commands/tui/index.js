/**
 * commands/tui/index.ts
 *
 * 2.1.316 新增：/tui 命令对象：切换全屏/经典渲染器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */

/**
 * /tui 命令对象（local-jsx）；描述：Set the terminal UI renderer (default | fullscreen)；实现 chunk-wdq8e3yt.js 的 Uji。
 */
//@ chunk-e6aww6q8.js:2026805-2026953 placement
var tuiCommandDefinition = {
    type: "local-jsx",
    name: "tui",
    description: "Set the terminal UI renderer (default | fullscreen)",
    argumentHint: "[default|fullscreen]",
  },
  tuiCommand = tuiCommandDefinition;

export { tuiCommand };
