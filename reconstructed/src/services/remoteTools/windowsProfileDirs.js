/**
 * services/remoteTools/windowsProfileDirs.ts
 *
 * 2.1.316 新增（门面模块 primeWindowsProfileDirs）。Windows 用户目录探测。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e2fknt7w.js (49)
 * attribution: placement 49
 */
import { win32 } from "path";
import { homedir } from "os";
import { realpath } from "fs/promises";
import { getPlatform } from "../../utils/platform.js";
import { uniq } from "../../utils/collections.js";
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

//@ chunk-e2fknt7w.js:3656-3930 placement
function windowsPowerShellProfileDirs() {
  if (getPlatform() !== "windows") return [];
  let { result: e } = profileDirsState;
  let filtered = [
    e.settled ? e.documents : null,
    ...(e.settled && !e.failed ? e.kept : []),
    ...oneDriveDocumentsDirs(),
  ].filter((o) => o !== null);
  return uniq(
    filtered
      .flatMap((o) => [o, profileDirsState.resolved.get(o) ?? o])
      .flatMap((o) => [win32.join(o, "PowerShell"), win32.join(o, "WindowsPowerShell")]),
  );
}
//@ chunk-e2fknt7w.js:3930-4100 placement
function windowsAutoRunDirs() {
  if (getPlatform() !== "windows") return [];
  let { result: e } = profileDirsState;
  let n = uniq([...appDataDirs(), startMenuDir(), ...(e.settled && !e.failed ? placedPaths(e.autoRun) : [])]);
  return uniq(n.flatMap((o) => [o, profileDirsState.resolved.get(o) ?? o]));
}
//@ chunk-e2fknt7w.js:4100-4200 placement
function appDataDirs() {
  return ["APPDATA", "LOCALAPPDATA"].flatMap((e) => {
    let n = sanitizeProfileDir(envAtStartup(e));
    return n === null ? [] : [n];
  });
}
//@ chunk-e2fknt7w.js:4200-4336 placement
function startMenuDir() {
  let e =
    sanitizeProfileDir(
      envAtStartup("ProgramData") || envAtStartup("PROGRAMDATA") || envAtStartup("ALLUSERSPROFILE"),
    ) ?? DEFAULT_PROGRAMDATA_DIR;
  return win32.join(e, "Microsoft", "Windows", "Start Menu");
}
//@ chunk-e2fknt7w.js:4336-4481 placement
function oneDriveDocumentsDirs() {
  return [envAtStartup("OneDrive"), envAtStartup("OneDriveConsumer"), envAtStartup("OneDriveCommercial")]
    .filter((e) => e !== undefined && isAbsolutePlatformPath(e))
    .map((e) => win32.join(e, "Documents"));
}
//@ chunk-e2fknt7w.js:4481-4534 placement
/**
 * 读环境变量：优先用启动时锁定的快照，否则读当前 env（Windows 文件夹正在探测时用）。
 */
