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
import { dirname, resolve, join, basename } from "path";
import { homedir } from "os";
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
import { explainedPolicyChange, documentHasPolicyContent, authoredPolicyContent } from "./policySettings.js";
import { getClaudeConfigDirOrNull, getClaudeConfigDir } from "../envUtils.js";
import { identity } from "../pathClassification.js";
import { nativeRealpathLong } from "../windowsUncPaths.js";
import { logForDebugging } from "../debug.js";
import { cleanForDisplay } from "../stringUtils.js";
import { mergeClients } from "../hostScoped.js";
import { WSL_MANAGED_SETTINGS_DIR } from "./mdm/wslRegistry.js";
import { NoProjectDirectoryError } from "../../bootstrap/sessionSlices.js";
import { commandSyncNameState } from "./commandSyncNames.js";
import { uniq } from "../collections.js";
import { env } from "../env.js";

//@ chunk-dcmhvw5a.js:470784-471242 placement = parseSettingsFileUncached (0.417)
function parseSettingsFileIfChanged(e, n, r = false) {
  let s;
  try {
    if (!isInClaudeConfigHome(e)) vetRepoSettingsPath(getFsImplementation(), e);
    let { resolvedPath, isSymlink, isCanonical } = safeResolvePath(getFsImplementation(), e);
    if (!r && isSymlink && (!isCanonical || isSpecialPath(resolvedPath))) {
      n.delete(e);
      return settingsFileRedirectedError(e);
    }
    let h;
    if (r) h = readFileSync(resolvedPath, MAX_SETTINGS_JSON_BYTES);
    else h = openBoundRead(resolvedPath, isCanonical, MAX_SETTINGS_JSON_BYTES, isSymlink);
    if (h === null) {
      n.delete(e);
      return settingsFileUnverifiedError(e);
    }
    s = h;
  } catch (error) {
    if (!isUnavailableErrorCode(getErrnoCode(error))) n.delete(e);
    return settingsReadErrorResult(error, e);
  }
  let a = n.get(e);
  let c = a !== undefined && a.content === s ? a.parsed : parseSettingsContent(s, e);
  n.set(e, {
    content: s,
    parsed: c,
  });
  return {
    settings: c.settings ? clone(c.settings) : null,
    errors: c.errors,
    textRead: s,
  };
}
//@ chunk-dcmhvw5a.js:471242-471331 placement
function settingsFileRedirectedError(file) {
  return makeFatalSettingsLoadResult(file, `Settings file leads to another host and was not read: ${file}`);
}
//@ chunk-dcmhvw5a.js:471331-471458 placement
function settingsFileUnverifiedError(file) {
  return makeFatalSettingsLoadResult(
    file,
    `Settings file could not be verified against the route its check resolved, and was not read: ${file}`,
  );
}
//@ chunk-dcmhvw5a.js:471458-471573 placement
function makeFatalSettingsLoadResult(file, message) {
  return {
    settings: null,
    errors: [
      {
        file,
        path: "",
        message,
        severity: "fatal",
      },
    ],
    loadState: "didNotLoad",
  };
}
//@ chunk-dcmhvw5a.js:471573-472322 placement
/**
 * 把设置文件文本解析成对象并用 zod 校验；托管文档走宽容 schema（无效值按限制性值处理，记录 documentHasPolicyContent），普通文档校验失败返回 settings:null 与格式化错误。
 */
