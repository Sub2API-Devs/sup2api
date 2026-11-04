/**
 * commands/sandbox/windowsSandboxUninstall.ts
 *
 * 2.1.316 新增。claude sandbox uninstall（Windows 沙箱卸载与残留检查）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-v21qppnj.js (17)
 * attribution: placement 17
 */
import { basename, join, dirname } from "path";
import { homedir } from "os";
import {
  CLAUDECODESANDBOX,
  rgRunner,
  describeWindowsSandboxRemedy,
  isWindowsSandboxEnabled,
} from "../../utils/sandbox/windowsSandbox.js";
import {
  checkWindowsSandboxStatusAsync,
  forgetWindowsProfileReadAsync,
  WindowsSandboxError,
  uninstallWindowsSandbox as uninstallWindowsSandbox_2,
} from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/windows-sandbox-utils.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { plural } from "../../utils/stringUtils.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { systemRootDir } from "../../utils/claudeInChrome/windowsAppPaths.js";
import { windowsProcessTree } from "../../utils/auth/lockHolderLiveness.js";
import { diffLineToPlainText } from "../../components/diff/diffText.js";
import { env } from "../../utils/env.js";
import { pathPresence } from "../../utils/fsSafety/atomicWriteStaging.js";
import {
  WINDOWS_SANDBOX_SETUP_NOTICE,
  setupWindowsSandboxOnce,
} from "../../utils/sandbox/windowsSandboxSetup.js";
import { getRootSession } from "../../bootstrap/state.js";
import { writeStdoutAndDrain, exitAfterAnalyticsFlush } from "../../cli/exit.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  SandboxManager,
  shouldForceSandboxOn,
  isSandboxSettingOverriddenByPolicy,
  getEffectiveFilesystemPolicy,
} from "../../utils/sandbox/sandbox-adapter.js";
import { isScrubEnabled, isScrubSandboxAvailable } from "../../utils/subprocessEnv.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import { getPlatform } from "../../utils/platform.js";

//@ chunk-v21qppnj.js:5755-7058 placement
/**
 * Windows 沙箱卸载的用户提示集合：关闭程序的指引、未检查的沙箱进程说明、残留账户名、无需管理员批准的说明、最多列出 5 项、40 分钟超时与勿中断提醒。
 */
var UNINSTALL_TEXTS = "run claude sandbox uninstall again";
var CLOSE_PROGRAMS_HINT =
  "Close every Claude Code session, including VS Code. Quit the Claude desktop app from its tray icon. Run claude daemon stop to end background sessions. Whatever won't close, or belongs to another Windows user, you can end in Task Manager or by restarting the PC.";
var UNCHECKED_SANDBOX_PROCESSES_NOTE =
  "Not checked: who owns the programs that are running. Claude Code looked for Claude programs by name, under every Windows user. What a sandboxed command starts in the ordinary way ends with the Claude program it ran under. But a program that the sandbox account had Windows start another way, such as a scheduled task, may still be running, and it now has no network block and none of the sandbox's write blocks on system folders. Restart the PC to end anything still running as the sandbox account.";
var SANDBOX_USER_NAMES = [CLAUDECODESANDBOX, "srt-sandbox"];
var LEFT_OVER_ACCOUNT_NOTE = `If an earlier set-up stopped part-way, an account named ${CLAUDECODESANDBOX} may still be here. To see whether it is, run net user ${CLAUDECODESANDBOX}.`;
var NO_ADMIN_APPROVAL_HINT = "which then needs no administrator approval";
var MAX_LISTED_REMAINING = 5;
var UNINSTALL_TIMEOUT_MINUTES = 40;
var PROFILE_SCAN_DURATION_HINT =
  "goes through your user profile and project folders. On a large profile that can take many minutes, with nothing printed meanwhile.";
var DO_NOT_INTERRUPT_HINT = `Until this has ended, don't start Claude Code, don't close this window, and don't press Ctrl+C. Claude Code stops waiting after ${UNINSTALL_TIMEOUT_MINUTES} minutes.`;
//@ chunk-v21qppnj.js:7058-14107 placement
/**
 * Windows 沙箱卸载（claude sandbox uninstall）：停止服务、删除账户与目录并检查残留。
 */
