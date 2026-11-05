/**
 * commands/plan/index.ts
 *
 * /plan 命令对象（[open|<description>]）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plan/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-5xgkngpb.js:2082958-2083123 fingerprint (2.1.88 match: plan, 0.874)
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
var planCommandAlias = planCommandDefinition;
export { planCommandAlias };
