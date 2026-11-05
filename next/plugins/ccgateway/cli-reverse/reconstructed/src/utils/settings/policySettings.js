/**
 * utils/settings/policySettings.ts
 *
 * 2.1.316 新增：合并管理员策略层；多个策略中取最严格的值等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z20c443b.js (58)
 * attribution: placement 58
 */
import {
  getMachineAdminPolicyTier,
  machineBeneathPolicyOnly,
  KEPT_FROM_MACHINE_UNDER_POLICY_ONLY_TIER,
  ADDED_TO_A_POLICY_ONLY_TIER,
  winnerOnlyUnderMerge,
  helperMayBeUserControlled,
} from "./policyTiers.js";
import { getPolicySettingsOrigin_2, settingsMergeCustomizer } from "./settings.js";
import {
  parseRemoteManagedSettings,
  readMdmSettings,
  loadManagedFileSettings,
  parseParentManagedSettings,
  parseParentTierWithOrganization,
  isPolicyContentKey,
} from "./managedFileSettings.js";
import { restrictiveTopLevelSettings, isDeepEmptyObject } from "./types.js";
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import {
  adminTierComposesParent,
  shouldIncludeParentTier,
  isDisableAllHooksSet,
  keepRestrictiveFromParent,
  hostManagedModelOverlay,
  WINNER_ONLY_NESTED_UNDER_MERGE,
  missingAwsPairs,
  getSettingsForSource_3,
} from "./settingsSources.js";
import {
  pickAlias,
  import_sortedIndex_2,
  import_mapValues,
} from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { shouldAllowManagedMcpServersOnly } from "../../services/mcp/config.js";
import {
  getAtPath,
  setAtPath,
  MANAGED_RESTRICTION_KEYS,
  asArray,
  restrictionValue,
} from "./managedRestrictionKeys.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { getAllowedMcpServersFromTiers, unmanagedPolicyKeys } from "../../services/mcp/managedMcpPolicy.js";
import { getPlatform } from "../platform.js";
import { mergeWithAssigner_2 } from "../../../vendor/lodash-es/_mergeWithFamily.js";
import { explainUnloadableGuardHooks } from "./validation.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { refusedCopyForcesRefresh } from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:483965-484135 placement
function getHostPolicyLoginPins(settingsContext) {
  let machineAdminPolicyTier = getMachineAdminPolicyTier(settingsContext);
  return {
    forceLoginMethod: machineAdminPolicyTier?.forceLoginMethod,
    forceLoginGatewayUrl: machineAdminPolicyTier?.forceLoginGatewayUrl,
    gatewayInternalNetworks: machineAdminPolicyTier?.gatewayInternalNetworks,
  };
}
//@ chunk-z20c443b.js:484135-484459 placement
function getPolicySettingsOrigin(settingsContext) {
  let helper = armedHelperOutput(settingsContext);
  if (helper.composes === "tier") return "helper";
  let policySettings = resolvePolicySettings(settingsContext);
  if (helper.composes === "remoteSlot" || policySettings.present.remote) return "remote";
  if (policySettings.present.mdm) return getPolicySettingsOrigin_2();
  if (policySettings.present.file) return "file";
  if (policySettings.parentSlice || policySettings.hostModelOverlay) return "parent";
  let hkcu = settingsContext.hkcu?.();
  return hkcu && Object.keys(hkcu.settings).length > 0 ? "hkcu" : null;
}
//@ chunk-z20c443b.js:484459-484870 placement
function getShadowedManagedSources(context) {
  let helper = armedHelperOutput(context);
  let mergedOver = helper.composes === "none" ? null : helper.mergedOver;
  let policySettings = resolvePolicySettings(context);
  let sources = [];
  if (helper.composes === "tier") sources.push("helper");
  if (helper.composes === "remoteSlot" || policySettings.present.remote) sources.push("remote");
  if (policySettings.present.mdm) sources.push(getPolicySettingsOrigin_2());
  if (policySettings.present.file) sources.push("file");
  let mergedSources = getMergedPolicySources(context) ?? [];
  let [first, ...rest] = sources;
  let filtered = rest.filter((source) => source !== mergedOver && !mergedSources.includes(source));
  let hkcu = context.hkcu?.();
  if (hkcu && Object.keys(hkcu.settings).length > 0 && (first || policySettings.parentSlice))
    filtered.push("hkcu");
  return filtered;
}
//@ chunk-z20c443b.js:484870-485222 placement
function getManagedSourcesInEffect(settingsContext) {
  let policySettings = resolvePolicySettings(settingsContext);
  let sources = [];
  if (policySettings.present.remote) sources.push("remote");
  if (policySettings.present.mdm) sources.push(getPolicySettingsOrigin_2());
  if (policySettings.present.file) sources.push("file");
  if (policySettings.parentSlice || policySettings.hostModelOverlay) sources.push("parent");
  if (!policySettings.admin && !policySettings.parentSlice) {
    let hkcu = settingsContext.hkcu?.();
    if (hkcu && Object.keys(hkcu.settings).length > 0) sources.push("hkcu");
  }
  return {
    sources,
    behavior: policySettings.mode === "merge" ? "merge" : "first-wins",
  };
}
//@ chunk-z20c443b.js:485222-485333 placement
function isPolicySlotAdminOrParentComposed(settingsContext) {
  if (armedHelperOutput(settingsContext).composes === "tier") return true;
  let { admin, parentSlice } = resolvePolicySettings(settingsContext);
  return admin !== null || parentSlice !== null;
}
//@ chunk-z20c443b.js:485333-490285 placement
function resolvePolicySettings(context) {
  let errors = [];
  let remoteManagedSettings = parseRemoteManagedSettings(context);
  let { settings, servedSnapshot } = remoteManagedSettings;
  errors.push(...remoteManagedSettings.errors);
  let helper = armedHelperOutput(context);
  let remoteContent = helper.composes === "remoteSlot" ? helper.helper : policyContentOrNull(settings);
  let mdmSettings = readMdmSettings(context);
  let settings_2 = mdmSettings.settings;
  errors.push(...mdmSettings.errors);
  let mdmContent = policyContentOrNull(settings_2);
  let fileTier = context.file?.() ?? loadManagedFileSettings(context);
  let settings_3 = fileTier.settings;
  errors.push(...fileTier.errors);
  let fileContent = policyContentOrNull(settings_3);
  let mdmAuthored = authoredPolicyContent(mdmSettings);
  let fileAuthoredContent = authoredPolicyContent(fileTier);
  let fileAuthored = fileAuthoredContent && fileTier.heldOnly === true;
  let unconfirmedTier =
    context.policyOnlyServerTier?.() === "unconfirmed" &&
    ((mdmAuthored && context.mdm?.().userWritable !== true) || fileAuthoredContent);
  let siteEight = unconfirmedTier && remoteContent ? restrictiveParentSlice(remoteContent) : remoteContent;
  let remoteCounts =
    !unconfirmedTier &&
    (helper.composes === "remoteSlot" ? siteEight !== null : authoredPolicyContent(remoteManagedSettings));
  let remoteRank = policyRank(siteEight, remoteCounts);
  let mdmRank = policyRank(mdmContent, mdmAuthored);
  let fileRank = fileTier.onlyHeldContent ? POLICY_RANK_NONE : policyRank(fileContent, fileAuthoredContent);
  let remoteWins = !unconfirmedTier && siteEight !== null && remoteRank >= Math.max(mdmRank, fileRank);
  let mdmWins = mdmContent !== null && mdmRank >= fileRank;
  let candidates = [
    [unconfirmedTier ? null : settings, remoteWins],
    [settings_2, mdmWins],
    [settings_3, fileContent !== null],
  ];
  let managedSourcesBehavior = (
    helper.composes === "remoteSlot"
      ? helper.helper
      : candidates.find(
          ([tier, counts]) =>
            tier !== null &&
            (tier === settings && servedSnapshot
              ? counts
              : tier.managedSourcesBehavior !== undefined || counts),
        )?.[0]
  )?.managedSourcesBehavior;
  let remoteOnly = unconfirmedTier ? siteEight : null;
  let remoteHeld = siteEight !== null && !remoteWins;
  let kept = remoteHeld ? null : siteEight;
  let mdmHeld = mdmContent !== null && !mdmWins && kept === null;
  let mdmKept = mdmHeld ? null : mdmContent;
  let notices = [];
  let pairs = [
    [remoteHeld, "remote", siteEight],
    [mdmHeld, getPolicySettingsOrigin_2(), mdmContent],
  ];
  for (let [flagged, label, tier] of pairs) {
    if (!flagged || tier === null) continue;
    notices.push([tier, label]);
    if (!hasEffectivePolicyContent(tier) || tier === remoteOnly) continue;
    let fallbackLabel = label === "remote" && mdmAuthored ? getPolicySettingsOrigin_2() : "file";
    errors.push({
      file: MANAGED_SOURCE_NOTICE_LABELS[label],
      path: Object.keys(tier).find((key) => !restrictiveTopLevelSettings.includes(key)) ?? "",
      message: `${MANAGED_SOURCE_NOTICE_LABELS[label]} holds only values that could not be applied as written, so ${MANAGED_SOURCE_NOTICE_LABELS[fallbackLabel]} supplies the managed settings while that fail-closed reading still binds beside it (the most restrictive value of each such key applies), until it is fixed.`,
      severity: "warning",
      statusOnly: true,
    });
  }
  let { settings: settings_4, errors: errors_2 } = parseParentManagedSettings(context);
  errors.push(...errors_2);
  let parentTierWithOrganization = parseParentTierWithOrganization(context);
  errors.push(...(parentTierWithOrganization?.errors ?? []));
  let settings_5 = parentTierWithOrganization?.settings ?? settings_4;
  let snapshotFirst = kept !== null && servedSnapshot && helper.composes !== "remoteSlot";
  let parentNeverShutOut =
    !(kept !== null && remoteCounts && !snapshotFirst) && !(mdmKept !== null && mdmAuthored);
  let parentIncluded = parentNeverShutOut && (!fileAuthoredContent || fileAuthored);
  let keepsParent = parentIncluded && fileAuthored;
  let fileTrimmed =
    keepsParent && settings_5 && fileContent
      ? omitAlias(
          fileContent,
          MERGEABLE_POLICY_KEYS.filter((key) => settings_5[key] !== undefined),
        )
      : fileContent;
  let restrictiveSource = (mdmAuthored ? mdmKept : null) ?? (fileAuthoredContent ? fileContent : null);
  let parentComposes =
    settings_5 !== null &&
    (restrictiveSource === null || adminTierComposesParent(restrictiveSource) || keepsParent);
  let filtered = [
    keepMergeablePolicyKeys(kept, servedSnapshot && helper.composes !== "remoteSlot", [
      mdmKept,
      fileTrimmed && omitAlias(fileTrimmed, fileTier.heldAllowLists ?? []),
      ...(parentComposes ? [pickAlias(settings_5, MERGEABLE_POLICY_KEYS)] : []),
    ]),
    mdmKept,
    fileTrimmed,
    ...notices.map(([tier]) => tier),
  ].filter((tier) => tier !== null);
  let tierSources = [
    ...(kept !== null ? ["remote"] : []),
    ...(mdmKept !== null ? [getPolicySettingsOrigin_2()] : []),
    ...(fileContent !== null ? ["file"] : []),
    ...notices.map(([, source]) => source),
  ];
  let otherTierHasKey = (key) => filtered.some((tier) => tier !== fileTrimmed && tier[key] !== undefined);
  let heldFileExtra =
    fileTrimmed !== null &&
    fileTier.onlyHeldContent === true &&
    parentNeverShutOut &&
    managedSourcesBehavior !== "merge" &&
    filtered[0] !== fileTrimmed;
  let policyOnlyTier = kept !== null && context.policyOnlyServerTier?.() !== undefined;
  let { admin, merged } = mergeAdminPolicies(
    heldFileExtra ? filtered.filter((tier) => tier !== fileTrimmed) : filtered,
    managedSourcesBehavior,
    snapshotFirst,
    heldFileExtra ? filtered.length - 2 : notices.length,
    policyOnlyTier,
  );
  let mcpsOnly = (slot) =>
    shouldAllowManagedMcpServersOnly({
      slot,
      adminTiers: filtered,
    }) ||
    (settings_5?.allowManagedMcpServersOnly === true && slot?.allowManagedMcpServersOnly !== false);
  let keyAllowed = (key, tier) =>
    merged
      ? otherTierHasKey(key)
      : (filtered[0] !== fileTrimmed && filtered[0]?.[key] !== undefined) ||
        (key === "allowedMcpServers" && otherTierHasKey(key) && mcpsOnly(tier));
  let adminMerged =
    admin && fileTrimmed && heldFileExtra
      ? mergeAdminPolicies(
          [
            admin,
            omitAlias(
              fileTrimmed,
              MERGEABLE_POLICY_KEYS_2.filter((key) => keyAllowed(key, admin)),
            ),
          ],
          "merge",
          false,
          0,
        ).admin
      : admin && remoteOnly && !merged
        ? mergeAdminPolicies([admin, remoteOnly], "merge", false, 0).admin
        : admin;
  if (policyOnlyTier && adminMerged !== null) {
    let { kept } = machineBeneathPolicyOnly(context);
    for (let path of KEPT_FROM_MACHINE_UNDER_POLICY_ONLY_TIER) {
      let atPath = getAtPath(kept, path);
      let atPath_2 = getAtPath(adminMerged, path);
      if (atPath !== undefined)
        setAtPath(
          adminMerged,
          path,
          ADDED_TO_A_POLICY_ONLY_TIER.includes(path.join(".")) &&
            Array.isArray(atPath) &&
            Array.isArray(atPath_2)
            ? normalizeCaseForComparison_2([...atPath_2, ...atPath])
            : atPath,
        );
    }
  }
  let heldTier =
    adminMerged === null ? [remoteManagedSettings, mdmSettings, fileTier].find(isPolicyTier) : undefined;
  let adminTier = adminMerged ?? (heldTier ? {} : null);
  let present = {
    remote: kept !== null || heldTier === remoteManagedSettings,
    mdm: mdmKept !== null || heldTier === mdmSettings,
    file: fileContent !== null || heldTier === fileTier,
  };
  let shadowed = [];
  if (merged) {
    let winnerLabel = present.remote ? "remote" : present.mdm ? getPolicySettingsOrigin_2() : "file";
    let pairs = [
      [mdmKept, getPolicySettingsOrigin_2()],
      [fileTrimmed, "file"],
    ];
    for (let [tier, label] of pairs) {
      if (tier === null || tier === filtered[0] || (snapshotFirst && tier === filtered[1])) continue;
      let filtered_2 = POLICY_HELPER_CONFIG_KEYS.filter((key) =>
        Object.values(tier[key] ?? {}).some((value) => value !== undefined && value !== null),
      );
      let [first] = filtered_2;
      if (first === undefined) continue;
      shadowed.push(label);
      errors.push({
        file: MANAGED_SOURCE_NOTICE_LABELS[label],
        path: first,
        message: `${filtered_2.map((key) => `"${key}"`).join(" and ")} in ${MANAGED_SOURCE_NOTICE_LABELS[label]} ignored: policy helper configuration is read from the highest managed settings source only (${MANAGED_SOURCE_NOTICE_LABELS[winnerLabel]} here), even with managedSourcesBehavior "merge". Configure the helper in that source instead.`,
        severity: "warning",
        statusOnly: true,
      });
    }
  }
  let composes = (tier) =>
    tier !== null &&
    (tier === filtered[0] || Object.keys(omitAlias(tier, winnerOnlyUnderMerge())).length > 0);
  let composed = {
    remote: composes(kept),
    mdm: composes(mdmKept),
    file: composes(fileTrimmed),
  };
  let composedFlags = {
    allowManagedPermissionRulesOnly:
      filtered.some((tier) => tier.allowManagedPermissionRulesOnly === true) || undefined,
    forceLoginOrgUUID: adminTier?.forceLoginOrgUUID,
    ...pickAlias(adminTier ?? {}, MERGEABLE_POLICY_KEYS),
    hooks: adminTier?.hooks,
    enabledPlugins: adminTier?.enabledPlugins,
    allowedMcpServers: mcpsOnly(adminTier)
      ? getAllowedMcpServersFromTiers({
          slot: adminTier,
          adminTiers: filtered,
        })
      : adminTier?.allowedMcpServers,
    sandbox: {
      network: {
        allowManagedDomainsOnly:
          filtered.some((tier) => tier.sandbox?.network?.allowManagedDomainsOnly === true) || undefined,
      },
      filesystem: {
        allowManagedReadPathsOnly:
          filtered.some((tier) => tier.sandbox?.filesystem?.allowManagedReadPathsOnly === true) || undefined,
      },
    },
  };
  let includeParent = shouldIncludeParentTier(adminMerged, parentIncluded);
  let filled = keepsParent && settings_5 ? fillMissingPolicyKeys(settings_5, composedFlags) : settings_5;
  let heldInPlace =
    includeParent && settings_5 && !keepsParent
      ? MERGEABLE_POLICY_KEYS.filter(
          (key) =>
            settings_5[key] !== undefined &&
            fileTier.heldAllowLists?.includes(key) === true &&
            import_sortedIndex_2(composedFlags[key], fileContent?.[key]) &&
            !keyAllowed(key, adminTier),
        )
      : [];
  let parentRestrictive =
    (filled || isDisableAllHooksSet(context.parentManaged)) && includeParent
      ? keepsParent
        ? keepRestrictiveFromParent(
            filled ?? {},
            {
              ...composedFlags,
              allowManagedPermissionRulesOnly: true,
              sandbox: {
                network: {
                  allowManagedDomainsOnly: true,
                },
                filesystem: {
                  allowManagedReadPathsOnly: true,
                },
              },
            },
            context.parentManaged,
            context.parentOrganizationSettings?.own,
          )
        : keepRestrictiveFromParent(
            filled ?? {},
            omitAlias(composedFlags, heldInPlace),
            context.parentManaged,
            context.parentOrganizationSettings?.own,
          )
      : null;
  let parentSlice = parentRestrictive && Object.keys(parentRestrictive).length > 0 ? parentRestrictive : null;
  let hostModelOverlay = hostManagedModelOverlay(
    settings_5 === settings_4
      ? filled
      : keepsParent && settings_4
        ? fillMissingPolicyKeys(settings_4, composedFlags)
        : settings_4,
    context.hostManagedProvider,
  );
  return {
    tiers: filtered,
    tierSources,
    admin: adminTier,
    parentSlice,
    hostModelOverlay,
    errors,
    present,
    mode: managedSourcesBehavior,
    merged,
    composed,
    snapshotFirst,
    parentNeverShutOut: parentIncluded,
    shadowedHelperSources: shadowed,
    parentIncluded: includeParent,
    heldEmpty: heldTier !== undefined,
    fileNotHeld: fileTier.settingsNotHeld,
    heldInTheHostsPlace: heldInPlace,
    policyOnlyLeads: policyOnlyTier,
  };
}
//@ chunk-z20c443b.js:490285-490963 placement
/**
 * 合并管理员策略层。
 */
