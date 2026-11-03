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
import {
  sep,
  sep as sep_2,
  sep as sep_3,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
} from "path";
import { coerceToPlainString, ql } from "../stringUtils.js";
import {
  FORCE_LOGIN_SETTING_KEYS,
  SettingsCacheStore,
  classifyConfigDirOwnership,
} from "../../bootstrap/stateSlices.js";
import { wS, En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { mt, Oo, buildPolicyTolerantSettingsSchema, Ao, isRestrictiveDisable, To } from "./types.js";
import {
  authoredPolicyContent,
  mergeAdminPolicies,
  hasEffectivePolicyContent,
  MERGEABLE_POLICY_KEYS,
  adminAuthoredPolicy,
  adminDocumentPresent,
  combinedLoadState,
  isPolicyTier,
  loadStateOf,
  hasPolicyContent,
  Ig,
  documentHasPolicyContent,
} from "./policySettings.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { logForDebugging } from "../debug.js";
import { logError } from "../log.js";
import { restrictionsOfUnvouchedDocument } from "../../services/remoteManagedSettings/unvouchedRestrictions.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { getPlatform } from "../platform.js";
import { rbr, SETTING_ALIASES } from "./marketplaceSettingsAliases.js";
import { ge } from "../identity.js";
import { WSL_MANAGED_SETTINGS_DIR, WSL_REG_EXE_PATH } from "./mdm/wslRegistry.js";
import { getManagedFilePath, anyAccountCouldWrite, js, resolveManagedPathSafely } from "./managedPath.js";
import { getAtPath } from "./managedRestrictionKeys.js";
import { cp } from "./managedEnvKeys.js";
import { fj } from "./settingsSourceTrust.js";
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

/**
 * 描述无效设置值（截断显示）。
 */
//@ chunk-dcmhvw5a.js:457142-457489 placement
function describeInvalidValues(e) {
  return e.map((n) => {
    let { invalidValue: invalidValue } = n,
      s = invalidValue !== void 0 && invalidValue !== null,
      a = s ? coerceToPlainString(invalidValue) : void 0,
      c = a === void 0 ? void 0 : ql(a);
    return {
      ...n,
      path: ql(n.path),
      message: ql(n.message),
      ...(n.expected !== void 0 && { expected: ql(n.expected) }),
      ...(n.suggestion !== void 0 && { suggestion: ql(n.suggestion) }),
      ...(s && (a === void 0 || typeof invalidValue === "string" || c !== a) && { invalidValue: c }),
    };
  });
}
//@ chunk-dcmhvw5a.js:457489-459256 placement
function loadManagedFileSettings(e) {
  if (e.diskless) return { settings: null, errors: [], documentHasPolicyContent: !1, loadState: "absent" };
  let n,
    r = (x) => {
      if (x === Eg) return !0;
      return ((n ??= e.asksOrganization?.() === !0), n && x());
    },
    s = !1,
    a = {},
    c = new Set(),
    g = loadManagedFileTiers(e, (x, K, q) => {
      if (x.settings === null) {
        if (!r(q)) return x;
        return (
          FORCE_LOGIN_SETTING_KEYS.forEach((ee) => c.add(ee)),
          { ...x, errors: describeInvalidValues(x.errors) }
        );
      }
      if (!r(q)) return (Object.assign(a, wS(x.settings, mt)), x);
      return ((s = !0), { ...x, settings: {}, errors: describeInvalidValues(x.errors) });
    });
  if (!s) return c.size === 0 ? g : { ...g, lostSignInPins: [...c] };
  let m = [],
    f = [],
    h = loadManagedFileTiers(e, (x, K, q) => {
      if (x.settings === null || !r(q)) return { ...x, settings: x.settings && {}, errors: [] };
      let ee = applyManagedOverrides(x, x.settings, K);
      for (let Z of FORCE_LOGIN_SETTING_KEYS)
        if (x.settings[Z] !== void 0 && ee.settings?.[Z] === void 0) c.add(Z);
      return (m.push([K, Object.keys(ee.settings ?? {})]), f.push(...ee.errors.slice(x.errors.length)), ee);
    }),
    y = [...g.errors, ...f],
    b = g.settings ?? {},
    S = h.settings ?? {},
    C = !authoredPolicyContent({ ...g, settings: b }) && { heldOnly: !0 };
  if (Object.keys(S).length === 0) return { ...g, errors: y, ...C, lostSignInPins: [...c] };
  let w = Object.keys(b).length === 0,
    L = {
      ...(w ? S : Uo(mergeAdminPolicies([b, S], "merge", !1, 0).admin, "parentSettingsBehavior")),
      ...wS(b, "parentSettingsBehavior"),
      ...a,
    },
    v = L,
    j = b;
  for (let [x, K] of m)
    for (let q of K)
      if (q in j && En(v[q], j[q]))
        y.push({
          file: x,
          path: ql(q),
          message: `In a cloud session that takes its managed settings from your organization, a managed settings file may only restrict: "${ql(q)}" was ignored in ${ql(x)}, since another managed settings document sets it and this one adds nothing to it.`,
          severity: "warning",
          statusOnly: !0,
          userWritable: !0,
        });
  return {
    ...(w ? h : g),
    settings: L,
    errors: y,
    ...C,
    lostSignInPins: [...c],
    ...(!hasEffectivePolicyContent(b) && { onlyHeldContent: !0 }),
    settingsNotHeld: b,
    heldOffPlugins: Object.keys(S.enabledPlugins ?? {}).filter((x) => b.enabledPlugins?.[x] === void 0),
    heldAllowLists: MERGEABLE_POLICY_KEYS.filter((x) => S[x] !== void 0 && b[x] === void 0),
  };
}
//@ chunk-dcmhvw5a.js:459256-459578 placement
function heldOffPluginIds(e) {
  let heldOffPlugins = e.store.policy.heldOffPlugins;
  if (heldOffPlugins !== void 0) return heldOffPlugins;
  let r = [];
  if (e.asksOrganization?.() === !0) {
    let s = e.file?.() ?? loadManagedFileSettings(e),
      a = [parseRemoteManagedSettings(e)?.settings?.enabledPlugins, e.mdm?.()?.settings?.enabledPlugins];
    r = (s.heldOffPlugins ?? []).filter((c) => a.every((g) => g?.[c] === void 0));
  }
  return ((e.store.policy.heldOffPlugins = r), r);
}
//@ chunk-dcmhvw5a.js:459578-459983 placement
function allowListEntriesThatVouch(e, n) {
  if (n === void 0 || n.length === 0) return n;
  try {
    let { policy: policy } = e.store;
    if (policy.vouchingAllowList === void 0) {
      let a = heldOrganizationDocument(e);
      policy.vouchingAllowList = { value: a };
    }
    let s = policy.vouchingAllowList.value;
    return s === null ? n : n.filter((a) => s.some((c) => En(c, a)));
  } catch (error) {
    return (
      (e.store.policy.vouchingAllowList = { value: [] }),
      logForDebugging("marketplace allow-list: which entries vouch could not be told; none does", {
        level: "error",
      }),
      logError(error),
      []
    );
  }
}
/**
 * 等待组织确认的托管文件设置。
 */
//@ chunk-dcmhvw5a.js:459983-460296 placement
function heldOrganizationDocument(e) {
  if (e.asksOrganization?.() !== !0) return null;
  let n = e.file?.() ?? loadManagedFileSettings(e);
  if (n.settings === null || n.heldAllowLists?.includes("strictKnownMarketplaces") !== !0) return null;
  let r = Uo(n.settings, "strictKnownMarketplaces");
  return (
    adminAuthoredPolicy({ ...e, store: new SettingsCacheStore(), file: () => ({ ...n, settings: r }) })
      ?.strictKnownMarketplaces ?? []
  );
}
/**
 * 应用托管设置覆盖并记录。
 */
//@ chunk-dcmhvw5a.js:460296-460944 placement
function applyManagedOverrides(e, n, r) {
  let s = restrictionsOfUnvouchedDocument(n),
    mapped = describeManagedOverrides(n, s).map((c) => ({ ...c, key: ql(c.key) }));
  if (mapped.length === 0) return e;
  if (!eg.has(r))
    (eg.add(r),
      logForDebugging(
        `${ql(r)}: not taken as written: ${mapped.map(({ key: key }) => key).join(", ")}: this session takes its managed settings from its organization, and a managed settings file may only restrict there`,
        { level: "warn" },
      ));
  return {
    ...e,
    settings: s,
    errors: [
      ...e.errors,
      ...mapped
        .filter(({ key: key }) => !isInertManagedMcpServersNotice(key))
        .map(({ key: key, became: became }) => ({
          file: r,
          path: key,
          message: `In a cloud session that takes its managed settings from your organization, a managed settings file may only restrict: "${key}" ${became} in ${ql(r)}.`,
          severity: "warning",
          statusOnly: !0,
          userWritable: !0,
        })),
    ],
  };
}
/**
 * 描述托管设置覆盖产生的变化。
 */
//@ chunk-dcmhvw5a.js:460944-461419 placement
function describeManagedOverrides(e, n) {
  let r = (s, a) =>
    a === "disableAllHooks" && e.disableAllHooks === !0 && n.allowManagedHooksOnly === !0
      ? 'was taken as "allowManagedHooksOnly"'
      : a === "allowManagedHooksOnly" && s === !0
        ? 'was set by "disableAllHooks"'
        : s === void 0
          ? "was ignored"
          : "was kept in part";
  return Object.keys(e).flatMap((s) => {
    let a = e[s],
      c = n[s];
    if (En(a, c)) return [];
    if (!isPlainObject_2(a) || !isPlainObject_2(c)) return [{ key: s, became: r(c, s) }];
    return Object.keys(a)
      .filter((g) => !En(a[g], c[g]))
      .map((g) => ({ key: `${s}.${g}`, became: r(c[g], s) }));
  });
}
//@ chunk-dcmhvw5a.js:461419-461466 placement = execTmux (1)
function shouldReadWindowsManagedSettingsFromWsl(e) {
  return getPlatform() === "wsl" && (!e || rbr());
}
//@ chunk-dcmhvw5a.js:461466-461500 placement
var eg = ge(new Set(), (e) => e.clear());
/**
 * 读取 MDM 设置文档（等待组织确认的除外）。
 */
//@ chunk-dcmhvw5a.js:461500-461949 placement
function loadManagedFileTiers(e, n) {
  let r = e.mdm?.()?.heldDocuments ?? [];
  if (shouldReadWindowsManagedSettingsFromWsl(e.asksOrganization?.() === !0)) {
    let s = adminDocumentPresent(readMdmSettings({ ...e, file: () => ({ settings: null, errors: [] }) }));
    if (e.wslInherits?.()) {
      let a =
          r.length === 0
            ? void 0
            : s || adminDocumentPresent(loadManagedFileSettingsFromDir(WSL_MANAGED_SETTINGS_DIR, e.store)),
        c = loadManagedFileSettingsFromDir(WSL_MANAGED_SETTINGS_DIR, e.store, n, a ? r : []);
      if (a ?? (adminDocumentPresent(c) || s)) return c;
      let g = loadManagedFileSettingsFromDir(getManagedFilePath(), e.store, n, r);
      return {
        ...g,
        errors: [...c.errors, ...g.errors],
        loadState: combinedLoadState(c.loadState, g.loadState),
      };
    }
    if (s) return loadManagedFileSettingsFromDir(null, e.store, n, r);
  }
  return loadManagedFileSettingsFromDir(getManagedFilePath(), e.store, n, r);
}
//@ chunk-dcmhvw5a.js:461949-461963 placement
var Eg = () => !0;
/**
 * 合并托管设置层并收集错误。
 */
//@ chunk-dcmhvw5a.js:461963-462846 placement
function mergeManagedSettingsLayer(e, n, r) {
  r.push(...n.errors);
  let { settings: settings } = n;
  if (!settings || Object.keys(settings).length === 0) return;
  for (let [a, c] of Oo) {
    let parts = a.split(".");
    if (getAtPath(settings, parts) === void 0) continue;
    let found = n.errors.find((error) => error.substituted && error.path === a),
      f = found !== void 0,
      h = getAtPath(e.merged, parts);
    if (f && h !== void 0 && !e.floors.has(a)) {
      let at = parts.at(-1);
      if (c.inert.has(c.read(h))) {
        (cp(settings, parts),
          r.push({
            file: found.file,
            path: a,
            message: `That substitute is not applied: "${at}" keeps the value an earlier managed-settings document of this folder wrote.`,
            severity: "warning",
            statusOnly: !0,
          }));
        continue;
      }
      r.push({
        file: found.file,
        path: a,
        message: `That substitute also displaces the wider "${at}" an earlier managed-settings document of this folder wrote, until this document is fixed.`,
        severity: "warning",
        statusOnly: !0,
      });
    }
    if (f) e.floors.add(a);
    else e.floors.delete(a);
  }
  if (
    ((e.merged = fj(e.merged, settings, settingsMergeCustomizer)),
    (e.found = !0),
    hasEffectivePolicyContent(settings) && !n.errors.some((error) => error.onlySubstitutes))
  )
    e.authored = !0;
}
//@ chunk-dcmhvw5a.js:462846-462901 placement = execTmux (1)
function managedFileSettingsDirs(e) {
  return getPlatform() === "wsl" && e
    ? [WSL_MANAGED_SETTINGS_DIR, getManagedFilePath()]
    : [getManagedFilePath()];
}
//@ chunk-dcmhvw5a.js:462901-462964 placement
function isManagedSettingsDropInName(e) {
  return e.endsWith(".json") && !e.startsWith(".");
}
//@ chunk-dcmhvw5a.js:462964-463032 placement
function isManagedSettingsDropInEntry(e) {
  return (e.isFile() || e.isSymbolicLink()) && isManagedSettingsDropInName(e.name);
}
//@ chunk-dcmhvw5a.js:463032-463320 placement
function noteManagedDocumentOwnership(e, n, r, s) {
  let managedFileProtections = e.managedFileProtections,
    c = {
      file: s,
      folder:
        e.managedDocumentLinks.folderIsLink.get(n) === !1
          ? managedFileProtections.folderOwners.get(n)
          : void 0,
      posix: getPlatform() !== "windows" && !r.startsWith(WSL_MANAGED_SETTINGS_DIR),
    };
  return (
    managedFileProtections.note(
      r,
      classifyConfigDirOwnership({ ...c, linked: e.managedDocumentLinks.isLinked(r) }),
    ),
    () => accountCouldChangeDocument(e, r, c.file, c.folder)
  );
}
//@ chunk-dcmhvw5a.js:463320-463982 placement
function accountCouldChangeDocument(e, n, r, s) {
  let a = process.geteuid?.(),
    c = process.getuid?.();
  if (
    shouldReadWindowsManagedSettingsFromWsl(!0) &&
    (n === WSL_REG_EXE_PATH || n.startsWith(`${WSL_MANAGED_SETTINGS_DIR}${sep_2}`))
  )
    return sg;
  if (a === 0 || c === 0) return !0;
  if (getPlatform() === "windows" || a === void 0) return sg;
  let linkOf = e.managedDocumentLinks.linkOf(n),
    f = {
      uids: c === void 0 || c === a ? [a] : [a, c],
      groups: () => [
        ...(process.getgroups?.() ?? []),
        ...(process.getegid ? [process.getegid()] : []),
        ...(process.getgid ? [process.getgid()] : []),
      ],
    };
  if (anyAccountCouldWrite(f, r, linkOf === null ? s : r) !== !1 || linkOf?.kind === "unverified") return !0;
  let y = (e.policy.writableNow ??= new Map()),
    b = y.get(n) ?? js(n);
  if ((y.set(n, b), b !== "no")) return !0;
  let S = (e.policy.walkedDocuments ??= new Map()),
    C = S.get(n) ?? resolveManagedPathSafely(n, f, (e.policy.certainDirectories ??= new Map()));
  return (S.set(n, C), C);
}
//@ chunk-dcmhvw5a.js:463982-463992 placement
var sg = !1;
//@ chunk-dcmhvw5a.js:463992-464135 placement
function noteWalkedManagedPath(e, n, r, s) {
  let managedDocumentLinks = e.managedDocumentLinks;
  managedDocumentLinks.noteWalked(join_2(n, ...r), () =>
    resolvePathStepsSync(n, r, s, managedDocumentLinks.folderIsLink, e.managedFileProtections.folderOwners),
  );
}
//@ chunk-dcmhvw5a.js:464135-465251 placement
function loadManagedFileSettingsFromDir(e, n, r = (a) => a, s = []) {
  let a = [],
    c = { merged: {}, found: !1, authored: !1, floors: new Set() },
    g = !1,
    m = "absent";
  for (let { path: path, parsed: parsed } of s)
    (mergeManagedSettingsLayer(c, r(parsed, path, Eg), a),
      (g ||= isPolicyTier(parsed)),
      (m = combinedLoadState(m, loadStateOf(parsed))));
  if (e === null) return managedLoadResult(c, a, g, m, n);
  let f = parseSettingsFile_3(join_2(e, "managed-settings.json"), n, void 0, !0),
    h = () => !1;
  if (loadStateOf(f) !== "absent")
    (noteWalkedManagedPath(n, e, ["managed-settings.json"]),
      (h = noteManagedDocumentOwnership(n, resolve_2(e), join_2(e, "managed-settings.json"), f.fileOwner)));
  (mergeManagedSettingsLayer(c, r(f, join_2(e, "managed-settings.json"), h), a),
    (g ||= isPolicyTier(f)),
    (m = combinedLoadState(m, loadStateOf(f))));
  let y = join_2(e, "managed-settings.d");
  try {
    let folderListingForPolicyWalk = n.folderListingForPolicyWalk(y),
      S,
      C;
    if (folderListingForPolicyWalk !== void 0) S = folderListingForPolicyWalk;
    else {
      let filtered = getFsImplementation().readdirSync(y).filter(isManagedSettingsDropInEntry);
      ((S = filtered.map((L) => L.name).sort()),
        (C = new Set(filtered.filter((L) => !L.isFile()).map((L) => L.name))),
        n.noteWalkListing(y, S));
    }
    for (let w of S) {
      let L = parseSettingsFile_3(join_2(y, w), n, void 0, !0),
        v = () => !1;
      if (loadStateOf(L) !== "absent")
        (noteWalkedManagedPath(n, e, ["managed-settings.d", w], C?.has(w)),
          (v = noteManagedDocumentOwnership(n, y, join_2(y, w), L.fileOwner)));
      (mergeManagedSettingsLayer(c, r(L, join_2(y, w), v), a),
        (g ||= isPolicyTier(L)),
        (m = combinedLoadState(m, loadStateOf(L))));
    }
  } catch (error) {
    let S = getErrnoCode(error);
    if (S !== "ENOENT" && S !== "ENOTDIR")
      (logForDebugging(`managed-settings.d read failed: ${error}`, { level: "error" }),
        a.push(unreadableSettingsFileError(y, error, "directory")),
        (m = "didNotLoad"),
        r({ settings: null, errors: [] }, y, () => !0));
  }
  return managedLoadResult(c, a, g, m, n);
}
//@ chunk-dcmhvw5a.js:465251-465511 placement
function managedLoadResult(e, n, r, s, a) {
  let c = e.found && hasPolicyContent(e.merged) ? e.merged : null;
  if (c?.forceLoginOrgUUID !== void 0) a.managedFileProtections.setsOrgPin = !0;
  return {
    settings: c,
    errors: n,
    documentHasPolicyContent: r,
    loadState: s,
    ...(c !== null && !e.authored && hasEffectivePolicyContent(c) && { onlySubstitutes: !0 }),
  };
}
//@ chunk-dcmhvw5a.js:465511-465614 placement
function handleFileSystemError(e, n) {
  if (isENOENT(e)) logMissingSettingsFile(n);
  else logForDebugging(ql(`settings file read failed at ${n}: ${e}`), { level: "error" });
}
/**
 * 带缓存地解析一个设置文件（pinned 内容按 \0pinned 另存一份），返回 settings 的深拷贝与错误列表。
 */
//@ chunk-dcmhvw5a.js:465614-465845 placement = parseSettingsFile (0.261)
function parseSettingsFile_3(e, n, r, s) {
  let a = r !== void 0 ? `${e}\x00pinned` : e,
    c = n.parsedFiles.get(a);
  if (c) return { ...c, settings: c.settings ? clone(c.settings) : null };
  let g = parseSettingsFileUncached(e, r, s);
  return (n.parsedFiles.set(a, g), { ...g, settings: g.settings ? clone(g.settings) : null });
}
/**
 * 读取 MDM 设置及加载状态。
 */
//@ chunk-dcmhvw5a.js:465845-466193 placement
function readMdmSettings(e) {
  let n = e.mdm?.();
  if (!n) return { settings: null, errors: [], documentHasPolicyContent: !1, loadState: "absent" };
  return {
    settings: n.settings && Object.keys(n.settings).length > 0 ? n.settings : null,
    errors: mdmPolicyErrors(
      n,
      () => parseRemoteManagedSettings(e),
      () => e.file?.() ?? loadManagedFileSettings(e),
    ),
    documentHasPolicyContent: isPolicyTier(n),
    loadState: loadStateOf(n),
    ...(n.onlySubstitutes && { onlySubstitutes: n.onlySubstitutes }),
  };
}
//@ chunk-dcmhvw5a.js:466193-466332 placement
function parsePolicyObjectTolerant(e, n) {
  let r = weakMap_2.get(e),
    s = r?.get(n);
  if (s) return cloneManagedLoadResult(s);
  let a = parseManagedSettingsFile(e, n);
  if (r) r.set(n, a);
  else weakMap_2.set(e, new Map([[n, a]]));
  return cloneManagedLoadResult(a);
}
//@ chunk-dcmhvw5a.js:466332-466576 placement
function cloneManagedLoadResult(e) {
  return {
    settings: e.settings && clone(e.settings),
    errors: e.errors.map((error) => ({ ...error })),
    documentHasPolicyContent: e.documentHasPolicyContent,
    loadState: e.loadState,
    removed: e.removed,
    ...(e.onlySubstitutes && { onlySubstitutes: e.onlySubstitutes }),
  };
}
//@ chunk-dcmhvw5a.js:466576-466595 placement
var weakMap_2 = new WeakMap();
/**
 * 解析托管设置文件（策略来源校验）。
 */
//@ chunk-dcmhvw5a.js:466595-467211 placement
function parseManagedSettingsFile(e, n) {
  let r = clone(e),
    s = validateSettingsDocument(r, n, { skipMcpServerEntryFilter: !0, policySource: !0 }),
    a = [],
    safeParse = buildPolicyTolerantSettingsSchema(collectSettingsIssue(n, a), n, r).safeParse(r);
  if (!safeParse.success)
    return {
      settings: null,
      errors: [...s, ...formatZodError(safeParse.error, n)],
      documentHasPolicyContent: !1,
      loadState: "didNotLoad",
      removed: [],
    };
  let g = [...Ig(s, safeParse.data, a), ...a],
    m = e,
    f = Object.keys(safeParse.data).length > 0 ? safeParse.data : null;
  return {
    settings: f,
    errors: g,
    documentHasPolicyContent: documentHasPolicyContent(e, safeParse.data),
    loadState: "loaded",
    removed: Object.keys(m).filter(
      (h) =>
        isPolicyContentKey(h, m[h]) &&
        safeParse.data[h] === void 0 &&
        g.every((y) => y.statusOnly || (y.path !== h && !y.path.startsWith(`${h}.`))),
    ),
    ...(f !== null && a.some((h) => h.onlySubstitutes) && { onlySubstitutes: !0 }),
  };
}
//@ chunk-dcmhvw5a.js:467211-467340 placement
function isPolicyContentKey(e, n) {
  let r = Ao();
  return r.includes(e) ||
    SETTING_ALIASES.some(({ alias: alias, canonical: canonical }) => alias === e && r.includes(canonical))
    ? isRestrictiveDisable(e, n)
    : To(e) && isPolicyContentObject(e, n);
}
//@ chunk-dcmhvw5a.js:467340-467490 placement
function isPolicyContentObject(e, n) {
  return (
    n === null ||
    (isPlainObject_2(n) &&
      Object.keys(n).length > 0 &&
      Object.entries(n).every(([r, s]) => {
        let a = `${e}.${r}`;
        return isRestrictiveDisable(a, s) || (To(a) && isPolicyContentObject(a, s));
      }))
  );
}
//@ chunk-dcmhvw5a.js:467490-467582 placement
function isInertManagedMcpServersNotice(e) {
  return isSdkEntrypoint() && (e === "managedMcpServers" || e.startsWith("managedMcpServers."));
}
//@ chunk-dcmhvw5a.js:467582-467702 placement
var MANAGED_ONLY_KEYS = ["managedMcpServers", "isolation", "attributionProjectPolicy"],
  NON_MANAGED_DROPPED_KEYS = [...MANAGED_ONLY_KEYS, "deniedModels", "availableModelsMatch"];
//@ chunk-dcmhvw5a.js:467702-467957 placement
function dropManagedOnlyKeys(e, n) {
  if (!isPlainObject_2(e)) return [];
  let r = [];
  for (let s of NON_MANAGED_DROPPED_KEYS) {
    if (!(s in e)) continue;
    if ((delete e[s], !isInertManagedMcpServersNotice(s)))
      r.push({
        file: n,
        path: s,
        message: `"${s}" is only honored from managed settings and was ignored here.`,
        severity: "warning",
        preserveOnWrite: !0,
      });
  }
  return r;
}
/**
 * 收集设置问题为警告。
 */
//@ chunk-dcmhvw5a.js:467957-468414 placement
function collectSettingsIssue(e, n) {
  return (r) => {
    if (isInertManagedMcpServersNotice(r.path)) return;
    if (
      (n.push({
        file: e,
        path: r.path,
        message: r.message,
        severity: "warning",
        ...(r.statusOnly && { statusOnly: r.statusOnly }),
        ...(r.startupFatal && { startupFatal: r.startupFatal }),
        ...(r.substituted && { substituted: r.substituted }),
        ...(r.onlySubstitutes && { onlySubstitutes: r.onlySubstitutes }),
        ...(r.removal && { removal: r.removal }),
      }),
      r.statusOnly || r.startupFatal)
    )
      logForDebugging(ql(`${e}: ${r.path}: ${r.message}`), { level: r.startupFatal ? "error" : "warn" });
  };
}
//@ chunk-dcmhvw5a.js:468414-469299 placement
function parseRemoteManagedSettings(e) {
  let n = e?.remote
      ? e.remote()
      : getRemoteManagedSettingsSyncFromCache(
          (h) => parsePolicyObjectTolerant(h, "remote managed settings").settings,
        ),
    r =
      !e?.remote &&
      !isInertManagedMcpServersNotice("managedMcpServers") &&
      unverifiedRemoteCacheWithholdsProvisions()
        ? [
            {
              file: "remote managed settings",
              path: "managedMcpServers",
              message:
                "The organization's MCP servers in the cached remote settings are withheld until the server confirms them this session; they connect as soon as it does.",
              severity: "warning",
              statusOnly: !0,
            },
          ]
        : [],
    s = e?.remote ? void 0 : getLastLoadStatus(),
    a =
      (s?.state === "stale_cache" || s?.state === "failed") && s.failure.errorKind === "ruled_empty"
        ? serializeSettingsErrors(s.failure.rulings ?? [])
        : [];
  if (!n || Object.keys(n).length === 0)
    return { settings: null, errors: [...r, ...a], servedSnapshot: !1, documentHasPolicyContent: !1 };
  let {
    settings: settings,
    errors: errors,
    documentHasPolicyContent: documentHasPolicyContent,
    onlySubstitutes: onlySubstitutes,
  } = parsePolicyObjectTolerant(n, "remote managed settings");
  return {
    settings: settings,
    errors: [...r, ...a, ...serializeSettingsErrors(errors)],
    servedSnapshot: isProjectedSnapshot(n),
    documentHasPolicyContent: documentHasPolicyContent,
    ...(onlySubstitutes && { onlySubstitutes: onlySubstitutes }),
  };
}
//@ chunk-dcmhvw5a.js:469299-469393 placement
var PARENT_MANAGED_SETTINGS_SOURCE_LABEL = "parent managed settings",
  RETENTION_POLICY_KEYS = ["cleanupPeriodDays", "desktopSessionCleanupPeriodDays"];
//@ chunk-dcmhvw5a.js:469393-469828 placement
function parseParentManagedSettings(e) {
  let parentManaged = e.parentManaged;
  if (!parentManaged || Object.keys(parentManaged).length === 0) return { settings: null, errors: [] };
  let r = parsePolicyObjectTolerant(parentManaged, PARENT_MANAGED_SETTINGS_SOURCE_LABEL);
  for (let s of MANAGED_ONLY_KEYS)
    if (r.settings?.[s] !== void 0 && !isInertManagedMcpServersNotice(s))
      r.errors.push({
        file: PARENT_MANAGED_SETTINGS_SOURCE_LABEL,
        path: s,
        message: `"${s}" is only honored from the organization's managed settings sources (server-managed, MDM, managed-settings.json), not from settings a host passes in, and was ignored here.`,
        severity: "warning",
        statusOnly: !0,
      });
  return r;
}
//@ chunk-dcmhvw5a.js:469828-469856 placement
function parseParentTierWithOrganization(e) {
  return null;
}
//@ chunk-dcmhvw5a.js:469856-470165 placement
function parseInlineFlagSettings(e) {
  let flagInline = e.flagInline;
  if (!flagInline) return { settings: null, errors: [] };
  let r = isSdkEntrypoint(),
    inlineFlagParse = e.store.inlineFlagParse;
  if (inlineFlagParse?.inline !== flagInline || inlineFlagParse.desktopSupplied !== r)
    ((inlineFlagParse = {
      inline: flagInline,
      desktopSupplied: r,
      parsed: parseCommandOutputAsSettings(flagInline),
    }),
      (e.store.inlineFlagParse = inlineFlagParse));
  let { settings: settings, errors: errors } = inlineFlagParse.parsed;
  return { settings: settings && clone(settings), errors: errors.map((g) => ({ ...g })) };
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
