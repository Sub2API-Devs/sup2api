/**
 * commands/tui/index.ts
 *
 * 2.1.316 新增：/tui 命令对象：切换全屏/经典渲染器
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-5xgkngpb.js:2082622-2082770 placement
/**
 * /tui 命令对象（local-jsx）；描述：Set the terminal UI renderer (default | fullscreen)；实现 chunk-wdq8e3yt.js 的 Uji。
 */
var tuiCommandDefinition = {
  type: "local-jsx",
  name: "tui",
  description: "Set the terminal UI renderer (default | fullscreen)",
  argumentHint: "[default|fullscreen]",
};
var tuiCommandAlias = tuiCommandDefinition;
export { tuiCommandAlias };
