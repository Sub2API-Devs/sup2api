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
import { No } from "./modelCatalog.js";
import { DEFAULT_3P_SONNET_KEY, DEFAULT_3P_HAIKU_KEY, documentTierAliasTarget } from "./model.js";
import { Cpr } from "./modelCatalog/servedCatalog.js";
import { getRawModelStrings } from "./modelStrings.js";
import { firstPartyNameToCanonical } from "./modelFallback.js";
import { getSettingsForSource, getInitialSettings_2 } from "../settings/settings.js";
import { env } from "../env.js";
import { isProbedDefault, userConfiguredDefault } from "./thirdPartyModelDefaults.js";
import { isModelAllowedUnderActiveEnforcement } from "./defaultModel.js";
import { cloudDocumentDefaultCandidates } from "./planModeModel.js";

//@ chunk-s61vbvea.js:516936-516966 placement
var STARTUP_PROBE_DEADLINE_MS = 20000,
  p$ = 8000,
  m$ = 4000;
//@ chunk-s61vbvea.js:516966-517001 placement
function lastLiveRoundStart(e) {
  return e + STARTUP_PROBE_DEADLINE_MS - p$ - m$;
}
//@ chunk-s61vbvea.js:517001-517024 placement
var keys = Object.keys(No);
//@ chunk-s61vbvea.js:517024-517310 placement
function tierConfig(e, n = DEFAULT_3P_SONNET_KEY, r = DEFAULT_3P_HAIKU_KEY) {
  return {
    sonnet: { envVarPriority: ["ANTHROPIC_DEFAULT_SONNET_MODEL"], ...resolveTierDefaultKey("sonnet", n) },
    opus: { envVarPriority: ["ANTHROPIC_DEFAULT_OPUS_MODEL"], ...resolveTierDefaultKey("opus", e) },
    haiku: {
      envVarPriority: ["ANTHROPIC_SMALL_FAST_MODEL", "ANTHROPIC_DEFAULT_HAIKU_MODEL"],
      ...resolveTierDefaultKey("haiku", r),
    },
  };
}
//@ chunk-s61vbvea.js:517310-517338 placement
function documentMayMoveTiers() {
  return Cpr();
}
/**
 * 根据目录文档给出的档位别名目标决定默认模型键：无目标或被白名单排除时用编译默认；目标是已知键时使用它（标记来自文档）；否则带出文档中的模型 id 与名称。
 */
//@ chunk-s61vbvea.js:517338-517682 placement
function resolveTierDefaultKey(e, n) {
  let r = documentTierAliasTarget(e);
  if (
    r === void 0 ||
    enforcedAllowlistLeavesOut(r.key !== void 0 ? String(getRawModelStrings()[r.key]) : r.modelId)
  )
    return { defaultKey: n };
  if (r.key !== void 0) return r.key === n ? { defaultKey: r.key } : { defaultKey: r.key, fromDocument: !0 };
  return {
    defaultKey: n,
    documentTarget: {
      modelId: r.modelId,
      ...(r.overrideKey !== void 0 && { overrideKey: r.overrideKey }),
      name: r.name,
    },
    fromDocument: !0,
  };
}
/**
 * 去掉模型键结尾数字（opus55 变 opus）。
 */
//@ chunk-s61vbvea.js:517682-517725 placement
function stripTrailingDigits(e) {
  return e.replace(/\d+$/, "");
}
/**
 * 模型键对应的档位 sonnet/opus/haiku。
 */
//@ chunk-s61vbvea.js:517725-517806 placement = aliasMatchesParentTier (1)
function getTierFromModelKey(e) {
  let canonical = stripTrailingDigits(e);
  return canonical === "sonnet" || canonical === "opus" || canonical === "haiku" ? canonical : void 0;
}
/**
 * 规范名匹配某 catalog 键的第一方 id 时返回键。
 */
//@ chunk-s61vbvea.js:517806-517893 placement
function findModelKeyByModelId(e) {
  let n = firstPartyNameToCanonical(e);
  for (let r of keys) if (firstPartyNameToCanonical(No[r].firstParty) === n) return r;
  return;
}
/**
 * "<fromKey>-to-<toKey>"。
 */
//@ chunk-s61vbvea.js:517893-517944 placement
function upgradeKey(e) {
  return `${e.fromKey}-to-${e.toKey}`;
}
/**
 * 第三方：ANTHROPIC_DEFAULT_*_MODEL 固定到比内置默认更旧版本的档位（托管设置里配置的跳过），列出 {tier, envVar, pinnedKey, defaultKey}。
 */
//@ chunk-s61vbvea.js:517944-518404 placement
function collectStalePins(e, n) {
  let r = [],
    s = getSettingsForSource("policySettings")?.env ?? {};
  for (let h of Object.keys(e)) {
    let y = e[h],
      S,
      w;
    for (let j of y.envVarPriority) {
      let G = process.env[j]?.trim();
      if (!G) continue;
      if (Object.hasOwn(s, j)) break;
      if (isProbeWrittenTierDefault(j)) continue;
      if (n?.(G)) continue;
      let L = findModelKeyByModelId(G);
      if (!L || getTierFromModelKey(L) !== h || L === y.defaultKey) continue;
      ((S = j), (w = L));
      break;
    }
    if (!S || !w) continue;
    let defaultKey = y.defaultKey,
      index = keys.indexOf(w),
      index_2 = keys.indexOf(defaultKey);
    if (index >= index_2) continue;
    r.push({ tier: h, envVar: S, pinnedKey: w, defaultKey: defaultKey });
  }
  return r;
}
/**
 * 给定值对应非 haiku 档位且未被 modelOverrides 指向时，返回 {tier, envVar, value}。
 */
