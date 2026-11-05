/**
 * utils/plugins/marketplaceNames.ts
 *
 * 2.1.316 新增：市场命名
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5s0qaz1x.js (33), chunk-5xgkngpb.js (34), chunk-9h7kfbb1.js (1), chunk-rabv5nm0.js (2)
 * attribution: placement 70
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, resolve as resolve_2, relative, basename } from "path";
import { readdir, lstat } from "fs/promises";
import { BUILTIN } from "../telemetry/pluginTelemetry.js";
import { nfcLower } from "../stringUtils.js";
import {
  getPluginsDirectory,
  pluginIdToDirName,
  pluginDataDirPath,
  marketplaceCacheSpace,
  getMarketplaceStorageKey,
} from "./pluginDirectories.js";
import {
  isENOENT,
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../errors.js";
import { pathPresence } from "../fsSafety/atomicWriteStaging.js";
import { hasManagedSettings } from "../settings/managedRestrictionKeys.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { TENGU_STEADY_BITTERN } from "../../services/api/withRetry.js";
import { isRemoteManagedSettingsVerified } from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { quotedPrintable } from "../printableName.js";
import { claudeCommand } from "../worktreeResumeHint.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  OFFICIAL_MARKETPLACE_NAME,
  isOfficialMarketplaceSpelling,
  removeMarketplaceCommand,
  isFoldedSpellingOf,
} from "./officialMarketplaceNames.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import {
  seedDirFor,
  loadKnownMarketplacesWithDeclared,
  getCachePathForSource,
  validateReservedMarketplaceEntry,
  getStorageArm,
} from "./marketplaceManager.js";
import { isLocalMarketplaceSource, RESERVED_MARKETPLACE_NAMES } from "./schemas.js";
import { toComparablePath, isPathWithin as isPathWithin_2 } from "../fsJunctions.js";
import { isSubpathOf } from "../pathPrefix.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { normalizePathSegment } from "../pathSegments.js";
import { hasDotSegment } from "../pathClassification.js";
import { getPlatform } from "../platform.js";
import { isReservedDeviceName, isDosShortName } from "../windowsProfileFolders.js";
import { MarketplaceError } from "./marketplaceErrors.js";
import { jsonStringify } from "../slowOperations.js";
import {
  isSourceConsistentWith,
  getNonRepoExtraMarketplaces,
  hiddenRegistryEntryFor,
  hiddenRegistryEntries,
} from "./marketplaceSources.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { sorted } from "./marketplaceAutoUpdate.js";
import { logForDebugging } from "../debug.js";
import {
  removeDirectoryTreeNoFollow as removeDirectoryTreeNoFollow_2,
  removePathEntry,
} from "../fsRemove.js";
import { getFsImplementation } from "../fsOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-rabv5nm0.js:230-263 placement
var isOfficialMarketplaceRef = (reference) => reference.endsWith(`@${BUILTIN}`);
//@ chunk-rabv5nm0.js:263-339 placement
function hasSimilarMarketplaceName(pluginName, names) {
  let lowered = nfcLower(pluginName);
  return [...(names ?? [])].some((name) => !isOfficialMarketplaceRef(name) && nfcLower(name) === lowered);
}
//@ chunk-9h7kfbb1.js:231-264 placement
/**
 * 市场名防冒充：引用本身不是官方市场、但名字与提供者相近时返回 true。
 */
var hasSimilarMarketplaceRef = (pluginName, marketplaceName) =>
  !isOfficialMarketplaceRef(pluginName) && !hasSimilarMarketplaceName(pluginName, marketplaceName);
//@ chunk-5s0qaz1x.js:6815-7003 placement
/**
 * plugins/data 下大小写不敏感匹配插件的数据目录。
 */
async function findPluginDataDirs(pluginId) {
  let dataDir = join(getPluginsDirectory(), "data");
  let lower = pluginIdToDirName(pluginId).toLowerCase();
  try {
    return (await readdir(dataDir))
      .filter((entry) => entry.toLowerCase() === lower)
      .map((entry) => join(dataDir, entry));
  } catch (error) {
    return isENOENT(error) || getErrnoCode(error) === "ENOTDIR" ? [] : undefined;
  }
}
//@ chunk-5s0qaz1x.js:7003-7057 placement
async function isMarketplaceGone(pluginId) {
  return (await pathPresence(pluginDataDirPath(pluginId))) === "gone";
}
//@ chunk-5s0qaz1x.js:7057-7067 placement
var FLAG_SAFE_DEFAULT = true;
//@ chunk-5s0qaz1x.js:7067-7102 placement
/**
 * managedMarketplaceAnswerFlag：托管设置下的市场名答复开关。
 */
var managedMarketplaceAnswerFlag = () =>
  hasManagedSettings() &&
  readFlagWithOverride(TENGU_STEADY_BITTERN, {
    safe: FLAG_SAFE_DEFAULT,
  });
//@ chunk-5s0qaz1x.js:7102-7157 placement
/**
 * marketplaceNameAnswerState：市场名检查的答复状态。
 */
var marketplaceNameAnswerState = () =>
  managedMarketplaceAnswerFlag()
    ? isRemoteManagedSettingsVerified()
      ? "answered"
      : "unanswered"
    : "unasked";
//@ chunk-5s0qaz1x.js:7157-7403 placement
function reservedMarketplaceNameError(name) {
  if (impersonationCheckDisabled())
    return `Claude Code won't load marketplace "${quotedPrintable(name)}": its name looks like the name of one of Anthropic's own marketplaces`;
  return `Claude Code refuses the marketplace name "${quotedPrintable(name)}": it looks like one of Anthropic's own`;
}
//@ chunk-5s0qaz1x.js:7403-7473 placement
function marketplaceLoadFailedMessage(name, reason) {
  return `Failed to load marketplace "${quotedPrintable(name)}": ${reason}`;
}
//@ chunk-5s0qaz1x.js:7473-7497 placement
/**
 * impersonationCheckDisabled：恒 false（冒充检查占位）。
 */
