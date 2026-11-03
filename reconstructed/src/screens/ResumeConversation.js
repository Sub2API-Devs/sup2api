/**
 * screens/ResumeConversation.tsx
 *
 * /resume 屏幕：加载会话列表、按 PR/分支筛选、选中后恢复会话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/screens/ResumeConversation.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-jde8wnzx.js (13)
 * attribution: callgraph-fingerprint 1, sole-consumer 8, file-local 3, layout 1, fingerprint 1
 */
import { dirname } from "path";
import { j, y, Q, R, P, ce } from "../../vendor/react/cjs/react.production.js";
import { gracefulShutdown } from "../utils/gracefulShutdown.js";
import { xo } from "../bootstrap/sessionSlices.js";
import { Me } from "../components/design-system/ThemeProvider.js";
import { useSession } from "../context/session.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { unr } from "../services/cloudSessions/cloudSessionsPolicy.js";
import { useAppState, useSetAppState, useSessionHooksRegistry, Cr } from "../state/AppState.js";
import { y$n } from "../components/FullscreenUpsellTrial.js";
import {
  isCustomTitleEnabled,
  loadSameRepoMessageLogsProgressive,
  enrichLogs,
  loadAllProjectsMessageLogsProgressive,
  getSessionIdFromLog,
  pinSessionId,
  resetSessionFilePointer,
  adoptForkSessionMetadata,
  recordContentReplacement,
  saveMode,
  restoreSessionMetadata,
  buildForkAdoptionMeta,
  applyEndedByModelOnResume,
  adoptResumedSessionFileAsync,
  adoptResumedSessionFile,
} from "../utils/sessionStorage.js";
import { env } from "../utils/env.js";
import { useTerminalTitle, useTimeout } from "../ink/hooks/useTerminalHooks.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { logError, getLogDisplayTitle } from "../utils/log.js";
import { sortLogs } from "../types/logs.js";
import { checkCrossProjectResume, $Tr } from "../utils/crossProjectResume.js";
import { setClipboard } from "../ink/termio/osc.js";
import { findBackgroundSessionHolder, xHt, formatHandoffOutcome } from "../utils/sessionAttach.js";
import { liveBackgroundJobId, attachToBackgroundSession } from "../commands/resume/openLiveBackground.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import {
  errorMessage,
  withTelemetryMessage,
  toError,
  sanitizedErrorNameForTelemetry,
} from "../utils/errors.js";
import { loadConversationForResume } from "../utils/conversationRecovery.js";
import { precomputeResumeHooks } from "../services/compact/precomputedCompact.js";
import { MNt, ewo, two, LTe } from "../utils/sessionModelPin.js";
import { logEvent } from "../services/analytics/index.js";
import { createSystemMessage } from "../utils/messages.js";
import { p9n, ResumeRefusedError } from "../utils/transcript/deserialize.js";
import {
  reloadAgentDefinitionsForModeSwitch,
  recordResumeSource,
  loadAgentDefinitionsForSessionCwd,
  restoreAgentFromSession,
  neutralizeForkFallbackBanners,
  rearmRefusalFallbackHeaderFromTranscript,
  restoreModelFromSession,
  installRestoredModel,
  appendSlackTagResumeRecords,
  preparePlanModeRestoreOnInteractiveResume,
  computeStandaloneAgentContext,
  pushRestoredMemoryPauseNotice,
  Igt,
  restoreWorktreeForResume,
  worktreeResumeNotice,
} from "../utils/sessionRestore.js";
import { resetObserverPairings } from "../services/agentObserver/agentObserver.js";
import { resolveResumeSessionAdoption } from "../utils/background/adopt.js";
import { getSessionId, switchSession } from "../bootstrap/state.js";
import { renameRecordingForSession } from "../utils/asciicast.js";
import { isAgentSwarmsEnabled } from "../utils/agentSwarmsEnabled.js";
import { setCostStateForRestore } from "../cost-tracker.js";
import { kA } from "../services/policyLimits/coldStartWaiter.js";
import { zE } from "../utils/model/modelSwitchHooks.js";
import { reclaimSessionNameOnResume } from "../utils/sessionNameUniqueness.js";
import { getEndedByModel } from "../tasks/endedByModel.js";
import { restoreGoalFromTranscript } from "../commands/goal/restoreGoal.js";
import { loe } from "../utils/lastResumeRecord.js";
import { switchToConversationTab } from "../hooks/useWorkspaceDiff.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { REPL } from "./REPL.js";
import { applyAgentModelOverride } from "../utils/model/modelOverrideNotices.js";
import { WorkerBadge } from "../components/permissions/WorkerBadge.js";
import { LogSelector } from "../components/LogSelector.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import { useSelection } from "../ink/components/Input.js";
import { useCopyOnSelect, useSelectionBgColor } from "../hooks/useCopyOnSelect.js";
import {
  useSelectionClearKeybinding,
  shouldClearSelectionOnKey,
} from "../components/ScrollKeybindingHandler.js";
import { usePreDispatchKeyHandler } from "../keybindings/useActionHandlers.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { isMouseTrackingEnabled } from "../utils/fullscreen.js";
import { AlternateScreen } from "../ink/components/AlternateScreen.js";
import { Text, Box } from "../ink/components/Text.js";
import { isSafeIdSegment } from "../utils/agentId.js";
import { shellQuoteArgs } from "../utils/bash/bashPipeCommand.js";
import { useNotifications } from "../context/notifications.js";
import { VKe, openArtifactRow } from "../components/artifacts/artifactFrames.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";

