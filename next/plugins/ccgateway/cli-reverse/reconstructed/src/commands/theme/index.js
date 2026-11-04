/**
 * commands/theme/index.ts
 *
 * /theme 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/theme/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-e6aww6q8.js:2026674-2026805 fingerprint = theme (0.698)
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
var themeCommand = themeCommandDefinition;
export { themeCommand };
