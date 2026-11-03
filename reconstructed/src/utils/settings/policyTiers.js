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
import { DANGEROUS_SHELL_SETTINGS, rao, X_r, HELPER_ENV_VARS } from "../managedEnvConstants.js";
import { hao, setsProviderEnv, mp, gp } from "./managedEnvKeys.js";
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
import { Bt, mt } from "./types.js";
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
import { fj } from "./settingsSourceTrust.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { settingsMergeCustomizer } from "./settings.js";
import { PROVIDER_ENV_FLAGS } from "../model/modelIds.js";
import { SS } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isEnvDefinedFalsy } from "../envUtils.js";
import { count } from "../collections.js";
import { getSettingsFilePathForSource_3 } from "./settingsFileParsing.js";

//@ chunk-dcmhvw5a.js:500782-501142 placement
var CREDENTIAL_HELPER_SETTINGS_KEYS = [...DANGEROUS_SHELL_SETTINGS, "otelHeadersHelper", "proxyAuthHelper"],
  LAUNCH_FOLDER_WITHHELD_SETTINGS_KEYS = [
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
    !LAUNCH_FOLDER_WITHHELD_SETTINGS_KEYS.some((a) => n[a] !== void 0) ||
    (r.launchFolderKeysFrom?.(e) ?? "as_read") === "as_read"
  )
    return n;
  let s = { ...n };
  for (let a of LAUNCH_FOLDER_WITHHELD_SETTINGS_KEYS) delete s[a];
  return (hao("keys"), s);
}
//@ chunk-dcmhvw5a.js:501320-501364 placement
function kn(e, n, r) {
  return filterCredentialHelperKeys(e, withholdLaunchFolderKeys(e, n, r), r);
}
/**
 * 过滤非托管来源的凭据 helper 键。
 */
//@ chunk-dcmhvw5a.js:501364-501684 placement
function filterCredentialHelperKeys(e, n, r) {
  let any = CREDENTIAL_HELPER_SETTINGS_KEYS.some((m) => n[m] !== void 0);
  if (!any && e !== "policySettings") return n;
  let credentialHelperKeysFrom = r.credentialHelperKeysFrom(e);
  if (credentialHelperKeysFrom === "as_read") return n;
  let c = e === "policySettings" && credentialHelperKeysFrom === "machine_admin" ? KA(r) : {};
  if (!any && Object.keys(c).length === 0) return n;
  let g = { ...n };
  for (let m of CREDENTIAL_HELPER_SETTINGS_KEYS) delete g[m];
  return Object.assign(g, c);
}
//@ chunk-dcmhvw5a.js:501684-501778 placement
function KA(e) {
  let n = getMachineAdminPolicyTier(e),
    r = {};
  for (let s of CREDENTIAL_HELPER_SETTINGS_KEYS) {
    let a = n?.[s];
    if (a !== void 0) r[s] = a;
  }
  return r;
}
//@ chunk-dcmhvw5a.js:501778-501862 placement
function getMachineAdminPolicyTier(e) {
  let n = machineOnlyPolicyContext(e),
    r = armedHelperOutput(n);
  return r.composes === "tier" ? r.helper : resolvePolicySettings(n).admin;
}
//@ chunk-dcmhvw5a.js:501862-501928 placement
function machineAdminMayPinSignInOrg(e) {
  return getMachineAdminPolicyTier(e)?.forceLoginOrgUUID !== void 0 || isMachineAdminSourceUnread(e);
}
//@ chunk-dcmhvw5a.js:501928-501962 placement
function isMachineAdminSourceUnread(e) {
  return isMachineAdminDocumentUnreadable(machineOnlyPolicyContext(e));
}
//@ chunk-dcmhvw5a.js:501962-502198 placement
function machineOnlyPolicyContext(e) {
  let n = e.helperArmedFromRemote?.() === !1 && e.helperArmedFromUserWritableBase?.() === !1;
  return {
    ...e,
    store: new SettingsCacheStore(),
    remote: () => null,
    helper: n ? e.helper : () => null,
    ...(e.mdm?.().userWritable === !0 && { mdm: () => ({ settings: {}, errors: [] }) }),
  };
}
//@ chunk-dcmhvw5a.js:502198-502323 placement
function helperMayBeUserControlled(e) {
  return (
    e.helperArmedFromUserWritableBase?.() !== !1 ||
    (e.helperMergesOutput?.() === !0 && e.mdm?.().userWritable === !0)
  );
}
/**
 * 机器级登录固定（强制登录组织）。
 */
