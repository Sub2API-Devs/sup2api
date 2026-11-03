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
import { homedir, homedir as homedir_2 } from "os";
import { realpath, realpath as realpath_2 } from "fs/promises";
import { getPlatform } from "../../utils/platform.js";
import { uniq } from "../../utils/collections.js";
import { isAbsolutePlatformPath } from "../../utils/git.js";
import { getLatchedPreSettingsEnvSnapshot } from "../../utils/managedEnvApply.js";
import { env } from "../../utils/env.js";
import { logError } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import { ge } from "../../utils/identity.js";
import { createSignal } from "../../utils/signal.js";
import { pathExists } from "../../utils/fsSafety/atomicWriteStaging.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { getCachedPowerShellPath } from "../../utils/shell/powershellDetection.js";
import { withDeadline } from "../../utils/sleep.js";
import { getErrnoCode } from "../../utils/errors.js";

//@ chunk-e2fknt7w.js:3656-3930 placement
function windowsPowerShellProfileDirs() {
  if (getPlatform() !== "windows") return [];
  let { result: e } = profileDirsState,
    filtered = [
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
  let { result: e } = profileDirsState,
    n = uniq([...appDataDirs(), startMenuDir(), ...(e.settled && !e.failed ? O(e.autoRun) : [])]);
  return uniq(n.flatMap((o) => [o, profileDirsState.resolved.get(o) ?? o]));
}
//@ chunk-e2fknt7w.js:4100-4200 placement
function appDataDirs() {
  return ["APPDATA", "LOCALAPPDATA"].flatMap((e) => {
    let n = y(h(e));
    return n === null ? [] : [n];
  });
}
//@ chunk-e2fknt7w.js:4200-4336 placement
function startMenuDir() {
  let e = y(h("ProgramData") || h("PROGRAMDATA") || h("ALLUSERSPROFILE")) ?? DEFAULT_PROGRAMDATA_DIR;
  return win32.join(e, "Microsoft", "Windows", "Start Menu");
}
//@ chunk-e2fknt7w.js:4336-4481 placement
function oneDriveDocumentsDirs() {
  return [h("OneDrive"), h("OneDriveConsumer"), h("OneDriveCommercial")]
    .filter((e) => e !== void 0 && isAbsolutePlatformPath(e))
    .map((e) => win32.join(e, "Documents"));
}
//@ chunk-e2fknt7w.js:4481-4534 placement
function h(e) {
  let n = getLatchedPreSettingsEnvSnapshot();
  return n !== void 0 ? n[e] : env[e];
}
//@ chunk-e2fknt7w.js:4534-4591 placement
function windowsProfileDirsUnread() {
  return getPlatform() === "windows" && !profileDirsState.result.settled;
}
//@ chunk-e2fknt7w.js:4591-4679 placement
function windowsProfileDirsReadFailure() {
  let { result: e } = profileDirsState;
  return getPlatform() === "windows" && e.settled && e.failed ? e.why : void 0;
}
//@ chunk-e2fknt7w.js:4679-4720 placement
var PROFILE_DIRS_UNREADABLE_NOTICE_KEY = "served-profile-dirs-unreadable";
//@ chunk-e2fknt7w.js:4720-6451 placement
async function primeWindowsProfileDirs() {
  if (getPlatform() !== "windows" || ue()) return;
  if (de() && profileDirsState.unresolved.length > 0) {
    ((profileDirsState.inFlight ??= resolveVolumePaths(profileDirsState.unresolved)
      .then(async ({ resolved: resolved, unresolved: unresolved, missing: missing }) => {
        let { result: r } = profileDirsState,
          s;
        try {
          s = r.settled && !r.failed ? await rereadMissingProfileDirs(r, missing) : void 0;
        } catch (error) {
          (logError(error),
            (s = logProfileDirsUnsettled(
              S(
                `checking a missing profile folder against PowerShell threw (${error instanceof Error ? error.message : String(error)})`,
              ),
            )));
        }
        if (
          ((profileDirsState.resolved = new Map([
            ...profileDirsState.resolved,
            ...resolved,
            ...(s?.its?.resolved ?? []),
          ])),
          (profileDirsState.unresolved = [...unresolved, ...(s?.its?.unresolved ?? [])]),
          (profileDirsState.unresolvedAskedAt = Date.now()),
          s !== void 0)
        )
          profileDirsState.result = s.result;
        if (((profileDirsState.inFlight = void 0), resolved.size > 0 || s !== void 0))
          emitProfileDirsSettled();
      })
      .catch((e) => {
        ((profileDirsState.inFlight = void 0),
          (profileDirsState.unresolvedAskedAt = Date.now()),
          logError(e),
          logForDebugging(
            `[toolHosts] Re-asking the unresolved folders threw (${e instanceof Error ? e.message : String(e)}); they are asked again the next time serving or a bind starts.`,
          ));
      })),
      await profileDirsState.inFlight);
    return;
  }
  ((profileDirsState.inFlight ??= readProfileDirs()
    .catch((e) => ({
      settled: !0,
      documents: null,
      failed: !0,
      retry: !0,
      why: e instanceof Error ? e.message : "the read threw",
    }))
    .then(async (e) => {
      let { resolved: resolved, unresolved: unresolved } = await resolveVolumePaths([
        ...(e.failed || e.documents === null ? [] : [e.documents]),
        ...(e.failed ? [] : e.kept),
        ...oneDriveDocumentsDirs(),
        ...(e.failed ? [] : O(e.autoRun)),
        ...appDataDirs(),
      ]);
      if (
        ((profileDirsState.resolved = resolved),
        (profileDirsState.unresolved = unresolved),
        (profileDirsState.unresolvedAskedAt = Date.now()),
        (profileDirsState.result = e),
        (profileDirsState.inFlight = void 0),
        e.failed)
      )
        logForDebugging(
          `[toolHosts] Could not read where this machine keeps its profile folders (${e.why}); its tools are not offered to cloud sessions until the next start reads them.`,
        );
      emitProfileDirsSettled();
    })
    .catch((e) => {
      ((profileDirsState.result = {
        settled: !0,
        documents: null,
        failed: !0,
        retry: !0,
        why: e instanceof Error ? e.message : "settling the read threw",
      }),
        (profileDirsState.inFlight = void 0),
        logError(e),
        logForDebugging(
          `[toolHosts] Settling the profile-folder read threw (${e instanceof Error ? e.message : String(e)}); serving stays off until the next start reads again.`,
        ),
        emitProfileDirsSettled());
    })),
    await profileDirsState.inFlight);
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
  return getPlatform() !== "windows" || ue() ? void 0 : primeWindowsProfileDirs();
}
//@ chunk-e2fknt7w.js:6647-6693 placement
function onWindowsProfileDirsSettled(e) {
  return profileDirsState.settled.subscribe(e);
}
/**
 * Windows 用户文件夹解析的进程状态：结果、已解析/未解析的路径、进行中的读取、卷与 PowerShell 的答复。
 */
//@ chunk-e2fknt7w.js:6693-7023 placement
var profileDirsState = ge(
  {
    result: { settled: !1 },
    resolved: new Map(),
    unresolved: [],
    unresolvedAskedAt: 0,
    inFlight: void 0,
    settled: createSignal(),
    volumeAnswers: new Map(),
    powershellAnswer: void 0,
  },
  (e) => {
    ((e.result = { settled: !1 }),
      (e.resolved = new Map()),
      (e.unresolved = []),
      (e.unresolvedAskedAt = 0),
      (e.inFlight = void 0),
      e.settled.clear(),
      e.volumeAnswers.clear(),
      (e.powershellAnswer = void 0));
  },
);
//@ chunk-e2fknt7w.js:7023-7111 placement
function ue() {
  return (
    de() && (profileDirsState.unresolved.length === 0 || Date.now() - profileDirsState.unresolvedAskedAt < Ve)
  );
}
//@ chunk-e2fknt7w.js:7111-7124 placement
var Ve = 60000;
//@ chunk-e2fknt7w.js:7124-7194 placement
function de() {
  let { result: e } = profileDirsState;
  return e.settled && (!e.failed || !e.retry);
}
//@ chunk-e2fknt7w.js:7194-7302 placement
function readRegistryValue(e, n, o) {
  let r = registryValuePattern(n)
    .exec(e)?.[1]
    ?.replace(/%([^%]+)%/g, (s, u) => o[u.toUpperCase()] ?? s);
  return y(r);
}
//@ chunk-e2fknt7w.js:7302-7436 placement
function registryValuePattern(e, n = "REG_(?:EXPAND_)?SZ") {
  return new RegExp("^[ \\t]+" + e.replace(/ /g, "[ ]") + "[ \\t]+" + n + "[ \\t]+(.+?)[ \\t]*\\r?$", "im");
}
//@ chunk-e2fknt7w.js:7436-7650 placement
function parsePowerShellProfileDir(e) {
  let n = e.trim().split(/\r?\n/).pop()?.trim() ?? "",
    o = y(/^\d{1,5}(,\d{1,5})*$/.test(n) ? String.fromCharCode(...n.split(",").map(Number)) : n);
  return o !== null && /\.ps1$/i.test(o) ? win32.dirname(win32.dirname(o)) : null;
}
//@ chunk-e2fknt7w.js:7650-7719 placement
function y(e) {
  return e === void 0 || /[%?\uFFFD]/.test(e) || !isAbsolutePlatformPath(e) ? null : e;
}
//@ chunk-e2fknt7w.js:7719-7923 placement
async function findRegExe() {
  let joined = win32.join(DEFAULT_WINDOWS_DIR, "System32", "reg.exe");
  if (await pathExists(joined)) return joined;
  let n = h("SystemRoot") || h("SYSTEMROOT");
  return n !== void 0 && /^[A-Za-z]:[\\/]/.test(n) ? win32.join(n, "System32", "reg.exe") : void 0;
}
//@ chunk-e2fknt7w.js:7923-8051 placement
var DEFAULT_WINDOWS_DIR = "C:\\Windows",
  DEFAULT_PROGRAMDATA_DIR = "C:\\ProgramData",
  USER_SHELL_FOLDERS_KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders";
/**
 * 读取 Windows 用户 shell 文件夹位置：先用 reg.exe 查 User Shell Folders，无法确定时退回 PowerShell，合并两者结果并核实目录存在。
 */
//@ chunk-e2fknt7w.js:8051-8655 placement
async function readProfileDirs() {
  let regResult = await queryUserShellFoldersViaReg();
  if (
    !regResult.failed &&
    regResult.documents !== "unplaceable" &&
    regResult.autoRun.every(([, o]) => o !== "unplaceable")
  )
    return settleProfileDirs(regResult.autoRun, regResult.documents);
  let psResult = await we();
  if (psResult.failed)
    return S(
      `${regResult.failed ? regResult.why : `reg.exe could not place the key's ${unplaceableFolders(regResult.autoRun, regResult.documents).join(" and ")}`}; ${psResult.why}`,
      (regResult.failed ? regResult.retry : !0) || psResult.retry,
    );
  if (regResult.failed && psResult.autoRun === "unreadable")
    return S(`${regResult.why}; PowerShell could not read the User Shell Folders key`);
  return settleProfileDirs(
    j(
      ...(regResult.failed ? [] : [regResult.autoRun]),
      ...(psResult.autoRun === "unreadable" ? [] : [psResult.autoRun]),
    ),
    regResult.failed || regResult.documents === "unplaceable"
      ? { placed: [psResult.documents] }
      : regResult.documents,
  );
}
/**
 * 确认 reg.exe 给出的文件夹：对不存在的再问 PowerShell，合并结果并检查仍无法定位的文件夹。
 */
//@ chunk-e2fknt7w.js:8655-9126 placement
async function settleProfileDirs(e, n) {
  let o = typeof n === "object" ? (n.placed[0] ?? null) : null,
    r = [...(o === null ? [] : [o]), ...O(e)],
    flat = (
      await Promise.all(r.map(async (E) => ("missing" in (await resolveVolumeCached(E)) ? [E] : [])))
    ).flat(),
    u =
      flat.length > 0 ? await askPowerShellForDirs(o !== null && flat.includes(o) ? o : null, flat) : void 0;
  if (u !== void 0 && u.failed) return u;
  let d = u?.autoRun,
    a = d === void 0 ? e : j(e, d),
    m = unplaceableFolders(a, n);
  if (m.length > 0) return unplaceableFailure(m);
  let w = u?.documents ?? null;
  return {
    settled: !0,
    documents: w ?? o,
    kept: w !== null && o !== null && w !== o ? [o] : [],
    autoRun: a,
    failed: !1,
  };
}
/**
 * 重新读取缺失的 Windows 用户文件夹：经 PowerShell 获取新位置，返回更新后的结果与需要核实的路径。
 */
//@ chunk-e2fknt7w.js:9126-9786 placement
async function rereadMissingProfileDirs(dirs, missing) {
  let filtered = [...(dirs.documents === null ? [] : [dirs.documents]), ...O(dirs.autoRun)].filter((w) =>
    missing.includes(w),
  );
  if (filtered.length === 0) return;
  let includesDocuments = dirs.documents !== null && filtered.includes(dirs.documents),
    psResult = await askPowerShellForDirs(includesDocuments ? dirs.documents : null, filtered);
  if (psResult.failed) return logProfileDirsUnsettled(psResult);
  let autoRun = psResult.autoRun === void 0 ? dirs.autoRun : j(dirs.autoRun, psResult.autoRun),
    absentFolders = unplaceableFolders(autoRun, "absent");
  if (absentFolders.length > 0) return logProfileDirsUnsettled(unplaceableFailure(absentFolders));
  let newDocuments =
      psResult.documents !== null && psResult.documents !== dirs.documents ? psResult.documents : null,
    filtered_2 = O(autoRun).filter((w) => !O(dirs.autoRun).includes(w));
  if (newDocuments === null && filtered_2.length === 0) return;
  return {
    result: {
      ...dirs,
      documents: newDocuments ?? dirs.documents,
      kept: uniq([
        ...dirs.kept,
        ...(newDocuments === null || dirs.documents === null ? [] : [dirs.documents]),
      ]),
      autoRun: autoRun,
    },
    its: await resolveVolumePaths([...(newDocuments === null ? [] : [newDocuments]), ...filtered_2]),
  };
}
//@ chunk-e2fknt7w.js:9786-10016 placement
function logProfileDirsUnsettled(e) {
  return (
    Re(),
    logForDebugging(
      `[toolHosts] Asked again where this machine keeps its profile folders and could not settle it \u2014 ${e.why}; its tools are not offered to cloud sessions until the next start reads again.`,
    ),
    { result: e }
  );
}
/**
 * 让 PowerShell 读取用户文件夹位置（文档与自动运行目录），失败或不可读时给出失败原因。
 */
//@ chunk-e2fknt7w.js:10016-10337 placement
async function askPowerShellForDirs(e, n) {
  let o = await we();
  if (o.failed) return missingDirsFailure(n, o.why);
  let filtered = n.filter((s) => s !== e);
  if (o.autoRun === "unreadable" && filtered.length > 0)
    return missingDirsFailure(filtered, "its registry provider could not read the User Shell Folders key");
  return {
    failed: !1,
    documents: e === null ? null : o.documents,
    autoRun: o.autoRun === "unreadable" ? void 0 : o.autoRun,
  };
}
//@ chunk-e2fknt7w.js:10337-10558 placement
function missingDirsFailure(e, n) {
  return S(
    `${e.join(" and ")} ${e.length === 1 ? "does not exist on its volume" : "do not exist on their volumes"} as read, and PowerShell could not say where ${e.length === 1 ? "the folder is" : "they are"} (${n})`,
  );
}
//@ chunk-e2fknt7w.js:10558-10667 placement
function unplaceableFolders(e, n) {
  return [
    ...(n === "unplaceable" ? ["Personal"] : []),
    ...e.flatMap(([o, r]) => (r === "unplaceable" ? [o] : [])),
  ];
}
//@ chunk-e2fknt7w.js:10667-10747 placement
function j(...e) {
  return SHELL_FOLDER_NAMES.map((n) => {
    let o = mergePlacements(e.map((r) => Ze(r, n)));
    return [n, o];
  });
}
//@ chunk-e2fknt7w.js:10747-10822 placement
function O(e) {
  return uniq(e.flatMap(([, n]) => (typeof n === "object" ? n.placed : [])));
}
//@ chunk-e2fknt7w.js:10822-10969 placement
function unplaceableFailure(e) {
  return S(
    `the User Shell Folders key's ${e.join(" and ")} could not be placed by any source that read ${e.length === 1 ? "it" : "them"}`,
  );
}
//@ chunk-e2fknt7w.js:10969-11128 placement
function mergePlacements(e) {
  let n = uniq(e.flatMap((o) => (typeof o === "object" ? o.placed : [])));
  if (n.length > 0) return { placed: n };
  return e.includes("unplaceable") ? "unplaceable" : "absent";
}
//@ chunk-e2fknt7w.js:11128-11188 placement
function Ze(e, n) {
  return e.find(([o]) => o === n)?.[1] ?? "absent";
}
//@ chunk-e2fknt7w.js:11188-12008 placement
async function queryUserShellFoldersViaReg() {
  let e = await findRegExe();
  if (e === void 0) return S("no reg.exe under a local Windows directory", !1);
  let {
    stdout: stdout,
    stderr: stderr,
    exitCode: exitCode,
    timedOut: timedOut,
  } = await execFileNoThrow(e, ["query", USER_SHELL_FOLDERS_KEY], {
    cwd: win32.dirname(e),
    timeout: 5000,
    stdin: "ignore",
  });
  if (timedOut || exitCode === void 0)
    return S(timedOut ? "reg.exe took over five seconds" : "reg.exe did not run");
  if (exitCode !== 0)
    return /unable to find/i.test(`${stderr}${stdout}`)
      ? { failed: !1, documents: "absent", autoRun: [] }
      : S(`reg.exe exited ${exitCode}`);
  let u = {
      USERPROFILE: homedir_2(),
      USERNAME: h("USERNAME"),
      HOMESHARE: h("HOMESHARE"),
      HOMEDRIVE: h("HOMEDRIVE"),
      HOMEPATH: h("HOMEPATH"),
      APPDATA: h("APPDATA"),
      LOCALAPPDATA: h("LOCALAPPDATA"),
    },
    d = (a) => {
      let m = registryValuePattern(a, "REG_\\w+").exec(stdout)?.[1]?.trim();
      if (m === void 0 || m === "") return "absent";
      let w = readRegistryValue(stdout, a, u);
      return w === null ? "unplaceable" : { placed: [w] };
    };
  return { failed: !1, documents: d("Personal"), autoRun: SHELL_FOLDER_NAMES.map((a) => [a, d(a)]) };
}
/**
 * Windows 需要定位的用户 shell 文件夹名，以及读取这些文件夹与 PowerShell 配置文件位置的 PowerShell 脚本。
 */
//@ chunk-e2fknt7w.js:12008-12477 placement
var SHELL_FOLDER_NAMES = ["AppData", "Local AppData", "Start Menu", "Programs", "Startup"],
  POWERSHELL_FOLDERS_SCRIPT = [
    `$k='HKCU:\\${USER_SHELL_FOLDERS_KEY.slice(5)}'`,
    "$p=$null;$x='!';try{$p=Get-ItemProperty -LiteralPath $k -ErrorAction Stop;$x=''}catch{if($_.FullyQualifiedErrorId -like 'PathNotFound,*'){$x=''}}",
    `foreach($n in ${SHELL_FOLDER_NAMES.map((e) => `'${e}'`).join(",")}){$v=$x;if($null -ne $p -and $null -ne $p.$n){$v=([int[]][char[]][string]$p.$n) -join ','};$n+'='+$v}`,
    "([int[]][char[]]$PROFILE.CurrentUserAllHosts) -join ','",
  ].join(";");
//@ chunk-e2fknt7w.js:12477-12524 placement
function we() {
  return (profileDirsState.powershellAnswer ??= queryPowerShellProfile());
}
//@ chunk-e2fknt7w.js:12524-13248 placement
async function queryPowerShellProfile() {
  let e = await getCachedPowerShellPath();
  if (e === null || !win32.isAbsolute(e)) return S("no PowerShell was found to ask for $PROFILE");
  let n = getLatchedPreSettingsEnvSnapshot(),
    {
      stdout: stdout,
      exitCode: exitCode,
      timedOut: timedOut,
    } = await execFileNoThrow(e, ["-NoProfile", "-NonInteractive", "-Command", POWERSHELL_FOLDERS_SCRIPT], {
      cwd: win32.dirname(e),
      timeout: 5000,
      stdin: "ignore",
      ...(n === void 0 ? {} : { env: n, extendEnv: !1 }),
    });
  if (timedOut || exitCode !== 0)
    return S(
      timedOut ? "PowerShell took over five seconds to name $PROFILE" : "PowerShell did not name $PROFILE",
    );
  let u = parsePowerShellProfileDir(stdout);
  if (u === null) return S("PowerShell's $PROFILE could not be placed");
  let mapped = SHELL_FOLDER_NAMES.map((a) => [
    a,
    new RegExp(`^${a.replace(/ /g, "[ ]")}=(.*?)\\r?$`, "m").exec(stdout)?.[1],
  ]);
  return {
    failed: !1,
    documents: u,
    autoRun: mapped.some(([, a]) => a === void 0 || a === "!")
      ? "unreadable"
      : mapped.flatMap(([a, m]) => (m === void 0 ? [] : [[a, parsePowerShellFolderValue(m)]])),
  };
}
//@ chunk-e2fknt7w.js:13248-13450 placement
function parsePowerShellFolderValue(e) {
  let n = /^\d{1,5}(,\d{1,5})*$/.test(e) ? String.fromCharCode(...e.split(",").map(Number)) : e;
  if (n.trim() === "") return "absent";
  let o = y(n === e ? void 0 : n);
  return o === null ? "unplaceable" : { placed: [o] };
}
//@ chunk-e2fknt7w.js:13450-13527 placement
function S(e, n = !0) {
  return { settled: !0, documents: null, failed: !0, retry: n, why: e };
}
/**
 * 把文件夹路径解析到真实卷路径（含映射网络驱动器），分出已解析、无法解析和不存在的三类。
 */
//@ chunk-e2fknt7w.js:13527-13998 placement
async function resolveVolumePaths(folders) {
  if (getPlatform() !== "windows") return { resolved: new Map(), unresolved: [], missing: [] };
  let n = await Promise.all(
    folders.map(async (o) => {
      let r = await resolveVolumeCached(o);
      return { folder: o, outcome: "unresolved" in r ? await resolveMappedDrive(o) : r };
    }),
  ).finally(Re);
  return {
    resolved: new Map(
      n.flatMap(({ folder: folder, outcome: outcome }) =>
        "resolved" in outcome && outcome.resolved !== folder ? [[folder, outcome.resolved]] : [],
      ),
    ),
    unresolved: n.flatMap(({ folder: folder, outcome: outcome }) =>
      "unresolved" in outcome ? [folder] : [],
    ),
    missing: n.flatMap(({ folder: folder, outcome: outcome }) => ("missing" in outcome ? [folder] : [])),
  };
}
//@ chunk-e2fknt7w.js:13998-14010 placement
var nn = 5000;
//@ chunk-e2fknt7w.js:14010-14074 placement
function Re() {
  (profileDirsState.volumeAnswers.clear(), (profileDirsState.powershellAnswer = void 0));
}
//@ chunk-e2fknt7w.js:14074-14224 placement
function resolveVolumeCached(e) {
  let n = profileDirsState.volumeAnswers.get(e);
  if (n !== void 0) return n;
  let o = withDeadline(resolveVolumePath(e), nn).then((r) => r ?? { unresolved: !0 });
  return (profileDirsState.volumeAnswers.set(e, o), o);
}
//@ chunk-e2fknt7w.js:14224-14511 placement
async function resolveVolumePath(e) {
  try {
    return { resolved: await realpath(e) };
  } catch (error) {
    let o = getErrnoCode(error);
    if (o !== "ENOENT" && o !== "ENOTDIR") return { unresolved: !0 };
    let root = win32.parse(e).root;
    if (root === "" || root === e) return { unresolved: !0 };
    return realpath(root).then(
      (s) => ({ resolved: win32.join(s, e.slice(root.length)), missing: !0 }),
      () => ({ unresolved: !0 }),
    );
  }
}
/**
 * 把映射网络驱动器上的路径还原为 UNC 路径：优先用 HOMESHARE，否则用 reg.exe 查询 HKCU\Network 下的 RemotePath。
 */
//@ chunk-e2fknt7w.js:14511-15018 placement
async function resolveMappedDrive(folder) {
  let n = /^([A-Za-z]):[\\/]/.exec(folder)?.[1]?.toUpperCase();
  if (n === void 0) return { unresolved: !0 };
  let sliced = folder.slice(2),
    r = Se(h("HOMESHARE"));
  if (r !== null && h("HOMEDRIVE")?.toUpperCase() === `${n}:`) return { resolved: win32.join(r, sliced) };
  let s = await findRegExe();
  if (s === void 0) return { unresolved: !0 };
  let {
      stdout: stdout,
      exitCode: exitCode,
      timedOut: timedOut,
    } = await execFileNoThrow(s, ["query", `HKCU\\Network\\${n}`, "/v", "RemotePath"], {
      cwd: win32.dirname(s),
      timeout: 5000,
      stdin: "ignore",
    }),
    m = !timedOut && exitCode === 0 ? rn(stdout) : null;
  return m === null ? { unresolved: !0 } : { resolved: win32.join(m, sliced) };
}
//@ chunk-e2fknt7w.js:15018-15112 placement
function rn(e) {
  return Se(/^[ \t]+RemotePath[ \t]+REG_SZ[ \t]+(.+?)[ \t]*\r?$/im.exec(e)?.[1]);
}
//@ chunk-e2fknt7w.js:15112-15205 placement
function Se(e) {
  return e !== void 0 && /^\\\\(?![?.][\\/])[^\\/]+[\\/]+[^\\/]+/.test(e) ? y(e) : null;
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
