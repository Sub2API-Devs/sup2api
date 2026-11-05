/**
 * skills/bundled/setupCowork.ts
 *
 * 2.1.316 新增：注册 setup-cowork 内置技能（引导安装插件、连接工具）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nhbvytkj.js (2)
 * attribution: placement 2
 */
import { registerBundledSkill } from "../bundledSkills.js";
import { SETUP_CLAUDE } from "./bundledSkillNames.js";
import { isRemoteCowork, isCcsRemoteCowork } from "../../utils/entrypointKinds.js";

//@ chunk-nhbvytkj.js:5483-5691 placement
var SETUP_COWORK_DESCRIPTION =
  "Guided setup \u2014 pick a role, install a matching plugin, try a skill, connect tools. Use when: set up claude, setup claude, set up cowork, setup cowork, get started with claude, claude onboarding.";
//@ chunk-nhbvytkj.js:5691-6096 placement
/**
 * 注册 setup-cowork 内置技能（引导安装插件、连接工具）。
 */
function registerCoworkSetupSkill() {
  registerBundledSkill({
    name: SETUP_CLAUDE,
    aliases: ["setup-cowork"],
    description: SETUP_COWORK_DESCRIPTION,
    menuDescription: "Guided setup \u2014 pick a role, install a plugin, try a skill, connect tools",
    userInvocable: true,
    isEnabled: () => isRemoteCowork() || isCcsRemoteCowork(),
    async getPromptForCommand(args) {
      let { SETUP_COWORK_PROMPT } = await import("../../commands/setup-cowork/SETUP_COWORK_PROMPT.lazy.js");
      let sections = [SETUP_COWORK_PROMPT.trimStart()];
      let trimmed = args?.trim();
      if (trimmed)
        sections.push(`## User Request

${trimmed}`);
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
export { registerCoworkSetupSkill };