function mergeAdminPolicies(tiers, managedSourcesBehavior, override, count, force = false) {
  let first = tiers[0];
  if (!first)
    return {
      admin: null,
      merged: false,
    };
  let { managedSourcesBehavior: managedSourcesBehavior_2, ...stripped } = first;
  let mergeAll = managedSourcesBehavior === "merge" && tiers.length >= 2;
  if (!mergeAll && count === 0 && !force)
    return {
      admin: managedSourcesBehavior_2 === undefined ? first : stripped,
      merged: false,
    };
  let mapped = tiers.slice(mergeAll || force ? 1 : tiers.length - count).map((tier, index) => {
    let isFirstOverride = mergeAll && override && index === 0;
    let copy = isFirstOverride
      ? {
          ...tier,
        }
      : omitAlias(tier, winnerOnlyUnderMerge());
    if (!isFirstOverride) {
      for (let path of WINNER_ONLY_NESTED_UNDER_MERGE)
        if (getAtPath(copy, path) !== undefined) setAtPath(copy, path, undefined);
    }
    let atPath = getAtPath(copy.sandbox, ["enabledPlatforms"]);
    if (Array.isArray(atPath) && atPath.includes(getPlatform()))
      setAtPath(copy, ["sandbox", "enabledPlatforms"], undefined);
    else if (atPath !== undefined) delete copy.sandbox;
    return copy;
  });
  if (!mergeAll) {
    mostRestrictivePolicy(stripped, [first, ...mapped]);
    return {
      admin: stripped,
      merged: false,
    };
  }
  let merged = {};
  for (let tier of [...mapped].reverse()) mergeWithAssigner_2(merged, tier, mergePolicyValue);
  mergeWithAssigner_2(merged, stripped, override ? applyPolicyKeyChange : mergePolicyValue);
  mostRestrictivePolicy(merged, [first, ...mapped]);
  pickModelOverrides(merged, [first, ...mapped], override);
  return {
    admin: merged,
    merged: true,
  };
}
//@ chunk-z20c443b.js:490963-491137 placement
var POLICY_HELPER_CONFIG_KEYS = ["policyHelper", "policyHelpers"];
var MANAGED_SOURCE_NOTICE_LABELS = {
  remote: "server-managed settings",
  plist: "the managed preferences plist",
  hklm: "the HKLM policy key",
  file: "managed-settings.json",
};
//@ chunk-z20c443b.js:491137-491202 placement
function hasPolicyContent(doc) {
  return Object.keys(doc).some((key) => !restrictiveTopLevelSettings.includes(key));
}
//@ chunk-z20c443b.js:491202-491282 placement
function hasEffectivePolicyContent(doc) {
  return Object.entries(doc).some(
    ([key, value]) => !restrictiveTopLevelSettings.includes(key) && !isDeepEmptyObject(value),
  );
}
//@ chunk-z20c443b.js:491282-491321 placement
function policyContentOrNull(settings) {
  return settings && hasPolicyContent(settings) ? settings : null;
}
//@ chunk-z20c443b.js:491321-491399 placement
function authoredPolicyContent(tier) {
  return tier.settings !== null && hasEffectivePolicyContent(tier.settings) && !tier.onlySubstitutes;
}
//@ chunk-z20c443b.js:491399-491484 placement
/**
 * explainedPolicyChange：说明策略变化。
 */
