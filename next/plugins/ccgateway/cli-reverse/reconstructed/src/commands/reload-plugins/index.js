/**
 * commands/reload-plugins/index.ts
 *
 * /reload-plugins 命令对象（[--force]）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/reload-plugins/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-5xgkngpb.js:2085892-2086161 fingerprint (2.1.88 match: reloadPlugins, 0.611)
/**
 * /reload-plugins 命令对象（local）；描述：Activate pending plugin changes in the current session；实现 chunk-8vqp1nqq.js 的 qr。
 */
var reloadPluginsCommandDefinition = {
  type: "local",
  name: "reload-plugins",
  description: "Activate pending plugin changes in the current session",
  argumentHint: "[--force]",
  supportsNonInteractive: true,
  terminalOriented: true,
  thinClientDispatch: "control-request",
  load: () => import("./HEADLESS_MCP_PENDING_NOTE.lazy.js"),
};
var reloadPluginsCommandAlias = reloadPluginsCommandDefinition;
export { reloadPluginsCommandAlias };
