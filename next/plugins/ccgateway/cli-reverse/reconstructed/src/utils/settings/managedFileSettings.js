/**
 * utils/settings/managedFileSettings.ts
 *
 * 2.1.316 新增：合并托管设置层并收集错误；应用托管设置覆盖并记录等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z20c443b.js (39)
 * attribution: placement 39
 */
import { sep, join, resolve } from "path";
import { coerceToPlainString, cleanForDisplay } from "../stringUtils.js";
import {
  FORCE_LOGIN_SETTING_KEYS,
  SettingsCacheStore,
  classifyConfigDirOwnership,
} from "../../bootstrap/stateSlices.js";
import { pickAlias, import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  restrictiveTopLevelSettings,
  restrictiveNestedSettingsMap,
  buildPolicyTolerantSettingsSchema,
  RESTRICTIVE_TOP_LEVEL_SETTINGS,
  isRestrictiveDisable,
  isRestrictiveNestedPath,
} from "./types.js";
import {
  authoredPolicyContent,
  mergeAdminPolicies,
  hasEffectivePolicyContent,
  MERGEABLE_POLICY_KEYS_2,
  adminAuthoredPolicy,
  adminDocumentPresent,
  combinedLoadState,
  isPolicyTier,
  loadStateOf,
  hasPolicyContent,
  explainedPolicyChange,
  documentHasPolicyContent,
} from "./policySettings.js";
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { logForDebugging } from "../debug.js";
import { logError } from "../log.js";
import { restrictionsOfUnvouchedDocument } from "../../services/remoteManagedSettings/unvouchedRestrictions.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { getPlatform } from "../platform.js";
import { isWslEnvironment, SETTING_ALIASES } from "./marketplaceSettingsAliases.js";
import { identity as identity_2 } from "../identity.js";
import { WSL_MANAGED_SETTINGS_DIR, WSL_REG_EXE_PATH } from "./mdm/wslRegistry.js";
import {
  getManagedFilePath,
  anyAccountCouldWrite,
  probeWritabilitySync,
  resolveManagedPathSafely,
} from "./managedPath.js";
import { getAtPath } from "./managedRestrictionKeys.js";
import { matchesManagedKey_2 } from "./managedEnvKeys.js";
import { mergeWithAssigner_2 } from "../../../vendor/lodash-es/_mergeWithFamily.js";
import { settingsMergeCustomizer, parseSettingsFileUncached } from "./settings.js";
import { resolvePathStepsSync } from "../../services/mcp/managedMcpPolicy.js";
import { getFsImplementation } from "../fsOperations.js";
import { getErrnoCode, isENOENT } from "../errors.js";
import {
  unreadableSettingsFileError,
  logMissingSettingsFile,
  mdmPolicyErrors,
} from "./settingsFileParsing.js";
import { clone } from "../slowOperations.js";
import { validateSettingsDocument } from "./hooksValidation.js";
import { formatZodError } from "./validation.js";
import { isSdkEntrypoint } from "../entrypointKinds.js";
import {
  getRemoteManagedSettingsSyncFromCache,
  unverifiedRemoteCacheWithholdsProvisions,
} from "../../services/remoteManagedSettings/remoteSettingsCache.js";
import {
  getLastLoadStatus,
  isProjectedSnapshot,
} from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { serializeSettingsErrors } from "../fileStateCache.js";
import { parseCommandOutputAsSettings } from "./mdm/settings.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:455605-455952 placement
/**
 * 描述无效设置值（截断显示）。
 */
