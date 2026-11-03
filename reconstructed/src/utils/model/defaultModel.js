/**
 * utils/model/defaultModel.ts
 *
 * 2.1.316 新增：结合 availableModels 与强制策略解析可用模型；模型强制策略状态（active/inactive/refused）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (24)
 * attribution: placement 24
 */
import {
  getModelEntitlementDenySet,
  isModelDenied,
  isModelAllowed,
  newestAllowedInFamilyForProvider,
  isBlockedByManagedModelPolicy,
  isModelDeniedByManagedSettings,
  aliasExpansionPermitted,
} from "./modelAllowlist.js";
import {
  getDefaultOpusModel,
  getDefaultSonnetModel,
  isFableFamilyOrPinnedModel,
  DEFAULT_MANTLE_OPUS_KEY,
  isLegacyOpusFirstParty,
  yn,
  strip1mTag,
  isServedExpandedSpelling,
} from "./model.js";
import {
  getDefaultHaikuModel,
  isModeDependentModelSetting,
  isOpusFableAdvisorSetting,
  lr,
  resolveDefaultMainLoopModelSetting,
  append1mSuffixIfMissing,
  zp,
} from "./planModeModel.js";
import { getCanonicalName } from "./canonicalModelName.js";
import {
  parseUserSpecifiedModel,
  isOpusDefaultSubscriber,
  applyOpus1mOptIn,
  isOpus1mMergeEnabled,
} from "./modelDisplay.js";
import { logForDebugging } from "../debug.js";
import {
  getSettingsForSource,
  getSettings_DEPRECATED,
  getFatalAdminPolicyLoadErrors,
  isPermissionDeniedPolicyError,
  adminPolicyLoadFailureRefusesLaunch,
  getPolicySettingsOrigin,
  getPairedPolicyModelOverrides,
} from "../settings/settings.js";
import { Lt, I_, Nb, parseModelId, f_r } from "./modelIds.js";
import { getInitialEnvDefaultModel } from "../../bootstrap/state.js";
import { env } from "../env.js";
import { getUserSpecifiedModelSetting, isSonnetOnlySteering } from "./smallFastModel.js";
import { isClaudeAISubscriber } from "../auth.js";
import { usesFirstPartyModelIds, getAPIProvider, isFirstPartyApiBackend } from "./providers.js";
import { getModelStrings, getRawModelStrings } from "./modelStrings.js";
import { firstPartyNameToCanonical, getDefaultMainLoopModel } from "./modelFallback.js";
import { has1mSuffix, isLegacyNo1mModel } from "./contextWindow1m.js";
import { resolveBuiltinAlias } from "./aliases.js";
import { Qs } from "../toolErrors.js";
import { getDefaultSonnetBuiltin } from "./modelOptions.js";
import { getProviderState } from "./providerCaches.js";
import { BEDROCK_REGION_PREFIXES } from "./bedrock.js";

/**
 * 被限制模型的同族默认。
 */
//@ chunk-aepeg2w5.js:444410-444950 placement
function familyDefaultFor(e) {
  let n = getModelEntitlementDenySet();
  if (!(n.size > 0 && isModelDenied(e, n)) && !Bu(e)) return null;
  let s = [
      { family: "opus", model: getDefaultOpusModel() },
      { family: "sonnet", model: getDefaultSonnetModel() },
      { family: "haiku", model: getDefaultHaikuModel() },
    ],
    h = getCanonicalName(parseUserSpecifiedModel(e)),
    index = s.findIndex((R) => h.includes(R.family)),
    S = index !== -1 ? index : isFableFamilyOrPinnedModel(parseUserSpecifiedModel(e)) ? 0 : 1;
  for (let { family: family, model: model } of s.slice(S)) {
    if (isModelAllowed(model)) return model;
    let P = newestAllowedInFamilyForProvider(family);
    if (P !== null) return P;
  }
  if (!Bu(e)) return null;
  let w = availableModelsFamilies();
  if (w === null)
    logForDebugging(
      `managed settings (deniedModels or an exact-match availableModels) block the default model ${e} and every model it could fall back to`,
      { level: "warn" },
    );
  return w;
}
/**
 * 托管 availableModels 中的模型族。
 */
