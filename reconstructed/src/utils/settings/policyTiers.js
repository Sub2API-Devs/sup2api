/**
 * utils/settings/policyTiers.ts
 *
 * 2.1.316 新增：机器级登录固定（强制登录组织）；过滤非托管来源的凭据 helper 键。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (30)
 * attribution: placement 30
 */
import {
  DANGEROUS_SHELL_SETTINGS,
  OTEL_EXPORTER_PREFIXES,
  OTEL_DETAIL_VARS,
  HELPER_ENV_VARS,
} from "../managedEnvConstants.js";
import {
  markManagedKeyGroup,
  setsProviderEnv,
  PROVIDER_REGION_ENV_KEYS,
  AWS_ENDPOINT_ENV_KEYS,
} from "./managedEnvKeys.js";
import {
  armedHelperOutput,
  resolvePolicySettings,
  isMachineAdminDocumentUnreadable,
  POLICY_HELPER_CONFIG_KEYS,
  helperBaseSettings,
  shadowedPolicyKeys,
  MANAGED_SOURCE_NOTICE_LABELS,
} from "./policySettings.js";
import { SettingsCacheStore } from "../../bootstrap/stateSlices.js";
import { RESTRICTIVE_NESTED_SETTINGS, restrictiveTopLevelSettings } from "./types.js";
import { getAtPath, setAtPath } from "./managedRestrictionKeys.js";
import {
  getAllPolicyTierSettings_3,
  stripHostManagedModelKeys,
  assignWithDeniedModels,
  getLegacyLocalSettingsFilePath_3,
} from "./settingsSources.js";
import { env } from "../env.js";
import {
  isInertManagedMcpServersNotice,
  parseSettingsFile_3,
  parseInlineFlagSettings,
} from "./managedFileSettings.js";
import { mergeWithAssigner_2 } from "./settingsSourceTrust.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { settingsMergeCustomizer } from "./settings.js";
import { PROVIDER_ENV_FLAGS } from "../model/modelIds.js";
import { SS } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isEnvDefinedFalsy } from "../envUtils.js";
import { count } from "../collections.js";
import { getSettingsFilePathForSource_3 } from "./settingsFileParsing.js";

//@ chunk-dcmhvw5a.js:500782-501142 placement
var CREDENTIAL_HELPER_SETTINGS_KEYS = [...DANGEROUS_SHELL_SETTINGS, "otelHeadersHelper", "proxyAuthHelper"];
var LAUNCH_FOLDER_WITHHELD_SETTINGS_KEYS = [
  "disableAllHooks",
  "enabledPlugins",
  "extraKnownMarketplaces",
  "agent",
  "allowedHttpHookUrls",
  "httpHookAllowedEnvVars",
  "autoMemoryDirectory",
  "modelOverrides",
  "allowedMcpServers",
  "skipWebFetchPreflight",
  "autoUploadSessions",
  "xaaIdp",
  "claudeMdExcludes",
  "enableAllProjectMcpServers",
  "enabledMcpjsonServers",
];
//@ chunk-dcmhvw5a.js:501142-501320 placement
function withholdLaunchFolderKeys(e, n, r) {
  if (
    !LAUNCH_FOLDER_WITHHELD_SETTINGS_KEYS.some((a) => n[a] !== undefined) ||
    (r.launchFolderKeysFrom?.(e) ?? "as_read") === "as_read"
  )
    return n;
  let s = {
    ...n,
  };
  for (let a of LAUNCH_FOLDER_WITHHELD_SETTINGS_KEYS) delete s[a];
  markManagedKeyGroup("keys");
  return s;
}
//@ chunk-dcmhvw5a.js:501320-501364 placement
/**
 * trimmedPolicyTier：裁剪后的策略层。
 */
function trimmedPolicyTier(e, settings, r) {
  return filterCredentialHelperKeys(e, withholdLaunchFolderKeys(e, settings, r), r);
}
//@ chunk-dcmhvw5a.js:501364-501684 placement
/**
 * 过滤非托管来源的凭据 helper 键。
 */
