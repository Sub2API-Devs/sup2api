/**
 * commands/restart/restart.ts
 *
 * 2.1.316 新增。/restart 命令：检查能否重启（会话已保存、非远程控制），重启到已安装的新版本并说明版本变化。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qfpyehtk.js (7)
 * attribution: placement 7
 */
import { realpath } from "fs/promises";
import { statSync, existsSync } from "fs";
import { join, dirname, basename } from "path";
import { spawn } from "child_process";
import { homedir } from "os";
import { whichAsync } from "../../utils/which.js";
import { processWrapperArgv } from "../../utils/processWrapper.js";
import {
  withProcessWrapper,
  getLaunchCommand,
  isRunningFromVersionsDir,
} from "../../utils/deepLink/registerProtocol.js";
import { _N } from "../../utils/promptSubmissionOrigin.js";
import { isFrozenMarker } from "../../utils/frozenMarkers.js";
import {
  relaunchOrExplain,
  lastResumableMessage,
  nzn,
  saveResumePoint,
  ensureLauncherRunnable,
  confirmRelaunch,
  withResumeFlag,
} from "../../utils/processRelaunch.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import {
  isTranscriptPersistenceDisabled,
  getMaterializedSessionFile,
  getTranscriptWriteFailureSeq,
  getProjectDir,
  flushSessionStorage,
  getCurrentSessionBridge,
  recordTranscript,
} from "../../utils/sessionStorage.js";
import { sessionGoneStatusCache, createLocalCommandMessage } from "../../utils/messages.js";
import { HD } from "../../utils/invisibleChars.js";
import { tildify } from "../../utils/path.js";
import {
  getReplConfigArgv,
  getSessionId,
  getForkRestrictedLaunchConfig,
  getForkReplayLaunchConfig,
} from "../../bootstrap/state.js";
import { isInClaudeConfigHome } from "../../utils/settings/settingsFileParsing.js";
import { vetRepoSettingsPath, getFsImplementation } from "../../utils/fsOperations.js";
import { getReplBridgeHandle } from "../../bridge/replBridgeHandle.js";
import { resolveMaxVersionConfig, installedVersionName, restartVersionTarget } from "./versionTargets.js";
import { Tv } from "../../utils/disklessSession.js";
import { isBgSession, isDaemonBgWorker } from "../../utils/concurrentSessions.js";
import { env } from "../../utils/env.js";
import {
  getOwnJobShortId,
  buildBridgeReattachEnv,
  resolveBridgeHandoffIdentity,
} from "../../services/daemon/jobState.js";
import {
  readSessionLite,
  extractFieldFromLastEntryOfTypeStrict,
  extractFieldFromFirstEntryStrict,
} from "../../utils/sessionStoragePortable.js";
import { MGe, BCo, CFs } from "../../tasks/backgroundTaskLabels.js";
import {
  listUncarriedLaunchSettings,
  buildRelaunchArgs,
  buildPermissionAndAgentArgs,
  mvt,
} from "../../services/daemon/relaunchArgs.js";
import { getToolPermissionContext, getSessionEffort } from "../../utils/permissions/toolPermissionContext.js";
import { withTimeout } from "../../utils/sleep.js";
import { withLaunchValuesOfHybridConnection } from "../../utils/managedEnvApply.js";
import { withoutProtectedEnv } from "../../utils/permissions/protectedSettingsPaths.js";
import { BG_WORKER_IDENTITY_ENV_VARS } from "../../utils/subprocessEnv.js";
import { moveKeeperPid } from "../../utils/toolCgroup.js";
import { logError } from "../../utils/log.js";
import { isTeammate } from "../../utils/teammate.js";
import { createSyntheticAssistantMessage } from "../../remote/remotePermissionBridge.js";
import { ci } from "../../utils/swarm/hostState.js";
import { getScreenReaderEnv } from "../../utils/accessibility/screenReader.js";
import { COMMAND_NAME, COMMAND_MESSAGE, COMMAND_ARGS, LOCAL_COMMAND_STDOUT } from "../../constants/xml.js";
import { sanitizeVersion } from "../../services/analytics/metadata.js";
import { sequential } from "../../utils/sequential.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-qfpyehtk.js:1833-2044 placement
async function resolveLauncher() {
  let r = await whichAsync("claude"),
    e = processWrapperArgv()[0],
    [n, p] = await Promise.all([
      r ? realpath(r).catch(() => r) : null,
      e ? realpath(e).catch(() => e) : null,
    ]);
  if (r && (p === null || n !== p)) return withProcessWrapper({ cmd: r, prefixArgs: [], target: r });
  return getLaunchCommand();
}
/**
 * 升级/降级/同版本的结果文字
 */
