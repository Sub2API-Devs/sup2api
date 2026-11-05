/**
 * cli/bg/bgDispatch.ts
 *
 * 2.1.316 新增：后台会话派发：确保守护进程运行（必要时询问安装为系统服务）、经守护进程启动会话、工作区信任与清理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gwh0qn2w.js (29)
 * attribution: placement 29
 */
import { createInterface } from "readline";
import { join, isAbsolute, resolve } from "path";
import { randomBytes } from "crypto";
import { mkdir, unlink } from "fs/promises";
import { homedir } from "os";
import { bgSupervisorNoun } from "../../utils/fleetGates.js";
import {
  ensureDaemon,
  waitForDaemonPing,
  DAEMON_START_BUDGET_MS,
} from "../../services/daemon/ensureDaemon.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  processWrapperProblem,
  processWrapperRecord,
  processWrapperError,
} from "../../utils/processWrapper.js";
import { logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import {
  getServerLockStatus,
  unknownDaemonText,
  readLiveServerLock,
  lockHolderProblemText,
  daemonLockPath,
} from "../../utils/daemon/daemonLock.js";
import { installDaemonService } from "../../services/daemon/serviceInstall.js";
import {
  daemonJsonPath,
  daemonLogPath,
  daemonDispatchDir,
  readDaemonToken,
} from "../../services/daemon/paths.js";
import {
  DAEMON_UNREACHABLE_TIMEOUT_PHRASE,
  errorMessage,
  isENOENT,
  extractErrnoTokens,
  sanitizeErrnoTokenForTelemetry,
  DAEMON_EXITED_BEFORE_REACHABLE_PHRASE,
  sanitizedMachineReasonForTelemetry,
} from "../../utils/errors.js";
import {
  saveGlobalConfig,
  isPathTrusted,
  findPersistedTrustKey,
  persistedTrustBoundary,
} from "../../utils/config.js";
import { HostScoped } from "../../utils/hostScoped.js";
import {
  getRootSession,
  getOriginalCwd,
  isHomeDirectorySession,
  getHomeTrustDialogAccepted,
} from "../../bootstrap/state.js";
import { collapseWhitespace, printableText, plural } from "../../utils/stringUtils.js";
import { truncateMiddle } from "../../utils/printableName.js";
import { describeSubmoduleChanges } from "../../utils/git/submoduleInspection.js";
import { formatUnpushedCount, formatUnpushedSummary } from "../../utils/git/unpushedCommits.js";
import { getSpawnLauncherState } from "../../services/daemon/spawnLauncher.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { logForDebugging } from "../../utils/debug.js";
import { BG_INTERNAL_ENV_KEYS, pickAllowedEnv } from "../../utils/background/envCarry.js";
import { openDaemonLease, controlRequest } from "../../services/daemon/controlClient.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { BG_PROTO } from "../../services/daemon/leaseProtocol.js";
import { sleep } from "../../utils/sleep.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { fromEnumOpt, joinSafe, concatSafe, lit, fromNumber } from "../../services/analytics/safeMetadata.js";
import { normalizeDaemonSessionState } from "../../services/daemon/sessionStatus.js";
import { getPlatform } from "../../utils/platform.js";
import { nativeRealpathLong, nativeRealpathOrNull } from "../../utils/windowsUncPaths.js";
import { normalizePathForConfigKey } from "../../utils/path.js";
import { samePath } from "../../utils/file.js";
import { isSameRealPath, isRealPathSegmentPrefix } from "../../utils/fsJunctions.js";
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { setShellIfWindows } from "../../utils/windowsPaths.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-gwh0qn2w.js:4120-4179 placement
var startDaemonStderrNotice = () =>
  process.stderr.write(`Starting ${bgSupervisorNoun()}\u2026
`);
//@ chunk-gwh0qn2w.js:4179-6882 placement
/**
 * 确保后台守护进程在运行；未运行时询问是否安装为服务（y/N/never/once）。
 */
async function ensureDaemonForDispatch(options, storage) {
  let onStarting = () => {
    options?.onStarting?.();
    startDaemonStderrNotice();
  };
  let daemon = await ensureDaemon(
    {
      onStarting,
      spawnIntent: true,
    },
    storage,
  );
  if (daemon.ok || !daemon.askInstall) return daemon;
  if (!process.stdin.isTTY || !process.stderr.isTTY || env.isCI) return daemon;
  process.stderr.write(`No background daemon is running.
Installing it as a service keeps the background daemon running across reboot so 'claude agents' stays available.
`);
  let serviceInstallAnswer = await readServiceInstallAnswer(
    "Install as a service now? [y/N/never, or 'once' just for now] ",
  );
  switch (
    (logEvent("tengu_bg_daemon_cold_start_ask_answer", {
      answer_yes: serviceInstallAnswer === "yes",
      answer_once: serviceInstallAnswer === "once",
      answer_never: serviceInstallAnswer === "never",
    }),
    serviceInstallAnswer)
  ) {
    case "yes": {
      let wrapperProblem = await processWrapperProblem();
      if (wrapperProblem) {
        logFeatureBad("daemon_service_install", "daemon_service_install_launcher");
        process.stderr.write(`Service not installed: ${wrapperProblem}
`);
        return {
          ok: false,
          reason: wrapperProblem,
          causeCode: "wrapper",
        };
      }
      let serverLockStatus = await getServerLockStatus(storage);
      if (
        serverLockStatus.kind === "foreground" ||
        serverLockStatus.kind === "not-stopped" ||
        serverLockStatus.kind === "unknown-origin"
      ) {
        if (serverLockStatus.kind === "not-stopped" && serverLockStatus.outcome === "unverified")
          logFeatureBad("daemon_service_install", "daemon_service_install_holder_unverified");
        else
          logFeatureSad(
            "daemon_service_install",
            serverLockStatus.kind === "foreground"
              ? "daemon_service_install_foreground"
              : serverLockStatus.kind === "not-stopped"
                ? "daemon_service_install_holder_alive"
                : "daemon_service_install_holder_unknown_origin",
          );
        let blockedText =
          serverLockStatus.kind === "foreground"
            ? `Not installing the background service: a foreground daemon (pid ${serverLockStatus.lock.pid}, started with \`claude daemon run\`) holds the daemon lock and will serve this session. Stop it (Ctrl-C in its terminal or 'claude daemon stop') and re-run to install.`
            : serverLockStatus.kind === "not-stopped"
              ? describeServiceInstallBlocked(serverLockStatus)
              : `Not installing the background service: ${unknownDaemonText(serverLockStatus.lock.pid)}; it will serve this session. Stop it ('claude daemon stop') and re-run to install.`;
        process.stderr.write(`${blockedText}
`);
        return ensureDaemon(
          {
            forceTransient: true,
            onStarting,
            spawnIntent: true,
          },
          storage,
        );
      }
      let installResult = await installDaemonService({
        jsonPath: daemonJsonPath(),
        logPath: daemonLogPath(),
      });
      if (!installResult.ok) {
        process.stderr
          .write(`Service install failed (${installResult.error}). Falling back to a transient ${bgSupervisorNoun()} for now.
`);
        return ensureDaemon(
          {
            forceTransient: true,
            onStarting,
            spawnIntent: true,
          },
          storage,
        );
      }
      process.stderr.write(`Installed: ${installResult.servicePath}
Run 'claude daemon uninstall' to undo.
`);
      onStarting();
      if (!(await waitForDaemonPing(DAEMON_START_BUDGET_MS)))
        return {
          ok: false,
          causeCode: "timeout",
          reason: `service installed but the daemon ${DAEMON_UNREACHABLE_TIMEOUT_PHRASE} ${DAEMON_START_BUDGET_MS / 1000}s \u2014 check 'claude daemon status'`,
        };
      let lock = await readLiveServerLock(1, storage).catch(() => null);
      if (lock && lock.origin !== "service")
        process.stderr
          .write(`note: the installed service has not come up yet \u2014 a temporary background daemon (pid ${lock.pid}) is serving this session; check 'claude daemon status'.
`);
      return {
        ok: true,
      };
    }
    case "once":
      return ensureDaemon(
        {
          forceTransient: true,
          onStarting,
          spawnIntent: true,
        },
        storage,
      );
    case "never":
      await saveGlobalConfig(
        (config) =>
          config.daemonInstallPromptDismissed
            ? config
            : {
                ...config,
                daemonInstallPromptDismissed: true,
              },
        storage,
      );
      return ensureDaemon(
        {
          forceTransient: true,
          onStarting,
          spawnIntent: true,
        },
        storage,
      );
    case "no":
      return daemon;
  }
}
//@ chunk-gwh0qn2w.js:6882-7188 placement
async function readServiceInstallAnswer(question) {
  let rl = createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  try {
    let lower = (
      await new Promise((resolve) => {
        rl.once("close", () => resolve("n"));
        rl.question(question, resolve);
      })
    )
      .trim()
      .toLowerCase();
    if (lower === "y" || lower === "yes") return "yes";
    if (lower === "once" || lower === "o") return "once";
    if (lower === "never") return "never";
    return "no";
  } finally {
    rl.close();
  }
}
//@ chunk-gwh0qn2w.js:7188-7850 placement
function describeServiceInstallBlocked(serverLockStatus) {
  switch (serverLockStatus.outcome) {
    case "eperm":
      return `Not installing the background service: ${lockHolderProblemText(serverLockStatus)}; it will keep serving this session. Stop it from the account that owns it, then re-run to install.`;
    case "unverified":
      return `Not installing the background service: ${lockHolderProblemText(serverLockStatus)}, and no daemon could be reached. If no daemon is running, delete ${daemonLockPath()}; if pid ${serverLockStatus.pid} is a live process you own, stop it yourself \u2014 then re-run to install.`;
    case "timed-out":
      return `Not installing the background service: ${lockHolderProblemText(serverLockStatus)} \u2014 connecting to whichever daemon is available. If this repeats, kill pid ${serverLockStatus.pid} (or run 'claude daemon stop' again), then re-run to install.`;
  }
}
//@ chunk-gwh0qn2w.js:7850-7878 placement
/**
 * 当前构建里函数体为空（恒返回 undefined）：按查询词给后台会话打匹配分的占位。
 */
async function placeholderJobNameScore(storage, isQuiet = false) {}
//@ chunk-gwh0qn2w.js:7878-8077 placement
/**
 * 按查询词给后台会话打匹配分：名字完全相同 3、名字包含 2、任务文本（displayIntent/intent）包含 1、否则 0；查询为空返回 0。
 */
function rankJobNameMatch(state, needle) {
  if (!needle) return 0;
  let name = state.name?.toLowerCase() ?? "";
  if (name === needle) return 3;
  if (name.includes(needle)) return 2;
  return state.displayIntent?.toLowerCase().includes(needle) || state.intent.toLowerCase().includes(needle)
    ? 1
    : 0;
}
//@ chunk-gwh0qn2w.js:8077-8234 placement
class InFlightPromiseTracker {
  #e = new Map();
  get(key) {
    return this.#e.get(key);
  }
  track(key, promise) {
    if (this.#e.has(key)) return;
    this.#e.set(key, promise);
    promise.then(() => {
      if (this.#e.get(key) === promise) this.#e.delete(key);
    });
  }
}
//@ chunk-gwh0qn2w.js:8234-8259 placement
var IN_FLIGHT_DISPATCH_SLOT; // deferred: uses InFlightPromiseTracker of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gwh0qn2w.js:8234", () => {
  IN_FLIGHT_DISPATCH_SLOT = new HostScoped(() => new InFlightPromiseTracker());
});
//@ chunk-gwh0qn2w.js:8259-8296 placement
function inFlightDispatches() {
  return IN_FLIGHT_DISPATCH_SLOT.of(getRootSession().host);
}
//@ chunk-gwh0qn2w.js:8296-8436 placement
/**
 * 把一次后台派发的 Promise 按 short id 登记进在途表（结果归一成 {ok,error,alive}），原样返回该 Promise。
 */
function trackBgDispatch(key, promise) {
  inFlightDispatches().track(
    key,
    promise.then(
      (result) =>
        result.ok
          ? {
              ok: true,
            }
          : {
              ok: false,
              error: result.error,
              alive: !!result.alive,
            },
      (error) => ({
        ok: false,
        error: errorMessage(error),
        alive: false,
      }),
    ),
  );
  return promise;
}
//@ chunk-gwh0qn2w.js:8436-8470 placement
function getInFlightDispatch(key) {
  return inFlightDispatches().get(key);
}
//@ chunk-gwh0qn2w.js:8470-8496 placement
var TRUNCATE_MIDDLE_HEAD_TAIL = {
  head: 60,
  tail: 180,
};
//@ chunk-gwh0qn2w.js:8496-19689 placement
/**
 * 生成 claude rm 的结果与后续指引（未推送提交、强制移除工作树等，约 11 KB）。
 */
function formatRmOutcome(outcome, { worktree, jobId }) {
  let retryHint = `run 'claude rm ${jobId}' again`;
  let forceCommand = outcome.forceRemove
    ? `claude rm ${jobId} --force-remove-worktree ${outcome.forceRemove.worktreeDigest}${outcome.discardUnpushed ? ` --discard-unpushed ${outcome.discardUnpushed.headSha}@${outcome.discardUnpushed.worktreeDigest}` : ""}`
    : undefined;
  let errorText = outcome.errorSummary
    ? collapseWhitespace(printableText(outcome.errorSummary.replace(/\s+/g, " ")))
    : "";
  let shortError = errorText ? truncateMiddle(errorText, TRUNCATE_MIDDLE_HEAD_TAIL) : undefined;
  let { submoduleWork } = outcome;
  let submoduleText = submoduleWork
    ? truncateMiddle(describeSubmoduleChanges(submoduleWork), TRUNCATE_MIDDLE_HEAD_TAIL)
    : undefined;
  let isNestedRepository =
    submoduleWork?.kind === "unverifiable" &&
    (submoduleWork.reason === "nested_repository" || submoduleWork.reason === "unconfigured_gitlink");
  let buildOutcome = (parts) => ({
    row: parts.row,
    footer: [parts.what, parts.fleetNext, parts.why, `Worktree: ${worktree}`].filter(Boolean).join(" "),
    cli: [parts.why ? `${parts.what} ${parts.why}` : parts.what, parts.cliNext],
  });
  switch (outcome.reason) {
    case "dirty":
      switch (submoduleWork?.kind) {
        case "unverifiable":
          return buildOutcome({
            row: "worktree may hold work Claude Code can't verify \u2014 ctrl+x again discards it",
            what: `The worktree may hold uncommitted work: ${submoduleText}.`,
            why: "Deleting it would lose that work.",
            fleetNext: "Press ctrl+x again to discard it.",
            cliNext: `${isNestedRepository ? "move that repository out or delete it" : "check the submodules yourself"} and ${retryHint}, or delete the session from 'claude agents' (ctrl+x twice) to discard it`,
          });
        case "changes":
          return buildOutcome({
            row: "worktree has uncommitted changes \u2014 ctrl+x again discards them",
            what: `The worktree has uncommitted changes, including ${submoduleText}.`,
            why: "Deleting it would lose them.",
            fleetNext: "Press ctrl+x again to discard them.",
            cliNext: `commit or stash them, inside the submodule too, and ${retryHint}, or delete the session from 'claude agents' (ctrl+x twice) to discard them`,
          });
        case undefined:
          return buildOutcome({
            row: "worktree has uncommitted changes \u2014 ctrl+x again discards them",
            what: "The worktree has uncommitted changes.",
            why: "Deleting it would lose them.",
            fleetNext: "Press ctrl+x again to discard them.",
            cliNext: `commit or stash them and ${retryHint}, or delete the session from 'claude agents' (ctrl+x twice) to discard them`,
          });
      }
      break;
    case "unpushed":
    case "unpushed_shared": {
      let { unpushed } = outcome;
      let count = unpushed?.count ?? 2;
      let them = plural(count, "it", "them");
      let they = plural(count, "it", "they");
      let unpushedLabel = unpushed ? formatUnpushedCount(unpushed) : "unpushed commits in the worktree";
      let what = `${unpushed ? formatUnpushedSummary(unpushed) : "The worktree has unpushed commits"}.`;
      let remoteNote = `${count === 1 ? "It exists" : "They exist"} on no remote`;
      if (outcome.reason === "unpushed_shared")
        return buildOutcome({
          row: `${unpushedLabel}; another session also records this worktree \u2014 push ${them} first`,
          what,
          why: `${remoteNote}, and another finished session also records this worktree, so ${they} may be that session's work.`,
          fleetNext: `Push ${them} first, then press ctrl+x again.`,
          cliNext: `push ${them} first, then ${retryHint}`,
        });
      let discardUnpushed = outcome.discardUnpushed;
      return buildOutcome({
        row: discardUnpushed
          ? `${unpushedLabel} \u2014 ctrl+x again discards ${them}`
          : `${unpushedLabel} \u2014 push ${them} first`,
        what,
        why: `${remoteNote}, so deleting the worktree would lose ${them}.`,
        fleetNext: discardUnpushed
          ? `Push ${them}, or press ctrl+x again to discard ${them}.`
          : `Push ${them}, then press ctrl+x again.`,
        cliNext: discardUnpushed
          ? `push ${them} and ${retryHint}, or discard the worktree and its commits: claude rm ${jobId} --discard-unpushed ${discardUnpushed.headSha}@${discardUnpushed.worktreeDigest}`
          : `push ${them}, then ${retryHint}`,
      });
    }
    case "in_use":
      return buildOutcome({
        row: `worktree claimed by ${shortError ? `running session ${shortError}` : "another running session"} \u2014 stop or delete that session first`,
        what: `Another running background session${shortError ? ` (${shortError})` : ""} claims this worktree, so it isn't this session's to remove.`,
        fleetNext: "Stop or delete that session first, then press ctrl+x again.",
        cliNext: `stop that session${shortError ? ` ('claude stop ${shortError}')` : ""} or wait for it to finish, then ${retryHint}`,
      });
    case "live_lock":
      return shortError
        ? buildOutcome({
            row: `worktree holds a Claude Code lock for a running process (${shortError}) \u2014 exit it or unlock first`,
            what: `A Claude Code lock on the worktree names a process that is still running (${shortError}).`,
            fleetNext:
              "Exit that session, or run 'git worktree unlock' on the worktree if the process is unrelated, then press ctrl+x again.",
            cliNext: `exit that session, or run 'git worktree unlock' on the worktree if the process is unrelated, then ${retryHint}`,
          })
        : buildOutcome({
            row: "worktree locked with 'git worktree lock' \u2014 unlock it first",
            what: "The worktree is locked with 'git worktree lock' by something other than Claude Code.",
            fleetNext: "If the lock is stale, run 'git worktree unlock' on it, then press ctrl+x again.",
            cliNext: `if the lock is stale, run 'git worktree unlock' on it, then ${retryHint}`,
          });
    case "occupied":
      return buildOutcome({
        row: `worktree is the working directory of a live session${shortError ? ` (${shortError})` : ""} \u2014 exit it first`,
        what: `A live Claude Code session${shortError ? ` (${shortError})` : ""} is using the worktree as its working directory.`,
        fleetNext:
          "Exit that session ('claude stop <id>' if it runs in the background), then press ctrl+x again.",
        cliNext: `exit that session ('claude stop <id>' if it runs in the background), then ${retryHint}`,
      });
    case "shared_record":
      return buildOutcome({
        row: "worktree also recorded by another session \u2014 remove it yourself if you don't need it",
        what: "Another session's record also names this directory.",
        why: "The files in it may be that session's only output, so they aren't deleted on this session's behalf.",
        fleetNext: "If you don't need what's in it, remove the directory yourself, then press ctrl+x again.",
        cliNext: `if you don't need what's in it, remove the directory yourself, then ${retryHint}`,
      });
    case "records_unreadable":
      return buildOutcome({
        row: "couldn't verify no other session owns the worktree \u2014 ctrl+x again retries",
        what: "Couldn't verify that no other session's record names this directory (a session record, or the directory itself, couldn't be read).",
        fleetNext:
          "Press ctrl+x again to retry; if it keeps failing, check that ~/.claude/jobs and the worktree's parent are readable.",
        cliNext: `${retryHint}; if it keeps failing, check that ~/.claude/jobs and the worktree's parent are readable`,
      });
    case "unverified":
      return buildOutcome({
        row: "worktree has files that weren't checked against a repository \u2014 ctrl+x again deletes them",
        what: "The worktree has files that weren't checked against a repository (it has none of its own, or a hook manages it).",
        why: "They may be unsaved work.",
        fleetNext: "Press ctrl+x again to delete them with the directory.",
        cliNext: `if you don't need them, remove the directory yourself and ${retryHint}, or delete the session from 'claude agents' (ctrl+x twice)`,
      });
    case "identity_changed":
      return buildOutcome({
        row: "worktree path changed while it was being checked \u2014 ctrl+x again re-checks",
        what: "The worktree path resolved to a different directory partway through the safety checks (a symlink or mount changed underneath it), so nothing was removed.",
        fleetNext: "Press ctrl+x again to re-check from the top.",
        cliNext: `${retryHint} to re-check from the top`,
      });
    case "worktrees_inside":
      return buildOutcome({
        row: "worktree may hold other worktrees \u2014 ctrl+x again deletes them",
        what: `Worktree not removed: ${shortError ?? "it may hold other worktrees"}.`,
        fleetNext:
          "Move out of its .claude/worktrees anything you need, then press ctrl+x again to delete the worktree with the rest.",
        cliNext: `empty its .claude/worktrees, first moving out anything you need (with 'git worktree move' for a worktree), and ${retryHint}, or delete the session from 'claude agents' (ctrl+x twice) to delete the worktree with everything in it`,
      });
    case "remove_failed": {
      let replaced = (shortError ?? "the removal failed").replace(/^\p{Ll}/u, (letter) =>
        letter.toUpperCase(),
      );
      let keepNote = "The session stays until the directory is gone.";
      let why = `${replaced}. The session stays until the directory is gone.`;
      switch (outcome.forceRemoveWithheld) {
        case "tracked_changes":
          return buildOutcome({
            row: "worktree not removed, and it has uncommitted changes \u2014 commit or stash them, then ctrl+x again",
            what: "Worktree not removed.",
            why: `${replaced}. It also has uncommitted changes to tracked files${submoduleWork?.kind === "changes" ? ` (including ${submoduleText})` : ""}, so Claude Code won't delete the directory by force. The session stays until the directory is gone.`,
            fleetNext:
              "Commit or stash its uncommitted changes (or remove the directory yourself), then press ctrl+x again.",
            cliNext: `commit or stash its uncommitted changes (or remove the directory yourself), then ${retryHint}`,
          });
        case "not_registered":
          return buildOutcome({
            row: "worktree not removed \u2014 remove the directory yourself, then ctrl+x again",
            what: "Worktree not removed.",
            why: `${replaced}. Claude Code couldn't confirm from a git repository that this is one of its linked worktrees, so it won't delete the directory by force. The session stays until the directory is gone.`,
            fleetNext: "Remove the directory yourself if you don't need it, then press ctrl+x again.",
            cliNext: `remove the directory yourself if you don't need it, then ${retryHint}`,
          });
        case "submodule":
          return buildOutcome({
            row: isNestedRepository
              ? "worktree not removed, and it holds a separate git repository \u2014 move or delete that, then ctrl+x again"
              : "worktree not removed, and its submodules' state is unverified \u2014 remove the directory yourself, then ctrl+x again",
            what: "Worktree not removed.",
            why: `${replaced}. Also, ${submoduleText ?? "its submodules' state could not be read"}, so Claude Code won't delete the directory by force. The session stays until the directory is gone.`,
            fleetNext: isNestedRepository
              ? "Move that repository out of the worktree or delete it, then press ctrl+x again."
              : "Check the submodules yourself and remove the directory if you don't need it, then press ctrl+x again.",
            cliNext: isNestedRepository
              ? `move that repository out of the worktree or delete it, then ${retryHint}`
              : `check the submodules yourself and remove the directory if you don't need it, then ${retryHint}`,
          });
        case "shared_record":
          return buildOutcome({
            row: "worktree not removed, and another session's record names it too \u2014 remove the directory yourself once neither needs it, then ctrl+x again",
            what: "Worktree not removed.",
            why: `${replaced}. Another session's record names the same worktree, so Claude Code won't delete the directory by force. The session stays until the directory is gone.`,
            fleetNext:
              "Remove the directory yourself once neither session needs it, then press ctrl+x again.",
            cliNext: `remove the directory yourself once neither session needs it, then ${retryHint}`,
          });
        case undefined:
          break;
      }
      switch (outcome.forceRemove?.cause) {
        case "hook_failed":
          return buildOutcome({
            row: "WorktreeRemove hook didn't remove the worktree \u2014 ctrl+x again deletes it anyway",
            what: "Worktree not removed.",
            why,
            fleetNext: "Press ctrl+x again to delete it anyway, or fix the hook setup and retry.",
            cliNext: `fix the hook setup and ${retryHint}, or delete the directory anyway: ${forceCommand}`,
          });
        case "hook_not_enabled":
          return buildOutcome({
            row: "no WorktreeRemove hook to remove the worktree \u2014 ctrl+x again deletes it anyway",
            what: "Worktree not removed.",
            why,
            fleetNext: "Press ctrl+x again to delete it anyway, or enable a WorktreeRemove hook and retry.",
            cliNext: `enable a WorktreeRemove hook and ${retryHint}, or delete the directory anyway: ${forceCommand}`,
          });
        case "git_refused":
          return buildOutcome({
            row: "git couldn't remove the worktree \u2014 ctrl+x again deletes it anyway",
            what: "Worktree not removed.",
            why,
            fleetNext:
              "Close anything still using the directory, then press ctrl+x again to delete it anyway.",
            cliNext: `close anything still using the directory, then delete it anyway: ${forceCommand}`,
          });
        case "rm_failed":
          return buildOutcome({
            row: "couldn't delete the worktree directory \u2014 ctrl+x again retries",
            what: "Worktree not removed.",
            why,
            fleetNext:
              "Close anything using the directory or fix its permissions, then press ctrl+x again to retry.",
            cliNext: `close anything using the directory or fix its permissions, then retry: ${forceCommand}`,
          });
        case undefined:
          return buildOutcome({
            row: `worktree not removed \u2014 ${shortError ?? "see the footer"}`,
            what: "Worktree not removed.",
            why,
            fleetNext: "Remove the directory yourself if you don't need it, then press ctrl+x again.",
            cliNext: `remove the directory yourself if you don't need it, then ${retryHint}`,
          });
      }
    }
  }
}
//@ chunk-gwh0qn2w.js:19689-20021 placement
var CRON_MATCH_OPERATORS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var keys;
deferInit("chunk-gwh0qn2w.js:19689", () => {
  CRON_MATCH_OPERATORS = {
    is: {
      op: "eq",
      list: false,
    },
    is_not: {
      op: "not_in",
      list: false,
    },
    one_of: {
      op: "in",
      list: true,
    },
    none_of: {
      op: "not_in",
      list: true,
    },
    starts_with: {
      op: "starts_with",
      list: false,
    },
    contains: {
      op: "contains",
      list: false,
    },
    matches: {
      op: "matches",
      list: false,
    },
    glob: {
      op: "glob",
      list: false,
    },
    eq: {
      op: "eq",
      list: false,
    },
    in: {
      op: "in",
      list: true,
    },
    not_in: {
      op: "not_in",
      list: true,
    },
  };
  keys = Object.keys(CRON_MATCH_OPERATORS);
});
//@ chunk-gwh0qn2w.js:20021-20199 placement
function describeRoutineTrigger(trigger) {
  switch (trigger.type) {
    case "cron":
      return `cron(${trigger.expression})`;
    case "event": {
      let channel = trigger.filter.find((filter) => filter.field === "channel")?.values[0];
      return channel ? `${trigger.event}#${channel}` : trigger.event;
    }
  }
}
//@ chunk-gwh0qn2w.js:20199-20242 placement
function describeRoutineTriggers(triggers) {
  return triggers.map(describeRoutineTrigger).join(", ");
}
//@ chunk-gwh0qn2w.js:20359-23434 placement
/**
 * 通过守护进程派发后台会话（shell/spare/slash），守护进程不可达时回退。
 */
async function dispatchViaDaemon(descriptor, isRetry = false, startedAt = Date.now(), storage) {
  let spawnLauncherState = getSpawnLauncherState();
  let canUseSocket =
    spawnLauncherState.daemonConfirmedUp && processWrapperRecord() === "" && processWrapperError() === null;
  if (!canUseSocket) {
    spawnLauncherState.ensureInFlight ??= (
      descriptor.source === "shell"
        ? ensureDaemonForDispatch(undefined, storage)
        : ensureDaemon(
            {
              forceTransient: true,
              spawnIntent: true,
              standsDownAtExit: descriptor.source === "spare",
            },
            storage,
          )
    ).finally(() => {
      spawnLauncherState.ensureInFlight = null;
    });
    let ensureInFlight = await spawnLauncherState.ensureInFlight;
    if (!ensureInFlight.ok && ensureInFlight.stoodDown && descriptor.source !== "spare")
      return dispatchViaDaemon(descriptor, isRetry, startedAt, storage);
    if (!ensureInFlight.ok && !ensureInFlight.stoodDown) {
      logDispatchFallback(
        "daemon-unreachable",
        ensureInFlight.reason,
        descriptor.source,
        startedAt,
        ensureInFlight.causeCode,
      );
      return {
        ok: false,
        reason: "daemon-unreachable",
        detail: ensureInFlight.reason,
      };
    }
  }
  if (descriptor.source === "spare" && isTerminalShutdown()) {
    logForDebugging("bg: pre-warm not sent, because this process is exiting");
    return {
      ok: false,
      reason: "daemon-unreachable",
      detail: "this process is exiting",
    };
  }
  let filtered = Object.keys(descriptor.reattachEnv ?? {}).filter((key) => !BG_INTERNAL_ENV_KEYS.has(key));
  let canSendReattachEnv = canUseSocket || filtered.length > 0;
  let daemonLease = openDaemonLease("cli-bg-dispatch");
  try {
    let dispatchDir = daemonDispatchDir();
    let dispatchPath = join(dispatchDir, `${descriptor.short}.json`);
    let dispatchKey = STORAGE_SPACES.daemon(["dispatch", `${descriptor.short}.json`]);
    let failureReason = "ack-timeout";
    let failureDetail = "no ack";
    let nonce = randomBytes(4).toString("hex");
    let startingRetries = 40;
    for (let j = 0; j < 3; j++) {
      if (canSendReattachEnv) {
        let request = {
          proto: BG_PROTO,
          op: "dispatch",
          d: {
            ...descriptor,
            nonce,
          },
          timeoutMs: 5000,
          auth: await readDaemonToken(),
        };
        let response = await controlRequest(request, {
          timeoutMs: 6000,
        });
        while (!response.ok && response.code === "ESTARTING" && startingRetries > 0) {
          startingRetries--;
          await sleep(200);
          response = await controlRequest(request, {
            timeoutMs: 6000,
          });
        }
        if (response.ok && response.op === "dispatch")
          return logBgDispatch(descriptor, response.pid, response.messagingSock, startedAt, response.via);
        if ("code" in response && response.code === "EALIVE") {
          logDispatchFallback("short-alive", response.error, descriptor.source, startedAt);
          return {
            ok: false,
            reason: "short-alive",
            detail: response.error,
            nonce,
          };
        }
        if ("code" in response && response.code === "ECWDGONE")
          return describeCwdGone(response.error, descriptor.source, startedAt, nonce);
        if ("code" in response && response.code === "ESTALE") {
          failureReason = "stale-short";
          failureDetail = response.error;
          if (j < 2) {
            logForDebugging(`bg: stale handle for ${descriptor.short}, retrying dispatch (${j + 1}/2)`);
            continue;
          }
          break;
        }
        logForDebugging(
          `bg: socket dispatch fell through (${"code" in response ? response.code : "?"}), using file path${filtered.length > 0 ? ` without ${filtered.join(", ")}` : ""}`,
          {
            level: filtered.length > 0 ? "warn" : "debug",
          },
        );
      }
      try {
        let payload = jsonStringify({
          ...descriptor,
          reattachEnv: descriptor.reattachEnv && pickAllowedEnv(descriptor.reattachEnv, BG_INTERNAL_ENV_KEYS),
          nonce,
        });
        if (isStorageV5Enabled() && storage !== undefined) {
          let writeResult = await storage.write(dispatchKey, payload, {
            mode: 384,
          });
          if (!writeResult.ok) {
            failureReason = "dispatch-write";
            failureDetail = getDispatchErrorDetail(writeResult.error);
            break;
          }
        } else
          await writeFileAtomic(dispatchPath, payload, 384).catch(async (error) => {
            if (!isENOENT(error)) throw error;
            await mkdir(dispatchDir, {
              recursive: true,
              mode: 448,
            });
            await writeFileAtomic(dispatchPath, payload, 384);
          });
      } catch (error) {
        failureReason = "dispatch-write";
        failureDetail = errorMessage(error);
        break;
      }
      let ackRequest = {
        proto: BG_PROTO,
        op: "await-ack",
        short: descriptor.short,
        nonce,
        timeoutMs: 5000,
      };
      let ackResponse = await controlRequest(ackRequest, {
        timeoutMs: 6000,
      });
      while (!ackResponse.ok && ackResponse.code === "ESTARTING" && startingRetries > 0) {
        startingRetries--;
        await sleep(200);
        ackResponse = await controlRequest(ackRequest, {
          timeoutMs: 6000,
        });
      }
      if (ackResponse.ok && ackResponse.op === "await-ack")
        return logBgDispatch(
          descriptor,
          ackResponse.pid,
          ackResponse.messagingSock,
          startedAt,
          ackResponse.via,
          filtered.length > 0 ? filtered : undefined,
        );
      if (isStorageV5Enabled() && storage !== undefined) await storage.delete(dispatchKey).catch(() => {});
      else await unlink(dispatchPath).catch(() => {});
      let code = "code" in ackResponse ? ackResponse.code : undefined;
      if (code === "ECWDGONE" && "error" in ackResponse)
        return describeCwdGone(ackResponse.error, descriptor.source, startedAt, nonce);
      if (code === "EALIVE") failureReason = "short-alive";
      else if (code === "ESTALE") failureReason = "stale-short";
      else if (code === "ENOCONN") failureReason = "enoconn";
      else if (code === "ESTARTING") failureReason = "estarting";
      else failureReason = "ack-timeout";
      failureDetail = code
        ? `${code}: ${"error" in ackResponse ? ackResponse.error : "no ack"}`
        : "error" in ackResponse
          ? ackResponse.error
          : "no ack";
      if (j === 2 || (failureReason !== "stale-short" && failureReason !== "ack-timeout")) break;
      logForDebugging(`bg: ${failureReason} for ${descriptor.short}, retrying dispatch (${j + 1}/2)`);
    }
    if (!isRetry && (failureReason === "enoconn" || failureReason === "estarting")) {
      spawnLauncherState.daemonConfirmedUp = false;
      return await dispatchViaDaemon(descriptor, true, startedAt, storage);
    }
    logDispatchFallback(failureReason, failureDetail, descriptor.source, startedAt);
    logForDebugging(`bg: daemon dispatch fallback (${failureReason}): ${failureDetail}`, {
      level: "warn",
    });
    return {
      ok: false,
      reason: failureReason,
      detail: failureDetail,
      nonce,
    };
  } finally {
    daemonLease();
  }
}
//@ chunk-gwh0qn2w.js:23434-23841 placement
function logBgDispatch(descriptor, pid, messagingSock, startedAt, via, reattachEnvDropped) {
  getSpawnLauncherState().daemonConfirmedUp = true;
  logEvent("tengu_bg_dispatch", {
    backend_daemon: true,
    source_shell: descriptor.source === "shell",
    source_slash: descriptor.source === "slash",
    source_fleet: descriptor.source === "fleet",
    source_spare: descriptor.source === "spare",
    source_respawn: descriptor.source === "respawn",
    has_worktree: descriptor.worktree !== undefined,
    has_agent: descriptor.agent !== undefined,
    ms: Date.now() - startedAt,
    via: fromEnumOpt(normalizeDaemonSessionState(via)),
  });
  return {
    ok: true,
    pid,
    messagingSock,
    reattachEnvDropped,
  };
}
//@ chunk-gwh0qn2w.js:23841-24007 placement
function describeCwdGone(error, source, startedAt, nonce) {
  logDispatchFallback("cwd-gone", "ECWDGONE", source, startedAt);
  logForDebugging(`bg: daemon refused dispatch (cwd-gone): ${error}`, {
    level: "warn",
  });
  return {
    ok: false,
    reason: "cwd-gone",
    detail: error,
    nonce,
  };
}
//@ chunk-gwh0qn2w.js:24007-24527 placement
function logDispatchFallback(reason, detail, source, startedAt, causeCode) {
  let platform = getPlatform();
  logEvent("tengu_bg_dispatch_fallback", {
    ms: Date.now() - startedAt,
    reason_unreachable: reason === "daemon-unreachable",
    reason_ack_timeout: reason === "ack-timeout",
    reason_write: reason === "dispatch-write",
    reason_enoconn: reason === "enoconn",
    reason_estarting: reason === "estarting",
    reason_stale_short: reason === "stale-short",
    reason_short_alive: reason === "short-alive",
    reason_cwd_gone: reason === "cwd-gone",
    platform_darwin: platform === "macos",
    platform_linux: platform === "linux",
    platform_windows: platform === "windows",
    source_spare: source === "spare",
    source_respawn: source === "respawn",
    detail: describeDaemonExit(detail, causeCode),
  });
}
//@ chunk-gwh0qn2w.js:24527-24981 placement
function describeDaemonExit(detail, causeCode) {
  let flattened = extractErrnoTokens(detail).flatMap((token) => sanitizeErrnoTokenForTelemetry(token) ?? []);
  if (flattened.length > 0) return joinSafe(flattened);
  if (
    detail.includes(DAEMON_EXITED_BEFORE_REACHABLE_PHRASE) ||
    detail.includes(" ran but Claude Code never started")
  ) {
    let match = /\((?:exit code (\d+)|signal (SIG[A-Z]+))/.exec(detail);
    let exitCode = match?.[1];
    let signal = sanitizeErrnoTokenForTelemetry(match?.[2]);
    return exitCode !== undefined
      ? concatSafe(lit("<daemon-stderr> exit code "), fromNumber(Number(exitCode)))
      : signal
        ? concatSafe(lit("<daemon-stderr> signal "), signal)
        : lit("<daemon-stderr>");
  }
  if (/[\\/]/.test(detail)) return lit("<path-bearing>");
  if (causeCode === undefined) return lit("other");
  return sanitizeErrnoTokenForTelemetry(causeCode) ?? sanitizedMachineReasonForTelemetry(causeCode);
}
//@ chunk-gwh0qn2w.js:24981-25133 placement
function getDispatchErrorDetail(error) {
  if ("cause" in error && error.cause !== undefined) return errorMessage(error.cause);
  if ("telemetryCode" in error && error.telemetryCode !== undefined) return error.telemetryCode;
  return error.code;
}
//@ chunk-gwh0qn2w.js:25212-26037 placement
/**
 * 判断工作目录是否可信（Windows 网络路径、沙箱等）。
 */
function checkWorkspaceTrust(cwd) {
  try {
    if (!(getPlatform() === "windows" ? /^(?:[A-Za-z]:[\\/]|[\\/]{2}[^\\/])/.test(cwd) : isAbsolute(cwd)))
      return {
        verdict: "untrusted",
        cwd,
        unresolvable: true,
      };
    let realCwd = nativeRealpathLong(cwd);
    if (realCwd === null)
      return {
        verdict: "untrusted",
        cwd,
        unresolvable: true,
      };
    if (env.CLAUDE_CODE_SANDBOXED)
      return {
        verdict: "sandboxed",
        cwd: realCwd,
      };
    if (isPathTrusted(realCwd))
      return {
        verdict: "persisted",
        cwd: realCwd,
      };
    let trustBoundary;
    for (let candidate of new Set([resolve(cwd), getOriginalCwd()])) {
      if (
        normalizePathForConfigKey(candidate) === normalizePathForConfigKey(realCwd) ||
        (samePath(candidate, realCwd) && nativeRealpathOrNull(candidate) !== candidate)
      )
        continue;
      if (!isSameRealPath(candidate, realCwd)) continue;
      let persistedTrustKey = findPersistedTrustKey(candidate);
      if (persistedTrustKey === null || !isRealPathSegmentPrefix(persistedTrustKey, realCwd)) continue;
      if (trustBoundary === undefined) trustBoundary = persistedTrustBoundary(realCwd);
      if (
        trustBoundary === null ||
        (trustBoundary.rootOnly
          ? isSameRealPath(trustBoundary.root, persistedTrustKey)
          : isRealPathSegmentPrefix(trustBoundary.root, persistedTrustKey))
      )
        return {
          verdict: "persisted",
          cwd: candidate,
        };
    }
    if (isHomeDirectorySession() && getHomeTrustDialogAccepted() && isSameRealPath(homedir(), realCwd))
      return {
        verdict: "session",
        cwd: realCwd,
      };
    return {
      verdict: "untrusted",
      cwd: realCwd,
      unresolvable: false,
    };
  } catch (error) {
    logForDebugging(`bg: workspace trust check threw \u2014 ${errorMessage(error)}`, {
      level: "warn",
    });
    return {
      verdict: "untrusted",
      cwd,
      unresolvable: false,
    };
  }
}
//@ chunk-gwh0qn2w.js:26037-26430 placement
function formatWorkspaceUntrusted(unresolved) {
  let displayCwd = stripInvisibleChars(unresolved.cwd);
  if (unresolved.unresolvable) return `Workspace not trusted. ${displayCwd} could not be resolved on disk.`;
  return isSameRealPath(unresolved.cwd, homedir())
    ? "Workspace not trusted. The home directory is trusted one session at a time \u2014 start this from an interactive terminal there, or from a project directory."
    : `Workspace not trusted. Run \`claude\` in ${displayCwd} once and accept the trust prompt, then retry.`;
}
//@ chunk-gwh0qn2w.js:26430-26778 placement
/**
 * 后台 PTY 输出的终端转义清洗常量：擦除参数集合、可重放的 ESC 序列、备用屏模式 1049/1047/47 与逐字节 ESC 解析正则。
 */
var TERMINAL_RESPONSE_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ERASE_DISPLAY_PARAMS;
var PRINTABLE_ESC_SEQUENCES;
var ALT_SCREEN_MODES;
var TERMINAL_ESCAPE_SEQUENCE_PATTERN;
deferInit("chunk-gwh0qn2w.js:26430", () => {
  TERMINAL_RESPONSE_CHARS = new Set("ABCDEFGHJKLMPSTXZ@`adefm");
  ERASE_DISPLAY_PARAMS = new Set([0, 1, 2]);
  PRINTABLE_ESC_SEQUENCES = new Set("78DEM");
  ALT_SCREEN_MODES = new Set(["1049", "1047", "47"]);
  TERMINAL_ESCAPE_SEQUENCE_PATTERN =
    /\x1b\[(?<params>[<-?]?[0-;]*)(?<intermediates>[ -/]*)(?<final>[@-~])|\x1b[\]PX^_][^\x07\x18\x1a\x1b\x9c]*(?:\x07|\x1b\\|\x9c)?|\x1b(?:\[[0-?]*[ -/]*|[ -/]*)$|\x1b(?<esc>[ -/]*[0-~])|\x1b|[\x00-\x07\x0e-\x1a\x1c-\x1f\x7f-\x9f]/g;
});
//@ chunk-gwh0qn2w.js:26778-26986 placement
function isTerminalResponseSequence(params, final) {
  if (!TERMINAL_RESPONSE_CHARS.has(final)) return false;
  if (final !== "J" && final !== "T") return true;
  let mapped = params.split(";").map((part) => (/^\d*$/.test(part) ? Number(part) : Number.NaN));
  return final === "J"
    ? mapped.every((param) => ERASE_DISPLAY_PARAMS.has(param))
    : mapped.length === 1 && !Number.isNaN(mapped[0]);
}
//@ chunk-gwh0qn2w.js:26986-27446 placement
function waitForDaemonReady(data) {
  let isCursorAddressed = false;
  let replay = "";
  let cursor = 0;
  for (let match of data.matchAll(TERMINAL_ESCAPE_SEQUENCE_PATTERN)) {
    replay += data.slice(cursor, match.index);
    cursor = match.index + match[0].length;
    let { params = "", intermediates, final, esc } = match.groups ?? {};
    if (final !== undefined) {
      let firstParam = params[0];
      let isPrivateSequence =
        firstParam === "?" || firstParam === ">" || firstParam === "<" || firstParam === "=";
      if (firstParam === "?" && final === "h") {
        for (let mode of params.slice(1).split(";")) if (ALT_SCREEN_MODES.has(mode)) isCursorAddressed = true;
      } else if (!isPrivateSequence && !intermediates && isTerminalResponseSequence(params, final)) {
        if (final === "H" || final === "f") isCursorAddressed = true;
        replay += match[0];
      }
    } else if (esc !== undefined && esc.length === 1 && PRINTABLE_ESC_SEQUENCES.has(esc)) replay += match[0];
  }
  return {
    replay: replay + data.slice(cursor),
    cursorAddressed: isCursorAddressed,
  };
}
//@ chunk-gwh0qn2w.js:27446-27477 placement
var BG_FLAG_NAMES = ["--bg", "--background"];
//@ chunk-gwh0qn2w.js:27477-27638 placement
function defaultShellForPlatform(exec) {
  setShellIfWindows();
  return env.SHELL
    ? {
        cmd: env.SHELL,
        args: ["-c", exec],
      }
    : getPlatform() === "windows"
      ? {
          cmd: env.COMSPEC || "cmd.exe",
          args: ["/d", "/s", "/c", exec],
        }
      : {
          cmd: "/bin/sh",
          args: ["-c", exec],
        };
}
export {
  rankJobNameMatch,
  formatRmOutcome,
  placeholderJobNameScore,
  trackBgDispatch,
  checkWorkspaceTrust,
  formatWorkspaceUntrusted,
  describeRoutineTriggers,
  defaultShellForPlatform,
  dispatchViaDaemon,
  BG_FLAG_NAMES,
  ensureDaemonForDispatch,
  waitForDaemonReady,
  getInFlightDispatch,
};
