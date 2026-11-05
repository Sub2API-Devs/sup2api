/**
 * commands/hooks/index.ts
 *
 * /hooks 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/hooks/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-5xgkngpb.js:2083993-2084140 fingerprint (2.1.88 match: hooks, 0.787)
/**
 * /hooks 命令对象（local-jsx）；描述：View hook configurations for tool events；实现 chunk-bajxb7bf.js 的 Qd。
 */
var hooksCommandDefinition = {
  type: "local-jsx",
  name: "hooks",
  description: "View hook configurations for tool events",
  immediate: true,
  requires: {
    workspace: false,
    ink: true,
  },
};
var hooksCommand = hooksCommandDefinition;
export { hooksCommand };