async function uninstallWindowsSandbox(onNotice) {
  let runner = rgRunner();
  let status;
  try {
    status = await checkWindowsSandboxStatusAsync({
      srtWin: runner,
    });
  } catch (error) {
    logFeatureBad("sandbox_windows_uninstall", "status_probe_failed");
    return {
      status: "error",
      message: `Nothing was removed, because the sandbox's current state couldn't be read. You can ${UNINSTALL_TEXTS}. ${formatUninstallDetails(error)}`,
      leftBehind: [],
      filtersChecked: false,
    };
  }
  let filtersReadable = status.wfp.state !== "cannot-read";
  let sandboxLeftovers = describeSandboxLeftovers(status);
  let grantLeftovers = describeGrantLeftovers(status);
  if (sandboxLeftovers.length === 0 && grantLeftovers.length === 0) {
    logFeatureOk("sandbox_windows_uninstall", {
      removed: false,
    });
    return {
      status: "not_installed",
      message: `${filtersReadable ? "The Windows sandbox isn't installed on this PC, so nothing was removed." : "No sandbox account, group or stored password is on this PC, so nothing was removed. Claude Code can't read the network filters without administrator rights, so it can't say whether any are left."} ${LEFT_OVER_ACCOUNT_NOTE}`,
      leftBehind: [],
      filtersChecked: filtersReadable,
    };
  }
  let hasSandbox = sandboxLeftovers.length > 0;
  let refuse = (status, reason) => ({
    status,
    message: `Nothing was removed, because ${reason}`,
    leftBehind: [],
    filtersChecked: filtersReadable,
  });
  let runningProcesses = listRunningClaudeProcesses();
  if (runningProcesses === undefined) {
    logFeatureBad("sandbox_windows_uninstall", "programs_unreadable");
    return refuse(
      "error",
      `Claude Code couldn't list the programs that are running on this PC, so it can't tell whether sandboxed commands are still running. You can ${UNINSTALL_TEXTS}.`,
    );
  }
  if (runningProcesses.length > 0) {
    logFeatureSad("sandbox_windows_uninstall", "programs_open", {
      count: runningProcesses.length,
    });
    return refuse(
      "in_use",
      `Claude is still running on this PC: ${formatFailureDetails(runningProcesses)}.${hasSandbox ? " A sandboxed command that is still running would keep running with no network block." : ""} ${CLOSE_PROGRAMS_HINT} Then, from a terminal outside Claude Code, ${UNINSTALL_TEXTS}.`,
    );
  }
  await onNotice?.(
    hasSandbox
      ? `Removing the Windows sandbox. Windows may ask for administrator approval. No Claude program is running. Anything else that still runs as the sandbox account loses its network block and the sandbox's write blocks on system folders, and Claude Code can't check for that.${grantLeftovers.length > 0 ? ` Then the removal also takes the sandbox's entries off your files, for which it ${PROFILE_SCAN_DURATION_HINT}` : ""} ${DO_NOT_INTERRUPT_HINT}`
      : `Taking off the permission entries that the Windows sandbox may have left on your files. This needs no administrator approval. It ${PROFILE_SCAN_DURATION_HINT} ${DO_NOT_INTERRUPT_HINT}`,
  ).catch((error) => {
    logForDebugging(`[sandbox] uninstall: notice not printed: ${errorMessage(error)}`);
  });
  let timeoutMs = UNINSTALL_TIMEOUT_MINUTES * 60000;
  let deadline = Date.now() + timeoutMs;
  let errors = [];
  try {
    if (!hasSandbox) {
      await forgetWindowsProfileReadAsync({
        srtWin: runner,
        timeoutMs,
      }).catch((error) => {
        if (!(error instanceof WindowsSandboxError) || error.code !== "profile_forget_failed") throw error;
        errors.push(error);
      });
      await forgetSandboxAcls(runner, deadline - Date.now());
    } else if (
      uninstallWindowsSandbox_2({
        srtWin: runner,
        timeoutMs,
      }).cancelled
    ) {
      logFeatureSad("sandbox_windows_uninstall", "uac_cancelled");
      return refuse(
        "cancelled",
        `Windows' prompt for administrator approval was cancelled. To remove the sandbox, ${UNINSTALL_TEXTS} and approve the prompt. If you don't have administrator rights, ask your administrator to run claude sandbox uninstall from a copy of Claude Code that they installed themselves.${grantLeftovers.length > 0 ? ` Their run can't reach the sandbox's entries on your files. Afterwards, run claude sandbox uninstall yourself, ${NO_ADMIN_APPROVAL_HINT}.` : ""}`,
      );
    }
  } catch (error) {
    errors.push(error);
  }
  for (let error of errors)
    logForDebugging(`[sandbox] uninstall: ${errorMessage(error)}`, {
      level: "error",
    });
  let firstError = errors[0];
  let code = firstError instanceof WindowsSandboxError ? firstError.code : undefined;
  if (code === "spawn_failed") {
    logFeatureBad("sandbox_windows_uninstall", "spawn_failed");
    return refuse(
      "error",
      `the removal couldn't start. You can ${UNINSTALL_TEXTS}. ${formatUninstallDetails(firstError)}`,
    );
  }
  if (code === "kept_grants_in_use") {
    logFeatureSad("sandbox_windows_uninstall", "session_on_record");
    return refuse(
      "in_use",
      `the sandbox's record for your account shows a sandboxed session or command still running. The process IDs are in the details.${hasSandbox ? " Removing the sandbox now would leave it running with no network block." : ""} End those processes in Task Manager, or restart the PC. Then ${UNINSTALL_TEXTS}. ${formatUninstallDetails(firstError)}`,
    );
  }
  if (code === "profile_operation_in_progress") {
    logFeatureSad("sandbox_windows_uninstall", "profile_busy");
    return refuse(
      "in_use",
      `another set-up or removal of the sandbox is changing its entries on your user profile right now. On a large profile that can take many minutes. Let it finish without restarting the PC. Then ${UNINSTALL_TEXTS}.`,
    );
  }
  let sidNote = formatSids(status.user);
  let idsToKeepNote =
    sidNote &&
    ` Keep a note of the IDs of the sandbox account and group${sidNote}: permission entries left on files show them, and a later run may no longer know them.`;
  if (errors.some((error) => error instanceof WindowsSandboxError && error.code === "srt_win_timeout")) {
    logFeatureSad("sandbox_windows_uninstall", "helper_timeout");
    return {
      status: "error",
      message: hasSandbox
        ? `The removal didn't end within ${UNINSTALL_TIMEOUT_MINUTES} minutes. It may still be running, be waiting at Windows' prompt, or have been stopped part-way. When it has ended, ${UNINSTALL_TEXTS} to finish the removal.${idsToKeepNote}`
        : `Taking the sandbox's entries off your files didn't end within ${UNINSTALL_TIMEOUT_MINUTES} minutes, and was stopped part-way. To go on, ${UNINSTALL_TEXTS}.`,
      leftBehind: [],
      filtersChecked: false,
    };
  }
  let afterStatus;
  try {
    afterStatus = await checkWindowsSandboxStatusAsync({
      srtWin: runner,
    });
  } catch (error) {
    if (firstError === undefined) logFeatureSad("sandbox_windows_uninstall", "read_back_failed");
    else logFeatureBad("sandbox_windows_uninstall", "helper_stopped");
    return {
      status: "error",
      message: `The removal ${firstError === undefined ? "ran" : "stopped early"}, and what is left couldn't be read afterwards. To check, ${UNINSTALL_TEXTS}.${idsToKeepNote} ${(errors.length > 0 ? errors : [error]).map(formatUninstallDetails).join(" ")}`,
      leftBehind: [],
      filtersChecked: false,
    };
  }
  let startedMeanwhile = hasSandbox ? listRunningClaudeProcesses() : [];
  let startedNote =
    startedMeanwhile === undefined
      ? "Claude Code couldn't look again for Claude programs that started while the removal ran."
      : startedMeanwhile.length > 0
        ? `Started while the removal ran, and still running: ${formatFailureDetails(startedMeanwhile)}. Sandboxed commands that ${plural(startedMeanwhile.length, "it", "they")} started have no network block until they end. Close ${plural(startedMeanwhile.length, "it", "them")}.`
        : undefined;
  let leftoverInfo = {
    leftBehind: await windowsSandboxLeftovers(status.user, afterStatus.user),
    filtersChecked: afterStatus.wfp.state !== "cannot-read",
  };
  let sandboxLeftoverList = describeSandboxLeftovers(afterStatus);
  let grantLeftoverList = describeGrantLeftovers(afterStatus);
  let certainLocations = describeSandboxEntryLocations(grantLeftoverList.filter((entry) => entry.certain));
  let entries = grantLeftoverList.filter((entry) => !entry.certain);
  let extraDetails = [
    ...(startedNote === undefined ? [] : [startedNote]),
    ...errors.map(formatUninstallDetails),
  ];
  let filtersNote = leftoverInfo.filtersChecked
    ? ""
    : " Claude Code can't read the network filters without administrator rights. The removal reported that they are gone.";
  if (sandboxLeftoverList.length === 0 && grantLeftoverList.length > 0) {
    let keptEntriesOnly =
      !hasSandbox || firstError === undefined || errorMessage(firstError).includes("(exit 23)");
    if (keptEntriesOnly) logFeatureSad("sandbox_windows_uninstall", "kept_entries_left");
    else logFeatureBad("sandbox_windows_uninstall", "helper_stopped");
    return {
      ...leftoverInfo,
      status: "partial",
      message: [
        ...(hasSandbox
          ? [
              keptEntriesOnly
                ? `The Windows sandbox is removed from this PC.${filtersNote}`
                : "The removal stopped early.",
            ]
          : []),
        ...(certainLocations.length > 0
          ? [
              `These are still on your files: ${formatListConjunction(certainLocations)}. To finish, ${UNINSTALL_TEXTS}${hasSandbox ? `, ${NO_ADMIN_APPROVAL_HINT}` : ""}.`,
            ]
          : []),
        ...(entries.length > 0
          ? [
              `Claude Code can't tell whether ${formatListConjunction(describeSandboxEntryLocations(entries))} are all gone.`,
              ...new Set(
                entries.flatMap((entry) =>
                  entry.reason === undefined ? [] : [formatUninstallDetails(entry.reason)],
                ),
              ),
            ]
          : []),
        ...(hasSandbox ? [UNCHECKED_SANDBOX_PROCESSES_NOTE] : []),
        ...extraDetails,
      ].join(" "),
    };
  }
  if (firstError !== undefined || sandboxLeftoverList.length > 0) {
    if (firstError === undefined) logFeatureSad("sandbox_windows_uninstall", "partly_removed");
    else logFeatureBad("sandbox_windows_uninstall", "helper_stopped");
    return {
      ...leftoverInfo,
      status: "partial",
      message: [
        ...(hasSandbox || sandboxLeftoverList.length > 0
          ? [
              firstError === undefined
                ? "The Windows sandbox is only partly removed."
                : "The removal stopped early, so the Windows sandbox may be only partly removed.",
              ...(sandboxLeftoverList.length > 0
                ? [`Still here: ${formatListConjunction([...sandboxLeftoverList, ...certainLocations])}.`]
                : []),
              `The network filters come off first, so don't count on the network block. To finish, ${UNINSTALL_TEXTS}.`,
            ]
          : [
              "Taking the sandbox's entries off your files reported a problem, but the sandbox's record now lists none there.",
            ]),
        ...extraDetails,
      ].join(" "),
    };
  }
  let entries_2 = grantLeftovers.filter((entry) => entry.certain);
  logFeatureOk("sandbox_windows_uninstall", {
    removed: true,
    startedMeanwhile: hasSandbox ? (startedMeanwhile?.length ?? -1) : -1,
  });
  return {
    ...leftoverInfo,
    status: "ok",
    message: hasSandbox
      ? [
          `Removed the Windows sandbox from this PC: ${formatListConjunction([...sandboxLeftovers, ...describeSandboxEntryLocations(entries_2)])}.${filtersNote}`,
          ...(startedNote === undefined ? [] : [startedNote]),
          UNCHECKED_SANDBOX_PROCESSES_NOTE,
          "To set the sandbox up again, run `claude sandbox install`, or /sandbox install inside Claude Code.",
        ].join(`

`)
      : entries_2.length > 0
        ? `Took the Windows sandbox's entries off ${formatListConjunction(entries_2.map((entry) => entry.where))}.`
        : "No entries of the Windows sandbox are recorded on your files now.",
  };
}
//@ chunk-v21qppnj.js:14107-14509 placement
/**
 * 调 srt-win acl forget --all 撤掉沙箱写在项目目录上的 ACL；超时或失败抛 WindowsSandboxError。
 */