function describeInvalidValues(errors) {
  return errors.map((error) => {
    let { invalidValue } = error;
    let hasValue = invalidValue !== undefined && invalidValue !== null;
    let str = hasValue ? coerceToPlainString(invalidValue) : undefined;
    let cleaned = str === undefined ? undefined : cleanForDisplay(str);
    return {
      ...error,
      path: cleanForDisplay(error.path),
      message: cleanForDisplay(error.message),
      ...(error.expected !== undefined && {
        expected: cleanForDisplay(error.expected),
      }),
      ...(error.suggestion !== undefined && {
        suggestion: cleanForDisplay(error.suggestion),
      }),
      ...(hasValue &&
        (str === undefined || typeof invalidValue === "string" || cleaned !== str) && {
          invalidValue: cleaned,
        }),
    };
  });
}
//@ chunk-z20c443b.js:455952-457716 placement
function loadManagedFileSettings(context) {
  if (context.diskless)
    return {
      settings: null,
      errors: [],
      documentHasPolicyContent: false,
      loadState: "absent",
    };
  let asksOrg;
  let isGateActive = (gate) => {
    if (gate === alwaysTrue) return true;
    asksOrg ??= context.asksOrganization?.() === true;
    return asksOrg && gate();
  };
  let held = false;
  let restricted = {};
  let pins = new Set();
  let managedFileTiers = loadManagedFileTiers(context, (tier, index, gate) => {
    if (tier.settings === null) {
      if (!isGateActive(gate)) return tier;
      FORCE_LOGIN_SETTING_KEYS.forEach((key) => pins.add(key));
      return {
        ...tier,
        errors: describeInvalidValues(tier.errors),
      };
    }
    if (!isGateActive(gate)) {
      Object.assign(restricted, pickAlias(tier.settings, restrictiveTopLevelSettings));
      return tier;
    }
    held = true;
    return {
      ...tier,
      settings: {},
      errors: describeInvalidValues(tier.errors),
    };
  });
  if (!held)
    return pins.size === 0
      ? managedFileTiers
      : {
          ...managedFileTiers,
          lostSignInPins: [...pins],
        };
  let overrides = [];
  let extraErrors = [];
  let managedFileTiers_2 = loadManagedFileTiers(context, (tier, index, gate) => {
    if (tier.settings === null || !isGateActive(gate))
      return {
        ...tier,
        settings: tier.settings && {},
        errors: [],
      };
    let overridden = applyManagedOverrides(tier, tier.settings, index);
    for (let key of FORCE_LOGIN_SETTING_KEYS)
      if (tier.settings[key] !== undefined && overridden.settings?.[key] === undefined) pins.add(key);
    overrides.push([index, Object.keys(overridden.settings ?? {})]);
    extraErrors.push(...overridden.errors.slice(tier.errors.length));
    return overridden;
  });
  let errors = [...managedFileTiers.errors, ...extraErrors];
  let settings = managedFileTiers.settings ?? {};
  let settings_2 = managedFileTiers_2.settings ?? {};
  let heldOnly = !authoredPolicyContent({
    ...managedFileTiers,
    settings,
  }) && {
    heldOnly: true,
  };
  if (Object.keys(settings_2).length === 0)
    return {
      ...managedFileTiers,
      errors,
      ...heldOnly,
      lostSignInPins: [...pins],
    };
  let noneBefore = Object.keys(settings).length === 0;
  let merged = {
    ...(noneBefore
      ? settings_2
      : omitAlias(
          mergeAdminPolicies([settings, settings_2], "merge", false, 0).admin,
          "parentSettingsBehavior",
        )),
    ...pickAlias(settings, "parentSettingsBehavior"),
    ...restricted,
  };
  let mergedRef = merged;
  let prior = settings;
  for (let [file, keys] of overrides)
    for (let key of keys)
      if (key in prior && import_sortedIndex_2(mergedRef[key], prior[key]))
        errors.push({
          file,
          path: cleanForDisplay(key),
          message: `In a cloud session that takes its managed settings from your organization, a managed settings file may only restrict: "${cleanForDisplay(key)}" was ignored in ${cleanForDisplay(file)}, since another managed settings document sets it and this one adds nothing to it.`,
          severity: "warning",
          statusOnly: true,
          userWritable: true,
        });
  return {
    ...(noneBefore ? managedFileTiers_2 : managedFileTiers),
    settings: merged,
    errors,
    ...heldOnly,
    lostSignInPins: [...pins],
    ...(!hasEffectivePolicyContent(settings) && {
      onlyHeldContent: true,
    }),
    settingsNotHeld: settings,
    heldOffPlugins: Object.keys(settings_2.enabledPlugins ?? {}).filter(
      (key) => settings.enabledPlugins?.[key] === undefined,
    ),
    heldAllowLists: MERGEABLE_POLICY_KEYS_2.filter(
      (key) => settings_2[key] !== undefined && settings[key] === undefined,
    ),
  };
}
//@ chunk-z20c443b.js:457716-458039 placement
function heldOffPluginIds(settingsContext) {
  let heldOffPlugins = settingsContext.store.policy.heldOffPlugins;
  if (heldOffPlugins !== undefined) return heldOffPlugins;
  let heldOff = [];
  if (settingsContext.asksOrganization?.() === true) {
    let file = settingsContext.file?.() ?? loadManagedFileSettings(settingsContext);
    let documents = [
      parseRemoteManagedSettings(settingsContext)?.settings?.enabledPlugins,
      settingsContext.mdm?.()?.settings?.enabledPlugins,
    ];
    heldOff = (file.heldOffPlugins ?? []).filter((id) => documents.every((map) => map?.[id] === undefined));
  }
  settingsContext.store.policy.heldOffPlugins = heldOff;
  return heldOff;
}
//@ chunk-z20c443b.js:458039-458444 placement
function allowListEntriesThatVouch(context, entries) {
  if (entries === undefined || entries.length === 0) return entries;
  try {
    let { policy } = context.store;
    if (policy.vouchingAllowList === undefined) {
      let value = heldOrganizationDocument(context);
      policy.vouchingAllowList = {
        value,
      };
    }
    let vouchers = policy.vouchingAllowList.value;
    return vouchers === null
      ? entries
      : entries.filter((entry) => vouchers.some((voucher) => import_sortedIndex_2(voucher, entry)));
  } catch (error) {
    context.store.policy.vouchingAllowList = {
      value: [],
    };
    logForDebugging("marketplace allow-list: which entries vouch could not be told; none does", {
      level: "error",
    });
    logError(error);
    return [];
  }
}
//@ chunk-z20c443b.js:458444-458757 placement
/**
 * 等待组织确认的托管文件设置。
 */