//@ chunk-aepeg2w5.js:444950-445402 placement
function availableModelsFamilies() {
  let e, n;
  try {
    let r = getSettingsForSource("policySettings");
    ((e = r?.availableModels), (n = r?.availableModelsMatch === "exact"));
  } catch {
    return null;
  }
  for (let r of e ?? []) {
    let s = Lt(r.trim().toLowerCase());
    if (s === "") continue;
    let replaced = s.replace(/^claude-/, ""),
      y = I_(s) ? s : n && I_(replaced) ? replaced : null;
    if (y !== null) {
      let w = newestAllowedInFamilyForProvider(y);
      if (w !== null) return w;
      continue;
    }
    if (Nb(s) || s === "default") continue;
    let S = parseModelId(s) !== null ? s : parseModelId(`claude-${s}`) !== null ? `claude-${s}` : r.trim();
    if (isOpaqueModelId(S) && isModelAllowed(S)) return S;
  }
  return null;
}
//@ chunk-aepeg2w5.js:445402-445451 placement
function Bu(e) {
  try {
    return isBlockedByManagedModelPolicy(e);
  } catch {
    return !0;
  }
}
//@ chunk-aepeg2w5.js:445451-445500 placement
function em(e) {
  try {
    return isModelDeniedByManagedSettings(e);
  } catch {
    return !0;
  }
}
//@ chunk-aepeg2w5.js:445500-445549 placement
function Gw(e) {
  try {
    return isModelDeniedByManagedSettings(e);
  } catch {
    return !1;
  }
}
//@ chunk-aepeg2w5.js:445549-445602 placement
function ZK(e) {
  let n = getModelEntitlementDenySet();
  return !(n.size > 0 && isModelDenied(e, n));
}
//@ chunk-aepeg2w5.js:445602-445939 placement
function getEnvDefaultModel() {
  let e = getInitialEnvDefaultModel(),
    n = e === void 0 ? env.ANTHROPIC_DEFAULT_MODEL : e;
  if (n == null) return null;
  let lower = n.trim().toLowerCase();
  if (lower === "default" || lower === "inherit") return null;
  if (isModeDependentModelSetting(Lt(lower))) return null;
  if (isOpusFableAdvisorSetting(lower)) return null;
  if (
    getModelEnforcementState().state !== "inactive" ||
    getSettings_DEPRECATED()?.enforceAvailableModels === !0
  )
    return null;
  if (!isModelAllowed(n)) return null;
  if (lr(n)) return null;
  return n;
}
//@ chunk-aepeg2w5.js:445939-445999 placement
function isEnvDefaultModelGoverning() {
  return getUserSpecifiedModelSetting() == null && resolveDefaultMainLoopModelSetting().attribution === "env";
}
/**
 * 环境决定的默认模型设置。
 */
//@ chunk-aepeg2w5.js:445999-446390 placement
function envDefaultModel() {
  if (isClaudeAISubscriber()) {
    if (isOpusDefaultSubscriber())
      return { setting: applyOpus1mOptIn(getDefaultOpusModel()), envFamily: "opus" };
  } else if (usesFirstPartyModelIds())
    return { setting: applyOpus1mOptIn(getDefaultOpusModel()), envFamily: "opus" };
  let e = getAPIProvider();
  if (e === "mantle")
    return {
      setting: getModelStrings()[DEFAULT_MANTLE_OPUS_KEY],
      envFamily: null,
      concreteBaseline: String(getRawModelStrings()[DEFAULT_MANTLE_OPUS_KEY]),
    };
  if (e === "bedrock" || e === "vertex") {
    if (isSonnetOnlySteering()) return { setting: getDefaultSonnetModel(), envFamily: "sonnet" };
    return { setting: getDefaultOpusModel(), envFamily: "opus" };
  }
  return { setting: getDefaultSonnetModel(), envFamily: "sonnet" };
}
/**
 * 结合 availableModels 与强制策略解析可用模型。
 */