//@ chunk-jde8wnzx.js:27371-27375 sole-consumer
j();
//@ chunk-jde8wnzx.js:27407-27427 sole-consumer
function Wo() {
  gracefulShutdown(1);
}
//@ chunk-jde8wnzx.js:27427-27479 sole-consumer
function qo() {
  gracefulShutdown(1, "other", { suppressResumeHint: !0 });
}
//@ chunk-jde8wnzx.js:27479-27509 file-local
function Uo() {
  process.exit(0);
}
//@ chunk-jde8wnzx.js:27509-27539 file-local
function $o() {
  process.exit(0);
}
//@ chunk-jde8wnzx.js:27539-27581 layout
function zo(Fe) {
  return xo(Fe).originalCwd;
}
//@ chunk-jde8wnzx.js:27581-27790 file-local
function parsePrIdentifier(value) {
  let directNumber = parseInt(value, 10);
  if (!isNaN(directNumber) && directNumber > 0) return directNumber;
  let urlMatch = value.match(
    /(?:https?:\/\/)?[^/\s]+\/[^\s]+?\/(?:pull|pull-requests|-\/merge_requests)\/(\d+)/,
  );
  if (urlMatch?.[1]) return parseInt(urlMatch[1], 10);
  return null;
}
//@ chunk-jde8wnzx.js:27790-35725 fingerprint = ResumeConversation (0.539)
function ResumeConversation({
  commands: commands,
  worktreePaths: worktreePaths,
  initialTools: initialTools,
  mcpClients: mcpClients,
  dynamicMcpConfig: dynamicMcpConfig,
  debug: debug,
  mainThreadAgentDefinition: mainThreadAgentDefinition,
  autoConnectIdeFlag: autoConnectIdeFlag,
  strictMcpConfig: strictMcpConfig = !1,
  systemPrompt: systemPrompt,
  appendSystemPrompt: appendSystemPrompt,
  systemPromptSnapshot: systemPromptSnapshot,
  initialSearchQuery: initialSearchQuery,
  disableSlashCommands: disableSlashCommands = !1,
  forkSession: forkSession,
  permissionModeSuppliedOnInvocation: permissionModeSuppliedOnInvocation,
  startsInCloudByDefault: startsInCloudByDefault,
  filterByPr: filterByPr,
  thinkingConfig: thinkingConfig,
  thinkingConfigExplicit: thinkingConfigExplicit,
  thinkingDisplayFlag: thinkingDisplayFlag,
  fallbackModel: fallbackModel,
  onTurnComplete: onTurnComplete,
  onCaptureSnapshot: onCaptureSnapshot,
}) {
  let { storageV5: storageV5, credentials: credentials } = Me(),
    q = useSession(),
    id = useSession((t) => t.id),
    { rows: rows } = useTerminalSize(),
    [io] = y(() => startsInCloudByDefault && !unr()),
    ao = Q(() => {
      return;
    }, [io]),
    agentDefinitions = useAppState((t) => t.agentDefinitions),
    standaloneAgentContext = useAppState((t) => t.standaloneAgentContext),
    mainLoopModel = useAppState((t) => t.mainLoopModel),
    xe = useAppState((t) => t.initialMessage !== null),
    setAppState = useSetAppState(),
    mo = useSessionHooksRegistry();
  y$n();
  let [Pe, ue] = y([]),
    [Ne, ge] = y(!0),
    [uo, fo] = y(!1),
    Ee = R(!1),
    [He, Be] = y(null),
    [fe, po] = y(!1),
    [x, go] = y(null),
    [te, Oe] = y(null),
    [Ge, ho] = y(null),
    [We, So] = y(null),
    U = R(null),
    [Ro, Co] = y(0),
    he = R(0),
    Se = R(0),
    qe = Q(() => {
      let result = Pe.filter((k) => !k.isSidechain);
      if (filterByPr !== void 0) {
        if (filterByPr === !0) result = result.filter((l_0) => l_0.prNumber !== void 0);
        else if (typeof filterByPr === "number") result = result.filter((l_1) => l_1.prNumber === filterByPr);
        else if (typeof filterByPr === "string") {
          let prNumber = parsePrIdentifier(filterByPr);
          if (prNumber !== null) result = result.filter((l_2) => l_2.prNumber === prNumber);
        }
      }
      return result;
    }, [Pe, filterByPr]),
    isResumeWithRenameEnabled = isCustomTitleEnabled(),
    bo = Q(() => env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE, []);
  (useTerminalTitle(x || bo ? null : "claude \xB7 resume"),
    P(() => {
      loadSameRepoMessageLogsProgressive(worktreePaths, void 0, void 0, storageV5)
        .then((result_0) => {
          ((U.current = result_0),
            (he.current = result_0.logs.length),
            ue(result_0.logs),
            ge(!1),
            logFeatureOk("screen_resume_conversation"));
        })
        .catch((error) => {
          (logFeatureBad("screen_resume_conversation", "resume_conversation_load_failed"),
            logError(error),
            ge(!1));
        });
    }, [worktreePaths, storageV5]));
  let ve = R(!1),
    Ue = ce(
      (count) => {
        if (ve.current) return;
        let ref = U.current;
        if (!ref || ref.nextIndex >= ref.allStatLogs.length) return;
        ve.current = !0;
        let E = !1;
        enrichLogs(ref.allStatLogs, ref.nextIndex, count, storageV5)
          .then((result_1) => {
            if (U.current !== ref) return;
            if (((ref.nextIndex = result_1.nextIndex), result_1.logs.length > 0)) {
              let offset = he.current;
              (sortLogs(result_1.logs).forEach((log, A) => {
                log.value = offset + A;
              }),
                ue((prev) => prev.concat(result_1.logs)),
                (he.current += result_1.logs.length));
            } else if (ref.nextIndex < ref.allStatLogs.length) E = !0;
          })
          .finally(() => {
            if (((ve.current = !1), E)) Ue(count);
          });
      },
      [storageV5],
    ),
    je = ce(
      (t) => {
        ge(!0);
        let k = ++Se.current,
          E = U.current;
        ((U.current = null),
          Co((L) => L + 1),
          (t
            ? loadAllProjectsMessageLogsProgressive(void 0, void 0, storageV5)
            : loadSameRepoMessageLogsProgressive(worktreePaths, void 0, void 0, storageV5)
          )
            .then((allProjects) => {
              if (Se.current !== k) return;
              ((U.current = allProjects), (he.current = allProjects.logs.length), ue(allProjects.logs));
            })
            .catch((result_2) => {
              if (Se.current !== k) return;
              if (E !== null) U.current = E;
              (ue((error_0) => error_0.slice()), logError(result_2));
            })
            .finally(() => {
              if (Se.current !== k) return;
              ge(!1);
            }));
      },
      [worktreePaths, storageV5],
    ),
    ko = ce(() => {
      let newValue = !fe;
      (po(newValue), je(newValue));
    }, [fe, je]);
  function onCancel() {
    process.exit(1);
  }
  async function onSelect(log_0) {
    if (Ee.current) return;
    ((Ee.current = !0), fo(!0));
    let resumeStart = performance.now();
    try {
      let o = await checkCrossProjectResume(log_0, fe, worktreePaths);
      if (o) {
        let raw = await setClipboard(o);
        if (raw) process.stdout.write(raw);
        ho(o);
        return;
      }
      if (!forkSession) {
        let A = getSessionIdFromLog(log_0),
          Re = A ? await findBackgroundSessionHolder(A, storageV5) : null;
        if (A && Re) {
          let ne = xe ? void 0 : liveBackgroundJobId(Re, { replacesProcess: !0 });
          if (ne !== void 0)
            try {
              await attachToBackgroundSession(ne, "picker", storageV5);
              return;
            } catch (error) {
              (logFeatureSad("resume_live_background_open", "open_failed", { entrypoint: lit("picker") }),
                Oe({
                  sessionId: A,
                  log: log_0,
                  jobId: ne,
                  handoff: { reason: "open_failed", detail: errorMessage(error), promptSent: !1 },
                }));
              return;
            }
          (logFeatureSad("resume_live_background_open", xe ? "launch_prompt_pending" : "not_openable", {
            entrypoint: lit("picker"),
          }),
            Oe({ sessionId: A, log: log_0, jobId: Re.jobId }));
          return;
        }
      }
    } catch (error) {
      (logError(withTelemetryMessage(toError(error), "resume picker: pre-load failed")),
        Be({ sessionId: getSessionIdFromLog(log_0) ?? void 0 }));
      return;
    }
    let E = !1,
      B = "load_error",
      L;
    try {
      let o = await loadConversationForResume(log_0, void 0, {
        forkSession: forkSession ?? !1,
        storageV5: storageV5,
        credentials: credentials,
        ...precomputeResumeHooks(q.precompute, storageV5, { forkSession: !!forkSession }),
        beforeUse: MNt("store"),
      });
      if (!o)
        throw (
          logEvent("tengu_session_resumed", {
            entrypoint: lit("picker"),
            success: !1,
            failure_reason: lit("not_found_picker"),
          }),
          (E = !0),
          Error("Failed to load conversation")
        );
      ((L = o.sessionStartHooks), (B = "processing_error"));
      let A = ewo({ ...o, source: "store" }, (u) => o.messages.push(createSystemMessage(u, "warning")));
      p9n(A);
      let matchSessionMode = require("./chunk-yxywkh50.js").matchSessionMode(o.mode);
      if (matchSessionMode) {
        let u = await reloadAgentDefinitionsForModeSwitch(xo(q).originalCwd, [], storageV5);
        (setAppState((V) => ({ ...V, agentDefinitions: u })),
          o.messages.push(createSystemMessage(matchSessionMode, "warning")));
      }
      resetObserverPairings(q);
      let { adoptedSessionId: adoptedSessionId, effectiveFork: effectiveFork } = resolveResumeSessionAdoption(
          o.sessionId,
          !!forkSession,
        ),
        $e = adoptedSessionId ? pinSessionId(adoptedSessionId) : pinSessionId(getSessionId());
      if (adoptedSessionId) {
        (switchSession(adoptedSessionId, "resume", log_0.fullPath ? dirname(log_0.fullPath) : null),
          await renameRecordingForSession(q, storageV5),
          await resetSessionFilePointer());
        let u = isAgentSwarmsEnabled()
          ? await (await import("./chunk-6cc2zqkz.js")).rekeySessionTeamAtStartup(storageV5)
          : void 0;
        if (u) setAppState((V) => ({ ...V, teamContext: u.teamContext, teammateColors: u.teammateColors }));
      } else if (effectiveFork) {
        if (
          (await adoptForkSessionMetadata(o, {
            stripWorktreeSession: !0,
            stripRelocatedCwd: !0,
            destSid: $e,
            storageV5: storageV5,
          }),
          o.contentReplacements?.length)
        )
          await recordContentReplacement(o.contentReplacements, void 0, storageV5);
      }
      (setCostStateForRestore(o),
        recordResumeSource({ sourceSessionId: o.sessionId, transcriptPath: log_0.fullPath }));
      let result_3 = await loadAgentDefinitionsForSessionCwd(log_0.projectPath, storageV5),
        { agentDefinition: agentDefinition } = restoreAgentFromSession(
          o.agentSetting,
          mainThreadAgentDefinition,
          agentDefinitions,
          {
            sessionAgentDefinitions: result_3,
            sessionCwd: log_0.projectPath,
            onResolveMiss: (u) => o.messages.push(createSystemMessage(u, "warning")),
          },
        );
      if (agentDefinition?.mcpServers?.length) await kA();
      if ((setAppState((u) => ({ ...u, agent: agentDefinition?.agentType })), effectiveFork))
        neutralizeForkFallbackBanners(o.messages);
      rearmRefusalFallbackHeaderFromTranscript(o.messages, effectiveFork);
      let ze = await restoreModelFromSession(
          o.messages,
          mainLoopModel,
          (u) => o.messages.push(createSystemMessage(u, "warning")),
          { storageV5: storageV5, credentials: credentials },
        ),
        Ce = ze ? installRestoredModel(o.messages, ze, effectiveFork, storageV5, credentials) : void 0;
      if (Ce)
        setAppState((u) => {
          if (u.mainLoopModel === Ce) return u;
          return (zE(q, u, Ce, "resume"), { ...u, mainLoopModel: Ce });
        });
      appendSlackTagResumeRecords(o.messages, { fork: effectiveFork, startup: !0 });
      let freshAgentDefs = await preparePlanModeRestoreOnInteractiveResume({
        storedPermissionMode: o.permissionMode,
        messages: o.messages,
        forkSession: effectiveFork,
        permissionModeSuppliedOnInvocation: permissionModeSuppliedOnInvocation,
        lane: "interactive_picker",
      });
      setAppState((prev_0) => {
        let V = freshAgentDefs(prev_0.toolPermissionContext);
        return V ? { ...prev_0, toolPermissionContext: V } : prev_0;
      });
      let { isCoordinatorMode: isCoordinatorMode } = require("./chunk-yxywkh50.js");
      (saveMode(isCoordinatorMode() ? "coordinator" : "normal"), two(A));
      let Qe = computeStandaloneAgentContext(o.agentName, o.agentColor),
        _e = standaloneAgentContext ? { ...Qe, ...standaloneAgentContext } : Qe;
      if (_e) setAppState((prev_1) => ({ ...prev_1, standaloneAgentContext: _e }));
      if (
        (reclaimSessionNameOnResume(_e?.name, storageV5, {
          autoOnly: !o.customTitle && !standaloneAgentContext?.name,
        }),
        restoreSessionMetadata(
          effectiveFork ? buildForkAdoptionMeta(o, { stripWorktreeSession: !0, stripRelocatedCwd: !0 }) : o,
          { taintSid: $e, storageV5: storageV5 },
        ),
        LTe(A.declined === !0),
        pushRestoredMemoryPauseNotice(o.messages),
        applyEndedByModelOnResume(getEndedByModel(o), setAppState),
        restoreGoalFromTranscript(o.messages, setAppState, mo),
        Igt(q.host),
        !effectiveFork && o.bridgeSessionId)
      )
        setAppState((prev_2) =>
          prev_2.replBridgeEnabled && !prev_2.replBridgeOutboundOnly
            ? prev_2
            : { ...prev_2, replBridgeEnabled: !0, replBridgeOutboundOnly: !1 },
        );
      if (!effectiveFork) {
        let u = restoreWorktreeForResume(loe.of(q.host), o.worktreeSession, void 0, { storageV5: storageV5 });
        if (u) o.messages.push(createSystemMessage(worktreeResumeNotice(u), "warning"));
        if ((switchToConversationTab(q.host, setAppState), adoptedSessionId))
          if (isStorageV5Enabled() && storageV5 !== void 0) await adoptResumedSessionFileAsync(storageV5);
          else adoptResumedSessionFile();
      }
      (logEvent("tengu_session_resumed", {
        entrypoint: lit("picker"),
        success: !0,
        resume_duration_ms: Math.round(performance.now() - resumeStart),
      }),
        ue([]),
        go({
          messages: o.messages,
          fileHistorySnapshots: o.fileHistorySnapshots,
          contentReplacements: o.contentReplacements,
          agentName: o.agentName,
          agentColor: o.agentColor === "default" ? void 0 : o.agentColor,
          mainThreadAgentDefinition: agentDefinition,
          pendingHookMessages: o.sessionStartHooks,
        }));
    } catch (error) {
      if (!E) {
        let A = B;
        logEvent("tengu_session_resumed", {
          entrypoint: lit("picker"),
          success: !1,
          failure_reason: fromEnum(A),
          error_name: sanitizedErrorNameForTelemetry(toError(error)),
        });
      }
      if (error instanceof ResumeRefusedError) {
        (L?.abort(), So(error.message));
        return;
      }
      (logError(withTelemetryMessage(toError(error), "resume picker: onSelect failed")),
        L?.abort(),
        Be({ sessionId: getSessionIdFromLog(log_0) ?? void 0 }));
    }
  }
  if (te)
    return e(BackgroundSessionResumeMessage, {
      sessionId: te.sessionId,
      title: getLogDisplayTitle(te.log),
      jobId: te.jobId,
      projectPath: te.log.projectPath,
      handoff: te.handoff,
    });
  if (Ge) return e(DifferentDirectoryResumeMessage, { command: Ge });
  if (We !== null) return e(ResumeExitMessage, { message: We });
  if (x)
    return e(REPL, {
      debug: debug,
      commands: commands,
      initialTools: initialTools,
      initialMessages: x.messages,
      pendingHookMessages: x.pendingHookMessages,
      initialFileHistorySnapshots: x.fileHistorySnapshots,
      initialContentReplacements: x.contentReplacements,
      initialAgentName: x.agentName,
      initialAgentColor: x.agentColor,
      mcpClients: mcpClients,
      dynamicMcpConfig: applyAgentModelOverride(dynamicMcpConfig ?? {}, x.mainThreadAgentDefinition, {
        strictMcpConfig: strictMcpConfig,
      }),
      strictMcpConfig: strictMcpConfig,
      systemPrompt: systemPrompt,
      appendSystemPrompt: appendSystemPrompt,
      systemPromptSnapshot: systemPromptSnapshot,
      mainThreadAgentDefinition: x.mainThreadAgentDefinition,
      autoConnectIdeFlag: autoConnectIdeFlag,
      disableSlashCommands: disableSlashCommands,
      thinkingConfig: thinkingConfig,
      thinkingConfigExplicit: thinkingConfigExplicit,
      thinkingDisplayFlag: thinkingDisplayFlag,
      fallbackModel: fallbackModel,
      onTurnComplete: onTurnComplete,
      onCaptureSnapshot: onCaptureSnapshot,
    });
  if (Ne && (Pe.length === 0 || qe.length === 0))
    return e(FullscreenSelectionScreen, {
      children: e(WorkerBadge, { message: "Loading conversations\u2026" }),
    });
  if (He) return e(ResumeFailedMessage, { sessionId: He.sessionId });
  if (uo)
    return e(FullscreenSelectionScreen, {
      children: e(WorkerBadge, { message: "Resuming conversation\u2026" }),
    });
  return e(FullscreenSelectionScreen, {
    children: e(LogSelector, {
      logs: qe,
      currentSessionId: id,
      maxHeight: rows,
      onCancel: onCancel,
      onSelect: onSelect,
      onLogsChanged: isResumeWithRenameEnabled ? () => je(fe) : void 0,
      onLoadMore: Ue,
      initialSearchQuery: initialSearchQuery,
      isLoading: Ne,
      reloadGeneration: Ro,
      showAllProjects: fe,
      onToggleAllProjects: ko,
      footerNote: ao,
    }),
  });
}
/**
 * 全屏模式下的选择处理外壳：Ctrl/Cmd+C 复制或清除选区，其他按键按需清除选区，并用备用屏幕承载子元素。
 */