function heldOrganizationDocument(context) {
  if (context.asksOrganization?.() !== true) return null;
  let file = context.file?.() ?? loadManagedFileSettings(context);
  if (file.settings === null || file.heldAllowLists?.includes("strictKnownMarketplaces") !== true)
    return null;
  let settings = omitAlias(file.settings, "strictKnownMarketplaces");
  return (
    adminAuthoredPolicy({
      ...context,
      store: new SettingsCacheStore(),
      file: () => ({
        ...file,
        settings,
      }),
    })?.strictKnownMarketplaces ?? []
  );
}
//@ chunk-z20c443b.js:458757-459405 placement
/**
 * 应用托管设置覆盖并记录。
 */
function applyManagedOverrides(tier, settings, file) {
  let restrictions = restrictionsOfUnvouchedDocument(settings);
  let mapped = describeManagedOverrides(settings, restrictions).map((override) => ({
    ...override,
    key: cleanForDisplay(override.key),
  }));
  if (mapped.length === 0) return tier;
  if (!managedSettingsReadSeen.has(file)) {
    managedSettingsReadSeen.add(file);
    logForDebugging(
      `${cleanForDisplay(file)}: not taken as written: ${mapped
        .map(({ key }) => key)
        .join(
          ", ",
        )}: this session takes its managed settings from its organization, and a managed settings file may only restrict there`,
      {
        level: "warn",
      },
    );
  }
  return {
    ...tier,
    settings: restrictions,
    errors: [
      ...tier.errors,
      ...mapped
        .filter(({ key }) => !isInertManagedMcpServersNotice(key))
        .map(({ key, became }) => ({
          file,
          path: key,
          message: `In a cloud session that takes its managed settings from your organization, a managed settings file may only restrict: "${key}" ${became} in ${cleanForDisplay(file)}.`,
          severity: "warning",
          statusOnly: true,
          userWritable: true,
        })),
    ],
  };
}
//@ chunk-z20c443b.js:459405-459880 placement
/**
 * 描述托管设置覆盖产生的变化。
 */
function describeManagedOverrides(written, restrictions) {
  let became = (kept, key) =>
    key === "disableAllHooks" &&
    written.disableAllHooks === true &&
    restrictions.allowManagedHooksOnly === true
      ? 'was taken as "allowManagedHooksOnly"'
      : key === "allowManagedHooksOnly" && kept === true
        ? 'was set by "disableAllHooks"'
        : kept === undefined
          ? "was ignored"
          : "was kept in part";
  return Object.keys(written).flatMap((key) => {
    let value = written[key];
    let restricted = restrictions[key];
    if (import_sortedIndex_2(value, restricted)) return [];
    if (!isPlainObject_2(value) || !isPlainObject_2(restricted))
      return [
        {
          key,
          became: became(restricted, key),
        },
      ];
    return Object.keys(value)
      .filter((key) => !import_sortedIndex_2(value[key], restricted[key]))
      .map((key_2) => ({
        key: `${key}.${key_2}`,
        became: became(restricted[key_2], key),
      }));
  });
}
//@ chunk-z20c443b.js:459880-459927 placement (2.1.88 match: execTmux, 1)
function shouldReadWindowsManagedSettingsFromWsl(asksOrg) {
  return getPlatform() === "wsl" && (!asksOrg || isWslEnvironment());
}
//@ chunk-z20c443b.js:459927-459961 placement
var managedSettingsReadSeen; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-z20c443b.js:459927", () => {
  managedSettingsReadSeen = identity_2(new Set(), (file) => file.clear());
});
//@ chunk-z20c443b.js:459961-460410 placement
/**
 * 读取 MDM 设置文档（等待组织确认的除外）。
 */