function impersonationCheckDisabled() {
  return false;
}
//@ chunk-5s0qaz1x.js:7497-7507 placement
var MAX_MARKETPLACE_NAME_LOOSE = 64;
//@ chunk-5s0qaz1x.js:7507-7672 placement
function formatRemoveMarketplaceHint(name, label = "it") {
  let command =
    name.length <= MAX_MARKETPLACE_NAME_LOOSE ? claudeCommand("plugin marketplace remove", name) : null;
  return command === null
    ? `Remove ${label} in /plugin \u2192 Marketplaces`
    : `Remove ${label} with: ${command}`;
}
//@ chunk-5s0qaz1x.js:7672-8631 placement
/**
 * 删除/改名仿冒市场的各段说明文字。
 */
var REMOVE_ALSO_UNINSTALLS_NOTE =
  "this also uninstalls its plugins and deletes their data, options and secrets";
var RENAME_INSTEAD_NOTE = "if its maintainer renames it, update it instead";
var REMOVE_ONLY_FIX_LINES = [
  "Removing it is the only fix. That also uninstalls its plugins and deletes what they saved:",
  "their data, options and secrets.",
];
var READD_AFTER_REMOVE_NOTE =
  "After removing it, you can add it again from the same source; if that is refused, its maintainer has to rename it first.";
var SETTINGS_RENAME_STEPS = [
  "It was added from a settings file. To keep it, do these in order (if your organization's managed settings add it, an administrator does step 1):",
  "1. In each settings file that lists it under extraKnownMarketplaces, rename its entry (the key and its source.name) to a plain-ASCII name that doesn't look like one of Anthropic's.",
];
var REMOVE_ALSO_UNINSTALLS_PAREN =
  "(this also uninstalls its plugins and deletes their data, options and secrets).";
var RESTART_STEP =
  "3. Start Claude Code again, in that project's folder if it is a project's settings file, then install its plugins from the renamed one.";
//@ chunk-5s0qaz1x.js:8631-8694 placement
function renameMarketplaceSteps(name) {
  return [
    ...SETTINGS_RENAME_STEPS,
    `2. ${formatRemoveMarketplaceHint(name, "the old name")}`,
    REMOVE_ALSO_UNINSTALLS_PAREN,
    RESTART_STEP,
  ];
}
//@ chunk-5s0qaz1x.js:8694-8731 placement
function removeMarketplaceFixSteps(name) {
  return [...REMOVE_ONLY_FIX_LINES, READD_AFTER_REMOVE_NOTE, formatRemoveMarketplaceHint(name)];
}
//@ chunk-5s0qaz1x.js:8731-8941 placement
function marketplaceRemovalAdvice(name, options = {}) {
  if (options.declaredInSettings === true)
    return `Reloading won't help. ${renameMarketplaceSteps(name).join(" ")}`;
  if (impersonationCheckDisabled())
    return `Reloading won't help. ${removeMarketplaceFixSteps(name).join(" ")}`;
  return `Reloading won't help. ${formatRemoveMarketplaceHint(name)} (${REMOVE_ALSO_UNINSTALLS_NOTE}; ${RENAME_INSTEAD_NOTE})`;
}
//@ chunk-5s0qaz1x.js:8941-9357 placement
function reservedMarketplaceNameMessage(name, options = {}) {
  let impersonationDisabled = impersonationCheckDisabled();
  let lines = impersonationDisabled
    ? [
        `Claude Code won't load marketplace "${quotedPrintable(name)}":`,
        "its name looks like the name of one of Anthropic's own marketplaces. Reloading won't help.",
      ]
    : [
        `Claude Code refuses the marketplace name "${quotedPrintable(name)}":`,
        "it looks like one of Anthropic's own. Reloading won't help.",
      ];
  if (options.declaredInSettings === true) return [...lines, ...renameMarketplaceSteps(name)];
  if (impersonationDisabled) return [...lines, ...removeMarketplaceFixSteps(name)];
  return [
    ...lines,
    formatRemoveMarketplaceHint(name),
    `(${REMOVE_ALSO_UNINSTALLS_NOTE};`,
    `${RENAME_INSTEAD_NOTE}).`,
  ];
}
//@ chunk-5s0qaz1x.js:9357-9780 placement
/**
 * RESERVED_MARKETPLACE_RENAME_MESSAGE：保留名需改名的说明。
 */
var RESERVED_MARKETPLACE_NAME_MESSAGE =
  "Claude Code refuses this marketplace's name: it looks like one of Anthropic's own. Reloading won't help. Remove it in /plugin \u2192 Marketplaces (deletes its plugins and their data, options and secrets).";
var RESERVED_MARKETPLACE_RENAME_MESSAGE =
  "Claude Code refuses this marketplace's name: it looks like one of Anthropic's own. Rename it in its settings file, remove the old name in /plugin \u2192 Marketplaces (plugins and data go), then restart.";
//@ chunk-5s0qaz1x.js:9780-9812 placement
function reservedNameMessage(isRename) {
  return isRename ? RESERVED_MARKETPLACE_RENAME_MESSAGE : RESERVED_MARKETPLACE_NAME_MESSAGE;
}
//@ chunk-5s0qaz1x.js:9812-9912 placement
var formatOnlyWhileDisabledHint = (subject, heldBy) =>
  `${subject} only while "${quotedPrintable(heldBy)}" is disabled. Disable or uninstall the copy you don't need`;
