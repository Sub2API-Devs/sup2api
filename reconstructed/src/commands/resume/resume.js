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
import { j, y, R, ce, P } from "../../../vendor/react/cjs/react.production.js";
import { sequential } from "../../utils/sequential.js";
import { useScrollViewportSize, Tl } from "../../components/ScrollViewportContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
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
import { Vt } from "../../utils/agentId.js";
import { checkCrossProjectResume } from "../../utils/crossProjectResume.js";
import { setClipboard } from "../../ink/termio/osc.js";
import { logError, getLogDisplayTitle } from "../../utils/log.js";
import { withTelemetryMessage, toError, errorMessage, getErrnoCode } from "../../utils/errors.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Pane } from "../../components/design-system/Pane.js";
import { Text, Box } from "../../ink/components/Text.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { LogSelector } from "../../components/LogSelector.js";
import { wt } from "../../remote/remoteMode.js";
import { AddDirError } from "../add-dir/add-dir.js";
import {
  findBackgroundSessionHolder,
  xHt,
  formatSessionRunningInBackground,
} from "../../utils/sessionAttach.js";
import { liveBackgroundJobId } from "./openLiveBackground.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { ResumeRefusedError } from "../../utils/transcript/deserialize.js";
import { getLastSessionLog } from "../../utils/conversationRecovery.js";
import { _et } from "../../utils/transcript/transcriptFiles.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-74n7apcd.js:18584-18588 placement
j();
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
function ResumeCommand({ onDone: onDone, onResume: onResume }) {
  let [C, O] = y([]),
    [u, x] = y([]),
    [M, _] = y(!0),
    [V, h] = y(!1),
    [a, i] = y(!1),
    { rows: rows } = useScrollViewportSize(useTerminalSize()),
    insideModal = Tl(),
    { storageV5: storageV5 } = Me(),
    Q = useSession((p) => p.id),
    F = R(!1),
    q = R(!1),
    U = R(null),
    W = R(!1),
    D = R(0),
    A = ce(
      async (allProjects, paths) => {
        (_(!0), (U.current = null));
        try {
          let I = allProjects
            ? await loadAllProjectsMessageLogsProgressive(void 0, void 0, storageV5)
            : await loadSameRepoMessageLogsProgressive(paths, void 0, void 0, storageV5);
          if (F.current) return;
          U.current = I;
          let resumable = filterResumableSessions(I.logs, getSessionId());
          ((D.current = resumable.length), O(resumable));
        } catch (error) {
          if (F.current) return;
          onDone("Failed to load conversations");
        } finally {
          _(!1);
        }
      },
      [onDone, storageV5],
    );
  P(() => {
    async function init() {
      let paths_0 = await getWorktreePaths(getOriginalCwd());
      if (F.current) return;
      (x(paths_0), A(!1, paths_0));
    }
    init();
  }, [A]);
  let z = ce(
      (p) => {
        if (W.current) return;
        let c = U.current;
        if (!c || c.nextIndex >= c.allStatLogs.length) return;
        W.current = !0;
        let I = !1;
        enrichLogs(c.allStatLogs, c.nextIndex, p, storageV5)
          .then((v) => {
            if (U.current !== c || F.current) return;
            c.nextIndex = v.nextIndex;
            let T = filterResumableSessions(v.logs, getSessionId());
            if (T.length > 0) {
              let ee = D.current;
              (sortLogs(T).forEach((J, se) => {
                J.value = ee + se;
              }),
                O((J) => J.concat(T)),
                (D.current += T.length));
            } else if (c.nextIndex < c.allStatLogs.length) I = !0;
          })
          .finally(() => {
            if (((W.current = !1), I)) z(p);
          });
      },
      [storageV5],
    ),
    Y = ce(() => {
      let newValue = !a;
      (i(newValue), A(newValue, u));
    }, [a, A, u]);
  async function handleSelect(log) {
    if (q.current) return;
    q.current = !0;
    let sessionId = Vt(getSessionIdFromLog(log));
    if (!sessionId) {
      onDone("Failed to resume conversation");
      return;
    }
    let I, v;
    try {
      if (((I = isLiteLog(log) ? await loadFullLog(log, { storageV5: storageV5 }) : log), F.current)) return;
      if (((v = await checkCrossProjectResume(I, a, u)), F.current)) return;
      if (v) {
        let raw = await setClipboard(v);
        if (F.current) return;
        if (raw) process.stdout.write(raw);
      }
    } catch (error) {
      if (F.current) return;
      (logError(withTelemetryMessage(toError(error), "resume command: handleSelect failed")),
        onDone("Failed to resume conversation"));
      return;
    }
    if (v) {
      let joined = [
        "",
        "This conversation is from a different directory.",
        "",
        "To resume, run:",
        `  ${v}`,
        "",
        "(Command copied to clipboard)",
        "",
      ].join(`
`);
      onDone(joined, { display: "user" });
      return;
    }
    (h(!0), onResume(sessionId, I, "slash_command_picker"));
  }
  function handleCancel() {
    ((F.current = !0), onDone("Resume cancelled", { display: "system" }));
  }
  if ((useKeybinding("confirm:no", handleCancel, { context: "Confirmation", isActive: M && !V }), M || V))
    return r(Pane, {
      color: "suggestion",
      children: [
        e(Text, { bold: !0, color: "suggestion", children: "Resume session" }),
        e(Box, {
          marginTop: 1,
          children: e(WorkerBadge, {
            message: V ? "Resuming conversation\u2026" : "Loading conversations\u2026",
          }),
        }),
      ],
    });
  return e(LogSelector, {
    logs: C,
    currentSessionId: Q,
    maxHeight: insideModal ? rows : rows - 2,
    onCancel: handleCancel,
    onSelect: handleSelect,
    onLogsChanged: () => A(a, u),
    onLoadMore: z,
    showAllProjects: a,
    onToggleAllProjects: Y,
  });
}
//@ chunk-74n7apcd.js:21375-21439 fingerprint = filterResumableSessions (1)
function filterResumableSessions(logs, currentSessionId) {
  return logs.filter((C) => !C.isSidechain && getSessionIdFromLog(C) !== currentSessionId);
}
/**
 * /resume 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-74n7apcd.js:21439-23794 fingerprint = call (0.595)
var call = async (onDone, context, args) => {
  if (wt())
    return e(AddDirError, {
      message:
        "/resume can't open this computer's conversations while this terminal is attached to a remote session. To resume one, run /exit, then `claude --resume` in a shell.",
      args: args ?? "",
      onDone: () =>
        onDone(
          "/resume can't open this computer's conversations while this terminal is attached to a remote session. To resume one, run /exit, then `claude --resume` in a shell.",
        ),
    });
  let onResume = async (sessionId, log, entrypoint) => {
      let L = await findBackgroundSessionHolder(sessionId, context.storageV5);
      if (L) {
        let E = getLogDisplayTitle(log),
          S = liveBackgroundJobId(L, { replacesProcess: !1 });
        if (S !== void 0 && context.attachLiveBackgroundSession?.(S)) {
          (logFeatureOk("resume_live_background_open", { entrypoint: lit("slash_command") }),
            onDone(`Opening ${xHt(E)}, running in the background (${S})`, { display: "system" }));
          return;
        }
        (logFeatureSad(
          "resume_live_background_open",
          S === void 0
            ? "not_openable"
            : context.attachLiveBackgroundSession
              ? "attach_refused"
              : "no_attach_surface",
        ),
          onDone(formatSessionRunningInBackground({ title: E, holder: L, canFork: !1 }), {
            display: "user",
          }));
        return;
      }
      try {
        (await context.resume?.(sessionId, log, entrypoint), onDone(void 0, { display: "skip" }));
      } catch (error) {
        if (error instanceof ResumeRefusedError) {
          onDone(error.message, { display: "system" });
          return;
        }
        (logError(withTelemetryMessage(toError(error), "resume: context.resume failed")),
          onDone(`Failed to resume: ${errorMessage(error)}`));
      }
    },
    arg = args?.trim();
  if (!arg) return e(ResumeCommand, { onDone: onDone, onResume: onResume }, Date.now());
  let worktreePaths = await getWorktreePaths(getOriginalCwd()),
    M = await loadSameRepoMessageLogs(worktreePaths, void 0, void 0, context.storageV5);
  if (M.length === 0)
    return e(AddDirError, {
      message: "No conversations found to resume.",
      args: arg,
      onDone: () => onDone("No conversations found to resume."),
    });
  let maybeSessionId = Vt(arg);
  if (maybeSessionId) {
    let matchingLogs = M.filter((i) => getSessionIdFromLog(i) === maybeSessionId).sort(
      (i, L) => L.modified.getTime() - i.modified.getTime(),
    );
    if (matchingLogs.length > 0) {
      let i = matchingLogs[0],
        L = isLiteLog(i) ? await loadFullLog(i, { storageV5: context.storageV5 }) : i;
      return (onResume(maybeSessionId, L, "slash_command_session_id"), null);
    }
    let a = await getLastSessionLog(maybeSessionId, void 0, context.storageV5).then(
      (i) => ({ log: i }),
      (i) => {
        let L = _et(i);
        if (L === void 0) throw i;
        return (
          logForDebugging(`/resume: session load failed (${getErrnoCode(i)}): ${errorMessage(i)}`, {
            level: "error",
          }),
          { ebadfSentence: L }
        );
      },
    );
    if ("ebadfSentence" in a) {
      let i = `Failed to resume: ${a.ebadfSentence}`;
      return e(AddDirError, { message: i, args: arg, onDone: () => onDone(i) });
    }
    if (a.log) return (onResume(maybeSessionId, a.log, "slash_command_session_id"), null);
  }
  if (isCustomTitleEnabled()) {
    let h = await searchSessionsByCustomTitle(arg, { exact: !0 }, context.storageV5);
    if (h.length === 1) {
      let a = h[0],
        sessionId = Vt(getSessionIdFromLog(a));
      if (sessionId) {
        let L = isLiteLog(a) ? await loadFullLog(a, { storageV5: context.storageV5 }) : a;
        return (onResume(sessionId, L, "slash_command_title"), null);
      }
    }
    if (h.length > 1) {
      let message = resumeHelpMessage({ resultType: "multipleMatches", arg: arg, count: h.length });
      return e(AddDirError, { message: message, args: arg, onDone: () => onDone(message) });
    }
  }
  let message = resumeHelpMessage({ resultType: "sessionNotFound", arg: arg });
  return e(AddDirError, { message: message, args: arg, onDone: () => onDone(message) });
};