function explainedPolicyChange(issues, settings, issueList) {
  return authoredPolicyContent({
    settings,
  }) && !issueList.some((issue) => issue.onlySubstitutes)
    ? explainUnloadableGuardHooks(issues)
    : issues;
}
//@ chunk-z20c443b.js:491484-491493 placement
var POLICY_RANK_NONE = 0;
//@ chunk-z20c443b.js:491493-491564 placement
function policyRank(content, authored) {
  if (content === null) return -1;
  if (authored) return 2;
  return hasEffectivePolicyContent(content) ? 1 : POLICY_RANK_NONE;
}
//@ chunk-z20c443b.js:491564-491676 placement
function documentHasPolicyContent(doc, parsed) {
  return (
    Object.entries(doc).some(
      ([key, value]) =>
        value !== null && !isPolicyContentKey(key, value) && !restrictiveTopLevelSettings.includes(key),
    ) ||
    (parsed !== null && hasPolicyContent(parsed))
  );
}
//@ chunk-z20c443b.js:491676-491764 placement
function isPolicyTier(layer) {
  return layer.documentHasPolicyContent ?? (layer.settings !== null && hasPolicyContent(layer.settings));
}
//@ chunk-z20c443b.js:491764-491838 placement
function loadStateOf(tier) {
  return tier.loadState ?? (tier.settings !== null ? "loaded" : "absent");
}
//@ chunk-z20c443b.js:491838-491965 placement
function combinedLoadState(a, b) {
  if (a === "didNotLoad" || b === "didNotLoad") return "didNotLoad";
  return a === "loaded" || b === "loaded" ? "loaded" : "absent";
}
//@ chunk-z20c443b.js:491965-492046 placement
function adminDocumentPresent(tier) {
  return tier.userWritable !== true && (isPolicyTier(tier) || tier.loadState === "didNotLoad");
}
//@ chunk-z20c443b.js:492046-492269 placement
function pickModelOverrides(target, tiers, winnerOverrides) {
  let index = tiers.findIndex((tier) => tier.availableModels !== undefined);
  let index_2 = tiers.findIndex((tier) => tier.modelOverrides !== undefined);
  if (index_2 !== -1 && (index === -1 || index_2 <= index || (winnerOverrides && index === 0)))
    target.modelOverrides = {
      ...tiers[index_2].modelOverrides,
    };
  else delete target.modelOverrides;
}
//@ chunk-z20c443b.js:492269-492411 placement
var WHOLE_VALUE_POLICY_KEYS = [
  "allowedMcpServers",
  "availableModels",
  "strictKnownMarketplaces",
  "allowedChannelPlugins",
  "allowedProviders",
];
var SANDBOX_REPLACE_KEYS = ["awsPairs", "ripgrep"];
//@ chunk-z20c443b.js:492411-492600 placement
function replacePolicyValue(previous, next, key) {
  if (next === undefined) return previous;
  if (Array.isArray(next))
    return key === "awsPairs" && Array.isArray(previous)
      ? [...next, ...missingAwsPairs(previous, next)]
      : [...next];
  if (!isPlainObject_2(next)) return next;
  return import_mapValues(next, (value) => (Array.isArray(value) ? [...value] : value));
}
//@ chunk-z20c443b.js:492600-492974 placement
/**
 * 可合并的策略键。
 */
