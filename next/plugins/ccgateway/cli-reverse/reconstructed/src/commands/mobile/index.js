/**
 * commands/mobile/index.ts
 *
 * /mobile（别名 ios、android）命令对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/mobile/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-e6aww6q8.js:1732969-1733123 fingerprint = mobile (0.895)
/**
 * /mobile 命令对象（local-jsx）；描述：Show QR code to download the Claude mobile app；别名 ["ios","android"]；实现 chunk-7mtn3rbz.js 的 le。
 */
var mobileCommandDefinition = {
  type: "local-jsx",
  name: "mobile",
  aliases: ["ios", "android"],
  description: "Show QR code to download the Claude mobile app",
  requires: {
    ink: true,
  },
};
var mobileCommand = mobileCommandDefinition;
export { mobileCommand };