function filterCredentialHelperKeys(e, n, r) {
  let any = CREDENTIAL_HELPER_SETTINGS_KEYS.some((m) => n[m] !== undefined);
  if (!any && e !== "policySettings") return n;
  let a = r.credentialHelperKeysFrom(e);
  if (a === "as_read") return n;
  let c = e === "policySettings" && a === "machine_admin" ? adminPolicyTierSummary(r) : {};
  if (!any && Object.keys(c).length === 0) return n;
  let g = {
    ...n,
  };
  for (let m of CREDENTIAL_HELPER_SETTINGS_KEYS) delete g[m];
  return Object.assign(g, c);
}
//@ chunk-dcmhvw5a.js:501684-501778 placement
function adminPolicyTierSummary(e) {
  let machineAdminPolicyTier = getMachineAdminPolicyTier(e);
  let r = {};
  for (let s of CREDENTIAL_HELPER_SETTINGS_KEYS) {
    let a = machineAdminPolicyTier?.[s];
    if (a !== undefined) r[s] = a;
  }
  return r;
}
//@ chunk-dcmhvw5a.js:501778-501862 placement
function getMachineAdminPolicyTier(e) {
  let n = machineOnlyPolicyContext(e);
  let r = armedHelperOutput(n);
  return r.composes === "tier" ? r.helper : resolvePolicySettings(n).admin;
}
//@ chunk-dcmhvw5a.js:501862-501928 placement
function machineAdminMayPinSignInOrg(settingsContext) {
  return (
    getMachineAdminPolicyTier(settingsContext)?.forceLoginOrgUUID !== undefined ||
    isMachineAdminSourceUnread(settingsContext)
  );
}
//@ chunk-dcmhvw5a.js:501928-501962 placement
function isMachineAdminSourceUnread(e) {
  return isMachineAdminDocumentUnreadable(machineOnlyPolicyContext(e));
}
//@ chunk-dcmhvw5a.js:501962-502198 placement
function machineOnlyPolicyContext(e) {
  let n = e.helperArmedFromRemote?.() === false && e.helperArmedFromUserWritableBase?.() === false;
  return {
    ...e,
    store: new SettingsCacheStore(),
    remote: () => null,
    helper: n ? e.helper : () => null,
    ...(e.mdm?.().userWritable === true && {
      mdm: () => ({
        settings: {},
        errors: [],
      }),
    }),
  };
}
//@ chunk-dcmhvw5a.js:502198-502323 placement
function helperMayBeUserControlled(e) {
  return (
    e.helperArmedFromUserWritableBase?.() !== false ||
    (e.helperMergesOutput?.() === true && e.mdm?.().userWritable === true)
  );
}
//@ chunk-dcmhvw5a.js:502323-502688 placement
/**
 * 机器级登录固定（强制登录组织）。
 */