var MERGEABLE_POLICY_KEYS_2 = [
  "allowedMcpServers",
  "availableModels",
  "strictKnownMarketplaces",
  "allowedChannelPlugins",
  "allowedProviders",
  "allowedMarketplaces",
  "allowedHttpHookUrls",
  "httpHookAllowedEnvVars",
];
var MERGEABLE_POLICY_KEYS = [
  "allowedMcpServers",
  "availableModels",
  "strictKnownMarketplaces",
  "allowedProviders",
];
var mergeablePolicyKeys = [
  ["allowManagedMcpServersOnly", "allowedMcpServers"],
  ["enforceAvailableModels", "availableModels"],
];
//@ chunk-z20c443b.js:492974-493066 placement
function fillMissingPolicyKeys(settings, other) {
  return omitAlias(
    settings,
    mergeablePolicyKeys
      .filter(([, key]) => settings[key] === undefined && other[key] === undefined)
      .map(([alias]) => alias),
  );
}
//@ chunk-z20c443b.js:493066-493357 placement
var RESTRICTIVE_PARENT_KEYS; // deferred: uses MERGEABLE_POLICY_KEYS_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:493066", () => {
  RESTRICTIVE_PARENT_KEYS = [
    ...mergeablePolicyKeys.map(([alias]) => alias),
    "allowManagedPermissionRulesOnly",
    "allowManagedHooksOnly",
    "disableAllHooks",
    "allowedHttpHookUrls",
    "httpHookAllowedEnvVars",
    "strictPluginOnlyCustomization",
    "sandbox.network.allowManagedDomainsOnly",
    "sandbox.filesystem.allowManagedReadPathsOnly",
    "sandbox.enabled",
  ];
});
//@ chunk-z20c443b.js:493357-493587 placement
function restrictiveParentSlice(settings) {
  return policyContentOrNull(
    keepRestrictiveFromParent(omitAlias(settings, RESTRICTIVE_PARENT_KEYS), {
      ...Object.fromEntries(MERGEABLE_POLICY_KEYS.map((key) => [key, []])),
      forceLoginOrgUUID: [],
      allowManagedPermissionRulesOnly: true,
      sandbox: {
        network: {
          allowManagedDomainsOnly: true,
        },
        filesystem: {
          allowManagedReadPathsOnly: true,
        },
      },
    }),
  );
}
//@ chunk-z20c443b.js:493587-493712 placement
function keepMergeablePolicyKeys(settings, enabled, tiers) {
  if (settings === null || !enabled) return settings;
  let filtered = MERGEABLE_POLICY_KEYS_2.filter((key) => tiers.some((tier) => tier?.[key] !== undefined));
  return filtered.length === 0 ? settings : omitAlias(settings, filtered);
}
//@ chunk-z20c443b.js:493712-493813 placement
function mergePolicyValue(previous, next, key) {
  if (key !== undefined && (WHOLE_VALUE_POLICY_KEYS.includes(key) || SANDBOX_REPLACE_KEYS.includes(key)))
    return replacePolicyValue(previous, next, key);
  return unionPolicyArrays(previous, next, key);
}
//@ chunk-z20c443b.js:493813-493896 placement
function applyPolicyKeyChange(previous, next, key) {
  if (key !== undefined && WHOLE_VALUE_POLICY_KEYS.includes(key))
    return replacePolicyValue(previous, next, key);
  return unionPolicyArrays(previous, next, key);
}
//@ chunk-z20c443b.js:493896-494013 placement
function unionPolicyArrays(previous, next, key) {
  if (Array.isArray(previous) && Array.isArray(next) && key !== "fallbackModel")
    return normalizeCaseForComparison_2([...next, ...previous]);
  return settingsMergeCustomizer(previous, next, key);
}
//@ chunk-z20c443b.js:494013-494547 placement
/**
 * 多个策略中取最严格的值。
 */