//@ chunk-5s0qaz1x.js:9912-10304 placement
var MARKETPLACE_SOURCE_FIX_HINTS = {
  "network-location":
    "re-add the marketplace (one added from a folder or file must be re-added from a copy on this computer), or, to trust a folder on a network drive, declare it under extraKnownMarketplaces in user or managed settings",
  source: "re-add the marketplace with a supported source",
  declaration: "re-add the marketplace from the source that entry lists, or change the entry",
};
//@ chunk-5s0qaz1x.js:10304-10384 placement
/**
 * pluginAvailabilitySchema：插件可用性状态 schema。
 */
var PLUGIN_AVAILABILITY_STATES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var pluginAvailabilitySchema;
deferInit("chunk-5s0qaz1x.js:10304", () => {
  PLUGIN_AVAILABILITY_STATES = ["available", "required", "auto_install", "not_available"];
  pluginAvailabilitySchema = DoctorLazy(() => _enum(PLUGIN_AVAILABILITY_STATES));
});
//@ chunk-5s0qaz1x.js:10384-10431 placement
/**
 * parsePluginAvailability：解析插件可用性状态。
 */
function parsePluginAvailability(installationPreference) {
  return pluginAvailabilitySchema().safeParse(installationPreference).data;
}
//@ chunk-5s0qaz1x.js:10431-10565 placement
/**
 * pluginOriginSchema：插件来源种类 schema。
 */
var PLUGIN_ORIGIN_KINDS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var pluginOriginSchema;
deferInit("chunk-5s0qaz1x.js:10431", () => {
  PLUGIN_ORIGIN_KINDS = [
    "anthropic_catalog",
    "other_catalog",
    "account_uploads",
    "account_marketplace",
    "org_library",
    "org_marketplace",
  ];
  pluginOriginSchema = DoctorLazy(() => _enum(PLUGIN_ORIGIN_KINDS));
});
//@ chunk-5s0qaz1x.js:10565-10612 placement
/**
 * parsePluginOriginKind：解析插件来源种类。
 */
function parsePluginOriginKind(marketplaceKind) {
  return pluginOriginSchema().safeParse(marketplaceKind).data;
}
//@ chunk-5s0qaz1x.js:10612-11186 placement
function marketplaceListingChangedMessage(
  pluginId,
  directoryRenamedTo,
  directoryListsDifferentRepo,
  directoryNotInstallableReason,
  installedPluginsUnreadable = false,
) {
  {
    let printableId = quotedPrintable(pluginId);
    let what =
      directoryRenamedTo && directoryRenamedTo.length > 0
        ? `now lists it as ${directoryRenamedTo.map((name) => quotedPrintable(name)).join(" or ")}`
        : directoryNotInstallableReason !== undefined
          ? `still lists it, but Claude Code cannot install it (${quotedPrintable(directoryNotInstallableReason)})`
          : directoryListsDifferentRepo
            ? "now lists a different repository under that name"
            : installedPluginsUnreadable
              ? "does not list it (or your organization blocks it)"
              : "no longer lists it (removed, or blocked by your organization)";
    return installedPluginsUnreadable
      ? `Plugin "${printableId}" is not loaded: installed_plugins.json could not be read, so its install could not be checked, and the Anthropic Directory ${what}`
      : `Plugin "${printableId}" is not loaded: the Anthropic Directory ${what}`;
  }
  return "";
}
//@ chunk-5s0qaz1x.js:11186-11320 placement
function isMarketplaceLoadError(error) {
  return (
    error.type === "marketplace-load-failed" &&
    error.reason === "cache-miss" &&
    error.marketplace === OFFICIAL_MARKETPLACE_NAME &&
    error.directoryBlockedBy === undefined
  );
}
//@ chunk-5s0qaz1x.js:11320-11394 placement
var RELOAD_PLUGINS_HINT = `Run /reload-plugins, or: claude plugin marketplace update ${OFFICIAL_MARKETPLACE_NAME}`;
//@ chunk-5s0qaz1x.js:11394-11682 placement
function marketplaceNotFoundMessage(error) {
  if (
    error.type === "marketplace-not-found" &&
    error.marketplace !== OFFICIAL_MARKETPLACE_NAME &&
    isOfficialMarketplaceSpelling(error.marketplace) &&
    error.registrationHidden !== undefined
  ) {
    let command = removeMarketplaceCommand(error.marketplace);
    return command === null
      ? "Remove that entry from known_marketplaces.json, then uninstall this plugin if it is still listed"
      : `Remove it: ${command}`;
  }
  return;
}
//@ chunk-5s0qaz1x.js:11682-12133 placement
function policyBlockReason(reason) {
  switch (reason) {
    case "managed_setting":
      return "Your administrator turned it off with disablePluginDirectory in managed settings.";
    case "allowlist":
      return "Your administrator's marketplace allowlist (strictKnownMarketplaces) does not include the Anthropic Directory.";
    case "blocklist":
      return "Your administrator listed it in blockedMarketplaces in managed settings.";
    case "policy_limit":
      return "Your organization's policy does not allow it.";
  }
  return "";
}
//@ chunk-5s0qaz1x.js:12133-12318 placement
function pluginBlockSource(error) {
  if (error.directoryDisabledByOrganization) return "managed_setting";
  if (error.marketplace !== OFFICIAL_MARKETPLACE_NAME || error.sourceUnverifiable) return null;
  return error.blockedByBlocklist ? "blocklist" : "allowlist";
}
//@ chunk-5s0qaz1x.js:12318-12549 placement
function directoryBlockedMessage(pluginName, reason) {
  {
    let reasonText = policyBlockReason(reason);
    let head =
      pluginName === undefined
        ? "The Anthropic Directory is blocked by your organization"
        : `Plugin "${quotedPrintable(pluginName)}" is not loaded: the Anthropic Directory is blocked by your organization`;
    return reasonText === "" ? head : `${head}. ${reasonText}`;
  }
  return "";
}
//@ chunk-5s0qaz1x.js:12549-13362 placement
/**
 * PLUGIN_FAILURE_RETRYABLE：各插件失败码是否可重试。
 */
