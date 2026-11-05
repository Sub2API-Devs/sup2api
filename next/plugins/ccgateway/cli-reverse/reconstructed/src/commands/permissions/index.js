/**
 * commands/permissions/index.ts
 *
 * /permissions（别名 allowed-tools）命令对象
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/permissions/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-5xgkngpb.js:2082770-2082958 fingerprint (2.1.88 match: permissions, 0.629)
var permissionsCommand = {
  type: "local-jsx",
  name: "permissions",
  aliases: ["allowed-tools"],
  description: "Manage allow and deny tool permission rules",
  immediate: true,
  thinClientDispatch: "control-request",
};
var permissionsCommandAlias = permissionsCommand;
export { permissionsCommandAlias };
