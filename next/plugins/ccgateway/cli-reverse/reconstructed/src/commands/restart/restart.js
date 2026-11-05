/**
 * commands/restart/restart.ts
 *
 * 2.1.316 新增。/restart 命令：检查能否重启（会话已保存、非远程控制），重启到已安装的新版本并说明版本变化。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5w5bn6qj.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
  isRunningFromVersionsDir_2,
} from "../../utils/deepLink/registerProtocol.js";
import { isBridgeOrVerifiedSlackTurn } from "../../utils/promptSubmissionOrigin.js";
import { isFrozenMarker } from "../../utils/frozenMarkers.js";
import {
  relaunchOrExplain,
  lastResumableMessage,
  projectRootForRelaunch,
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
import { truncatePathForDisplay } from "../../utils/invisibleChars.js";
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
import { isDisklessSession } from "../../utils/disklessSession.js";
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
import {
  hasRunningBackgroundTask,
  isBackgroundExitHandoffEnabled,
  hasLiveOrBootingAutoReact,
} from "../../tasks/backgroundTaskLabels.js";
import {
  listUncarriedLaunchSettings,
  buildRelaunchArgs,
  buildPermissionAndAgentArgs,
  sessionAddDirsEnv,
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
import { swarmHostState } from "../../utils/swarm/hostState.js";
import { getScreenReaderEnv } from "../../utils/accessibility/screenReader.js";
import { COMMAND_NAME, COMMAND_MESSAGE, COMMAND_ARGS, LOCAL_COMMAND_STDOUT } from "../../constants/xml.js";
import { sanitizeVersion } from "../../services/analytics/metadata.js";
import { sequential } from "../../utils/sequential.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-5w5bn6qj.js:1831-2042 placement
async function resolveLauncher() {
  let claudePath = await whichAsync("claude");
  let argv0 = processWrapperArgv()[0];
  let [resolvedClaudePath, resolvedArgv0] = await Promise.all([
    claudePath ? realpath(claudePath).catch(() => claudePath) : null,
    argv0 ? realpath(argv0).catch(() => argv0) : null,
  ]);
  if (claudePath && (resolvedArgv0 === null || resolvedClaudePath !== resolvedArgv0))
    return withProcessWrapper({
      cmd: claudePath,
      prefixArgs: [],
      target: claudePath,
    });
  return getLaunchCommand();
}
//@ chunk-5w5bn6qj.js:2042-3244 placement
/**
 * 升级/降级/同版本的结果文字
 */
function describeVersionChange(change) {
  switch (change.kind) {
    case "newer":
      return `Successfully updated from ${
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION
      } to version ${change.version}`;
    case "older":
      return `Successfully downgraded from ${
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION
      } to version ${change.version}`;
    case "same":
    case "unknown":
      return "Session resumed";
  }
}
//@ chunk-5w5bn6qj.js:3244-3287 placement
var REMOTE_CONTROL_STAFF_MARKER = Symbol("staff, over Remote Control");
//@ chunk-5w5bn6qj.js:3287-3385 placement
function restartRefusalReason(context) {
  if (isBridgeOrVerifiedSlackTurn(context)) return "not_owner";
  let submittedFromComposer = context.submittedFromComposer;
  return isFrozenMarker(submittedFromComposer) ? submittedFromComposer : "not_typed";
}
//@ chunk-5w5bn6qj.js:3385-3511 placement
function restartOrExplain(staffMarker, ...relaunchArgs) {
  if (staffMarker !== REMOTE_CONTROL_STAFF_MARKER && !isFrozenMarker(staffMarker))
    throw Error("Can't restart automatically. Type /restart at the prompt.");
  return relaunchOrExplain(...relaunchArgs);
}
//@ chunk-5w5bn6qj.js:3670-6616 placement
/**
 * 判定能否重启并给出拒绝原因
 */