var NOT_RECORDED = "(not recorded)";
var PLUGIN_FAILURE_RETRYABLE = {
  "path-not-found": false,
  "path-traversal": false,
  "mcp-config-invalid": false,
  "lsp-config-invalid": false,
  "hook-load-failed": false,
  "component-load-failed": false,
  "mcpb-download-failed": false,
  "mcpb-extract-failed": false,
  "mcpb-invalid-manifest": false,
  "lsp-server-start-failed": false,
  "lsp-server-crashed": false,
  "lsp-request-timeout": false,
  "lsp-request-failed": false,
  "plugin-not-installed": false,
  "marketplace-blocked-by-policy": false,
  "autoupdate-blocked-by-pinner": false,
  "autoupdate-deferred-entry-helper": false,
  "autoupdate-disabled-by-policy": false,
  "plugin-cache-miss": true,
  "generic-error": true,
  "manifest-parse-error": true,
  "manifest-validation-error": true,
  "marketplace-not-found": true,
  "marketplace-load-failed": true,
  "plugin-not-found": true,
  "git-auth-failed": true,
  "git-timeout": true,
  "network-error": true,
  "dependency-unsatisfied": true,
  "dependency-version-unsatisfied": true,
};
//@ chunk-5s0qaz1x.js:13362-13963 placement
/**
 * 把插件加载错误（path-not-found、plugin-not-installed、marketplace-load-failed…）转成一行用户可读说明。
 */
function pluginErrorSummary(error) {
  if (error.type === "path-not-found") return error.plugin === undefined && error.errno !== undefined;
  if (error.type === "plugin-not-installed")
    return error.seedHasOtherVersion === true || error.registryReadFailed === true;
  if (error.type === "generic-error") return error.orphan !== true && error.refused !== true;
  if (error.type === "marketplace-load-failed")
    return (
      error.untrustedReservedName !== true &&
      error.nameRefused !== true &&
      error.directoryBlockedBy === undefined
    );
  if (error.type === "marketplace-not-found")
    return error.registrationHidden === undefined || error.registrationHidden === "network-location";
  if (error.type === "plugin-not-found")
    return error.removedFromDirectory !== true || error.registryReadFailed === true;
  return PLUGIN_FAILURE_RETRYABLE[error.type];
}
//@ chunk-5s0qaz1x.js:13963-14063 placement
function isDependencyError(error) {
  return error.type === "dependency-unsatisfied" || error.type === "dependency-version-unsatisfied";
}
//@ chunk-5xgkngpb.js:4331660-4331828 placement
function getSyntheticMarketplaceStorageKey(name, source, installLocation) {
  if (resolve_2(getOriginalCwd(), installLocation) !== join(getResolvedMarketplacesCacheDir(), name))
    return null;
  let kind = source?.source === "settings" ? "manifest" : source?.source === "url" ? "catalog" : null;
  return kind === null ? null : marketplaceCacheSpace(name, kind, getPluginsDirectory());
}
//@ chunk-5xgkngpb.js:4331828-4332039 placement
function getClonedMarketplaceStorageKey(name, source, installLocation) {
  if (
    (source?.source !== "github" && source?.source !== "git") ||
    installLocation !== join(getMarketplacesCacheDir(), name)
  )
    return null;
  let marketplaceStorageKey = getMarketplaceStorageKey(
    join(installLocation, ".claude-plugin", "marketplace.json"),
    getPluginsDirectory(),
  );
  return marketplaceStorageKey !== null &&
    "marketplace" in marketplaceStorageKey &&
    marketplaceStorageKey.marketplace === name
    ? marketplaceStorageKey
    : null;
}
//@ chunk-5xgkngpb.js:4332039-4332252 placement
/**
 * 市场在存储层的位置：种子目录（system）、本地来源（workspace）或存储键。
 */
function getMarketplaceStorageLocation(marketplaceName, source, installLocation) {
  if (seedDirFor(installLocation) !== undefined)
    return {
      kind: "hostFolder",
      space: "system",
    };
  if (source !== undefined && isLocalMarketplaceSource(source))
    return {
      kind: "hostFolder",
      space: "workspace",
    };
  let storageKey =
    getSyntheticMarketplaceStorageKey(marketplaceName, source, installLocation) ??
    getClonedMarketplaceStorageKey(marketplaceName, source, installLocation);
  return storageKey === null
    ? null
    : {
        kind: "key",
        key: storageKey,
      };
}
//@ chunk-5xgkngpb.js:4332252-4332298 placement (2.1.88 match: getMarketplacesCacheDir, 1)
function getMarketplacesCacheDir() {
  return join(getPluginsDirectory(), "marketplaces");
}
//@ chunk-5xgkngpb.js:4332298-4332335 placement
/**
 * 市场缓存目录的绝对路径（相对当前工作目录解析）。
 */
