/**
 * utils/model/stalePins.ts
 *
 * 过期模型固定（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (22)
 * attribution: placement 22
 */
import { catalogEntriesByFirstPartyId } from "./modelCatalog.js";
import { DEFAULT_3P_SONNET_KEY, DEFAULT_3P_HAIKU_KEY, documentTierAliasTarget } from "./model.js";
import { isEffectiveCatalogActive } from "./modelCatalog/servedCatalog.js";
import { getRawModelStrings } from "./modelStrings.js";
import { firstPartyNameToCanonical } from "./modelFallback.js";
import { getSettingsForSource, getInitialSettings_2 } from "../settings/settings.js";
import { env } from "../env.js";
import { isProbedDefault, userConfiguredDefault } from "./thirdPartyModelDefaults.js";
import { isModelAllowedUnderActiveEnforcement } from "./defaultModel.js";
import { cloudDocumentDefaultCandidates } from "./planModeModel.js";

//@ chunk-s61vbvea.js:516936-516966 placement
var STARTUP_PROBE_DEADLINE_MS = 20000;
var PROBE_TAIL_MARGIN_MS = 8000;
var PROBE_HEAD_MARGIN_MS = 4000;
//@ chunk-s61vbvea.js:516966-517001 placement
function lastLiveRoundStart(e) {
  return e + STARTUP_PROBE_DEADLINE_MS - PROBE_TAIL_MARGIN_MS - PROBE_HEAD_MARGIN_MS;
}
//@ chunk-s61vbvea.js:517001-517024 placement
var keys = Object.keys(catalogEntriesByFirstPartyId);
//@ chunk-s61vbvea.js:517024-517310 placement
function tierConfig(e, n = DEFAULT_3P_SONNET_KEY, r = DEFAULT_3P_HAIKU_KEY) {
  return {
    sonnet: {
      envVarPriority: ["ANTHROPIC_DEFAULT_SONNET_MODEL"],
      ...resolveTierDefaultKey("sonnet", n),
    },
    opus: {
      envVarPriority: ["ANTHROPIC_DEFAULT_OPUS_MODEL"],
      ...resolveTierDefaultKey("opus", e),
    },
    haiku: {
      envVarPriority: ["ANTHROPIC_SMALL_FAST_MODEL", "ANTHROPIC_DEFAULT_HAIKU_MODEL"],
      ...resolveTierDefaultKey("haiku", r),
    },
  };
}
//@ chunk-s61vbvea.js:517310-517338 placement
function documentMayMoveTiers() {
  return isEffectiveCatalogActive();
}
//@ chunk-s61vbvea.js:517338-517682 placement
/**
 * 根据目录文档给出的档位别名目标决定默认模型键：无目标或被白名单排除时用编译默认；目标是已知键时使用它（标记来自文档）；否则带出文档中的模型 id 与名称。
 */
function resolveTierDefaultKey(e, n) {
  let r = documentTierAliasTarget(e);
  if (
    r === undefined ||
    enforcedAllowlistLeavesOut(r.key !== undefined ? String(getRawModelStrings()[r.key]) : r.modelId)
  )
    return {
      defaultKey: n,
    };
  if (r.key !== undefined)
    return r.key === n
      ? {
          defaultKey: r.key,
        }
      : {
          defaultKey: r.key,
          fromDocument: true,
        };
  return {
    defaultKey: n,
    documentTarget: {
      modelId: r.modelId,
      ...(r.overrideKey !== undefined && {
        overrideKey: r.overrideKey,
      }),
      name: r.name,
    },
    fromDocument: true,
  };
}
//@ chunk-s61vbvea.js:517682-517725 placement
/**
 * 去掉模型键结尾数字（opus55 变 opus）。
 */
function stripTrailingDigits(e) {
  return e.replace(/\d+$/, "");
}
//@ chunk-s61vbvea.js:517725-517806 placement = aliasMatchesParentTier (1)
/**
 * 模型键对应的档位 sonnet/opus/haiku。
 */
function getTierFromModelKey(modelKeyByModelId) {
  let canonical = stripTrailingDigits(modelKeyByModelId);
  return canonical === "sonnet" || canonical === "opus" || canonical === "haiku" ? canonical : undefined;
}
//@ chunk-s61vbvea.js:517806-517893 placement
/**
 * 规范名匹配某 catalog 键的第一方 id 时返回键。
 */