//@ chunk-dcmhvw5a.js:502323-502688 placement
function machineLoginPins(e, n) {
  if (n.store.policy.machineLoginPins === void 0) {
    let a = getMachineAdminPolicyTier(n);
    n.store.policy.machineLoginPins = {
      value: { forceLoginOrgUUID: a?.forceLoginOrgUUID, forceLoginMethod: a?.forceLoginMethod },
    };
  }
  let { forceLoginOrgUUID: forceLoginOrgUUID, forceLoginMethod: forceLoginMethod } =
    n.store.policy.machineLoginPins.value;
  if (forceLoginOrgUUID !== void 0) e.forceLoginOrgUUID = forceLoginOrgUUID;
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
    ...Bt.map((e) => ["autoMode", e]),
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
  ],
  ADDED_TO_A_POLICY_ONLY_TIER = ["deniedModels", "blockedMarketplaces", ...Bt.map((e) => `autoMode.${e}`)];
//@ chunk-dcmhvw5a.js:503521-503770 placement
function machineBeneathPolicyOnly(e) {
  if (e.store.policy.machineBeneathPolicyOnly === void 0) {
    let n = getMachineAdminPolicyTier(e),
      r = {};
    for (let s of KEPT_FROM_MACHINE_UNDER_POLICY_ONLY_TIER) {
      let a = getAtPath(n, s);
      if (a !== void 0) setAtPath(r, s, a);
    }
    e.store.policy.machineBeneathPolicyOnly = { kept: r, env: getMachineAdminPolicyEnv(e) };
  }
  return e.store.policy.machineBeneathPolicyOnly;
}
//@ chunk-dcmhvw5a.js:503770-503870 placement
function getMachineAdminPolicyEnv(e) {
  return loadPolicySettings({
    ...machineOnlyPolicyContext(e),
    helper: () => null,
    hkcu: void 0,
    parentManaged: null,
  }).settings?.env;
}
//@ chunk-dcmhvw5a.js:503870-504155 placement
function machinePolicyKeepsPriority(e, n) {
  if (isMachineAdminDocumentUnreadable(machineOnlyPolicyContext(e))) return !0;
  let admin = resolvePolicySettings({ ...machineOnlyPolicyContext(e), helper: () => null }).admin,
    s = admin?.forceLoginOrgUUID;
  if (s !== void 0 && !(typeof s === "string" ? [s] : s).some((a) => a.toLowerCase() === n.toLowerCase()))
    return !0;
  return POLICY_HELPER_CONFIG_KEYS.some((a) =>
    Object.values(admin?.[a] ?? {}).some((c) => c !== void 0 && c !== null),
  );
}
//@ chunk-dcmhvw5a.js:504155-504342 placement
function getVouchedAdminPolicyTier(e, n) {
  let r = machineOnlyPolicyContext(e),
    s = e.helperArmedFromUserWritableBase?.() === !1,
    a = n ? { ...r, remote: e.remote, helper: s ? e.helper : () => null } : r,
    c = armedHelperOutput(a);
  return c.composes === "tier" ? c.helper : resolvePolicySettings(a).admin;
}
//@ chunk-dcmhvw5a.js:504342-504459 placement
function getMachineAdminPolicyTiers(e) {
  let n = machineOnlyPolicyContext(e),
    r = armedHelperOutput(n);
  if (r.composes === "tier") return [r.helper];
  return resolvePolicySettings(n).tiers.filter((tier) => tier !== null);
}
//@ chunk-dcmhvw5a.js:504459-504603 placement
function getRemotePolicyTierWithKind(e) {
  let { tiers: tiers, tierSources: tierSources, snapshotFirst: snapshotFirst } = resolvePolicySettings(e),
    index = tierSources.indexOf("remote");
  return { settings: index === -1 ? null : (tiers[index] ?? null), servedSnapshot: snapshotFirst };
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
  ...mt,
];
//@ chunk-dcmhvw5a.js:504766-504792 placement
function winnerOnlyUnderMerge() {
  return WINNER_ONLY_UNDER_MERGE;
}
//@ chunk-dcmhvw5a.js:504792-504862 placement
function Yg(e) {
  return rao.some((n) => e.startsWith(n)) || X_r.includes(e);
}
//@ chunk-dcmhvw5a.js:504862-505320 placement
function unionAdminTierEnv(e, n, r, s = 0) {
  let a = new Map(),
    c = new Map(),
    g = !1;
  for (let [m, f] of e.entries()) {
    let h = new Set(),
      y = n?.[m] === !0;
    for (let [b, S] of Object.entries(f ?? {})) {
      let upper = b.toUpperCase(),
        w = Yg(upper);
      if (w && S.trim() === "") continue;
      if (w && g) continue;
      if (w && m > s && n?.[m] === !0) continue;
      let L = a.get(upper);
      if (L !== void 0) {
        if (h.has(upper)) c.set(b, S);
        else if (!c.has(b)) c.set(b, L);
        continue;
      }
      if (m > s && r?.[m]?.has(upper)) continue;
      if ((c.set(b, S), h.add(upper), a.set(upper, S), w)) y = !0;
    }
    if (y) g = !0;
  }
  return Object.fromEntries(c);
}
//@ chunk-dcmhvw5a.js:505320-505365 placement
var DISABLE_ADMIN_ENV_UNION_VAR = "CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION";
//@ chunk-dcmhvw5a.js:505365-505700 placement
function getAdminTierEnvValue(e, n) {
  let adminTierEnvView = e.store.policy.adminTierEnvView;
  if (adminTierEnvView !== void 0) return adminTierEnvView[n];
  let s = getAllPolicyTierSettings_3(e),
    a =
      env.CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION === !0 && !resolvePolicySettings(e).policyOnlyLeads
        ? (s[0]?.env ?? {})
        : unionAdminTierEnv(s.map((g) => g.env)),
    c = {};
  for (let [g, m] of Object.entries(a)) {
    let upper = g.toUpperCase();
    if (g === upper || !(upper in c)) c[upper] = m;
  }
  return ((e.store.policy.adminTierEnvView = c), c[n]);
}
//@ chunk-dcmhvw5a.js:505700-505810 placement
function dropDisableAdminEnvUnion(e) {
  if (!e) return;
  let n = {};
  for (let [r, s] of Object.entries(e)) if (r.toUpperCase() !== DISABLE_ADMIN_ENV_UNION_VAR) n[r] = s;
  return n;
}
//@ chunk-dcmhvw5a.js:505810-505931 placement
function sameEnvMap(e, n) {
  let entries = Object.entries(e ?? {}),
    s = n ?? {};
  return entries.length === Object.keys(s).length && entries.every(([a, c]) => s[a] === c);
}
/**
 * 组合托管（policy）设置：policyHelper 层（composes=tier）直接返回；否则由 SI() 计算 remote / MDM(plist|HKLM) / managed-settings.json(+managed-settings.d) / 父进程托管切片 / 宿主模型覆盖，按 managedSourcesBehavior（first-wins 或 merge）合成；都没有时回退 HKCU。
 */