async function forgetSandboxAcls({ exe, prependArgs }, timeoutMs) {
  let { code, stderr, error, timedOut } =
    timeoutMs > 0
      ? await execFileNoThrow(
          exe,
          [...prependArgs, "acl", "forget", "--all", "--unless-held-by-others", String(process.pid)],
          {
            timeout: timeoutMs,
            cwd: systemRootDir(),
          },
        )
      : {
          code: 1,
          stderr: "",
          error: undefined,
          timedOut: true,
        };
  if (code !== 0)
    throw new WindowsSandboxError(
      timedOut ? "srt_win_timeout" : "uninstall_failed",
      `The sandbox's entries on your project folders could not all be taken off (exit ${code}): ${stderr || error || ""}`,
    );
}
//@ chunk-v21qppnj.js:14509-14873 placement
/**
 * 列出其他正在运行的 claude/cli/srt-win 进程（用于卸载前提示），快照失败返回 undefined。
 */
function listRunningClaudeProcesses() {
  let lower = basename(rgRunner().exe).toLowerCase();
  let processes;
  try {
    processes = windowsProcessTree();
  } catch (error) {
    logForDebugging(`[sandbox] uninstall: snapshot threw: ${errorMessage(error)}`, {
      level: "error",
    });
    return;
  }
  return processes
    ?.filter(({ pid, name: processName }) => {
      let lower_2 = processName.toLowerCase();
      return (
        pid !== process.pid &&
        (lower_2 === lower ||
          lower_2 === "claude.exe" ||
          lower_2.startsWith("claude.exe.") ||
          lower_2 === "cli.exe" ||
          lower_2 === "srt-win.exe")
      );
    })
    .map(({ pid, name: processName }) => `${diffLineToPlainText(processName)} (process ${pid})`);
}
//@ chunk-v21qppnj.js:14873-15111 placement
function describeSandboxLeftovers({ user, wfp }) {
  return [
    user.provisioned && "the sandbox account",
    user.groupExists && "the sandbox-runtime-users group",
    user.credPresent && "the stored password",
    (wfp.state === "installed" || wfp.filters > 0) && "the network filters",
  ].filter((leftover) => leftover !== false);
}
//@ chunk-v21qppnj.js:15111-15348 placement
function describeGrantLeftovers({ user }) {
  return [
    {
      record: user.profileGrant,
      where: "your user profile",
    },
    {
      record: user.persistentGrants,
      where: "your project folders",
    },
  ].flatMap(({ record, where }) =>
    record === undefined
      ? []
      : [
          {
            where,
            certain: record.state === "present",
            reason: record.reason,
          },
        ],
  );
}
//@ chunk-v21qppnj.js:15348-15438 placement
function describeSandboxEntryLocations(entries) {
  return entries.length > 0
    ? [`the sandbox's entries on ${formatListConjunction(entries.map((entry) => entry.where))}`]
    : [];
}
//@ chunk-v21qppnj.js:15438-15551 placement
function formatSids({ sid, groupSid }) {
  let filtered = [sid, groupSid].filter((sid) => sid !== undefined);
  return filtered.length > 0 ? ` (${filtered.join(" and ")})` : "";
}
//@ chunk-v21qppnj.js:15551-15629 placement
function formatListConjunction(items) {
  return new Intl.ListFormat("en", {
    type: "conjunction",
  }).format(items);
}
//@ chunk-v21qppnj.js:15629-15728 placement = formatFailureDetails (0.777)
function formatFailureDetails(items) {
  let remaining = items.length - MAX_LISTED_REMAINING;
  return remaining > 0
    ? `${items.slice(0, MAX_LISTED_REMAINING).join(", ")} and ${remaining} more`
    : items.join(", ");
}
//@ chunk-v21qppnj.js:15728-16246 placement
/**
 * 把 srt-win 的错误说明改写成面向 claude sandbox uninstall 的提示（去掉 srt-win 命令建议），包成 "(Details: …)"。
 */
