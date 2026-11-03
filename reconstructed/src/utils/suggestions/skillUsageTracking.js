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
import { suggestionCacheBySessionRoot, SUGGESTION_CACHE_TTL_MS } from "./suggestionCache.js";
import { saveGlobalConfig, getGlobalConfig } from "../config.js";
import { getOwn } from "../objectSafety.js";

//@ chunk-e6aww6q8.js:2313915-2314225 placement
/**
 * 记录技能被调用：发出事件，并（节流后）在全局配置中累加使用次数与最近时间。
 */
function recordSkillInvoked(session, name, storageV5, skillName = name) {
  let h = suggestionCacheBySessionRoot.of(session);
  h.skillInvoked.emit(skillName);
  let now = Date.now();
  let S = h.skillUsageLastWriteAt.get(name);
  if (S !== undefined && now - S < SUGGESTION_CACHE_TTL_MS) return;
  h.skillUsageLastWriteAt.set(name, now);
  saveGlobalConfig((w) => {
    let L = getOwn(w.skillUsage ?? {}, name);
    return {
      ...w,
      skillUsage: {
        ...w.skillUsage,
        [name]: {
          usageCount: (L?.usageCount ?? 0) + 1,
          lastUsedAt: now,
        },
      },
    };
  }, storageV5);
}
//@ chunk-e6aww6q8.js:2314225-2314409 fingerprint = recordSkillUsage (0.847)
function recordSkillUsage(name, n) {
  let skillUsage = getGlobalConfig().skillUsage ?? {};
  let s = getOwn(skillUsage, name) ?? (n ? getOwn(skillUsage, n) : undefined);
  if (!s) return null;
  return {
    usageCount: s.usageCount,
    daysSinceUse: Math.floor((Date.now() - s.lastUsedAt) / 86400000),
  };
}
//@ chunk-e6aww6q8.js:2314409-2314569 fingerprint = getSkillUsageScore (1)
/**
 * 技能使用评分：按使用次数与最近使用时间计算排序分数。
 */
function getSkillUsageScore(skillName) {
  let n = getOwn(getGlobalConfig().skillUsage ?? {}, skillName);
  if (!n) return 0;
  let daysSinceUse = (Date.now() - n.lastUsedAt) / 86400000;
  let recencyFactor = Math.pow(0.5, daysSinceUse / 7);
  return n.usageCount * Math.max(recencyFactor, 0.1);
}
export { getSkillUsageScore, recordSkillInvoked, recordSkillUsage };
