/**
 * commands/resume/resume.tsx
 *
 * 并入已有模块：/resume 命令的导出占位。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/resume/resume.tsx
 * pieces: chunk-74n7apcd.js (5)
 * attribution: placement 1, fingerprint 4
 */
import { init_react_production, y, R, ce, P } from "../../../vendor/react/cjs/react.production.js";
import { sequential } from "../../utils/sequential.js";
import { useScrollViewportSize, useHasScrollViewport } from "../../components/ScrollViewportContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { useSession } from "../../context/session.js";
import {
  loadAllProjectsMessageLogsProgressive,
  loadSameRepoMessageLogsProgressive,
  enrichLogs,
  getSessionIdFromLog,
  isLiteLog,
  loadFullLog,
  loadSameRepoMessageLogs,
  isCustomTitleEnabled,
  searchSessionsByCustomTitle,
} from "../../utils/sessionStorage.js";
import { getSessionId, getOriginalCwd } from "../../bootstrap/state.js";
import { getWorktreePaths } from "../../utils/getWorktreePaths.js";
import { sortLogs } from "../../types/logs.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { checkCrossProjectResume } from "../../utils/crossProjectResume.js";
import { setClipboard } from "../../ink/termio/osc.js";
import { logError, getLogDisplayTitle } from "../../utils/log.js";
import { withTelemetryMessage, toError, errorMessage, getErrnoCode } from "../../utils/errors.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Pane } from "../../components/design-system/Pane.js";
import { Text, Box } from "../../ink/components/Text.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { LogSelector } from "../../components/LogSelector.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { AddDirError } from "../add-dir/add-dir.js";
import {
  findBackgroundSessionHolder,
  quoteTitleForBackgroundNotice,
  formatSessionRunningInBackground,
} from "../../utils/sessionAttach.js";
import { liveBackgroundJobId } from "./openLiveBackground.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { ResumeRefusedError } from "../../utils/transcript/deserialize.js";
import { getLastSessionLog } from "../../utils/conversationRecovery.js";
import { win32EbadfHelp } from "../../utils/transcript/transcriptFiles.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-74n7apcd.js:18584-18588 placement
init_react_production();
//@ chunk-74n7apcd.js:18588-18826 fingerprint = resumeHelpMessage (1)
function resumeHelpMessage(result) {
  switch (result.resultType) {
    case "sessionNotFound":
      return `Session ${sequential.bold(result.arg)} was not found.`;
    case "multipleMatches":
      return `Found ${result.count} sessions matching ${sequential.bold(result.arg)}. Please use /resume to pick a specific session.`;
  }
}
//@ chunk-74n7apcd.js:19188-21375 fingerprint = ResumeCommand (0.67)
function ResumeCommand({ onDone, onResume }) {
  let [logs, setLogs] = y([]);
  let [worktreePaths, setWorktreePaths] = y([]);
  let [loading, setLoading] = y(true);
  let [resuming, setResuming] = y(false);
  let [showAllProjects, setShowAllProjects] = y(false);
  let { rows } = useScrollViewportSize(useTerminalSize());
  let insideModal = useHasScrollViewport();
  let { storageV5 } = useTheme_2();
  let currentSessionId = useSession((p) => p.id);
  let F = R(false);
  let q = R(false);
  let allLogsRef = R(null);
  let W = R(false);
  let D = R(0);
  let loadLogs = ce(
    async (allProjects, paths) => {
      setLoading(true);
      allLogsRef.current = null;
      try {
        let allLogs = allProjects
          ? await loadAllProjectsMessageLogsProgressive(undefined, undefined, storageV5)
          : await loadSameRepoMessageLogsProgressive(paths, undefined, undefined, storageV5);
        if (F.current) return;
        allLogsRef.current = allLogs;
        let resumable = filterResumableSessions(allLogs.logs, getSessionId());
        D.current = resumable.length;
        setLogs(resumable);
      } catch (_err) {
        if (F.current) return;
        onDone("Failed to load conversations");
      } finally {
        setLoading(false);
      }
    },
    [onDone, storageV5],
  );
  P(() => {
    async function init() {
      let paths = await getWorktreePaths(getOriginalCwd());
      if (F.current) return;
      setWorktreePaths(paths);
      loadLogs(false, paths);
    }
    init();
  }, [loadLogs]);
  let z = ce(
    (p) => {
      if (W.current) return;
      let c = allLogsRef.current;
      if (!c || c.nextIndex >= c.allStatLogs.length) return;
      W.current = true;
      let I = false;
      enrichLogs(c.allStatLogs, c.nextIndex, p, storageV5)
        .then((v) => {
          if (allLogsRef.current !== c || F.current) return;
          c.nextIndex = v.nextIndex;
          let T = filterResumableSessions(v.logs, getSessionId());
          if (T.length > 0) {
            let ee = D.current;
            sortLogs(T).forEach((J, se) => {
              J.value = ee + se;
            });
            setLogs((J) => J.concat(T));
            D.current += T.length;
          } else if (c.nextIndex < c.allStatLogs.length) I = true;
        })
        .finally(() => {
          W.current = false;
          if (I) z(p);
        });
    },
    [storageV5],
  );
  let onToggleAllProjects = ce(() => {
    let newValue = !showAllProjects;
    setShowAllProjects(newValue);
    loadLogs(newValue, worktreePaths);
  }, [showAllProjects, loadLogs, worktreePaths]);
  async function handleSelect(log) {
    if (q.current) return;
    q.current = true;
    let sessionId = normalizeUuidOrNull(getSessionIdFromLog(log));
    if (!sessionId) {
      onDone("Failed to resume conversation");
      return;
    }
    let fullLog;
    let crossProjectCheck;
    try {
      fullLog = isLiteLog(log)
        ? await loadFullLog(log, {
            storageV5,
          })
        : log;
      if (F.current) return;
      crossProjectCheck = await checkCrossProjectResume(fullLog, showAllProjects, worktreePaths);
      if (F.current) return;
      if (crossProjectCheck) {
        let raw = await setClipboard(crossProjectCheck);
        if (F.current) return;
        if (raw) process.stdout.write(raw);
      }
    } catch (error) {
      if (F.current) return;
      logError(withTelemetryMessage(toError(error), "resume command: handleSelect failed"));
      onDone("Failed to resume conversation");
      return;
    }
    if (crossProjectCheck) {
      let message = [
        "",
        "This conversation is from a different directory.",
        "",
        "To resume, run:",
        `  ${crossProjectCheck}`,
        "",
        "(Command copied to clipboard)",
        "",
      ].join(`
`);
      onDone(message, {
        display: "user",
      });
      return;
    }
    setResuming(true);
    onResume(sessionId, fullLog, "slash_command_picker");
  }
  function handleCancel() {
    F.current = true;
    onDone("Resume cancelled", {
      display: "system",
    });
  }
  useKeybinding("confirm:no", handleCancel, {
    context: "Confirmation",
    isActive: loading && !resuming,
  });
  if (loading || resuming)
    return jsxProd_default_2(Pane, {
      color: "suggestion",
      children: [
        jsxProd_default(Text, {
          bold: true,
          color: "suggestion",
          children: "Resume session",
        }),
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(WorkerBadge, {
            message: resuming ? "Resuming conversation\u2026" : "Loading conversations\u2026",
          }),
        }),
      ],
    });
  return jsxProd_default(LogSelector, {
    logs,
    currentSessionId,
    maxHeight: insideModal ? rows : rows - 2,
    onCancel: handleCancel,
    onSelect: handleSelect,
    onLogsChanged: () => loadLogs(showAllProjects, worktreePaths),
    onLoadMore: z,
    showAllProjects,
    onToggleAllProjects,
  });
}
//@ chunk-74n7apcd.js:21375-21439 fingerprint = filterResumableSessions (1)
function filterResumableSessions(logs, currentSessionId) {
  return logs.filter((log) => !log.isSidechain && getSessionIdFromLog(log) !== currentSessionId);
}
//@ chunk-74n7apcd.js:21439-23794 fingerprint = call (0.595)
/**
 * /resume 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var call = async (onDone, context, args) => {
  if (isRemoteSessionAvailable())
    return jsxProd_default(AddDirError, {
      message:
        "/resume can't open this computer's conversations while this terminal is attached to a remote session. To resume one, run /exit, then `claude --resume` in a shell.",
      args: args ?? "",
      onDone: () =>
        onDone(
          "/resume can't open this computer's conversations while this terminal is attached to a remote session. To resume one, run /exit, then `claude --resume` in a shell.",
        ),
    });
  let onResume = async (sessionId, log, entrypoint) => {
    let backgroundSessionHolder = await findBackgroundSessionHolder(sessionId, context.storageV5);
    if (backgroundSessionHolder) {
      let logDisplayTitle = getLogDisplayTitle(log);
      let S = liveBackgroundJobId(backgroundSessionHolder, {
        replacesProcess: false,
      });
      if (S !== undefined && context.attachLiveBackgroundSession?.(S)) {
        logFeatureOk("resume_live_background_open", {
          entrypoint: lit("slash_command"),
        });
        onDone(
          `Opening ${quoteTitleForBackgroundNotice(logDisplayTitle)}, running in the background (${S})`,
          {
            display: "system",
          },
        );
        return;
      }
      logFeatureSad(
        "resume_live_background_open",
        S === undefined
          ? "not_openable"
          : context.attachLiveBackgroundSession
            ? "attach_refused"
            : "no_attach_surface",
      );
      onDone(
        formatSessionRunningInBackground({
          title: logDisplayTitle,
          holder: backgroundSessionHolder,
          canFork: false,
        }),
        {
          display: "user",
        },
      );
      return;
    }
    try {
      await context.resume?.(sessionId, log, entrypoint);
      onDone(undefined, {
        display: "skip",
      });
    } catch (error) {
      if (error instanceof ResumeRefusedError) {
        onDone(error.message, {
          display: "system",
        });
        return;
      }
      logError(withTelemetryMessage(toError(error), "resume: context.resume failed"));
      onDone(`Failed to resume: ${errorMessage(error)}`);
    }
  };
  let arg = args?.trim();
  if (!arg)
    return jsxProd_default(
      ResumeCommand,
      {
        onDone,
        onResume,
      },
      Date.now(),
    );
  let worktreePaths = await getWorktreePaths(getOriginalCwd());
  let logs = await loadSameRepoMessageLogs(worktreePaths, undefined, undefined, context.storageV5);
  if (logs.length === 0)
    return jsxProd_default(AddDirError, {
      message: "No conversations found to resume.",
      args: arg,
      onDone: () => onDone("No conversations found to resume."),
    });
  let maybeSessionId = normalizeUuidOrNull(arg);
  if (maybeSessionId) {
    let matchingLogs = logs
      .filter((log) => getSessionIdFromLog(log) === maybeSessionId)
      .sort((i, L) => L.modified.getTime() - i.modified.getTime());
    if (matchingLogs.length > 0) {
      let log = matchingLogs[0];
      let fullLog = isLiteLog(log)
        ? await loadFullLog(log, {
            storageV5: context.storageV5,
          })
        : log;
      onResume(maybeSessionId, fullLog, "slash_command_session_id");
      return null;
    }
    let a = await getLastSessionLog(maybeSessionId, undefined, context.storageV5).then(
      (log) => ({
        log,
      }),
      (error) => {
        let L = win32EbadfHelp(error);
        if (L === undefined) throw error;
        logForDebugging(`/resume: session load failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
          level: "error",
        });
        return {
          ebadfSentence: L,
        };
      },
    );
    if ("ebadfSentence" in a) {
      let i = `Failed to resume: ${a.ebadfSentence}`;
      return jsxProd_default(AddDirError, {
        message: i,
        args: arg,
        onDone: () => onDone(i),
      });
    }
    if (a.log) {
      onResume(maybeSessionId, a.log, "slash_command_session_id");
      return null;
    }
  }
  if (isCustomTitleEnabled()) {
    let titleMatches = await searchSessionsByCustomTitle(
      arg,
      {
        exact: true,
      },
      context.storageV5,
    );
    if (titleMatches.length === 1) {
      let log = titleMatches[0];
      let sessionId = normalizeUuidOrNull(getSessionIdFromLog(log));
      if (sessionId) {
        let fullLog = isLiteLog(log)
          ? await loadFullLog(log, {
              storageV5: context.storageV5,
            })
          : log;
        onResume(sessionId, fullLog, "slash_command_title");
        return null;
      }
    }
    if (titleMatches.length > 1) {
      let message = resumeHelpMessage({
        resultType: "multipleMatches",
        arg,
        count: titleMatches.length,
      });
      return jsxProd_default(AddDirError, {
        message,
        args: arg,
        onDone: () => onDone(message),
      });
    }
  }
  let message = resumeHelpMessage({
    resultType: "sessionNotFound",
    arg,
  });
  return jsxProd_default(AddDirError, {
    message,
    args: arg,
    onDone: () => onDone(message),
  });
};
