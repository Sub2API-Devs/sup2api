/**
 * services/remoteTools/windowsProfileDirs.ts
 *
 * 2.1.316 新增（门面模块 primeWindowsProfileDirs）。Windows 用户目录探测。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2214fejy.js (49)
 * attribution: placement 49
 */
import { win32 } from "path";
import { homedir } from "os";
import { realpath } from "fs/promises";
import { getPlatform } from "../../utils/platform.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { isAbsolutePlatformPath } from "../../utils/git.js";
import { getLatchedPreSettingsEnvSnapshot } from "../../utils/managedEnvApply.js";
import { env } from "../../utils/env.js";
import { logError } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import { identity } from "../../utils/identity.js";
import { createSignal } from "../../utils/signal.js";
import { pathExists } from "../../utils/fsSafety/atomicWriteStaging.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { getCachedPowerShellPath } from "../../utils/shell/powershellDetection.js";
import { withDeadline } from "../../utils/sleep.js";
import { getErrnoCode } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-2214fejy.js:3657-3931 placement
function windowsPowerShellProfileDirs() {
  if (getPlatform() !== "windows") return [];
  let { result } = profileDirsState;
  let filtered = [
    result.settled ? result.documents : null,
    ...(result.settled && !result.failed ? result.kept : []),
    ...oneDriveDocumentsDirs(),
  ].filter((dir) => dir !== null);
  return normalizeCaseForComparison_2(
    filtered
      .flatMap((dir) => [dir, profileDirsState.resolved.get(dir) ?? dir])
      .flatMap((dir) => [win32.join(dir, "PowerShell"), win32.join(dir, "WindowsPowerShell")]),
  );
}
//@ chunk-2214fejy.js:3931-4101 placement
function windowsAutoRunDirs() {
  if (getPlatform() !== "windows") return [];
  let { result } = profileDirsState;
  let dirs = normalizeCaseForComparison_2([
    ...appDataDirs(),
    startMenuDir(),
    ...(result.settled && !result.failed ? placedPaths(result.autoRun) : []),
  ]);
  return normalizeCaseForComparison_2(
    dirs.flatMap((dir) => [dir, profileDirsState.resolved.get(dir) ?? dir]),
  );
}
//@ chunk-2214fejy.js:4101-4201 placement
function appDataDirs() {
  return ["APPDATA", "LOCALAPPDATA"].flatMap((name) => {
    let dir = sanitizeProfileDir(envAtStartup(name));
    return dir === null ? [] : [dir];
  });
}
//@ chunk-2214fejy.js:4201-4337 placement
function startMenuDir() {
  let programData =
    sanitizeProfileDir(
      envAtStartup("ProgramData") || envAtStartup("PROGRAMDATA") || envAtStartup("ALLUSERSPROFILE"),
    ) ?? DEFAULT_PROGRAMDATA_DIR;
  return win32.join(programData, "Microsoft", "Windows", "Start Menu");
}
//@ chunk-2214fejy.js:4337-4482 placement
function oneDriveDocumentsDirs() {
  return [envAtStartup("OneDrive"), envAtStartup("OneDriveConsumer"), envAtStartup("OneDriveCommercial")]
    .filter((value) => value !== undefined && isAbsolutePlatformPath(value))
    .map((root) => win32.join(root, "Documents"));
}
//@ chunk-2214fejy.js:4482-4535 placement
/**
 * 读环境变量：优先用启动时锁定的快照，否则读当前 env（Windows 文件夹正在探测时用）。
 */