//@ chunk-qfpyehtk.js:2044-3246 placement
function describeVersionChange(r) {
  switch (r.kind) {
    case "newer":
      return `Successfully updated from ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} to version ${r.version}`;
    case "older":
      return `Successfully downgraded from ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} to version ${r.version}`;
    case "same":
    case "unknown":
      return "Session resumed";
  }
}
//@ chunk-qfpyehtk.js:3246-3289 placement
var J = Symbol("staff, over Remote Control");
//@ chunk-qfpyehtk.js:3289-3387 placement
function q(r) {
  if (_N(r)) return "not_owner";
  let submittedFromComposer = r.submittedFromComposer;
  return isFrozenMarker(submittedFromComposer) ? submittedFromComposer : "not_typed";
}
//@ chunk-qfpyehtk.js:3387-3513 placement
function restartOrExplain(r, ...e) {
  if (r !== J && !isFrozenMarker(r)) throw Error("Can't restart automatically. Type /restart at the prompt.");
  return relaunchOrExplain(...e);
}
/**
 * 判定能否重启并给出拒绝原因
 */
//@ chunk-qfpyehtk.js:3672-6618 placement
function planRestart(r, e) {
  let n = (o, u) => (logEvent("tengu_update_refused", { foreground: fromEnum(o) }), u),
    p = "To use the installed version, exit and start Claude Code again";
  if (lastResumableMessage(r) !== void 0) {
    let u = isTranscriptPersistenceDisabled(),
      m = getMaterializedSessionFile();
    if (u || m === null)
      return n(
        u ? "saving_off" : "not_written",
        "Can't restart this session. It isn't saved to disk, so a restart would lose it. Nothing was changed. To use the installed version, exit and start Claude Code again. You may not be able to resume this session.",
      );
    if (getTranscriptWriteFailureSeq() !== 0)
      return n(
        "write_failed",
        "Couldn't save this session to disk, so nothing was restarted. If you exit now, you may not be able to resume all of it.",
      );
    if (e === void 0) {
      let f = sessionGoneStatusCache.get(m);
      if (f === void 0)
        try {
          f = statSync(m).size > 0 ? void 0 : "empty";
        } catch {
          f = "missing";
        }
      if (f !== void 0)
        return (
          sessionGoneStatusCache.set(m, f),
          n(
            "gone",
            f === "empty"
              ? "Can't restart this session. It isn't saved to disk, so a restart would lose it. Nothing was changed. To use the installed version, exit and start Claude Code again. You may not be able to resume this session."
              : "Can't restart this session. Its saved file can't be found. It may have been moved or deleted. You can keep working here, or run /export to save a copy of the conversation before you exit.",
          )
        );
    }
  }
  let v = nzn();
  if (!existsSync(v))
    return n(
      "no_folder",
      `Can't restart this session here. Its folder, ${HD(tildify(v))}, can't be found. Nothing was changed. To use the installed version, exit and start Claude Code in the folder you want to work in, then run /resume and press Ctrl+A to show all projects.`,
    );
  let mapped = getReplConfigArgv().map((o) => o.trim()),
    found = mapped.find((o, u) => {
      let m = mapped[u - 1];
      if ((m !== "--settings" && m !== "--mcp-config") || o === "" || o.startsWith("{")) return !1;
      try {
        let f =
          m === "--settings" && !isInClaudeConfigHome(o)
            ? vetRepoSettingsPath(getFsImplementation(), o).resolvedPath
            : o;
        return !statSync(f).isFile();
      } catch {
        return !0;
      }
    });
  if (found !== void 0)
    return (
      logEvent("tengu_update_refused_launch_file", {}),
      n(
        "launch_file",
        `Can't restart this session. It was started with ${HD(tildify(found))}, which can't be read now. Nothing was changed. To use the installed version, exit and start Claude Code again, then run /resume.`,
      )
    );
  if (getReplBridgeHandle()?.bridgeSessionId)
    return n(
      "remote_control",
      "Can't restart while Remote Control is connected. To use the installed version, exit and start Claude Code again, then run /resume.",
    );
  if (!existsSync(getLaunchCommand().target))
    return n(
      "no_launcher",
      "Can't restart. The installed version wasn't found. To check your installs, run /doctor.",
    );
  let C = resolveMaxVersionConfig(installedVersionName);
  if (C !== void 0)
    return n(
      "above_max_version",
      `Can't restart on the installed version. Version ${C} is on hold, so this session is staying on ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}. Nothing was changed.`,
    );
  return;
}
//@ chunk-qfpyehtk.js:6618-12248 placement
var call = async (args, context) => {
  if (Tv()) return { type: "text", value: "/restart isn't available in this environment." };
  let n = q(context);
  if (n === "not_owner")
    return (
      logEvent("tengu_update_refused", { not_owner: !0 }),
      logEvent("tengu_update_refused_not_owner", {}),
      { type: "text", value: "/restart isn't available over Remote Control." }
    );
  let p = isBgSession() ? env.CLAUDE_JOB_DIR : void 0;
  if (isBgSession() && (!isDaemonBgWorker() || !p)) {
    logEvent("tengu_update_refused", { bg_session: !0 });
    let t = isDaemonBgWorker() ? null : getOwnJobShortId();
    return {
      type: "text",
      value: t
        ? `This is a background session \u2014 press \u2190 to detach, then run \`claude respawn ${t}\` to restart it on the latest build.`
        : "This is a background session \u2014 press \u2190 to detach, then run `claude respawn <id>` to restart it on the latest build (the id is in the agents view).",
    };
  }
  if (!p) {
    let t = getMaterializedSessionFile(),
      b = join(getProjectDir(nzn()), `${getSessionId()}.jsonl`);
    if (t && t !== b) {
      logEvent("tengu_update_refused", { transcript_path_drift: !0 });
      let y = HD(tildify(nzn())),
        A = dirname(t),
        g = await readSessionLite(t),
        s =
          g &&
          (extractFieldFromLastEntryOfTypeStrict(g.tail, "relocated", "relocatedCwd") ??
            extractFieldFromFirstEntryStrict(g.head, "cwd"));
      return {
        type: "text",
        value: `Cannot /update \u2014 ${s && getProjectDir(s) === A ? `this session belongs to ${HD(tildify(s))} but is running in ${y}` : `this session is running in ${y} but its transcript is in ${HD(tildify(A))}`}. Restart manually with --resume to continue on the latest version.`,
      };
    }
  }
  let v = (t) => {
      if (!MGe(context.taskRegistry.all())) return;
      return (
        logEvent("tengu_update_refused", { active_tasks: !0, ...(t && { deferred: t }) }),
        "Can't restart while work is running in the background \u2014 wait for it to finish (or stop it via /tasks), then try again."
      );
    },
    w = (t) => {
      let b = listUncarriedLaunchSettings(getToolPermissionContext(context), getForkRestrictedLaunchConfig());
      if (b.length === 0) return v(t);
      logEvent("tengu_update_refused", { uncarriable: !0 });
      let y = isTranscriptPersistenceDisabled() ? "" : " (add --continue to return to this conversation)";
      return `Can't switch to the new version from inside this session \u2014 it has restrictions a restart can't carry over (${b.join("; ")}). Nothing was changed; exit and start claude again for the new version${y}.`;
    },
    S = p ? v() : w();
  if (S !== void 0) return { type: "text", value: S };
  if (p) {
    let t = basename(p);
    if (
      (await saveResumePoint(context.messages, context.storageV5),
      !(await withTimeout(flushSessionStorage(), 30000, "session flush").then(
        () => !0,
        () => !1,
      )))
    )
      return (
        logEvent("tengu_update_refused", { bg_flush_failed: !0 }),
        {
          type: "text",
          value:
            "Couldn't save the session to disk, so nothing was restarted \u2014 try /restart again in a moment.",
        }
      );
    let y = await resolveLauncher(),
      A = v(!0);
    if (A !== void 0) return { type: "text", value: A };
    let g = withLaunchValuesOfHybridConnection(withoutProtectedEnv({ ...process.env }));
    for (let s of BG_WORKER_IDENTITY_ENV_VARS) delete g[s];
    delete g.CLAUDE_JOB_DIR;
    for (let s of Object.keys(g)) if (s.startsWith("CLAUDE_BG_")) delete g[s];
    logEvent("tengu_update_bg_respawn", {
      carried_comment_monitor: BCo() && CFs(context.taskRegistry.all()),
    });
    try {
      let s = spawn(y.cmd, [...y.prefixArgs, "respawn", t], {
        detached: !0,
        stdio: "ignore",
        windowsHide: !0,
        env: g,
        cwd: homedir(),
      });
      (moveKeeperPid(s.pid),
        s.on("error", (I) => {
          logError(I);
        }),
        s.unref());
    } catch (error) {
      return (
        logError(error),
        logEvent("tengu_update_refused", { bg_spawn_failed: !0 }),
        {
          type: "text",
          value: `Couldn't restart automatically \u2014 press \u2190 to detach, then run \`claude respawn ${t}\` to restart it on the latest build.`,
        }
      );
    }
    return {
      type: "text",
      value: `Restarting this session on the latest version\u2026 If it doesn't come back within a minute, run \`claude respawn ${t}\` from a terminal.`,
    };
  }
  if (n === "not_typed")
    return (
      logEvent("tengu_update_refused", { foreground: fromEnum(n) }),
      logEvent("tengu_update_refused_not_typed", {}),
      { type: "text", value: "Can't restart automatically. Type /restart at the prompt." }
    );
  let C = planRestart(context.messages, context.storageV5);
  if (C !== void 0) return { type: "text", value: C };
  await saveResumePoint(context.messages, context.storageV5);
  let o = w(!0);
  if (o !== void 0) return { type: "text", value: o };
  let u = getToolPermissionContext(context),
    m = [
      ...buildRelaunchArgs(u, getSessionEffort(context)),
      ...buildPermissionAndAgentArgs(u, getForkReplayLaunchConfig()),
    ],
    f = isTeammate() ? void 0 : context.getAppState().teamContext?.teamName;
  await ensureLauncherRunnable();
  let O = w(!0);
  if (O !== void 0) return { type: "text", value: O };
  let h = getReplBridgeHandle(),
    k = h?.bridgeSessionId,
    D = h?.getLastSequenceNum(),
    F = h?.outboundOnly,
    V = h?.sessionGroupingId;
  if (k)
    (context.setAppState((t) => (t.replBridgeSkipNextArchive ? t : { ...t, replBridgeSkipNextArchive: !0 })),
      h.writeSdkMessages([
        createSyntheticAssistantMessage("Switching to latest Claude Code\u2026 reconnecting", getSessionId()),
      ]),
      await withTimeout(h.flush(), 2000, "bridge flush").catch(() => {}),
      await h.teardown({ skipArchive: !0 }));
  let _ = {};
  if (f) {
    _.CLAUDE_INTERNAL_ASSISTANT_TEAM_NAME = f;
    let { sessionListId: sessionListId } = ci().taskList;
    if (sessionListId) _.CLAUDE_INTERNAL_SESSION_TASK_LIST_ID = sessionListId;
  }
  (Object.assign(_, getScreenReaderEnv()),
    Object.assign(_, mvt(u.additionalWorkingDirectories)),
    Object.assign(
      _,
      buildBridgeReattachEnv(k, D, F, V, resolveBridgeHandoffIdentity(h, getCurrentSessionBridge())) ?? {},
    ));
  let E = getLaunchCommand(),
    T = await confirmRelaunch(context.messages, "relaunch", {}, context.storageV5),
    R = lastResumableMessage(context.messages) !== void 0;
  if (R && !T) {
    try {
      await recordTranscript(
        [
          ...context.messages,
          createLocalCommandMessage(`<${COMMAND_NAME}>/restart</${COMMAND_NAME}>
<${COMMAND_MESSAGE}>restart</${COMMAND_MESSAGE}>
<${COMMAND_ARGS}></${COMMAND_ARGS}>`),
          createLocalCommandMessage(
            `<${LOCAL_COMMAND_STDOUT}>${describeVersionChange(restartVersionTarget(E.target))}</${LOCAL_COMMAND_STDOUT}>`,
          ),
        ],
        void 0,
        void 0,
        void 0,
        context.storageV5,
      );
    } catch (error) {
      logError(error);
    }
    await saveResumePoint(context.messages, context.storageV5);
  }
  logEvent(R ? "tengu_update_relaunch" : "tengu_update_relaunch_fresh", {
    from_version: sanitizeVersion(
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
    ),
    target_version: sanitizeVersion(installedVersionName(E.target)),
    native_install: isRunningFromVersionsDir(),
  });
  try {
    return await restartOrExplain(
      n,
      T,
      {
        launcher: E,
        freshIfNoTranscript: !R,
        extraArgs: m,
        proactivity: { proactivityLevel: context.getProactivityLevel(), toolPermissionContext: u },
        env: Object.keys(_).length > 0 ? _ : void 0,
        preSpawn: () => {
          process.stdout.write(
            R && getTranscriptWriteFailureSeq() !== 0
              ? sequential.dim(`
Claude's last response couldn't be saved, so it may be missing.

`)
              : `
`,
          );
        },
      },
      context.storageV5,
    );
  } catch (error) {
    if (!T) throw error;
    return (
      logError(error),
      {
        type: "text",
        value: isBridgeOrTransport(context.session)
          ? withResumeFlag(
              "Couldn't restart Claude Code (detail withheld on this connection).",
              errorMessage(error),
            )
          : `Couldn't restart Claude Code \u2014 ${errorMessage(error)}.`,
      }
    );
  }
};

export { resolveLauncher };