//@ chunk-s61vbvea.js:518404-518673 placement
function seedEnvDefaultForUserPin(e, n) {
  let r = e?.trim();
  if (!r) return;
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) return;
  let s = findModelKeyByModelId(r);
  if (!s) return;
  let h = getTierFromModelKey(s);
  if (!h) return;
  if (h === "haiku") return;
  let y = n[h];
  if (isTierDocumentTargetOverridden(y, getInitialSettings_2().modelOverrides)) return;
  return { tier: h, envVar: y.envVarPriority.at(-1), value: r };
}
/**
 * 档位文档目标在 modelOverrides 中已配置。
 */
//@ chunk-s61vbvea.js:518673-518814 placement
function isTierDocumentTargetOverridden(e, n) {
  let r = e.documentTarget === void 0 ? No[e.defaultKey].firstParty : e.documentTarget.overrideKey;
  return r !== void 0 && Boolean(n?.[r]);
}
/**
 * 没有任何环境变量固定的档位列表。
 */
//@ chunk-s61vbvea.js:518814-519139 placement
function collectUnpinnedTiers(e, n) {
  let r = [];
  for (let s of Object.keys(e)) {
    let h = e[s];
    if (isTierDocumentTargetOverridden(h, n)) continue;
    if (
      h.envVarPriority.some((S) => {
        let w = process.env[S]?.trim();
        if (!w) return !1;
        if (isProbeWrittenTierDefault(S) && !isProbedDefault(S)) return !1;
        let R = findModelKeyByModelId(w);
        if (!R) return !0;
        return getTierFromModelKey(R) === s;
      })
    )
      continue;
    r.push({ tier: s, envVar: h.envVarPriority.at(-1), defaultKey: h.defaultKey });
  }
  return r;
}
/**
 * 白名单检查明确为 false。
 */
//@ chunk-s61vbvea.js:519139-519172 placement
function enforcedAllowlistLeavesOut(e) {
  return isModelAllowedUnderActiveEnforcement(e) === !1;
}
/**
 * check/fallback/upgrade 被托管设置跳过时的描述动词。
 */
//@ chunk-s61vbvea.js:519172-519291 placement
var MANAGED_SKIP_VERBS = {
  check: "skipped the availability check of",
  fallback: "not falling back to",
  upgrade: "not offering an upgrade to",
};
/**
 * "managed settings do not allow …" 日志文案。
 */
//@ chunk-s61vbvea.js:519291-519603 placement
function leftOutDebugLine(e, n, r) {
  let s = r.length === 1 ? "this id" : "these ids",
    h = n === "check" ? "; the tier is left as it is" : "";
  return `${e}: ${MANAGED_SKIP_VERBS[n]} ${r.join(", ")} because managed settings do not allow ${s} as spelled here (matched by no enforced availableModels entry, named in deniedModels, or the settings failed to load)${h}`;
}
/**
 * 该 ANTHROPIC_DEFAULT_*_MODEL 是否由第三方探测写入。
 */
//@ chunk-s61vbvea.js:519603-519811 placement
function isProbeWrittenTierDefault(e) {
  switch (e) {
    case "ANTHROPIC_DEFAULT_OPUS_MODEL":
      return userConfiguredDefault("opus");
    case "ANTHROPIC_DEFAULT_SONNET_MODEL":
      return userConfiguredDefault("sonnet");
    case "ANTHROPIC_DEFAULT_HAIKU_MODEL":
      return userConfiguredDefault("haiku");
    default:
      return !1;
  }
}
/**
 * 比给定模型更旧的同族模型第一方 id（从新到旧）。
 */
//@ chunk-s61vbvea.js:519811-519959 placement
function olderFirstPartyIdsInFamily(e) {
  let n = findModelKeyByModelId(e);
  if (!n) return [];
  let r = stripTrailingDigits(n);
  return keys
    .slice(0, keys.indexOf(n))
    .filter((s) => stripTrailingDigits(s) === r)
    .reverse()
    .map((s) => No[s].firstParty);
}
/**
 * catalog 中排在给定键之前（更旧）的同档模型键。
 */
//@ chunk-s61vbvea.js:519959-520079 placement
function predecessorsInTier(e, n, r = !1) {
  let index = keys.indexOf(e),
    h = [];
  for (let y = r ? index : index - 1; y >= 0; y--) {
    let S = keys[y];
    if (getTierFromModelKey(S) === n) h.push(S);
  }
  return h;
}
/**
 * 第三方提供商默认模型候选中，探测函数判定不可用的条目。
 */
//@ chunk-s61vbvea.js:520079-520415 placement
async function refuteUnavailableDocumentDefaults(e, n) {
  let filtered = cloudDocumentDefaultCandidates().filter((h) => {
    let y = h.key !== void 0 ? No[h.key].firstParty : h.overrideKey;
    return y === void 0 || !n?.[y];
  });
  return (
    await Promise.all(
      filtered.map(async (h) => {
        let y = h.key !== void 0 ? getTierFromModelKey(h.key) : toTier(h.family);
        return (await e(h.model, y))
          ? null
          : { candidate: h.candidate, modelId: h.model, name: h.name, tier: y };
      }),
    )
  ).filter((h) => h !== null);
}
/**
 * sonnet/opus/haiku 之一时原样返回，否则 undefined。
 */
//@ chunk-s61vbvea.js:520415-520484 placement = aliasMatchesParentTier (1)
function toTier(e) {
  return e === "sonnet" || e === "opus" || e === "haiku" ? e : void 0;
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