function getResolvedMarketplacesCacheDir() {
  return resolve_2(getOriginalCwd(), getMarketplacesCacheDir());
}
//@ chunk-5xgkngpb.js:4332335-4332538 placement
function comparePathContainment(rootPath, targetPath, basePath) {
  let comparablePath = toComparablePath(targetPath, {
    foldCase: true,
    knownNotSuspect: true,
  });
  let comparablePath_2 = toComparablePath(rootPath, {
    foldCase: true,
  });
  let comparableBase =
    basePath === rootPath
      ? comparablePath_2
      : toComparablePath(basePath, {
          foldCase: true,
        });
  if (comparablePath === comparableBase) return "same";
  return comparablePath !== comparablePath_2 &&
    isPathWithin_2(comparablePath_2, comparablePath, {
      alreadyComparable: true,
    })
    ? "inside"
    : "outside";
}
//@ chunk-5xgkngpb.js:4332538-4333064 placement (2.1.88 match: setCwdState, 0.793)
async function checkMarketplaceDirCollision(rootPath, installPath, name, storageV5, known) {
  let relativePath = relative(rootPath, installPath);
  let plainSegment = isSubpathOf(rootPath, installPath, false) ? relativePath.split(/[\\/]/)[0] : undefined;
  let comparableSegment = relative(
    toComparablePath(rootPath),
    toComparablePath(installPath, {
      knownNotSuspect: true,
    }),
  ).split(/[\\/]/)[0];
  let segments = normalizeCaseForComparison_2(
    [plainSegment, comparableSegment].filter(
      (segment) => segment !== undefined && segment !== "" && segment !== "..",
    ),
  );
  if (segments.length === 0) return;
  let knownMarketplaces = known ?? (await loadKnownMarketplacesWithDeclared(storageV5));
  let normalized = name.normalize("NFC");
  let isSelf = (candidate) => candidate.normalize("NFC") === normalized;
  let filtered = listMarketplaceNames(knownMarketplaces, storageV5).filter((candidate) => !isSelf(candidate));
  let candidateFolders = marketplaceDirCandidates(knownMarketplaces, storageV5, rootPath);
  for (let segment of segments) {
    let owner = findByMarketplaceName(segment, filtered, candidateFolders);
    if (owner !== undefined) return owner;
  }
  for (let segment of segments) {
    let dangling = await hasDanglingSymlinkAncestor(rootPath, segment);
    let owner =
      dangling === undefined
        ? undefined
        : await getFileIdentity_7(rootPath, segment, dangling, filtered, candidateFolders);
    if (owner !== undefined) return owner;
  }
  return;
}
//@ chunk-5xgkngpb.js:4333064-4333225 placement
function isValidMarketplaceDirName(name) {
  if (normalizePathSegment(name) === ".git") return false;
  return !(
    name === "" ||
    name !== basename(name) ||
    /[\\/]/.test(name) ||
    hasDotSegment(name) ||
    (getPlatform() === "windows" &&
      (/[. ]$/.test(name) || name.includes(":") || isReservedDeviceName(name) || isDosShortName(name)))
  );
}
//@ chunk-5xgkngpb.js:4333225-4333556 placement
async function assertMarketplaceNameNotCaseFolded(installPath, name, storageV5, { known, selfKey, source }) {
  let isSelf = sameNfcAs(name, selfKey);
  let { owner, known: known_2 } = await findMarketplaceNameOwner(installPath, name, storageV5, {
    known,
    isSelf,
  });
  if (owner !== undefined)
    throw new MarketplaceError(
      formatNameCollisionMessage(name, owner),
      "marketplace name case-folds onto a registered marketplace directory",
      {
        kind: "name_taken",
        name: owner,
        ...(isOtherSameMarketplaceName(name, owner) && {
          requested: name,
        }),
      },
    );
  await assertMarketplaceNameUsable(installPath, name, storageV5, {
    known: known_2,
    isSelf,
    source,
  });
}
//@ chunk-5xgkngpb.js:4333556-4334153 placement
async function assertMarketplaceNameUsable(dirPath, name, storageV5, { known, isSelf, source }) {
  let marketplaceSourceRank = findMarketplaceSourceRank(name, source);
  if (
    marketplaceSourceRank !== undefined &&
    marketplaceSourceRank <= (findMarketplaceRepoRank(name, source) ?? 1 / 0)
  )
    return;
  let knownMarketplaces = known ?? (await loadKnownMarketplacesWithDeclared(storageV5));
  let marketplaceDirOwner = findMarketplaceDirOwner(
    name,
    dirPath,
    knownMarketplaces,
    storageV5,
    (candidate) =>
      isSelf(candidate) || isSameGithubMarketplace(candidate, knownMarketplaces, source, storageV5),
  );
  if (marketplaceDirOwner !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Can't use the marketplace name ${jsonStringify(name)}: the registered marketplace ${jsonStringify(marketplaceDirOwner.owner)} downloads from GitHub into the folder ${jsonStringify(marketplaceDirOwner.folder)}${marketplaceDirOwner.backup ? ` and moves it to ${jsonStringify(`${marketplaceDirOwner.folder}.bak`)} while it downloads again` : ""}, so a marketplace named ${jsonStringify(name)} would stop ${jsonStringify(marketplaceDirOwner.owner)} from downloading. Ask the author of ${jsonStringify(name)} to rename it.`,
      "marketplace name is the clone folder of a registered marketplace",
    );
}
//@ chunk-5xgkngpb.js:4334153-4334283 placement
function findMarketplaceSourceRank(name, candidate) {
  return findMarketplaceSourceIndex(
    (entryName, entry) =>
      sameMarketplaceName(entryName, name) &&
      entry?.source?.source === candidate.source &&
      (candidate.source === "github"
        ? isSourceConsistentWith(candidate, entry.source)
        : import_sortedIndex_2(candidate, entry.source)),
  );
}
//@ chunk-5xgkngpb.js:4334283-4334538 placement
function findMarketplaceRepoRank(name, source) {
  let repo = source.source === "github" ? source.repo.toLowerCase() : undefined;
  return findMarketplaceSourceIndex((entryName, entry) => {
    if (
      entry?.source?.source !== "github" ||
      typeof entry.source.repo !== "string" ||
      entry.source.repo.toLowerCase() === repo
    )
      return false;
    let cachePathForSource = getCachePathForSource(entry.source);
    return (
      sameMarketplaceName(cachePathForSource, name) || sameMarketplaceName(`${cachePathForSource}.bak`, name)
    );
  });
}
//@ chunk-5xgkngpb.js:4334538-4334701 placement
function findMarketplaceSourceIndex(predicate) {
  let extrasBySource = new Map(getNonRepoExtraMarketplaces().map((item) => [item.source, item.extras]));
  let index = sorted.findIndex((source) =>
    Object.entries(extrasBySource.get(source) ?? {}).some(([key, value]) => predicate(key, value)),
  );
  return index === -1 ? undefined : index;
}
//@ chunk-5xgkngpb.js:4334701-4334858 placement
function githubRepoDirName(name, marketplaceEntry) {
  return marketplaceEntry?.source?.source === "github" &&
    typeof marketplaceEntry.source.repo === "string" &&
    seedDirFor(marketplaceEntry.installLocation) === undefined &&
    validateReservedMarketplaceEntry(name, marketplaceEntry) === null
    ? getCachePathForSource(marketplaceEntry.source)
    : undefined;
}
//@ chunk-5xgkngpb.js:4334858-4335329 placement
function findMarketplaceDirOwner(dirName, cacheDirPath, known, storageV5, isSelf) {
  for (let reservedName of RESERVED_MARKETPLACE_NAMES) if (isFoldedSpellingOf(dirName, reservedName)) return;
  let names = listMarketplaceNames(known, storageV5);
  let filtered = names.filter((name) => !isSelf(name));
  for (let isBackup of [false, true]) {
    let owner = findByMarketplaceName(dirName, filtered, (entryName) => {
      let dirName = githubRepoDirName(entryName, getMarketplaceEntry(known, entryName, storageV5));
      return dirName === undefined ? [] : [isBackup ? `${dirName}.bak` : dirName];
    });
    if (owner === undefined) continue;
    let marketplaceEntry = getMarketplaceEntry(known, owner, storageV5);
    let ownerDir = githubRepoDirName(owner, marketplaceEntry);
    let candidateFolders = marketplaceDirCandidates(known, storageV5, cacheDirPath);
    let any = names.some((otherName) => {
      let marketplaceEntry_2 = getMarketplaceEntry(known, otherName, storageV5);
      return (
        marketplaceEntry_2 !== undefined &&
        !isLocalMarketplaceSource(marketplaceEntry_2.source) &&
        !(
          marketplaceEntry !== undefined &&
          isSameGithubMarketplace(otherName, known, marketplaceEntry.source, storageV5)
        ) &&
        findByMarketplaceName(dirName, [otherName], candidateFolders) !== undefined
      );
    });
    return ownerDir === undefined || any
      ? undefined
      : {
          owner,
          folder: ownerDir,
          backup: isBackup,
        };
  }
  return;
}
//@ chunk-5xgkngpb.js:4335329-4335370 placement
function isOtherSameMarketplaceName(name, otherName) {
  return name !== otherName && sameMarketplaceName(name, otherName);
}
//@ chunk-5xgkngpb.js:4335370-4335452 placement (2.1.88 match: setCwdState, 1)
function sameNfcAs(name, selfKey) {
  let normalized = (selfKey ?? name).normalize("NFC");
  return (candidate) => candidate.normalize("NFC") === normalized;
}
//@ chunk-5xgkngpb.js:4335452-4335604 placement
async function assertMarketplaceNameAvailable(
  cacheDir,
  name,
  storageV5,
  { ownEntry, known, selfKey, source },
) {
  await assertMarketplaceNameNotCaseFolded(cacheDir, name, storageV5, {
    known,
    selfKey,
    source,
  });
  await assertMarketplaceDirFree(cacheDir, name, storageV5, {
    ownEntry,
    selfKey,
  });
}
//@ chunk-5xgkngpb.js:4335604-4336136 placement
async function assertMarketplaceDirFree(cacheDir, name, storageV5, { knownAlready, ownEntry, selfKey } = {}) {
  let dirCollisionInCache = await findDirCollisionInCache(cacheDir, name, ownEntry);
  if (dirCollisionInCache === undefined) return;
  let known = knownAlready ?? (await loadKnownMarketplacesWithDeclared(storageV5));
  let isSelf = sameNfcAs(name, selfKey);
  let names = listMarketplaceNames(known, storageV5);
  let candidateFolders = marketplaceDirCandidates(known, storageV5, cacheDir);
  if (findByMarketplaceName(dirCollisionInCache, names.filter(isSelf), candidateFolders) !== undefined)
    return;
  let owner = findByMarketplaceName(
    dirCollisionInCache,
    names.filter((name) => !isSelf(name)),
    candidateFolders,
  );
  if (owner !== undefined)
    throw new MarketplaceError(
      formatNameCollisionMessage(name, owner),
      "marketplace name case-folds onto a registered sibling",
      {
        kind: "name_taken",
        name: owner,
        ...(isOtherSameMarketplaceName(name, owner) && {
          requested: name,
        }),
      },
    );
  logForDebugging(
    `Clearing stale case-variant marketplace directory ${jsonStringify(dirCollisionInCache)} (unregistered) before publishing ${jsonStringify(name)}`,
    {
      level: "warn",
    },
  );
  await removeDirectoryTreeNoFollow_2(join(cacheDir, dirCollisionInCache));
}
//@ chunk-5xgkngpb.js:4336136-4336406 placement
async function findMarketplaceNameOwner(cacheDir, name, storageV5, { known, isSelf = () => false } = {}) {
  let dangling = await hasDanglingSymlinkAncestor(cacheDir, name);
  if (dangling === undefined && known === undefined)
    return {
      owner: undefined,
      known,
    };
  let knownMarketplaces = known ?? (await loadKnownMarketplacesWithDeclared(storageV5));
  let filtered = listMarketplaceNames(knownMarketplaces, storageV5).filter(
    (name) => !isSelf(name, knownMarketplaces),
  );
  let candidateFolders = marketplaceDirCandidates(knownMarketplaces, storageV5, cacheDir);
  return {
    owner:
      findByMarketplaceName(name, filtered, candidateFolders) ??
      (dangling === undefined
        ? undefined
        : await getFileIdentity_7(cacheDir, name, dangling, filtered, candidateFolders)),
    known: knownMarketplaces,
  };
}
//@ chunk-5xgkngpb.js:4336406-4336465 placement
function getMarketplaceEntry(known, name, storageV5) {
  return Object.hasOwn(known, name) ? known[name] : hiddenRegistryEntryFor(name, storageV5);
}
//@ chunk-5xgkngpb.js:4336465-4336746 placement
function marketplaceDirCandidates(known, storageV5, cacheDir) {
  return (name) => {
    let candidates = [name, `${name}.json`, `${name}.bak`];
    let marketplaceEntry = getMarketplaceEntry(known, name, storageV5);
    if (marketplaceEntry !== undefined && typeof marketplaceEntry.installLocation === "string") {
      let absolute = resolve_2(getOriginalCwd(), marketplaceEntry.installLocation);
      let relativePath = relative(cacheDir, absolute);
      let headSegment = isSubpathOf(cacheDir, absolute, false) ? relativePath.split(/[\\/]/)[0] : undefined;
      if (
        headSegment !== undefined &&
        isValidMarketplaceDirName(headSegment) &&
        !candidates.includes(headSegment)
      )
        candidates.push(headSegment, `${headSegment}.bak`);
    }
    return candidates;
  };
}
//@ chunk-5xgkngpb.js:4336746-4336810 placement
function findByMarketplaceName(name, names, candidatesFor) {
  return names.find((candidateName) =>
    candidatesFor(candidateName).some((candidate) => sameMarketplaceName(candidate, name)),
  );
}
//@ chunk-5xgkngpb.js:4336810-4336902 placement (2.1.88 match: setCwdState, 1)
function sameMarketplaceName(left, right) {
  let normalized = left.normalize("NFC");
  let normalized_2 = right.normalize("NFC");
  return (
    normalized === normalized_2 || normalizePathSegment(normalized) === normalizePathSegment(normalized_2)
  );
}
//@ chunk-5xgkngpb.js:4336902-4336979 placement
function listMarketplaceNames(known, storageV5) {
  return [...Object.keys(known), ...hiddenRegistryEntries()[getStorageArm(storageV5)].keys()].filter(
    isValidMarketplaceDirName,
  );
}
//@ chunk-5xgkngpb.js:4336979-4337474 placement
/**
 * 检查克隆目录名是否落到另一个已注册市场的目录上：是则抛错（让用户先删除或改名）； 否则再按“非同一 github 仓库”查一次，返回是否存在冲突。
 */