function machineLoginPins(e, n) {
  if (n.store.policy.machineLoginPins === undefined) {
    let machineAdminPolicyTier = getMachineAdminPolicyTier(n);
    n.store.policy.machineLoginPins = {
      value: {
        forceLoginOrgUUID: machineAdminPolicyTier?.forceLoginOrgUUID,
        forceLoginMethod: machineAdminPolicyTier?.forceLoginMethod,
      },
    };
  }
  let { forceLoginOrgUUID, forceLoginMethod } = n.store.policy.machineLoginPins.value;
  if (forceLoginOrgUUID !== undefined) e.forceLoginOrgUUID = forceLoginOrgUUID;
  if (forceLoginMethod === "claudeai" || forceLoginMethod === "console")
    e.forceLoginMethod = forceLoginMethod;
}
//@ chunk-dcmhvw5a.js:502688-503521 placement
var KEPT_FROM_MACHINE_UNDER_POLICY_ONLY_TIER = [
  ["model"],
  ["fallbackModel"],
  ["advisorModel"],
  ["modelOverrides"],
  ["modelPricing"],
  ["modelPicker"],
  ["processWrapper"],
  ["sandbox", "credentials", "files"],
  ["sandbox", "credentials", "envVars"],
  ["sandbox", "credentials", "awsPairs"],
  ["availableModels"],
  ["requiredMinimumVersion"],
  ["requiredMaximumVersion"],
  ["strictKnownMarketplaces"],
  ["allowedMarketplaces"],
  ["allowedChannelPlugins"],
  ["deniedModels"],
  ["blockedMarketplaces"],
  ...RESTRICTIVE_NESTED_SETTINGS.map((e) => ["autoMode", e]),
  ["hooks"],
  ["allowedHttpHookUrls"],
  ["httpHookAllowedEnvVars"],
  ["managedMcpServers"],
  ["extraKnownMarketplaces"],
  ["additionalMarketplaces"],
  ["enabledPlugins"],
  ["pluginConfigs"],
  ["pluginTrustMessage"],
  ["pluginSuggestionMarketplaces"],
  ["claudeMd"],
  ["cleanupPeriodDays"],
  ["desktopSessionCleanupPeriodDays"],
];
var ADDED_TO_A_POLICY_ONLY_TIER = [
  "deniedModels",
  "blockedMarketplaces",
  ...RESTRICTIVE_NESTED_SETTINGS.map((e) => `autoMode.${e}`),
];
//@ chunk-dcmhvw5a.js:503521-503770 placement
function machineBeneathPolicyOnly(e) {
  if (e.store.policy.machineBeneathPolicyOnly === undefined) {
    let machineAdminPolicyTier = getMachineAdminPolicyTier(e);
    let r = {};
    for (let s of KEPT_FROM_MACHINE_UNDER_POLICY_ONLY_TIER) {
      let atPath = getAtPath(machineAdminPolicyTier, s);
      if (atPath !== undefined) setAtPath(r, s, atPath);
    }
    e.store.policy.machineBeneathPolicyOnly = {
      kept: r,
      env: getMachineAdminPolicyEnv(e),
    };
  }
  return e.store.policy.machineBeneathPolicyOnly;
}
//@ chunk-dcmhvw5a.js:503770-503870 placement
function getMachineAdminPolicyEnv(e) {
  return loadPolicySettings({
    ...machineOnlyPolicyContext(e),
    helper: () => null,
    hkcu: undefined,
    parentManaged: null,
  }).settings?.env;
}
//@ chunk-dcmhvw5a.js:503870-504155 placement
function machinePolicyKeepsPriority(settingsContext, n) {
  if (isMachineAdminDocumentUnreadable(machineOnlyPolicyContext(settingsContext))) return true;
  let admin = resolvePolicySettings({
    ...machineOnlyPolicyContext(settingsContext),
    helper: () => null,
  }).admin;
  let forceLoginOrgUUID = admin?.forceLoginOrgUUID;
  if (
    forceLoginOrgUUID !== undefined &&
    !(typeof forceLoginOrgUUID === "string" ? [forceLoginOrgUUID] : forceLoginOrgUUID).some(
      (a) => a.toLowerCase() === n.toLowerCase(),
    )
  )
    return true;
  return POLICY_HELPER_CONFIG_KEYS.some((a) =>
    Object.values(admin?.[a] ?? {}).some((c) => c !== undefined && c !== null),
  );
}
//@ chunk-dcmhvw5a.js:504155-504342 placement
function getVouchedAdminPolicyTier(settingsContext, n) {
  let r = machineOnlyPolicyContext(settingsContext);
  let s = settingsContext.helperArmedFromUserWritableBase?.() === false;
  let a = n
    ? {
        ...r,
        remote: settingsContext.remote,
        helper: s ? settingsContext.helper : () => null,
      }
    : r;
  let c = armedHelperOutput(a);
  return c.composes === "tier" ? c.helper : resolvePolicySettings(a).admin;
}
//@ chunk-dcmhvw5a.js:504342-504459 placement
function getMachineAdminPolicyTiers(settingsContext) {
  let n = machineOnlyPolicyContext(settingsContext);
  let r = armedHelperOutput(n);
  if (r.composes === "tier") return [r.helper];
  return resolvePolicySettings(n).tiers.filter((tier) => tier !== null);
}
//@ chunk-dcmhvw5a.js:504459-504603 placement
function getRemotePolicyTierWithKind(settingsContext) {
  let { tiers, tierSources, snapshotFirst } = resolvePolicySettings(settingsContext);
  let index = tierSources.indexOf("remote");
  return {
    settings: index === -1 ? null : (tiers[index] ?? null),
    servedSnapshot: snapshotFirst,
  };
}
//@ chunk-dcmhvw5a.js:504603-504766 placement
var WINNER_ONLY_UNDER_MERGE = [
  ...CREDENTIAL_HELPER_SETTINGS_KEYS,
  "forceLoginOrgUUID",
  "forceLoginMethod",
  "forceLoginGatewayUrl",
  "gatewayInternalNetworks",
  "parentSettingsBehavior",
  "env",
  "modelPicker",
  ...POLICY_HELPER_CONFIG_KEYS,
  ...restrictiveTopLevelSettings,
];
//@ chunk-dcmhvw5a.js:504766-504792 placement
function winnerOnlyUnderMerge() {
  return WINNER_ONLY_UNDER_MERGE;
}
//@ chunk-dcmhvw5a.js:504792-504862 placement
function isCredentialHelperSettingKey(e) {
  return OTEL_EXPORTER_PREFIXES.some((n) => e.startsWith(n)) || OTEL_DETAIL_VARS.includes(e);
}
//@ chunk-dcmhvw5a.js:504862-505320 placement
function unionAdminTierEnv(e, n, r, s = 0) {
  let a = new Map();
  let c = new Map();
  let g = false;
  for (let [m, f] of e.entries()) {
    let h = new Set();
    let y = n?.[m] === true;
    for (let [key, value] of Object.entries(f ?? {})) {
      let upper = key.toUpperCase();
      let w = isCredentialHelperSettingKey(upper);
      if (w && value.trim() === "") continue;
      if (w && g) continue;
      if (w && m > s && n?.[m] === true) continue;
      let L = a.get(upper);
      if (L !== undefined) {
        if (h.has(upper)) c.set(key, value);
        else if (!c.has(key)) c.set(key, L);
        continue;
      }
      if (m > s && r?.[m]?.has(upper)) continue;
      c.set(key, value);
      h.add(upper);
      a.set(upper, value);
      if (w) y = true;
    }
    if (y) g = true;
  }
  return Object.fromEntries(c);
}
//@ chunk-dcmhvw5a.js:505320-505365 placement
var DISABLE_ADMIN_ENV_UNION_VAR = "CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION";
//@ chunk-dcmhvw5a.js:505365-505700 placement
function getAdminTierEnvValue(settingsContext, n) {
  let adminTierEnvView = settingsContext.store.policy.adminTierEnvView;
  if (adminTierEnvView !== undefined) return adminTierEnvView[n];
  let allPolicyTierSettings = getAllPolicyTierSettings_3(settingsContext);
  let a =
    env.CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION === true &&
    !resolvePolicySettings(settingsContext).policyOnlyLeads
      ? (allPolicyTierSettings[0]?.env ?? {})
      : unionAdminTierEnv(allPolicyTierSettings.map((policyTierSetting) => policyTierSetting.env));
  let c = {};
  for (let [key, value] of Object.entries(a)) {
    let upper = key.toUpperCase();
    if (key === upper || !(upper in c)) c[upper] = value;
  }
  settingsContext.store.policy.adminTierEnvView = c;
  return c[n];
}
//@ chunk-dcmhvw5a.js:505700-505810 placement
function dropDisableAdminEnvUnion(env) {
  if (!env) return;
  let n = {};
  for (let [key, value] of Object.entries(env))
    if (key.toUpperCase() !== DISABLE_ADMIN_ENV_UNION_VAR) n[key] = value;
  return n;
}
//@ chunk-dcmhvw5a.js:505810-505931 placement
function sameEnvMap(env, env_2) {
  let entries = Object.entries(env ?? {});
  let s = env_2 ?? {};
  return entries.length === Object.keys(s).length && entries.every(([a, c]) => s[a] === c);
}
//@ chunk-dcmhvw5a.js:505931-509861 placement
/**
 * 组合托管（policy）设置：policyHelper 层（composes=tier）直接返回；否则由 SI() 计算 remote / MDM(plist|HKLM) / managed-settings.json(+managed-settings.d) / 父进程托管切片 / 宿主模型覆盖，按 managedSourcesBehavior（first-wins 或 merge）合成；都没有时回退 HKCU。
 */
