/**
 * utils/settings/policyTiers.ts
 *
 * 2.1.316 新增：机器级登录固定（强制登录组织）；过滤非托管来源的凭据 helper 键。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z20c443b.js (31)
 * attribution: placement 30, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { logForDebugging } from "../debug.js";
import {
  isInertManagedMcpServersNotice,
  parseSettingsFile_3,
  parseInlineFlagSettings,
} from "./managedFileSettings.js";
import { mergeWithAssigner_2 } from "../../../vendor/lodash-es/_mergeWithFamily.js";
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { settingsMergeCustomizer } from "./settings.js";
import { PROVIDER_ENV_FLAGS } from "../model/modelIds.js";
import { partitionAlias } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isEnvDefinedFalsy } from "../envUtils.js";
import { countWhere } from "../collections.js";
import { getSettingsFilePathForSource_3 } from "./settingsFileParsing.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:499608-499968 placement
var CREDENTIAL_HELPER_SETTINGS_KEYS; // deferred: uses DANGEROUS_SHELL_SETTINGS (../managedEnvConstants.js) of its import cycle while loading; runs once the cycle is complete
var LAUNCH_FOLDER_WITHHELD_SETTINGS_KEYS;
deferInit("chunk-z20c443b.js:499608", () => {
  CREDENTIAL_HELPER_SETTINGS_KEYS = [...DANGEROUS_SHELL_SETTINGS, "otelHeadersHelper", "proxyAuthHelper"];
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
});
//@ chunk-z20c443b.js:499968-500146 placement
function withholdLaunchFolderKeys(source, settings, context) {
  if (
    !LAUNCH_FOLDER_WITHHELD_SETTINGS_KEYS.some((key) => settings[key] !== undefined) ||
    (context.launchFolderKeysFrom?.(source) ?? "as_read") === "as_read"
  )
    return settings;
  let out = {
    ...settings,
  };
  for (let key of LAUNCH_FOLDER_WITHHELD_SETTINGS_KEYS) delete out[key];
  markManagedKeyGroup("keys");
  return out;
}
//@ chunk-z20c443b.js:500146-500190 placement
/**
 * trimmedPolicyTier：裁剪后的策略层。
 */
function trimmedPolicyTier(source, settings, context) {
  return filterCredentialHelperKeys(source, withholdLaunchFolderKeys(source, settings, context), context);
}
//@ chunk-z20c443b.js:500190-500510 placement
/**
 * 过滤非托管来源的凭据 helper 键。
 */
function filterCredentialHelperKeys(source, settings, context) {
  let any = CREDENTIAL_HELPER_SETTINGS_KEYS.some((key) => settings[key] !== undefined);
  if (!any && source !== "policySettings") return settings;
  let origin = context.credentialHelperKeysFrom(source);
  if (origin === "as_read") return settings;
  let summary =
    source === "policySettings" && origin === "machine_admin" ? adminPolicyTierSummary(context) : {};
  if (!any && Object.keys(summary).length === 0) return settings;
  let out = {
    ...settings,
  };
  for (let key of CREDENTIAL_HELPER_SETTINGS_KEYS) delete out[key];
  return Object.assign(out, summary);
}
//@ chunk-z20c443b.js:500510-500604 placement
function adminPolicyTierSummary(context) {
  let machineAdminPolicyTier = getMachineAdminPolicyTier(context);
  let summary = {};
  for (let key of CREDENTIAL_HELPER_SETTINGS_KEYS) {
    let value = machineAdminPolicyTier?.[key];
    if (value !== undefined) summary[key] = value;
  }
  return summary;
}
//@ chunk-z20c443b.js:500604-500688 placement
function getMachineAdminPolicyTier(context) {
  let machineContext = machineOnlyPolicyContext(context);
  let output = armedHelperOutput(machineContext);
  return output.composes === "tier" ? output.helper : resolvePolicySettings(machineContext).admin;
}
//@ chunk-z20c443b.js:500688-500754 placement
function machineAdminMayPinSignInOrg(context) {
  return (
    getMachineAdminPolicyTier(context)?.forceLoginOrgUUID !== undefined || isMachineAdminSourceUnread(context)
  );
}
//@ chunk-z20c443b.js:500754-500788 placement
function isMachineAdminSourceUnread(context) {
  return isMachineAdminDocumentUnreadable(machineOnlyPolicyContext(context));
}
//@ chunk-z20c443b.js:500788-501024 placement
function machineOnlyPolicyContext(context) {
  let keepHelper =
    context.helperArmedFromRemote?.() === false && context.helperArmedFromUserWritableBase?.() === false;
  return {
    ...context,
    store: new SettingsCacheStore(),
    remote: () => null,
    helper: keepHelper ? context.helper : () => null,
    ...(context.mdm?.().userWritable === true && {
      mdm: () => ({
        settings: {},
        errors: [],
      }),
    }),
  };
}
//@ chunk-z20c443b.js:501024-501149 placement
function helperMayBeUserControlled(context) {
  return (
    context.helperArmedFromUserWritableBase?.() !== false ||
    (context.helperMergesOutput?.() === true && context.mdm?.().userWritable === true)
  );
}
//@ chunk-z20c443b.js:501149-501514 placement
/**
 * 机器级登录固定（强制登录组织）。
 */
