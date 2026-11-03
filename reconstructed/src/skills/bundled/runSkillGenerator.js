/**
 * skills/bundled/runSkillGenerator.ts
 *
 * 2.1.316 新增：技能生成器技能注册。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9vtynjjv.js (2)
 * attribution: placement 2
 */
import { registerBundledSkill } from "../bundledSkills.js";
import { parseFrontmatter } from "../../utils/frontmatterParser.js";

//@ chunk-9vtynjjv.js:5163-5445 placement
var RUN_SKILL_GENERATOR_DESCRIPTION =
  "Author or improve the run-<unit> skill - a per-project skill that tells agents how to build, launch, and drive this project's app. Use when the user asks to set up the project, get it running, write run instructions, or verify build/run steps work from a clean environment.";
//@ chunk-9vtynjjv.js:5445-5986 placement
function registerRunSkillGeneratorSkill() {
  registerBundledSkill({
    name: "run-skill-generator",
    menuDescription: "Create a skill that knows how to run this project\u2019s app",
    description: RUN_SKILL_GENERATOR_DESCRIPTION,
    userInvocable: !0,
    disableModelInvocation: !0,
    files: async () => {
      let [{ TEMPLATE_MD: t }, { RUN_EXAMPLE_FILES: e }] = await Promise.all([
        import("./chunk-z2aczm6x.js"),
        import("./chunk-sbfx2p3f.js"),
      ]);
      return { "template.md": t, ...e };
    },
    async getPromptForCommand(t) {
      let { SKILL_MD: SKILL_MD } = await import("./chunk-z2aczm6x.js"),
        r = [parseFrontmatter(SKILL_MD).content.trimStart()];
      if (t)
        r.push(`## User Request

${t}`);
      return [
        {
          type: "text",
          text: r.join(`

`),
        },
      ];
    },
  });
}