function loadPolicySettings(e) {
  let n = armedHelperOutput(e);
  let filtered = (e.helperWarnings?.() ?? []).filter((x) => !isInertManagedMcpServersNotice(x.path));
  if (n.composes === "tier") {
    let { helper } = n;
    e.store.lastPolicyEnvComposition = null;
    let K = helperMayBeUserControlled(e);
    let q =
      e.hostManagedProvider || K
        ? {
            ...helper,
          }
        : helper;
    if (e.hostManagedProvider) stripHostManagedModelKeys(q);
    if (K) machineLoginPins(q, e);
    e.store.policy.pairedModelOverrides = {
      value:
        e.hostManagedProvider && helper.availableModels !== undefined ? helper.modelOverrides : undefined,
    };
    e.store.policy.deniedModelsOverrides = {
      value: e.hostManagedProvider ? helper.modelOverrides : undefined,
    };
    let ee = (e.store.policy.helperBaseStatusNotices ??= [
      ...(e.helperMergesOutput?.() === true
        ? helperBaseSettings(e).errors.filter((error) => !error.statusOnly)
        : []),
      ...resolvePolicySettings(e).errors.filter((error) => error.statusOnly),
    ]);
    return {
      settings: q,
      errors: [...ee, ...filtered],
    };
  }
  let {
    tiers,
    tierSources,
    admin,
    parentSlice,
    hostModelOverlay,
    errors,
    present,
    snapshotFirst,
    heldInTheHostsPlace,
    policyOnlyLeads,
  } = resolvePolicySettings(e);
  errors.push(...filtered);
  if (!admin && !parentSlice) {
    e.store.lastPolicyEnvComposition = null;
    e.store.policy.pairedModelOverrides = {
      value: undefined,
    };
    e.store.policy.deniedModelsOverrides = {
      value: undefined,
    };
    let x = e.hkcu?.();
    if (x && Object.keys(x.settings).length > 0) {
      let K = e.hostManagedProvider
        ? {
            ...x.settings,
          }
        : x.settings;
      if (e.hostManagedProvider) {
        stripHostManagedModelKeys(K);
        if (hostModelOverlay) assignWithDeniedModels(K, hostModelOverlay);
      }
      return {
        settings: K,
        errors: [...errors, ...x.errors],
      };
    }
    if (hostModelOverlay)
      return {
        settings: {
          ...hostModelOverlay,
        },
        errors: [...errors, ...(x?.errors ?? [])],
      };
    return {
      settings: null,
      errors: [...errors, ...(x?.errors ?? [])],
    };
  }
  let slot = mergeWithAssigner_2(
    {},
    parentSlice ?? {},
    Uo(admin ?? {}, heldInTheHostsPlace),
    settingsMergeCustomizer,
  );
  if (parentSlice?.availableModelsMatch === "exact") slot.availableModelsMatch = "exact";
  if (parentSlice?.allowManagedHooksOnly === true) slot.allowManagedHooksOnly = true;
  if (parentSlice?.disableSkillShellExecution === true) slot.disableSkillShellExecution = true;
  if (tiers.some((tier) => tier.forceRemoteSettingsRefresh === true)) slot.forceRemoteSettingsRefresh = true;
  if (tierSources.includes("remote") || e.mdm?.().userWritable === true) machineLoginPins(slot, e);
  let w = env.CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION === true && !policyOnlyLeads;
  let env_2 = slot.env;
  if (!w) {
    let x = tiers;
    if (policyOnlyLeads) {
      let env = machineBeneathPolicyOnly(e).env;
      let ee = new Map(
        Object.entries(env ?? {})
          .filter(([, value]) => value.trim() !== "")
          .map(([key, value]) => [key.toUpperCase(), value]),
      );
      let Z = new Set(ee.keys());
      let ae =
        setsProviderEnv(env, tiers[0]?.env) ||
        Object.entries(tiers[0]?.env ?? {}).some(
          ([key, value]) =>
            value === "1" &&
            PROVIDER_ENV_FLAGS.some((G) => G === key.toUpperCase()) &&
            Z.has(key.toUpperCase()),
        );
      let me = Z.has("AWS_REGION") ? undefined : ee.get("AWS_DEFAULT_REGION");
      let mapped = Object.entries(tiers[0]?.env ?? {})
        .filter(([key]) => {
          let upper = key.toUpperCase();
          return ae
            ? !PROVIDER_REGION_ENV_KEYS.includes(upper)
            : !(AWS_ENDPOINT_ENV_KEYS.includes(upper) && Z.has(upper));
        })
        .map(([key, value]) =>
          me !== undefined && key.toUpperCase() === "AWS_REGION" ? [key, me] : [key, value],
        );
      let [Re, P] = SS(
        mapped,
        ([R, N]) => OTEL_DETAIL_VARS.includes(R.toUpperCase()) && isEnvDefinedFalsy(N),
      );
      x = [
        {
          ...tiers[0],
          env: Object.fromEntries(
            P.some(([R]) => isCredentialHelperSettingKey(R.toUpperCase())) ? mapped : P,
          ),
        },
        {
          env: {
            ...env,
            ...Object.fromEntries(Re),
          },
        },
      ];
    }
    let K = unionAdminTierEnv(
      x.map((q) => q.env),
      x.map((q) => (q.otelHeadersHelper ?? "").trim() !== ""),
      x.map((q) => {
        let ee = new Set();
        for (let Z of DANGEROUS_SHELL_SETTINGS) {
          let ae = q[Z];
          if (typeof ae === "string" && ae.trim() !== "") for (let me of HELPER_ENV_VARS[Z]) ee.add(me);
        }
        return ee.size > 0 ? ee : undefined;
      }),
      snapshotFirst || policyOnlyLeads ? 1 : 0,
    );
    if (Object.keys(K).length > 0) slot.env = K;
    else delete slot.env;
  }
  if (slot.env) {
    let x = dropDisableAdminEnvUnion(slot.env);
    if (x && Object.keys(x).length > 0) slot.env = x;
    else delete slot.env;
  }
  if (e.hostManagedProvider) {
    stripHostManagedModelKeys(slot);
    if (hostModelOverlay) assignWithDeniedModels(slot, hostModelOverlay);
  }
  let v = {
    env: dropDisableAdminEnvUnion(env_2),
  };
  if (e.hostManagedProvider) stripHostManagedModelKeys(v);
  let unionChangedEnv = !w && !sameEnvMap(slot.env, v.env);
  e.store.lastPolicyEnvComposition = {
    unionOptedOut: w,
    unionChangedEnv,
    remoteTierPresent: present.remote,
    mdmTierPresent: present.mdm,
    fileTierPresent: present.file,
    adminTierCount: tiers.length,
    tiersWithEnv: count(tiers, (x) => Object.keys(x.env ?? {}).length > 0),
  };
  e.store.policy.pairedModelOverrides = {
    value:
      e.hostManagedProvider &&
      admin?.availableModels !== undefined &&
      admin.modelOverrides !== undefined &&
      hostModelOverlay?.availableModels === undefined
        ? admin.modelOverrides
        : undefined,
  };
  e.store.policy.deniedModelsOverrides = {
    value: e.hostManagedProvider ? admin?.modelOverrides : undefined,
  };
  for (let { source, keys } of shadowedPolicyKeys(tiers, tierSources, slot)) {
    let [q] = keys;
    if (q === undefined) continue;
    let ee = MANAGED_SOURCE_NOTICE_LABELS[source];
    let Z = keys.length === 1;
    errors.push({
      file: ee,
      path: q,
      message: `${keys.map((key) => `"${key}"`).join(" and ")} in ${ee} ${Z ? "is" : "are"} not applied: ${ee} is not the managed settings source that applies for ${Z ? "this key" : "these keys"} (/status lists the setting sources). Remove ${Z ? "it" : "them"} from ${ee}, or set ${Z ? "it" : "them"} in the source that applies.`,
      severity: "warning",
      statusOnly: true,
    });
  }
  return {
    settings: slot,
    errors,
  };
}
//@ chunk-dcmhvw5a.js:509861-510300 placement
/**
 * 读取单个来源的设置（不合并其他来源）：policySettings 走 loadPolicySettings；flagSettings 合并 SDK 内联设置；localSettings 默认把旧位置的 settings.local.json 垫在下面。
 */
