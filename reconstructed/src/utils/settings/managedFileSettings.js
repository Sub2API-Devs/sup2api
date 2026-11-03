/**
 * utils/settings/managedFileSettings.ts
 *
 * 2.1.316 新增：合并托管设置层并收集错误；应用托管设置覆盖并记录等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (39)
 * attribution: placement 39
 */
import { sep, join, resolve } from "path";
import { coerceToPlainString, cleanForDisplay } from "../stringUtils.js";
import {
  FORCE_LOGIN_SETTING_KEYS,
  SettingsCacheStore,
  classifyConfigDirOwnership,
} from "../../bootstrap/stateSlices.js";
import { wS, En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
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
import { mergeWithAssigner_2 } from "./settingsSourceTrust.js";
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

//@ chunk-dcmhvw5a.js:457142-457489 placement
/**
 * 描述无效设置值（截断显示）。
 */
function describeInvalidValues(errors) {
  return errors.map((n) => {
    let { invalidValue } = n;
    let s = invalidValue !== undefined && invalidValue !== null;
    let a = s ? coerceToPlainString(invalidValue) : undefined;
    let c = a === undefined ? undefined : cleanForDisplay(a);
    return {
      ...n,
      path: cleanForDisplay(n.path),
      message: cleanForDisplay(n.message),
      ...(n.expected !== undefined && {
        expected: cleanForDisplay(n.expected),
      }),
      ...(n.suggestion !== undefined && {
        suggestion: cleanForDisplay(n.suggestion),
      }),
      ...(s &&
        (a === undefined || typeof invalidValue === "string" || c !== a) && {
          invalidValue: c,
        }),
    };
  });
}
//@ chunk-dcmhvw5a.js:457489-459256 placement
function loadManagedFileSettings(e) {
  if (e.diskless)
    return {
      settings: null,
      errors: [],
      documentHasPolicyContent: false,
      loadState: "absent",
    };
  let n;
  let r = (x) => {
    if (x === alwaysTrue) return true;
    n ??= e.asksOrganization?.() === true;
    return n && x();
  };
  let s = false;
  let a = {};
  let c = new Set();
  let managedFileTiers = loadManagedFileTiers(e, (x, K, q) => {
    if (x.settings === null) {
      if (!r(q)) return x;
      FORCE_LOGIN_SETTING_KEYS.forEach((ee) => c.add(ee));
      return {
        ...x,
        errors: describeInvalidValues(x.errors),
      };
    }
    if (!r(q)) {
      Object.assign(a, wS(x.settings, restrictiveTopLevelSettings));
      return x;
    }
    s = true;
    return {
      ...x,
      settings: {},
      errors: describeInvalidValues(x.errors),
    };
  });
  if (!s)
    return c.size === 0
      ? managedFileTiers
      : {
          ...managedFileTiers,
          lostSignInPins: [...c],
        };
  let m = [];
  let f = [];
  let managedFileTiers_2 = loadManagedFileTiers(e, (x, K, q) => {
    if (x.settings === null || !r(q))
      return {
        ...x,
        settings: x.settings && {},
        errors: [],
      };
    let ee = applyManagedOverrides(x, x.settings, K);
    for (let Z of FORCE_LOGIN_SETTING_KEYS)
      if (x.settings[Z] !== undefined && ee.settings?.[Z] === undefined) c.add(Z);
    m.push([K, Object.keys(ee.settings ?? {})]);
    f.push(...ee.errors.slice(x.errors.length));
    return ee;
  });
  let y = [...managedFileTiers.errors, ...f];
  let settings = managedFileTiers.settings ?? {};
  let settings_2 = managedFileTiers_2.settings ?? {};
  let C = !authoredPolicyContent({
    ...managedFileTiers,
    settings,
  }) && {
    heldOnly: true,
  };
  if (Object.keys(settings_2).length === 0)
    return {
      ...managedFileTiers,
      errors: y,
      ...C,
      lostSignInPins: [...c],
    };
  let w = Object.keys(settings).length === 0;
  let L = {
    ...(w
      ? settings_2
      : Uo(mergeAdminPolicies([settings, settings_2], "merge", false, 0).admin, "parentSettingsBehavior")),
    ...wS(settings, "parentSettingsBehavior"),
    ...a,
  };
  let v = L;
  let j = settings;
  for (let [x, K] of m)
    for (let q of K)
      if (q in j && En(v[q], j[q]))
        y.push({
          file: x,
          path: cleanForDisplay(q),
          message: `In a cloud session that takes its managed settings from your organization, a managed settings file may only restrict: "${cleanForDisplay(q)}" was ignored in ${cleanForDisplay(x)}, since another managed settings document sets it and this one adds nothing to it.`,
          severity: "warning",
          statusOnly: true,
          userWritable: true,
        });
  return {
    ...(w ? managedFileTiers_2 : managedFileTiers),
    settings: L,
    errors: y,
    ...C,
    lostSignInPins: [...c],
    ...(!hasEffectivePolicyContent(settings) && {
      onlyHeldContent: true,
    }),
    settingsNotHeld: settings,
    heldOffPlugins: Object.keys(settings_2.enabledPlugins ?? {}).filter(
      (key) => settings.enabledPlugins?.[key] === undefined,
    ),
    heldAllowLists: MERGEABLE_POLICY_KEYS_2.filter(
      (x) => settings_2[x] !== undefined && settings[x] === undefined,
    ),
  };
}
//@ chunk-dcmhvw5a.js:459256-459578 placement
function heldOffPluginIds(settingsContext) {
  let heldOffPlugins = settingsContext.store.policy.heldOffPlugins;
  if (heldOffPlugins !== undefined) return heldOffPlugins;
  let r = [];
  if (settingsContext.asksOrganization?.() === true) {
    let s = settingsContext.file?.() ?? loadManagedFileSettings(settingsContext);
    let a = [
      parseRemoteManagedSettings(settingsContext)?.settings?.enabledPlugins,
      settingsContext.mdm?.()?.settings?.enabledPlugins,
    ];
    r = (s.heldOffPlugins ?? []).filter((c) => a.every((g) => g?.[c] === undefined));
  }
  settingsContext.store.policy.heldOffPlugins = r;
  return r;
}
//@ chunk-dcmhvw5a.js:459578-459983 placement
function allowListEntriesThatVouch(settingsContext, n) {
  if (n === undefined || n.length === 0) return n;
  try {
    let { policy } = settingsContext.store;
    if (policy.vouchingAllowList === undefined) {
      let value = heldOrganizationDocument(settingsContext);
      policy.vouchingAllowList = {
        value,
      };
    }
    let s = policy.vouchingAllowList.value;
    return s === null ? n : n.filter((a) => s.some((c) => En(c, a)));
  } catch (error) {
    settingsContext.store.policy.vouchingAllowList = {
      value: [],
    };
    logForDebugging("marketplace allow-list: which entries vouch could not be told; none does", {
      level: "error",
    });
    logError(error);
    return [];
  }
}
//@ chunk-dcmhvw5a.js:459983-460296 placement
/**
 * 等待组织确认的托管文件设置。
 */
function heldOrganizationDocument(e) {
  if (e.asksOrganization?.() !== true) return null;
  let n = e.file?.() ?? loadManagedFileSettings(e);
  if (n.settings === null || n.heldAllowLists?.includes("strictKnownMarketplaces") !== true) return null;
  let settings = Uo(n.settings, "strictKnownMarketplaces");
  return (
    adminAuthoredPolicy({
      ...e,
      store: new SettingsCacheStore(),
      file: () => ({
        ...n,
        settings,
      }),
    })?.strictKnownMarketplaces ?? []
  );
}
//@ chunk-dcmhvw5a.js:460296-460944 placement
/**
 * 应用托管设置覆盖并记录。
 */
function applyManagedOverrides(e, settings, r) {
  let s = restrictionsOfUnvouchedDocument(settings);
  let mapped = describeManagedOverrides(settings, s).map((c) => ({
    ...c,
    key: cleanForDisplay(c.key),
  }));
  if (mapped.length === 0) return e;
  if (!managedSettingsReadSeen.has(r)) {
    managedSettingsReadSeen.add(r);
    logForDebugging(
      `${cleanForDisplay(r)}: not taken as written: ${mapped
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
    ...e,
    settings: s,
    errors: [
      ...e.errors,
      ...mapped
        .filter(({ key }) => !isInertManagedMcpServersNotice(key))
        .map(({ key, became }) => ({
          file: r,
          path: key,
          message: `In a cloud session that takes its managed settings from your organization, a managed settings file may only restrict: "${key}" ${became} in ${cleanForDisplay(r)}.`,
          severity: "warning",
          statusOnly: true,
          userWritable: true,
        })),
    ],
  };
}
//@ chunk-dcmhvw5a.js:460944-461419 placement
/**
 * 描述托管设置覆盖产生的变化。
 */
function describeManagedOverrides(e, n) {
  let r = (s, a) =>
    a === "disableAllHooks" && e.disableAllHooks === true && n.allowManagedHooksOnly === true
      ? 'was taken as "allowManagedHooksOnly"'
      : a === "allowManagedHooksOnly" && s === true
        ? 'was set by "disableAllHooks"'
        : s === undefined
          ? "was ignored"
          : "was kept in part";
  return Object.keys(e).flatMap((key) => {
    let a = e[key];
    let c = n[key];
    if (En(a, c)) return [];
    if (!isPlainObject_2(a) || !isPlainObject_2(c))
      return [
        {
          key,
          became: r(c, key),
        },
      ];
    return Object.keys(a)
      .filter((key) => !En(a[key], c[key]))
      .map((key_2) => ({
        key: `${key}.${key_2}`,
        became: r(c[key_2], key),
      }));
  });
}
//@ chunk-dcmhvw5a.js:461419-461466 placement = execTmux (1)
function shouldReadWindowsManagedSettingsFromWsl(e) {
  return getPlatform() === "wsl" && (!e || isWslEnvironment());
}
//@ chunk-dcmhvw5a.js:461466-461500 placement
var managedSettingsReadSeen = identity_2(new Set(), (e) => e.clear());
//@ chunk-dcmhvw5a.js:461500-461949 placement
/**
 * 读取 MDM 设置文档（等待组织确认的除外）。
 */
function loadManagedFileTiers(e, n) {
  let heldDocuments = e.mdm?.()?.heldDocuments ?? [];
  if (shouldReadWindowsManagedSettingsFromWsl(e.asksOrganization?.() === true)) {
    let s = adminDocumentPresent(
      readMdmSettings({
        ...e,
        file: () => ({
          settings: null,
          errors: [],
        }),
      }),
    );
    if (e.wslInherits?.()) {
      let a =
        heldDocuments.length === 0
          ? undefined
          : s || adminDocumentPresent(loadManagedFileSettingsFromDir(WSL_MANAGED_SETTINGS_DIR, e.store));
      let managedFileSettingsFromDir = loadManagedFileSettingsFromDir(
        WSL_MANAGED_SETTINGS_DIR,
        e.store,
        n,
        a ? heldDocuments : [],
      );
      if (a ?? (adminDocumentPresent(managedFileSettingsFromDir) || s)) return managedFileSettingsFromDir;
      let managedFileSettingsFromDir_2 = loadManagedFileSettingsFromDir(
        getManagedFilePath(),
        e.store,
        n,
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
    if (s) return loadManagedFileSettingsFromDir(null, e.store, n, heldDocuments);
  }
  return loadManagedFileSettingsFromDir(getManagedFilePath(), e.store, n, heldDocuments);
}
//@ chunk-dcmhvw5a.js:461949-461963 placement
var alwaysTrue = () => true;
//@ chunk-dcmhvw5a.js:461963-462846 placement
/**
 * 合并托管设置层并收集错误。
 */
function mergeManagedSettingsLayer(e, n, r) {
  r.push(...n.errors);
  let { settings } = n;
  if (!settings || Object.keys(settings).length === 0) return;
  for (let [a, c] of restrictiveNestedSettingsMap) {
    let parts = a.split(".");
    if (getAtPath(settings, parts) === undefined) continue;
    let found = n.errors.find((error) => error.substituted && error.path === a);
    let f = found !== undefined;
    let atPath = getAtPath(e.merged, parts);
    if (f && atPath !== undefined && !e.floors.has(a)) {
      let last = parts.at(-1);
      if (c.inert.has(c.read(atPath))) {
        matchesManagedKey_2(settings, parts);
        r.push({
          file: found.file,
          path: a,
          message: `That substitute is not applied: "${last}" keeps the value an earlier managed-settings document of this folder wrote.`,
          severity: "warning",
          statusOnly: true,
        });
        continue;
      }
      r.push({
        file: found.file,
        path: a,
        message: `That substitute also displaces the wider "${last}" an earlier managed-settings document of this folder wrote, until this document is fixed.`,
        severity: "warning",
        statusOnly: true,
      });
    }
    if (f) e.floors.add(a);
    else e.floors.delete(a);
  }
  e.merged = mergeWithAssigner_2(e.merged, settings, settingsMergeCustomizer);
  e.found = true;
  if (hasEffectivePolicyContent(settings) && !n.errors.some((error) => error.onlySubstitutes))
    e.authored = true;
}
//@ chunk-dcmhvw5a.js:462846-462901 placement = execTmux (1)
function managedFileSettingsDirs(e) {
  return getPlatform() === "wsl" && e
    ? [WSL_MANAGED_SETTINGS_DIR, getManagedFilePath()]
    : [getManagedFilePath()];
}
//@ chunk-dcmhvw5a.js:462901-462964 placement
function isManagedSettingsDropInName(name) {
  return name.endsWith(".json") && !name.startsWith(".");
}
//@ chunk-dcmhvw5a.js:462964-463032 placement
function isManagedSettingsDropInEntry(e) {
  return (e.isFile() || e.isSymbolicLink()) && isManagedSettingsDropInName(e.name);
}
//@ chunk-dcmhvw5a.js:463032-463320 placement
function noteManagedDocumentOwnership(e, n, r, file) {
  let managedFileProtections = e.managedFileProtections;
  let c = {
    file,
    folder:
      e.managedDocumentLinks.folderIsLink.get(n) === false
        ? managedFileProtections.folderOwners.get(n)
        : undefined,
    posix: getPlatform() !== "windows" && !r.startsWith(WSL_MANAGED_SETTINGS_DIR),
  };
  managedFileProtections.note(
    r,
    classifyConfigDirOwnership({
      ...c,
      linked: e.managedDocumentLinks.isLinked(r),
    }),
  );
  return () => accountCouldChangeDocument(e, r, c.file, c.folder);
}
//@ chunk-dcmhvw5a.js:463320-463982 placement
function accountCouldChangeDocument(e, n, file, s) {
  let a = process.geteuid?.();
  let c = process.getuid?.();
  if (
    shouldReadWindowsManagedSettingsFromWsl(true) &&
    (n === WSL_REG_EXE_PATH || n.startsWith(`${WSL_MANAGED_SETTINGS_DIR}${sep}`))
  )
    return NEVER_MERGE;
  if (a === 0 || c === 0) return true;
  if (getPlatform() === "windows" || a === undefined) return NEVER_MERGE;
  let m = e.managedDocumentLinks.linkOf(n);
  let f = {
    uids: c === undefined || c === a ? [a] : [a, c],
    groups: () => [
      ...(process.getgroups?.() ?? []),
      ...(process.getegid ? [process.getegid()] : []),
      ...(process.getgid ? [process.getgid()] : []),
    ],
  };
  if (anyAccountCouldWrite(f, file, m === null ? s : file) !== false || m?.kind === "unverified") return true;
  let y = (e.policy.writableNow ??= new Map());
  let b = y.get(n) ?? probeWritabilitySync(n);
  y.set(n, b);
  if (b !== "no") return true;
  let S = (e.policy.walkedDocuments ??= new Map());
  let C = S.get(n) ?? resolveManagedPathSafely(n, f, (e.policy.certainDirectories ??= new Map()));
  S.set(n, C);
  return C;
}
//@ chunk-dcmhvw5a.js:463982-463992 placement
var NEVER_MERGE = false;
//@ chunk-dcmhvw5a.js:463992-464135 placement
function noteWalkedManagedPath(e, n, r, s) {
  let managedDocumentLinks = e.managedDocumentLinks;
  managedDocumentLinks.noteWalked(join(n, ...r), () =>
    resolvePathStepsSync(n, r, s, managedDocumentLinks.folderIsLink, e.managedFileProtections.folderOwners),
  );
}
//@ chunk-dcmhvw5a.js:464135-465251 placement
function loadManagedFileSettingsFromDir(e, store, r = (a) => a, heldDocuments = []) {
  let errors = [];
  let c = {
    merged: {},
    found: false,
    authored: false,
    floors: new Set(),
  };
  let documentHasPolicyContent = false;
  let loadState = "absent";
  for (let { path, parsed } of heldDocuments) {
    mergeManagedSettingsLayer(c, r(parsed, path, alwaysTrue), errors);
    documentHasPolicyContent ||= isPolicyTier(parsed);
    loadState = combinedLoadState(loadState, loadStateOf(parsed));
  }
  if (e === null) return managedLoadResult(c, errors, documentHasPolicyContent, loadState, store);
  let settingsFile = parseSettingsFile_3(join(e, "managed-settings.json"), store, undefined, true);
  let h = () => false;
  if (loadStateOf(settingsFile) !== "absent") {
    noteWalkedManagedPath(store, e, ["managed-settings.json"]);
    h = noteManagedDocumentOwnership(
      store,
      resolve(e),
      join(e, "managed-settings.json"),
      settingsFile.fileOwner,
    );
  }
  mergeManagedSettingsLayer(c, r(settingsFile, join(e, "managed-settings.json"), h), errors);
  documentHasPolicyContent ||= isPolicyTier(settingsFile);
  loadState = combinedLoadState(loadState, loadStateOf(settingsFile));
  let y = join(e, "managed-settings.d");
  try {
    let b = store.folderListingForPolicyWalk(y);
    let S;
    let C;
    if (b !== undefined) S = b;
    else {
      let filtered = getFsImplementation().readdirSync(y).filter(isManagedSettingsDropInEntry);
      S = filtered.map((L) => L.name).sort();
      C = new Set(filtered.filter((L) => !L.isFile()).map((L) => L.name));
      store.noteWalkListing(y, S);
    }
    for (let w of S) {
      let settingsFile = parseSettingsFile_3(join(y, w), store, undefined, true);
      let v = () => false;
      if (loadStateOf(settingsFile) !== "absent") {
        noteWalkedManagedPath(store, e, ["managed-settings.d", w], C?.has(w));
        v = noteManagedDocumentOwnership(store, y, join(y, w), settingsFile.fileOwner);
      }
      mergeManagedSettingsLayer(c, r(settingsFile, join(y, w), v), errors);
      documentHasPolicyContent ||= isPolicyTier(settingsFile);
      loadState = combinedLoadState(loadState, loadStateOf(settingsFile));
    }
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR") {
      logForDebugging(`managed-settings.d read failed: ${error}`, {
        level: "error",
      });
      errors.push(unreadableSettingsFileError(y, error, "directory"));
      loadState = "didNotLoad";
      r(
        {
          settings: null,
          errors: [],
        },
        y,
        () => true,
      );
    }
  }
  return managedLoadResult(c, errors, documentHasPolicyContent, loadState, store);
}
//@ chunk-dcmhvw5a.js:465251-465511 placement
function managedLoadResult(e, errors, documentHasPolicyContent, loadState, a) {
  let merged = e.found && hasPolicyContent(e.merged) ? e.merged : null;
  if (merged?.forceLoginOrgUUID !== undefined) a.managedFileProtections.setsOrgPin = true;
  return {
    settings: merged,
    errors,
    documentHasPolicyContent,
    loadState,
    ...(merged !== null &&
      !e.authored &&
      hasEffectivePolicyContent(merged) && {
        onlySubstitutes: true,
      }),
  };
}
//@ chunk-dcmhvw5a.js:465511-465614 placement
function handleFileSystemError(e, n) {
  if (isENOENT(e)) logMissingSettingsFile(n);
  else
    logForDebugging(cleanForDisplay(`settings file read failed at ${n}: ${e}`), {
      level: "error",
    });
}
//@ chunk-dcmhvw5a.js:465614-465845 placement = parseSettingsFile (0.261)
/**
 * 带缓存地解析一个设置文件（pinned 内容按 \0pinned 另存一份），返回 settings 的深拷贝与错误列表。
 */
function parseSettingsFile_3(e, store, r, s) {
  let a = r !== undefined ? `${e}\x00pinned` : e;
  let c = store.parsedFiles.get(a);
  if (c)
    return {
      ...c,
      settings: c.settings ? clone(c.settings) : null,
    };
  let result = parseSettingsFileUncached(e, r, s);
  store.parsedFiles.set(a, result);
  return {
    ...result,
    settings: result.settings ? clone(result.settings) : null,
  };
}
//@ chunk-dcmhvw5a.js:465845-466193 placement
/**
 * 读取 MDM 设置及加载状态。
 */
function readMdmSettings(e) {
  let n = e.mdm?.();
  if (!n)
    return {
      settings: null,
      errors: [],
      documentHasPolicyContent: false,
      loadState: "absent",
    };
  return {
    settings: n.settings && Object.keys(n.settings).length > 0 ? n.settings : null,
    errors: mdmPolicyErrors(
      n,
      () => parseRemoteManagedSettings(e),
      () => e.file?.() ?? loadManagedFileSettings(e),
    ),
    documentHasPolicyContent: isPolicyTier(n),
    loadState: loadStateOf(n),
    ...(n.onlySubstitutes && {
      onlySubstitutes: n.onlySubstitutes,
    }),
  };
}
//@ chunk-dcmhvw5a.js:466193-466332 placement
function parsePolicyObjectTolerant(e, n) {
  let r = weakMap_2.get(e);
  let s = r?.get(n);
  if (s) return cloneManagedLoadResult(s);
  let managedSettingsFile = parseManagedSettingsFile(e, n);
  if (r) r.set(n, managedSettingsFile);
  else weakMap_2.set(e, new Map([[n, managedSettingsFile]]));
  return cloneManagedLoadResult(managedSettingsFile);
}
//@ chunk-dcmhvw5a.js:466332-466576 placement
function cloneManagedLoadResult(e) {
  return {
    settings: e.settings && clone(e.settings),
    errors: e.errors.map((error) => ({
      ...error,
    })),
    documentHasPolicyContent: e.documentHasPolicyContent,
    loadState: e.loadState,
    removed: e.removed,
    ...(e.onlySubstitutes && {
      onlySubstitutes: e.onlySubstitutes,
    }),
  };
}
//@ chunk-dcmhvw5a.js:466576-466595 placement
var weakMap_2 = new WeakMap();
//@ chunk-dcmhvw5a.js:466595-467211 placement
/**
 * 解析托管设置文件（策略来源校验）。
 */
function parseManagedSettingsFile(e, n) {
  let r = clone(e);
  let s = validateSettingsDocument(r, n, {
    skipMcpServerEntryFilter: true,
    policySource: true,
  });
  let a = [];
  let c = buildPolicyTolerantSettingsSchema(collectSettingsIssue(n, a), n, r).safeParse(r);
  if (!c.success)
    return {
      settings: null,
      errors: [...s, ...formatZodError(c.error, n)],
      documentHasPolicyContent: false,
      loadState: "didNotLoad",
      removed: [],
    };
  let g = [...explainedPolicyChange(s, c.data, a), ...a];
  let m = e;
  let f = Object.keys(c.data).length > 0 ? c.data : null;
  return {
    settings: f,
    errors: g,
    documentHasPolicyContent: documentHasPolicyContent(e, c.data),
    loadState: "loaded",
    removed: Object.keys(m).filter(
      (key) =>
        isPolicyContentKey(key, m[key]) &&
        c.data[key] === undefined &&
        g.every((y) => y.statusOnly || (y.path !== key && !y.path.startsWith(`${key}.`))),
    ),
    ...(f !== null &&
      a.some((h) => h.onlySubstitutes) && {
        onlySubstitutes: true,
      }),
  };
}
//@ chunk-dcmhvw5a.js:467211-467340 placement
function isPolicyContentKey(e, n) {
  let r = RESTRICTIVE_TOP_LEVEL_SETTINGS();
  return r.includes(e) || SETTING_ALIASES.some(({ alias, canonical }) => alias === e && r.includes(canonical))
    ? isRestrictiveDisable(e, n)
    : isRestrictiveNestedPath(e) && isPolicyContentObject(e, n);
}
//@ chunk-dcmhvw5a.js:467340-467490 placement
function isPolicyContentObject(e, n) {
  return (
    n === null ||
    (isPlainObject_2(n) &&
      Object.keys(n).length > 0 &&
      Object.entries(n).every(([key, value]) => {
        let a = `${e}.${key}`;
        return (
          isRestrictiveDisable(a, value) || (isRestrictiveNestedPath(a) && isPolicyContentObject(a, value))
        );
      }))
  );
}
//@ chunk-dcmhvw5a.js:467490-467582 placement
function isInertManagedMcpServersNotice(e) {
  return isSdkEntrypoint() && (e === "managedMcpServers" || e.startsWith("managedMcpServers."));
}
//@ chunk-dcmhvw5a.js:467582-467702 placement
var MANAGED_ONLY_KEYS = ["managedMcpServers", "isolation", "attributionProjectPolicy"];
var NON_MANAGED_DROPPED_KEYS = [...MANAGED_ONLY_KEYS, "deniedModels", "availableModelsMatch"];
//@ chunk-dcmhvw5a.js:467702-467957 placement
function dropManagedOnlyKeys(e, file) {
  if (!isPlainObject_2(e)) return [];
  let r = [];
  for (let s of NON_MANAGED_DROPPED_KEYS) {
    if (!(s in e)) continue;
    delete e[s];
    if (!isInertManagedMcpServersNotice(s))
      r.push({
        file,
        path: s,
        message: `"${s}" is only honored from managed settings and was ignored here.`,
        severity: "warning",
        preserveOnWrite: true,
      });
  }
  return r;
}
//@ chunk-dcmhvw5a.js:467957-468414 placement
/**
 * 收集设置问题为警告。
 */
function collectSettingsIssue(e, n) {
  return (r) => {
    if (isInertManagedMcpServersNotice(r.path)) return;
    n.push({
      file: e,
      path: r.path,
      message: r.message,
      severity: "warning",
      ...(r.statusOnly && {
        statusOnly: r.statusOnly,
      }),
      ...(r.startupFatal && {
        startupFatal: r.startupFatal,
      }),
      ...(r.substituted && {
        substituted: r.substituted,
      }),
      ...(r.onlySubstitutes && {
        onlySubstitutes: r.onlySubstitutes,
      }),
      ...(r.removal && {
        removal: r.removal,
      }),
    });
    if (r.statusOnly || r.startupFatal)
      logForDebugging(cleanForDisplay(`${e}: ${r.path}: ${r.message}`), {
        level: r.startupFatal ? "error" : "warn",
      });
  };
}
//@ chunk-dcmhvw5a.js:468414-469299 placement
function parseRemoteManagedSettings(settingsContext) {
  let n = settingsContext?.remote
    ? settingsContext.remote()
    : getRemoteManagedSettingsSyncFromCache(
        (h) => parsePolicyObjectTolerant(h, "remote managed settings").settings,
      );
  let r =
    !settingsContext?.remote &&
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
  let s = settingsContext?.remote ? undefined : getLastLoadStatus();
  let a =
    (s?.state === "stale_cache" || s?.state === "failed") && s.failure.errorKind === "ruled_empty"
      ? serializeSettingsErrors(s.failure.rulings ?? [])
      : [];
  if (!n || Object.keys(n).length === 0)
    return {
      settings: null,
      errors: [...r, ...a],
      servedSnapshot: false,
      documentHasPolicyContent: false,
    };
  let { settings, errors, documentHasPolicyContent, onlySubstitutes } = parsePolicyObjectTolerant(
    n,
    "remote managed settings",
  );
  return {
    settings,
    errors: [...r, ...a, ...serializeSettingsErrors(errors)],
    servedSnapshot: isProjectedSnapshot(n),
    documentHasPolicyContent,
    ...(onlySubstitutes && {
      onlySubstitutes,
    }),
  };
}
//@ chunk-dcmhvw5a.js:469299-469393 placement
var PARENT_MANAGED_SETTINGS_SOURCE_LABEL = "parent managed settings";
var RETENTION_POLICY_KEYS = ["cleanupPeriodDays", "desktopSessionCleanupPeriodDays"];
//@ chunk-dcmhvw5a.js:469393-469828 placement
function parseParentManagedSettings(e) {
  let parentManaged = e.parentManaged;
  if (!parentManaged || Object.keys(parentManaged).length === 0)
    return {
      settings: null,
      errors: [],
    };
  let policyObjectTolerant = parsePolicyObjectTolerant(parentManaged, PARENT_MANAGED_SETTINGS_SOURCE_LABEL);
  for (let s of MANAGED_ONLY_KEYS)
    if (policyObjectTolerant.settings?.[s] !== undefined && !isInertManagedMcpServersNotice(s))
      policyObjectTolerant.errors.push({
        file: PARENT_MANAGED_SETTINGS_SOURCE_LABEL,
        path: s,
        message: `"${s}" is only honored from the organization's managed settings sources (server-managed, MDM, managed-settings.json), not from settings a host passes in, and was ignored here.`,
        severity: "warning",
        statusOnly: true,
      });
  return policyObjectTolerant;
}
//@ chunk-dcmhvw5a.js:469828-469856 placement
function parseParentTierWithOrganization(e) {
  return null;
}
//@ chunk-dcmhvw5a.js:469856-470165 placement
function parseInlineFlagSettings(settingsContext) {
  let flagInline = settingsContext.flagInline;
  if (!flagInline)
    return {
      settings: null,
      errors: [],
    };
  let r = isSdkEntrypoint();
  let inlineFlagParse = settingsContext.store.inlineFlagParse;
  if (inlineFlagParse?.inline !== flagInline || inlineFlagParse.desktopSupplied !== r) {
    inlineFlagParse = {
      inline: flagInline,
      desktopSupplied: r,
      parsed: parseCommandOutputAsSettings(flagInline),
    };
    settingsContext.store.inlineFlagParse = inlineFlagParse;
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
  accountCouldChangeDocument,
  parsePolicyObjectTolerant,
  parseRemoteManagedSettings,
  parseSettingsFile_3,
  loadManagedFileSettings,
  heldOffPluginIds,
  allowListEntriesThatVouch,
  parseInlineFlagSettings,
  parseParentManagedSettings,
  parseParentTierWithOrganization,
  managedFileSettingsDirs,
  isInertManagedMcpServersNotice,
  handleFileSystemError,
  MANAGED_ONLY_KEYS,
  dropManagedOnlyKeys,
  collectSettingsIssue,
  readMdmSettings,
  isPolicyContentKey,
};
