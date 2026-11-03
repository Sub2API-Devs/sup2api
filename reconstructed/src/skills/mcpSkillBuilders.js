/**
 * skills/mcpSkillBuilders.ts
 *
 * MCP skill 构建器注册表的取值（loadSkillsDir 注册 createSkillCommand/parseSkillFrontmatterFields）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/mcpSkillBuilders.ts
 * pieces: chunk-s61vbvea.js (1)
 * attribution: fingerprint 1
 */
import { Ag } from "../services/memorySync/syncFiles.js";

//@ chunk-s61vbvea.js:90219-90368 fingerprint = getMCPSkillBuilders (0.795)
function getMCPSkillBuilders() {
  let loaderSide = Ag.loaderSide;
  if (!loaderSide)
    throw Error("MCP skill builders not registered \u2014 loadSkillsDir.ts has not been evaluated yet");
  return loaderSide;
}

export { getMCPSkillBuilders };
