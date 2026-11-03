/**
 * skills/bundled/remember.ts
 *
 * 并入已有模块：内置 remember 技能
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/remember.ts
 * pieces: chunk-hantmvxa.js (2)
 * attribution: placement 1, callgraph-fingerprint 1
 */
import { a4 } from "../../memdir/teamMemPaths.js";
import { Qpe } from "../../services/memorySync/availability.js";
import { G4t, nar, MEMORY_TYPES_SECTION_ID, isCompactMemoryTypesEnabled } from "../../memdir/memoryTypes.js";
import { registerBundledSkill } from "../bundledSkills.js";
import { isAutoMemoryEnabled } from "../../memdir/paths.js";

//@ chunk-hantmvxa.js:183126-183176 placement
function Bi() {
  return a4() || Qpe().length > 0 ? G4t : nar;
}
/**
 * 注册 memory-types 内置 skill（记忆类型分类参考，供写记忆前查阅），记忆功能门控；旧版匹配为 registerRememberSkill。
 */
//@ chunk-hantmvxa.js:183176-183579 callgraph-fingerprint = registerRememberSkill (0.398)
function registerMemoryTypesSkill() {
  registerBundledSkill({
    name: MEMORY_TYPES_SECTION_ID,
    description:
      "Full reference for the memory type taxonomy \u2014 what each type captures, when to save it, how to structure the body, with examples.",
    whenToUse:
      "Use before writing a memory file to choose the right `type:` frontmatter value and body structure.",
    userInvocable: !1,
    isEnabled: () => isAutoMemoryEnabled() && isCompactMemoryTypesEnabled(),
    async getPromptForCommand() {
      return [
        {
          type: "text",
          text: Bi().join(`
`),
        },
      ];
    },
  });
}

export { registerMemoryTypesSkill };
