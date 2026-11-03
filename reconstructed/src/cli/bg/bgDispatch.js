/**
 * cli/bg/bgDispatch.ts
 *
 * 2.1.316 新增：后台会话派发：确保守护进程运行（必要时询问安装为系统服务）、经守护进程启动会话、工作区信任与清理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bg51yd13.js (29)
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
import { daemonJsonPath, daemonLogPath, readDaemonToken } from "../../services/daemon/paths.js";
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
import { daemonDispatchDir } from "../../utils/sandbox/userNamespace.js";
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

//@ chunk-bg51yd13.js:4049-4108 placement
var startDaemonStderrNotice = () =>
  process.stderr.write(`Starting ${bgSupervisorNoun()}\u2026
`);
//@ chunk-bg51yd13.js:4108-6811 placement
/**
 * 确保后台守护进程在运行；未运行时询问是否安装为服务（y/N/never/once）。
 */
async function ensureDaemonForDispatch(e, n) {
  let o = () => {
    e?.onStarting?.();
    startDaemonStderrNotice();
  };
  let daemon = await ensureDaemon(
    {
      onStarting: o,
      spawnIntent: true,
    },
    n,
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
      let l = await processWrapperProblem();
      if (l) {
        logFeatureBad("daemon_service_install", "daemon_service_install_launcher");
        process.stderr.write(`Service not installed: ${l}
`);
        return {
          ok: false,
          reason: l,
          causeCode: "wrapper",
        };
      }
      let serverLockStatus = await getServerLockStatus(n);
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
        let w =
          serverLockStatus.kind === "foreground"
            ? `Not installing the background service: a foreground daemon (pid ${serverLockStatus.lock.pid}, started with \`claude daemon run\`) holds the daemon lock and will serve this session. Stop it (Ctrl-C in its terminal or 'claude daemon stop') and re-run to install.`
            : serverLockStatus.kind === "not-stopped"
              ? describeServiceInstallBlocked(serverLockStatus)
              : `Not installing the background service: ${unknownDaemonText(serverLockStatus.lock.pid)}; it will serve this session. Stop it ('claude daemon stop') and re-run to install.`;
        process.stderr.write(`${w}
`);
        return ensureDaemon(
          {
            forceTransient: true,
            onStarting: o,
            spawnIntent: true,
          },
          n,
        );
      }
      let y = await installDaemonService({
        jsonPath: daemonJsonPath(),
        logPath: daemonLogPath(),
      });
      if (!y.ok) {
        process.stderr
          .write(`Service install failed (${y.error}). Falling back to a transient ${bgSupervisorNoun()} for now.
`);
        return ensureDaemon(
          {
            forceTransient: true,
            onStarting: o,
            spawnIntent: true,
          },
          n,
        );
      }
      process.stderr.write(`Installed: ${y.servicePath}
Run 'claude daemon uninstall' to undo.
`);
      o();
      if (!(await waitForDaemonPing(DAEMON_START_BUDGET_MS)))
        return {
          ok: false,
          causeCode: "timeout",
          reason: `service installed but the daemon ${DAEMON_UNREACHABLE_TIMEOUT_PHRASE} ${DAEMON_START_BUDGET_MS / 1000}s \u2014 check 'claude daemon status'`,
        };
      let p = await readLiveServerLock(1, n).catch(() => null);
      if (p && p.origin !== "service")
        process.stderr
          .write(`note: the installed service has not come up yet \u2014 a temporary background daemon (pid ${p.pid}) is serving this session; check 'claude daemon status'.
`);
      return {
        ok: true,
      };
    }
    case "once":
      return ensureDaemon(
        {
          forceTransient: true,
          onStarting: o,
          spawnIntent: true,
        },
        n,
      );
    case "never":
      await saveGlobalConfig(
        (l) =>
          l.daemonInstallPromptDismissed
            ? l
            : {
                ...l,
                daemonInstallPromptDismissed: true,
              },
        n,
      );
      return ensureDaemon(
        {
          forceTransient: true,
          onStarting: o,
          spawnIntent: true,
        },
        n,
      );
    case "no":
      return daemon;
  }
}
//@ chunk-bg51yd13.js:6811-7117 placement
async function readServiceInstallAnswer(e) {
  let n = createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  try {
    let lower = (
      await new Promise((resolve) => {
        n.once("close", () => resolve("n"));
        n.question(e, resolve);
      })
    )
      .trim()
      .toLowerCase();
    if (lower === "y" || lower === "yes") return "yes";
    if (lower === "once" || lower === "o") return "once";
    if (lower === "never") return "never";
    return "no";
  } finally {
    n.close();
  }
}
//@ chunk-bg51yd13.js:7117-7779 placement
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
//@ chunk-bg51yd13.js:7779-7807 placement
/**
 * 当前构建里函数体为空（恒返回 undefined）：按查询词给后台会话打匹配分的占位。
 */