function findModelKeyByModelId(e) {
  let n = firstPartyNameToCanonical(e);
  for (let r of keys)
    if (firstPartyNameToCanonical(catalogEntriesByFirstPartyId[r].firstParty) === n) return r;
  return;
}
//@ chunk-s61vbvea.js:517893-517944 placement
/**
 * "<fromKey>-to-<toKey>"。
 */
function upgradeKey(e) {
  return `${e.fromKey}-to-${e.toKey}`;
}
//@ chunk-s61vbvea.js:517944-518404 placement
/**
 * 第三方：ANTHROPIC_DEFAULT_*_MODEL 固定到比内置默认更旧版本的档位（托管设置里配置的跳过），列出 {tier, envVar, pinnedKey, defaultKey}。
 */
function collectStalePins(e, n) {
  let r = [];
  let env = getSettingsForSource("policySettings")?.env ?? {};
  for (let key of Object.keys(e)) {
    let y = e[key];
    let S;
    let w;
    for (let j of y.envVarPriority) {
      let trimmed = process.env[j]?.trim();
      if (!trimmed) continue;
      if (Object.hasOwn(env, j)) break;
      if (isProbeWrittenTierDefault(j)) continue;
      if (n?.(trimmed)) continue;
      let modelKeyByModelId = findModelKeyByModelId(trimmed);
      if (
        !modelKeyByModelId ||
        getTierFromModelKey(modelKeyByModelId) !== key ||
        modelKeyByModelId === y.defaultKey
      )
        continue;
      S = j;
      w = modelKeyByModelId;
      break;
    }
    if (!S || !w) continue;
    let defaultKey = y.defaultKey;
    let index = keys.indexOf(w);
    let index_2 = keys.indexOf(defaultKey);
    if (index >= index_2) continue;
    r.push({
      tier: key,
      envVar: S,
      pinnedKey: w,
      defaultKey,
    });
  }
  return r;
}
//@ chunk-s61vbvea.js:518404-518673 placement
/**
 * 给定值对应非 haiku 档位且未被 modelOverrides 指向时，返回 {tier, envVar, value}。
 */
function seedEnvDefaultForUserPin(e, n) {
  let trimmed = e?.trim();
  if (!trimmed) return;
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) return;
  let modelKeyByModelId = findModelKeyByModelId(trimmed);
  if (!modelKeyByModelId) return;
  let tierFromModelKey = getTierFromModelKey(modelKeyByModelId);
  if (!tierFromModelKey) return;
  if (tierFromModelKey === "haiku") return;
  let y = n[tierFromModelKey];
  if (isTierDocumentTargetOverridden(y, getInitialSettings_2().modelOverrides)) return;
  return {
    tier: tierFromModelKey,
    envVar: y.envVarPriority.at(-1),
    value: trimmed,
  };
}
//@ chunk-s61vbvea.js:518673-518814 placement
/**
 * 档位文档目标在 modelOverrides 中已配置。
 */
function isTierDocumentTargetOverridden(e, n) {
  let r =
    e.documentTarget === undefined
      ? catalogEntriesByFirstPartyId[e.defaultKey].firstParty
      : e.documentTarget.overrideKey;
  return r !== undefined && Boolean(n?.[r]);
}
//@ chunk-s61vbvea.js:518814-519139 placement
/**
 * 没有任何环境变量固定的档位列表。
 */
function collectUnpinnedTiers(e, modelOverrides) {
  let r = [];
  for (let key of Object.keys(e)) {
    let h = e[key];
    if (isTierDocumentTargetOverridden(h, modelOverrides)) continue;
    if (
      h.envVarPriority.some((S) => {
        let trimmed = process.env[S]?.trim();
        if (!trimmed) return false;
        if (isProbeWrittenTierDefault(S) && !isProbedDefault(S)) return false;
        let modelKeyByModelId = findModelKeyByModelId(trimmed);
        if (!modelKeyByModelId) return true;
        return getTierFromModelKey(modelKeyByModelId) === key;
      })
    )
      continue;
    r.push({
      tier: key,
      envVar: h.envVarPriority.at(-1),
      defaultKey: h.defaultKey,
    });
  }
  return r;
}
//@ chunk-s61vbvea.js:519139-519172 placement
/**
 * 白名单检查明确为 false。
 */
