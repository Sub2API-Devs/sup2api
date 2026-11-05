/**
 * commands/skills/index.ts
 *
 * /skills 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/skills/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-5xgkngpb.js:1811323-1811458 fingerprint (2.1.88 match: skills, 0.707)
/**
 * /skills 命令对象（local-jsx）；描述：List available skills；实现 chunk-00qhwn8e.js 的 Rr。
 */
var skillsCommandDefinition = {
  type: "local-jsx",
  name: "skills",
  description: "List available skills",
  immediate: true,
  thinClientDispatch: "control-request",
};
var skillsCommandAlias = skillsCommandDefinition;
export { skillsCommandAlias };
