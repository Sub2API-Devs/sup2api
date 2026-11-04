/**
 * commands/plan/index.ts
 *
 * /plan 命令对象（[open|<description>]）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plan/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-e6aww6q8.js:2027141-2027306 fingerprint (2.1.88 match: plan, 0.874)
/**
 * /plan 命令对象（local-jsx）；描述：Enable plan mode or view the current session plan；实现 chunk-ve85yyeb.js 的 le。
 */
var planCommandDefinition = {
  type: "local-jsx",
  name: "plan",
  description: "Enable plan mode or view the current session plan",
  argumentHint: "[open|<description>]",
  requires: {
    ink: true,
  },
};
var planCommand = planCommandDefinition;
export { planCommand };