function formatUninstallDetails(error) {
  let replaced = describeWindowsSandboxRemedy(errorMessage(error), {
    omitCcRemedy: true,
  })
    .replace(/; run `srt-win (?:profile forget|acl forget --all)`/g, "")
    .replace(/\s*What is left stays recorded; once[^\n]*? remove it\./g, "")
    .replace(/^srt-win [a-z ]+ removed nothing: |\s*End them and run it again\.$/g, "")
    .replace(/\s*\(`srt-win acl forget --drop-pending` gives it up\)/g, "")
    .replace(/`srt-win (?:profile forget|acl forget --all)`/g, "`claude sandbox uninstall`");
  return replaced.endsWith(":")
    ? `(Details: ${replaced.slice(0, -1)}, with no reason given.)`
    : `(Details: ${replaced})`;
}
//@ chunk-v21qppnj.js:16246-18771 placement
async function windowsSandboxLeftovers(user, user_2) {
  let sandboxRuntimeDir = join(env.ProgramData || env.PROGRAMDATA || "C:\\ProgramData", "sandbox-runtime");
  let profileDirs =
    user.provisioned && !user_2.provisioned
      ? SANDBOX_USER_NAMES.map((userName) => join(dirname(systemRootDir()), "Users", userName))
      : [];
  let [caJsonPresence, ...presences] = await Promise.all(
    [join(sandboxRuntimeDir, "ca", "ca.json"), ...profileDirs].map(pathPresence),
  );
  return [
    `Permission entries for the sandbox account and group${formatSids(user)}. Once its account or group is deleted, Windows shows an entry as a bare ID, and it matches no account. For each Windows user who used the sandbox, the entries can be on that user's Claude Code program files, older versions included, on their home folder and the folders between it and each project, and on files and folders that the sandbox opened or protected. For the account that ran this command, start with ${diffLineToPlainText(process.execPath)} and ${diffLineToPlainText(homedir())}.`,
    `For every other Windows user who used the sandbox, the entries that let it read their user profile and write to their project folders. The removal takes these off only for the account that ran this command. Each such project folder also has three entries that don't bear the sandbox's IDs: for OWNER RIGHTS, for that user, and for the folder's own capability ID. To take theirs off, each of those users runs claude sandbox uninstall under their own account, ${NO_ADMIN_APPROVAL_HINT}.`,
    "If a drive was disconnected when the sandbox was removed, the sandbox's entries on it stay there. Connect it and run claude sandbox uninstall again.",
    "Empty files and folders that the sandbox created to protect names that didn't exist yet, such as .mcp.json in a project.",
    `${diffLineToPlainText(sandboxRuntimeDir)}, the sandbox's folder for all users of this PC.${caJsonPresence === "gone" ? "" : " Its ca folder holds the private key of the sandbox's TLS inspection certificate."}`,
    `A sandbox-runtime folder in the local app data of each Windows user who used the sandbox. It holds the sandbox's record of the permissions it set. A removal approved at Windows' prompt makes one for the approving account too. For the account that ran this command, it is ${diffLineToPlainText(join(env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "sandbox-runtime"))}.`,
    ...profileDirs
      .filter((profileDir, index) => presences[index] !== "gone")
      .map((profileDir) => `${diffLineToPlainText(profileDir)}, the sandbox account's profile folder.`),
    ...(user.provisioned ? [] : [`Perhaps an account, with its profile folder. ${LEFT_OVER_ACCOUNT_NOTE}`]),
    "Your Claude Code settings. If the sandbox is still turned on there, Claude Code warns that it isn't available and runs commands without it. If your settings require the sandbox, Claude Code won't start. To turn it off, run /sandbox or set sandbox.enabled to false in your settings file. Where policy manages these settings, that is up to your administrator.",
  ];
}
//@ chunk-v21qppnj.js:18771-19077 placement
/**
 * claude sandbox install：不可用时直接返回原因；否则执行一次 Windows 沙箱安装，结果以 JSON 写到 stdout，并按状态设置退出码。
 */
