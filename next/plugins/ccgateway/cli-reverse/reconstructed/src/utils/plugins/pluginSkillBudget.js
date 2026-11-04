/**
 * utils/plugins/pluginSkillBudget.ts
 *
 * 2.1.316 新增：统计各插件可被模型调用的技能占用的描述预算。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vqq8wr5t.js (2)
 * attribution: placement 2
 */
import {
  getCommandDescription,
  getSkillDescMaxChars,
  getSkillListingLabel,
  getCharBudget,
} from "../../tools/SkillTool/prompt.js";

//@ chunk-vqq8wr5t.js:240-327 placement
function skillDescriptionBudget(commandName, label) {
  let commandDescription = getCommandDescription(commandName);
  let min = Math.min(commandDescription.length, getSkillDescMaxChars());
  return 2 + getSkillListingLabel(commandName, label).length + 2 + min + 1;
}
//@ chunk-vqq8wr5t.js:327-965 placement
/**
 * 统计各插件可被模型调用的技能占用的描述预算。
 */
function pluginSkillBudgetUsage(commands, charsPerToken, limit) {
  let byPlugin = new Map();
  for (let command of commands) {
    if (command.type !== "prompt" || command.disableModelInvocation) continue;
    let pluginName = command.pluginInfo?.pluginManifest.name;
    if (!pluginName) continue;
    let chars = skillDescriptionBudget(command, commands);
    let entries = byPlugin.get(pluginName) ?? [];
    entries.push({
      name: command.name,
      chars,
      approxTokens: Math.round(chars / charsPerToken),
    });
    byPlugin.set(pluginName, entries);
  }
  let sorted = [...byPlugin.entries()]
    .map(([pluginName, entries]) => {
      entries.sort((left, right) => right.chars - left.chars);
      let reduced = entries.reduce((acc, sum) => acc + sum.chars, 0);
      return {
        pluginName,
        skillCount: entries.length,
        chars: reduced,
        approxTokens: Math.round(reduced / charsPerToken),
        skills: entries,
      };
    })
    .sort((left, right) => right.chars - left.chars);
  let reduced = sorted.reduce((acc, entry) => acc + entry.chars, 0);
  let charBudget = getCharBudget(limit, charsPerToken);
  let overBudget = reduced > charBudget;
  let totalChars = overBudget ? charBudget : reduced;
  return {
    byPlugin: sorted,
    totalChars,
    totalTokens: Math.round(totalChars / charsPerToken),
    overBudget,
    budgetTokens: Math.round(charBudget / charsPerToken),
  };
}
export { pluginSkillBudgetUsage };