function loadManagedFileTiers(context, prepare) {
  let heldDocuments = context.mdm?.()?.heldDocuments ?? [];
  if (shouldReadWindowsManagedSettingsFromWsl(context.asksOrganization?.() === true)) {
    let present = adminDocumentPresent(
      readMdmSettings({
        ...context,
        file: () => ({
          settings: null,
          errors: [],
        }),
      }),
    );
    if (context.wslInherits?.()) {
      let heldOverride =
        heldDocuments.length === 0
          ? undefined
          : present ||
            adminDocumentPresent(loadManagedFileSettingsFromDir(WSL_MANAGED_SETTINGS_DIR, context.store));
      let managedFileSettingsFromDir = loadManagedFileSettingsFromDir(
        WSL_MANAGED_SETTINGS_DIR,
        context.store,
        prepare,
        heldOverride ? heldDocuments : [],
      );
      if (heldOverride ?? (adminDocumentPresent(managedFileSettingsFromDir) || present))
        return managedFileSettingsFromDir;
      let managedFileSettingsFromDir_2 = loadManagedFileSettingsFromDir(
        getManagedFilePath(),
        context.store,
        prepare,
        heldDocuments,
      );
      return {
        ...managedFileSettingsFromDir_2,
        errors: [...managedFileSettingsFromDir.errors, ...managedFileSettingsFromDir_2.errors],
        loadState: combinedLoadState(
          managedFileSettingsFromDir.loadState,
          managedFileSettingsFromDir_2.loadState,
        ),
      };
    }
    if (present) return loadManagedFileSettingsFromDir(null, context.store, prepare, heldDocuments);
  }
  return loadManagedFileSettingsFromDir(getManagedFilePath(), context.store, prepare, heldDocuments);
}
//@ chunk-z20c443b.js:460410-460424 placement
var alwaysTrue = () => true;
//@ chunk-z20c443b.js:460424-461307 placement
/**
 * 合并托管设置层并收集错误。
 */
