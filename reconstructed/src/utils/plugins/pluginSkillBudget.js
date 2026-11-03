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
function skillDescriptionBudget(e, o) {
  let commandDescription = getCommandDescription(e);
  let min = Math.min(commandDescription.length, getSkillDescMaxChars());
  return 2 + getSkillListingLabel(e, o).length + 2 + min + 1;
}
//@ chunk-vqq8wr5t.js:327-965 placement
/**
 * 统计各插件可被模型调用的技能占用的描述预算。
 */
function pluginSkillBudgetUsage(e, o, p) {
  let s = new Map();
  for (let n of e) {
    if (n.type !== "prompt" || n.disableModelInvocation) continue;
    let t = n.pluginInfo?.pluginManifest.name;
    if (!t) continue;
    let a = skillDescriptionBudget(n, e);
    let r = s.get(t) ?? [];
    r.push({
      name: n.name,
      chars: a,
      approxTokens: Math.round(a / o),
    });
    s.set(t, r);
  }
  let sorted = [...s.entries()]
    .map(([n, t]) => {
      t.sort((r, u) => u.chars - r.chars);
      let reduced = t.reduce((acc, u) => acc + u.chars, 0);
      return {
        pluginName: n,
        skillCount: t.length,
        chars: reduced,
        approxTokens: Math.round(reduced / o),
        skills: t,
      };
    })
    .sort((n, t) => t.chars - n.chars);
  let reduced = sorted.reduce((acc, t) => acc + t.chars, 0);
  let charBudget = getCharBudget(p, o);
  let l = reduced > charBudget;
  let g = l ? charBudget : reduced;
  return {
    byPlugin: sorted,
    totalChars: g,
    totalTokens: Math.round(g / o),
    overBudget: l,
    budgetTokens: Math.round(charBudget / o),
  };
}
export { pluginSkillBudgetUsage };