function envAtStartup(name) {
  let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
  return latchedPreSettingsEnvSnapshot !== undefined ? latchedPreSettingsEnvSnapshot[name] : env[name];
}
//@ chunk-2214fejy.js:4535-4592 placement
function windowsProfileDirsUnread() {
  return getPlatform() === "windows" && !profileDirsState.result.settled;
}
//@ chunk-2214fejy.js:4592-4680 placement
function windowsProfileDirsReadFailure() {
  let { result } = profileDirsState;
  return getPlatform() === "windows" && result.settled && result.failed ? result.why : undefined;
}
//@ chunk-2214fejy.js:4680-4721 placement
var PROFILE_DIRS_UNREADABLE_NOTICE_KEY = "served-profile-dirs-unreadable";
//@ chunk-2214fejy.js:4721-6452 placement
async function primeWindowsProfileDirs() {
  if (getPlatform() !== "windows" || isProfileDirsUnsettledRecently()) return;
  if (isProfileDirsSettled() && profileDirsState.unresolved.length > 0) {
    profileDirsState.inFlight ??= resolveVolumePaths(profileDirsState.unresolved)
      .then(async ({ resolved, unresolved, missing }) => {
        let { result: dirs } = profileDirsState;
        let reread;
        try {
          reread = dirs.settled && !dirs.failed ? await rereadMissingProfileDirs(dirs, missing) : undefined;
        } catch (error) {
          logError(error);
          reread = logProfileDirsUnsettled(
            unreadableProfileDirs(
              `checking a missing profile folder against PowerShell threw (${error instanceof Error ? error.message : String(error)})`,
            ),
          );
        }
        profileDirsState.resolved = new Map([
          ...profileDirsState.resolved,
          ...resolved,
          ...(reread?.its?.resolved ?? []),
        ]);
        profileDirsState.unresolved = [...unresolved, ...(reread?.its?.unresolved ?? [])];
        profileDirsState.unresolvedAskedAt = Date.now();
        if (reread !== undefined) profileDirsState.result = reread.result;
        profileDirsState.inFlight = undefined;
        if (resolved.size > 0 || reread !== undefined) emitProfileDirsSettled();
      })
      .catch((error) => {
        profileDirsState.inFlight = undefined;
        profileDirsState.unresolvedAskedAt = Date.now();
        logError(error);
        logForDebugging(
          `[toolHosts] Re-asking the unresolved folders threw (${error instanceof Error ? error.message : String(error)}); they are asked again the next time serving or a bind starts.`,
        );
      });
    await profileDirsState.inFlight;
    return;
  }
  profileDirsState.inFlight ??= readProfileDirs()
    .catch((error) => ({
      settled: true,
      documents: null,
      failed: true,
      retry: true,
      why: error instanceof Error ? error.message : "the read threw",
    }))
    .then(async (read) => {
      let { resolved, unresolved } = await resolveVolumePaths([
        ...(read.failed || read.documents === null ? [] : [read.documents]),
        ...(read.failed ? [] : read.kept),
        ...oneDriveDocumentsDirs(),
        ...(read.failed ? [] : placedPaths(read.autoRun)),
        ...appDataDirs(),
      ]);
      profileDirsState.resolved = resolved;
      profileDirsState.unresolved = unresolved;
      profileDirsState.unresolvedAskedAt = Date.now();
      profileDirsState.result = read;
      profileDirsState.inFlight = undefined;
      if (read.failed)
        logForDebugging(
          `[toolHosts] Could not read where this machine keeps its profile folders (${read.why}); its tools are not offered to cloud sessions until the next start reads them.`,
        );
      emitProfileDirsSettled();
    })
    .catch((error) => {
      profileDirsState.result = {
        settled: true,
        documents: null,
        failed: true,
        retry: true,
        why: error instanceof Error ? error.message : "settling the read threw",
      };
      profileDirsState.inFlight = undefined;
      logError(error);
      logForDebugging(
        `[toolHosts] Settling the profile-folder read threw (${error instanceof Error ? error.message : String(error)}); serving stays off until the next start reads again.`,
      );
      emitProfileDirsSettled();
    });
  await profileDirsState.inFlight;
}
//@ chunk-2214fejy.js:6452-6591 placement
function emitProfileDirsSettled() {
  try {
    profileDirsState.settled.emit();
  } catch (error) {
    logForDebugging(
      `[toolHosts] A profile-directory listener threw: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
//@ chunk-2214fejy.js:6591-6648 placement
function pendingWindowsProfileDirsRead() {
  return getPlatform() !== "windows" || isProfileDirsUnsettledRecently()
    ? undefined
    : primeWindowsProfileDirs();
}
//@ chunk-2214fejy.js:6648-6694 placement
function onWindowsProfileDirsSettled(listener) {
  return profileDirsState.settled.subscribe(listener);
}
//@ chunk-2214fejy.js:6694-7024 placement
/**
 * Windows 用户文件夹解析的进程状态：结果、已解析/未解析的路径、进行中的读取、卷与 PowerShell 的答复。
 */
var profileDirsState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2214fejy.js:6694", () => {
  profileDirsState = identity(
    {
      result: {
        settled: false,
      },
      resolved: new Map(),
      unresolved: [],
      unresolvedAskedAt: 0,
      inFlight: undefined,
      settled: createSignal(),
      volumeAnswers: new Map(),
      powershellAnswer: undefined,
    },
    (state) => {
      state.result = {
        settled: false,
      };
      state.resolved = new Map();
      state.unresolved = [];
      state.unresolvedAskedAt = 0;
      state.inFlight = undefined;
      state.settled.clear();
      state.volumeAnswers.clear();
      state.powershellAnswer = undefined;
    },
  );
});
//@ chunk-2214fejy.js:7024-7112 placement
/**
 * 平台为 Windows、尚未就绪且最近没有问过未解析文件夹时，需要（再次）探测。
 */
function isProfileDirsUnsettledRecently() {
  return (
    isProfileDirsSettled() &&
    (profileDirsState.unresolved.length === 0 ||
      Date.now() - profileDirsState.unresolvedAskedAt < UNRESOLVED_REQUEST_COOLDOWN_MS)
  );
}
//@ chunk-2214fejy.js:7112-7125 placement
var UNRESOLVED_REQUEST_COOLDOWN_MS = 60000;
//@ chunk-2214fejy.js:7125-7195 placement
function isProfileDirsSettled() {
  let { result } = profileDirsState;
  return result.settled && (!result.failed || !result.retry);
}
//@ chunk-2214fejy.js:7195-7303 placement
function readRegistryValue(stdout, valueName, vars) {
  let dir = registryValuePattern(valueName)
    .exec(stdout)?.[1]
    ?.replace(/%([^%]+)%/g, (wholeMatch, varName) => vars[varName.toUpperCase()] ?? wholeMatch);
  return sanitizeProfileDir(dir);
}
//@ chunk-2214fejy.js:7303-7437 placement
function registryValuePattern(valueName, typePattern = "REG_(?:EXPAND_)?SZ") {
  return new RegExp(
    "^[ \\t]+" + valueName.replace(/ /g, "[ ]") + "[ \\t]+" + typePattern + "[ \\t]+(.+?)[ \\t]*\\r?$",
    "im",
  );
}
//@ chunk-2214fejy.js:7437-7651 placement
function parsePowerShellProfileDir(stdout) {
  let lastLine = stdout.trim().split(/\r?\n/).pop()?.trim() ?? "";
  let dir = sanitizeProfileDir(
    /^\d{1,5}(,\d{1,5})*$/.test(lastLine)
      ? String.fromCharCode(...lastLine.split(",").map(Number))
      : lastLine,
  );
  return dir !== null && /\.ps1$/i.test(dir) ? win32.dirname(win32.dirname(dir)) : null;
}
//@ chunk-2214fejy.js:7651-7720 placement
function sanitizeProfileDir(dir) {
  return dir === undefined || /[%?\uFFFD]/.test(dir) || !isAbsolutePlatformPath(dir) ? null : dir;
}
//@ chunk-2214fejy.js:7720-7924 placement
async function findRegExe() {
  let joined = win32.join(DEFAULT_WINDOWS_DIR, "System32", "reg.exe");
  if (await pathExists(joined)) return joined;
  let systemRoot = envAtStartup("SystemRoot") || envAtStartup("SYSTEMROOT");
  return systemRoot !== undefined && /^[A-Za-z]:[\\/]/.test(systemRoot)
    ? win32.join(systemRoot, "System32", "reg.exe")
    : undefined;
}
//@ chunk-2214fejy.js:7924-8052 placement
var DEFAULT_WINDOWS_DIR = "C:\\Windows";
var DEFAULT_PROGRAMDATA_DIR = "C:\\ProgramData";
var USER_SHELL_FOLDERS_KEY =
  "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders";
//@ chunk-2214fejy.js:8052-8656 placement
/**
 * 读取 Windows 用户 shell 文件夹位置：先用 reg.exe 查 User Shell Folders，无法确定时退回 PowerShell，合并两者结果并核实目录存在。
 */
async function readProfileDirs() {
  let regResult = await queryUserShellFoldersViaReg();
  if (
    !regResult.failed &&
    regResult.documents !== "unplaceable" &&
    regResult.autoRun.every(([, value]) => value !== "unplaceable")
  )
    return settleProfileDirs(regResult.autoRun, regResult.documents);
  let psResult = await powerShellProfileAnswer();
  if (psResult.failed)
    return unreadableProfileDirs(
      `${regResult.failed ? regResult.why : `reg.exe could not place the key's ${unplaceableFolders(regResult.autoRun, regResult.documents).join(" and ")}`}; ${psResult.why}`,
      (regResult.failed ? regResult.retry : true) || psResult.retry,
    );
  if (regResult.failed && psResult.autoRun === "unreadable")
    return unreadableProfileDirs(`${regResult.why}; PowerShell could not read the User Shell Folders key`);
  return settleProfileDirs(
    shellFoldersByKind(
      ...(regResult.failed ? [] : [regResult.autoRun]),
      ...(psResult.autoRun === "unreadable" ? [] : [psResult.autoRun]),
    ),
    regResult.failed || regResult.documents === "unplaceable"
      ? {
          placed: [psResult.documents],
        }
      : regResult.documents,
  );
}
//@ chunk-2214fejy.js:8656-9127 placement
/**
 * 确认 reg.exe 给出的文件夹：对不存在的再问 PowerShell，合并结果并检查仍无法定位的文件夹。
 */
async function settleProfileDirs(autoRun, documents) {
  let placement = typeof documents === "object" ? (documents.placed[0] ?? null) : null;
  let allDirs = [...(placement === null ? [] : [placement]), ...placedPaths(autoRun)];
  let missingDirs = (
    await Promise.all(
      allDirs.map(async (dir) => ("missing" in (await resolveVolumeCached(dir)) ? [dir] : [])),
    )
  ).flat();
  let asked =
    missingDirs.length > 0
      ? await askPowerShellForDirs(
          placement !== null && missingDirs.includes(placement) ? placement : null,
          missingDirs,
        )
      : undefined;
  if (asked !== undefined && asked.failed) return asked;
  let autoRun_2 = asked?.autoRun;
  let resolvedAutoRun = autoRun_2 === undefined ? autoRun : shellFoldersByKind(autoRun, autoRun_2);
  let unplaceable = unplaceableFolders(resolvedAutoRun, documents);
  if (unplaceable.length > 0) return unplaceableFailure(unplaceable);
  let documents_2 = asked?.documents ?? null;
  return {
    settled: true,
    documents: documents_2 ?? placement,
    kept: documents_2 !== null && placement !== null && documents_2 !== placement ? [placement] : [],
    autoRun: resolvedAutoRun,
    failed: false,
  };
}
//@ chunk-2214fejy.js:9127-9787 placement
/**
 * 重新读取缺失的 Windows 用户文件夹：经 PowerShell 获取新位置，返回更新后的结果与需要核实的路径。
 */
async function rereadMissingProfileDirs(dirs, missing) {
  let missing_2 = [...(dirs.documents === null ? [] : [dirs.documents]), ...placedPaths(dirs.autoRun)].filter(
    (dir) => missing.includes(dir),
  );
  if (missing_2.length === 0) return;
  let includesDocuments = dirs.documents !== null && missing_2.includes(dirs.documents);
  let psResult = await askPowerShellForDirs(includesDocuments ? dirs.documents : null, missing_2);
  if (psResult.failed) return logProfileDirsUnsettled(psResult);
  let autoRun =
    psResult.autoRun === undefined ? dirs.autoRun : shellFoldersByKind(dirs.autoRun, psResult.autoRun);
  let absentFolders = unplaceableFolders(autoRun, "absent");
  if (absentFolders.length > 0) return logProfileDirsUnsettled(unplaceableFailure(absentFolders));
  let newDocuments =
    psResult.documents !== null && psResult.documents !== dirs.documents ? psResult.documents : null;
  let filtered = placedPaths(autoRun).filter((dir) => !placedPaths(dirs.autoRun).includes(dir));
  if (newDocuments === null && filtered.length === 0) return;
  return {
    result: {
      ...dirs,
      documents: newDocuments ?? dirs.documents,
      kept: normalizeCaseForComparison_2([
        ...dirs.kept,
        ...(newDocuments === null || dirs.documents === null ? [] : [dirs.documents]),
      ]),
      autoRun,
    },
    its: await resolveVolumePaths([...(newDocuments === null ? [] : [newDocuments]), ...filtered]),
  };
}
//@ chunk-2214fejy.js:9787-10017 placement
function logProfileDirsUnsettled(failure) {
  resetProfileDirAnswers();
  logForDebugging(
    `[toolHosts] Asked again where this machine keeps its profile folders and could not settle it \u2014 ${failure.why}; its tools are not offered to cloud sessions until the next start reads again.`,
  );
  return {
    result: failure,
  };
}
//@ chunk-2214fejy.js:10017-10338 placement
/**
 * 让 PowerShell 读取用户文件夹位置（文档与自动运行目录），失败或不可读时给出失败原因。
 */
async function askPowerShellForDirs(documents, missing) {
  let answer = await powerShellProfileAnswer();
  if (answer.failed) return missingDirsFailure(missing, answer.why);
  let dirs = missing.filter((dir) => dir !== documents);
  if (answer.autoRun === "unreadable" && dirs.length > 0)
    return missingDirsFailure(dirs, "its registry provider could not read the User Shell Folders key");
  return {
    failed: false,
    documents: documents === null ? null : answer.documents,
    autoRun: answer.autoRun === "unreadable" ? undefined : answer.autoRun,
  };
}
//@ chunk-2214fejy.js:10338-10559 placement
function missingDirsFailure(dirs, why) {
  return unreadableProfileDirs(
    `${dirs.join(" and ")} ${dirs.length === 1 ? "does not exist on its volume" : "do not exist on their volumes"} as read, and PowerShell could not say where ${dirs.length === 1 ? "the folder is" : "they are"} (${why})`,
  );
}
//@ chunk-2214fejy.js:10559-10668 placement
function unplaceableFolders(folderEntries, state) {
  return [
    ...(state === "unplaceable" ? ["Personal"] : []),
    ...folderEntries.flatMap(([name, value]) => (value === "unplaceable" ? [name] : [])),
  ];
}
//@ chunk-2214fejy.js:10668-10748 placement
function shellFoldersByKind(...sources) {
  return SHELL_FOLDER_NAMES.map((name) => {
    let placement = mergePlacements(sources.map((source) => placementFor(source, name)));
    return [name, placement];
  });
}
//@ chunk-2214fejy.js:10748-10823 placement
function placedPaths(autoRun) {
  return normalizeCaseForComparison_2(
    autoRun.flatMap(([, value]) => (typeof value === "object" ? value.placed : [])),
  );
}
//@ chunk-2214fejy.js:10823-10970 placement
function unplaceableFailure(names) {
  return unreadableProfileDirs(
    `the User Shell Folders key's ${names.join(" and ")} could not be placed by any source that read ${names.length === 1 ? "it" : "them"}`,
  );
}
//@ chunk-2214fejy.js:10970-11129 placement
function mergePlacements(placements) {
  let paths = normalizeCaseForComparison_2(
    placements.flatMap((placement) => (typeof placement === "object" ? placement.placed : [])),
  );
  if (paths.length > 0)
    return {
      placed: paths,
    };
  return placements.includes("unplaceable") ? "unplaceable" : "absent";
}
//@ chunk-2214fejy.js:11129-11189 placement
function placementFor(autoRun, name) {
  return autoRun.find(([entryName]) => entryName === name)?.[1] ?? "absent";
}
//@ chunk-2214fejy.js:11189-12009 placement
async function queryUserShellFoldersViaReg() {
  let regExe = await findRegExe();
  if (regExe === undefined) return unreadableProfileDirs("no reg.exe under a local Windows directory", false);
  let { stdout, stderr, exitCode, timedOut } = await execFileNoThrow(
    regExe,
    ["query", USER_SHELL_FOLDERS_KEY],
    {
      cwd: win32.dirname(regExe),
      timeout: 5000,
      stdin: "ignore",
    },
  );
  if (timedOut || exitCode === undefined)
    return unreadableProfileDirs(timedOut ? "reg.exe took over five seconds" : "reg.exe did not run");
  if (exitCode !== 0)
    return /unable to find/i.test(`${stderr}${stdout}`)
      ? {
          failed: false,
          documents: "absent",
          autoRun: [],
        }
      : unreadableProfileDirs(`reg.exe exited ${exitCode}`);
  let vars = {
    USERPROFILE: homedir(),
    USERNAME: envAtStartup("USERNAME"),
    HOMESHARE: envAtStartup("HOMESHARE"),
    HOMEDRIVE: envAtStartup("HOMEDRIVE"),
    HOMEPATH: envAtStartup("HOMEPATH"),
    APPDATA: envAtStartup("APPDATA"),
    LOCALAPPDATA: envAtStartup("LOCALAPPDATA"),
  };
  let readFolder = (name) => {
    let trimmed = registryValuePattern(name, "REG_\\w+").exec(stdout)?.[1]?.trim();
    if (trimmed === undefined || trimmed === "") return "absent";
    let registryValue = readRegistryValue(stdout, name, vars);
    return registryValue === null
      ? "unplaceable"
      : {
          placed: [registryValue],
        };
  };
  return {
    failed: false,
    documents: readFolder("Personal"),
    autoRun: SHELL_FOLDER_NAMES.map((name) => [name, readFolder(name)]),
  };
}
//@ chunk-2214fejy.js:12009-12478 placement
/**
 * Windows 需要定位的用户 shell 文件夹名，以及读取这些文件夹与 PowerShell 配置文件位置的 PowerShell 脚本。
 */
var SHELL_FOLDER_NAMES; // deferred: uses DEFAULT_WINDOWS_DIR of its import cycle while loading; runs once the cycle is complete
var POWERSHELL_FOLDERS_SCRIPT;
deferInit("chunk-2214fejy.js:12009", () => {
  SHELL_FOLDER_NAMES = ["AppData", "Local AppData", "Start Menu", "Programs", "Startup"];
  POWERSHELL_FOLDERS_SCRIPT = [
    `$k='HKCU:\\${USER_SHELL_FOLDERS_KEY.slice(5)}'`,
    "$p=$null;$x='!';try{$p=Get-ItemProperty -LiteralPath $k -ErrorAction Stop;$x=''}catch{if($_.FullyQualifiedErrorId -like 'PathNotFound,*'){$x=''}}",
    `foreach($n in ${SHELL_FOLDER_NAMES.map((name) => `'${name}'`).join(",")}){$v=$x;if($null -ne $p -and $null -ne $p.$n){$v=([int[]][char[]][string]$p.$n) -join ','};$n+'='+$v}`,
    "([int[]][char[]]$PROFILE.CurrentUserAllHosts) -join ','",
  ].join(";");
});
//@ chunk-2214fejy.js:12478-12525 placement
function powerShellProfileAnswer() {
  return (profileDirsState.powershellAnswer ??= queryPowerShellProfile());
}
//@ chunk-2214fejy.js:12525-13249 placement
async function queryPowerShellProfile() {
  let cachedPowerShellPath = await getCachedPowerShellPath();
  if (cachedPowerShellPath === null || !win32.isAbsolute(cachedPowerShellPath))
    return unreadableProfileDirs("no PowerShell was found to ask for $PROFILE");
  let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
  let { stdout, exitCode, timedOut } = await execFileNoThrow(
    cachedPowerShellPath,
    ["-NoProfile", "-NonInteractive", "-Command", POWERSHELL_FOLDERS_SCRIPT],
    {
      cwd: win32.dirname(cachedPowerShellPath),
      timeout: 5000,
      stdin: "ignore",
      ...(latchedPreSettingsEnvSnapshot === undefined
        ? {}
        : {
            env: latchedPreSettingsEnvSnapshot,
            extendEnv: false,
          }),
    },
  );
  if (timedOut || exitCode !== 0)
    return unreadableProfileDirs(
      timedOut ? "PowerShell took over five seconds to name $PROFILE" : "PowerShell did not name $PROFILE",
    );
  let powerShellProfileDir = parsePowerShellProfileDir(stdout);
  if (powerShellProfileDir === null)
    return unreadableProfileDirs("PowerShell's $PROFILE could not be placed");
  let mapped = SHELL_FOLDER_NAMES.map((name) => [
    name,
    new RegExp(`^${name.replace(/ /g, "[ ]")}=(.*?)\\r?$`, "m").exec(stdout)?.[1],
  ]);
  return {
    failed: false,
    documents: powerShellProfileDir,
    autoRun: mapped.some(([, value]) => value === undefined || value === "!")
      ? "unreadable"
      : mapped.flatMap(([name, raw]) => (raw === undefined ? [] : [[name, parsePowerShellFolderValue(raw)]])),
  };
}
//@ chunk-2214fejy.js:13249-13451 placement
function parsePowerShellFolderValue(raw) {
  let decoded = /^\d{1,5}(,\d{1,5})*$/.test(raw) ? String.fromCharCode(...raw.split(",").map(Number)) : raw;
  if (decoded.trim() === "") return "absent";
  let dir = sanitizeProfileDir(decoded === raw ? undefined : decoded);
  return dir === null
    ? "unplaceable"
    : {
        placed: [dir],
      };
}
//@ chunk-2214fejy.js:13451-13528 placement
/**
 * 构造「读取失败」的探测结果：已结算、无文档、可/不可重试并给出原因。
 */
function unreadableProfileDirs(why, retry = true) {
  return {
    settled: true,
    documents: null,
    failed: true,
    retry,
    why,
  };
}
//@ chunk-2214fejy.js:13528-13999 placement
/**
 * 把文件夹路径解析到真实卷路径（含映射网络驱动器），分出已解析、无法解析和不存在的三类。
 */
async function resolveVolumePaths(folders) {
  if (getPlatform() !== "windows")
    return {
      resolved: new Map(),
      unresolved: [],
      missing: [],
    };
  let results = await Promise.all(
    folders.map(async (folder) => {
      let volume = await resolveVolumeCached(folder);
      return {
        folder,
        outcome: "unresolved" in volume ? await resolveMappedDrive(folder) : volume,
      };
    }),
  ).finally(resetProfileDirAnswers);
  return {
    resolved: new Map(
      results.flatMap(({ folder, outcome }) =>
        "resolved" in outcome && outcome.resolved !== folder ? [[folder, outcome.resolved]] : [],
      ),
    ),
    unresolved: results.flatMap(({ folder, outcome }) => ("unresolved" in outcome ? [folder] : [])),
    missing: results.flatMap(({ folder, outcome }) => ("missing" in outcome ? [folder] : [])),
  };
}
//@ chunk-2214fejy.js:13999-14011 placement
var VOLUME_RESOLVE_TIMEOUT_MS = 5000;
//@ chunk-2214fejy.js:14011-14075 placement
function resetProfileDirAnswers() {
  profileDirsState.volumeAnswers.clear();
  profileDirsState.powershellAnswer = undefined;
}
//@ chunk-2214fejy.js:14075-14225 placement
function resolveVolumeCached(folder) {
  let cached = profileDirsState.volumeAnswers.get(folder);
  if (cached !== undefined) return cached;
  let promise = withDeadline(resolveVolumePath(folder), VOLUME_RESOLVE_TIMEOUT_MS).then(
    (answer) =>
      answer ?? {
        unresolved: true,
      },
  );
  profileDirsState.volumeAnswers.set(folder, promise);
  return promise;
}
//@ chunk-2214fejy.js:14225-14512 placement
async function resolveVolumePath(path) {
  try {
    return {
      resolved: await realpath(path),
    };
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR")
      return {
        unresolved: true,
      };
    let root = win32.parse(path).root;
    if (root === "" || root === path)
      return {
        unresolved: true,
      };
    return realpath(root).then(
      (rootReal) => ({
        resolved: win32.join(rootReal, path.slice(root.length)),
        missing: true,
      }),
      () => ({
        unresolved: true,
      }),
    );
  }
}
//@ chunk-2214fejy.js:14512-15019 placement
/**
 * 把映射网络驱动器上的路径还原为 UNC 路径：优先用 HOMESHARE，否则用 reg.exe 查询 HKCU\Network 下的 RemotePath。
 */
async function resolveMappedDrive(folder) {
  let upper = /^([A-Za-z]):[\\/]/.exec(folder)?.[1]?.toUpperCase();
  if (upper === undefined)
    return {
      unresolved: true,
    };
  let sliced = folder.slice(2);
  let homeShare = sanitizeUncPath(envAtStartup("HOMESHARE"));
  if (homeShare !== null && envAtStartup("HOMEDRIVE")?.toUpperCase() === `${upper}:`)
    return {
      resolved: win32.join(homeShare, sliced),
    };
  let regExe = await findRegExe();
  if (regExe === undefined)
    return {
      unresolved: true,
    };
  let { stdout, exitCode, timedOut } = await execFileNoThrow(
    regExe,
    ["query", `HKCU\\Network\\${upper}`, "/v", "RemotePath"],
    {
      cwd: win32.dirname(regExe),
      timeout: 5000,
      stdin: "ignore",
    },
  );
  let remotePath = !timedOut && exitCode === 0 ? remotePathFromReg(stdout) : null;
  return remotePath === null
    ? {
        unresolved: true,
      }
    : {
        resolved: win32.join(remotePath, sliced),
      };
}
//@ chunk-2214fejy.js:15019-15113 placement
function remotePathFromReg(stdout) {
  return sanitizeUncPath(/^[ \t]+RemotePath[ \t]+REG_SZ[ \t]+(.+?)[ \t]*\r?$/im.exec(stdout)?.[1]);
}
//@ chunk-2214fejy.js:15113-15206 placement
function sanitizeUncPath(path) {
  return path !== undefined && /^\\\\(?![?.][\\/])[^\\/]+[\\/]+[^\\/]+/.test(path)
    ? sanitizeProfileDir(path)
    : null;
}
export {
  windowsProfileDirsUnread,
  windowsProfileDirsReadFailure,
  windowsPowerShellProfileDirs,
  windowsAutoRunDirs,
  primeWindowsProfileDirs,
  onWindowsProfileDirsSettled,
  PROFILE_DIRS_UNREADABLE_NOTICE_KEY,
  pendingWindowsProfileDirsRead,
};