function mergeManagedSettingsLayer(accumulator, tier, issues) {
  issues.push(...tier.errors);
  let { settings } = tier;
  if (!settings || Object.keys(settings).length === 0) return;
  for (let [path, rule] of restrictiveNestedSettingsMap) {
    let parts = path.split(".");
    if (getAtPath(settings, parts) === undefined) continue;
    let found = tier.errors.find((error) => error.substituted && error.path === path);
    let substituted = found !== undefined;
    let atPath = getAtPath(accumulator.merged, parts);
    if (substituted && atPath !== undefined && !accumulator.floors.has(path)) {
      let last = parts.at(-1);
      if (rule.inert.has(rule.read(atPath))) {
        matchesManagedKey_2(settings, parts);
        issues.push({
          file: found.file,
          path,
          message: `That substitute is not applied: "${last}" keeps the value an earlier managed-settings document of this folder wrote.`,
          severity: "warning",
          statusOnly: true,
        });
        continue;
      }
      issues.push({
        file: found.file,
        path,
        message: `That substitute also displaces the wider "${last}" an earlier managed-settings document of this folder wrote, until this document is fixed.`,
        severity: "warning",
        statusOnly: true,
      });
    }
    if (substituted) accumulator.floors.add(path);
    else accumulator.floors.delete(path);
  }
  accumulator.merged = mergeWithAssigner_2(accumulator.merged, settings, settingsMergeCustomizer);
  accumulator.found = true;
  if (hasEffectivePolicyContent(settings) && !tier.errors.some((error) => error.onlySubstitutes))
    accumulator.authored = true;
}
//@ chunk-z20c443b.js:461307-461362 placement (2.1.88 match: execTmux, 1)
function managedFileSettingsDirs(asksOrg) {
  return getPlatform() === "wsl" && asksOrg
    ? [WSL_MANAGED_SETTINGS_DIR, getManagedFilePath()]
    : [getManagedFilePath()];
}
//@ chunk-z20c443b.js:461362-461425 placement
function isManagedSettingsDropInName(name) {
  return name.endsWith(".json") && !name.startsWith(".");
}
//@ chunk-z20c443b.js:461425-461493 placement
function isManagedSettingsDropInEntry(dirent) {
  return (dirent.isFile() || dirent.isSymbolicLink()) && isManagedSettingsDropInName(dirent.name);
}
//@ chunk-z20c443b.js:461493-461781 placement
function noteManagedDocumentOwnership(context, folder, path, file) {
  let managedFileProtections = context.managedFileProtections;
  let info = {
    file,
    folder:
      context.managedDocumentLinks.folderIsLink.get(folder) === false
        ? managedFileProtections.folderOwners.get(folder)
        : undefined,
    posix: getPlatform() !== "windows" && !path.startsWith(WSL_MANAGED_SETTINGS_DIR),
  };
  managedFileProtections.note(
    path,
    classifyConfigDirOwnership({
      ...info,
      linked: context.managedDocumentLinks.isLinked(path),
    }),
  );
  return () => accountCouldChangeDocument(context, path, info.file, info.folder);
}
//@ chunk-z20c443b.js:461781-462443 placement
function accountCouldChangeDocument(context, path, file, folder) {
  let euid = process.geteuid?.();
  let uid = process.getuid?.();
  if (
    shouldReadWindowsManagedSettingsFromWsl(true) &&
    (path === WSL_REG_EXE_PATH || path.startsWith(`${WSL_MANAGED_SETTINGS_DIR}${sep}`))
  )
    return NEVER_MERGE;
  if (euid === 0 || uid === 0) return true;
  if (getPlatform() === "windows" || euid === undefined) return NEVER_MERGE;
  let link = context.managedDocumentLinks.linkOf(path);
  let accounts = {
    uids: uid === undefined || uid === euid ? [euid] : [euid, uid],
    groups: () => [
      ...(process.getgroups?.() ?? []),
      ...(process.getegid ? [process.getegid()] : []),
      ...(process.getgid ? [process.getgid()] : []),
    ],
  };
  if (
    anyAccountCouldWrite(accounts, file, link === null ? folder : file) !== false ||
    link?.kind === "unverified"
  )
    return true;
  let cache = (context.policy.writableNow ??= new Map());
  let writable = cache.get(path) ?? probeWritabilitySync(path);
  cache.set(path, writable);
  if (writable !== "no") return true;
  let walked = (context.policy.walkedDocuments ??= new Map());
  let result =
    walked.get(path) ??
    resolveManagedPathSafely(path, accounts, (context.policy.certainDirectories ??= new Map()));
  walked.set(path, result);
  return result;
}
//@ chunk-z20c443b.js:462443-462453 placement
var NEVER_MERGE = false;
//@ chunk-z20c443b.js:462453-462596 placement
function noteWalkedManagedPath(context, dir, steps, folder) {
  let managedDocumentLinks = context.managedDocumentLinks;
  managedDocumentLinks.noteWalked(join(dir, ...steps), () =>
    resolvePathStepsSync(
      dir,
      steps,
      folder,
      managedDocumentLinks.folderIsLink,
      context.managedFileProtections.folderOwners,
    ),
  );
}
//@ chunk-z20c443b.js:462596-463712 placement
function loadManagedFileSettingsFromDir(dir, store, gate = (tier) => tier, heldDocuments = []) {
  let errors = [];
  let accumulator = {
    merged: {},
    found: false,
    authored: false,
    floors: new Set(),
  };
  let documentHasPolicyContent = false;
  let loadState = "absent";
  for (let { path, parsed } of heldDocuments) {
    mergeManagedSettingsLayer(accumulator, gate(parsed, path, alwaysTrue), errors);
    documentHasPolicyContent ||= isPolicyTier(parsed);
    loadState = combinedLoadState(loadState, loadStateOf(parsed));
  }
  if (dir === null) return managedLoadResult(accumulator, errors, documentHasPolicyContent, loadState, store);
  let settingsFile = parseSettingsFile_3(join(dir, "managed-settings.json"), store, undefined, true);
  let ownership = () => false;
  if (loadStateOf(settingsFile) !== "absent") {
    noteWalkedManagedPath(store, dir, ["managed-settings.json"]);
    ownership = noteManagedDocumentOwnership(
      store,
      resolve(dir),
      join(dir, "managed-settings.json"),
      settingsFile.fileOwner,
    );
  }
  mergeManagedSettingsLayer(
    accumulator,
    gate(settingsFile, join(dir, "managed-settings.json"), ownership),
    errors,
  );
  documentHasPolicyContent ||= isPolicyTier(settingsFile);
  loadState = combinedLoadState(loadState, loadStateOf(settingsFile));
  let dropInDir = join(dir, "managed-settings.d");
  try {
    let cachedListing = store.folderListingForPolicyWalk(dropInDir);
    let names;
    let symlinkNames;
    if (cachedListing !== undefined) names = cachedListing;
    else {
      let filtered = getFsImplementation().readdirSync(dropInDir).filter(isManagedSettingsDropInEntry);
      names = filtered.map((dirent) => dirent.name).sort();
      symlinkNames = new Set(filtered.filter((dirent) => !dirent.isFile()).map((dirent) => dirent.name));
      store.noteWalkListing(dropInDir, names);
    }
    for (let name of names) {
      let settingsFile = parseSettingsFile_3(join(dropInDir, name), store, undefined, true);
      let ownership = () => false;
      if (loadStateOf(settingsFile) !== "absent") {
        noteWalkedManagedPath(store, dir, ["managed-settings.d", name], symlinkNames?.has(name));
        ownership = noteManagedDocumentOwnership(
          store,
          dropInDir,
          join(dropInDir, name),
          settingsFile.fileOwner,
        );
      }
      mergeManagedSettingsLayer(accumulator, gate(settingsFile, join(dropInDir, name), ownership), errors);
      documentHasPolicyContent ||= isPolicyTier(settingsFile);
      loadState = combinedLoadState(loadState, loadStateOf(settingsFile));
    }
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR") {
      logForDebugging(`managed-settings.d read failed: ${error}`, {
        level: "error",
      });
      errors.push(unreadableSettingsFileError(dropInDir, error, "directory"));
      loadState = "didNotLoad";
      gate(
        {
          settings: null,
          errors: [],
        },
        dropInDir,
        () => true,
      );
    }
  }
  return managedLoadResult(accumulator, errors, documentHasPolicyContent, loadState, store);
}
//@ chunk-z20c443b.js:463712-463972 placement
function managedLoadResult(accumulator, errors, documentHasPolicyContent, loadState, store) {
  let merged = accumulator.found && hasPolicyContent(accumulator.merged) ? accumulator.merged : null;
  if (merged?.forceLoginOrgUUID !== undefined) store.managedFileProtections.setsOrgPin = true;
  return {
    settings: merged,
    errors,
    documentHasPolicyContent,
    loadState,
    ...(merged !== null &&
      !accumulator.authored &&
      hasEffectivePolicyContent(merged) && {
        onlySubstitutes: true,
      }),
  };
}
//@ chunk-z20c443b.js:463972-464075 placement
function handleFileSystemError(error, path) {
  if (isENOENT(error)) logMissingSettingsFile(path);
  else
    logForDebugging(cleanForDisplay(`settings file read failed at ${path}: ${error}`), {
      level: "error",
    });
}
//@ chunk-z20c443b.js:464075-464467 placement (2.1.88 match: parseSettingsFile, 0.135)
/**
 * 带缓存地解析一个设置文件（pinned 内容按 \0pinned 另存一份），返回 settings 的深拷贝与错误列表。
 */