function enforcedAllowlistLeavesOut(e) {
  return isModelAllowedUnderActiveEnforcement(e) === false;
}
//@ chunk-s61vbvea.js:519172-519291 placement
/**
 * check/fallback/upgrade 被托管设置跳过时的描述动词。
 */
var MANAGED_SKIP_VERBS = {
  check: "skipped the availability check of",
  fallback: "not falling back to",
  upgrade: "not offering an upgrade to",
};
//@ chunk-s61vbvea.js:519291-519603 placement
/**
 * "managed settings do not allow …" 日志文案。
 */
function leftOutDebugLine(tier, n, r) {
  let s = r.length === 1 ? "this id" : "these ids";
  let h = n === "check" ? "; the tier is left as it is" : "";
  return `${tier}: ${MANAGED_SKIP_VERBS[n]} ${r.join(", ")} because managed settings do not allow ${s} as spelled here (matched by no enforced availableModels entry, named in deniedModels, or the settings failed to load)${h}`;
}
//@ chunk-s61vbvea.js:519603-519811 placement
/**
 * 该 ANTHROPIC_DEFAULT_*_MODEL 是否由第三方探测写入。
 */
function isProbeWrittenTierDefault(e) {
  switch (e) {
    case "ANTHROPIC_DEFAULT_OPUS_MODEL":
      return userConfiguredDefault("opus");
    case "ANTHROPIC_DEFAULT_SONNET_MODEL":
      return userConfiguredDefault("sonnet");
    case "ANTHROPIC_DEFAULT_HAIKU_MODEL":
      return userConfiguredDefault("haiku");
    default:
      return false;
  }
}
//@ chunk-s61vbvea.js:519811-519959 placement
/**
 * 比给定模型更旧的同族模型第一方 id（从新到旧）。
 */
function olderFirstPartyIdsInFamily(e) {
  let modelKeyByModelId = findModelKeyByModelId(e);
  if (!modelKeyByModelId) return [];
  let r = stripTrailingDigits(modelKeyByModelId);
  return keys
    .slice(0, keys.indexOf(modelKeyByModelId))
    .filter((s) => stripTrailingDigits(s) === r)
    .reverse()
    .map((s) => catalogEntriesByFirstPartyId[s].firstParty);
}
//@ chunk-s61vbvea.js:519959-520079 placement
/**
 * catalog 中排在给定键之前（更旧）的同档模型键。
 */
function predecessorsInTier(defaultKey, tier, r = false) {
  let index = keys.indexOf(defaultKey);
  let h = [];
  for (let y = r ? index : index - 1; y >= 0; y--) {
    let S = keys[y];
    if (getTierFromModelKey(S) === tier) h.push(S);
  }
  return h;
}
//@ chunk-s61vbvea.js:520079-520415 placement
/**
 * 第三方提供商默认模型候选中，探测函数判定不可用的条目。
 */
async function refuteUnavailableDocumentDefaults(e, modelOverrides) {
  let filtered = cloudDocumentDefaultCandidates().filter((h) => {
    let y = h.key !== undefined ? catalogEntriesByFirstPartyId[h.key].firstParty : h.overrideKey;
    return y === undefined || !modelOverrides?.[y];
  });
  return (
    await Promise.all(
      filtered.map(async (h) => {
        let y = h.key !== undefined ? getTierFromModelKey(h.key) : toTier(h.family);
        return (await e(h.model, y))
          ? null
          : {
              candidate: h.candidate,
              modelId: h.model,
              name: h.name,
              tier: y,
            };
      }),
    )
  ).filter((h) => h !== null);
}
//@ chunk-s61vbvea.js:520415-520484 placement = aliasMatchesParentTier (1)
/**
 * sonnet/opus/haiku 之一时原样返回，否则 undefined。
 */
function toTier(family) {
  return family === "sonnet" || family === "opus" || family === "haiku" ? family : undefined;
}
export {
  tierConfig,
  collectUnpinnedTiers,
  enforcedAllowlistLeavesOut,
  predecessorsInTier,
  STARTUP_PROBE_DEADLINE_MS,
  seedEnvDefaultForUserPin,
  collectStalePins,
  leftOutDebugLine,
  lastLiveRoundStart,
  refuteUnavailableDocumentDefaults,
  documentMayMoveTiers,
  olderFirstPartyIdsInFamily,
};
