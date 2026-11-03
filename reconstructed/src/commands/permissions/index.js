/**
 * commands/permissions/index.ts
 *
 * /permissions（别名 allowed-tools）命令对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/permissions/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */

/**
 * /permissions 命令对象（local-jsx）；描述：Manage allow and deny tool permission rules；别名 ["allowed-tools"]；实现 chunk-p2qwpk2k.js 的 Aw。
 */
//@ chunk-e6aww6q8.js:2026953-2027141 fingerprint = permissions (0.629)
var permissionsCommandDefinition = {
    type: "local-jsx",
    name: "permissions",
    aliases: ["allowed-tools"],
    description: "Manage allow and deny tool permission rules",
    immediate: !0,
    thinClientDispatch: "control-request",
  },
  permissionsCommand = permissionsCommandDefinition;

export { permissionsCommand };
