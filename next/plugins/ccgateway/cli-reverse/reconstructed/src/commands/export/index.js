/**
 * commands/export/index.ts
 *
 * /export 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/export/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-e6aww6q8.js:2040494-2040656 fingerprint = exportCommand (0.877)
/**
 * /export 命令对象（local-jsx）；描述：Export the current conversation to a file or clipboard；实现 chunk-am3vy82s.js 的 ho。
 */
var exportCommandDefinition = {
  type: "local-jsx",
  name: "export",
  description: "Export the current conversation to a file or clipboard",
  argumentHint: "[filename]",
  requires: {
    ink: true,
  },
};
var exportCommand = exportCommandDefinition;
export { exportCommand };