//@ chunk-jde8wnzx.js:35725-36280 sole-consumer
function FullscreenSelectionScreen(props) {
  let $ = w(8),
    { children: children } = props,
    isFullscreen = useIsFullscreen(),
    selection = useSelection(),
    copyOnSelect = useCopyOnSelect(selection, isFullscreen);
  (useSelectionBgColor(selection), useSelectionClearKeybinding(selection, isFullscreen));
  let onKey;
  if ($[0] !== copyOnSelect || $[1] !== selection)
    ((onKey = (input, key) => {
      if (!selection.hasSelection()) {
        return;
      }
      if (input === "c" && !key.meta && (key.ctrl || key.super)) {
        if (copyOnSelect.peek() !== null) selection.clearSelection();
        else selection.copySelection();
        return !0;
      }
      if (shouldClearSelectionOnKey(key)) selection.clearSelection();
    }),
      ($[0] = copyOnSelect),
      ($[1] = selection),
      ($[2] = onKey));
  else onKey = $[2];
  let keyOptions;
  if ($[3] !== isFullscreen)
    ((keyOptions = { isActive: isFullscreen }), ($[3] = isFullscreen), ($[4] = keyOptions));
  else keyOptions = $[4];
  if ((usePreDispatchKeyHandler(onKey, keyOptions), !isFullscreen)) {
    return children;
  }
  let mouseTracking;
  if ($[5] === MEMO_CACHE_SENTINEL) ((mouseTracking = isMouseTrackingEnabled()), ($[5] = mouseTracking));
  else mouseTracking = $[5];
  let screen;
  if ($[6] !== children)
    ((screen = e(AlternateScreen, { mouseTracking: mouseTracking, children: children })),
      ($[6] = children),
      ($[7] = screen));
  else screen = $[7];
  return screen;
}
/**
 * 恢复会话失败的提示：给出重试或新建会话的命令，稍后退出。
 */