async function sandboxInstallCommand() {
  let unavailableReason = windowsSandboxUnavailableReason();
  let result;
  if (unavailableReason)
    result = {
      status: "unavailable",
      message: unavailableReason,
    };
  else {
    let isTTY = process.stderr.isTTY;
    if (isTTY)
      process.stderr.write(
        WINDOWS_SANDBOX_SETUP_NOTICE +
          `
`,
      );
    result = await setupWindowsSandboxOnce(
      getRootSession().host,
      (line) => {
        process.stderr.write(`${line}
`);
      },
      isTTY ? 1 / 0 : Date.now() - Math.ceil(process.uptime() * 1000) + 150000,
    );
  }
  await writeStdoutAndDrain(
    jsonStringify(result) +
      `
`,
  );
  return exitAfterAnalyticsFlush(result.status === "ok" ? 0 : 1);
}
//@ chunk-v21qppnj.js:19077-20100 placement
async function sandboxStatusSummary() {
  let unavailableReason = windowsSandboxUnavailableReason();
  let base;
  if (unavailableReason)
    base = {
      available: false,
      installed: false,
      policyLocked: false,
      reasons: [unavailableReason],
    };
  else {
    let deps = await SandboxManager.checkDependenciesAsync();
    base = {
      available: true,
      installed: deps.errors.length === 0,
      policyLocked: SandboxManager.areSandboxSettingsLockedByPolicy(),
      reasons: deps.errors,
    };
  }
  let strictMode = SandboxManager.isStrictSandboxModeConfigured();
  let summary = {
    statusVersion: 3,
    ...base,
    supported: SandboxManager.isSupportedPlatform() && SandboxManager.isPlatformInEnabledList(),
    enabled: SandboxManager.isSandboxingEnabled(),
    enabledSource: sandboxEnablementSource({
      forced: shouldForceSandboxOn() || (isScrubEnabled() && isScrubSandboxAvailable()),
      policy: isSandboxSettingOverriddenByPolicy("enabled"),
      settings: SandboxManager.isSandboxEnabledInSettings(),
    }),
    unavailableReason: SandboxManager.getSandboxUnavailableReason() ?? null,
    strictMode,
    strictModeSource: sandboxEnablementSource({
      forced: SandboxManager.areUnsandboxedCommandsForbiddenByPolicy(),
      policy: isSandboxSettingOverriddenByPolicy("allowUnsandboxedCommands"),
      settings: strictMode,
    }),
    filesystemPolicy: getEffectiveFilesystemPolicy(),
    autoAllowBashIfSandboxed: SandboxManager.isAutoAllowBashIfSandboxedEnabled(),
    autoAllowBashIfSandboxedSource: !SandboxManager.isAutoAllowSupported()
      ? "unsupported"
      : isSandboxSettingOverriddenByPolicy("autoAllowBashIfSandboxed")
        ? "policy"
        : getInitialSettings_2().sandbox?.autoAllowBashIfSandboxed === undefined
          ? "default"
          : "settings",
  };
  await writeStdoutAndDrain(
    jsonStringify(summary) +
      `
`,
  );
  return exitAfterAnalyticsFlush(0);
}
//@ chunk-v21qppnj.js:20100-20634 placement
/**
 * claude sandbox uninstall：仅原生 Windows 执行卸载（非 json 模式逐条打印进度），输出结果与残留清单，按状态设置退出码。
 */
