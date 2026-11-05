/**
 * commands/theme/index.ts
 *
 * /theme 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/theme/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-5xgkngpb.js:2082491-2082622 fingerprint (2.1.88 match: theme, 0.698)
/**
 * /theme 命令对象（local-jsx）；描述：Change the theme；实现 chunk-3s4dbk22.js 的 Or。
 */
var themeCommandDefinition = {
  type: "local-jsx",
  name: "theme",
  description: "Change the theme",
  immediate: (args, presentation) => presentation === "fullscreen",
  requires: {
    ink: true,
  },
};
var themeCommandAlias = themeCommandDefinition;
export { themeCommandAlias };