//@ chunk-jde8wnzx.js:36280-36721 sole-consumer
function ResumeFailedMessage(H) {
  let h = w(4),
    { sessionId: sessionId } = H,
    p;
  if (h[0] === MEMO_CACHE_SENTINEL) ((p = []), (h[0] = p));
  else p = h[0];
  useTimeout(Wo, 100, p);
  let T;
  if (h[1] === MEMO_CACHE_SENTINEL)
    ((T = e(Text, { children: "Failed to resume the conversation." })), (h[1] = T));
  else T = h[1];
  const v = isSafeIdSegment(sessionId)
    ? `Run claude --resume ${sessionId} to retry, or claude to start a new session.`
    : "Run claude to start a new session.";
  let I;
  if (h[2] !== v)
    ((I = r(Box, { flexDirection: "column", gap: 1, children: [T, e(Text, { dimColor: !0, children: v })] })),
      (h[2] = v),
      (h[3] = I));
  else I = h[3];
  return I;
}
//@ chunk-jde8wnzx.js:36721-36885 sole-consumer
function ResumeExitMessage(H) {
  let h = w(3),
    { message: message } = H,
    p;
  if (h[0] === MEMO_CACHE_SENTINEL) ((p = []), (h[0] = p));
  else p = h[0];
  useTimeout(qo, 100, p);
  let T;
  if (h[1] !== message) ((T = e(Text, { children: message })), (h[1] = message), (h[2] = T));
  else T = h[2];
  return T;
}
/**
 * 会话来自其他目录时的提示：显示恢复命令并说明已复制到剪贴板，稍后退出。
 */
