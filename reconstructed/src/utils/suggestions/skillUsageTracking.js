/**
 * utils/suggestions/skillUsageTracking.ts
 *
 * 技能使用次数与最近时间记录，用于补全排序
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/suggestions/skillUsageTracking.ts
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 1, fingerprint 2
 */
import { yX, scr } from "./suggestionCache.js";
import { saveGlobalConfig, getGlobalConfig } from "../config.js";
import { getOwn } from "../objectSafety.js";

/**
 * 记录技能被调用：发出事件，并（节流后）在全局配置中累加使用次数与最近时间。
 */
//@ chunk-e6aww6q8.js:2313915-2314225 placement
function recordSkillInvoked(e, n, r, s = n) {
  let of = yX.of(e);
  of.skillInvoked.emit(s);
  let now = Date.now(),
    S = of.skillUsageLastWriteAt.get(n);
  if (S !== void 0 && now - S < scr) return;
  (of.skillUsageLastWriteAt.set(n, now),
    saveGlobalConfig((w) => {
      let L = getOwn(w.skillUsage ?? {}, n);
      return {
        ...w,
        skillUsage: { ...w.skillUsage, [n]: { usageCount: (L?.usageCount ?? 0) + 1, lastUsedAt: now } },
      };
    }, r));
}
//@ chunk-e6aww6q8.js:2314225-2314409 fingerprint = recordSkillUsage (0.847)
function recordSkillUsage(e, n) {
  let r = getGlobalConfig().skillUsage ?? {},
    s = getOwn(r, e) ?? (n ? getOwn(r, n) : void 0);
  if (!s) return null;
  return { usageCount: s.usageCount, daysSinceUse: Math.floor((Date.now() - s.lastUsedAt) / 86400000) };
}
/**
 * 技能使用评分：按使用次数与最近使用时间计算排序分数。
 */
//@ chunk-e6aww6q8.js:2314409-2314569 fingerprint = getSkillUsageScore (1)
function getSkillUsageScore(skillName) {
  let n = getOwn(getGlobalConfig().skillUsage ?? {}, skillName);
  if (!n) return 0;
  let daysSinceUse = (Date.now() - n.lastUsedAt) / 86400000,
    recencyFactor = Math.pow(0.5, daysSinceUse / 7);
  return n.usageCount * Math.max(recencyFactor, 0.1);
}

export { getSkillUsageScore, recordSkillInvoked, recordSkillUsage };