function machineLoginPins(target, context) {
  if (context.store.policy.machineLoginPins === undefined) {
    let machineAdminPolicyTier = getMachineAdminPolicyTier(context);
    context.store.policy.machineLoginPins = {
      value: {
        forceLoginOrgUUID: machineAdminPolicyTier?.forceLoginOrgUUID,
        forceLoginMethod: machineAdminPolicyTier?.forceLoginMethod,
      },
    };
  }
  let { forceLoginOrgUUID, forceLoginMethod } = context.store.policy.machineLoginPins.value;
  if (forceLoginOrgUUID !== undefined) target.forceLoginOrgUUID = forceLoginOrgUUID;
  if (forceLoginMethod === "claudeai" || forceLoginMethod === "console")
    target.forceLoginMethod = forceLoginMethod;
}
//@ chunk-z20c443b.js:501514-502347 placement
var KEPT_FROM_MACHINE_UNDER_POLICY_ONLY_TIER; // deferred: uses RESTRICTIVE_NESTED_SETTING_VALUES (./types.js) of its import cycle while loading; runs once the cycle is complete
var ADDED_TO_A_POLICY_ONLY_TIER;
deferInit("chunk-z20c443b.js:501514", () => {
  KEPT_FROM_MACHINE_UNDER_POLICY_ONLY_TIER = [
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
    ...RESTRICTIVE_NESTED_SETTINGS.map((key) => ["autoMode", key]),
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
  ADDED_TO_A_POLICY_ONLY_TIER = [
    "deniedModels",
    "blockedMarketplaces",
    ...RESTRICTIVE_NESTED_SETTINGS.map((key) => `autoMode.${key}`),
  ];
});
//@ chunk-z20c443b.js:502347-502596 placement
function machineBeneathPolicyOnly(context) {
  if (context.store.policy.machineBeneathPolicyOnly === undefined) {
    let machineAdminPolicyTier = getMachineAdminPolicyTier(context);
    let kept = {};
    for (let path of KEPT_FROM_MACHINE_UNDER_POLICY_ONLY_TIER) {
      let atPath = getAtPath(machineAdminPolicyTier, path);
      if (atPath !== undefined) setAtPath(kept, path, atPath);
    }
    context.store.policy.machineBeneathPolicyOnly = {
      kept,
      env: getMachineAdminPolicyEnv(context),
    };
  }
  return context.store.policy.machineBeneathPolicyOnly;
}
//@ chunk-z20c443b.js:502596-502696 placement
function getMachineAdminPolicyEnv(context) {
  return loadPolicySettings({
    ...machineOnlyPolicyContext(context),
    helper: () => null,
    hkcu: undefined,
    parentManaged: null,
  }).settings?.env;
}
//@ chunk-z20c443b.js:502696-502981 placement
function machinePolicyKeepsPriority(settingsContext, orgUuid) {
  if (isMachineAdminDocumentUnreadable(machineOnlyPolicyContext(settingsContext))) return true;
  let admin = resolvePolicySettings({
    ...machineOnlyPolicyContext(settingsContext),
    helper: () => null,
  }).admin;
  let forceLoginOrgUUID = admin?.forceLoginOrgUUID;
  if (
    forceLoginOrgUUID !== undefined &&
    !(typeof forceLoginOrgUUID === "string" ? [forceLoginOrgUUID] : forceLoginOrgUUID).some(
      (value) => value.toLowerCase() === orgUuid.toLowerCase(),
    )
  )
    return true;
  return POLICY_HELPER_CONFIG_KEYS.some((key) =>
    Object.values(admin?.[key] ?? {}).some((value) => value !== undefined && value !== null),
  );
}
//@ chunk-z20c443b.js:502981-503168 placement
function getVouchedAdminPolicyTier(settingsContext, includeRemote) {
  let machineContext = machineOnlyPolicyContext(settingsContext);
  let helperArmed = settingsContext.helperArmedFromUserWritableBase?.() === false;
  let context = includeRemote
    ? {
        ...machineContext,
        remote: settingsContext.remote,
        helper: helperArmed ? settingsContext.helper : () => null,
      }
    : machineContext;
  let output = armedHelperOutput(context);
  return output.composes === "tier" ? output.helper : resolvePolicySettings(context).admin;
}
//@ chunk-z20c443b.js:503168-503285 placement
function getMachineAdminPolicyTiers(context) {
  let machineContext = machineOnlyPolicyContext(context);
  let output = armedHelperOutput(machineContext);
  if (output.composes === "tier") return [output.helper];
  return resolvePolicySettings(machineContext).tiers.filter((tier) => tier !== null);
}
//@ chunk-z20c443b.js:503285-503429 placement
function getRemotePolicyTierWithKind(settingsContext) {
  let { tiers, tierSources, snapshotFirst } = resolvePolicySettings(settingsContext);
  let index = tierSources.indexOf("remote");
  return {
    settings: index === -1 ? null : (tiers[index] ?? null),
    servedSnapshot: snapshotFirst,
  };
}
//@ chunk-z20c443b.js:503429-503592 placement
var WINNER_ONLY_UNDER_MERGE; // deferred: uses CREDENTIAL_HELPER_SETTINGS_KEYS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:503429", () => {
  WINNER_ONLY_UNDER_MERGE = [
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
});
//@ chunk-z20c443b.js:503592-503618 placement
function winnerOnlyUnderMerge() {
  return WINNER_ONLY_UNDER_MERGE;
}
//@ chunk-z20c443b.js:503618-503688 placement
function isCredentialHelperSettingKey(key) {
  return OTEL_EXPORTER_PREFIXES.some((prefix) => key.startsWith(prefix)) || OTEL_DETAIL_VARS.includes(key);
}
//@ chunk-z20c443b.js:503688-504146 placement
function unionAdminTierEnv(envs, flags, reserved, skipBelow = 0) {
  let seenUpper = new Map();
  let out = new Map();
  let seenCredentialHelper = false;
  for (let [index, env] of envs.entries()) {
    let ownUpper = new Set();
    let hasHelper = flags?.[index] === true;
    for (let [key, value] of Object.entries(env ?? {})) {
      let key_2 = key.toUpperCase();
      let isHelperKey = isCredentialHelperSettingKey(key_2);
      if (isHelperKey && value.trim() === "") continue;
      if (isHelperKey && seenCredentialHelper) continue;
      if (isHelperKey && index > skipBelow && flags?.[index] === true) continue;
      let previous = seenUpper.get(key_2);
      if (previous !== undefined) {
        if (ownUpper.has(key_2)) out.set(key, value);
        else if (!out.has(key)) out.set(key, previous);
        continue;
      }
      if (index > skipBelow && reserved?.[index]?.has(key_2)) continue;
      out.set(key, value);
      ownUpper.add(key_2);
      seenUpper.set(key_2, value);
      if (isHelperKey) hasHelper = true;
    }
    if (hasHelper) seenCredentialHelper = true;
  }
  return Object.fromEntries(out);
}
//@ chunk-z20c443b.js:504146-504191 placement
var DISABLE_ADMIN_ENV_UNION_VAR = "CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION";
//@ chunk-z20c443b.js:504191-504526 placement
function getAdminTierEnvValue(settingsContext, envName) {
  let adminTierEnvView = settingsContext.store.policy.adminTierEnvView;
  if (adminTierEnvView !== undefined) return adminTierEnvView[envName];
  let allPolicyTierSettings = getAllPolicyTierSettings_3(settingsContext);
  let merged =
    env.CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION === true &&
    !resolvePolicySettings(settingsContext).policyOnlyLeads
      ? (allPolicyTierSettings[0]?.env ?? {})
      : unionAdminTierEnv(allPolicyTierSettings.map((policyTierSetting) => policyTierSetting.env));
  let upperMap = {};
  for (let [key, value] of Object.entries(merged)) {
    let upper = key.toUpperCase();
    if (key === upper || !(upper in upperMap)) upperMap[upper] = value;
  }
  settingsContext.store.policy.adminTierEnvView = upperMap;
  return upperMap[envName];
}
//@ chunk-z20c443b.js:504526-504636 placement
function dropDisableAdminEnvUnion(env) {
  if (!env) return;
  let out = {};
  for (let [key, value] of Object.entries(env))
    if (key.toUpperCase() !== DISABLE_ADMIN_ENV_UNION_VAR) out[key] = value;
  return out;
}
//@ chunk-z20c443b.js:504636-504757 placement
function sameEnvMap(env, env_2) {
  let entries = Object.entries(env ?? {});
  let other = env_2 ?? {};
  return (
    entries.length === Object.keys(other).length && entries.every(([key, value]) => other[key] === value)
  );
}
//@ chunk-z20c443b.js:504757-504931 layout
function noteParentLeftOut(context, reason) {
  if (reason === context.store.parentLeftOutReason) return;
  context.store.parentLeftOutReason = reason;
  if (reason !== null)
    logForDebugging(`--managed-settings left out of the policy tier: ${reason}`, {
      level: "warn",
    });
}
//@ chunk-z20c443b.js:504931-509327 placement
/**
 * 组合托管（policy）设置：policyHelper 层（composes=tier）直接返回；否则由 SI() 计算 remote / MDM(plist|HKLM) / managed-settings.json(+managed-settings.d) / 父进程托管切片 / 宿主模型覆盖，按 managedSourcesBehavior（first-wins 或 merge）合成；都没有时回退 HKCU。
 */