//@ chunk-jde8wnzx.js:36885-37475 sole-consumer
function DifferentDirectoryResumeMessage(props) {
  let $ = w(8),
    { command: command } = props,
    deps;
  if ($[0] === MEMO_CACHE_SENTINEL) ((deps = []), ($[0] = deps));
  else deps = $[0];
  useTimeout(Uo, 100, deps);
  let heading;
  if ($[1] === MEMO_CACHE_SENTINEL)
    ((heading = e(Text, { children: "This conversation is from a different directory." })), ($[1] = heading));
  else heading = $[1];
  let hint;
  if ($[2] === MEMO_CACHE_SENTINEL) ((hint = e(Text, { children: "To resume, run:" })), ($[2] = hint));
  else hint = $[2];
  let commandBox;
  if ($[3] !== command)
    ((commandBox = r(Box, {
      flexDirection: "column",
      children: [hint, r(Text, { children: [" ", command] })],
    })),
      ($[3] = command),
      ($[4] = commandBox));
  else commandBox = $[4];
  let copiedNote;
  if ($[5] === MEMO_CACHE_SENTINEL)
    ((copiedNote = e(Text, { dimColor: !0, children: "(Command copied to clipboard)" })),
      ($[5] = copiedNote));
  else copiedNote = $[5];
  let content;
  if ($[6] !== commandBox)
    ((content = r(Box, { flexDirection: "column", gap: 1, children: [heading, commandBox, copiedNote] })),
      ($[6] = commandBox),
      ($[7] = content));
  else content = $[7];
  return content;
}
/**
 * 会话正在后台运行时的提示：给出 attach/stop 命令或用 claude agents 查找，并给出 --fork-session 分叉命令。
 */
