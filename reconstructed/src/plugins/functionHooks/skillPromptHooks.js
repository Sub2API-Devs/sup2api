/**
 * plugins/functionHooks/skillPromptHooks.ts
 *
 * 2.1.316 新增：skill.prompt 事件钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: placement 8
 */
import { textPassthroughEvent } from "./coreHandlers.js";
import { withFrontmatter } from "./sessionHooks.js";
import { isPlainDataValue } from "./eventPayloads.js";
import { checkPlainData } from "./sites/plainData.js";
import { isPlainDataObject } from "../../utils/hooks/functionHookMatchers.js";
import { errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { joinTextBlocks } from "./sessionReceive.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";

//@ chunk-e6aww6q8.js:76168-76221 placement
/**
 * 技能 frontmatter 问题结果
 */
var skillProblemResult = (frontmatterProblem) => ({
  frontmatter: {},
  frontmatterProblem,
});
//@ chunk-e6aww6q8.js:76221-76414 placement
/**
 * 技能来源：插件命令为 plugin，同步技能为 syncedSkills，内置/打包为 built-in，否则取 source。
 */
function skillSourceOf(e) {
  if (e.type !== "prompt") return "plugin";
  if (e.loadedFrom === "syncedSkills") return "syncedSkills";
  switch (e.source) {
    case "builtin":
    case "bundled":
      return "built-in";
    default:
      return e.source;
  }
}
//@ chunk-e6aww6q8.js:76414-76620 placement
function skillProvenance(e) {
  let n = e?.type === "prompt" ? e : undefined;
  let r = n?.pluginInfo?.pluginManifest.name;
  let path = n?.skillFile?.path;
  return {
    source: e === undefined ? "built-in" : skillSourceOf(e),
    ...(r !== undefined && {
      pluginName: r,
    }),
    ...(path !== undefined && {
      path,
    }),
  };
}
//@ chunk-e6aww6q8.js:76620-76647 placement
/**
 * skill.prompt 事件
 */
var SKILL_PROMPT_EVENT = textPassthroughEvent("skill.prompt");
//@ chunk-e6aww6q8.js:76647-77155 placement
/**
 * 为 skill.prompt 准备技能 frontmatter 的纯数据副本；无法复制或有问题时给空对象并说明原因。
 */
function skillFrontmatterFor(e, n) {
  let skillFile = n?.type === "prompt" ? n.skillFile : undefined;
  if (skillFile === undefined) return withFrontmatter({});
  let frontmatterProblem = skillFile.frontmatterProblem;
  if (frontmatterProblem === undefined)
    try {
      let h = new Set();
      let frontmatter = isPlainDataValue(skillFile.frontmatterAsWritten, new Map(), h);
      let S = checkPlainData(frontmatter);
      if (S === undefined && isPlainDataObject(frontmatter)) {
        let mapped = [...h].sort().map((L) => `a key ${L}`);
        return mapped.length === 0
          ? withFrontmatter(frontmatter)
          : {
              frontmatter,
              frontmatterProblem: `left out ${mapped.join(" and ")}`,
            };
      }
      frontmatterProblem = S ?? "is no table";
    } catch (error) {
      frontmatterProblem = `could not be copied (${errorMessage(error)})`;
    }
  logForDebugging(`skill.prompt: ${e}'s frontmatter is handed as {} (${frontmatterProblem})`, {
    level: "warn",
  });
  return skillProblemResult(frontmatterProblem);
}
//@ chunk-e6aww6q8.js:77155-77401 placement
/**
 * 有 skill.prompt 钩子时让钩子改写技能提示文本（保留非文本块），否则原样返回。
 */
async function applySkillPromptHooks(e, promptForCommand, r) {
  if (
    !hasModuleHookingSite("skill.prompt", {
      skill: e,
    })
  )
    return [...promptForCommand];
  let s = joinTextBlocks(
    promptForCommand,
    `
`,
  );
  let h = await NO_CORE_AT_CHAIN_BOTTOM(
    "skill.prompt",
    {},
  )({
    skill: e,
    text: s,
    ...skillFrontmatterFor(e, r),
    ...skillProvenance(r),
  });
  return h.text === s
    ? [...promptForCommand]
    : [
        {
          type: "text",
          text: h.text,
        },
        ...promptForCommand.filter((S) => S.type !== "text"),
      ];
}
//@ chunk-e6aww6q8.js:77401-77479 placement
/**
 * 合法日期或当前时间
 */
function safeDate(loggedAt) {
  let date = new Date(loggedAt);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}
//@ chunk-e6aww6q8.js:77479-77514 placement
/**
 * Array.from 包装
 */
var toArrayLike = (e) => Array.from(Object(e));
export { applySkillPromptHooks, toArrayLike, safeDate, SKILL_PROMPT_EVENT, skillSourceOf };
