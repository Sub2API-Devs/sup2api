/**
 * utils/suggestions/skillUsageTracking.ts
 *
 * 技能使用次数与最近时间记录，用于补全排序
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/suggestions/skillUsageTracking.ts
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 1, fingerprint 2
 */
import { suggestionCacheBySessionRoot, SUGGESTION_CACHE_TTL_MS } from "./suggestionCache.js";
import { saveGlobalConfig, getGlobalConfig } from "../config.js";
import { getOwn } from "../objectSafety.js";

//@ chunk-5xgkngpb.js:2369303-2369613 placement
/**
 * 记录技能被调用：发出事件，并（节流后）在全局配置中累加使用次数与最近时间。
 */
function recordSkillInvoked(session, name, storageV5, skillName = name) {
  let cache = suggestionCacheBySessionRoot.of(session);
  cache.skillInvoked.emit(skillName);
  let now = Date.now();
  let lastWriteAt = cache.skillUsageLastWriteAt.get(name);
  if (lastWriteAt !== undefined && now - lastWriteAt < SUGGESTION_CACHE_TTL_MS) return;
  cache.skillUsageLastWriteAt.set(name, now);
  saveGlobalConfig((config) => {
    let existing = getOwn(config.skillUsage ?? {}, name);
    return {
      ...config,
      skillUsage: {
        ...config.skillUsage,
        [name]: {
          usageCount: (existing?.usageCount ?? 0) + 1,
          lastUsedAt: now,
        },
      },
    };
  }, storageV5);
}
//@ chunk-5xgkngpb.js:2369613-2369797 fingerprint (2.1.88 match: recordSkillUsage, 0.849)
function recordSkillUsage(skillName, fallbackName) {
  let skillUsage = getGlobalConfig().skillUsage ?? {};
  let entry = getOwn(skillUsage, skillName) ?? (fallbackName ? getOwn(skillUsage, fallbackName) : undefined);
  if (!entry) return null;
  return {
    usageCount: entry.usageCount,
    daysSinceUse: Math.floor((Date.now() - entry.lastUsedAt) / 86400000),
  };
}
//@ chunk-5xgkngpb.js:2369797-2369957 fingerprint (2.1.88 match: getSkillUsageScore, 1)
/**
 * 技能使用评分：按使用次数与最近使用时间计算排序分数。
 */
function getSkillUsageScore(skillName) {
  let entry = getOwn(getGlobalConfig().skillUsage ?? {}, skillName);
  if (!entry) return 0;
  let daysSinceUse = (Date.now() - entry.lastUsedAt) / 86400000;
  let recencyFactor = Math.pow(0.5, daysSinceUse / 7);
  return entry.usageCount * Math.max(recencyFactor, 0.1);
}
export { getSkillUsageScore, recordSkillUsage, recordSkillInvoked };