//@ chunk-jde8wnzx.js:37475-39038 sole-consumer
function BackgroundSessionResumeMessage(props) {
  let $ = w(29),
    { sessionId: sessionId, title: title, jobId: jobId, projectPath: projectPath, handoff: handoff } = props,
    deps;
  if ($[0] === MEMO_CACHE_SENTINEL) ((deps = []), ($[0] = deps));
  else deps = $[0];
  useTimeout($o, 100, deps);
  let cwd = useSession(zo),
    cdPrefixMemo;
  if ($[1] !== cwd || $[2] !== projectPath)
    ((cdPrefixMemo =
      projectPath && projectPath !== cwd ? `cd ${shellQuoteArgs([projectPath])} ${$Tr()} ` : ""),
      ($[1] = cwd),
      ($[2] = projectPath),
      ($[3] = cdPrefixMemo));
  else cdPrefixMemo = $[3];
  let cdPrefix = cdPrefixMemo,
    sessionArg = isSafeIdSegment(sessionId) ? ` ${sessionId}` : "",
    titleText;
  if ($[4] !== title) ((titleText = xHt(title)), ($[4] = title), ($[5] = titleText));
  else titleText = $[5];
  const jobSuffix = jobId ? ` (${jobId})` : "";
  let handoffNote;
  if ($[6] !== handoff)
    ((handoffNote = formatHandoffOutcome(handoff)), ($[6] = handoff), ($[7] = handoffNote));
  else handoffNote = $[7];
  let runningLine;
  if ($[8] !== titleText || $[9] !== jobSuffix || $[10] !== handoffNote)
    ((runningLine = r(Text, {
      children: [titleText, " is running in the background", jobSuffix, ".", handoffNote],
    })),
      ($[8] = titleText),
      ($[9] = jobSuffix),
      ($[10] = handoffNote),
      ($[11] = runningLine));
  else runningLine = $[11];
  let attachHint;
  if ($[12] !== jobId)
    ((attachHint = jobId
      ? r(Text, {
          children: [
            "Run ",
            r(Text, { bold: !0, children: ["claude attach ", jobId] }),
            " to open it, or",
            " ",
            r(Text, { bold: !0, children: ["claude stop ", jobId] }),
            " first to resume it here.",
          ],
        })
      : null),
      ($[12] = jobId),
      ($[13] = attachHint));
  else attachHint = $[13];
  let forkIntro;
  if ($[14] !== jobId)
    ((forkIntro = jobId
      ? e(Text, { children: "To branch off a copy instead, run:" })
      : r(Text, {
          children: [
            "Run ",
            e(Text, { bold: !0, children: "claude agents" }),
            " to find its id and attach to it, or run:",
          ],
        })),
      ($[14] = jobId),
      ($[15] = forkIntro));
  else forkIntro = $[15];
  let forkCommand;
  if ($[16] !== cdPrefix || $[17] !== sessionArg)
    ((forkCommand = r(Text, { children: [" ", cdPrefix, "claude --resume", sessionArg, " --fork-session"] })),
      ($[16] = cdPrefix),
      ($[17] = sessionArg),
      ($[18] = forkCommand));
  else forkCommand = $[18];
  let forkBox;
  if ($[19] !== forkIntro || $[20] !== forkCommand)
    ((forkBox = r(Box, { flexDirection: "column", children: [forkIntro, forkCommand] })),
      ($[19] = forkIntro),
      ($[20] = forkCommand),
      ($[21] = forkBox));
  else forkBox = $[21];
  let forkNote;
  if ($[22] !== jobId)
    ((forkNote = jobId ? null : e(Text, { dimColor: !0, children: "to branch off a copy." })),
      ($[22] = jobId),
      ($[23] = forkNote));
  else forkNote = $[23];
  let content;
  if ($[24] !== forkBox || $[25] !== forkNote || $[26] !== runningLine || $[27] !== attachHint)
    ((content = r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [runningLine, attachHint, forkBox, forkNote],
    })),
      ($[24] = forkBox),
      ($[25] = forkNote),
      ($[26] = runningLine),
      ($[27] = attachHint),
      ($[28] = content));
  else content = $[28];
  return content;
}
//@ chunk-18hwfzwa.js:651055-651381 callgraph-fingerprint = NoConversationsMessage (0.241)
function NoConversationsMessage(h) {
  let $ = w(5),
    { cloudRowCheck: cloudRowCheck } = h,
    D = Cr(),
    L = useNotifications(),
    ke;
  if ($[0] !== cloudRowCheck || $[1] !== L || $[2] !== D)
    ((ke = () => {
      let Re = VKe(D.getState().frameUrls);
      if (!Re) {
        return !1;
      }
      openArtifactRow(Re, D, L, cloudRowCheck);
    }),
      ($[0] = cloudRowCheck),
      ($[1] = L),
      ($[2] = D),
      ($[3] = ke));
  else ke = $[3];
  let Be;
  if ($[4] === MEMO_CACHE_SENTINEL) ((Be = { context: "Global" }), ($[4] = Be));
  else Be = $[4];
  return (useKeybinding("app:openArtifact", ke, Be), null);
}

export { NoConversationsMessage };