function parseSettingsContent(e, file, r) {
  if (e.trim() === "")
    return {
      settings: {},
      errors: [],
      loadState: "loaded",
    };
  let s = safeParseJSON(e, false);
  if (r) {
    if (!isPlainObject_2(s))
      return {
        settings: null,
        errors: [unparseablePolicyDocumentError(file)],
        loadState: "didNotLoad",
      };
    let m = clone(s);
    let f = validateSettingsDocument(m, file, {
      skipMcpServerEntryFilter: true,
      policySource: true,
    });
    let h = [];
    let y = buildPolicyTolerantSettingsSchema(collectSettingsIssue(file, h), file, m).safeParse(m);
    if (!y.success)
      return {
        settings: null,
        errors: [...f, ...formatZodError(y.error, file)],
        documentHasPolicyContent: false,
        loadState: "didNotLoad",
      };
    return {
      settings: y.data,
      errors: [...explainedPolicyChange(f, y.data, h), ...h],
      documentHasPolicyContent: documentHasPolicyContent(s, y.data),
      loadState: "loaded",
    };
  }
  let a = clone(s);
  let c = [...dropManagedOnlyKeys(a, file), ...validateSettingsDocument(a, file)];
  let g = getSettingsSchemaForDocument(a).safeParse(a);
  if (!g.success) {
    let m = formatZodError(g.error, file);
    return {
      settings: null,
      errors: [...c, ...m],
    };
  }
  if (c.some((m) => m.severity === "fatal"))
    return {
      settings: null,
      errors: c,
    };
  return {
    settings: g.data,
    errors: c,
  };
}
//@ chunk-dcmhvw5a.js:472322-472732 placement
function unparseablePolicyDocumentError(e, { userWritable: n = false } = {}) {
  return n
    ? {
        file: e,
        path: "",
        message: `Managed settings document (${e}) could not be parsed as a JSON object; none of its settings are in effect. Fix or remove it.`,
        severity: "warning",
        statusOnly: true,
        userWritable: true,
      }
    : {
        file: e,
        path: "",
        message:
          "Managed settings document could not be parsed as a JSON object; none of its settings are in effect. Fix or remove it.",
        startupFatal: true,
      };
}
//@ chunk-dcmhvw5a.js:472732-472835 placement
function isInClaudeConfigHome(e) {
  let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
  if (claudeConfigDirOrNull === null) return false;
  let r = identity(dirname(resolve(e)));
  let s = resolve(claudeConfigDirOrNull);
  return r === identity(s) || r === getPhysicalPathCached(s);
}
//@ chunk-dcmhvw5a.js:472835-472842 placement
var settingsParseFailure;
//@ chunk-dcmhvw5a.js:472842-472955 placement
function getPhysicalPathCached(e) {
  if (settingsParseFailure?.lexical !== e) {
    let n = dirname(e);
    settingsParseFailure = {
      lexical: e,
      physical: identity(join(nativeRealpathLong(n) ?? n, basename(e))),
    };
  }
  return settingsParseFailure.physical;
}
//@ chunk-dcmhvw5a.js:472955-473055 placement = handleFileSystemError (0.788)
function logMissingSettingsFile(e) {
  logForDebugging(
    cleanForDisplay(`Broken symlink or missing file encountered for settings.json at path: ${e}`),
  );
}
//@ chunk-dcmhvw5a.js:473055-473121 placement
function missingSettingsFileResult() {
  return {
    settings: null,
    errors: [],
    loadState: "absent",
  };
}
//@ chunk-dcmhvw5a.js:473121-473249 placement
function settingsReadErrorResult(error, n) {
  if (mergeClients(error)) throw error;
  handleFileSystemError(error, n);
  if (isENOENT(error)) return missingSettingsFileResult();
  return {
    settings: null,
    errors: [unreadableSettingsFileError(n, error)],
    loadState: "didNotLoad",
  };
}
//@ chunk-dcmhvw5a.js:473249-473514 placement
function unreadableSettingsFileError(file, error, r = "file") {
  return {
    file,
    path: "",
    message: `${r === "directory" ? "Managed settings drop-in directory" : "Settings file"} could not be read: ${error instanceof Error ? error.message : String(error)}`,
    severity: "fatal",
    errorClass: "unreadable",
    ...(getErrnoCode(error) !== undefined && {
      errno: getErrnoCode(error),
    }),
  };
}
//@ chunk-dcmhvw5a.js:473514-474089 placement
function unreadableWslFlagWithoutPolicyError(e) {
  return {
    file: e,
    path: "wslInheritsWindowsSettings",
    message: `"wslInheritsWindowsSettings" in ${e} holds a value that cannot be read (it takes true or false) and no Windows administrator policy is deployed beside it (HKLM or ${WSL_MANAGED_SETTINGS_DIR}), so whether WSL inherits Windows policy is unknown: no Windows or managed-file policy is in effect (/etc/claude-code is not read beneath it), and unless server-managed settings supply the policy \u2014 they apply regardless \u2014 sign-in and policy enforcement fail closed until the flag is fixed.`,
    severity: "fatal",
    statusOnly: true,
  };
}
//@ chunk-dcmhvw5a.js:474089-474171 placement
function isWslInheritsFatal(e) {
  return e.path === "wslInheritsWindowsSettings" && e.severity === "fatal";
}
//@ chunk-dcmhvw5a.js:474171-474380 placement
function mdmPolicyErrors(e, n, r) {
  let s = e.withheldFlagRecord && r().heldOnly === true ? [...e.errors, e.withheldFlagRecord] : e.errors;
  if (!s.some(isWslInheritsFatal)) return s;
  if (!authoredPolicyContent(n())) return s;
  return s.map((a) =>
    isWslInheritsFatal(a)
      ? {
          ...a,
          severity: "warning",
        }
      : a,
  );
}
//@ chunk-dcmhvw5a.js:474380-474729 placement
function getSettingsRootPathForSource(source, n) {
  switch (source) {
    case "userSettings":
      return resolve(getClaudeConfigDir());
    case "policySettings":
      return resolve(requireCwd(n));
    case "projectSettings":
      return resolve(n.projectConfigDir ?? requireCwd(n));
    case "localSettings": {
      if (n.projectConfigDir !== undefined) return resolve(n.projectConfigDir);
      return resolveLocalSettingsStoreRoot(requireCwd(n), n.canonicalGitRoot);
    }
    case "flagSettings":
      return n.flagPath ? dirname(resolve(n.flagPath)) : resolve(requireCwd(n));
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
  if (r.decided !== undefined) return r.decided;
  if (!canonicalRootIsOwnedByProcessUser(r.root)) return r.cwdResolved;
  return r.root;
}
//@ chunk-dcmhvw5a.js:474909-475128 placement
function localSettingsStoreRootBeforeOwnership(e, n) {
  let r = n?.(e);
  if (!r)
    return {
      decided: resolve(e),
    };
  let s = resolve(r);
  let a = resolve(e);
  if (s === a)
    return {
      decided: s,
    };
  let c;
  try {
    c = normalizedRealHomeDir();
  } catch {
    return {
      decided: a,
    };
  }
  if (s === c)
    return {
      decided: a,
    };
  return {
    decided: undefined,
    root: s,
    cwdResolved: a,
  };
}
//@ chunk-dcmhvw5a.js:475128-475202 placement
function canonicalRootOwnerUids(e) {
  return commandSyncNameState().localStoreProbes.canonicalRootOwnerUids(e, canonicalRootOwners);
}
//@ chunk-dcmhvw5a.js:475202-475369 placement
function canonicalRootOwners(e) {
  let fsImplementation = getFsImplementation();
  let claudeEntryUid = null;
  try {
    claudeEntryUid = fsImplementation.lstatSync(join(e, ".claude")).uid;
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  return {
    rootUid: fsImplementation.statSync(e).uid,
    gitEntryUid: gitDirOwnerUid(e),
    claudeEntryUid,
  };
}
//@ chunk-dcmhvw5a.js:475369-475454 placement
function gitDirOwnerUid(e) {
  let fsImplementation = getFsImplementation();
  try {
    return fsImplementation.lstatSync(join(e, ".git")).uid;
  } catch (error) {
    throw error;
  }
}
//@ chunk-dcmhvw5a.js:475454-476578 placement
function canonicalRootIsOwnedByProcessUser(root) {
  if (typeof process.getuid !== "function" && typeof process.geteuid !== "function") {
    logForDebugging(
      `localSettings: not canonicalizing the consent store to ${root} \u2014 this platform has no uid semantics to verify directory ownership with, so the store stays at the session cwd (canonicalization is POSIX-only)`,
      {
        level: "warn",
      },
    );
    return false;
  }
  let n = typeof process.geteuid === "function" ? process.geteuid() : process.getuid?.();
  try {
    let { rootUid, gitEntryUid, claudeEntryUid } = canonicalRootOwnerUids(root);
    if (rootUid === n && gitEntryUid === n && (claudeEntryUid === null || claudeEntryUid === n)) return true;
    logForDebugging(
      `localSettings: not canonicalizing the consent store to ${root} \u2014 it (uid ${rootUid}), its .git entry (uid ${gitEntryUid}), or its .claude entry (uid ${claudeEntryUid ?? "absent"}) is not owned by the current user (uid ${n}); the store stays at the session cwd (the pre-canonicalization behavior). If you own this repo, chown it (including .git and .claude) or run from a directory you own.`,
      {
        level: "warn",
      },
    );
    return false;
  } catch (error) {
    logForDebugging(
      `localSettings: not canonicalizing the consent store to ${root} \u2014 its ownership could not be verified (${error instanceof Error ? error.message : String(error)}); the store stays at the session cwd`,
      {
        level: "warn",
      },
    );
    return false;
  }
}
//@ chunk-dcmhvw5a.js:476578-476648 placement
function normalizedRealHomeDir() {
  return commandSyncNameState().localStoreProbes.normalizedRealHomeDir(normalizedRealHome);
}
//@ chunk-dcmhvw5a.js:476648-476753 placement
function normalizedRealHome() {
  let e = nativeRealpathLong(homedir());
  if (e === null) throw Error("home directory realpath unavailable");
  return identity(e);
}
//@ chunk-dcmhvw5a.js:476753-476841 placement = isApiKeyHelperFromProjectOrLocalSettings (0.831)
function getRuleAnchorRootForSource(e, settingsContext) {
  return e === "localSettings" || e === "projectSettings"
    ? resolve(requireCwd(settingsContext))
    : getSettingsRootPathForSource(e, settingsContext);
}
//@ chunk-dcmhvw5a.js:476841-476892 placement = isInGlobalClaudeFolder (1)
function userSettingsHomes() {
  return uniq([getClaudeConfigDir(), join(homedir(), ".claude")]);
}
//@ chunk-dcmhvw5a.js:476892-476955 placement = getUserSettingsFilePath (0.786)
var USER_SETTINGS_FILE_NAMES = {
  default: "settings.json",
  cowork: "cowork_settings.json",
};
//@ chunk-dcmhvw5a.js:476955-477058 placement
function getUserSettingsFileName(e) {
  if (e.coworkPlugins || env.CLAUDE_CODE_USE_COWORK_PLUGINS) return USER_SETTINGS_FILE_NAMES.cowork;
  return USER_SETTINGS_FILE_NAMES.default;
}
//@ chunk-dcmhvw5a.js:477058-477334 placement = getSettingsFilePathForSource (0.792)
/**
 * 来源 → 设置文件路径：user=<配置目录>/settings.json（cowork 模式 cowork_settings.json）；project=<项目>/.claude/settings.json；local=<项目>/.claude/settings.local.json；policy=<托管目录>/managed-settings.json；flag=--settings 指定的路径。diskless 或无项目时 project/local 返回 undefined。
 */
function getSettingsFilePathForSource_3(source, n) {
  switch (source) {
    case "userSettings":
      return join(getSettingsRootPathForSource(source, n), getUserSettingsFileName(n));
    case "projectSettings":
    case "localSettings": {
      if (n.diskless || (n.cwd === null && n.projectConfigDir === undefined)) return;
      return join(getSettingsRootPathForSource(source, n), getRelativeSettingsFilePathForSource(source));
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