function planRestart(messages, storageV5) {
  let refuse = (reason, message) => {
    logEvent("tengu_update_refused", {
      foreground: fromEnum(reason),
    });
    return message;
  };
  let manualHint = "To use the installed version, exit and start Claude Code again";
  if (lastResumableMessage(messages) !== undefined) {
    let persistenceDisabled = isTranscriptPersistenceDisabled();
    let materializedSessionFile = getMaterializedSessionFile();
    if (persistenceDisabled || materializedSessionFile === null)
      return refuse(
        persistenceDisabled ? "saving_off" : "not_written",
        "Can't restart this session. It isn't saved to disk, so a restart would lose it. Nothing was changed. To use the installed version, exit and start Claude Code again. You may not be able to resume this session.",
      );
    if (getTranscriptWriteFailureSeq() !== 0)
      return refuse(
        "write_failed",
        "Couldn't save this session to disk, so nothing was restarted. If you exit now, you may not be able to resume all of it.",
      );
    if (storageV5 === undefined) {
      let goneStatus = sessionGoneStatusCache.get(materializedSessionFile);
      if (goneStatus === undefined)
        try {
          goneStatus = statSync(materializedSessionFile).size > 0 ? undefined : "empty";
        } catch {
          goneStatus = "missing";
        }
      if (goneStatus !== undefined) {
        sessionGoneStatusCache.set(materializedSessionFile, goneStatus);
        return refuse(
          "gone",
          goneStatus === "empty"
            ? "Can't restart this session. It isn't saved to disk, so a restart would lose it. Nothing was changed. To use the installed version, exit and start Claude Code again. You may not be able to resume this session."
            : "Can't restart this session. Its saved file can't be found and may have been moved or deleted. You can keep working here, or run /export to save a copy of the conversation before you exit.",
        );
      }
    }
  }
  let projectRoot = projectRootForRelaunch();
  if (!existsSync(projectRoot))
    return refuse(
      "no_folder",
      `Can't restart this session here. Its folder, ${truncatePathForDisplay(tildify(projectRoot))}, can't be found. Nothing was changed. To use the installed version, exit and start Claude Code in the folder you want to work in, then run /resume and press Ctrl+A to show all projects.`,
    );
  let mapped = getReplConfigArgv().map((argv) => argv.trim());
  let found = mapped.find((value, argvIndex) => {
    let prevArg = mapped[argvIndex - 1];
    if ((prevArg !== "--settings" && prevArg !== "--mcp-config") || value === "" || value.startsWith("{"))
      return false;
    try {
      let settingsPath =
        prevArg === "--settings" && !isInClaudeConfigHome(value)
          ? vetRepoSettingsPath(getFsImplementation(), value).resolvedPath
          : value;
      return !statSync(settingsPath).isFile();
    } catch {
      return true;
    }
  });
  if (found !== undefined) {
    logEvent("tengu_update_refused_launch_file", {});
    return refuse(
      "launch_file",
      `Can't restart this session. It was started with ${truncatePathForDisplay(tildify(found))}, which can't be read now. Nothing was changed. To use the installed version, exit and start Claude Code again, then run /resume.`,
    );
  }
  if (getReplBridgeHandle()?.bridgeSessionId)
    return refuse(
      "remote_control",
      "Can't restart while Remote Control is connected. To use the installed version, exit and start Claude Code again, then run /resume.",
    );
  if (!existsSync(getLaunchCommand().target))
    return refuse(
      "no_launcher",
      "Can't restart. The installed version wasn't found. To check your installs, run /doctor.",
    );
  let maxVersionConfig = resolveMaxVersionConfig(installedVersionName);
  if (maxVersionConfig !== undefined)
    return refuse(
      "above_max_version",
      `Can't restart on the installed version. Version ${maxVersionConfig} is on hold, so this session is staying on ${
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION
      }. Nothing was changed.`,
    );
  return;
}
//@ chunk-5w5bn6qj.js:6616-12244 placement
var call = async (args, context) => {
  if (isDisklessSession())
    return {
      type: "text",
      value: "/restart isn't available in this environment.",
    };
  let refusalReason = restartRefusalReason(context);
  if (refusalReason === "not_owner") {
    logEvent("tengu_update_refused", {
      not_owner: true,
    });
    logEvent("tengu_update_refused_not_owner", {});
    return {
      type: "text",
      value: "/restart isn't available over Remote Control.",
    };
  }
  let CLAUDE_JOB_DIR = isBgSession() ? env.CLAUDE_JOB_DIR : undefined;
  if (isBgSession() && (!isDaemonBgWorker() || !CLAUDE_JOB_DIR)) {
    logEvent("tengu_update_refused", {
      bg_session: true,
    });
    let jobShortId = isDaemonBgWorker() ? null : getOwnJobShortId();
    return {
      type: "text",
      value: jobShortId
        ? `This is a background session \u2014 press \u2190 to detach, then run \`claude respawn ${jobShortId}\` to restart it on the latest build.`
        : "This is a background session \u2014 press \u2190 to detach, then run `claude respawn <id>` to restart it on the latest build (the id is in the agents view).",
    };
  }
  if (!CLAUDE_JOB_DIR) {
    let materializedSessionFile = getMaterializedSessionFile();
    let expectedTranscriptPath = join(getProjectDir(projectRootForRelaunch()), `${getSessionId()}.jsonl`);
    if (materializedSessionFile && materializedSessionFile !== expectedTranscriptPath) {
      logEvent("tengu_update_refused", {
        transcript_path_drift: true,
      });
      let displayRoot = truncatePathForDisplay(tildify(projectRootForRelaunch()));
      let transcriptDir = dirname(materializedSessionFile);
      let sessionLite = await readSessionLite(materializedSessionFile);
      let transcriptCwd =
        sessionLite &&
        (extractFieldFromLastEntryOfTypeStrict(sessionLite.tail, "relocated", "relocatedCwd") ??
          extractFieldFromFirstEntryStrict(sessionLite.head, "cwd"));
      return {
        type: "text",
        value: `Cannot /update \u2014 ${transcriptCwd && getProjectDir(transcriptCwd) === transcriptDir ? `this session belongs to ${truncatePathForDisplay(tildify(transcriptCwd))} but is running in ${displayRoot}` : `this session is running in ${displayRoot} but its transcript is in ${truncatePathForDisplay(tildify(transcriptDir))}`}. Restart manually with --resume to continue on the latest version.`,
      };
    }
  }
  let checkNoRunningTasks = (deferred) => {
    if (!hasRunningBackgroundTask(context.taskRegistry.all())) return;
    logEvent("tengu_update_refused", {
      active_tasks: true,
      ...(deferred && {
        deferred,
      }),
    });
    return "Can't restart while work is running in the background \u2014 wait for it to finish (or stop it via /tasks), then try again.";
  };
  let checkCarriableSettings = (deferred) => {
    let uncarriedSettings = listUncarriedLaunchSettings(
      getToolPermissionContext(context),
      getForkRestrictedLaunchConfig(),
    );
    if (uncarriedSettings.length === 0) return checkNoRunningTasks(deferred);
    logEvent("tengu_update_refused", {
      uncarriable: true,
    });
    let continueHint = isTranscriptPersistenceDisabled()
      ? ""
      : " (add --continue to return to this conversation)";
    return `Can't switch to the new version from inside this session \u2014 it has restrictions a restart can't carry over (${uncarriedSettings.join("; ")}). Nothing was changed; exit and start claude again for the new version${continueHint}.`;
  };
  let blockReason = CLAUDE_JOB_DIR ? checkNoRunningTasks() : checkCarriableSettings();
  if (blockReason !== undefined)
    return {
      type: "text",
      value: blockReason,
    };
  if (CLAUDE_JOB_DIR) {
    let jobShortId = basename(CLAUDE_JOB_DIR);
    await saveResumePoint(context.messages, context.storageV5);
    if (
      !(await withTimeout(flushSessionStorage(), 30000, "session flush").then(
        () => true,
        () => false,
      ))
    ) {
      logEvent("tengu_update_refused", {
        bg_flush_failed: true,
      });
      return {
        type: "text",
        value:
          "Couldn't save the session to disk, so nothing was restarted \u2014 try /restart again in a moment.",
      };
    }
    let launcher = await resolveLauncher();
    let blockReason = checkNoRunningTasks(true);
    if (blockReason !== undefined)
      return {
        type: "text",
        value: blockReason,
      };
    let env_2 = withLaunchValuesOfHybridConnection(
      withoutProtectedEnv({
        ...process.env,
      }),
    );
    for (let envKey of BG_WORKER_IDENTITY_ENV_VARS) delete env_2[envKey];
    delete env_2.CLAUDE_JOB_DIR;
    for (let key of Object.keys(env_2)) if (key.startsWith("CLAUDE_BG_")) delete env_2[key];
    logEvent("tengu_update_bg_respawn", {
      carried_comment_monitor:
        isBackgroundExitHandoffEnabled() && hasLiveOrBootingAutoReact(context.taskRegistry.all()),
    });
    try {
      let child = spawn(launcher.cmd, [...launcher.prefixArgs, "respawn", jobShortId], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
        env: env_2,
        cwd: homedir(),
      });
      moveKeeperPid(child.pid);
      child.on("error", (spawnError) => {
        logError(spawnError);
      });
      child.unref();
    } catch (error) {
      logError(error);
      logEvent("tengu_update_refused", {
        bg_spawn_failed: true,
      });
      return {
        type: "text",
        value: `Couldn't restart automatically \u2014 press \u2190 to detach, then run \`claude respawn ${jobShortId}\` to restart it on the latest build.`,
      };
    }
    return {
      type: "text",
      value: `Restarting this session on the latest version\u2026 If it doesn't come back within a minute, run \`claude respawn ${jobShortId}\` from a terminal.`,
    };
  }
  if (refusalReason === "not_typed") {
    logEvent("tengu_update_refused", {
      foreground: fromEnum(refusalReason),
    });
    logEvent("tengu_update_refused_not_typed", {});
    return {
      type: "text",
      value: "Can't restart automatically. Type /restart at the prompt.",
    };
  }
  let planReason = planRestart(context.messages, context.storageV5);
  if (planReason !== undefined)
    return {
      type: "text",
      value: planReason,
    };
  await saveResumePoint(context.messages, context.storageV5);
  let postSaveBlockReason = checkCarriableSettings(true);
  if (postSaveBlockReason !== undefined)
    return {
      type: "text",
      value: postSaveBlockReason,
    };
  let toolPermissionContext = getToolPermissionContext(context);
  let extraArgs = [
    ...buildRelaunchArgs(toolPermissionContext, getSessionEffort(context)),
    ...buildPermissionAndAgentArgs(toolPermissionContext, getForkReplayLaunchConfig()),
  ];
  let teamName = isTeammate() ? undefined : context.getAppState().teamContext?.teamName;
  await ensureLauncherRunnable();
  let postEnsureBlockReason = checkCarriableSettings(true);
  if (postEnsureBlockReason !== undefined)
    return {
      type: "text",
      value: postEnsureBlockReason,
    };
  let replBridgeHandle = getReplBridgeHandle();
  let bridgeSessionId = replBridgeHandle?.bridgeSessionId;
  let lastSequenceNum = replBridgeHandle?.getLastSequenceNum();
  let outboundOnly = replBridgeHandle?.outboundOnly;
  let sessionGroupingId = replBridgeHandle?.sessionGroupingId;
  if (bridgeSessionId) {
    context.setAppState((prevState) =>
      prevState.replBridgeSkipNextArchive
        ? prevState
        : {
            ...prevState,
            replBridgeSkipNextArchive: true,
          },
    );
    replBridgeHandle.writeSdkMessages([
      createSyntheticAssistantMessage("Switching to latest Claude Code\u2026 reconnecting", getSessionId()),
    ]);
    await withTimeout(replBridgeHandle.flush(), 2000, "bridge flush").catch(() => {});
    await replBridgeHandle.teardown({
      skipArchive: true,
    });
  }
  let _ = {};
  if (teamName) {
    _.CLAUDE_INTERNAL_ASSISTANT_TEAM_NAME = teamName;
    let { sessionListId } = swarmHostState().taskList;
    if (sessionListId) _.CLAUDE_INTERNAL_SESSION_TASK_LIST_ID = sessionListId;
  }
  Object.assign(_, getScreenReaderEnv());
  Object.assign(_, sessionAddDirsEnv(toolPermissionContext.additionalWorkingDirectories));
  Object.assign(
    _,
    buildBridgeReattachEnv(
      bridgeSessionId,
      lastSequenceNum,
      outboundOnly,
      sessionGroupingId,
      resolveBridgeHandoffIdentity(replBridgeHandle, getCurrentSessionBridge()),
    ) ?? {},
  );
  let launchCommand = getLaunchCommand();
  let confirmed = await confirmRelaunch(context.messages, "relaunch", {}, context.storageV5);
  let hasTranscript = lastResumableMessage(context.messages) !== undefined;
  if (hasTranscript && !confirmed) {
    try {
      await recordTranscript(
        [
          ...context.messages,
          createLocalCommandMessage(`<${COMMAND_NAME}>/restart</${COMMAND_NAME}>
<${COMMAND_MESSAGE}>restart</${COMMAND_MESSAGE}>
<${COMMAND_ARGS}></${COMMAND_ARGS}>`),
          createLocalCommandMessage(
            `<${LOCAL_COMMAND_STDOUT}>${describeVersionChange(restartVersionTarget(launchCommand.target))}</${LOCAL_COMMAND_STDOUT}>`,
          ),
        ],
        undefined,
        undefined,
        undefined,
        context.storageV5,
      );
    } catch (error) {
      logError(error);
    }
    await saveResumePoint(context.messages, context.storageV5);
  }
  logEvent(hasTranscript ? "tengu_update_relaunch" : "tengu_update_relaunch_fresh", {
    from_version: sanitizeVersion(
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
    ),
    target_version: sanitizeVersion(installedVersionName(launchCommand.target)),
    native_install: isRunningFromVersionsDir_2(),
  });
  try {
    return await restartOrExplain(
      refusalReason,
      confirmed,
      {
        launcher: launchCommand,
        freshIfNoTranscript: !hasTranscript,
        extraArgs,
        proactivity: {
          proactivityLevel: context.getProactivityLevel(),
          toolPermissionContext,
        },
        env: Object.keys(_).length > 0 ? _ : undefined,
        preSpawn: () => {
          process.stdout.write(
            hasTranscript && getTranscriptWriteFailureSeq() !== 0
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
    if (!confirmed) throw error;
    logError(error);
    return {
      type: "text",
      value: isBridgeOrTransport(context.session)
        ? withResumeFlag(
            "Couldn't restart Claude Code (detail withheld on this connection).",
            errorMessage(error),
          )
        : `Couldn't restart Claude Code \u2014 ${errorMessage(error)}.`,
    };
  }
};
export { resolveLauncher, call };