function parseSettingsFile_3(path, store, pinned, tolerant) {
  let cacheKey = pinned !== undefined ? `${path}\x00pinned` : path;
  let cached = store.parsedFiles.get(cacheKey);
  if (cached)
    return {
      ...cached,
      settings: cached.settings ? clone(cached.settings) : null,
    };
  let onStats;
  let settingsFileUncached = parseSettingsFileUncached(
    path,
    pinned,
    tolerant,
    ({ ino, size, mtimeMs, ctimeMs }) => {
      onStats = {
        ino,
        size,
        mtimeMs,
        ctimeMs,
      };
    },
  );
  if (pinned === undefined && settingsFileUncached.loadState === "absent") onStats ??= null;
  if (onStats !== undefined) store.noteFirstRead(path, onStats);
  store.parsedFiles.set(cacheKey, settingsFileUncached);
  return {
    ...settingsFileUncached,
    settings: settingsFileUncached.settings ? clone(settingsFileUncached.settings) : null,
  };
}
//@ chunk-z20c443b.js:464467-464816 placement
/**
 * 读取 MDM 设置及加载状态。
 */
function readMdmSettings(context) {
  let mdm = context.mdm?.();
  if (!mdm)
    return {
      settings: null,
      errors: [],
      documentHasPolicyContent: false,
      loadState: "absent",
    };
  return {
    settings: mdm.settings && Object.keys(mdm.settings).length > 0 ? mdm.settings : null,
    errors: mdmPolicyErrors(
      mdm,
      () => parseRemoteManagedSettings(context),
      () => context.file?.() ?? loadManagedFileSettings(context),
    ),
    documentHasPolicyContent: isPolicyTier(mdm),
    loadState: loadStateOf(mdm),
    ...(mdm.onlySubstitutes && {
      onlySubstitutes: mdm.onlySubstitutes,
    }),
  };
}
//@ chunk-z20c443b.js:464816-464955 placement
function parsePolicyObjectTolerant(input, label) {
  let byInput = weakMap_2.get(input);
  let cached = byInput?.get(label);
  if (cached) return cloneManagedLoadResult(cached);
  let result = parseManagedSettingsFile(input, label);
  if (byInput) byInput.set(label, result);
  else weakMap_2.set(input, new Map([[label, result]]));
  return cloneManagedLoadResult(result);
}
//@ chunk-z20c443b.js:464955-465199 placement
function cloneManagedLoadResult(result) {
  return {
    settings: result.settings && clone(result.settings),
    errors: result.errors.map((error) => ({
      ...error,
    })),
    documentHasPolicyContent: result.documentHasPolicyContent,
    loadState: result.loadState,
    removed: result.removed,
    ...(result.onlySubstitutes && {
      onlySubstitutes: result.onlySubstitutes,
    }),
  };
}
//@ chunk-z20c443b.js:465199-465218 placement
var weakMap_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-z20c443b.js:465199", () => {
  weakMap_2 = new WeakMap();
});
//@ chunk-z20c443b.js:465218-465834 placement
/**
 * 解析托管设置文件（策略来源校验）。
 */