async function checkCloneDirOwnedByOther(cacheDir, tempName, source, storageV5) {
  let { owner, known } = await findMarketplaceNameOwner(cacheDir, tempName, storageV5, {
    isSelf: (name, known) => isSameGithubMarketplace(name, known, source, storageV5),
  });
  if (owner !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Cannot fetch this marketplace: its clone directory name ${jsonStringify(tempName)} is the registered marketplace ${jsonStringify(owner)}'s directory. Remove or rename that marketplace first (claude plugin marketplace remove).`,
      "marketplace clone target is another registered marketplace directory",
    );
  if (known === undefined) return false;
  let { owner: owner_2 } = await findMarketplaceNameOwner(cacheDir, tempName, storageV5, {
    known,
    isSelf: (name, known) => !isSameGithubMarketplace(name, known, source, storageV5),
  });
  return owner_2 !== undefined;
}
//@ chunk-5xgkngpb.js:4337474-4337632 placement
function isSameGithubMarketplace(name, known, source, storageV5) {
  let marketplaceEntry = getMarketplaceEntry(known, name, storageV5);
  return (
    marketplaceEntry !== undefined &&
    marketplaceEntry.source.source === "github" &&
    source.source === "github" &&
    marketplaceEntry.source.repo.toLowerCase() === source.repo.toLowerCase()
  );
}
//@ chunk-5xgkngpb.js:4337632-4338017 placement
/**
 * 两个市场名折叠到同一 marketplaces/ 目录、拒绝发布的提示。
 */
