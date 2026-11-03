/**
 * utils/settings/settingsFileParsing.ts
 *
 * 2.1.316 新增：设置文件解析（托管文档不可解析的处理、wslInheritsWindowsSettings）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (31)
 * attribution: placement 31
 */
import {
  dirname,
  dirname as dirname_2,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  basename,
  basename as basename_2,
} from "path";
import { homedir, homedir as homedir_2 } from "os";
import { vetRepoSettingsPath, getFsImplementation, safeResolvePath } from "../fsOperations.js";
import { isSpecialPath, openBoundRead } from "../fsBoundRead.js";
import { readFileSync } from "../fileRead.js";
import {
  MAX_SETTINGS_JSON_BYTES,
  getRelativeSettingsFilePathForSource,
  getManagedSettingsFilePath,
} from "./settings.js";
import { isUnavailableErrorCode } from "./managedEnvKeys.js";
import { getErrnoCode, isENOENT } from "../errors.js";
import { clone } from "../slowOperations.js";
import { safeParseJSON } from "../json.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { validateSettingsDocument } from "./hooksValidation.js";
import { buildPolicyTolerantSettingsSchema, getSettingsSchemaForDocument } from "./types.js";
import { collectSettingsIssue, dropManagedOnlyKeys, handleFileSystemError } from "./managedFileSettings.js";
import { formatZodError } from "./validation.js";
import { Ig, documentHasPolicyContent, authoredPolicyContent } from "./policySettings.js";
import { getClaudeConfigDirOrNull, getClaudeConfigDir } from "../envUtils.js";
import { Mn } from "../pathClassification.js";
import { Tm } from "../windowsUncPaths.js";
import { logForDebugging } from "../debug.js";
import { ql } from "../stringUtils.js";
import { mergeClients } from "../hostScoped.js";
import { WSL_MANAGED_SETTINGS_DIR } from "./mdm/wslRegistry.js";
import { NoProjectDirectoryError } from "../../bootstrap/sessionSlices.js";
import { is } from "./commandSyncNames.js";
import { uniq } from "../collections.js";
import { env } from "../env.js";

//@ chunk-dcmhvw5a.js:470784-471242 placement = parseSettingsFileUncached (0.417)
function parseSettingsFileIfChanged(e, n, r = !1) {
  let s;
  try {
    if (!isInClaudeConfigHome(e)) vetRepoSettingsPath(getFsImplementation(), e);
    let {
      resolvedPath: resolvedPath,
      isSymlink: isSymlink,
      isCanonical: isCanonical,
    } = safeResolvePath(getFsImplementation(), e);
    if (!r && isSymlink && (!isCanonical || isSpecialPath(resolvedPath)))
      return (n.delete(e), settingsFileRedirectedError(e));
    let h;
    if (r) h = readFileSync(resolvedPath, MAX_SETTINGS_JSON_BYTES);
    else h = openBoundRead(resolvedPath, isCanonical, MAX_SETTINGS_JSON_BYTES, isSymlink);
    if (h === null) return (n.delete(e), settingsFileUnverifiedError(e));
    s = h;
  } catch (error) {
    if (!isUnavailableErrorCode(getErrnoCode(error))) n.delete(e);
    return settingsReadErrorResult(error, e);
  }
  let a = n.get(e),
    c = a !== void 0 && a.content === s ? a.parsed : parseSettingsContent(s, e);
  return (
    n.set(e, { content: s, parsed: c }),
    { settings: c.settings ? clone(c.settings) : null, errors: c.errors, textRead: s }
  );
}
//@ chunk-dcmhvw5a.js:471242-471331 placement
function settingsFileRedirectedError(e) {
  return makeFatalSettingsLoadResult(e, `Settings file leads to another host and was not read: ${e}`);
}
//@ chunk-dcmhvw5a.js:471331-471458 placement
function settingsFileUnverifiedError(e) {
  return makeFatalSettingsLoadResult(
    e,
    `Settings file could not be verified against the route its check resolved, and was not read: ${e}`,
  );
}
//@ chunk-dcmhvw5a.js:471458-471573 placement
function makeFatalSettingsLoadResult(e, n) {
  return {
    settings: null,
    errors: [{ file: e, path: "", message: n, severity: "fatal" }],
    loadState: "didNotLoad",
  };
}
/**
 * 把设置文件文本解析成对象并用 zod 校验；托管文档走宽容 schema（无效值按限制性值处理，记录 documentHasPolicyContent），普通文档校验失败返回 settings:null 与格式化错误。
 */