//@ chunk-aepeg2w5.js:446390-450425 placement
function resolveAvailableModels(e, n, r) {
  let s = getSettings_DEPRECATED() || {},
    { availableModels: availableModels, enforceAvailableModels: enforceAvailableModels } = s,
    S = {},
    w = getModelEnforcementState();
  if (w.state === "refused") return null;
  let R = w.state === "inactive" && w.cascadeTrusted;
  if (w.state === "active")
    ((availableModels = w.allowlist), (enforceAvailableModels = !0), (S = w.overridesMap));
  else if (!w.cascadeTrusted) return null;
  if (!enforceAvailableModels) return null;
  if (R && Object.keys(S).length === 0 && s.modelOverrides) S = s.modelOverrides;
  if (!availableModels || availableModels.length === 0) return null;
  let x = { overridesMap: S, envFreeAliasResolution: !0, allowlist: availableModels },
    P = { overridesMap: S },
    F = (Me) => {
      let xe = firstPartyNameToCanonical(Lt(Me));
      for (let [Ie, De] of Object.entries(S)) if (firstPartyNameToCanonical(Lt(Ie)) === xe) return De;
      return;
    },
    L = (Me, xe) => {
      let Ie = Lt(Me);
      if (xe?.isConcreteEntry) return Me;
      let De = F(Ie);
      if (!De?.trim()) return Me;
      De = De.trim();
      {
        let lower = Lt(De).trim().toLowerCase(),
          qe = has1mSuffix(De),
          Mt = Nb(lower) ? resolveBuiltinAlias(lower) : null;
        if (Mt !== null) De = qe ? append1mSuffixIfMissing(Mt) : Mt;
        else {
          let Wt = lower.startsWith("claude-") ? lower : `claude-${lower}`;
          if (isLegacyOpusFirstParty(Wt) && usesFirstPartyModelIds()) {
            let un = yn(getRawModelStrings());
            De = qe ? append1mSuffixIfMissing(un) : un;
          }
        }
      }
      if (lr(Lt(De))) {
        let Ue = `enforceAvailableModels: the managed modelOverrides target "${De}" is server-unavailable; using the unmapped candidate`;
        if (!At().has(Ue)) (At().add(Ue), logForDebugging(Ue, { level: "warn" }));
        return Me;
      }
      if (Ie !== Me) return eligible1mSuffixTarget(De, P) ? append1mSuffixIfMissing(De) : strip1mTag(De);
      if (has1mSuffix(De) && !eligible1mSuffixTarget(De, P)) return strip1mTag(De);
      return De;
    },
    G = null,
    j = null,
    ee = String(e),
    q = Lt(ee.trim().toLowerCase()),
    Q = has1mSuffix(e),
    re = q.startsWith("claude-") ? q : `claude-${q}`,
    se = isLegacyOpusFirstParty(re) ? yn(getRawModelStrings()) : resolveBuiltinAlias(q);
  if (se !== null) {
    let xe =
        q !== ee.trim().toLowerCase() && eligible1mSuffixTarget(se, P) ? append1mSuffixIfMissing(se) : Lt(se),
      Ie = parseUserSpecifiedModel(ee);
    if (Lt(Ie) !== Lt(se)) G = xe;
    if (isModelAllowed(xe, x))
      if (Lt(Ie) !== Lt(se)) {
        if (!lr(xe)) return L(xe);
        j = xe;
      } else return null;
  } else {
    let Me = getRawModelStrings(),
      xe = getTierEnvTable(Me);
    if (n !== void 0) {
      if (n !== null) {
        let found = xe.find(([qe]) => qe === n);
        if (found === void 0) throw Error(`steeringVarTable has no row for tier family "${n}"`);
        let De = found[3],
          Ue = De();
        if (typeof Ue === "string" && Lt(Ue).toLowerCase() !== q) {
          let qe = De();
          G = Q && eligible1mSuffixTarget(qe, P) ? append1mSuffixIfMissing(qe) : qe;
        }
      }
      if (n === null && r !== void 0 && Lt(r).toLowerCase() !== q) G = r;
    } else {
      let Ie = (() => {
          for (let [, , Ue, qe] of xe) {
            let Mt = qe();
            if (typeof Mt === "string" && Lt(Mt).toLowerCase() === q) return Ue;
          }
          return null;
        })(),
        De = xe;
      for (let [, Ue, qe, Mt] of De) {
        if (Ue === void 0 || Lt(Ue.trim().toLowerCase()) !== q) continue;
        if (Ie !== null && Ie <= qe) continue;
        {
          let Wt = Mt();
          G = Q && eligible1mSuffixTarget(Wt, P) ? append1mSuffixIfMissing(Wt) : Wt;
        }
        break;
      }
    }
    if (isModelAllowed(e, x)) return null;
  }
  let Se = [];
  if (j !== null) {
    let Me = j;
    Se.push({ entry: Me, adopt: () => L(Me) });
  }
  for (let Me of availableModels) {
    let trimmed = Me.trim();
    if (!trimmed) continue;
    let lower = trimmed.toLowerCase(),
      De = Lt(lower),
      Ue = resolveBuiltinAlias(De);
    if (Ue !== null) {
      let It = lower !== De && eligible1mSuffixTarget(Ue, P) ? append1mSuffixIfMissing(Ue) : Ue;
      if (isOpaqueModelId(It) && isModelAllowed(It, x)) {
        if (!lr(It)) return L(It);
        Se.push({ entry: trimmed, adopt: () => L(It) });
      }
      continue;
    }
    let qe = Lt(lower),
      Mt = qe.startsWith("claude-") ? qe : `claude-${qe}`;
    if (isLegacyOpusFirstParty(Mt) && usesFirstPartyModelIds()) {
      let Ke = yn(getRawModelStrings()),
        qt = lower !== qe && eligible1mSuffixTarget(Ke, P) ? append1mSuffixIfMissing(Ke) : Ke;
      if (!lr(qt)) return L(qt);
      Se.push({ entry: trimmed, adopt: () => L(qt) });
      continue;
    }
    let Wt = getAPIProvider() !== "foundry" && !lower.startsWith("claude-") && Qs.test(lower),
      un = Wt || (getAPIProvider() !== "foundry" && lower.startsWith("claude-")),
      gt = parseUserSpecifiedModel(Wt ? `claude-${lower}` : un ? lower : trimmed),
      lower_2 = Lt(gt).toLowerCase();
    if (un && !/[-@]\d{8}$/.test(lower_2) && firstPartyNameToCanonical(lower_2) !== f_r(lower_2)) continue;
    if (!isOpaqueModelId(gt)) continue;
    let Yo = !un || /[-@]\d{8}$/.test(lower_2);
    if (isModelAllowed(gt, x)) {
      let Ke = () => {
        let It = strip1mTag(gt);
        if (It !== gt) return L(eligible1mSuffixTarget(gt, P) ? gt : It, { isConcreteEntry: Yo });
        return L(gt, { isConcreteEntry: Yo });
      };
      if (!lr(gt)) return Ke();
      Se.push({ entry: trimmed, adopt: Ke });
    }
  }
  let ae = G !== null ? F(G) : void 0,
    ie = ae !== void 0 && Lt(ae).trim().toLowerCase() === Lt(e).trim().toLowerCase(),
    Z =
      G !== null
        ? ie
          ? "tier default is the admin-mapped value \u2014 pinning its canonical builtin (the policy mapping re-applies at the exit)"
          : "user steering detected \u2014 pinning the env-free tier builtin (policy-mapped if applicable)"
        : "keeping the tier default",
    ce = isFirstPartyApiBackend() ? void 0 : Se[0],
    fe =
      ce !== void 0
        ? "using the first of them (off the first-party API the published document does not move the Default outside the list)"
        : Z,
    Ae =
      Se.length > 0
        ? `enforceAvailableModels: no availableModels entry survived; ${Se.length} entr${Se.length === 1 ? "y was" : "ies were"} allowed but skipped as server-unavailable (${Se.map((Me) => Me.entry).join(", ")}); ${fe}`
        : `enforceAvailableModels: no availableModels entry expands to an allowed model; ${Z}`;
  if (!At().has(Ae)) (At().add(Ae), logForDebugging(Ae, { level: "warn" }));
  if (ce !== void 0) return ce.adopt();
  return G !== null ? L(G) : null;
}
/**
 * 判断别名解析出的模型是否应加 [1m]：旧模型或非 claude- 前缀按规则；opus 在第一方时看 isOpus1mMergeEnabled。旧版名 getFastModeModel 为错配，应归 utils/model/model.ts。
 */