function formatNameCollisionMessage(name, owner) {
  return `Marketplace name ${jsonStringify(name)} collides with the registered marketplace ${jsonStringify(owner)}: the two names fold onto one marketplaces/ entry (the same key up to letter case and filesystem-ignorable characters, or the same directory on this filesystem); refusing to publish over it. Remove that marketplace first (claude plugin marketplace remove), or ask the author to rename.`;
}
//@ chunk-5xgkngpb.js:4338017-4338199 placement
async function findDirCollisionInCache(cacheDir, name, ownEntry) {
  let entries;
  try {
    entries = (await getFsImplementation().readdir(cacheDir)).map((entry) => entry.name);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return;
    throw error;
  }
  return findSameDirAmong(
    cacheDir,
    name,
    entries.filter((entry) => entry !== ownEntry),
  );
}
//@ chunk-5xgkngpb.js:4338199-4338330 placement
async function findSameDirIdentity(rootPath, name, candidates, storageV5) {
  let filtered = candidates.filter(isValidMarketplaceDirName);
  if (filtered.length === 0) return;
  let dangling = await hasDanglingSymlinkAncestor(rootPath, name);
  return dangling === undefined
    ? undefined
    : getFileIdentity_7(rootPath, name, dangling, filtered, storageV5);
}
//@ chunk-5xgkngpb.js:4338330-4338445 placement
async function findSameDirAmong(cacheDir, name, candidates) {
  if (!candidates.some((candidate) => candidate !== name)) return;
  let dangling = await hasDanglingSymlinkAncestor(cacheDir, name);
  return dangling === undefined ? undefined : getFileIdentity_7(cacheDir, name, dangling, candidates);
}
//@ chunk-5xgkngpb.js:4338445-4338578 placement (2.1.88 match: isRealPathWithinTeamDir, 0.772)
async function hasDanglingSymlinkAncestor(cacheDir, name) {
  try {
    return await lstat(join(cacheDir, name), {
      bigint: true,
    });
  } catch (e) {
    let code = getErrnoCode(e);
    if (code === "ENOENT" || code === "ENOTDIR") return;
    throw e;
  }
}
//@ chunk-5xgkngpb.js:4338578-4338875 placement (2.1.88 match: getFileIdentity, 0.776)
async function getFileIdentity_7(
  cacheDir,
  name,
  probeStat,
  candidateNames,
  namesOf = (candidate) => [candidate],
) {
  for (let otherName of candidateNames) {
    if (otherName === name) continue;
    for (let candidateName of namesOf(otherName)) {
      if (candidateName === name) continue;
      try {
        let stats = await lstat(join(cacheDir, candidateName), {
          bigint: true,
        });
        if (
          probeStat.ino !== 0n && stats.ino !== 0n
            ? stats.dev === probeStat.dev && stats.ino === probeStat.ino
            : normalizePathSegment(candidateName) === normalizePathSegment(name)
        )
          return otherName;
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR") throw error;
      }
    }
  }
  return;
}
//@ chunk-5xgkngpb.js:4338875-4339446 placement
/**
 * 删除市场缓存（目录、.bak 目录与 .json 文件）；名字不是普通目录名时跳过； 若这些路径在本文件系统上其实是另一个已注册市场的目录则不删并记 warn。
 */
