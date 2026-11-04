/**
 * commands/reload-skills/index.ts
 *
 * 2.1.316 新增：/reload-skills 命令对象：重新加载技能
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
//@ chunk-e6aww6q8.js:2030344-2030566 placement
/**
 * /reload-skills 命令对象（local）；描述：Pick up skills added or changed on disk during this session；实现 chunk-9dc848ph.js 的 M。
 */
var reloadSkillsCommandDefinition = {
  type: "local",
  name: "reload-skills",
  description: "Pick up skills added or changed on disk during this session",
  supportsNonInteractive: true,
  thinClientDispatch: "post-text",
  load: () => import("./call.lazy.js"),
};
var reloadSkillsCommand = reloadSkillsCommandDefinition;
export { reloadSkillsCommand };
