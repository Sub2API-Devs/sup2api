/**
 * skills/bundled/remember.ts
 *
 * 并入已有模块：内置 remember 技能
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/remember.ts
 * pieces: chunk-ne2890fx.js (2)
 * attribution: placement 1, callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { canUseTeamMemory } from "../../memdir/teamMemPaths.js";
import { readableOrgMemoryStores } from "../../services/memorySync/availability.js";
import {
  MEMORY_TYPES_SECTION_TEAM,
  MEMORY_TYPES_SECTION_PRIVATE,
  MEMORY_TYPES_SECTION_ID,
  isCompactMemoryTypesEnabled,
} from "../../memdir/memoryTypes.js";
import { registerBundledSkill } from "../bundledSkills.js";
import { isAutoMemoryEnabled } from "../../memdir/paths.js";

//@ chunk-ne2890fx.js:183307-183357 placement
/**
 * 按记忆功能是否开启选择 memory-types 技能内容。
 */
function MEMORY_TYPES_SKILL_CONTENT() {
  return canUseTeamMemory() || readableOrgMemoryStores().length > 0
    ? MEMORY_TYPES_SECTION_TEAM
    : MEMORY_TYPES_SECTION_PRIVATE;
}
//@ chunk-ne2890fx.js:183357-183760 callgraph-fingerprint (2.1.88 match: registerRememberSkill, 0.398)
/**
 * 注册 memory-types 内置 skill（记忆类型分类参考，供写记忆前查阅），记忆功能门控；旧版匹配为 registerRememberSkill。
 */
function registerMemoryTypesSkill() {
  registerBundledSkill({
    name: MEMORY_TYPES_SECTION_ID,
    description:
      "Full reference for the memory type taxonomy \u2014 what each type captures, when to save it, how to structure the body, with examples.",
    whenToUse:
      "Use before writing a memory file to choose the right `type:` frontmatter value and body structure.",
    userInvocable: false,
    isEnabled: () => isAutoMemoryEnabled() && isCompactMemoryTypesEnabled(),
    async getPromptForCommand() {
      return [
        {
          type: "text",
          text: MEMORY_TYPES_SKILL_CONTENT().join(`
`),
        },
      ];
    },
  });
}
export { registerMemoryTypesSkill };