//@ chunk-aepeg2w5.js:450425-450565 placement = getFastModeModel (0.455)
function eligible1mSuffixTarget(e, n) {
  if (isKnownNon1mTarget(e, n)) return !1;
  let r = firstPartyNameToCanonical(strip1mTag(e).trim());
  if (!r.startsWith("claude-")) return !0;
  return r.includes("opus") && usesFirstPartyModelIds() ? isOpus1mMergeEnabled() : !0;
}
/**
 * 去掉 [1m] 后的规范名是否为不支持 1M 合并的旧模型（3.x、opus-4-0/4-1/4-5、haiku-4-5）。
 */
//@ chunk-aepeg2w5.js:450565-450738 placement = modelMatchesVersionPrefix (0.776)
function isKnownNon1mTarget(model, entry) {
  let trimmed = model.trim(),
    trimmed_2 = strip1mTag(trimmed).trim(),
    h = firstPartyNameToCanonical(trimmed_2);
  if (h.startsWith("claude-")) return isLegacyNo1mModel(h);
  if (isLegacyNo1mModel(getCanonicalName(trimmed_2, entry))) return !0;
  return (
    trimmed_2 !== trimmed && entry?.overridesMap === void 0 && isLegacyNo1mModel(getCanonicalName(trimmed))
  );
}
/**
 * [族, ANTHROPIC_DEFAULT_*_MODEL 值, 序号, 内置默认取值函数]（haiku/sonnet/opus）。
 */
