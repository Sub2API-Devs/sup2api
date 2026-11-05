/**
 * skills/bundled/verify.ts
 *
 * cowork-plugin 内置 skill 注册；另混入 skill.prompt 事件的参数校验与纯 JSON 复制工具（疑似切分错误）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/verify.ts
 * pieces: chunk-j8f885h1.js (1), chunk-ne2890fx.js (3)
 * attribution: placement 1, sole-consumer 1, affinity 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { checkPlainObject } from "../../plugins/functionHooks/sites/plainData.js";
import { registerBundledSkill } from "../bundledSkills.js";
import { COWORK_PLUGIN } from "./bundledSkillNames.js";
import { isRemoteCowork, isCcsRemoteCowork } from "../../utils/entrypointKinds.js";

//@ chunk-j8f885h1.js:112968-113058 placement
/**
 * 把非对象 frontmatter 规范化（checkPlainObject 返回字符串时保持原样）。
 */
function normalizeFrontmatter(skill) {
  let frontmatter = checkPlainObject(skill.frontmatter);
  return typeof frontmatter === "string"
    ? skill
    : {
        ...skill,
        frontmatter,
      };
}
//@ chunk-ne2890fx.js:99625-99676 sole-consumer
function loadCoworkPluginSkillFiles() {
  return import("./SKILL_FILES_4.lazy.js");
}
//@ chunk-ne2890fx.js:99676-100073 affinity
var COWORK_PLUGIN_DESCRIPTION =
  "Create a new Cowork plugin from scratch, or customize an installed plugin for a specific organization. Use when: customize plugin, set up plugin, configure plugin, tailor plugin, adjust plugin settings, customize plugin connectors, customize plugin skill, tweak plugin, modify plugin configuration, create a plugin, build a plugin, make a new plugin, develop a plugin, scaffold a plugin.";
//@ chunk-ne2890fx.js:100073-100363 fingerprint (2.1.88 match: registerVerifySkill, 0.543)
/**
 * 注册 cowork-plugin 内置 skill（创建/定制 Cowork 插件），Cowork 环境门控；旧版匹配为 registerVerifySkill。
 */
function registerCoworkPluginSkill() {
  registerBundledSkill({
    name: COWORK_PLUGIN,
    description: COWORK_PLUGIN_DESCRIPTION,
    userInvocable: false,
    isEnabled: () => isRemoteCowork() || isCcsRemoteCowork(),
    files: () =>
      loadCoworkPluginSkillFiles().then((coworkPluginSkillFiles) => coworkPluginSkillFiles.SKILL_FILES),
    async getPromptForCommand(args) {
      let { SKILL_MD } = await loadCoworkPluginSkillFiles();
      let parts = [SKILL_MD.trimStart()];
      let trimmed = args?.trim();
      if (trimmed)
        parts.push(`## User Request

${trimmed}`);
      return [
        {
          type: "text",
          text: parts.join(`

`),
        },
      ];
    },
  });
}
export { normalizeFrontmatter, registerCoworkPluginSkill };