function mostRestrictivePolicy(target, tiers) {
  let first = tiers[0];
  let result = target;
  for (let def of MANAGED_RESTRICTION_KEYS()) {
    let { path, restrictive } = def;
    let options = asArray(restrictive);
    let min = Math.min(
      ...tiers.map((tier) => options.indexOf(restrictionValue(def, tier))).filter((index) => index !== -1),
    );
    if (Number.isFinite(min)) setAtPath(result, path, options[min]);
    else if (getAtPath(first, path) === undefined && getAtPath(target, path) !== undefined)
      setAtPath(result, path, undefined);
  }
  if (target.strictPluginOnlyCustomization !== true) {
    let values = normalizeCaseForComparison_2(
      tiers.flatMap((tier) =>
        Array.isArray(tier.strictPluginOnlyCustomization) ? tier.strictPluginOnlyCustomization : [],
      ),
    );
    if (values.length > 0) target.strictPluginOnlyCustomization = values;
    else if (first?.strictPluginOnlyCustomization === undefined) delete target.strictPluginOnlyCustomization;
  }
}
//@ chunk-z20c443b.js:494547-494687 placement
function getMergedPolicySources(context) {
  let mergedSources = context.store.policy.mergedSources;
  if (mergedSources !== undefined) return mergedSources.value;
  let names = mergedPolicySourceNames(context);
  context.store.policy.mergedSources = {
    value: names,
  };
  return names;
}
//@ chunk-z20c443b.js:494687-494884 placement
function mergedPolicySourceNames(context) {
  if (armedHelperOutput(context).composes === "tier") return null;
  let { merged, composed } = resolvePolicySettings(context);
  if (!merged) return null;
  let names = [];
  if (composed.remote) names.push("remote");
  if (composed.mdm) names.push(getPolicySettingsOrigin_2());
  if (composed.file) names.push("file");
  return names;
}
//@ chunk-z20c443b.js:494884-495356 placement
function armedHelperOutput(context) {
  let helper = context.helper?.() ?? null;
  if (!helper)
    return {
      composes: "none",
    };
  let composition = context.helperArmedFromRemote?.() === false ? "tier" : "remoteSlot";
  if (context.helperMergesOutput?.() !== true)
    return {
      composes: composition,
      helper,
      mergedOver: null,
    };
  if (!context.store.policy.mergedHelper) {
    let { base, mergedOver } =
      composition === "remoteSlot"
        ? {
            base: parseRemoteManagedSettings(context).settings,
            mergedOver: "remote",
          }
        : helperBaseSettings(context);
    context.store.policy.mergedHelper = {
      helper: mergeHelperOutputOverBase(base, helper),
      mergedOver: Object.keys(pickPolicyHelperConfigKeys(base)).length > 0 ? mergedOver : null,
    };
  }
  return {
    composes: composition,
    ...context.store.policy.mergedHelper,
  };
}
//@ chunk-z20c443b.js:495356-495579 placement
function helperBaseSettings(context) {
  let mdmSettings = readMdmSettings(context);
  if (
    resolvePolicySettings({
      ...context,
      helper: undefined,
    }).present.mdm
  )
    return {
      base: mdmSettings.settings,
      mergedOver: getPolicySettingsOrigin_2(),
      errors: mdmSettings.errors,
    };
  let file = context.file?.() ?? loadManagedFileSettings(context);
  return {
    base: file.settings,
    mergedOver: "file",
    errors: [...mdmSettings.errors, ...file.errors],
  };
}
//@ chunk-z20c443b.js:495579-495615 placement
function pickPolicyHelperConfigKeys(settings) {
  return omitAlias(settings ?? {}, POLICY_HELPER_CONFIG_KEYS);
}
//@ chunk-z20c443b.js:495615-495825 placement
function overlayEnvByUpperName(env, env_2) {
  let upperMap = new Map();
  for (let [key, value] of Object.entries(env_2)) {
    let upper = key.toUpperCase();
    if (!upperMap.has(upper)) upperMap.set(upper, value);
  }
  let out = {};
  for (let [key, value] of Object.entries(env)) out[key] = upperMap.get(key.toUpperCase()) ?? value;
  return Object.assign(out, env_2);
}
//@ chunk-z20c443b.js:495825-495939 placement
var HELPER_WHOLE_VALUE_KEYS = [
  "forceLoginOrgUUID",
  "gatewayInternalNetworks",
  "allowedHttpHookUrls",
  "httpHookAllowedEnvVars",
  "allowRead",
];
//@ chunk-z20c443b.js:495939-496055 placement
function mergeHelperValue(previous, next, key) {
  let value =
    key !== undefined && next !== undefined && HELPER_WHOLE_VALUE_KEYS.includes(key)
      ? next
      : mergePolicyValue(previous, next, key);
  return value === next && Array.isArray(value) ? [...value] : value;
}
//@ chunk-z20c443b.js:496055-496148 placement
function mergeHelperOutputOverBase(settings, helper) {
  let baseKeys = pickPolicyHelperConfigKeys(settings);
  let merged = mergeWithAssigner_2({}, baseKeys, helper, mergeHelperValue);
  if (baseKeys.env && helper.env) merged.env = overlayEnvByUpperName(baseKeys.env, helper.env);
  return merged;
}
//@ chunk-z20c443b.js:496148-496466 placement
function getMachineAdminTierSettings(settingsContext) {
  let output = armedHelperOutput(settingsContext);
  if (output.composes === "tier") return [output.helper];
  let { tiers, tierSources, present, merged, snapshotFirst, policyOnlyLeads } =
    resolvePolicySettings(settingsContext);
  let filtered = tiers.filter((tier, index) =>
    tierSources[index] === "file" ? present.file : tierSources[index] !== "remote" && present.mdm,
  );
  if (merged) return filtered;
  if (policyOnlyLeads) {
    let machineAdminPolicyTier = getMachineAdminPolicyTier(settingsContext);
    return machineAdminPolicyTier === null ? [] : [machineAdminPolicyTier];
  }
  if (present.remote && !snapshotFirst) return [];
  return filtered.slice(0, 1);
}
//@ chunk-z20c443b.js:496466-496680 placement
function getEveryMachineAdminTierSettings(context) {
  let mdmUserWritable = context.mdm?.().userWritable === true;
  let output = armedHelperOutput(context);
  if (output.composes === "tier" && !helperMayBeUserControlled(context)) return [output.helper];
  let { tiers, tierSources } = resolvePolicySettings(context);
  let vouched = {
    remoteVerified: false,
    mdmUserWritable,
  };
  return tiers.filter((tier, index) => isVouchedOrigin(tierSources[index], vouched));
}
//@ chunk-z20c443b.js:496680-496815 placement
function getMachineAdminDocumentLoadErrors(settingsContext) {
  return [
    ...(settingsContext.mdm?.().userWritable === true
      ? []
      : readMdmSettings(settingsContext).errors.filter((error) => error.userWritable !== true)),
    ...(settingsContext.file?.() ?? loadManagedFileSettings(settingsContext)).errors,
  ];
}
//@ chunk-z20c443b.js:496815-497147 placement
function isMachineAdminDocumentUnreadable(context) {
  let userWritable = context.mdm?.().userWritable === true;
  if (
    armedHelperOutput(context).composes === "tier" &&
    context.helperArmedFromUserWritableBase?.() === false &&
    context.helperMergesOutput?.() !== true
  )
    return false;
  let mdmSettings = readMdmSettings(context);
  if (
    (!userWritable && mdmSettings.loadState === "didNotLoad") ||
    mdmSettings.errors.some((error) => error.errorClass === "unreadable" && error.userWritable !== true)
  )
    return true;
  return loadStateOf(context.file?.() ?? loadManagedFileSettings(context)) === "didNotLoad";
}
//@ chunk-z20c443b.js:497147-497267 placement
function policyTierSettings(context) {
  let output = armedHelperOutput(context);
  if (output.composes === "tier") return [output.helper];
  let { tiers, parentSlice } = resolvePolicySettings(context);
  return parentSlice ? [...tiers, parentSlice] : tiers;
}
//@ chunk-z20c443b.js:497267-497432 placement
function getAdminPolicyTierSettings(settingsContext) {
  let adminTiers = settingsContext.store.policy.adminTiers;
  if (adminTiers !== undefined) return adminTiers;
  let output = armedHelperOutput(settingsContext);
  let tiers = output.composes === "tier" ? [output.helper] : resolvePolicySettings(settingsContext).tiers;
  settingsContext.store.policy.adminTiers = tiers;
  return tiers;
}
//@ chunk-z20c443b.js:497432-497905 placement
function getVouchedPolicyTierSettings(settingsContext, remoteVerified) {
  let mdmUserWritable = settingsContext.mdm?.().userWritable === true;
  let output = armedHelperOutput(settingsContext);
  if (output.composes === "tier")
    return settingsContext.helperArmedFromUserWritableBase?.() !== false ||
      (settingsContext.helperMergesOutput?.() === true && mdmUserWritable)
      ? []
      : [output.helper];
  let { tiers, tierSources, parentSlice, parentNeverShutOut, merged, snapshotFirst, fileNotHeld } =
    resolvePolicySettings(settingsContext);
  let vouched = {
    remoteVerified,
    mdmUserWritable,
  };
  let flattened = tiers.flatMap((tier, index) => {
    let source = tierSources[index];
    if (!isVouchedOrigin(source, vouched)) return [];
    return source === "file" && fileNotHeld !== undefined ? [fileNotHeld] : [tier];
  });
  if (
    parentSlice !== null &&
    !parentNeverShutOut &&
    isVouchedOrigin(tierSources[merged && snapshotFirst ? 1 : 0], vouched)
  )
    flattened.push(parentSlice);
  return flattened;
}
//@ chunk-z20c443b.js:497905-498063 placement
function isVouchedOrigin(source, { remoteVerified, mdmUserWritable }) {
  switch (source) {
    case "remote":
      return remoteVerified;
    case "plist":
    case "hklm":
      return !mdmUserWritable;
    case "file":
      return true;
    case undefined:
      return false;
  }
}
//@ chunk-z20c443b.js:498063-498191 placement
function getShadowedMcpPolicySources(settingsContext) {
  if (armedHelperOutput(settingsContext).composes === "tier") return [];
  let { tiers, tierSources } = resolvePolicySettings(settingsContext);
  return shadowedPolicyKeys(
    tiers,
    tierSources,
    getSettingsForSource_3("policySettings", settingsContext) ?? {},
  );
}
//@ chunk-z20c443b.js:498191-498339 placement
function shadowedPolicyKeys(tiers, tierSources, slot) {
  let slotView = {
    slot,
    adminTiers: tiers,
  };
  return tiers.flatMap((tier, index) => {
    let source = tierSources[index];
    let keys = unmanagedPolicyKeys(tier, slotView);
    return source !== undefined && keys.length > 0
      ? [
          {
            source,
            keys,
          },
        ]
      : [];
  });
}
//@ chunk-z20c443b.js:498339-498419 placement
function parentManagedTierParticipates(settingsContext) {
  if (armedHelperOutput(settingsContext).composes === "tier") return false;
  return resolvePolicySettings(settingsContext).parentIncluded;
}
//@ chunk-z20c443b.js:498419-498608 placement
/**
 * 判定父级托管设置是否由本层继承/可写成 tier 组合。
 */
