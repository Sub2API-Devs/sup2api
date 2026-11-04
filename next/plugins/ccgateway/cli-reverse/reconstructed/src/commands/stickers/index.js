/**
 * commands/stickers/index.ts
 *
 * /stickers 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/stickers/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-e6aww6q8.js:2034776-2034929 fingerprint = stickers (0.864)
/**
 * /stickers 命令对象（local）；描述：Order Claude Code stickers；实现 chunk-ekn75w8p.js 的 s。
 */
var stickersCommandDefinition = {
  type: "local",
  name: "stickers",
  description: "Order Claude Code stickers",
  supportsNonInteractive: false,
  load: () => import("./stickers.js"),
};
var stickersCommand = stickersCommandDefinition;
export { stickersCommand };