async function sandboxUninstallCommand({ json }) {
  let result =
    getPlatform() === "windows"
      ? await uninstallWindowsSandbox(
          json
            ? undefined
            : (message) =>
                new Promise((resolve) => {
                  process.stderr.write(
                    `${message}

`,
                    () => resolve(),
                  );
                }),
        )
      : {
          status: "unavailable",
          message:
            "This command applies to native Windows only. On macOS, Linux and WSL the sandbox adds no account or network filters, so there is nothing to remove.",
          leftBehind: [],
          filtersChecked: false,
        };
  await writeStdoutAndDrain(
    json
      ? jsonStringify(result) +
          `
`
      : [
          result.message,
          ...(result.leftBehind.length > 0
            ? ["", "Left behind:", ...result.leftBehind.map((item) => `- ${item}`)]
            : []),
          "",
        ].join(`
`),
  );
  return exitAfterAnalyticsFlush(result.status === "ok" || result.status === "not_installed" ? 0 : 1);
}
//@ chunk-v21qppnj.js:20634-20937 placement
/**
 * 返回 Windows 沙箱不可安装的原因（非原生 Windows、未启用、被策略禁用），可用时为 null。
 */
function windowsSandboxUnavailableReason() {
  if (getPlatform() !== "windows") return "Windows sandbox install is only available on native Windows.";
  if (!isWindowsSandboxEnabled()) return "The Windows sandbox is not enabled on this build.";
  if (!SandboxManager.isPlatformInEnabledList())
    return "Sandboxing is disabled for this platform by the enabledPlatforms policy setting.";
  return null;
}
//@ chunk-v21qppnj.js:20937-21047 placement
function sandboxEnablementSource({ forced, policy, settings }) {
  if (forced) return "forced";
  if (policy) return "policy";
  return settings ? "settings" : "off";
}
export { sandboxInstallCommand, sandboxStatusSummary, sandboxUninstallCommand };
