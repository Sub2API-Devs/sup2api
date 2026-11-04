/**
 * commands/mcp/index.ts
 *
 * /mcp 命令对象（交互面板与 reconnect/enable/disable 无头版）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/mcp/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";

//@ chunk-e6aww6q8.js:1732503-1732969 fingerprint = mcp (0.488)
/**
 * /mcp 命令对象（local）；描述：Manage MCP servers；isEnabled: ()=>_e()；isHidden: {return!_e()}；实现 chunk-3re05e6m.js 的 Le。
 */
var mcpNonInteractiveCommand = {
  type: "local",
  name: "mcp",
  supportsNonInteractive: true,
  description: "Manage MCP servers",
  argumentHint: "[reconnect|enable|disable [<server>|all]]",
  thinClientDispatch: "post-text",
  isEnabled: () => getIsNonInteractiveSession(),
  get isHidden() {
    return !getIsNonInteractiveSession();
  },
  load: () => import("./call.lazy.js"),
};
var mcpCommandDefinition = {
  type: "local-jsx",
  name: "mcp",
  description: "Manage MCP servers",
  immediate: true,
  argumentHint: "[reconnect (<server>|all)|enable|disable [<server>|all]]",
  get thinClientDispatch() {
    return "twin";
  },
};
var mcpCommand = mcpCommandDefinition;
export { mcpCommand, mcpNonInteractiveCommand };
