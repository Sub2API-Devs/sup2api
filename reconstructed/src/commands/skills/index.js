/**
 * commands/skills/index.ts
 *
 * /skills 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/skills/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */

/**
 * /skills 命令对象（local-jsx）；描述：List available skills；实现 chunk-00qhwn8e.js 的 Rr。
 */
//@ chunk-e6aww6q8.js:1735872-1736007 fingerprint = skills (0.707)
var skillsCommandDefinition = {
    type: "local-jsx",
    name: "skills",
    description: "List available skills",
    immediate: !0,
    thinClientDispatch: "control-request",
  },
  skillsCommand = skillsCommandDefinition;

export { skillsCommand };
