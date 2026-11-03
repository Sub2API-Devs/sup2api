/**
 * skills/bundled/verify.ts
 *
 * cowork-plugin 内置 skill 注册；另混入 skill.prompt 事件的参数校验与纯 JSON 复制工具（疑似切分错误）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/verify.ts
 * pieces: chunk-4121qate.js (1), chunk-hantmvxa.js (3)
 * attribution: fingerprint 2, sole-consumer 1, affinity 1
 */
import { registerBundledSkill } from "../bundledSkills.js";
import { COWORK_PLUGIN } from "./bundledSkillNames.js";
import { isRemoteCowork, isCcsRemoteCowork } from "../../utils/entrypointKinds.js";
import { checkPlainObject } from "../../plugins/functionHooks/sites/plainData.js";

//@ chunk-hantmvxa.js:99444-99495 sole-consumer
function loadCoworkPluginSkillFiles() {
  return import("./chunk-3xrfrj7v.js");
}
//@ chunk-hantmvxa.js:99495-99892 affinity
var COWORK_PLUGIN_DESCRIPTION =
  "Create a new Cowork plugin from scratch, or customize an installed plugin for a specific organization. Use when: customize plugin, set up plugin, configure plugin, tailor plugin, adjust plugin settings, customize plugin connectors, customize plugin skill, tweak plugin, modify plugin configuration, create a plugin, build a plugin, make a new plugin, develop a plugin, scaffold a plugin.";
//@ chunk-hantmvxa.js:99892-100182 fingerprint = registerVerifySkill (0.543)
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
    async getPromptForCommand(e) {
      let { SKILL_MD } = await loadCoworkPluginSkillFiles();
      let parts = [SKILL_MD.trimStart()];
      let trimmed = e?.trim();
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
//@ chunk-4121qate.js:132362-132452 fingerprint
/**
 * 把非对象 frontmatter 规范化（checkPlainObject 返回字符串时保持原样）。
 */
function normalizeFrontmatter(e) {
  let o = checkPlainObject(e.frontmatter);
  return typeof o === "string"
    ? e
    : {
        ...e,
        frontmatter: o,
      };
}
export { normalizeFrontmatter, registerCoworkPluginSkill };
