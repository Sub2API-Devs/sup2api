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
function parseSettingsFileIfChanged(path, cache, pinned = false) {
  let text;
  try {
    if (!isInClaudeConfigHome(path)) vetRepoSettingsPath(getFsImplementation(), path);
    let { resolvedPath, isSymlink, isCanonical } = safeResolvePath(getFsImplementation(), path);
    if (!pinned && isSymlink && (!isCanonical || isSpecialPath(resolvedPath))) {
      cache.delete(path);
      return settingsFileRedirectedError(path);
    }
    let fileText;
    if (pinned) fileText = readFileSync(resolvedPath, MAX_SETTINGS_JSON_BYTES);
    else fileText = openBoundRead(resolvedPath, isCanonical, MAX_SETTINGS_JSON_BYTES, isSymlink);
    if (fileText === null) {
      cache.delete(path);
      return settingsFileUnverifiedError(path);
    }
    text = fileText;
  } catch (error) {
    if (!isUnavailableErrorCode(getErrnoCode(error))) cache.delete(path);
    return settingsReadErrorResult(error, path);
  }
  let cached = cache.get(path);
  let parsed =
    cached !== undefined && cached.content === text ? cached.parsed : parseSettingsContent(text, path);
  cache.set(path, {
    content: text,
    parsed,
  });
  return {
    settings: parsed.settings ? clone(parsed.settings) : null,
    errors: parsed.errors,
    textRead: text,
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
function parseSettingsContent(text, file, policy) {
  if (text.trim() === "")
    return {
      settings: {},
      errors: [],
      loadState: "loaded",
    };
  let parsed = safeParseJSON(text, false);
  if (policy) {
    if (!isPlainObject_2(parsed))
      return {
        settings: null,
        errors: [unparseablePolicyDocumentError(file)],
        loadState: "didNotLoad",
      };
    let policyCopy = clone(parsed);
    let issues = validateSettingsDocument(policyCopy, file, {
      skipMcpServerEntryFilter: true,
      policySource: true,
    });
    let policyIssues = [];
    let policyParsed = buildPolicyTolerantSettingsSchema(
      collectSettingsIssue(file, policyIssues),
      file,
      policyCopy,
    ).safeParse(policyCopy);
    if (!policyParsed.success)
      return {
        settings: null,
        errors: [...issues, ...formatZodError(policyParsed.error, file)],
        documentHasPolicyContent: false,
        loadState: "didNotLoad",
      };
    return {
      settings: policyParsed.data,
      errors: [...explainedPolicyChange(issues, policyParsed.data, policyIssues), ...policyIssues],
      documentHasPolicyContent: documentHasPolicyContent(parsed, policyParsed.data),
      loadState: "loaded",
    };
  }
  let docCopy = clone(parsed);
  let issues = [...dropManagedOnlyKeys(docCopy, file), ...validateSettingsDocument(docCopy, file)];
  let docParsed = getSettingsSchemaForDocument(docCopy).safeParse(docCopy);
  if (!docParsed.success) {
    let formatted = formatZodError(docParsed.error, file);
    return {
      settings: null,
      errors: [...issues, ...formatted],
    };
  }
  if (issues.some((issue) => issue.severity === "fatal"))
    return {
      settings: null,
      errors: issues,
    };
  return {
    settings: docParsed.data,
    errors: issues,
  };
}
//@ chunk-dcmhvw5a.js:472322-472732 placement
function unparseablePolicyDocumentError(file, { userWritable = false } = {}) {
  return userWritable
    ? {
        file,
        path: "",
        message: `Managed settings document (${file}) could not be parsed as a JSON object; none of its settings are in effect. Fix or remove it.`,
        severity: "warning",
        statusOnly: true,
        userWritable: true,
      }
    : {
        file,
        path: "",
        message:
          "Managed settings document could not be parsed as a JSON object; none of its settings are in effect. Fix or remove it.",
        startupFatal: true,
      };
}
//@ chunk-dcmhvw5a.js:472732-472835 placement
function isInClaudeConfigHome(path) {
  let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
  if (claudeConfigDirOrNull === null) return false;
  let parentDir = identity(dirname(resolve(path)));
  let configDir = resolve(claudeConfigDirOrNull);
  return parentDir === identity(configDir) || parentDir === getPhysicalPathCached(configDir);
}
//@ chunk-dcmhvw5a.js:472835-472842 placement
var settingsParseFailure;
//@ chunk-dcmhvw5a.js:472842-472955 placement
function getPhysicalPathCached(path) {
  if (settingsParseFailure?.lexical !== path) {
    let parent = dirname(path);
    settingsParseFailure = {
      lexical: path,
      physical: identity(join(nativeRealpathLong(parent) ?? parent, basename(path))),
    };
  }
  return settingsParseFailure.physical;
}
//@ chunk-dcmhvw5a.js:472955-473055 placement = handleFileSystemError (0.788)
function logMissingSettingsFile(path) {
  logForDebugging(
    cleanForDisplay(`Broken symlink or missing file encountered for settings.json at path: ${path}`),
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
function settingsReadErrorResult(error, path) {
  if (mergeClients(error)) throw error;
  handleFileSystemError(error, path);
  if (isENOENT(error)) return missingSettingsFileResult();
  return {
    settings: null,
    errors: [unreadableSettingsFileError(path, error)],
    loadState: "didNotLoad",
  };
}
//@ chunk-dcmhvw5a.js:473249-473514 placement
function unreadableSettingsFileError(file, error, kind = "file") {
  return {
    file,
    path: "",
    message: `${kind === "directory" ? "Managed settings drop-in directory" : "Settings file"} could not be read: ${error instanceof Error ? error.message : String(error)}`,
    severity: "fatal",
    errorClass: "unreadable",
    ...(getErrnoCode(error) !== undefined && {
      errno: getErrnoCode(error),
    }),
  };
}
//@ chunk-dcmhvw5a.js:473514-474089 placement
function unreadableWslFlagWithoutPolicyError(file) {
  return {
    file,
    path: "wslInheritsWindowsSettings",
    message: `"wslInheritsWindowsSettings" in ${file} holds a value that cannot be read (it takes true or false) and no Windows administrator policy is deployed beside it (HKLM or ${WSL_MANAGED_SETTINGS_DIR}), so whether WSL inherits Windows policy is unknown: no Windows or managed-file policy is in effect (/etc/claude-code is not read beneath it), and unless server-managed settings supply the policy \u2014 they apply regardless \u2014 sign-in and policy enforcement fail closed until the flag is fixed.`,
    severity: "fatal",
    statusOnly: true,
  };
}
//@ chunk-dcmhvw5a.js:474089-474171 placement
function isWslInheritsFatal(issue) {
  return issue.path === "wslInheritsWindowsSettings" && issue.severity === "fatal";
}
//@ chunk-dcmhvw5a.js:474171-474380 placement
function mdmPolicyErrors(mdm, remote, file) {
  let errors =
    mdm.withheldFlagRecord && file().heldOnly === true ? [...mdm.errors, mdm.withheldFlagRecord] : mdm.errors;
  if (!errors.some(isWslInheritsFatal)) return errors;
  if (!authoredPolicyContent(remote())) return errors;
  return errors.map((issue) =>
    isWslInheritsFatal(issue)
      ? {
          ...issue,
          severity: "warning",
        }
      : issue,
  );
}
//@ chunk-dcmhvw5a.js:474380-474729 placement
function getSettingsRootPathForSource(source, context) {
  switch (source) {
    case "userSettings":
      return resolve(getClaudeConfigDir());
    case "policySettings":
      return resolve(requireCwd(context));
    case "projectSettings":
      return resolve(context.projectConfigDir ?? requireCwd(context));
    case "localSettings": {
      if (context.projectConfigDir !== undefined) return resolve(context.projectConfigDir);
      return resolveLocalSettingsStoreRoot(requireCwd(context), context.canonicalGitRoot);
    }
    case "flagSettings":
      return context.flagPath ? dirname(resolve(context.flagPath)) : resolve(requireCwd(context));
  }
}
//@ chunk-dcmhvw5a.js:474729-474787 placement
function requireCwd(context) {
  if (context.cwd === null) throw new NoProjectDirectoryError();
  return context.cwd;
}
//@ chunk-dcmhvw5a.js:474787-474909 placement
function resolveLocalSettingsStoreRoot(cwd, canonicalRoot) {
  let result = localSettingsStoreRootBeforeOwnership(cwd, canonicalRoot);
  if (result.decided !== undefined) return result.decided;
  if (!canonicalRootIsOwnedByProcessUser(result.root)) return result.cwdResolved;
  return result.root;
}
//@ chunk-dcmhvw5a.js:474909-475128 placement
function localSettingsStoreRootBeforeOwnership(cwd, canonicalRoot) {
  let root = canonicalRoot?.(cwd);
  if (!root)
    return {
      decided: resolve(cwd),
    };
  let resolvedRoot = resolve(root);
  let resolvedCwd = resolve(cwd);
  if (resolvedRoot === resolvedCwd)
    return {
      decided: resolvedRoot,
    };
  let home;
  try {
    home = normalizedRealHomeDir();
  } catch {
    return {
      decided: resolvedCwd,
    };
  }
  if (resolvedRoot === home)
    return {
      decided: resolvedCwd,
    };
  return {
    decided: undefined,
    root: resolvedRoot,
    cwdResolved: resolvedCwd,
  };
}
//@ chunk-dcmhvw5a.js:475128-475202 placement
function canonicalRootOwnerUids(canonicalRoot) {
  return commandSyncNameState().localStoreProbes.canonicalRootOwnerUids(canonicalRoot, canonicalRootOwners);
}
//@ chunk-dcmhvw5a.js:475202-475369 placement
function canonicalRootOwners(root) {
  let fsImplementation = getFsImplementation();
  let claudeEntryUid = null;
  try {
    claudeEntryUid = fsImplementation.lstatSync(join(root, ".claude")).uid;
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  return {
    rootUid: fsImplementation.statSync(root).uid,
    gitEntryUid: gitDirOwnerUid(root),
    claudeEntryUid,
  };
}
//@ chunk-dcmhvw5a.js:475369-475454 placement
function gitDirOwnerUid(root) {
  let fsImplementation = getFsImplementation();
  try {
    return fsImplementation.lstatSync(join(root, ".git")).uid;
  } catch (error) {
    throw error;
  }
}
//@ chunk-dcmhvw5a.js:475454-476578 placement
function canonicalRootIsOwnedByProcessUser(canonicalRoot) {
  if (typeof process.getuid !== "function" && typeof process.geteuid !== "function") {
    logForDebugging(
      `localSettings: not canonicalizing the consent store to ${canonicalRoot} \u2014 this platform has no uid semantics to verify directory ownership with, so the store stays at the session cwd (canonicalization is POSIX-only)`,
      {
        level: "warn",
      },
    );
    return false;
  }
  let currentUid = typeof process.geteuid === "function" ? process.geteuid() : process.getuid?.();
  try {
    let { rootUid, gitEntryUid, claudeEntryUid } = canonicalRootOwnerUids(canonicalRoot);
    if (
      rootUid === currentUid &&
      gitEntryUid === currentUid &&
      (claudeEntryUid === null || claudeEntryUid === currentUid)
    )
      return true;
    logForDebugging(
      `localSettings: not canonicalizing the consent store to ${canonicalRoot} \u2014 it (uid ${rootUid}), its .git entry (uid ${gitEntryUid}), or its .claude entry (uid ${claudeEntryUid ?? "absent"}) is not owned by the current user (uid ${currentUid}); the store stays at the session cwd (the pre-canonicalization behavior). If you own this repo, chown it (including .git and .claude) or run from a directory you own.`,
      {
        level: "warn",
      },
    );
    return false;
  } catch (error) {
    logForDebugging(
      `localSettings: not canonicalizing the consent store to ${canonicalRoot} \u2014 its ownership could not be verified (${error instanceof Error ? error.message : String(error)}); the store stays at the session cwd`,
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
  let realHome = nativeRealpathLong(homedir());
  if (realHome === null) throw Error("home directory realpath unavailable");
  return identity(realHome);
}
//@ chunk-dcmhvw5a.js:476753-476841 placement = isApiKeyHelperFromProjectOrLocalSettings (0.831)
function getRuleAnchorRootForSource(source, settingsContext) {
  return source === "localSettings" || source === "projectSettings"
    ? resolve(requireCwd(settingsContext))
    : getSettingsRootPathForSource(source, settingsContext);
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
function getUserSettingsFileName(settingsContext) {
  if (settingsContext.coworkPlugins || env.CLAUDE_CODE_USE_COWORK_PLUGINS)
    return USER_SETTINGS_FILE_NAMES.cowork;
  return USER_SETTINGS_FILE_NAMES.default;
}
//@ chunk-dcmhvw5a.js:477058-477334 placement = getSettingsFilePathForSource (0.792)
/**
 * 来源 → 设置文件路径：user=<配置目录>/settings.json（cowork 模式 cowork_settings.json）；project=<项目>/.claude/settings.json；local=<项目>/.claude/settings.local.json；policy=<托管目录>/managed-settings.json；flag=--settings 指定的路径。diskless 或无项目时 project/local 返回 undefined。
 */
function getSettingsFilePathForSource_3(source, settingsContext) {
  switch (source) {
    case "userSettings":
      return join(
        getSettingsRootPathForSource(source, settingsContext),
        getUserSettingsFileName(settingsContext),
      );
    case "projectSettings":
    case "localSettings": {
      if (
        settingsContext.diskless ||
        (settingsContext.cwd === null && settingsContext.projectConfigDir === undefined)
      )
        return;
      return join(
        getSettingsRootPathForSource(source, settingsContext),
        getRelativeSettingsFilePathForSource(source),
      );
    }
    case "policySettings":
      return getManagedSettingsFilePath();
    case "flagSettings":
      return settingsContext.flagPath;
  }
}
export {
  resolveLocalSettingsStoreRoot,
  USER_SETTINGS_FILE_NAMES,
  isInClaudeConfigHome,
  parseSettingsContent,
  settingsReadErrorResult,
  getSettingsFilePathForSource_3,
  getSettingsRootPathForSource,
  localSettingsStoreRootBeforeOwnership,
  getRuleAnchorRootForSource,
  parseSettingsFileIfChanged,
  userSettingsHomes,
  mdmPolicyErrors,
  logMissingSettingsFile,
  missingSettingsFileResult,
  unreadableSettingsFileError,
  unparseablePolicyDocumentError,
  unreadableWslFlagWithoutPolicyError,
  normalizedRealHomeDir,
  canonicalRootIsOwnedByProcessUser,
  canonicalRootOwnerUids,
  requireCwd,
};
