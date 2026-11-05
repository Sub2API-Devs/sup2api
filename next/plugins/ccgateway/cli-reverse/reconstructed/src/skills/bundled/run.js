/**
 * skills/bundled/run.ts
 *
 * 2.1.316 新增。run skill。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fzg86mge.js (3)
 * attribution: placement 3
 */
import { memoizeAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { alwaysNull } from "./index.js";
import { registerBundledSkill } from "../bundledSkills.js";
import { parseFrontmatter } from "../../utils/frontmatterParser.js";

//@ chunk-fzg86mge.js:5516-5566 placement
/**
 * 动态加载 run 技能内容模块。
 */
function loadRunSkillContent() {
  return import("./run/RUN_EXAMPLE_FILES.lazy.js");
}
//@ chunk-fzg86mge.js:5566-5936 placement
/**
 * run 内置技能的描述文本：启动并操作项目应用以确认改动生效。
 */
var RUN_SKILL_DESCRIPTION =
  "Launch and drive this project's app to see a change working. Use when asked to run, start, or screenshot the app, or to confirm a change works in the real app (not just tests). First looks for a project skill that already covers launching the app; otherwise falls back to built-in patterns per project type (CLI, server, TUI, Electron, browser-driven, library).";
//@ chunk-fzg86mge.js:5936-6374 placement
/**
 * 注册内置 run 技能（启动并操作项目应用以验证改动）：附带示例文件与项目自有 run 技能文件，提示词为 SKILL.md 正文加用户请求。
 */
function registerRunSkill() {
  let runSkillRuntime = memoizeAlias(alwaysNull);
  registerBundledSkill({
    name: "run",
    menuDescription: "Launch this project\u2019s app to see your change working",
    description: RUN_SKILL_DESCRIPTION,
    userInvocable: true,
    files: async () => ({
      ...(await loadRunSkillContent().then((runSkillContent) => runSkillContent.RUN_EXAMPLE_FILES)),
      ...(await runSkillRuntime())?.files,
    }),
    async getPromptForCommand(args, context, includeRuntimeNote) {
      let { SKILL_MD } = await loadRunSkillContent();
      let sections = [parseFrontmatter(SKILL_MD).content.trimStart()];
      let resolvedRuntime = await runSkillRuntime();
      if (resolvedRuntime && includeRuntimeNote) sections.push(resolvedRuntime.note);
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
export { registerRunSkill };