function parseManagedSettingsFile(input, label) {
  let workingCopy = clone(input);
  let preIssues = validateSettingsDocument(workingCopy, label, {
    skipMcpServerEntryFilter: true,
    policySource: true,
  });
  let issues = [];
  let parsed = buildPolicyTolerantSettingsSchema(
    collectSettingsIssue(label, issues),
    label,
    workingCopy,
  ).safeParse(workingCopy);
  if (!parsed.success)
    return {
      settings: null,
      errors: [...preIssues, ...formatZodError(parsed.error, label)],
      documentHasPolicyContent: false,
      loadState: "didNotLoad",
      removed: [],
    };
  let errors = [...explainedPolicyChange(preIssues, parsed.data, issues), ...issues];
  let original = input;
  let kept = Object.keys(parsed.data).length > 0 ? parsed.data : null;
  return {
    settings: kept,
    errors,
    documentHasPolicyContent: documentHasPolicyContent(input, parsed.data),
    loadState: "loaded",
    removed: Object.keys(original).filter(
      (key) =>
        isPolicyContentKey(key, original[key]) &&
        parsed.data[key] === undefined &&
        errors.every(
          (issue) => issue.statusOnly || (issue.path !== key && !issue.path.startsWith(`${key}.`)),
        ),
    ),
    ...(kept !== null &&
      issues.some((issue) => issue.onlySubstitutes) && {
        onlySubstitutes: true,
      }),
  };
}
//@ chunk-z20c443b.js:465834-465963 placement
function isPolicyContentKey(key, value) {
  let restrictive = RESTRICTIVE_TOP_LEVEL_SETTINGS();
  return restrictive.includes(key) ||
    SETTING_ALIASES.some(({ alias, canonical }) => alias === key && restrictive.includes(canonical))
    ? isRestrictiveDisable(key, value)
    : isRestrictiveNestedPath(key) && isPolicyContentObject(key, value);
}
//@ chunk-z20c443b.js:465963-466113 placement
function isPolicyContentObject(prefix, value) {
  return (
    value === null ||
    (isPlainObject_2(value) &&
      Object.keys(value).length > 0 &&
      Object.entries(value).every(([key, value]) => {
        let path = `${prefix}.${key}`;
        return (
          isRestrictiveDisable(path, value) ||
          (isRestrictiveNestedPath(path) && isPolicyContentObject(path, value))
        );
      }))
  );
}
//@ chunk-z20c443b.js:466113-466205 placement
function isInertManagedMcpServersNotice(path) {
  return isSdkEntrypoint() && (path === "managedMcpServers" || path.startsWith("managedMcpServers."));
}
//@ chunk-z20c443b.js:466205-466325 placement
var MANAGED_ONLY_KEYS = ["managedMcpServers", "isolation", "attributionProjectPolicy"];
var NON_MANAGED_DROPPED_KEYS = [...MANAGED_ONLY_KEYS, "deniedModels", "availableModelsMatch"];
//@ chunk-z20c443b.js:466325-466580 placement
function dropManagedOnlyKeys(doc, file) {
  if (!isPlainObject_2(doc)) return [];
  let issues = [];
  for (let key of NON_MANAGED_DROPPED_KEYS) {
    if (!(key in doc)) continue;
    delete doc[key];
    if (!isInertManagedMcpServersNotice(key))
      issues.push({
        file,
        path: key,
        message: `"${key}" is only honored from managed settings and was ignored here.`,
        severity: "warning",
        preserveOnWrite: true,
      });
  }
  return issues;
}
//@ chunk-z20c443b.js:466580-467037 placement
/**
 * 收集设置问题为警告。
 */
