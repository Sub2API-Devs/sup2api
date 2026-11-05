/**
 * commands/plugin/index.tsx
 *
 * /plugin（别名 plugins、marketplace）命令对象
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/index.tsx
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-5xgkngpb.js:2085613-2085892 fingerprint (2.1.88 match: plugin, 0.704)
/**
 * /plugin 命令对象（local-jsx）；描述：Manage Claude Code plugins；别名 ["plugins","marketplace"]；实现 chunk-qey4tpm4.js 的 p。
 */
var pluginCommandDefinition = {
  type: "local-jsx",
  name: "plugin",
  aliases: ["plugins", "marketplace"],
  description: "Manage Claude Code plugins",
  immediate: true,
  requires: {
    workspace: false,
    ink: true,
  },
  getArgumentCompletions: (arg, state, context) =>
    import("./getPluginArgumentCompletions.lazy.js").then((pluginModule) =>
      pluginModule.getPluginArgumentCompletions(arg, state, context),
    ),
};
var pluginCommandAlias = pluginCommandDefinition;
export { pluginCommandAlias };
