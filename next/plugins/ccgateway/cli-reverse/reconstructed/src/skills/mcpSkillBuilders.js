/**
 * skills/mcpSkillBuilders.ts
 *
 * MCP skill 构建器注册表的取值（loadSkillsDir 注册 createSkillCommand/parseSkillFrontmatterFields）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/mcpSkillBuilders.ts
 * pieces: chunk-7jxyna5q.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { loaderSideHolder } from "../services/memorySync/syncFiles.js";

//@ chunk-7jxyna5q.js:89043-89192 fingerprint (2.1.88 match: getMCPSkillBuilders, 0.795)
function getMCPSkillBuilders() {
  let loaderSide = loaderSideHolder.loaderSide;
  if (!loaderSide)
    throw Error("MCP skill builders not registered \u2014 loadSkillsDir.ts has not been evaluated yet");
  return loaderSide;
}
export { getMCPSkillBuilders };
