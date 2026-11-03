/**
 * commands/copy/index.ts
 *
 * /copy 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/copy/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */

/**
 * /copy 命令对象（local-jsx）；描述：Copy Claude's last response to clipboard (or /copy N for the Nth-latest)；实现 chunk-0knprqgt.js 的 xn。
 */
//@ chunk-e6aww6q8.js:1687693-1687845 fingerprint = copy (0.819)
var copyCommandDefinition = {
    type: "local-jsx",
    name: "copy",
    description: "Copy Claude's last response to clipboard (or /copy N for the Nth-latest)",
    requires: { ink: !0 },
  },
  copyCommand = copyCommandDefinition;

export { copyCommand };