//@ chunk-dcmhvw5a.js:471573-472322 placement
function parseSettingsContent(e, n, r) {
  if (e.trim() === "") return { settings: {}, errors: [], loadState: "loaded" };
  let s = safeParseJSON(e, !1);
  if (r) {
    if (!isPlainObject_2(s))
      return { settings: null, errors: [unparseablePolicyDocumentError(n)], loadState: "didNotLoad" };
    let m = clone(s),
      f = validateSettingsDocument(m, n, { skipMcpServerEntryFilter: !0, policySource: !0 }),
      h = [],
      safeParse = buildPolicyTolerantSettingsSchema(collectSettingsIssue(n, h), n, m).safeParse(m);
    if (!safeParse.success)
      return {
        settings: null,
        errors: [...f, ...formatZodError(safeParse.error, n)],
        documentHasPolicyContent: !1,
        loadState: "didNotLoad",
      };
    return {
      settings: safeParse.data,
      errors: [...Ig(f, safeParse.data, h), ...h],
      documentHasPolicyContent: documentHasPolicyContent(s, safeParse.data),
      loadState: "loaded",
    };
  }
  let a = clone(s),
    c = [...dropManagedOnlyKeys(a, n), ...validateSettingsDocument(a, n)],
    safeParse = getSettingsSchemaForDocument(a).safeParse(a);
  if (!safeParse.success) {
    let m = formatZodError(safeParse.error, n);
    return { settings: null, errors: [...c, ...m] };
  }
  if (c.some((m) => m.severity === "fatal")) return { settings: null, errors: c };
  return { settings: safeParse.data, errors: c };
}
//@ chunk-dcmhvw5a.js:472322-472732 placement
function unparseablePolicyDocumentError(e, { userWritable: n = !1 } = {}) {
  return n
    ? {
        file: e,
        path: "",
        message: `Managed settings document (${e}) could not be parsed as a JSON object; none of its settings are in effect. Fix or remove it.`,
        severity: "warning",
        statusOnly: !0,
        userWritable: !0,
      }
    : {
        file: e,
        path: "",
        message:
          "Managed settings document could not be parsed as a JSON object; none of its settings are in effect. Fix or remove it.",
        startupFatal: !0,
      };
}
//@ chunk-dcmhvw5a.js:472732-472835 placement
function isInClaudeConfigHome(e) {
  let n = getClaudeConfigDirOrNull();
  if (n === null) return !1;
  let r = Mn(dirname(resolve_2(e))),
    s = resolve_2(n);
  return r === Mn(s) || r === getPhysicalPathCached(s);
}
//@ chunk-dcmhvw5a.js:472835-472842 placement
var Vs;
//@ chunk-dcmhvw5a.js:472842-472955 placement
function getPhysicalPathCached(e) {
  if (Vs?.lexical !== e) {
    let n = dirname(e);
    Vs = { lexical: e, physical: Mn(join_2(Tm(n) ?? n, basename(e))) };
  }
  return Vs.physical;
}
//@ chunk-dcmhvw5a.js:472955-473055 placement = handleFileSystemError (0.788)
function logMissingSettingsFile(e) {
  logForDebugging(ql(`Broken symlink or missing file encountered for settings.json at path: ${e}`));
}
//@ chunk-dcmhvw5a.js:473055-473121 placement
function missingSettingsFileResult() {
  return { settings: null, errors: [], loadState: "absent" };
}
//@ chunk-dcmhvw5a.js:473121-473249 placement
function settingsReadErrorResult(e, n) {
  if (mergeClients(e)) throw e;
  if ((handleFileSystemError(e, n), isENOENT(e))) return missingSettingsFileResult();
  return { settings: null, errors: [unreadableSettingsFileError(n, e)], loadState: "didNotLoad" };
}
//@ chunk-dcmhvw5a.js:473249-473514 placement
function unreadableSettingsFileError(e, n, r = "file") {
  return {
    file: e,
    path: "",
    message: `${r === "directory" ? "Managed settings drop-in directory" : "Settings file"} could not be read: ${n instanceof Error ? n.message : String(n)}`,
    severity: "fatal",
    errorClass: "unreadable",
    ...(getErrnoCode(n) !== void 0 && { errno: getErrnoCode(n) }),
  };
}
//@ chunk-dcmhvw5a.js:473514-474089 placement
function unreadableWslFlagWithoutPolicyError(e) {
  return {
    file: e,
    path: "wslInheritsWindowsSettings",
    message: `"wslInheritsWindowsSettings" in ${e} holds a value that cannot be read (it takes true or false) and no Windows administrator policy is deployed beside it (HKLM or ${WSL_MANAGED_SETTINGS_DIR}), so whether WSL inherits Windows policy is unknown: no Windows or managed-file policy is in effect (/etc/claude-code is not read beneath it), and unless server-managed settings supply the policy \u2014 they apply regardless \u2014 sign-in and policy enforcement fail closed until the flag is fixed.`,
    severity: "fatal",
    statusOnly: !0,
  };
}
//@ chunk-dcmhvw5a.js:474089-474171 placement
function pg(e) {
  return e.path === "wslInheritsWindowsSettings" && e.severity === "fatal";
}
//@ chunk-dcmhvw5a.js:474171-474380 placement
function mdmPolicyErrors(e, n, r) {
  let s = e.withheldFlagRecord && r().heldOnly === !0 ? [...e.errors, e.withheldFlagRecord] : e.errors;
  if (!s.some(pg)) return s;
  if (!authoredPolicyContent(n())) return s;
  return s.map((a) => (pg(a) ? { ...a, severity: "warning" } : a));
}
//@ chunk-dcmhvw5a.js:474380-474729 placement
function getSettingsRootPathForSource(e, n) {
  switch (e) {
    case "userSettings":
      return resolve_2(getClaudeConfigDir());
    case "policySettings":
      return resolve_2(requireCwd(n));
    case "projectSettings":
      return resolve_2(n.projectConfigDir ?? requireCwd(n));
    case "localSettings": {
      if (n.projectConfigDir !== void 0) return resolve_2(n.projectConfigDir);
      return resolveLocalSettingsStoreRoot(requireCwd(n), n.canonicalGitRoot);
    }
    case "flagSettings":
      return n.flagPath ? dirname(resolve_2(n.flagPath)) : resolve_2(requireCwd(n));
  }
}
//@ chunk-dcmhvw5a.js:474729-474787 placement
function requireCwd(e) {
  if (e.cwd === null) throw new NoProjectDirectoryError();
  return e.cwd;
}
//@ chunk-dcmhvw5a.js:474787-474909 placement
function resolveLocalSettingsStoreRoot(e, n) {
  let r = localSettingsStoreRootBeforeOwnership(e, n);
  if (r.decided !== void 0) return r.decided;
  if (!canonicalRootIsOwnedByProcessUser(r.root)) return r.cwdResolved;
  return r.root;
}
//@ chunk-dcmhvw5a.js:474909-475128 placement
function localSettingsStoreRootBeforeOwnership(e, n) {
  let r = n?.(e);
  if (!r) return { decided: resolve_2(e) };
  let s = resolve_2(r),
    a = resolve_2(e);
  if (s === a) return { decided: s };
  let c;
  try {
    c = normalizedRealHomeDir();
  } catch {
    return { decided: a };
  }
  if (s === c) return { decided: a };
  return { decided: void 0, root: s, cwdResolved: a };
}
//@ chunk-dcmhvw5a.js:475128-475202 placement
function canonicalRootOwnerUids(e) {
  return is().localStoreProbes.canonicalRootOwnerUids(e, canonicalRootOwners);
}
//@ chunk-dcmhvw5a.js:475202-475369 placement
function canonicalRootOwners(e) {
  let n = getFsImplementation(),
    r = null;
  try {
    r = n.lstatSync(join_2(e, ".claude")).uid;
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  return { rootUid: n.statSync(e).uid, gitEntryUid: CA(e), claudeEntryUid: r };
}
//@ chunk-dcmhvw5a.js:475369-475454 placement
function CA(e) {
  let n = getFsImplementation();
  try {
    return n.lstatSync(join_2(e, ".git")).uid;
  } catch (error) {
    throw error;
  }
}
//@ chunk-dcmhvw5a.js:475454-476578 placement
function canonicalRootIsOwnedByProcessUser(e) {
  if (typeof process.getuid !== "function" && typeof process.geteuid !== "function")
    return (
      logForDebugging(
        `localSettings: not canonicalizing the consent store to ${e} \u2014 this platform has no uid semantics to verify directory ownership with, so the store stays at the session cwd (canonicalization is POSIX-only)`,
        { level: "warn" },
      ),
      !1
    );
  let n = typeof process.geteuid === "function" ? process.geteuid() : process.getuid?.();
  try {
    let {
      rootUid: rootUid,
      gitEntryUid: gitEntryUid,
      claudeEntryUid: claudeEntryUid,
    } = canonicalRootOwnerUids(e);
    if (rootUid === n && gitEntryUid === n && (claudeEntryUid === null || claudeEntryUid === n)) return !0;
    return (
      logForDebugging(
        `localSettings: not canonicalizing the consent store to ${e} \u2014 it (uid ${rootUid}), its .git entry (uid ${gitEntryUid}), or its .claude entry (uid ${claudeEntryUid ?? "absent"}) is not owned by the current user (uid ${n}); the store stays at the session cwd (the pre-canonicalization behavior). If you own this repo, chown it (including .git and .claude) or run from a directory you own.`,
        { level: "warn" },
      ),
      !1
    );
  } catch (error) {
    return (
      logForDebugging(
        `localSettings: not canonicalizing the consent store to ${e} \u2014 its ownership could not be verified (${error instanceof Error ? error.message : String(error)}); the store stays at the session cwd`,
        { level: "warn" },
      ),
      !1
    );
  }
}
//@ chunk-dcmhvw5a.js:476578-476648 placement
function normalizedRealHomeDir() {
  return is().localStoreProbes.normalizedRealHomeDir(normalizedRealHome);
}
//@ chunk-dcmhvw5a.js:476648-476753 placement
function normalizedRealHome() {
  let e = Tm(homedir_2());
  if (e === null) throw Error("home directory realpath unavailable");
  return Mn(e);
}
//@ chunk-dcmhvw5a.js:476753-476841 placement = isApiKeyHelperFromProjectOrLocalSettings (0.831)
function getRuleAnchorRootForSource(e, n) {
  return e === "localSettings" || e === "projectSettings"
    ? resolve_2(requireCwd(n))
    : getSettingsRootPathForSource(e, n);
}
//@ chunk-dcmhvw5a.js:476841-476892 placement = isInGlobalClaudeFolder (1)
function userSettingsHomes() {
  return uniq([getClaudeConfigDir(), join_2(homedir_2(), ".claude")]);
}
//@ chunk-dcmhvw5a.js:476892-476955 placement = getUserSettingsFilePath (0.786)
var USER_SETTINGS_FILE_NAMES = { default: "settings.json", cowork: "cowork_settings.json" };
//@ chunk-dcmhvw5a.js:476955-477058 placement
function getUserSettingsFileName(e) {
  if (e.coworkPlugins || env.CLAUDE_CODE_USE_COWORK_PLUGINS) return USER_SETTINGS_FILE_NAMES.cowork;
  return USER_SETTINGS_FILE_NAMES.default;
}
/**
 * 来源 → 设置文件路径：user=<配置目录>/settings.json（cowork 模式 cowork_settings.json）；project=<项目>/.claude/settings.json；local=<项目>/.claude/settings.local.json；policy=<托管目录>/managed-settings.json；flag=--settings 指定的路径。diskless 或无项目时 project/local 返回 undefined。
 */
//@ chunk-dcmhvw5a.js:477058-477334 placement = getSettingsFilePathForSource (0.792)
function getSettingsFilePathForSource_3(e, n) {
  switch (e) {
    case "userSettings":
      return join_2(getSettingsRootPathForSource(e, n), getUserSettingsFileName(n));
    case "projectSettings":
    case "localSettings": {
      if (n.diskless || (n.cwd === null && n.projectConfigDir === void 0)) return;
      return join_2(getSettingsRootPathForSource(e, n), getRelativeSettingsFilePathForSource(e));
    }
    case "policySettings":
      return getManagedSettingsFilePath();
    case "flagSettings":
      return n.flagPath;
  }
}

export {
  resolveLocalSettingsStoreRoot,
  USER_SETTINGS_FILE_NAMES,
  isInClaudeConfigHome,
  getSettingsRootPathForSource,
  localSettingsStoreRootBeforeOwnership,
  getSettingsFilePathForSource_3,
  getRuleAnchorRootForSource,
  parseSettingsFileIfChanged,
  userSettingsHomes,
  parseSettingsContent,
  mdmPolicyErrors,
  settingsReadErrorResult,
  logMissingSettingsFile,
  missingSettingsFileResult,
  unreadableSettingsFileError,
  unparseablePolicyDocumentError,
  unreadableWslFlagWithoutPolicyError,
  normalizedRealHomeDir,
};