async function removeMarketplaceCacheFiles(name, names, candidatesFor) {
  if (!isValidMarketplaceDirName(name)) {
    logForDebugging(
      `Not removing cache files for marketplace name ${jsonStringify(name)}: not a plain directory name`,
      {
        level: "warn",
      },
    );
    return;
  }
  let resolvedMarketplacesCacheDir = getResolvedMarketplacesCacheDir();
  let dirPath = join(resolvedMarketplacesCacheDir, name);
  let ownerOf = async (candidate) =>
    findByMarketplaceName(candidate, names, candidatesFor) ??
    (await findSameDirIdentity(resolvedMarketplacesCacheDir, candidate, names, candidatesFor)) ??
    (await findDirCollisionInCache(resolvedMarketplacesCacheDir, candidate).then((dirCollisionInCache) =>
      dirCollisionInCache === undefined
        ? undefined
        : findByMarketplaceName(dirCollisionInCache, names, candidatesFor),
    ));
  let owner = await ownerOf(name);
  if (owner !== undefined) {
    logForDebugging(
      `Not removing cache files for marketplace ${jsonStringify(name)}: on this filesystem they are the registered marketplace ${jsonStringify(owner)}'s directory`,
      {
        level: "warn",
      },
    );
    return;
  }
  await removeDirectoryTreeNoFollow_2(dirPath);
  if ((await ownerOf(`${name}.bak`)) === undefined) await removeDirectoryTreeNoFollow_2(`${dirPath}.bak`);
  if ((await ownerOf(`${name}.json`)) === undefined)
    await removePathEntry(join(resolvedMarketplacesCacheDir, `${name}.json`));
}
export {
  isOfficialMarketplaceRef,
  hasSimilarMarketplaceRef,
  marketplaceNameAnswerState,
  pluginErrorSummary,
  getResolvedMarketplacesCacheDir,
  NOT_RECORDED,
  findMarketplaceNameOwner,
  isValidMarketplaceDirName,
  assertMarketplaceNameAvailable,
  checkCloneDirOwnedByOther,
  assertMarketplaceNameUsable,
  sameNfcAs,
  marketplaceDirCandidates,
  findByMarketplaceName,
  isSameGithubMarketplace,
  getSyntheticMarketplaceStorageKey,
  comparePathContainment,
  checkMarketplaceDirCollision,
  listMarketplaceNames,
  removeMarketplaceCacheFiles,
  impersonationCheckDisabled,
  reservedNameMessage,
  marketplaceLoadFailedMessage,
  getMarketplaceStorageLocation,
  RESERVED_MARKETPLACE_NAME_MESSAGE,
  marketplaceListingChangedMessage,
  MARKETPLACE_SOURCE_FIX_HINTS,
  directoryBlockedMessage,
  isMarketplaceLoadError,
  reservedMarketplaceNameError,
  pluginBlockSource,
  formatOnlyWhileDisabledHint,
  pluginAvailabilitySchema,
  pluginOriginSchema,
  parsePluginAvailability,
  parsePluginOriginKind,
  policyBlockReason,
  managedMarketplaceAnswerFlag,
  findPluginDataDirs,
  isMarketplaceGone,
  marketplaceRemovalAdvice,
  isDependencyError,
  reservedMarketplaceNameMessage,
  RELOAD_PLUGINS_HINT,
  marketplaceNotFoundMessage,
  hasSimilarMarketplaceName,
};
