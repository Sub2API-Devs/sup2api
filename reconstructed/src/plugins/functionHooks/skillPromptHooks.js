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
import { eA } from "./coreHandlers.js";
import { FNe } from "./sessionHooks.js";
import { isPlainDataValue } from "./eventPayloads.js";
import { lEe } from "./sites/plainData.js";
import { isPlainDataObject } from "../../utils/hooks/functionHookMatchers.js";
import { errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { ANe } from "./sessionReceive.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";

//@ chunk-e6aww6q8.js:76168-76221 placement
var h_t = (e) => ({ frontmatter: {}, frontmatterProblem: e });
/**
 * 技能来源：插件命令为 plugin，同步技能为 syncedSkills，内置/打包为 built-in，否则取 source。
 */
//@ chunk-e6aww6q8.js:76221-76414 placement
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
  let n = e?.type === "prompt" ? e : void 0,
    r = n?.pluginInfo?.pluginManifest.name,
    s = n?.skillFile?.path;
  return {
    source: e === void 0 ? "built-in" : skillSourceOf(e),
    ...(r !== void 0 && { pluginName: r }),
    ...(s !== void 0 && { path: s }),
  };
}
//@ chunk-e6aww6q8.js:76620-76647 placement
var gde = eA("skill.prompt");
/**
 * 为 skill.prompt 准备技能 frontmatter 的纯数据副本；无法复制或有问题时给空对象并说明原因。
 */
//@ chunk-e6aww6q8.js:76647-77155 placement
function skillFrontmatterFor(e, n) {
  let r = n?.type === "prompt" ? n.skillFile : void 0;
  if (r === void 0) return FNe({});
  let frontmatterProblem = r.frontmatterProblem;
  if (frontmatterProblem === void 0)
    try {
      let h = new Set(),
        y = isPlainDataValue(r.frontmatterAsWritten, new Map(), h),
        S = lEe(y);
      if (S === void 0 && isPlainDataObject(y)) {
        let mapped = [...h].sort().map((L) => `a key ${L}`);
        return mapped.length === 0
          ? FNe(y)
          : { frontmatter: y, frontmatterProblem: `left out ${mapped.join(" and ")}` };
      }
      frontmatterProblem = S ?? "is no table";
    } catch (error) {
      frontmatterProblem = `could not be copied (${errorMessage(error)})`;
    }
  return (
    logForDebugging(`skill.prompt: ${e}'s frontmatter is handed as {} (${frontmatterProblem})`, {
      level: "warn",
    }),
    h_t(frontmatterProblem)
  );
}
/**
 * 有 skill.prompt 钩子时让钩子改写技能提示文本（保留非文本块），否则原样返回。
 */
//@ chunk-e6aww6q8.js:77155-77401 placement
async function applySkillPromptHooks(e, n, r) {
  if (!hasModuleHookingSite("skill.prompt", { skill: e })) return [...n];
  let s = ANe(
      n,
      `
`,
    ),
    h = await NO_CORE_AT_CHAIN_BOTTOM(
      "skill.prompt",
      {},
    )({ skill: e, text: s, ...skillFrontmatterFor(e, r), ...skillProvenance(r) });
  return h.text === s ? [...n] : [{ type: "text", text: h.text }, ...n.filter((S) => S.type !== "text")];
}
//@ chunk-e6aww6q8.js:77401-77479 placement
function k_t(e) {
  let date = new Date(e);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}
//@ chunk-e6aww6q8.js:77479-77514 placement
var b_t = (e) => Array.from(Object(e));

export { applySkillPromptHooks, b_t, k_t, gde, skillSourceOf };
