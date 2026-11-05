/**
 * plugins/functionHooks/skillPromptHooks.ts
 *
 * 2.1.316 新增：skill.prompt 事件钩子
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:78718-78771 placement
/**
 * 技能 frontmatter 问题结果
 */
var skillProblemResult = (frontmatterProblem) => ({
  frontmatter: {},
  frontmatterProblem,
});
//@ chunk-5xgkngpb.js:78771-78964 placement
/**
 * 技能来源：插件命令为 plugin，同步技能为 syncedSkills，内置/打包为 built-in，否则取 source。
 */
function skillSourceOf(command) {
  if (command.type !== "prompt") return "plugin";
  if (command.loadedFrom === "syncedSkills") return "syncedSkills";
  switch (command.source) {
    case "builtin":
    case "bundled":
      return "built-in";
    default:
      return command.source;
  }
}
//@ chunk-5xgkngpb.js:78964-79170 placement
function skillProvenance(command) {
  let prompt = command?.type === "prompt" ? command : undefined;
  let pluginName = prompt?.pluginInfo?.pluginManifest.name;
  let path = prompt?.skillFile?.path;
  return {
    source: command === undefined ? "built-in" : skillSourceOf(command),
    ...(pluginName !== undefined && {
      pluginName,
    }),
    ...(path !== undefined && {
      path,
    }),
  };
}
//@ chunk-5xgkngpb.js:79170-79197 placement
/**
 * skill.prompt 事件
 */
var SKILL_PROMPT_EVENT; // deferred: uses textPassthroughEvent (./coreHandlers.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:79170", () => {
  SKILL_PROMPT_EVENT = textPassthroughEvent("skill.prompt");
});
//@ chunk-5xgkngpb.js:79197-79705 placement
/**
 * 为 skill.prompt 准备技能 frontmatter 的纯数据副本；无法复制或有问题时给空对象并说明原因。
 */
function skillFrontmatterFor(skillName, command) {
  let skillFile = command?.type === "prompt" ? command.skillFile : undefined;
  if (skillFile === undefined) return withFrontmatter({});
  let frontmatterProblem = skillFile.frontmatterProblem;
  if (frontmatterProblem === undefined)
    try {
      let droppedKeys = new Set();
      let frontmatter = isPlainDataValue(skillFile.frontmatterAsWritten, new Map(), droppedKeys);
      let problem = checkPlainData(frontmatter);
      if (problem === undefined && isPlainDataObject(frontmatter)) {
        let mapped = [...droppedKeys].sort().map((key) => `a key ${key}`);
        return mapped.length === 0
          ? withFrontmatter(frontmatter)
          : {
              frontmatter,
              frontmatterProblem: `left out ${mapped.join(" and ")}`,
            };
      }
      frontmatterProblem = problem ?? "is no table";
    } catch (error) {
      frontmatterProblem = `could not be copied (${errorMessage(error)})`;
    }
  logForDebugging(`skill.prompt: ${skillName}'s frontmatter is handed as {} (${frontmatterProblem})`, {
    level: "warn",
  });
  return skillProblemResult(frontmatterProblem);
}
//@ chunk-5xgkngpb.js:79705-79951 placement
/**
 * 有 skill.prompt 钩子时让钩子改写技能提示文本（保留非文本块），否则原样返回。
 */
async function applySkillPromptHooks(skillName, promptForCommand, command) {
  if (
    !hasModuleHookingSite("skill.prompt", {
      skill: skillName,
    })
  )
    return [...promptForCommand];
  let text = joinTextBlocks(
    promptForCommand,
    `
`,
  );
  let answer = await NO_CORE_AT_CHAIN_BOTTOM(
    "skill.prompt",
    {},
  )({
    skill: skillName,
    text,
    ...skillFrontmatterFor(skillName, command),
    ...skillProvenance(command),
  });
  return answer.text === text
    ? [...promptForCommand]
    : [
        {
          type: "text",
          text: answer.text,
        },
        ...promptForCommand.filter((block) => block.type !== "text"),
      ];
}
//@ chunk-5xgkngpb.js:79951-80029 placement
/**
 * 合法日期或当前时间
 */
function safeDate(loggedAt) {
  let date = new Date(loggedAt);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}
//@ chunk-5xgkngpb.js:80029-80064 placement
/**
 * Array.from 包装
 */
var toArrayLike = (value) => Array.from(Object(value));
export { toArrayLike, safeDate, SKILL_PROMPT_EVENT, applySkillPromptHooks, skillSourceOf };
