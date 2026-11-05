/**
 * commands/reload-skills/index.ts
 *
 * 2.1.316 新增：/reload-skills 命令对象：重新加载技能
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 */
//@ chunk-5xgkngpb.js:2086161-2086383 placement
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
var reloadSkillsCommandAlias = reloadSkillsCommandDefinition;
export { reloadSkillsCommandAlias };
