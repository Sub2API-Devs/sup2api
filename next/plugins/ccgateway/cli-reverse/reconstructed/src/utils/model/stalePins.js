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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:516936-516966 placement
var STARTUP_PROBE_DEADLINE_MS = 20000;
var PROBE_TAIL_MARGIN_MS = 8000;
var PROBE_HEAD_MARGIN_MS = 4000;
//@ chunk-s61vbvea.js:516966-517001 placement
function lastLiveRoundStart(now) {
  return now + STARTUP_PROBE_DEADLINE_MS - PROBE_TAIL_MARGIN_MS - PROBE_HEAD_MARGIN_MS;
}
//@ chunk-s61vbvea.js:517001-517024 placement
var keys; // deferred: uses catalogEntriesByFirstPartyId (./modelCatalog.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:517001", () => {
  keys = Object.keys(catalogEntriesByFirstPartyId);
});
//@ chunk-s61vbvea.js:517024-517310 placement
function tierConfig(opusKey, sonnetKey = DEFAULT_3P_SONNET_KEY, haikuKey = DEFAULT_3P_HAIKU_KEY) {
  return {
    sonnet: {
      envVarPriority: ["ANTHROPIC_DEFAULT_SONNET_MODEL"],
      ...resolveTierDefaultKey("sonnet", sonnetKey),
    },
    opus: {
      envVarPriority: ["ANTHROPIC_DEFAULT_OPUS_MODEL"],
      ...resolveTierDefaultKey("opus", opusKey),
    },
    haiku: {
      envVarPriority: ["ANTHROPIC_SMALL_FAST_MODEL", "ANTHROPIC_DEFAULT_HAIKU_MODEL"],
      ...resolveTierDefaultKey("haiku", haikuKey),
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
function resolveTierDefaultKey(tier, defaultKey) {
  let target = documentTierAliasTarget(tier);
  if (
    target === undefined ||
    enforcedAllowlistLeavesOut(
      target.key !== undefined ? String(getRawModelStrings()[target.key]) : target.modelId,
    )
  )
    return {
      defaultKey,
    };
  if (target.key !== undefined)
    return target.key === defaultKey
      ? {
          defaultKey: target.key,
        }
      : {
          defaultKey: target.key,
          fromDocument: true,
        };
  return {
    defaultKey,
    documentTarget: {
      modelId: target.modelId,
      ...(target.overrideKey !== undefined && {
        overrideKey: target.overrideKey,
      }),
      name: target.name,
    },
    fromDocument: true,
  };
}
//@ chunk-s61vbvea.js:517682-517725 placement
/**
 * 去掉模型键结尾数字（opus55 变 opus）。
 */
function stripTrailingDigits(modelKey) {
  return modelKey.replace(/\d+$/, "");
}
//@ chunk-s61vbvea.js:517725-517806 placement = aliasMatchesParentTier (1)
/**
 * 模型键对应的档位 sonnet/opus/haiku。
 */
function getTierFromModelKey(modelKey) {
  let canonical = stripTrailingDigits(modelKey);
  return canonical === "sonnet" || canonical === "opus" || canonical === "haiku" ? canonical : undefined;
}
//@ chunk-s61vbvea.js:517806-517893 placement
/**
 * 规范名匹配某 catalog 键的第一方 id 时返回键。
 */
function findModelKeyByModelId(modelId) {
  let canonical = firstPartyNameToCanonical(modelId);
  for (let key of keys)
    if (firstPartyNameToCanonical(catalogEntriesByFirstPartyId[key].firstParty) === canonical) return key;
  return;
}
//@ chunk-s61vbvea.js:517893-517944 placement
/**
 * "<fromKey>-to-<toKey>"。
 */
function upgradeKey(change) {
  return `${change.fromKey}-to-${change.toKey}`;
}
//@ chunk-s61vbvea.js:517944-518404 placement
/**
 * 第三方：ANTHROPIC_DEFAULT_*_MODEL 固定到比内置默认更旧版本的档位（托管设置里配置的跳过），列出 {tier, envVar, pinnedKey, defaultKey}。
 */
function collectStalePins(tierConfig, isUserChosen) {
  let stale = [];
  let env = getSettingsForSource("policySettings")?.env ?? {};
  for (let key of Object.keys(tierConfig)) {
    let config = tierConfig[key];
    let pinnedEnvVar;
    let pinnedKey;
    for (let envVar of config.envVarPriority) {
      let trimmed = process.env[envVar]?.trim();
      if (!trimmed) continue;
      if (Object.hasOwn(env, envVar)) break;
      if (isProbeWrittenTierDefault(envVar)) continue;
      if (isUserChosen?.(trimmed)) continue;
      let modelKeyByModelId = findModelKeyByModelId(trimmed);
      if (
        !modelKeyByModelId ||
        getTierFromModelKey(modelKeyByModelId) !== key ||
        modelKeyByModelId === config.defaultKey
      )
        continue;
      pinnedEnvVar = envVar;
      pinnedKey = modelKeyByModelId;
      break;
    }
    if (!pinnedEnvVar || !pinnedKey) continue;
    let defaultKey = config.defaultKey;
    let index = keys.indexOf(pinnedKey);
    let index_2 = keys.indexOf(defaultKey);
    if (index >= index_2) continue;
    stale.push({
      tier: key,
      envVar: pinnedEnvVar,
      pinnedKey,
      defaultKey,
    });
  }
  return stale;
}
//@ chunk-s61vbvea.js:518404-518673 placement
/**
 * 给定值对应非 haiku 档位且未被 modelOverrides 指向时，返回 {tier, envVar, value}。
 */
function seedEnvDefaultForUserPin(model, tierConfig) {
  let trimmed = model?.trim();
  if (!trimmed) return;
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) return;
  let modelKeyByModelId = findModelKeyByModelId(trimmed);
  if (!modelKeyByModelId) return;
  let tierFromModelKey = getTierFromModelKey(modelKeyByModelId);
  if (!tierFromModelKey) return;
  if (tierFromModelKey === "haiku") return;
  let tierEntry = tierConfig[tierFromModelKey];
  if (isTierDocumentTargetOverridden(tierEntry, getInitialSettings_2().modelOverrides)) return;
  return {
    tier: tierFromModelKey,
    envVar: tierEntry.envVarPriority.at(-1),
    value: trimmed,
  };
}
//@ chunk-s61vbvea.js:518673-518814 placement
/**
 * 档位文档目标在 modelOverrides 中已配置。
 */
function isTierDocumentTargetOverridden(tierEntry, modelOverrides) {
  let overrideKey =
    tierEntry.documentTarget === undefined
      ? catalogEntriesByFirstPartyId[tierEntry.defaultKey].firstParty
      : tierEntry.documentTarget.overrideKey;
  return overrideKey !== undefined && Boolean(modelOverrides?.[overrideKey]);
}
//@ chunk-s61vbvea.js:518814-519139 placement
/**
 * 没有任何环境变量固定的档位列表。
 */
function collectUnpinnedTiers(tierConfig, modelOverrides) {
  let unpinned = [];
  for (let key of Object.keys(tierConfig)) {
    let entry = tierConfig[key];
    if (isTierDocumentTargetOverridden(entry, modelOverrides)) continue;
    if (
      entry.envVarPriority.some((envVar) => {
        let trimmed = process.env[envVar]?.trim();
        if (!trimmed) return false;
        if (isProbeWrittenTierDefault(envVar) && !isProbedDefault(envVar)) return false;
        let modelKeyByModelId = findModelKeyByModelId(trimmed);
        if (!modelKeyByModelId) return true;
        return getTierFromModelKey(modelKeyByModelId) === key;
      })
    )
      continue;
    unpinned.push({
      tier: key,
      envVar: entry.envVarPriority.at(-1),
      defaultKey: entry.defaultKey,
    });
  }
  return unpinned;
}
//@ chunk-s61vbvea.js:519139-519172 placement
/**
 * 白名单检查明确为 false。
 */
function enforcedAllowlistLeavesOut(modelId) {
  return isModelAllowedUnderActiveEnforcement(modelId) === false;
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
function leftOutDebugLine(tier, phase, ids) {
  let idPhrase = ids.length === 1 ? "this id" : "these ids";
  let phaseSuffix = phase === "check" ? "; the tier is left as it is" : "";
  return `${tier}: ${MANAGED_SKIP_VERBS[phase]} ${ids.join(", ")} because managed settings do not allow ${idPhrase} as spelled here (matched by no enforced availableModels entry, named in deniedModels, or the settings failed to load)${phaseSuffix}`;
}
//@ chunk-s61vbvea.js:519603-519811 placement
/**
 * 该 ANTHROPIC_DEFAULT_*_MODEL 是否由第三方探测写入。
 */
function isProbeWrittenTierDefault(envVar) {
  switch (envVar) {
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
function olderFirstPartyIdsInFamily(modelId) {
  let modelKey = findModelKeyByModelId(modelId);
  if (!modelKey) return [];
  let familyKey = stripTrailingDigits(modelKey);
  return keys
    .slice(0, keys.indexOf(modelKey))
    .filter((key) => stripTrailingDigits(key) === familyKey)
    .reverse()
    .map((key) => catalogEntriesByFirstPartyId[key].firstParty);
}
//@ chunk-s61vbvea.js:519959-520079 placement
/**
 * catalog 中排在给定键之前（更旧）的同档模型键。
 */
function predecessorsInTier(modelKey, tier, includeDefault = false) {
  let index = keys.indexOf(modelKey);
  let predecessors = [];
  for (let cursor = includeDefault ? index : index - 1; cursor >= 0; cursor--) {
    let key = keys[cursor];
    if (getTierFromModelKey(key) === tier) predecessors.push(key);
  }
  return predecessors;
}
//@ chunk-s61vbvea.js:520079-520415 placement
/**
 * 第三方提供商默认模型候选中，探测函数判定不可用的条目。
 */
async function refuteUnavailableDocumentDefaults(probe, modelOverrides) {
  let filtered = cloudDocumentDefaultCandidates().filter((candidate) => {
    let overrideKey =
      candidate.key !== undefined
        ? catalogEntriesByFirstPartyId[candidate.key].firstParty
        : candidate.overrideKey;
    return overrideKey === undefined || !modelOverrides?.[overrideKey];
  });
  return (
    await Promise.all(
      filtered.map(async (documentCandidate) => {
        let tier =
          documentCandidate.key !== undefined
            ? getTierFromModelKey(documentCandidate.key)
            : toTier(documentCandidate.family);
        return (await probe(documentCandidate.model, tier))
          ? null
          : {
              candidate: documentCandidate.candidate,
              modelId: documentCandidate.model,
              name: documentCandidate.name,
              tier,
            };
      }),
    )
  ).filter((result) => result !== null);
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
  upgradeKey,
};