//@ chunk-aepeg2w5.js:450738-450923 placement = aliasMatchesParentTier (0.756)
function getTierEnvTable(e) {
  return [
    ["haiku", env.ANTHROPIC_DEFAULT_HAIKU_MODEL, 0, () => zp(e)],
    ["sonnet", env.ANTHROPIC_DEFAULT_SONNET_MODEL, 1, () => getDefaultSonnetBuiltin(e)],
    ["opus", env.ANTHROPIC_DEFAULT_OPUS_MODEL, 2, () => yn(e)],
  ];
}
//@ chunk-aepeg2w5.js:450923-450975 placement
function At() {
  return getProviderState().warnedEnforcementMessages;
}
/**
 * 模型强制策略状态（active/inactive/refused）。
 */
//@ chunk-aepeg2w5.js:450975-453361 placement
function getModelEnforcementState() {
  try {
    let filtered = getFatalAdminPolicyLoadErrors().filter((S) => !isPermissionDeniedPolicyError(S)),
      n = getSettingsForSource("policySettings"),
      r = (S) => {
        if (!n || filtered.length === 0) return;
        let w = S
          ? "enforceAvailableModels: an admin policy source failed to load; enforcing the surviving admin tier (the failed source may carry a different policy \u2014 fix it to restore full coverage)"
          : "enforceAvailableModels: an admin policy source failed to load and the surviving admin tier carries no model policy \u2014 model enforcement is OFF; the failed source may have carried it";
        if (!At().has(w)) (At().add(w), logForDebugging(w, { level: "warn" }));
      };
    if (adminPolicyLoadFailureRefusesLaunch()) {
      if (
        !At().has(
          "enforceAvailableModels: a policy source exists but failed to load; refusing cascade-trust mode (model enforcement from user/project settings is disabled until the policy source is fixed)",
        )
      )
        (At().add(
          "enforceAvailableModels: a policy source exists but failed to load; refusing cascade-trust mode (model enforcement from user/project settings is disabled until the policy source is fixed)",
        ),
          logForDebugging(
            "enforceAvailableModels: a policy source exists but failed to load; refusing cascade-trust mode (model enforcement from user/project settings is disabled until the policy source is fixed)",
            { level: "warn" },
          ));
      return { state: "refused" };
    }
    if (!n) return { state: "inactive", cascadeTrusted: !0 };
    let {
      availableModels: availableModels,
      enforceAvailableModels: enforceAvailableModels,
      modelOverrides: modelOverrides,
    } = n;
    if (
      filtered.length === 0 &&
      availableModels === void 0 &&
      enforceAvailableModels === void 0 &&
      modelOverrides === void 0 &&
      (getPolicySettingsOrigin() === "hkcu" || getPolicySettingsOrigin() === "parent")
    )
      return { state: "inactive", cascadeTrusted: !0 };
    if (enforceAvailableModels && availableModels === void 0) {
      if (
        !At().has(
          "enforceAvailableModels: the policy view sets the enforce flag but not availableModels; enforcement is disabled (the flag requires a policy-owned allowlist)",
        )
      )
        (At().add(
          "enforceAvailableModels: the policy view sets the enforce flag but not availableModels; enforcement is disabled (the flag requires a policy-owned allowlist)",
        ),
          logForDebugging(
            "enforceAvailableModels: the policy view sets the enforce flag but not availableModels; enforcement is disabled (the flag requires a policy-owned allowlist)",
            { level: "warn" },
          ));
      return (r(!1), { state: "inactive", cascadeTrusted: !1 });
    }
    if (enforceAvailableModels !== !0 || availableModels === void 0 || availableModels.length === 0)
      return (r(!1), { state: "inactive", cascadeTrusted: !1 });
    return (
      r(!0),
      {
        state: "active",
        allowlist: availableModels,
        overridesMap: modelOverrides ?? getPairedPolicyModelOverrides() ?? {},
      }
    );
  } catch (error) {
    let n = `enforceAvailableModels: policy-tier settings read failed; refusing cascade-trust mode: ${error instanceof Error ? error.message : String(error)}`;
    if (!At().has(n)) (At().add(n), logForDebugging(n, { level: "warn" }));
    return { state: "refused" };
  }
}
//@ chunk-aepeg2w5.js:453361-453647 placement
function isModelAllowedUnderActiveEnforcement(e) {
  let n = getModelEnforcementState();
  if (n.state === "refused") return !1;
  if (n.state === "inactive") return null;
  let r = { allowlist: n.allowlist, overridesMap: n.overridesMap, envFreeAliasResolution: !0 };
  if (!isModelAllowed(e, r)) return !1;
  let trimmed = Lt(e.trim().toLowerCase()).trim();
  return (
    !(
      Nb(trimmed) ||
      isServedExpandedSpelling(trimmed) ||
      (usesFirstPartyModelIds() && isLegacyOpusFirstParty(trimmed))
    ) || aliasExpansionPermitted(trimmed, r)
  );
}
//@ chunk-aepeg2w5.js:453647-453724 placement
function isModelAdmittedByAvailableModels(e) {
  return (
    isModelAllowedUnderActiveEnforcement(e) ??
    (isModelAllowed(e, { skipEntitlementDenyOverlay: !0 }) || isExemptDefaultResolvingPick(e))
  );
}
//@ chunk-aepeg2w5.js:453724-453773 placement
function isPermittedByOrgModelPolicy(e) {
  return (
    (isModelAllowedUnderActiveEnforcement(e) ?? isModelAllowed(e)) &&
    !isModelDenied(e, getModelEntitlementDenySet())
  );
}
//@ chunk-aepeg2w5.js:453773-453844 placement
function tG(e) {
  return Lt(parseUserSpecifiedModel(e)).toLowerCase() === Lt(getDefaultMainLoopModel()).toLowerCase();
}
//@ chunk-aepeg2w5.js:453844-453964 placement
function isExemptDefaultResolvingPick(e) {
  let n = Lt(e.trim().toLowerCase());
  if (isModeDependentModelSetting(n)) return !1;
  if (Bu(e)) return !1;
  if (n === "best") return !1;
  return tG(e);
}
//@ chunk-aepeg2w5.js:453964-454094 placement
function isWindowSilentDefaultPick(e) {
  if (!isExemptDefaultResolvingPick(e)) return !1;
  let lower = e.trim().toLowerCase();
  return (
    parseUserSpecifiedModel(e).toLowerCase() === getDefaultMainLoopModel().toLowerCase() ||
    (Nb(lower) && lower === Lt(lower))
  );
}
/**
 * 别名展开成内置默认模型（小写）；旧 Opus 4/4.1 在重映射时展开成最新 Opus。
 */
