/**
 * commands/plugin/index.tsx
 *
 * /plugin（别名 plugins、marketplace）命令对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/index.tsx
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */

/**
 * /plugin 命令对象（local-jsx）；描述：Manage Claude Code plugins；别名 ["plugins","marketplace"]；实现 chunk-qey4tpm4.js 的 p。
 */
//@ chunk-e6aww6q8.js:2029796-2030075 fingerprint = plugin (0.704)
var pluginCommandDefinition = {
    type: "local-jsx",
    name: "plugin",
    aliases: ["plugins", "marketplace"],
    description: "Manage Claude Code plugins",
    immediate: !0,
    requires: { workspace: !1, ink: !0 },
    getArgumentCompletions: (e, n, r) =>
      import("./chunk-rkhcn3s2.js").then((s) => s.getPluginArgumentCompletions(e, n, r)),
  },
  pluginCommand = pluginCommandDefinition;

export { pluginCommand };
