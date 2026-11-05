/**
 * skills/bundled/designSync.ts
 *
 * 2.1.316 新增：design-sync 内置技能：把 React 设计系统推到 claude.ai/design，有策略门控、禁止模型自行调用。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ne2890fx.js (2)
 * attribution: placement 2
 */
import { registerBundledSkill } from "../bundledSkills.js";
import { DESIGN_SYNC } from "./bundledSkillNames.js";
import {
  isDesignSyncAllowed,
  DESIGN_SYNC_POLICY,
  STANDALONE_DESIGN_CLOSING_NOTICE,
} from "../../tools/DesignSyncTool/DesignSyncTool.js";
import { getFilesForLanguage, loadSkillFilesModule } from "./claudeApi.js";
import { parseFrontmatter } from "../../utils/frontmatterParser.js";

//@ chunk-ne2890fx.js:112108-112361 placement
var DESIGN_SYNC_SKILL_DESCRIPTION =
  'Push a React design system to claude.ai/design. This runs a converter that bundles the real component code (from Storybook or a bare package) and uploads it. Use when the user runs /design-sync or says "sync my design system to Claude Design".';
//@ chunk-ne2890fx.js:112361-112903 placement
/**
 * 注册 design-sync skill：把 React 设计系统推到 claude.ai/design；有策略门控，禁止模型自行调用；正文前插一句必须原样转告用户的话，参数作为 Hint 附后。
 */
function registerDesignSyncSkill() {
  registerBundledSkill({
    name: DESIGN_SYNC,
    menuDescription: "Push your design system components to claude.ai/design",
    description: DESIGN_SYNC_SKILL_DESCRIPTION,
    isEnabled: isDesignSyncAllowed,
    policyGate: DESIGN_SYNC_POLICY,
    argumentHint: '[<project hint, e.g. "Acme DS">]',
    disableModelInvocation: true,
    userInvocable: true,
    files: getFilesForLanguage,
    async getPromptForCommand(args, context) {
      let sections = [];
      if (sections.length === 0) {
        let { SKILL_MD } = await loadSkillFilesModule();
        sections.push(
          `Before anything else, tell the user this, as written: "${STANDALONE_DESIGN_CLOSING_NOTICE}" Then carry on.`,
          parseFrontmatter(SKILL_MD).content.trimStart(),
        );
      }
      if (args?.trim())
        sections.push(`## Hint

\`\`\`
${args.trim()}
\`\`\``);
      return [
        {
          type: "text",
          text: sections.join(`

`),
        },
      ];
    },
  });
}
export { registerDesignSyncSkill };