function getSettingsForSourceUncached(e, settingsContext, { includeLegacyLocalSettings: r = true } = {}) {
  if (e === "policySettings") return loadPolicySettings(settingsContext).settings;
  let settingsFilePathForSource = getSettingsFilePathForSource_3(e, settingsContext);
  let { settings } = settingsFilePathForSource
    ? parseSettingsFile_3(
        settingsFilePathForSource,
        settingsContext.store,
        e === "flagSettings" ? settingsContext.flagExpectedContent : undefined,
      )
    : {
        settings: null,
      };
  if (e === "flagSettings") {
    let { settings: settings_2 } = parseInlineFlagSettings(settingsContext);
    if (settings_2) return mergeWithAssigner_2(settings || {}, settings_2, settingsMergeCustomizer);
  }
  if (e === "localSettings" && r) {
    let legacyLocalSettingsFilePath = getLegacyLocalSettingsFilePath_3(settingsContext);
    if (legacyLocalSettingsFilePath) {
      let { settings: settings_2 } = parseSettingsFile_3(legacyLocalSettingsFilePath, settingsContext.store);
      if (settings_2) {
        settingsContext.onLegacyLocalSettingsRead?.("per_source");
        return mergeWithAssigner_2(settings_2, settings || {}, settingsMergeCustomizer);
      }
    }
  }
  return settings;
}
//@ chunk-dcmhvw5a.js:510300-510623 placement
function getSettingsParseErrorsForSource(e, n) {
  let r = n.store.repoTierFreeze.tier(e);
  if (r !== undefined) return [...r.errors];
  let s = [];
  let settingsFilePathForSource = getSettingsFilePathForSource_3(e, n);
  if (settingsFilePathForSource)
    s.push(
      ...parseSettingsFile_3(
        settingsFilePathForSource,
        n.store,
        e === "flagSettings" ? n.flagExpectedContent : undefined,
      ).errors,
    );
  if (e === "flagSettings") s.push(...parseInlineFlagSettings(n).errors);
  if (e === "localSettings") {
    let legacyLocalSettingsFilePath = getLegacyLocalSettingsFilePath_3(n);
    if (legacyLocalSettingsFilePath)
      s.push(...parseSettingsFile_3(legacyLocalSettingsFilePath, n.store).errors);
  }
  return s;
}
//@ chunk-dcmhvw5a.js:510623-510659 placement
function mergeExtraKnownMarketplacesByEntry(e, n) {
  return {
    ...e,
    ...n,
  };
}
export {
  getSettingsParseErrorsForSource,
  getMachineAdminPolicyEnv,
  machinePolicyKeepsPriority,
  getSettingsForSourceUncached,
  machineAdminMayPinSignInOrg,
  getMachineAdminPolicyTier,
  getRemotePolicyTierWithKind,
  getMachineAdminPolicyTiers,
  getAdminTierEnvValue,
  getVouchedAdminPolicyTier,
  isMachineAdminSourceUnread,
  mergeExtraKnownMarketplacesByEntry,
  loadPolicySettings,
  trimmedPolicyTier,
  machineBeneathPolicyOnly,
  KEPT_FROM_MACHINE_UNDER_POLICY_ONLY_TIER,
  ADDED_TO_A_POLICY_ONLY_TIER,
  winnerOnlyUnderMerge,
  helperMayBeUserControlled,
  CREDENTIAL_HELPER_SETTINGS_KEYS,
};