async function placeholderJobNameScore(e, n = false) {}
//@ chunk-bg51yd13.js:7807-8006 placement
/**
 * 按查询词给后台会话打匹配分：名字完全相同 3、名字包含 2、任务文本（displayIntent/intent）包含 1、否则 0；查询为空返回 0。
 */
function rankJobNameMatch(state, n) {
  if (!n) return 0;
  let o = state.name?.toLowerCase() ?? "";
  if (o === n) return 3;
  if (o.includes(n)) return 2;
  return state.displayIntent?.toLowerCase().includes(n) || state.intent.toLowerCase().includes(n) ? 1 : 0;
}
//@ chunk-bg51yd13.js:8006-8163 placement
class InFlightPromiseTracker {
  #e = new Map();
  get(e) {
    return this.#e.get(e);
  }
  track(e, n) {
    if (this.#e.has(e)) return;
    this.#e.set(e, n);
    n.then(() => {
      if (this.#e.get(e) === n) this.#e.delete(e);
    });
  }
}
//@ chunk-bg51yd13.js:8163-8188 placement
var IN_FLIGHT_DISPATCH_SLOT = new HostScoped(() => new InFlightPromiseTracker());
//@ chunk-bg51yd13.js:8188-8225 placement
function inFlightDispatches() {
  return IN_FLIGHT_DISPATCH_SLOT.of(getRootSession().host);
}
//@ chunk-bg51yd13.js:8225-8365 placement
/**
 * 把一次后台派发的 Promise 按 short id 登记进在途表（结果归一成 {ok,error,alive}），原样返回该 Promise。
 */
function trackBgDispatch(e, n) {
  inFlightDispatches().track(
    e,
    n.then(
      (o) =>
        o.ok
          ? {
              ok: true,
            }
          : {
              ok: false,
              error: o.error,
              alive: !!o.alive,
            },
      (error) => ({
        ok: false,
        error: errorMessage(error),
        alive: false,
      }),
    ),
  );
  return n;
}
//@ chunk-bg51yd13.js:8365-8399 placement
function getInFlightDispatch(e) {
  return inFlightDispatches().get(e);
}
//@ chunk-bg51yd13.js:8399-8425 placement
var TRUNCATE_MIDDLE_HEAD_TAIL = {
  head: 60,
  tail: 180,
};
//@ chunk-bg51yd13.js:8425-19618 placement
/**
 * 生成 claude rm 的结果与后续指引（未推送提交、强制移除工作树等，约 11 KB）。
 */
function formatRmOutcome(e, { worktree, jobId }) {
  let r = `run 'claude rm ${jobId}' again`;
  let s = e.forceRemove
    ? `claude rm ${jobId} --force-remove-worktree ${e.forceRemove.worktreeDigest}${e.discardUnpushed ? ` --discard-unpushed ${e.discardUnpushed.headSha}@${e.discardUnpushed.worktreeDigest}` : ""}`
    : undefined;
  let l = e.errorSummary ? collapseWhitespace(printableText(e.errorSummary.replace(/\s+/g, " "))) : "";
  let u = l ? truncateMiddle(l, TRUNCATE_MIDDLE_HEAD_TAIL) : undefined;
  let { submoduleWork } = e;
  let p = submoduleWork
    ? truncateMiddle(describeSubmoduleChanges(submoduleWork), TRUNCATE_MIDDLE_HEAD_TAIL)
    : undefined;
  let w =
    submoduleWork?.kind === "unverifiable" &&
    (submoduleWork.reason === "nested_repository" || submoduleWork.reason === "unconfigured_gitlink");
  let A = (R) => ({
    row: R.row,
    footer: [R.what, R.fleetNext, R.why, `Worktree: ${worktree}`].filter(Boolean).join(" "),
    cli: [R.why ? `${R.what} ${R.why}` : R.what, R.cliNext],
  });
  switch (e.reason) {
    case "dirty":
      switch (submoduleWork?.kind) {
        case "unverifiable":
          return A({
            row: "worktree may hold work Claude Code can't verify \u2014 ctrl+x again discards it",
            what: `The worktree may hold uncommitted work: ${p}.`,
            why: "Deleting it would lose that work.",
            fleetNext: "Press ctrl+x again to discard it.",
            cliNext: `${w ? "move that repository out or delete it" : "check the submodules yourself"} and ${r}, or delete the session from 'claude agents' (ctrl+x twice) to discard it`,
          });
        case "changes":
          return A({
            row: "worktree has uncommitted changes \u2014 ctrl+x again discards them",
            what: `The worktree has uncommitted changes, including ${p}.`,
            why: "Deleting it would lose them.",
            fleetNext: "Press ctrl+x again to discard them.",
            cliNext: `commit or stash them, inside the submodule too, and ${r}, or delete the session from 'claude agents' (ctrl+x twice) to discard them`,
          });
        case undefined:
          return A({
            row: "worktree has uncommitted changes \u2014 ctrl+x again discards them",
            what: "The worktree has uncommitted changes.",
            why: "Deleting it would lose them.",
            fleetNext: "Press ctrl+x again to discard them.",
            cliNext: `commit or stash them and ${r}, or delete the session from 'claude agents' (ctrl+x twice) to discard them`,
          });
      }
      break;
    case "unpushed":
    case "unpushed_shared": {
      let { unpushed } = e;
      let count = unpushed?.count ?? 2;
      let D = plural(count, "it", "them");
      let S = plural(count, "it", "they");
      let E = unpushed ? formatUnpushedCount(unpushed) : "unpushed commits in the worktree";
      let what = `${unpushed ? formatUnpushedSummary(unpushed) : "The worktree has unpushed commits"}.`;
      let P = `${count === 1 ? "It exists" : "They exist"} on no remote`;
      if (e.reason === "unpushed_shared")
        return A({
          row: `${E}; another session also records this worktree \u2014 push ${D} first`,
          what,
          why: `${P}, and another finished session also records this worktree, so ${S} may be that session's work.`,
          fleetNext: `Push ${D} first, then press ctrl+x again.`,
          cliNext: `push ${D} first, then ${r}`,
        });
      let discardUnpushed = e.discardUnpushed;
      return A({
        row: discardUnpushed ? `${E} \u2014 ctrl+x again discards ${D}` : `${E} \u2014 push ${D} first`,
        what,
        why: `${P}, so deleting the worktree would lose ${D}.`,
        fleetNext: discardUnpushed
          ? `Push ${D}, or press ctrl+x again to discard ${D}.`
          : `Push ${D}, then press ctrl+x again.`,
        cliNext: discardUnpushed
          ? `push ${D} and ${r}, or discard the worktree and its commits: claude rm ${jobId} --discard-unpushed ${discardUnpushed.headSha}@${discardUnpushed.worktreeDigest}`
          : `push ${D}, then ${r}`,
      });
    }
    case "in_use":
      return A({
        row: `worktree claimed by ${u ? `running session ${u}` : "another running session"} \u2014 stop or delete that session first`,
        what: `Another running background session${u ? ` (${u})` : ""} claims this worktree, so it isn't this session's to remove.`,
        fleetNext: "Stop or delete that session first, then press ctrl+x again.",
        cliNext: `stop that session${u ? ` ('claude stop ${u}')` : ""} or wait for it to finish, then ${r}`,
      });
    case "live_lock":
      return u
        ? A({
            row: `worktree holds a Claude Code lock for a running process (${u}) \u2014 exit it or unlock first`,
            what: `A Claude Code lock on the worktree names a process that is still running (${u}).`,
            fleetNext:
              "Exit that session, or run 'git worktree unlock' on the worktree if the process is unrelated, then press ctrl+x again.",
            cliNext: `exit that session, or run 'git worktree unlock' on the worktree if the process is unrelated, then ${r}`,
          })
        : A({
            row: "worktree locked with 'git worktree lock' \u2014 unlock it first",
            what: "The worktree is locked with 'git worktree lock' by something other than Claude Code.",
            fleetNext: "If the lock is stale, run 'git worktree unlock' on it, then press ctrl+x again.",
            cliNext: `if the lock is stale, run 'git worktree unlock' on it, then ${r}`,
          });
    case "occupied":
      return A({
        row: `worktree is the working directory of a live session${u ? ` (${u})` : ""} \u2014 exit it first`,
        what: `A live Claude Code session${u ? ` (${u})` : ""} is using the worktree as its working directory.`,
        fleetNext:
          "Exit that session ('claude stop <id>' if it runs in the background), then press ctrl+x again.",
        cliNext: `exit that session ('claude stop <id>' if it runs in the background), then ${r}`,
      });
    case "shared_record":
      return A({
        row: "worktree also recorded by another session \u2014 remove it yourself if you don't need it",
        what: "Another session's record also names this directory.",
        why: "The files in it may be that session's only output, so they aren't deleted on this session's behalf.",
        fleetNext: "If you don't need what's in it, remove the directory yourself, then press ctrl+x again.",
        cliNext: `if you don't need what's in it, remove the directory yourself, then ${r}`,
      });
    case "records_unreadable":
      return A({
        row: "couldn't verify no other session owns the worktree \u2014 ctrl+x again retries",
        what: "Couldn't verify that no other session's record names this directory (a session record, or the directory itself, couldn't be read).",
        fleetNext:
          "Press ctrl+x again to retry; if it keeps failing, check that ~/.claude/jobs and the worktree's parent are readable.",
        cliNext: `${r}; if it keeps failing, check that ~/.claude/jobs and the worktree's parent are readable`,
      });
    case "unverified":
      return A({
        row: "worktree has files that weren't checked against a repository \u2014 ctrl+x again deletes them",
        what: "The worktree has files that weren't checked against a repository (it has none of its own, or a hook manages it).",
        why: "They may be unsaved work.",
        fleetNext: "Press ctrl+x again to delete them with the directory.",
        cliNext: `if you don't need them, remove the directory yourself and ${r}, or delete the session from 'claude agents' (ctrl+x twice)`,
      });
    case "identity_changed":
      return A({
        row: "worktree path changed while it was being checked \u2014 ctrl+x again re-checks",
        what: "The worktree path resolved to a different directory partway through the safety checks (a symlink or mount changed underneath it), so nothing was removed.",
        fleetNext: "Press ctrl+x again to re-check from the top.",
        cliNext: `${r} to re-check from the top`,
      });
    case "worktrees_inside":
      return A({
        row: "worktree may hold other worktrees \u2014 ctrl+x again deletes them",
        what: `Worktree not removed: ${u ?? "it may hold other worktrees"}.`,
        fleetNext:
          "Move out of its .claude/worktrees anything you need, then press ctrl+x again to delete the worktree with the rest.",
        cliNext: `empty its .claude/worktrees, first moving out anything you need (with 'git worktree move' for a worktree), and ${r}, or delete the session from 'claude agents' (ctrl+x twice) to delete the worktree with everything in it`,
      });
    case "remove_failed": {
      let replaced = (u ?? "the removal failed").replace(/^\p{Ll}/u, (E) => E.toUpperCase());
      let D = "The session stays until the directory is gone.";
      let why = `${replaced}. The session stays until the directory is gone.`;
      switch (e.forceRemoveWithheld) {
        case "tracked_changes":
          return A({
            row: "worktree not removed, and it has uncommitted changes \u2014 commit or stash them, then ctrl+x again",
            what: "Worktree not removed.",
            why: `${replaced}. It also has uncommitted changes to tracked files${submoduleWork?.kind === "changes" ? ` (including ${p})` : ""}, so Claude Code won't delete the directory by force. The session stays until the directory is gone.`,
            fleetNext:
              "Commit or stash its uncommitted changes (or remove the directory yourself), then press ctrl+x again.",
            cliNext: `commit or stash its uncommitted changes (or remove the directory yourself), then ${r}`,
          });
        case "not_registered":
          return A({
            row: "worktree not removed \u2014 remove the directory yourself, then ctrl+x again",
            what: "Worktree not removed.",
            why: `${replaced}. Claude Code couldn't confirm from a git repository that this is one of its linked worktrees, so it won't delete the directory by force. The session stays until the directory is gone.`,
            fleetNext: "Remove the directory yourself if you don't need it, then press ctrl+x again.",
            cliNext: `remove the directory yourself if you don't need it, then ${r}`,
          });
        case "submodule":
          return A({
            row: w
              ? "worktree not removed, and it holds a separate git repository \u2014 move or delete that, then ctrl+x again"
              : "worktree not removed, and its submodules' state is unverified \u2014 remove the directory yourself, then ctrl+x again",
            what: "Worktree not removed.",
            why: `${replaced}. Also, ${p ?? "its submodules' state could not be read"}, so Claude Code won't delete the directory by force. The session stays until the directory is gone.`,
            fleetNext: w
              ? "Move that repository out of the worktree or delete it, then press ctrl+x again."
              : "Check the submodules yourself and remove the directory if you don't need it, then press ctrl+x again.",
            cliNext: w
              ? `move that repository out of the worktree or delete it, then ${r}`
              : `check the submodules yourself and remove the directory if you don't need it, then ${r}`,
          });
        case "shared_record":
          return A({
            row: "worktree not removed, and another session's record names it too \u2014 remove the directory yourself once neither needs it, then ctrl+x again",
            what: "Worktree not removed.",
            why: `${replaced}. Another session's record names the same worktree, so Claude Code won't delete the directory by force. The session stays until the directory is gone.`,
            fleetNext:
              "Remove the directory yourself once neither session needs it, then press ctrl+x again.",
            cliNext: `remove the directory yourself once neither session needs it, then ${r}`,
          });
        case undefined:
          break;
      }
      switch (e.forceRemove?.cause) {
        case "hook_failed":
          return A({
            row: "WorktreeRemove hook didn't remove the worktree \u2014 ctrl+x again deletes it anyway",
            what: "Worktree not removed.",
            why,
            fleetNext: "Press ctrl+x again to delete it anyway, or fix the hook setup and retry.",
            cliNext: `fix the hook setup and ${r}, or delete the directory anyway: ${s}`,
          });
        case "hook_not_enabled":
          return A({
            row: "no WorktreeRemove hook to remove the worktree \u2014 ctrl+x again deletes it anyway",
            what: "Worktree not removed.",
            why,
            fleetNext: "Press ctrl+x again to delete it anyway, or enable a WorktreeRemove hook and retry.",
            cliNext: `enable a WorktreeRemove hook and ${r}, or delete the directory anyway: ${s}`,
          });
        case "git_refused":
          return A({
            row: "git couldn't remove the worktree \u2014 ctrl+x again deletes it anyway",
            what: "Worktree not removed.",
            why,
            fleetNext:
              "Close anything still using the directory, then press ctrl+x again to delete it anyway.",
            cliNext: `close anything still using the directory, then delete it anyway: ${s}`,
          });
        case "rm_failed":
          return A({
            row: "couldn't delete the worktree directory \u2014 ctrl+x again retries",
            what: "Worktree not removed.",
            why,
            fleetNext:
              "Close anything using the directory or fix its permissions, then press ctrl+x again to retry.",
            cliNext: `close anything using the directory or fix its permissions, then retry: ${s}`,
          });
        case undefined:
          return A({
            row: `worktree not removed \u2014 ${u ?? "see the footer"}`,
            what: "Worktree not removed.",
            why,
            fleetNext: "Remove the directory yourself if you don't need it, then press ctrl+x again.",
            cliNext: `remove the directory yourself if you don't need it, then ${r}`,
          });
      }
    }
  }
}
//@ chunk-bg51yd13.js:19618-19950 placement
var CRON_MATCH_OPERATORS = {
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
var keys = Object.keys(CRON_MATCH_OPERATORS);
//@ chunk-bg51yd13.js:19950-20128 placement
function describeRoutineTrigger(e) {
  switch (e.type) {
    case "cron":
      return `cron(${e.expression})`;
    case "event": {
      let n = e.filter.find((o) => o.field === "channel")?.values[0];
      return n ? `${e.event}#${n}` : e.event;
    }
  }
}
//@ chunk-bg51yd13.js:20128-20171 placement
function describeRoutineTriggers(triggers) {
  return triggers.map(describeRoutineTrigger).join(", ");
}
//@ chunk-bg51yd13.js:20288-23363 placement
/**
 * 通过守护进程派发后台会话（shell/spare/slash），守护进程不可达时回退。
 */
async function dispatchViaDaemon(e, n = false, o = Date.now(), r) {
  let spawnLauncherState = getSpawnLauncherState();
  let l =
    spawnLauncherState.daemonConfirmedUp && processWrapperRecord() === "" && processWrapperError() === null;
  if (!l) {
    spawnLauncherState.ensureInFlight ??= (
      e.source === "shell"
        ? ensureDaemonForDispatch(undefined, r)
        : ensureDaemon(
            {
              forceTransient: true,
              spawnIntent: true,
              standsDownAtExit: e.source === "spare",
            },
            r,
          )
    ).finally(() => {
      spawnLauncherState.ensureInFlight = null;
    });
    let ensureInFlight = await spawnLauncherState.ensureInFlight;
    if (!ensureInFlight.ok && ensureInFlight.stoodDown && e.source !== "spare")
      return dispatchViaDaemon(e, n, o, r);
    if (!ensureInFlight.ok && !ensureInFlight.stoodDown) {
      logDispatchFallback("daemon-unreachable", ensureInFlight.reason, e.source, o, ensureInFlight.causeCode);
      return {
        ok: false,
        reason: "daemon-unreachable",
        detail: ensureInFlight.reason,
      };
    }
  }
  if (e.source === "spare" && isTerminalShutdown()) {
    logForDebugging("bg: pre-warm not sent, because this process is exiting");
    return {
      ok: false,
      reason: "daemon-unreachable",
      detail: "this process is exiting",
    };
  }
  let filtered = Object.keys(e.reattachEnv ?? {}).filter((key) => !BG_INTERNAL_ENV_KEYS.has(key));
  let y = l || filtered.length > 0;
  let daemonLease = openDaemonLease("cli-bg-dispatch");
  try {
    let w = daemonDispatchDir();
    let A = join(w, `${e.short}.json`);
    let R = STORAGE_SPACES.daemon(["dispatch", `${e.short}.json`]);
    let h = "ack-timeout";
    let D = "no ack";
    let nonce = randomBytes(4).toString("hex");
    let E = 40;
    for (let j = 0; j < 3; j++) {
      if (y) {
        let L = {
          proto: BG_PROTO,
          op: "dispatch",
          d: {
            ...e,
            nonce,
          },
          timeoutMs: 5000,
          auth: await readDaemonToken(),
        };
        let F = await controlRequest(L, {
          timeoutMs: 6000,
        });
        while (!F.ok && F.code === "ESTARTING" && E > 0) {
          E--;
          await sleep(200);
          F = await controlRequest(L, {
            timeoutMs: 6000,
          });
        }
        if (F.ok && F.op === "dispatch") return logBgDispatch(e, F.pid, F.messagingSock, o, F.via);
        if ("code" in F && F.code === "EALIVE") {
          logDispatchFallback("short-alive", F.error, e.source, o);
          return {
            ok: false,
            reason: "short-alive",
            detail: F.error,
            nonce,
          };
        }
        if ("code" in F && F.code === "ECWDGONE") return describeCwdGone(F.error, e.source, o, nonce);
        if ("code" in F && F.code === "ESTALE") {
          h = "stale-short";
          D = F.error;
          if (j < 2) {
            logForDebugging(`bg: stale handle for ${e.short}, retrying dispatch (${j + 1}/2)`);
            continue;
          }
          break;
        }
        logForDebugging(
          `bg: socket dispatch fell through (${"code" in F ? F.code : "?"}), using file path${filtered.length > 0 ? ` without ${filtered.join(", ")}` : ""}`,
          {
            level: filtered.length > 0 ? "warn" : "debug",
          },
        );
      }
      try {
        let L = jsonStringify({
          ...e,
          reattachEnv: e.reattachEnv && pickAllowedEnv(e.reattachEnv, BG_INTERNAL_ENV_KEYS),
          nonce,
        });
        if (isStorageV5Enabled() && r !== undefined) {
          let F = await r.write(R, L, {
            mode: 384,
          });
          if (!F.ok) {
            h = "dispatch-write";
            D = getDispatchErrorDetail(F.error);
            break;
          }
        } else
          await writeFileAtomic(A, L, 384).catch(async (error) => {
            if (!isENOENT(error)) throw error;
            await mkdir(w, {
              recursive: true,
              mode: 448,
            });
            await writeFileAtomic(A, L, 384);
          });
      } catch (error) {
        h = "dispatch-write";
        D = errorMessage(error);
        break;
      }
      let P = {
        proto: BG_PROTO,
        op: "await-ack",
        short: e.short,
        nonce,
        timeoutMs: 5000,
      };
      let T = await controlRequest(P, {
        timeoutMs: 6000,
      });
      while (!T.ok && T.code === "ESTARTING" && E > 0) {
        E--;
        await sleep(200);
        T = await controlRequest(P, {
          timeoutMs: 6000,
        });
      }
      if (T.ok && T.op === "await-ack")
        return logBgDispatch(e, T.pid, T.messagingSock, o, T.via, filtered.length > 0 ? filtered : undefined);
      if (isStorageV5Enabled() && r !== undefined) await r.delete(R).catch(() => {});
      else await unlink(A).catch(() => {});
      let code = "code" in T ? T.code : undefined;
      if (code === "ECWDGONE" && "error" in T) return describeCwdGone(T.error, e.source, o, nonce);
      if (code === "EALIVE") h = "short-alive";
      else if (code === "ESTALE") h = "stale-short";
      else if (code === "ENOCONN") h = "enoconn";
      else if (code === "ESTARTING") h = "estarting";
      else h = "ack-timeout";
      D = code ? `${code}: ${"error" in T ? T.error : "no ack"}` : "error" in T ? T.error : "no ack";
      if (j === 2 || (h !== "stale-short" && h !== "ack-timeout")) break;
      logForDebugging(`bg: ${h} for ${e.short}, retrying dispatch (${j + 1}/2)`);
    }
    if (!n && (h === "enoconn" || h === "estarting")) {
      spawnLauncherState.daemonConfirmedUp = false;
      return await dispatchViaDaemon(e, true, o, r);
    }
    logDispatchFallback(h, D, e.source, o);
    logForDebugging(`bg: daemon dispatch fallback (${h}): ${D}`, {
      level: "warn",
    });
    return {
      ok: false,
      reason: h,
      detail: D,
      nonce,
    };
  } finally {
    daemonLease();
  }
}
//@ chunk-bg51yd13.js:23363-23770 placement
function logBgDispatch(e, pid, messagingSock, r, s, reattachEnvDropped) {
  getSpawnLauncherState().daemonConfirmedUp = true;
  logEvent("tengu_bg_dispatch", {
    backend_daemon: true,
    source_shell: e.source === "shell",
    source_slash: e.source === "slash",
    source_fleet: e.source === "fleet",
    source_spare: e.source === "spare",
    source_respawn: e.source === "respawn",
    has_worktree: e.worktree !== undefined,
    has_agent: e.agent !== undefined,
    ms: Date.now() - r,
    via: fromEnumOpt(normalizeDaemonSessionState(s)),
  });
  return {
    ok: true,
    pid,
    messagingSock,
    reattachEnvDropped,
  };
}
//@ chunk-bg51yd13.js:23770-23936 placement
function describeCwdGone(error, source, o, nonce) {
  logDispatchFallback("cwd-gone", "ECWDGONE", source, o);
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
//@ chunk-bg51yd13.js:23936-24456 placement
function logDispatchFallback(e, n, source, r, causeCode) {
  let platform = getPlatform();
  logEvent("tengu_bg_dispatch_fallback", {
    ms: Date.now() - r,
    reason_unreachable: e === "daemon-unreachable",
    reason_ack_timeout: e === "ack-timeout",
    reason_write: e === "dispatch-write",
    reason_enoconn: e === "enoconn",
    reason_estarting: e === "estarting",
    reason_stale_short: e === "stale-short",
    reason_short_alive: e === "short-alive",
    reason_cwd_gone: e === "cwd-gone",
    platform_darwin: platform === "macos",
    platform_linux: platform === "linux",
    platform_windows: platform === "windows",
    source_spare: source === "spare",
    source_respawn: source === "respawn",
    detail: describeDaemonExit(n, causeCode),
  });
}
//@ chunk-bg51yd13.js:24456-24910 placement
function describeDaemonExit(e, n) {
  let flattened = extractErrnoTokens(e).flatMap((r) => sanitizeErrnoTokenForTelemetry(r) ?? []);
  if (flattened.length > 0) return joinSafe(flattened);
  if (e.includes(DAEMON_EXITED_BEFORE_REACHABLE_PHRASE) || e.includes(" ran but Claude Code never started")) {
    let match = /\((?:exit code (\d+)|signal (SIG[A-Z]+))/.exec(e);
    let s = match?.[1];
    let l = sanitizeErrnoTokenForTelemetry(match?.[2]);
    return s !== undefined
      ? concatSafe(lit("<daemon-stderr> exit code "), fromNumber(Number(s)))
      : l
        ? concatSafe(lit("<daemon-stderr> signal "), l)
        : lit("<daemon-stderr>");
  }
  if (/[\\/]/.test(e)) return lit("<path-bearing>");
  if (n === undefined) return lit("other");
  return sanitizeErrnoTokenForTelemetry(n) ?? sanitizedMachineReasonForTelemetry(n);
}
//@ chunk-bg51yd13.js:24910-25062 placement
function getDispatchErrorDetail(error) {
  if ("cause" in error && error.cause !== undefined) return errorMessage(error.cause);
  if ("telemetryCode" in error && error.telemetryCode !== undefined) return error.telemetryCode;
  return error.code;
}
//@ chunk-bg51yd13.js:25141-25966 placement
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
    let o = nativeRealpathLong(cwd);
    if (o === null)
      return {
        verdict: "untrusted",
        cwd,
        unresolvable: true,
      };
    if (env.CLAUDE_CODE_SANDBOXED)
      return {
        verdict: "sandboxed",
        cwd: o,
      };
    if (isPathTrusted(o))
      return {
        verdict: "persisted",
        cwd: o,
      };
    let r;
    for (let s of new Set([resolve(cwd), getOriginalCwd()])) {
      if (
        normalizePathForConfigKey(s) === normalizePathForConfigKey(o) ||
        (samePath(s, o) && nativeRealpathOrNull(s) !== s)
      )
        continue;
      if (!isSameRealPath(s, o)) continue;
      let persistedTrustKey = findPersistedTrustKey(s);
      if (persistedTrustKey === null || !isRealPathSegmentPrefix(persistedTrustKey, o)) continue;
      if (r === undefined) r = persistedTrustBoundary(o);
      if (
        r === null ||
        (r.rootOnly
          ? isSameRealPath(r.root, persistedTrustKey)
          : isRealPathSegmentPrefix(r.root, persistedTrustKey))
      )
        return {
          verdict: "persisted",
          cwd: s,
        };
    }
    if (isHomeDirectorySession() && getHomeTrustDialogAccepted() && isSameRealPath(homedir(), o))
      return {
        verdict: "session",
        cwd: o,
      };
    return {
      verdict: "untrusted",
      cwd: o,
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
//@ chunk-bg51yd13.js:25966-26359 placement
function formatWorkspaceUntrusted(e) {
  let n = stripInvisibleChars(e.cwd);
  if (e.unresolvable) return `Workspace not trusted. ${n} could not be resolved on disk.`;
  return isSameRealPath(e.cwd, homedir())
    ? "Workspace not trusted. The home directory is trusted one session at a time \u2014 start this from an interactive terminal there, or from a project directory."
    : `Workspace not trusted. Run \`claude\` in ${n} once and accept the trust prompt, then retry.`;
}
//@ chunk-bg51yd13.js:26359-26707 placement
/**
 * 后台 PTY 输出的终端转义清洗常量：擦除参数集合、可重放的 ESC 序列、备用屏模式 1049/1047/47 与逐字节 ESC 解析正则。
 */
var TERMINAL_RESPONSE_CHARS = new Set("ABCDEFGHJKLMPSTXZ@`adefm");
var ERASE_DISPLAY_PARAMS = new Set([0, 1, 2]);
var PRINTABLE_ESC_SEQUENCES = new Set("78DEM");
var ALT_SCREEN_MODES = new Set(["1049", "1047", "47"]);
var TERMINAL_ESCAPE_SEQUENCE_PATTERN =
  /\x1b\[(?<params>[<-?]?[0-;]*)(?<intermediates>[ -/]*)(?<final>[@-~])|\x1b[\]PX^_][^\x07\x18\x1a\x1b\x9c]*(?:\x07|\x1b\\|\x9c)?|\x1b(?:\[[0-?]*[ -/]*|[ -/]*)$|\x1b(?<esc>[ -/]*[0-~])|\x1b|[\x00-\x07\x0e-\x1a\x1c-\x1f\x7f-\x9f]/g;
//@ chunk-bg51yd13.js:26707-26915 placement
function isTerminalResponseSequence(params, final) {
  if (!TERMINAL_RESPONSE_CHARS.has(final)) return false;
  if (final !== "J" && final !== "T") return true;
  let mapped = params.split(";").map((r) => (/^\d*$/.test(r) ? Number(r) : Number.NaN));
  return final === "J"
    ? mapped.every((r) => ERASE_DISPLAY_PARAMS.has(r))
    : mapped.length === 1 && !Number.isNaN(mapped[0]);
}
//@ chunk-bg51yd13.js:26915-27375 placement
function waitForDaemonReady(e) {
  let n = false;
  let o = "";
  let r = 0;
  for (let s of e.matchAll(TERMINAL_ESCAPE_SEQUENCE_PATTERN)) {
    o += e.slice(r, s.index);
    r = s.index + s[0].length;
    let { params = "", intermediates, final, esc } = s.groups ?? {};
    if (final !== undefined) {
      let w = params[0];
      let A = w === "?" || w === ">" || w === "<" || w === "=";
      if (w === "?" && final === "h") {
        for (let R of params.slice(1).split(";")) if (ALT_SCREEN_MODES.has(R)) n = true;
      } else if (!A && !intermediates && isTerminalResponseSequence(params, final)) {
        if (final === "H" || final === "f") n = true;
        o += s[0];
      }
    } else if (esc !== undefined && esc.length === 1 && PRINTABLE_ESC_SEQUENCES.has(esc)) o += s[0];
  }
  return {
    replay: o + e.slice(r),
    cursorAddressed: n,
  };
}
//@ chunk-bg51yd13.js:27375-27406 placement
var BG_FLAG_NAMES = ["--bg", "--background"];
//@ chunk-bg51yd13.js:27406-27567 placement
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
  placeholderJobNameScore,
  trackBgDispatch,
  rankJobNameMatch,
  formatRmOutcome,
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
