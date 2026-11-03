/**
 * skills/bundled/run.ts
 *
 * 2.1.316 新增。run skill。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g8z8w057.js (3)
 * attribution: placement 3
 */
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { UWn } from "./index.js";
import { registerBundledSkill } from "../bundledSkills.js";
import { parseFrontmatter } from "../../utils/frontmatterParser.js";

//@ chunk-g8z8w057.js:5236-5286 placement
function n() {
  return import("./chunk-sbfx2p3f.js");
}
/**
 * run 内置技能的描述文本：启动并操作项目应用以确认改动生效。
 */
//@ chunk-g8z8w057.js:5286-5656 placement
var RUN_SKILL_DESCRIPTION =
  "Launch and drive this project's app to see a change working. Use when asked to run, start, or screenshot the app, or to confirm a change works in the real app (not just tests). First looks for a project skill that already covers launching the app; otherwise falls back to built-in patterns per project type (CLI, server, TUI, Electron, browser-driven, library).";
/**
 * 注册内置 run 技能（启动并操作项目应用以验证改动）：附带示例文件与项目自有 run 技能文件，提示词为 SKILL.md 正文加用户请求。
 */
//@ chunk-g8z8w057.js:5656-6094 placement
function registerRunSkill() {
  let r = io(UWn);
  registerBundledSkill({
    name: "run",
    menuDescription: "Launch this project\u2019s app to see your change working",
    description: RUN_SKILL_DESCRIPTION,
    userInvocable: !0,
    files: async () => ({ ...(await n().then((t) => t.RUN_EXAMPLE_FILES)), ...(await r())?.files }),
    async getPromptForCommand(t, p, s) {
      let { SKILL_MD: SKILL_MD } = await n(),
        e = [parseFrontmatter(SKILL_MD).content.trimStart()],
        o = await r();
      if (o && s) e.push(o.note);
      if (t)
        e.push(`## User Request

${t}`);
      return [
        {
          type: "text",
          text: e.join(`

`),
        },
      ];
    },
  });
}