//@ chunk-dcmhvw5a.js:505931-509861 placement
function loadPolicySettings(e) {
  let n = armedHelperOutput(e),
    filtered = (e.helperWarnings?.() ?? []).filter((x) => !isInertManagedMcpServersNotice(x.path));
  if (n.composes === "tier") {
    let { helper: helper } = n;
    e.store.lastPolicyEnvComposition = null;
    let K = helperMayBeUserControlled(e),
      q = e.hostManagedProvider || K ? { ...helper } : helper;
    if (e.hostManagedProvider) stripHostManagedModelKeys(q);
    if (K) machineLoginPins(q, e);
    ((e.store.policy.pairedModelOverrides = {
      value: e.hostManagedProvider && helper.availableModels !== void 0 ? helper.modelOverrides : void 0,
    }),
      (e.store.policy.deniedModelsOverrides = {
        value: e.hostManagedProvider ? helper.modelOverrides : void 0,
      }));
    let ee = (e.store.policy.helperBaseStatusNotices ??= [
      ...(e.helperMergesOutput?.() === !0
        ? helperBaseSettings(e).errors.filter((error) => !error.statusOnly)
        : []),
      ...resolvePolicySettings(e).errors.filter((error) => error.statusOnly),
    ]);
    return { settings: q, errors: [...ee, ...filtered] };
  }
  let {
    tiers: tiers,
    tierSources: tierSources,
    admin: admin,
    parentSlice: parentSlice,
    hostModelOverlay: hostModelOverlay,
    errors: errors,
    present: present,
    snapshotFirst: snapshotFirst,
    heldInTheHostsPlace: heldInTheHostsPlace,
    policyOnlyLeads: policyOnlyLeads,
  } = resolvePolicySettings(e);
  if ((errors.push(...filtered), !admin && !parentSlice)) {
    ((e.store.lastPolicyEnvComposition = null),
      (e.store.policy.pairedModelOverrides = { value: void 0 }),
      (e.store.policy.deniedModelsOverrides = { value: void 0 }));
    let x = e.hkcu?.();
    if (x && Object.keys(x.settings).length > 0) {
      let K = e.hostManagedProvider ? { ...x.settings } : x.settings;
      if (e.hostManagedProvider) {
        if ((stripHostManagedModelKeys(K), hostModelOverlay)) assignWithDeniedModels(K, hostModelOverlay);
      }
      return { settings: K, errors: [...errors, ...x.errors] };
    }
    if (hostModelOverlay)
      return { settings: { ...hostModelOverlay }, errors: [...errors, ...(x?.errors ?? [])] };
    return { settings: null, errors: [...errors, ...(x?.errors ?? [])] };
  }
  let C = fj({}, parentSlice ?? {}, Uo(admin ?? {}, heldInTheHostsPlace), settingsMergeCustomizer);
  if (parentSlice?.availableModelsMatch === "exact") C.availableModelsMatch = "exact";
  if (parentSlice?.allowManagedHooksOnly === !0) C.allowManagedHooksOnly = !0;
  if (parentSlice?.disableSkillShellExecution === !0) C.disableSkillShellExecution = !0;
  if (tiers.some((x) => x.forceRemoteSettingsRefresh === !0)) C.forceRemoteSettingsRefresh = !0;
  if (tierSources.includes("remote") || e.mdm?.().userWritable === !0) machineLoginPins(C, e);
  let w = env.CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION === !0 && !policyOnlyLeads,
    env_2 = C.env;
  if (!w) {
    let x = tiers;
    if (policyOnlyLeads) {
      let env = machineBeneathPolicyOnly(e).env,
        ee = new Map(
          Object.entries(env ?? {})
            .filter(([, R]) => R.trim() !== "")
            .map(([R, N]) => [R.toUpperCase(), N]),
        ),
        Z = new Set(ee.keys()),
        ae =
          setsProviderEnv(env, tiers[0]?.env) ||
          Object.entries(tiers[0]?.env ?? {}).some(
            ([R, N]) =>
              N === "1" && PROVIDER_ENV_FLAGS.some((G) => G === R.toUpperCase()) && Z.has(R.toUpperCase()),
          ),
        me = Z.has("AWS_REGION") ? void 0 : ee.get("AWS_DEFAULT_REGION"),
        mapped = Object.entries(tiers[0]?.env ?? {})
          .filter(([R]) => {
            let upper = R.toUpperCase();
            return ae ? !mp.includes(upper) : !(gp.includes(upper) && Z.has(upper));
          })
          .map(([R, N]) => (me !== void 0 && R.toUpperCase() === "AWS_REGION" ? [R, me] : [R, N])),
        [Re, P] = SS(mapped, ([R, N]) => X_r.includes(R.toUpperCase()) && isEnvDefinedFalsy(N));
      x = [
        { ...tiers[0], env: Object.fromEntries(P.some(([R]) => Yg(R.toUpperCase())) ? mapped : P) },
        { env: { ...env, ...Object.fromEntries(Re) } },
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
        return ee.size > 0 ? ee : void 0;
      }),
      snapshotFirst || policyOnlyLeads ? 1 : 0,
    );
    if (Object.keys(K).length > 0) C.env = K;
    else delete C.env;
  }
  if (C.env) {
    let x = dropDisableAdminEnvUnion(C.env);
    if (x && Object.keys(x).length > 0) C.env = x;
    else delete C.env;
  }
  if (e.hostManagedProvider) {
    if ((stripHostManagedModelKeys(C), hostModelOverlay)) assignWithDeniedModels(C, hostModelOverlay);
  }
  let v = { env: dropDisableAdminEnvUnion(env_2) };
  if (e.hostManagedProvider) stripHostManagedModelKeys(v);
  let j = !w && !sameEnvMap(C.env, v.env);
  ((e.store.lastPolicyEnvComposition = {
    unionOptedOut: w,
    unionChangedEnv: j,
    remoteTierPresent: present.remote,
    mdmTierPresent: present.mdm,
    fileTierPresent: present.file,
    adminTierCount: tiers.length,
    tiersWithEnv: count(tiers, (x) => Object.keys(x.env ?? {}).length > 0),
  }),
    (e.store.policy.pairedModelOverrides = {
      value:
        e.hostManagedProvider &&
        admin?.availableModels !== void 0 &&
        admin.modelOverrides !== void 0 &&
        hostModelOverlay?.availableModels === void 0
          ? admin.modelOverrides
          : void 0,
    }),
    (e.store.policy.deniedModelsOverrides = {
      value: e.hostManagedProvider ? admin?.modelOverrides : void 0,
    }));
  for (let { source: source, keys: keys } of shadowedPolicyKeys(tiers, tierSources, C)) {
    let [q] = keys;
    if (q === void 0) continue;
    let ee = MANAGED_SOURCE_NOTICE_LABELS[source],
      Z = keys.length === 1;
    errors.push({
      file: ee,
      path: q,
      message: `${keys.map((ae) => `"${ae}"`).join(" and ")} in ${ee} ${Z ? "is" : "are"} not applied: ${ee} is not the managed settings source that applies for ${Z ? "this key" : "these keys"} (/status lists the setting sources). Remove ${Z ? "it" : "them"} from ${ee}, or set ${Z ? "it" : "them"} in the source that applies.`,
      severity: "warning",
      statusOnly: !0,
    });
  }
  return { settings: C, errors: errors };
}
/**
 * 读取单个来源的设置（不合并其他来源）：policySettings 走 loadPolicySettings；flagSettings 合并 SDK 内联设置；localSettings 默认把旧位置的 settings.local.json 垫在下面。
 */
