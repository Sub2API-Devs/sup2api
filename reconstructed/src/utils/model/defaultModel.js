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
  getDefaultOpusBuiltin,
  strip1mTag,
  isServedExpandedSpelling,
} from "./model.js";
import {
  getDefaultHaikuModel,
  isModeDependentModelSetting,
  isOpusFableAdvisorSetting,
  isUnavailableModel,
  resolveDefaultMainLoopModelSetting,
  append1mSuffixIfMissing,
  defaultHaikuModel,
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
import {
  strip1mSuffix,
  isBaseModelKey,
  isModelKeyAlias,
  parseModelId,
  normalizeDottedVersion,
} from "./modelIds.js";
import { getInitialEnvDefaultModel } from "../../bootstrap/state.js";
import { env } from "../env.js";
import { getUserSpecifiedModelSetting, isSonnetOnlySteering } from "./smallFastModel.js";
import { isClaudeAISubscriber } from "../auth.js";
import { usesFirstPartyModelIds, getAPIProvider, isFirstPartyApiBackend } from "./providers.js";
import { getModelStrings, getRawModelStrings } from "./modelStrings.js";
import { firstPartyNameToCanonical, getDefaultMainLoopModel } from "./modelFallback.js";
import { has1mSuffix_2, isLegacyNo1mModel } from "./contextWindow1m.js";
import { resolveBuiltinAlias } from "./aliases.js";
import { VERSIONED_MODEL_RE } from "../toolErrors.js";
import { getDefaultSonnetBuiltin } from "./modelOptions.js";
import { getProviderState } from "./providerCaches.js";
import { BEDROCK_REGION_PREFIXES } from "./bedrock.js";

//@ chunk-aepeg2w5.js:444410-444950 placement
/**
 * 被限制模型的同族默认。
 */
function familyDefaultFor(e) {
  let modelEntitlementDenySet = getModelEntitlementDenySet();
  if (
    !(modelEntitlementDenySet.size > 0 && isModelDenied(e, modelEntitlementDenySet)) &&
    !isBlockedByManagedModelPolicySafe(e)
  )
    return null;
  let s = [
    {
      family: "opus",
      model: getDefaultOpusModel(),
    },
    {
      family: "sonnet",
      model: getDefaultSonnetModel(),
    },
    {
      family: "haiku",
      model: getDefaultHaikuModel(),
    },
  ];
  let canonicalName = getCanonicalName(parseUserSpecifiedModel(e));
  let index = s.findIndex((R) => canonicalName.includes(R.family));
  let S = index !== -1 ? index : isFableFamilyOrPinnedModel(parseUserSpecifiedModel(e)) ? 0 : 1;
  for (let { family, model } of s.slice(S)) {
    if (isModelAllowed(model)) return model;
    let P = newestAllowedInFamilyForProvider(family);
    if (P !== null) return P;
  }
  if (!isBlockedByManagedModelPolicySafe(e)) return null;
  let w = availableModelsFamilies();
  if (w === null)
    logForDebugging(
      `managed settings (deniedModels or an exact-match availableModels) block the default model ${e} and every model it could fall back to`,
      {
        level: "warn",
      },
    );
  return w;
}
//@ chunk-aepeg2w5.js:444950-445402 placement
/**
 * 托管 availableModels 中的模型族。
 */
function availableModelsFamilies() {
  let e;
  let n;
  try {
    let settingsForSource = getSettingsForSource("policySettings");
    e = settingsForSource?.availableModels;
    n = settingsForSource?.availableModelsMatch === "exact";
  } catch {
    return null;
  }
  for (let r of e ?? []) {
    let s = strip1mSuffix(r.trim().toLowerCase());
    if (s === "") continue;
    let replaced = s.replace(/^claude-/, "");
    let y = isBaseModelKey(s) ? s : n && isBaseModelKey(replaced) ? replaced : null;
    if (y !== null) {
      let w = newestAllowedInFamilyForProvider(y);
      if (w !== null) return w;
      continue;
    }
    if (isModelKeyAlias(s) || s === "default") continue;
    let S = parseModelId(s) !== null ? s : parseModelId(`claude-${s}`) !== null ? `claude-${s}` : r.trim();
    if (isOpaqueModelId(S) && isModelAllowed(S)) return S;
  }
  return null;
}
//@ chunk-aepeg2w5.js:445402-445451 placement
/**
 * isBlockedByManagedModelPolicy 的安全包装（异常按受限处理）。
 */
function isBlockedByManagedModelPolicySafe(e) {
  try {
    return isBlockedByManagedModelPolicy(e);
  } catch {
    return true;
  }
}
//@ chunk-aepeg2w5.js:445451-445500 placement
/**
 * isModelDeniedByManagedSettings 的安全包装（异常按拒绝处理）。
 */
function isModelDeniedByManagedSafe(e) {
  try {
    return isModelDeniedByManagedSettings(e);
  } catch {
    return true;
  }
}
//@ chunk-aepeg2w5.js:445500-445549 placement
/**
 * 同上，但异常按未拒绝处理。
 */
function isModelDeniedByManagedFalse(e) {
  try {
    return isModelDeniedByManagedSettings(e);
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:445549-445602 placement
/**
 * 判断模型是否在权益允许范围内。
 */
function isModelEntitled(e) {
  let modelEntitlementDenySet = getModelEntitlementDenySet();
  return !(modelEntitlementDenySet.size > 0 && isModelDenied(e, modelEntitlementDenySet));
}
//@ chunk-aepeg2w5.js:445602-445939 placement
function getEnvDefaultModel() {
  let initialEnvDefaultModel = getInitialEnvDefaultModel();
  let n = initialEnvDefaultModel === undefined ? env.ANTHROPIC_DEFAULT_MODEL : initialEnvDefaultModel;
  if (n == null) return null;
  let lower = n.trim().toLowerCase();
  if (lower === "default" || lower === "inherit") return null;
  if (isModeDependentModelSetting(strip1mSuffix(lower))) return null;
  if (isOpusFableAdvisorSetting(lower)) return null;
  if (
    getModelEnforcementState().state !== "inactive" ||
    getSettings_DEPRECATED()?.enforceAvailableModels === true
  )
    return null;
  if (!isModelAllowed(n)) return null;
  if (isUnavailableModel(n)) return null;
  return n;
}
//@ chunk-aepeg2w5.js:445939-445999 placement
function isEnvDefaultModelGoverning() {
  return getUserSpecifiedModelSetting() == null && resolveDefaultMainLoopModelSetting().attribution === "env";
}
//@ chunk-aepeg2w5.js:445999-446390 placement
/**
 * 环境决定的默认模型设置。
 */
function envDefaultModel_2() {
  if (isClaudeAISubscriber()) {
    if (isOpusDefaultSubscriber())
      return {
        setting: applyOpus1mOptIn(getDefaultOpusModel()),
        envFamily: "opus",
      };
  } else if (usesFirstPartyModelIds())
    return {
      setting: applyOpus1mOptIn(getDefaultOpusModel()),
      envFamily: "opus",
    };
  let apiProvider = getAPIProvider();
  if (apiProvider === "mantle")
    return {
      setting: getModelStrings()[DEFAULT_MANTLE_OPUS_KEY],
      envFamily: null,
      concreteBaseline: String(getRawModelStrings()[DEFAULT_MANTLE_OPUS_KEY]),
    };
  if (apiProvider === "bedrock" || apiProvider === "vertex") {
    if (isSonnetOnlySteering())
      return {
        setting: getDefaultSonnetModel(),
        envFamily: "sonnet",
      };
    return {
      setting: getDefaultOpusModel(),
      envFamily: "opus",
    };
  }
  return {
    setting: getDefaultSonnetModel(),
    envFamily: "sonnet",
  };
}
//@ chunk-aepeg2w5.js:446390-450425 placement
/**
 * 结合 availableModels 与强制策略解析可用模型。
 */
function resolveAvailableModels(e, envFamily, concreteBaseline) {
  let s = getSettings_DEPRECATED() || {};
  let { availableModels, enforceAvailableModels } = s;
  let S = {};
  let modelEnforcementState = getModelEnforcementState();
  if (modelEnforcementState.state === "refused") return null;
  let cascadeTrusted = modelEnforcementState.state === "inactive" && modelEnforcementState.cascadeTrusted;
  if (modelEnforcementState.state === "active") {
    availableModels = modelEnforcementState.allowlist;
    enforceAvailableModels = true;
    S = modelEnforcementState.overridesMap;
  } else if (!modelEnforcementState.cascadeTrusted) return null;
  if (!enforceAvailableModels) return null;
  if (cascadeTrusted && Object.keys(S).length === 0 && s.modelOverrides) S = s.modelOverrides;
  if (!availableModels || availableModels.length === 0) return null;
  let x = {
    overridesMap: S,
    envFreeAliasResolution: true,
    allowlist: availableModels,
  };
  let P = {
    overridesMap: S,
  };
  let F = (Me) => {
    let xe = firstPartyNameToCanonical(strip1mSuffix(Me));
    for (let [key, value] of Object.entries(S))
      if (firstPartyNameToCanonical(strip1mSuffix(key)) === xe) return value;
    return;
  };
  let L = (Me, xe) => {
    let Ie = strip1mSuffix(Me);
    if (xe?.isConcreteEntry) return Me;
    let De = F(Ie);
    if (!De?.trim()) return Me;
    De = De.trim();
    {
      let lower = strip1mSuffix(De).trim().toLowerCase();
      let qe = has1mSuffix_2(De);
      let Mt = isModelKeyAlias(lower) ? resolveBuiltinAlias(lower) : null;
      if (Mt !== null) De = qe ? append1mSuffixIfMissing(Mt) : Mt;
      else {
        let Wt = lower.startsWith("claude-") ? lower : `claude-${lower}`;
        if (isLegacyOpusFirstParty(Wt) && usesFirstPartyModelIds()) {
          let defaultOpusBuiltin = getDefaultOpusBuiltin(getRawModelStrings());
          De = qe ? append1mSuffixIfMissing(defaultOpusBuiltin) : defaultOpusBuiltin;
        }
      }
    }
    if (isUnavailableModel(strip1mSuffix(De))) {
      let Ue = `enforceAvailableModels: the managed modelOverrides target "${De}" is server-unavailable; using the unmapped candidate`;
      if (!warnedEnforcementMessages().has(Ue)) {
        warnedEnforcementMessages().add(Ue);
        logForDebugging(Ue, {
          level: "warn",
        });
      }
      return Me;
    }
    if (Ie !== Me) return eligible1mSuffixTarget(De, P) ? append1mSuffixIfMissing(De) : strip1mTag(De);
    if (has1mSuffix_2(De) && !eligible1mSuffixTarget(De, P)) return strip1mTag(De);
    return De;
  };
  let G = null;
  let j = null;
  let ee = String(e);
  let q = strip1mSuffix(ee.trim().toLowerCase());
  let Q = has1mSuffix_2(e);
  let re = q.startsWith("claude-") ? q : `claude-${q}`;
  let se = isLegacyOpusFirstParty(re) ? getDefaultOpusBuiltin(getRawModelStrings()) : resolveBuiltinAlias(q);
  if (se !== null) {
    let xe =
      q !== ee.trim().toLowerCase() && eligible1mSuffixTarget(se, P)
        ? append1mSuffixIfMissing(se)
        : strip1mSuffix(se);
    let userSpecifiedModel = parseUserSpecifiedModel(ee);
    if (strip1mSuffix(userSpecifiedModel) !== strip1mSuffix(se)) G = xe;
    if (isModelAllowed(xe, x))
      if (strip1mSuffix(userSpecifiedModel) !== strip1mSuffix(se)) {
        if (!isUnavailableModel(xe)) return L(xe);
        j = xe;
      } else return null;
  } else {
    let rawModelStrings = getRawModelStrings();
    let tierEnvTable = getTierEnvTable(rawModelStrings);
    if (envFamily !== undefined) {
      if (envFamily !== null) {
        let found = tierEnvTable.find(([qe]) => qe === envFamily);
        if (found === undefined) throw Error(`steeringVarTable has no row for tier family "${envFamily}"`);
        let De = found[3];
        let Ue = De();
        if (typeof Ue === "string" && strip1mSuffix(Ue).toLowerCase() !== q) {
          let qe = De();
          G = Q && eligible1mSuffixTarget(qe, P) ? append1mSuffixIfMissing(qe) : qe;
        }
      }
      if (
        envFamily === null &&
        concreteBaseline !== undefined &&
        strip1mSuffix(concreteBaseline).toLowerCase() !== q
      )
        G = concreteBaseline;
    } else {
      let Ie = (() => {
        for (let [, , Ue, qe] of tierEnvTable) {
          let Mt = qe();
          if (typeof Mt === "string" && strip1mSuffix(Mt).toLowerCase() === q) return Ue;
        }
        return null;
      })();
      let De = tierEnvTable;
      for (let [, Ue, qe, Mt] of De) {
        if (Ue === undefined || strip1mSuffix(Ue.trim().toLowerCase()) !== q) continue;
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
    Se.push({
      entry: Me,
      adopt: () => L(Me),
    });
  }
  for (let availableModel of availableModels) {
    let trimmed = availableModel.trim();
    if (!trimmed) continue;
    let lower = trimmed.toLowerCase();
    let De = strip1mSuffix(lower);
    let builtinAlias = resolveBuiltinAlias(De);
    if (builtinAlias !== null) {
      let It =
        lower !== De && eligible1mSuffixTarget(builtinAlias, P)
          ? append1mSuffixIfMissing(builtinAlias)
          : builtinAlias;
      if (isOpaqueModelId(It) && isModelAllowed(It, x)) {
        if (!isUnavailableModel(It)) return L(It);
        Se.push({
          entry: trimmed,
          adopt: () => L(It),
        });
      }
      continue;
    }
    let qe = strip1mSuffix(lower);
    let Mt = qe.startsWith("claude-") ? qe : `claude-${qe}`;
    if (isLegacyOpusFirstParty(Mt) && usesFirstPartyModelIds()) {
      let defaultOpusBuiltin = getDefaultOpusBuiltin(getRawModelStrings());
      let qt =
        lower !== qe && eligible1mSuffixTarget(defaultOpusBuiltin, P)
          ? append1mSuffixIfMissing(defaultOpusBuiltin)
          : defaultOpusBuiltin;
      if (!isUnavailableModel(qt)) return L(qt);
      Se.push({
        entry: trimmed,
        adopt: () => L(qt),
      });
      continue;
    }
    let Wt = getAPIProvider() !== "foundry" && !lower.startsWith("claude-") && VERSIONED_MODEL_RE.test(lower);
    let un = Wt || (getAPIProvider() !== "foundry" && lower.startsWith("claude-"));
    let userSpecifiedModel = parseUserSpecifiedModel(Wt ? `claude-${lower}` : un ? lower : trimmed);
    let lower_2 = strip1mSuffix(userSpecifiedModel).toLowerCase();
    if (
      un &&
      !/[-@]\d{8}$/.test(lower_2) &&
      firstPartyNameToCanonical(lower_2) !== normalizeDottedVersion(lower_2)
    )
      continue;
    if (!isOpaqueModelId(userSpecifiedModel)) continue;
    let isConcreteEntry = !un || /[-@]\d{8}$/.test(lower_2);
    if (isModelAllowed(userSpecifiedModel, x)) {
      let Ke = () => {
        let It = strip1mTag(userSpecifiedModel);
        if (It !== userSpecifiedModel)
          return L(eligible1mSuffixTarget(userSpecifiedModel, P) ? userSpecifiedModel : It, {
            isConcreteEntry,
          });
        return L(userSpecifiedModel, {
          isConcreteEntry,
        });
      };
      if (!isUnavailableModel(userSpecifiedModel)) return Ke();
      Se.push({
        entry: trimmed,
        adopt: Ke,
      });
    }
  }
  let ae = G !== null ? F(G) : undefined;
  let ie =
    ae !== undefined && strip1mSuffix(ae).trim().toLowerCase() === strip1mSuffix(e).trim().toLowerCase();
  let Z =
    G !== null
      ? ie
        ? "tier default is the admin-mapped value \u2014 pinning its canonical builtin (the policy mapping re-applies at the exit)"
        : "user steering detected \u2014 pinning the env-free tier builtin (policy-mapped if applicable)"
      : "keeping the tier default";
  let ce = isFirstPartyApiBackend() ? undefined : Se[0];
  let fe =
    ce !== undefined
      ? "using the first of them (off the first-party API the published document does not move the Default outside the list)"
      : Z;
  let Ae =
    Se.length > 0
      ? `enforceAvailableModels: no availableModels entry survived; ${Se.length} entr${Se.length === 1 ? "y was" : "ies were"} allowed but skipped as server-unavailable (${Se.map((Me) => Me.entry).join(", ")}); ${fe}`
      : `enforceAvailableModels: no availableModels entry expands to an allowed model; ${Z}`;
  if (!warnedEnforcementMessages().has(Ae)) {
    warnedEnforcementMessages().add(Ae);
    logForDebugging(Ae, {
      level: "warn",
    });
  }
  if (ce !== undefined) return ce.adopt();
  return G !== null ? L(G) : null;
}
//@ chunk-aepeg2w5.js:450425-450565 placement = getFastModeModel (0.455)
/**
 * 判断别名解析出的模型是否应加 [1m]：旧模型或非 claude- 前缀按规则；opus 在第一方时看 isOpus1mMergeEnabled。旧版名 getFastModeModel 为错配，应归 utils/model/model.ts。
 */
function eligible1mSuffixTarget(e, n) {
  if (isKnownNon1mTarget(e, n)) return false;
  let r = firstPartyNameToCanonical(strip1mTag(e).trim());
  if (!r.startsWith("claude-")) return true;
  return r.includes("opus") && usesFirstPartyModelIds() ? isOpus1mMergeEnabled() : true;
}
//@ chunk-aepeg2w5.js:450565-450738 placement = modelMatchesVersionPrefix (0.776)
/**
 * 去掉 [1m] 后的规范名是否为不支持 1M 合并的旧模型（3.x、opus-4-0/4-1/4-5、haiku-4-5）。
 */
function isKnownNon1mTarget(model, entry) {
  let trimmed = model.trim();
  let trimmed_2 = strip1mTag(trimmed).trim();
  let h = firstPartyNameToCanonical(trimmed_2);
  if (h.startsWith("claude-")) return isLegacyNo1mModel(h);
  if (isLegacyNo1mModel(getCanonicalName(trimmed_2, entry))) return true;
  return (
    trimmed_2 !== trimmed && entry?.overridesMap === undefined && isLegacyNo1mModel(getCanonicalName(trimmed))
  );
}
//@ chunk-aepeg2w5.js:450738-450923 placement = aliasMatchesParentTier (0.756)
/**
 * [族, ANTHROPIC_DEFAULT_*_MODEL 值, 序号, 内置默认取值函数]（haiku/sonnet/opus）。
 */
function getTierEnvTable(rawModelStrings) {
  return [
    ["haiku", env.ANTHROPIC_DEFAULT_HAIKU_MODEL, 0, () => defaultHaikuModel(rawModelStrings)],
    ["sonnet", env.ANTHROPIC_DEFAULT_SONNET_MODEL, 1, () => getDefaultSonnetBuiltin(rawModelStrings)],
    ["opus", env.ANTHROPIC_DEFAULT_OPUS_MODEL, 2, () => getDefaultOpusBuiltin(rawModelStrings)],
  ];
}
//@ chunk-aepeg2w5.js:450923-450975 placement
/**
 * 取已提示过的模型强制策略消息集合。
 */
function warnedEnforcementMessages() {
  return getProviderState().warnedEnforcementMessages;
}
//@ chunk-aepeg2w5.js:450975-453361 placement
/**
 * 模型强制策略状态（active/inactive/refused）。
 */
function getModelEnforcementState() {
  try {
    let filtered = getFatalAdminPolicyLoadErrors().filter((S) => !isPermissionDeniedPolicyError(S));
    let settingsForSource = getSettingsForSource("policySettings");
    let r = (S) => {
      if (!settingsForSource || filtered.length === 0) return;
      let w = S
        ? "enforceAvailableModels: an admin policy source failed to load; enforcing the surviving admin tier (the failed source may carry a different policy \u2014 fix it to restore full coverage)"
        : "enforceAvailableModels: an admin policy source failed to load and the surviving admin tier carries no model policy \u2014 model enforcement is OFF; the failed source may have carried it";
      if (!warnedEnforcementMessages().has(w)) {
        warnedEnforcementMessages().add(w);
        logForDebugging(w, {
          level: "warn",
        });
      }
    };
    if (adminPolicyLoadFailureRefusesLaunch()) {
      if (
        !warnedEnforcementMessages().has(
          "enforceAvailableModels: a policy source exists but failed to load; refusing cascade-trust mode (model enforcement from user/project settings is disabled until the policy source is fixed)",
        )
      ) {
        warnedEnforcementMessages().add(
          "enforceAvailableModels: a policy source exists but failed to load; refusing cascade-trust mode (model enforcement from user/project settings is disabled until the policy source is fixed)",
        );
        logForDebugging(
          "enforceAvailableModels: a policy source exists but failed to load; refusing cascade-trust mode (model enforcement from user/project settings is disabled until the policy source is fixed)",
          {
            level: "warn",
          },
        );
      }
      return {
        state: "refused",
      };
    }
    if (!settingsForSource)
      return {
        state: "inactive",
        cascadeTrusted: true,
      };
    let { availableModels, enforceAvailableModels, modelOverrides } = settingsForSource;
    if (
      filtered.length === 0 &&
      availableModels === undefined &&
      enforceAvailableModels === undefined &&
      modelOverrides === undefined &&
      (getPolicySettingsOrigin() === "hkcu" || getPolicySettingsOrigin() === "parent")
    )
      return {
        state: "inactive",
        cascadeTrusted: true,
      };
    if (enforceAvailableModels && availableModels === undefined) {
      if (
        !warnedEnforcementMessages().has(
          "enforceAvailableModels: the policy view sets the enforce flag but not availableModels; enforcement is disabled (the flag requires a policy-owned allowlist)",
        )
      ) {
        warnedEnforcementMessages().add(
          "enforceAvailableModels: the policy view sets the enforce flag but not availableModels; enforcement is disabled (the flag requires a policy-owned allowlist)",
        );
        logForDebugging(
          "enforceAvailableModels: the policy view sets the enforce flag but not availableModels; enforcement is disabled (the flag requires a policy-owned allowlist)",
          {
            level: "warn",
          },
        );
      }
      r(false);
      return {
        state: "inactive",
        cascadeTrusted: false,
      };
    }
    if (enforceAvailableModels !== true || availableModels === undefined || availableModels.length === 0) {
      r(false);
      return {
        state: "inactive",
        cascadeTrusted: false,
      };
    }
    r(true);
    return {
      state: "active",
      allowlist: availableModels,
      overridesMap: modelOverrides ?? getPairedPolicyModelOverrides() ?? {},
    };
  } catch (error) {
    let n = `enforceAvailableModels: policy-tier settings read failed; refusing cascade-trust mode: ${error instanceof Error ? error.message : String(error)}`;
    if (!warnedEnforcementMessages().has(n)) {
      warnedEnforcementMessages().add(n);
      logForDebugging(n, {
        level: "warn",
      });
    }
    return {
      state: "refused",
    };
  }
}
//@ chunk-aepeg2w5.js:453361-453647 placement
function isModelAllowedUnderActiveEnforcement(e) {
  let modelEnforcementState = getModelEnforcementState();
  if (modelEnforcementState.state === "refused") return false;
  if (modelEnforcementState.state === "inactive") return null;
  let r = {
    allowlist: modelEnforcementState.allowlist,
    overridesMap: modelEnforcementState.overridesMap,
    envFreeAliasResolution: true,
  };
  if (!isModelAllowed(e, r)) return false;
  let trimmed = strip1mSuffix(e.trim().toLowerCase()).trim();
  return (
    !(
      isModelKeyAlias(trimmed) ||
      isServedExpandedSpelling(trimmed) ||
      (usesFirstPartyModelIds() && isLegacyOpusFirstParty(trimmed))
    ) || aliasExpansionPermitted(trimmed, r)
  );
}
//@ chunk-aepeg2w5.js:453647-453724 placement
function isModelAdmittedByAvailableModels(e) {
  return (
    isModelAllowedUnderActiveEnforcement(e) ??
    (isModelAllowed(e, {
      skipEntitlementDenyOverlay: true,
    }) ||
      isExemptDefaultResolvingPick(e))
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
function isDefaultMainLoopModel(e) {
  return (
    strip1mSuffix(parseUserSpecifiedModel(e)).toLowerCase() ===
    strip1mSuffix(getDefaultMainLoopModel()).toLowerCase()
  );
}
//@ chunk-aepeg2w5.js:453844-453964 placement
function isExemptDefaultResolvingPick(e) {
  let n = strip1mSuffix(e.trim().toLowerCase());
  if (isModeDependentModelSetting(n)) return false;
  if (isBlockedByManagedModelPolicySafe(e)) return false;
  if (n === "best") return false;
  return isDefaultMainLoopModel(e);
}
//@ chunk-aepeg2w5.js:453964-454094 placement
function isWindowSilentDefaultPick(e) {
  if (!isExemptDefaultResolvingPick(e)) return false;
  let lower = e.trim().toLowerCase();
  return (
    parseUserSpecifiedModel(e).toLowerCase() === getDefaultMainLoopModel().toLowerCase() ||
    (isModelKeyAlias(lower) && lower === strip1mSuffix(lower))
  );
}
//@ chunk-aepeg2w5.js:454094-454270 placement = modelMatchesVersionPrefix (1)
/**
 * 别名展开成内置默认模型（小写）；旧 Opus 4/4.1 在重映射时展开成最新 Opus。
 */
function resolveModelAliasEnvFree(e) {
  let n = strip1mSuffix(e);
  let builtinAlias = resolveBuiltinAlias(n);
  if (builtinAlias !== null) return builtinAlias.toLowerCase();
  let resolvedModel = n.startsWith("claude-") ? n : `claude-${n}`;
  if (usesFirstPartyModelIds() && isLegacyOpusFirstParty(resolvedModel))
    return getDefaultOpusBuiltin(getRawModelStrings()).toLowerCase();
  return null;
}
//@ chunk-aepeg2w5.js:454270-454338 placement
var regExp_29 = new RegExp(`^((${BEDROCK_REGION_PREFIXES.join("|")})\\.)?(anthropic\\.|claude-)`);
//@ chunk-aepeg2w5.js:454338-454481 placement
function isOpaqueModelId(e) {
  let lower = e.toLowerCase();
  if (regExp_29.test(lower)) return true;
  if (lower.startsWith("arn:aws:bedrock:")) return true;
  if (getAPIProvider() === "foundry") return true;
  return false;
}
export {
  isExemptDefaultResolvingPick,
  isEnvDefaultModelGoverning,
  isKnownNon1mTarget,
  getModelEnforcementState,
  isModelDeniedByManagedFalse,
  isPermittedByOrgModelPolicy,
  isModelAllowedUnderActiveEnforcement,
  getEnvDefaultModel,
  isWindowSilentDefaultPick,
  resolveModelAliasEnvFree,
  isModelDeniedByManagedSafe,
  isBlockedByManagedModelPolicySafe,
  eligible1mSuffixTarget,
  warnedEnforcementMessages,
  resolveAvailableModels,
  familyDefaultFor,
  envDefaultModel_2,
  isModelEntitled,
  isModelAdmittedByAvailableModels,
};
