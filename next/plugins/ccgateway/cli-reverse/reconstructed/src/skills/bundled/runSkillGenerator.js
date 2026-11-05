/**
 * skills/bundled/runSkillGenerator.ts
 *
 * 2.1.316 新增：技能生成器技能注册。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xtqz94gc.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { registerBundledSkill } from "../bundledSkills.js";
import { parseFrontmatter } from "../../utils/frontmatterParser.js";

//@ chunk-xtqz94gc.js:5443-5725 placement
var RUN_SKILL_GENERATOR_DESCRIPTION =
  "Author or improve the run-<unit> skill - a per-project skill that tells agents how to build, launch, and drive this project's app. Use when the user asks to set up the project, get it running, write run instructions, or verify build/run steps work from a clean environment.";
//@ chunk-xtqz94gc.js:5725-6266 placement
function registerRunSkillGeneratorSkill() {
  registerBundledSkill({
    name: "run-skill-generator",
    menuDescription: "Create a skill that knows how to run this project\u2019s app",
    description: RUN_SKILL_GENERATOR_DESCRIPTION,
    userInvocable: true,
    disableModelInvocation: true,
    files: async () => {
      let [{ TEMPLATE_MD: template }, { RUN_EXAMPLE_FILES: runExampleFiles }] = await Promise.all([
        import("./skillTemplateResources.js"),
        import("./run/RUN_EXAMPLE_FILES.lazy.js"),
      ]);
      return {
        "template.md": template,
        ...runExampleFiles,
      };
    },
    async getPromptForCommand(args) {
      let { SKILL_MD } = await import("./skillTemplateResources.js");
      let sections = [parseFrontmatter(SKILL_MD).content.trimStart()];
      if (args)
        sections.push(`## User Request

${args}`);
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
export { registerRunSkillGeneratorSkill };