function loadPolicySettings(context) {
  let output = armedHelperOutput(context);
  let filtered = (context.helperWarnings?.() ?? []).filter(
    (warning) => !isInertManagedMcpServersNotice(warning.path),
  );
  let parentHasTier = Object.keys(context.parentManaged ?? {}).length > 0;
  if (output.composes === "tier") {
    noteParentLeftOut(
      context,
      parentHasTier
        ? "a policy helper supplies that tier (parentSettingsBehavior does not apply to it)"
        : null,
    );
    let { helper } = output;
    context.store.lastPolicyEnvComposition = null;
    let helperControlled = helperMayBeUserControlled(context);
    let settings =
      context.hostManagedProvider || helperControlled
        ? {
            ...helper,
          }
        : helper;
    if (context.hostManagedProvider) stripHostManagedModelKeys(settings);
    if (helperControlled) machineLoginPins(settings, context);
    context.store.policy.pairedModelOverrides = {
      value:
        context.hostManagedProvider && helper.availableModels !== undefined
          ? helper.modelOverrides
          : undefined,
    };
    context.store.policy.deniedModelsOverrides = {
      value: context.hostManagedProvider ? helper.modelOverrides : undefined,
    };
    let notices = (context.store.policy.helperBaseStatusNotices ??= [
      ...(context.helperMergesOutput?.() === true
        ? helperBaseSettings(context).errors.filter((error) => !error.statusOnly)
        : []),
      ...resolvePolicySettings(context).errors.filter((error) => error.statusOnly),
    ]);
    return {
      settings,
      errors: [...notices, ...filtered],
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
    parentIncluded,
    heldInTheHostsPlace,
    policyOnlyLeads,
  } = resolvePolicySettings(context);
  let parentLeftOutReason = null;
  if (parentHasTier && !parentIncluded)
    parentLeftOutReason =
      "an administrator's managed settings apply and do not set parentSettingsBehavior to 'merge'";
  else if (parentHasTier && !parentSlice && !hostModelOverlay)
    parentLeftOutReason =
      "nothing shuts it out, yet none of its keys was kept (unreadable, no restriction, or already set by an administrator)";
  noteParentLeftOut(context, parentLeftOutReason);
  errors.push(...filtered);
  if (!admin && !parentSlice) {
    context.store.lastPolicyEnvComposition = null;
    context.store.policy.pairedModelOverrides = {
      value: undefined,
    };
    context.store.policy.deniedModelsOverrides = {
      value: undefined,
    };
    let hkcu = context.hkcu?.();
    if (hkcu && Object.keys(hkcu.settings).length > 0) {
      let settings = context.hostManagedProvider
        ? {
            ...hkcu.settings,
          }
        : hkcu.settings;
      if (context.hostManagedProvider) {
        stripHostManagedModelKeys(settings);
        if (hostModelOverlay) assignWithDeniedModels(settings, hostModelOverlay);
      }
      return {
        settings,
        errors: [...errors, ...hkcu.errors],
      };
    }
    if (hostModelOverlay)
      return {
        settings: {
          ...hostModelOverlay,
        },
        errors: [...errors, ...(hkcu?.errors ?? [])],
      };
    return {
      settings: null,
      errors: [...errors, ...(hkcu?.errors ?? [])],
    };
  }
  let mergedSettings = mergeWithAssigner_2(
    {},
    parentSlice ?? {},
    omitAlias(admin ?? {}, heldInTheHostsPlace),
    settingsMergeCustomizer,
  );
  if (parentSlice?.availableModelsMatch === "exact") mergedSettings.availableModelsMatch = "exact";
  if (parentSlice?.allowManagedHooksOnly === true) mergedSettings.allowManagedHooksOnly = true;
  if (parentSlice?.disableSkillShellExecution === true) mergedSettings.disableSkillShellExecution = true;
  if (tiers.some((tier) => tier.forceRemoteSettingsRefresh === true))
    mergedSettings.forceRemoteSettingsRefresh = true;
  if (tierSources.includes("remote") || context.mdm?.().userWritable === true)
    machineLoginPins(mergedSettings, context);
  let disableUnion = env.CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION === true && !policyOnlyLeads;
  let env_2 = mergedSettings.env;
  if (!disableUnion) {
    let envTiers = tiers;
    if (policyOnlyLeads) {
      let env = machineBeneathPolicyOnly(context).env;
      let machineEnv = new Map(
        Object.entries(env ?? {})
          .filter(([, value]) => value.trim() !== "")
          .map(([key, value]) => [key.toUpperCase(), value]),
      );
      let machineUpper = new Set(machineEnv.keys());
      let providerSet =
        setsProviderEnv(env, tiers[0]?.env) ||
        Object.entries(tiers[0]?.env ?? {}).some(
          ([key, value]) =>
            value === "1" &&
            PROVIDER_ENV_FLAGS.some((flag) => flag === key.toUpperCase()) &&
            machineUpper.has(key.toUpperCase()),
        );
      let defaultRegion = machineUpper.has("AWS_REGION") ? undefined : machineEnv.get("AWS_DEFAULT_REGION");
      let mapped = Object.entries(tiers[0]?.env ?? {})
        .filter(([key]) => {
          let upper = key.toUpperCase();
          return providerSet
            ? !PROVIDER_REGION_ENV_KEYS.includes(upper)
            : !(AWS_ENDPOINT_ENV_KEYS.includes(upper) && machineUpper.has(upper));
        })
        .map(([key, value]) =>
          defaultRegion !== undefined && key.toUpperCase() === "AWS_REGION"
            ? [key, defaultRegion]
            : [key, value],
        );
      let [droppedOtel, kept] = partitionAlias(
        mapped,
        ([key, value]) => OTEL_DETAIL_VARS.includes(key.toUpperCase()) && isEnvDefinedFalsy(value),
      );
      envTiers = [
        {
          ...tiers[0],
          env: Object.fromEntries(
            kept.some(([key]) => isCredentialHelperSettingKey(key.toUpperCase())) ? mapped : kept,
          ),
        },
        {
          env: {
            ...env,
            ...Object.fromEntries(droppedOtel),
          },
        },
      ];
    }
    let env = unionAdminTierEnv(
      envTiers.map((tier) => tier.env),
      envTiers.map((tier) => (tier.otelHeadersHelper ?? "").trim() !== ""),
      envTiers.map((tier) => {
        let vars = new Set();
        for (let key of DANGEROUS_SHELL_SETTINGS) {
          let value = tier[key];
          if (typeof value === "string" && value.trim() !== "")
            for (let envVar of HELPER_ENV_VARS[key]) vars.add(envVar);
        }
        return vars.size > 0 ? vars : undefined;
      }),
      snapshotFirst || policyOnlyLeads ? 1 : 0,
    );
    if (Object.keys(env).length > 0) mergedSettings.env = env;
    else delete mergedSettings.env;
  }
  if (mergedSettings.env) {
    let cleaned = dropDisableAdminEnvUnion(mergedSettings.env);
    if (cleaned && Object.keys(cleaned).length > 0) mergedSettings.env = cleaned;
    else delete mergedSettings.env;
  }
  if (context.hostManagedProvider) {
    stripHostManagedModelKeys(mergedSettings);
    if (hostModelOverlay) assignWithDeniedModels(mergedSettings, hostModelOverlay);
  }
  let before = {
    env: dropDisableAdminEnvUnion(env_2),
  };
  if (context.hostManagedProvider) stripHostManagedModelKeys(before);
  let unionChangedEnv = !disableUnion && !sameEnvMap(mergedSettings.env, before.env);
  context.store.lastPolicyEnvComposition = {
    unionOptedOut: disableUnion,
    unionChangedEnv,
    remoteTierPresent: present.remote,
    mdmTierPresent: present.mdm,
    fileTierPresent: present.file,
    adminTierCount: tiers.length,
    tiersWithEnv: countWhere(tiers, (tier) => Object.keys(tier.env ?? {}).length > 0),
  };
  context.store.policy.pairedModelOverrides = {
    value:
      context.hostManagedProvider &&
      admin?.availableModels !== undefined &&
      admin.modelOverrides !== undefined &&
      hostModelOverlay?.availableModels === undefined
        ? admin.modelOverrides
        : undefined,
  };
  context.store.policy.deniedModelsOverrides = {
    value: context.hostManagedProvider ? admin?.modelOverrides : undefined,
  };
  for (let { source, keys } of shadowedPolicyKeys(tiers, tierSources, mergedSettings)) {
    let [firstKey] = keys;
    if (firstKey === undefined) continue;
    let label = MANAGED_SOURCE_NOTICE_LABELS[source];
    let single = keys.length === 1;
    errors.push({
      file: label,
      path: firstKey,
      message: `${keys.map((key) => `"${key}"`).join(" and ")} in ${label} ${single ? "is" : "are"} not applied: ${label} is not the managed settings source that applies for ${single ? "this key" : "these keys"} (/status lists the setting sources). Remove ${single ? "it" : "them"} from ${label}, or set ${single ? "it" : "them"} in the source that applies.`,
      severity: "warning",
      statusOnly: true,
    });
  }
  return {
    settings: mergedSettings,
    errors,
  };
}
//@ chunk-z20c443b.js:509327-509766 placement
/**
 * 读取单个来源的设置（不合并其他来源）：policySettings 走 loadPolicySettings；flagSettings 合并 SDK 内联设置；localSettings 默认把旧位置的 settings.local.json 垫在下面。
 */
function getSettingsForSourceUncached(
  source,
  context,
  { includeLegacyLocalSettings: includeLegacy = true } = {},
) {
  if (source === "policySettings") return loadPolicySettings(context).settings;
  let settingsFilePathForSource = getSettingsFilePathForSource_3(source, context);
  let { settings } = settingsFilePathForSource
    ? parseSettingsFile_3(
        settingsFilePathForSource,
        context.store,
        source === "flagSettings" ? context.flagExpectedContent : undefined,
      )
    : {
        settings: null,
      };
  if (source === "flagSettings") {
    let { settings: settings_2 } = parseInlineFlagSettings(context);
    if (settings_2) return mergeWithAssigner_2(settings || {}, settings_2, settingsMergeCustomizer);
  }
  if (source === "localSettings" && includeLegacy) {
    let legacyLocalSettingsFilePath = getLegacyLocalSettingsFilePath_3(context);
    if (legacyLocalSettingsFilePath) {
      let { settings: settings_2 } = parseSettingsFile_3(legacyLocalSettingsFilePath, context.store);
      if (settings_2) {
        context.onLegacyLocalSettingsRead?.("per_source");
        return mergeWithAssigner_2(settings_2, settings || {}, settingsMergeCustomizer);
      }
    }
  }
  return settings;
}
//@ chunk-z20c443b.js:509766-510089 placement
function getSettingsParseErrorsForSource(source, context) {
  let frozen = context.store.repoTierFreeze.tier(source);
  if (frozen !== undefined) return [...frozen.errors];
  let errors = [];
  let settingsFilePathForSource = getSettingsFilePathForSource_3(source, context);
  if (settingsFilePathForSource)
    errors.push(
      ...parseSettingsFile_3(
        settingsFilePathForSource,
        context.store,
        source === "flagSettings" ? context.flagExpectedContent : undefined,
      ).errors,
    );
  if (source === "flagSettings") errors.push(...parseInlineFlagSettings(context).errors);
  if (source === "localSettings") {
    let legacyLocalSettingsFilePath = getLegacyLocalSettingsFilePath_3(context);
    if (legacyLocalSettingsFilePath)
      errors.push(...parseSettingsFile_3(legacyLocalSettingsFilePath, context.store).errors);
  }
  return errors;
}
//@ chunk-z20c443b.js:510089-510125 placement
function mergeExtraKnownMarketplacesByEntry(base, addition) {
  return {
    ...base,
    ...addition,
  };
}
export {
  mergeExtraKnownMarketplacesByEntry,
  loadPolicySettings,
  trimmedPolicyTier,
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
  CREDENTIAL_HELPER_SETTINGS_KEYS,
  machineBeneathPolicyOnly,
  KEPT_FROM_MACHINE_UNDER_POLICY_ONLY_TIER,
  ADDED_TO_A_POLICY_ONLY_TIER,
  winnerOnlyUnderMerge,
  helperMayBeUserControlled,
  LAUNCH_FOLDER_WITHHELD_SETTINGS_KEYS,
  WINNER_ONLY_UNDER_MERGE,
  unionAdminTierEnv,
};
