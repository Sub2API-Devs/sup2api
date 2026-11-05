/**
 * commands/btw/index.ts
 *
 * /btw 命令对象（[question]，瘦客户端通过 control-request 派发）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/btw/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-5xgkngpb.js:1760990-1761218 fingerprint (2.1.88 match: btw, 0.686)
/**
 * /btw 命令对象（local-jsx）；描述：Ask a quick side question without interrupting the main conversation；实现 chunk-583vs41k.js 的 pr。
 */
var btwCommandDefinition = {
  type: "local-jsx",
  name: "btw",
  description: "Ask a quick side question without interrupting the main conversation",
  immediate: true,
  keepsScrollPosition: true,
  argumentHint: "[question]",
  thinClientDispatch: "control-request",
};
var btwCommand = btwCommandDefinition;
export { btwCommand };