function parentSettingsIncluded(settingsContext) {
  if (Object.keys(settingsContext.parentManaged ?? {}).length === 0) return;
  if (armedHelperOutput(settingsContext).composes === "tier") return false;
  let { parentIncluded, parentSlice } = resolvePolicySettings(settingsContext);
  if (!parentIncluded) return false;
  return parentSlice === null ? undefined : true;
}
//@ chunk-z20c443b.js:498608-498838 placement
function isForceRemoteSettingsRefreshConfigured(settingsContext) {
  let { tiers, admin, parentSlice } = resolvePolicySettings({
    ...settingsContext,
    helper: undefined,
  });
  if (tiers.some((tier) => tier.forceRemoteSettingsRefresh === true)) return true;
  if (!settingsContext.remote && refusedCopyForcesRefresh()) return true;
  return !admin && !parentSlice && settingsContext.hkcu?.().settings.forceRemoteSettingsRefresh === true;
}
//@ chunk-z20c443b.js:498838-498962 placement
function getDurablePolicyTierSettings(context) {
  let durableTiers = context.store.policy.durableTiers;
  if (durableTiers !== undefined) return durableTiers;
  let tiers = durablePolicyTiers(context);
  context.store.policy.durableTiers = tiers;
  return tiers;
}
//@ chunk-z20c443b.js:498962-499147 placement
function durablePolicyTiers(context) {
  let output = armedHelperOutput(context);
  if (output.composes === "tier") return [output.helper];
  let { tiers, admin } = resolvePolicySettings(context);
  if (!admin) {
    let hkcu = context.hkcu?.();
    if (hkcu && Object.keys(hkcu.settings).length > 0) return [hkcu.settings];
  }
  return tiers;
}
//@ chunk-z20c443b.js:499147-499287 placement
function getAdminAuthoredPolicySettings(context) {
  let adminAuthored = context.store.policy.adminAuthored;
  if (adminAuthored !== undefined) return adminAuthored.value;
  let policy = adminAuthoredPolicy(context);
  context.store.policy.adminAuthored = {
    value: policy,
  };
  return policy;
}
//@ chunk-z20c443b.js:499287-499528 placement
function adminAuthoredPolicy(context) {
  let output = armedHelperOutput(context);
  if (output.composes === "tier") return output.helper;
  let { admin, parentSlice, snapshotFirst } = resolvePolicySettings(context);
  if (snapshotFirst) return getMachineAdminPolicyTier(context);
  if (admin) return admin;
  if (parentSlice) return null;
  let hkcu = context.hkcu?.();
  return hkcu && Object.keys(hkcu.settings).length > 0 ? hkcu.settings : null;
}
export {
  POLICY_HELPER_CONFIG_KEYS,
  hasEffectivePolicyContent,
  hasPolicyContent,
  adminDocumentPresent,
  combinedLoadState,
  loadStateOf,
  parentManagedTierParticipates,
  parentSettingsIncluded,
  armedHelperOutput,
  getMergedPolicySources,
  resolvePolicySettings,
  getMachineAdminTierSettings,
  getEveryMachineAdminTierSettings,
  getMachineAdminDocumentLoadErrors,
  isMachineAdminDocumentUnreadable,
  getDurablePolicyTierSettings,
  getAdminPolicyTierSettings,
  getAdminAuthoredPolicySettings,
  getShadowedMcpPolicySources,
  isPolicyTier,
  getPolicySettingsOrigin,
  isForceRemoteSettingsRefreshConfigured,
  getVouchedPolicyTierSettings,
  getHostPolicyLoginPins,
  getShadowedManagedSources,
  getManagedSourcesInEffect,
  isPolicySlotAdminOrParentComposed,
  authoredPolicyContent,
  MANAGED_SOURCE_NOTICE_LABELS,
  MERGEABLE_POLICY_KEYS,
  policyTierSettings,
  mergeAdminPolicies,
  MERGEABLE_POLICY_KEYS_2,
  adminAuthoredPolicy,
  explainedPolicyChange,
  documentHasPolicyContent,
  helperBaseSettings,
  shadowedPolicyKeys,
  mergeHelperOutputOverBase,
};