//@ chunk-dcmhvw5a.js:509861-510300 placement
function getSettingsForSourceUncached(e, n, { includeLegacyLocalSettings: r = !0 } = {}) {
  if (e === "policySettings") return loadPolicySettings(n).settings;
  let s = getSettingsFilePathForSource_3(e, n),
    { settings: settings } = s
      ? parseSettingsFile_3(s, n.store, e === "flagSettings" ? n.flagExpectedContent : void 0)
      : { settings: null };
  if (e === "flagSettings") {
    let { settings: settings_2 } = parseInlineFlagSettings(n);
    if (settings_2) return fj(settings || {}, settings_2, settingsMergeCustomizer);
  }
  if (e === "localSettings" && r) {
    let c = getLegacyLocalSettingsFilePath_3(n);
    if (c) {
      let { settings: settings_2 } = parseSettingsFile_3(c, n.store);
      if (settings_2)
        return (
          n.onLegacyLocalSettingsRead?.("per_source"),
          fj(settings_2, settings || {}, settingsMergeCustomizer)
        );
    }
  }
  return settings;
}
//@ chunk-dcmhvw5a.js:510300-510623 placement
function getSettingsParseErrorsForSource(e, n) {
  let tier = n.store.repoTierFreeze.tier(e);
  if (tier !== void 0) return [...tier.errors];
  let s = [],
    a = getSettingsFilePathForSource_3(e, n);
  if (a)
    s.push(...parseSettingsFile_3(a, n.store, e === "flagSettings" ? n.flagExpectedContent : void 0).errors);
  if (e === "flagSettings") s.push(...parseInlineFlagSettings(n).errors);
  if (e === "localSettings") {
    let c = getLegacyLocalSettingsFilePath_3(n);
    if (c) s.push(...parseSettingsFile_3(c, n.store).errors);
  }
  return s;
}
//@ chunk-dcmhvw5a.js:510623-510659 placement
function mergeExtraKnownMarketplacesByEntry(e, n) {
  return { ...e, ...n };
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
  kn,
  machineBeneathPolicyOnly,
  KEPT_FROM_MACHINE_UNDER_POLICY_ONLY_TIER,
  ADDED_TO_A_POLICY_ONLY_TIER,
  winnerOnlyUnderMerge,
  helperMayBeUserControlled,
  CREDENTIAL_HELPER_SETTINGS_KEYS,
};