function envAtStartup(e) {
  let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
  return latchedPreSettingsEnvSnapshot !== undefined ? latchedPreSettingsEnvSnapshot[e] : env[e];
}
//@ chunk-e2fknt7w.js:4534-4591 placement
function windowsProfileDirsUnread() {
  return getPlatform() === "windows" && !profileDirsState.result.settled;
}
//@ chunk-e2fknt7w.js:4591-4679 placement
function windowsProfileDirsReadFailure() {
  let { result: e } = profileDirsState;
  return getPlatform() === "windows" && e.settled && e.failed ? e.why : undefined;
}
//@ chunk-e2fknt7w.js:4679-4720 placement
var PROFILE_DIRS_UNREADABLE_NOTICE_KEY = "served-profile-dirs-unreadable";
//@ chunk-e2fknt7w.js:4720-6451 placement
async function primeWindowsProfileDirs() {
  if (getPlatform() !== "windows" || isProfileDirsUnsettledRecently()) return;
  if (isProfileDirsSettled() && profileDirsState.unresolved.length > 0) {
    profileDirsState.inFlight ??= resolveVolumePaths(profileDirsState.unresolved)
      .then(async ({ resolved, unresolved, missing }) => {
        let { result: dirs } = profileDirsState;
        let s;
        try {
          s = dirs.settled && !dirs.failed ? await rereadMissingProfileDirs(dirs, missing) : undefined;
        } catch (error) {
          logError(error);
          s = logProfileDirsUnsettled(
            unreadableProfileDirs(
              `checking a missing profile folder against PowerShell threw (${error instanceof Error ? error.message : String(error)})`,
            ),
          );
        }
        profileDirsState.resolved = new Map([
          ...profileDirsState.resolved,
          ...resolved,
          ...(s?.its?.resolved ?? []),
        ]);
        profileDirsState.unresolved = [...unresolved, ...(s?.its?.unresolved ?? [])];
        profileDirsState.unresolvedAskedAt = Date.now();
        if (s !== undefined) profileDirsState.result = s.result;
        profileDirsState.inFlight = undefined;
        if (resolved.size > 0 || s !== undefined) emitProfileDirsSettled();
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
    .then(async (e) => {
      let { resolved, unresolved } = await resolveVolumePaths([
        ...(e.failed || e.documents === null ? [] : [e.documents]),
        ...(e.failed ? [] : e.kept),
        ...oneDriveDocumentsDirs(),
        ...(e.failed ? [] : placedPaths(e.autoRun)),
        ...appDataDirs(),
      ]);
      profileDirsState.resolved = resolved;
      profileDirsState.unresolved = unresolved;
      profileDirsState.unresolvedAskedAt = Date.now();
      profileDirsState.result = e;
      profileDirsState.inFlight = undefined;
      if (e.failed)
        logForDebugging(
          `[toolHosts] Could not read where this machine keeps its profile folders (${e.why}); its tools are not offered to cloud sessions until the next start reads them.`,
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
//@ chunk-e2fknt7w.js:6451-6590 placement
function emitProfileDirsSettled() {
  try {
    profileDirsState.settled.emit();
  } catch (error) {
    logForDebugging(
      `[toolHosts] A profile-directory listener threw: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
//@ chunk-e2fknt7w.js:6590-6647 placement
function pendingWindowsProfileDirsRead() {
  return getPlatform() !== "windows" || isProfileDirsUnsettledRecently()
    ? undefined
    : primeWindowsProfileDirs();
}
//@ chunk-e2fknt7w.js:6647-6693 placement
function onWindowsProfileDirsSettled(e) {
  return profileDirsState.settled.subscribe(e);
}
//@ chunk-e2fknt7w.js:6693-7023 placement
/**
 * Windows 用户文件夹解析的进程状态：结果、已解析/未解析的路径、进行中的读取、卷与 PowerShell 的答复。
 */
var profileDirsState = identity(
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
  (e) => {
    e.result = {
      settled: false,
    };
    e.resolved = new Map();
    e.unresolved = [];
    e.unresolvedAskedAt = 0;
    e.inFlight = undefined;
    e.settled.clear();
    e.volumeAnswers.clear();
    e.powershellAnswer = undefined;
  },
);
//@ chunk-e2fknt7w.js:7023-7111 placement
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
//@ chunk-e2fknt7w.js:7111-7124 placement
var UNRESOLVED_REQUEST_COOLDOWN_MS = 60000;
//@ chunk-e2fknt7w.js:7124-7194 placement
function isProfileDirsSettled() {
  let { result: e } = profileDirsState;
  return e.settled && (!e.failed || !e.retry);
}
//@ chunk-e2fknt7w.js:7194-7302 placement
function readRegistryValue(stdout, n, o) {
  let replaced = registryValuePattern(n)
    .exec(stdout)?.[1]
    ?.replace(/%([^%]+)%/g, (s, u) => o[u.toUpperCase()] ?? s);
  return sanitizeProfileDir(replaced);
}
//@ chunk-e2fknt7w.js:7302-7436 placement
function registryValuePattern(e, n = "REG_(?:EXPAND_)?SZ") {
  return new RegExp("^[ \\t]+" + e.replace(/ /g, "[ ]") + "[ \\t]+" + n + "[ \\t]+(.+?)[ \\t]*\\r?$", "im");
}
//@ chunk-e2fknt7w.js:7436-7650 placement
function parsePowerShellProfileDir(stdout) {
  let n = stdout.trim().split(/\r?\n/).pop()?.trim() ?? "";
  let o = sanitizeProfileDir(
    /^\d{1,5}(,\d{1,5})*$/.test(n) ? String.fromCharCode(...n.split(",").map(Number)) : n,
  );
  return o !== null && /\.ps1$/i.test(o) ? win32.dirname(win32.dirname(o)) : null;
}
//@ chunk-e2fknt7w.js:7650-7719 placement
function sanitizeProfileDir(e) {
  return e === undefined || /[%?\uFFFD]/.test(e) || !isAbsolutePlatformPath(e) ? null : e;
}
//@ chunk-e2fknt7w.js:7719-7923 placement
async function findRegExe() {
  let joined = win32.join(DEFAULT_WINDOWS_DIR, "System32", "reg.exe");
  if (await pathExists(joined)) return joined;
  let n = envAtStartup("SystemRoot") || envAtStartup("SYSTEMROOT");
  return n !== undefined && /^[A-Za-z]:[\\/]/.test(n) ? win32.join(n, "System32", "reg.exe") : undefined;
}
//@ chunk-e2fknt7w.js:7923-8051 placement
var DEFAULT_WINDOWS_DIR = "C:\\Windows";
var DEFAULT_PROGRAMDATA_DIR = "C:\\ProgramData";
var USER_SHELL_FOLDERS_KEY =
  "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders";
//@ chunk-e2fknt7w.js:8051-8655 placement
/**
 * 读取 Windows 用户 shell 文件夹位置：先用 reg.exe 查 User Shell Folders，无法确定时退回 PowerShell，合并两者结果并核实目录存在。
 */
async function readProfileDirs() {
  let regResult = await queryUserShellFoldersViaReg();
  if (
    !regResult.failed &&
    regResult.documents !== "unplaceable" &&
    regResult.autoRun.every(([, o]) => o !== "unplaceable")
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
//@ chunk-e2fknt7w.js:8655-9126 placement
/**
 * 确认 reg.exe 给出的文件夹：对不存在的再问 PowerShell，合并结果并检查仍无法定位的文件夹。
 */
async function settleProfileDirs(e, n) {
  let o = typeof n === "object" ? (n.placed[0] ?? null) : null;
  let r = [...(o === null ? [] : [o]), ...placedPaths(e)];
  let s = (
    await Promise.all(r.map(async (E) => ("missing" in (await resolveVolumeCached(E)) ? [E] : [])))
  ).flat();
  let u = s.length > 0 ? await askPowerShellForDirs(o !== null && s.includes(o) ? o : null, s) : undefined;
  if (u !== undefined && u.failed) return u;
  let autoRun = u?.autoRun;
  let a = autoRun === undefined ? e : shellFoldersByKind(e, autoRun);
  let m = unplaceableFolders(a, n);
  if (m.length > 0) return unplaceableFailure(m);
  let documents = u?.documents ?? null;
  return {
    settled: true,
    documents: documents ?? o,
    kept: documents !== null && o !== null && documents !== o ? [o] : [],
    autoRun: a,
    failed: false,
  };
}
//@ chunk-e2fknt7w.js:9126-9786 placement
/**
 * 重新读取缺失的 Windows 用户文件夹：经 PowerShell 获取新位置，返回更新后的结果与需要核实的路径。
 */
async function rereadMissingProfileDirs(dirs, missing) {
  let filtered = [...(dirs.documents === null ? [] : [dirs.documents]), ...placedPaths(dirs.autoRun)].filter(
    (w) => missing.includes(w),
  );
  if (filtered.length === 0) return;
  let includesDocuments = dirs.documents !== null && filtered.includes(dirs.documents);
  let psResult = await askPowerShellForDirs(includesDocuments ? dirs.documents : null, filtered);
  if (psResult.failed) return logProfileDirsUnsettled(psResult);
  let autoRun =
    psResult.autoRun === undefined ? dirs.autoRun : shellFoldersByKind(dirs.autoRun, psResult.autoRun);
  let absentFolders = unplaceableFolders(autoRun, "absent");
  if (absentFolders.length > 0) return logProfileDirsUnsettled(unplaceableFailure(absentFolders));
  let newDocuments =
    psResult.documents !== null && psResult.documents !== dirs.documents ? psResult.documents : null;
  let filtered_2 = placedPaths(autoRun).filter((w) => !placedPaths(dirs.autoRun).includes(w));
  if (newDocuments === null && filtered_2.length === 0) return;
  return {
    result: {
      ...dirs,
      documents: newDocuments ?? dirs.documents,
      kept: uniq([
        ...dirs.kept,
        ...(newDocuments === null || dirs.documents === null ? [] : [dirs.documents]),
      ]),
      autoRun,
    },
    its: await resolveVolumePaths([...(newDocuments === null ? [] : [newDocuments]), ...filtered_2]),
  };
}
//@ chunk-e2fknt7w.js:9786-10016 placement
function logProfileDirsUnsettled(e) {
  resetProfileDirAnswers();
  logForDebugging(
    `[toolHosts] Asked again where this machine keeps its profile folders and could not settle it \u2014 ${e.why}; its tools are not offered to cloud sessions until the next start reads again.`,
  );
  return {
    result: e,
  };
}
//@ chunk-e2fknt7w.js:10016-10337 placement
/**
 * 让 PowerShell 读取用户文件夹位置（文档与自动运行目录），失败或不可读时给出失败原因。
 */
async function askPowerShellForDirs(e, n) {
  let o = await powerShellProfileAnswer();
  if (o.failed) return missingDirsFailure(n, o.why);
  let filtered = n.filter((s) => s !== e);
  if (o.autoRun === "unreadable" && filtered.length > 0)
    return missingDirsFailure(filtered, "its registry provider could not read the User Shell Folders key");
  return {
    failed: false,
    documents: e === null ? null : o.documents,
    autoRun: o.autoRun === "unreadable" ? undefined : o.autoRun,
  };
}
//@ chunk-e2fknt7w.js:10337-10558 placement
function missingDirsFailure(e, n) {
  return unreadableProfileDirs(
    `${e.join(" and ")} ${e.length === 1 ? "does not exist on its volume" : "do not exist on their volumes"} as read, and PowerShell could not say where ${e.length === 1 ? "the folder is" : "they are"} (${n})`,
  );
}
//@ chunk-e2fknt7w.js:10558-10667 placement
function unplaceableFolders(autoRun, n) {
  return [
    ...(n === "unplaceable" ? ["Personal"] : []),
    ...autoRun.flatMap(([o, r]) => (r === "unplaceable" ? [o] : [])),
  ];
}
//@ chunk-e2fknt7w.js:10667-10747 placement
function shellFoldersByKind(...e) {
  return SHELL_FOLDER_NAMES.map((n) => {
    let o = mergePlacements(e.map((r) => placementFor(r, n)));
    return [n, o];
  });
}
//@ chunk-e2fknt7w.js:10747-10822 placement
function placedPaths(autoRun) {
  return uniq(autoRun.flatMap(([, n]) => (typeof n === "object" ? n.placed : [])));
}
//@ chunk-e2fknt7w.js:10822-10969 placement
function unplaceableFailure(e) {
  return unreadableProfileDirs(
    `the User Shell Folders key's ${e.join(" and ")} could not be placed by any source that read ${e.length === 1 ? "it" : "them"}`,
  );
}
//@ chunk-e2fknt7w.js:10969-11128 placement
function mergePlacements(e) {
  let n = uniq(e.flatMap((o) => (typeof o === "object" ? o.placed : [])));
  if (n.length > 0)
    return {
      placed: n,
    };
  return e.includes("unplaceable") ? "unplaceable" : "absent";
}
//@ chunk-e2fknt7w.js:11128-11188 placement
function placementFor(e, n) {
  return e.find(([o]) => o === n)?.[1] ?? "absent";
}
//@ chunk-e2fknt7w.js:11188-12008 placement
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
  let u = {
    USERPROFILE: homedir(),
    USERNAME: envAtStartup("USERNAME"),
    HOMESHARE: envAtStartup("HOMESHARE"),
    HOMEDRIVE: envAtStartup("HOMEDRIVE"),
    HOMEPATH: envAtStartup("HOMEPATH"),
    APPDATA: envAtStartup("APPDATA"),
    LOCALAPPDATA: envAtStartup("LOCALAPPDATA"),
  };
  let d = (a) => {
    let trimmed = registryValuePattern(a, "REG_\\w+").exec(stdout)?.[1]?.trim();
    if (trimmed === undefined || trimmed === "") return "absent";
    let registryValue = readRegistryValue(stdout, a, u);
    return registryValue === null
      ? "unplaceable"
      : {
          placed: [registryValue],
        };
  };
  return {
    failed: false,
    documents: d("Personal"),
    autoRun: SHELL_FOLDER_NAMES.map((a) => [a, d(a)]),
  };
}
//@ chunk-e2fknt7w.js:12008-12477 placement
/**
 * Windows 需要定位的用户 shell 文件夹名，以及读取这些文件夹与 PowerShell 配置文件位置的 PowerShell 脚本。
 */
var SHELL_FOLDER_NAMES = ["AppData", "Local AppData", "Start Menu", "Programs", "Startup"];
var POWERSHELL_FOLDERS_SCRIPT = [
  `$k='HKCU:\\${USER_SHELL_FOLDERS_KEY.slice(5)}'`,
  "$p=$null;$x='!';try{$p=Get-ItemProperty -LiteralPath $k -ErrorAction Stop;$x=''}catch{if($_.FullyQualifiedErrorId -like 'PathNotFound,*'){$x=''}}",
  `foreach($n in ${SHELL_FOLDER_NAMES.map((e) => `'${e}'`).join(",")}){$v=$x;if($null -ne $p -and $null -ne $p.$n){$v=([int[]][char[]][string]$p.$n) -join ','};$n+'='+$v}`,
  "([int[]][char[]]$PROFILE.CurrentUserAllHosts) -join ','",
].join(";");
//@ chunk-e2fknt7w.js:12477-12524 placement
function powerShellProfileAnswer() {
  return (profileDirsState.powershellAnswer ??= queryPowerShellProfile());
}
//@ chunk-e2fknt7w.js:12524-13248 placement
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
  let mapped = SHELL_FOLDER_NAMES.map((a) => [
    a,
    new RegExp(`^${a.replace(/ /g, "[ ]")}=(.*?)\\r?$`, "m").exec(stdout)?.[1],
  ]);
  return {
    failed: false,
    documents: powerShellProfileDir,
    autoRun: mapped.some(([, a]) => a === undefined || a === "!")
      ? "unreadable"
      : mapped.flatMap(([a, m]) => (m === undefined ? [] : [[a, parsePowerShellFolderValue(m)]])),
  };
}
//@ chunk-e2fknt7w.js:13248-13450 placement
function parsePowerShellFolderValue(e) {
  let n = /^\d{1,5}(,\d{1,5})*$/.test(e) ? String.fromCharCode(...e.split(",").map(Number)) : e;
  if (n.trim() === "") return "absent";
  let o = sanitizeProfileDir(n === e ? undefined : n);
  return o === null
    ? "unplaceable"
    : {
        placed: [o],
      };
}
//@ chunk-e2fknt7w.js:13450-13527 placement
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
//@ chunk-e2fknt7w.js:13527-13998 placement
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
  let n = await Promise.all(
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
      n.flatMap(({ folder, outcome }) =>
        "resolved" in outcome && outcome.resolved !== folder ? [[folder, outcome.resolved]] : [],
      ),
    ),
    unresolved: n.flatMap(({ folder, outcome }) => ("unresolved" in outcome ? [folder] : [])),
    missing: n.flatMap(({ folder, outcome }) => ("missing" in outcome ? [folder] : [])),
  };
}
//@ chunk-e2fknt7w.js:13998-14010 placement
var VOLUME_RESOLVE_TIMEOUT_MS = 5000;
//@ chunk-e2fknt7w.js:14010-14074 placement
function resetProfileDirAnswers() {
  profileDirsState.volumeAnswers.clear();
  profileDirsState.powershellAnswer = undefined;
}
//@ chunk-e2fknt7w.js:14074-14224 placement
function resolveVolumeCached(e) {
  let n = profileDirsState.volumeAnswers.get(e);
  if (n !== undefined) return n;
  let o = withDeadline(resolveVolumePath(e), VOLUME_RESOLVE_TIMEOUT_MS).then(
    (r) =>
      r ?? {
        unresolved: true,
      },
  );
  profileDirsState.volumeAnswers.set(e, o);
  return o;
}
//@ chunk-e2fknt7w.js:14224-14511 placement
async function resolveVolumePath(e) {
  try {
    return {
      resolved: await realpath(e),
    };
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR")
      return {
        unresolved: true,
      };
    let root = win32.parse(e).root;
    if (root === "" || root === e)
      return {
        unresolved: true,
      };
    return realpath(root).then(
      (s) => ({
        resolved: win32.join(s, e.slice(root.length)),
        missing: true,
      }),
      () => ({
        unresolved: true,
      }),
    );
  }
}
//@ chunk-e2fknt7w.js:14511-15018 placement
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
  let r = sanitizeUncPath(envAtStartup("HOMESHARE"));
  if (r !== null && envAtStartup("HOMEDRIVE")?.toUpperCase() === `${upper}:`)
    return {
      resolved: win32.join(r, sliced),
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
  let m = !timedOut && exitCode === 0 ? remotePathFromReg(stdout) : null;
  return m === null
    ? {
        unresolved: true,
      }
    : {
        resolved: win32.join(m, sliced),
      };
}
//@ chunk-e2fknt7w.js:15018-15112 placement
function remotePathFromReg(stdout) {
  return sanitizeUncPath(/^[ \t]+RemotePath[ \t]+REG_SZ[ \t]+(.+?)[ \t]*\r?$/im.exec(stdout)?.[1]);
}
//@ chunk-e2fknt7w.js:15112-15205 placement
function sanitizeUncPath(e) {
  return e !== undefined && /^\\\\(?![?.][\\/])[^\\/]+[\\/]+[^\\/]+/.test(e) ? sanitizeProfileDir(e) : null;
}
export {
  PROFILE_DIRS_UNREADABLE_NOTICE_KEY,
  onWindowsProfileDirsSettled,
  primeWindowsProfileDirs,
  pendingWindowsProfileDirsRead,
  windowsProfileDirsUnread,
  windowsProfileDirsReadFailure,
  windowsPowerShellProfileDirs,
  windowsAutoRunDirs,
};