//@ chunk-aepeg2w5.js:454094-454270 placement = modelMatchesVersionPrefix (1)
function resolveModelAliasEnvFree(e) {
  let n = Lt(e),
    r = resolveBuiltinAlias(n);
  if (r !== null) return r.toLowerCase();
  let resolvedModel = n.startsWith("claude-") ? n : `claude-${n}`;
  if (usesFirstPartyModelIds() && isLegacyOpusFirstParty(resolvedModel))
    return yn(getRawModelStrings()).toLowerCase();
  return null;
}
//@ chunk-aepeg2w5.js:454270-454338 placement
var regExp_29 = new RegExp(`^((${BEDROCK_REGION_PREFIXES.join("|")})\\.)?(anthropic\\.|claude-)`);
//@ chunk-aepeg2w5.js:454338-454481 placement
function isOpaqueModelId(e) {
  let lower = e.toLowerCase();
  if (regExp_29.test(lower)) return !0;
  if (lower.startsWith("arn:aws:bedrock:")) return !0;
  if (getAPIProvider() === "foundry") return !0;
  return !1;
}

export {
  isExemptDefaultResolvingPick,
  isEnvDefaultModelGoverning,
  isKnownNon1mTarget,
  getModelEnforcementState,
  Gw,
  isPermittedByOrgModelPolicy,
  isModelAllowedUnderActiveEnforcement,
  getEnvDefaultModel,
  isWindowSilentDefaultPick,
  resolveModelAliasEnvFree,
  em,
  Bu,
  eligible1mSuffixTarget,
  At,
  resolveAvailableModels,
  familyDefaultFor,
  envDefaultModel,
  ZK,
  isModelAdmittedByAvailableModels,
};
