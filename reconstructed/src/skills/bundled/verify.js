/**
 * skills/bundled/verify.ts
 *
 * cowork-plugin 内置 skill 注册；另混入 skill.prompt 事件的参数校验与纯 JSON 复制工具（疑似切分错误）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/verify.ts
 * pieces: chunk-4121qate.js (1), chunk-hantmvxa.js (3)
 * attribution: fingerprint 2, affinity 2
 */
import { registerBundledSkill } from "../bundledSkills.js";
import { COWORK_PLUGIN } from "./bundledSkillNames.js";
import { isRemoteCowork, isCcsRemoteCowork } from "../../utils/entrypointKinds.js";
import { checkPlainObject } from "../../plugins/functionHooks/sites/plainData.js";

//@ chunk-hantmvxa.js:99444-99495 affinity
function loadCoworkPluginSkillFiles() {
  return import("./chunk-3xrfrj7v.js");
}
//@ chunk-hantmvxa.js:99495-99892 affinity
var COWORK_PLUGIN_DESCRIPTION =
  "Create a new Cowork plugin from scratch, or customize an installed plugin for a specific organization. Use when: customize plugin, set up plugin, configure plugin, tailor plugin, adjust plugin settings, customize plugin connectors, customize plugin skill, tweak plugin, modify plugin configuration, create a plugin, build a plugin, make a new plugin, develop a plugin, scaffold a plugin.";
/**
 * 注册 cowork-plugin 内置 skill（创建/定制 Cowork 插件），Cowork 环境门控；旧版匹配为 registerVerifySkill。
 */
//@ chunk-hantmvxa.js:99892-100182 fingerprint = registerVerifySkill (0.543)
function registerCoworkPluginSkill() {
  registerBundledSkill({
    name: COWORK_PLUGIN,
    description: COWORK_PLUGIN_DESCRIPTION,
    userInvocable: !1,
    isEnabled: () => isRemoteCowork() || isCcsRemoteCowork(),
    files: () => loadCoworkPluginSkillFiles().then((e) => e.SKILL_FILES),
    async getPromptForCommand(e) {
      let { SKILL_MD: SKILL_MD } = await loadCoworkPluginSkillFiles(),
        parts = [SKILL_MD.trimStart()],
        r = e?.trim();
      if (r)
        parts.push(`## User Request

${r}`);
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
function ei(e) {
  let o = checkPlainObject(e.frontmatter);
  return typeof o === "string" ? e : { ...e, frontmatter: o };
}

export { ei, registerCoworkPluginSkill };