function collectSettingsIssue(file, sink) {
  return (issue) => {
    if (isInertManagedMcpServersNotice(issue.path)) return;
    sink.push({
      file,
      path: issue.path,
      message: issue.message,
      severity: "warning",
      ...(issue.statusOnly && {
        statusOnly: issue.statusOnly,
      }),
      ...(issue.startupFatal && {
        startupFatal: issue.startupFatal,
      }),
      ...(issue.substituted && {
        substituted: issue.substituted,
      }),
      ...(issue.onlySubstitutes && {
        onlySubstitutes: issue.onlySubstitutes,
      }),
      ...(issue.removal && {
        removal: issue.removal,
      }),
    });
    if (issue.statusOnly || issue.startupFatal)
      logForDebugging(cleanForDisplay(`${file}: ${issue.path}: ${issue.message}`), {
        level: issue.startupFatal ? "error" : "warn",
      });
  };
}
//@ chunk-z20c443b.js:467037-467923 placement
function parseRemoteManagedSettings(context) {
  let settings = context?.remote
    ? context.remote()
    : getRemoteManagedSettingsSyncFromCache(
        (parser) => parsePolicyObjectTolerant(parser, "remote managed settings").settings,
      );
  let withheld =
    !context?.remote &&
    !isInertManagedMcpServersNotice("managedMcpServers") &&
    unverifiedRemoteCacheWithholdsProvisions()
      ? [
          {
            file: "remote managed settings",
            path: "managedMcpServers",
            message:
              "The organization's MCP servers in the cached remote settings are withheld until the server confirms them this session; they connect as soon as it does.",
            severity: "warning",
            statusOnly: true,
          },
        ]
      : [];
  let status = context?.remote ? undefined : getLastLoadStatus();
  let rulings =
    (status?.state === "stale_cache" || status?.state === "failed") &&
    status.failure.errorKind === "ruled_empty"
      ? serializeSettingsErrors(status.failure.rulings ?? [])
      : [];
  if (!settings || Object.keys(settings).length === 0)
    return {
      settings: null,
      errors: [...withheld, ...rulings],
      servedSnapshot: false,
      documentHasPolicyContent: false,
    };
  let {
    settings: settings_2,
    errors,
    documentHasPolicyContent,
    onlySubstitutes,
  } = parsePolicyObjectTolerant(settings, "remote managed settings");
  return {
    settings: settings_2,
    errors: [...withheld, ...rulings, ...serializeSettingsErrors(errors)],
    servedSnapshot: isProjectedSnapshot(settings),
    documentHasPolicyContent,
    ...(onlySubstitutes && {
      onlySubstitutes,
    }),
  };
}
//@ chunk-z20c443b.js:467923-468017 placement
var PARENT_MANAGED_SETTINGS_SOURCE_LABEL = "parent managed settings";
var RETENTION_POLICY_KEYS = ["cleanupPeriodDays", "desktopSessionCleanupPeriodDays"];
//@ chunk-z20c443b.js:468017-468452 placement
function parseParentManagedSettings(context) {
  let parentManaged = context.parentManaged;
  if (!parentManaged || Object.keys(parentManaged).length === 0)
    return {
      settings: null,
      errors: [],
    };
  let policyObjectTolerant = parsePolicyObjectTolerant(parentManaged, PARENT_MANAGED_SETTINGS_SOURCE_LABEL);
  for (let key of MANAGED_ONLY_KEYS)
    if (policyObjectTolerant.settings?.[key] !== undefined && !isInertManagedMcpServersNotice(key))
      policyObjectTolerant.errors.push({
        file: PARENT_MANAGED_SETTINGS_SOURCE_LABEL,
        path: key,
        message: `"${key}" is only honored from the organization's managed settings sources (server-managed, MDM, managed-settings.json), not from settings a host passes in, and was ignored here.`,
        severity: "warning",
        statusOnly: true,
      });
  return policyObjectTolerant;
}
//@ chunk-z20c443b.js:468452-468480 placement
function parseParentTierWithOrganization(context) {
  return null;
}
//@ chunk-z20c443b.js:468480-468789 placement
function parseInlineFlagSettings(context) {
  let flagInline = context.flagInline;
  if (!flagInline)
    return {
      settings: null,
      errors: [],
    };
  let desktop = isSdkEntrypoint();
  let inlineFlagParse = context.store.inlineFlagParse;
  if (inlineFlagParse?.inline !== flagInline || inlineFlagParse.desktopSupplied !== desktop) {
    inlineFlagParse = {
      inline: flagInline,
      desktopSupplied: desktop,
      parsed: parseCommandOutputAsSettings(flagInline),
    };
    context.store.inlineFlagParse = inlineFlagParse;
  }
  let { settings, errors } = inlineFlagParse.parsed;
  return {
    settings: settings && clone(settings),
    errors: errors.map((error) => ({
      ...error,
    })),
  };
}
export {
  isManagedSettingsDropInName,
  RETENTION_POLICY_KEYS,
  PARENT_MANAGED_SETTINGS_SOURCE_LABEL,
  dropManagedOnlyKeys,
  MANAGED_ONLY_KEYS,
  isInertManagedMcpServersNotice,
  parsePolicyObjectTolerant,
  accountCouldChangeDocument,
  parseSettingsFile_3,
  parseInlineFlagSettings,
  loadManagedFileSettings,
  parseRemoteManagedSettings,
  heldOffPluginIds,
  allowListEntriesThatVouch,
  parseParentManagedSettings,
  parseParentTierWithOrganization,
  managedFileSettingsDirs,
  handleFileSystemError,
  collectSettingsIssue,
  readMdmSettings,
  isPolicyContentKey,
  NON_MANAGED_DROPPED_KEYS,
  isManagedSettingsDropInEntry,
  loadManagedFileSettingsFromDir,
};
