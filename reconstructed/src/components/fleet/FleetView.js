/**
 * components/fleet/FleetView.tsx
 *
 * 2.1.316 新增：Agents（fleet）视图主组件：管理会话名单、选择、编辑器、附加与派发；Agents 视图的键盘处理：导航、打开、派发、重命名、分组、删除、搜索、vim 模式等等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-93kwxas0.js (17)
 * attribution: placement 17
 */
import { isDeepStrictEqual } from "util";
import { basename, basename as basename_2, basename as basename_3, resolve } from "path";
import { randomUUID, randomUUID as randomUUID_2, randomUUID as randomUUID_3 } from "crypto";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import {
  SIMPLE_PINNED,
  Sn,
  prependModeCharacterToInput,
  Ws,
  buildFleetRows,
  getJobTitle,
} from "./FleetRow.js";
import {
  jobSortKey,
  gs,
  jn,
  remoteRowIdOf,
  cd,
  ensureFleetRoster,
  ws,
  Ss,
  bs,
  CloudListFailureNotice,
  cc,
  oc,
  jobTempo,
  emitFinishedJobs,
  hc,
  Qu,
  reportFatalAndExit,
  nc,
  resolveDispatchPermissionMode,
} from "./fleetRows.js";
import {
  clearFleetOfferState,
  useIdeMcpClients,
  buildJobActions,
  openEarlierSession,
  attachToJob,
  openNewSession,
  logFleetJobAction,
  Ap,
  offerJobRestart,
} from "./fleetActions.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import {
  setDispatchWindowValue,
  STILL_STARTING_MESSAGE,
  parseNewSessionPrefix,
  isPasteImageKey,
  pasteImageFromClipboard,
  Xc,
  Rs,
  vs,
  listPastSessions,
  modelSuggestions,
  Od,
  Os,
  findMentionedTemplate,
  mergeSuggestionsByName,
  relaunchAgentsView,
  CLAUDE_AGENTS_AUTO_RELAUNCHED_AT,
  Hc,
  ks,
  buildDispatchSuggestions,
  Id,
  zc,
  pruneReplyDrafts,
  backfillAgentLastUsed,
  SUGGESTION_KIND_LABELS,
  mentionRanges,
  newSessionPrefixRanges,
  composePolicyLimitsForFleet,
  safeRespawnBgSession,
} from "./fleetSessions.js";
import {
  xE,
  resolveFleetKeyAction,
  jumpGroupHeader,
  nextFocusableRow,
  resolveExitAction,
  Ia,
  FE,
  shortcutDisplayFor,
  stopOrDeleteJob,
  stopGroup,
  ensureFleetViewStore,
  Um,
  Dl,
  DispatchModeLine,
  submitRename,
  submitGroupEdit,
  FleetSearchInput,
  FleetBody,
  FleetFooter,
} from "./FleetViewInput.js";
import { keyEventToKeystroke } from "../../keybindings/match.js";
import { clearAttachBeacon, startAttachBeacon } from "../../daemon/jobs/attachBeacon.js";
import { saveGlobalConfig, getGlobalConfig } from "../../utils/config.js";
import { editPromptInEditor } from "../../utils/promptEditor.js";
import {
  writeJobPinned,
  UNGROUPED,
  EARLIER,
  IDLE_NEEDS,
  jobMatchesCwd,
  spawnOrigin,
  isReservedGroupName,
  isLoopJob,
  isLocalDaemonAgent,
  terminalOutcome,
  isSelfDriving,
  listJobs,
  isExecLaunch,
} from "../../services/daemon/jobState.js";
import { logError } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { Dr, getFirstLine } from "../../utils/stringUtils.js";
import { submitDispatch, Bs, handlePasteIntoDispatch } from "./fleetDispatch.js";
import { logEvent } from "../../services/analytics/index.js";
import { nmt, Y$n, yAr } from "../../cli/bg/bgSpare.js";
import { isBashModeChar } from "../PromptInput/inputModes.js";
import { Text, Box } from "../../ink/components/Text.js";
import { createSignal } from "../../utils/signal.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { findGitRoot, listUserAgentTemplates, pxs } from "../../cli/bg/bgSpawnEnv.js";
import { listRepoWorktrees } from "../../utils/worktree.js";
import { getCommands, isSkillOff, getHumanFacingDescription } from "../../commands.js";
import { j, R, P, y, Q, ce, Uy, zt, Se } from "../../../vendor/react/cjs/react.production.js";
import { truncateWithEllipsis } from "../../services/sessionStatus/sessionStateClassifier.js";
import { useTerminalNotification } from "../../ink/useTerminalNotification.js";
import { Me, useStdin } from "../design-system/ThemeProvider.js";
import { gB } from "../../utils/terminalProbe.js";
import { markAgentsNotified, rs } from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { ye } from "../../utils/startupMarks.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { Bo, useDispatchWindowDefaults, FleetRowList, FleetComposer } from "./FleetList.js";
import { isAgentsSimpleViewEnabled } from "../../utils/fleetGates.js";
import { useTimeout, useTerminalTitle, createRoot } from "../../ink/hooks/useTerminalHooks.js";
import { createFleetViewHost, useAttachFleetOwners } from "./useAttachFleetOwners.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { getCwd } from "../../utils/cwd.js";
import { canonicalizePath } from "../../utils/sessionStoragePortable.js";
import { getRealPathOptions } from "../../utils/sessionStorage.js";
import { uniq, count } from "../../utils/collections.js";
import { useDoublePress } from "../../keybindings/useActionHandlers.js";
import { useTerminalFocus } from "../../ink/hooks/use-terminal-focus.js";
import { useAppState, useAppState_2 } from "../../state/AppState.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useFocusOnMount } from "../../hooks/useFocusOnMount.js";
import {
  useVoiceAvailable,
  useVoiceIntegration,
  useVoiceKeybindingHandler,
} from "../../hooks/useVoiceIntegration.js";
import { useGetVoiceState } from "../../context/voice.js";
import { useSearchInput } from "../../hooks/useSearchInput.js";
import { formatAtMention } from "../../hooks/useIdeAtMentioned.js";
import { cacheImagePath } from "../../utils/imageStore.js";
import { isReducedMotion } from "../Spinner/spinnerFlags.js";
import {
  useInterval,
  useDebouncedCallback,
  useSelection,
  useInputClock,
} from "../../ink/components/Input.js";
import { getLastInteractionTime, getRootSession, resetInteractionBaseline } from "../../bootstrap/state.js";
import { $6s } from "./sessionAttention.js";
import { isCrossSessionMessagingEnabled } from "../../utils/crossSessionMessagingGate.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useNotifications } from "../../context/notifications.js";
import {
  buildCopiedNotification,
  modalPagerAction,
  useSelectionClearKeybinding,
} from "../ScrollKeybindingHandler.js";
import { useCopyOnSelect, useSelectionBgColor } from "../../hooks/useCopyOnSelect.js";
import { di, enterAltScreenSequence, exitAltScreenSequence } from "../../ink/terminal.js";
import { openClickedLink } from "../../utils/browser.js";
import { getAuthTokenSource } from "../../utils/auth.js";
import { env } from "../../utils/env.js";
import { usePasteHandler } from "../../hooks/usePasteHandler.js";
import { PasteEvent } from "../../ink/frame.js";
import { kp } from "../../../vendor/convert-to-spaces/dist/index.js";
import { PromptInputFooterSuggestions } from "../PromptInput/PromptInputFooterSuggestions.js";
import { getTerminalSize } from "../../ink/ink.js";
import { eraseViewportInPlace, getEraseScreenSequence } from "../../ink/clearTerminal.js";
import { initBuiltinPlugins } from "../../plugins/builtinPlugins.js";
import { initBundledSkills } from "../../skills/bundled/index.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import {
  hasTeammateModeSnapshot,
  captureTeammateModeSnapshot,
} from "../../utils/swarm/backends/teammateModeSnapshot.js";
import { xo } from "../../bootstrap/sessionSlices.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { openDaemonLease } from "../../services/daemon/controlClient.js";
import { showScreen } from "../../utils/runSteps.js";
import { j6s } from "../../utils/remoteSessionCommands.js";
import { tgo } from "../SearchBox.js";
import { setRawModeSafe } from "../../ink/setRawModeSafe.js";
import { shouldUseFullscreenByDefault } from "../../utils/fullscreen.js";
import { takeNotificationLatency, checkDispatchDefaultsChanged } from "./dispatchDefaults.js";
import { readJobDraft, sweepJobDrafts } from "../../daemon/jobs/draftSweep.js";
import { parseSwitchTarget } from "../../daemon/attach/attachJob.js";
import { or } from "../../utils/settings/commandSyncNames.js";
import { FleetViewScreen } from "../../screens/FleetView/FleetViewScreen.js";
import { AppRoot } from "../AppRoot.js";
import { setJitPolicyAfterStartup } from "../../utils/jitPolicy.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { getPlatform } from "../../utils/platform.js";
import { onExit } from "../../../vendor/signal-exit/dist/mjs/index.js";
import { Qtn } from "../PromptInput/Notifications.js";
import { osc, OSC } from "../../ink/termio/osc.js";
import { attachJob } from "../../daemon/jobs/killJob.js";
import { isTerminalShutdown, heldUntilExit } from "../../utils/terminalShutdown.js";
import { getBaseRenderOptions } from "../../utils/renderOptions.js";

//@ chunk-93kwxas0.js:5808-5932 placement
function fleetAttachFields(h, E, k) {
  return {
    attach_kind: !E ? lit("no_origin") : h === E ? lit("origin_return") : lit("other"),
    is_first_attach_of_visit: k === 0,
  };
}
/**
 * 在同组内上下移动当前会话（固定排序）。
 */
//@ chunk-93kwxas0.js:163196-164309 placement
function reorderFocusedJob(h, E) {
  let { roster: roster, selection: selection, editor: editor } = h.submit,
    { rows: rows, pendings: pendings, byGroup: byGroup, byState: byState, simpleView: simpleView } = h,
    setError = editor.setError;
  if (selection.reorderIssued) return;
  let focusedIdx = selection.getSnapshot().focusedIdx,
    X = rows[focusedIdx];
  if (X?.kind !== "job") return;
  let K = focusedIdx + E;
  while (rows[K]?.kind === "earlier") K += E;
  let W = rows[K];
  if (W?.kind !== "job" || X.group !== W.group) return;
  let job = X.job,
    job_2 = W.job;
  if (pendings.some((Oe) => Oe.id === job.id || Oe.id === job_2.id)) return;
  if (job.state.backend !== "daemon" || job_2.state.backend !== "daemon") return;
  setError(null);
  let ge = X.group === "pinned" || X.group === SIMPLE_PINNED;
  if ((byGroup || simpleView) && !ge) return;
  let se = byState && !ge,
    ne = se ? (Oe) => jobSortKey(Oe, X.group) : gs,
    ae = ne(job.state),
    me = ne(job_2.state),
    Je = new Map();
  if (ae === me) {
    let Oe = new Set(pendings.map((Re) => Re.id)),
      De = 0;
    for (let Re of rows)
      if (Re.kind === "job" && Re.group === X.group && !Oe.has(Re.job.id)) Je.set(Re.job.id, De++);
    let we = Je.get(job.id);
    (Je.set(job.id, Je.get(job_2.id)), Je.set(job_2.id, we));
  } else (Je.set(job.id, me), Je.set(job_2.id, ae));
  (selection.beginReorder(job.id, K), roster.bumpGen());
  let le = se ? "stateSortOrder" : "sortOrder";
  (roster.updateJobs((Oe) =>
    Oe
      ? jn(
          Oe.map((De) => {
            let we = Je.get(De.id);
            return we === void 0 ? De : { ...De, state: { ...De.state, [le]: we } };
          }),
        )
      : Oe,
  ),
    selection.queueOrderWrites(Je, se ? "state" : "directory"));
}
/**
 * Agents 视图的键盘处理：导航、打开、派发、重命名、分组、删除、搜索、vim 模式等。
 */
//@ chunk-93kwxas0.js:164309-177025 placement
function handleFleetKey(h, E) {
  let {
      editor: editor,
      roster: roster,
      selection: selection,
      view: view,
      attach: attach,
      storageV5: storageV5,
      onAction: onAction,
      exit: exit,
      searchKeyDown: searchKeyDown,
      vimMode: vimMode,
      dispatchInputActive: dispatchInputActive,
      templates: templates,
      suggestions: suggestions,
      pickSuggestion: pickSuggestion,
      applySuggestion: applySuggestion,
      jobSessionIds: jobSessionIds,
      focusedRow: focusedRow,
      focused: focused,
      openEarlier: openEarlier,
      openNewSessionRow: openNewSessionRow,
      openOrRespawn: openOrRespawn,
    } = h.submit,
    {
      deleteConfirm: deleteConfirm,
      rows: rows,
      focusedIdx: focusedIdx,
      altOpenOrigin: altOpenOrigin,
      byGroup: byGroup,
      hasComposedDispatch: hasComposedDispatch,
      headerJobs: headerJobs,
      groupSuggestions: groupSuggestions,
      previewOpen: previewOpen,
      helpOpen: helpOpen,
      debugOpen: debugOpen,
      groupEdit: groupEdit,
      renamingJobId: renamingJobId,
      attachingJobId: attachingJobId,
      showAllAgents: showAllAgents,
      jobs: jobs,
      pendings: pendings,
      keybindings: keybindings,
      simpleView: simpleView,
      groupsEnabled: groupsEnabled,
      hasCredentials: hasCredentials,
      termRows: termRows,
      canGoBack: canGoBack,
      originJobId: originJobId,
      originSpawn: originSpawn,
      renameKeyDown: renameKeyDown,
      groupKeyDown: groupKeyDown,
      setQuery: setQuery,
      enterInsertMode: enterInsertMode,
      setRenameDraft: setRenameDraft,
      setGroupDraft: setGroupDraft,
      readGroupDraft: readGroupDraft,
      pressExitKey: pressExitKey,
      switchTab: switchTab,
      clearRename: clearRename,
      clearGroupEdit: clearGroupEdit,
      headerArmId: headerArmId,
      ck: ck,
      setShowAllAgents: setShowAllAgents,
      setSelectedSuggestion: setSelectedSuggestion,
      setHoveredSuggestionId: setHoveredSuggestionId,
      attachPastedImage: attachPastedImage,
    } = h,
    rt = (Ce) => editor.setMode(Ce),
    { setError: setError, setHint: setHint } = editor,
    St = () => clearFleetOfferState(attach, editor);
  if (E.key !== " ") view.cancelPeekTap();
  if (simpleView && deleteConfirm.pending !== null && !(E.ctrl && E.key === "x") && E.name !== "escape")
    deleteConfirm.disarm();
  let Ne = () => {
    (E.preventDefault(), E.stopImmediatePropagation());
  };
  if (renamingJobId !== null || view.getSnapshot().renaming !== null) {
    if ((Ne(), E.ctrl && E.key === "c")) {
      clearRename();
      return;
    }
    if (E.name === "up" || E.name === "down") return;
    renameKeyDown(E);
    return;
  }
  if (groupEdit !== null) {
    if ((Ne(), E.ctrl && E.key === "c")) {
      clearGroupEdit();
      return;
    }
    if (view.getSnapshot().groupPristine) {
      if (
        E.name === "backspace" ||
        E.name === "delete" ||
        (E.ctrl && (E.key === "u" || E.key === "w" || E.key === "k"))
      ) {
        (setGroupDraft(""), view.setGroupPristine(!1));
        return;
      }
      switch (E.name) {
        case "return":
        case "escape":
        case "up":
        case "down":
        case "tab":
          break;
        case "left":
        case "right":
        case "home":
        case "end":
        case "pageup":
        case "pagedown":
        case "insert":
        case "wheelup":
        case "wheeldown":
          view.setGroupPristine(!1);
          return;
        default:
          if (E.name.startsWith("f") && /^f\d+$/.test(E.name)) return;
          if (!E.ctrl && !E.meta) {
            (setGroupDraft(""), view.setGroupPristine(!1), groupKeyDown(E));
            return;
          }
          return;
      }
    }
    if (groupEdit.kind === "rename") {
      if (E.name === "up" || E.name === "down") return;
      groupKeyDown(E);
      return;
    }
    let Ce = groupSuggestions,
      trimmed = readGroupDraft().trim(),
      at = trimmed === "" || trimmed === groupEdit.cur,
      groupPickIdx = view.getSnapshot().groupPickIdx;
    if (E.name === "down") {
      if (Ce.length > 0 && !at) view.setGroupPickIdx(Math.min(groupPickIdx + 1, Ce.length - 1));
      return;
    }
    if (E.name === "up") {
      view.setGroupPickIdx(Math.max(groupPickIdx - 1, -1));
      return;
    }
    if (E.name === "left" && groupPickIdx >= 0) {
      view.setGroupPickIdx(-1);
      return;
    }
    if (E.name === "tab") {
      if (at) return;
      let so = Ce[Math.max(groupPickIdx, 0)];
      if (so !== void 0) (setGroupDraft(so), view.setGroupPickIdx(-1));
      return;
    }
    if (E.name !== "return") view.setGroupPickIdx(-1);
    groupKeyDown(E);
    return;
  }
  let resumePicker = view.getSnapshot().resumePicker;
  if (resumePicker !== null) {
    if ((Ne(), (E.ctrl && E.key === "c") || E.name === "escape" || E.meta)) {
      view.closeResumePicker();
      return;
    }
    let entries = resumePicker.entries,
      Ke = entries?.length ?? 0,
      resumePickerIdx = view.getSnapshot().resumePickerIdx;
    if (E.name === "down" || (E.ctrl && E.key === "n")) {
      view.setResumePickerIdx(Math.min(resumePickerIdx + 1, Math.max(0, Ke - 1)));
      return;
    }
    if (E.name === "up" || (E.ctrl && E.key === "p")) {
      view.setResumePickerIdx(Math.max(resumePickerIdx - 1, 0));
      return;
    }
    if (E.name === "return") {
      let Mt = entries?.[resumePickerIdx];
      if (Mt !== void 0) {
        let so = roster.isDeleting(Mt.sessionId.slice(0, 8)) || roster.isDeletingSession(Mt.sessionId);
        if (jobSessionIds.has(Mt.sessionId) || so) {
          (logFeatureSad("fleet_view_resume_picker", so ? "deleting_in_flight" : "already_in_list"),
            view.refuseResumePick(Date.now()),
            setError(
              so
                ? "This session is being deleted \u2014 reopen /resume once it finishes"
                : "This session is already in the list \u2014 press enter on its row",
            ));
          return;
        }
        ((view.resumePromoteSessionId = Mt.sessionId),
          view.closeResumePicker(),
          openEarlier(Mt, "resume_picker"));
      }
      return;
    }
    return;
  }
  let settingPicker = view.getSnapshot().settingPicker;
  if (settingPicker !== null) {
    if ((Ne(), (E.ctrl && E.key === "c") || E.name === "escape" || E.meta)) {
      view.closeSettingPicker();
      return;
    }
    let settingPickerIdx = view.getSnapshot().settingPickerIdx;
    if (E.name === "down" || (E.ctrl && E.key === "n")) {
      view.setSettingPickerIdx(Math.min(settingPickerIdx + 1, settingPicker.options.length - 1));
      return;
    }
    if (E.name === "up" || (E.ctrl && E.key === "p")) {
      view.setSettingPickerIdx(Math.max(settingPickerIdx - 1, 0));
      return;
    }
    if (E.name === "return") {
      let Ke = settingPicker.options[settingPickerIdx];
      if ((view.closeSettingPicker(), Ke !== void 0))
        setDispatchWindowValue(
          editor,
          h.submit.dispatchDefaults,
          settingPicker.setting,
          Ke.value,
          view.getSnapshot().activeTab === "remote",
        );
    }
    return;
  }
  if (view.resumePickerRefusedAt !== 0) {
    let Ce = Date.now() - view.resumePickerRefusedAt;
    if (Ce >= 0 && Ce < xE && E.name === "return") {
      Ne();
      return;
    }
    view.clearResumePickerRefusal();
  }
  let resumePromoteSessionId = view.resumePromoteSessionId;
  if (
    resumePromoteSessionId !== null &&
    attachingJobId === null &&
    attach.isPromoting(resumePromoteSessionId)
  ) {
    if ((Ne(), (E.ctrl && E.key === "c") || E.name === "escape")) view.resumePromoteSessionId = null;
    return;
  }
  if (((view.resumePromoteSessionId = null), attach.getSnapshot().newSessionOpening)) {
    if ((Ne(), (E.ctrl && E.key === "c") || E.name === "escape")) attach.abandonNewSession();
    return;
  }
  let At = resolveFleetKeyAction(keyEventToKeystroke(E), keybindings);
  if (attachingJobId !== null) {
    if ((Ne(), (E.ctrl && E.key === "c") || E.name === "escape")) {
      attach.abandonRespawnAttempt();
      let disarm = attach.disarm();
      if (disarm !== null) clearAttachBeacon(disarm, storageV5).catch(() => {});
      attach.dropWarming(attachingJobId);
      return;
    }
    if (!E.shift && (E.name === "up" || E.name === "down" || (E.ctrl && (E.key === "p" || E.key === "n")))) {
      if (
        suggestions.length > 0 ||
        ((E.name === "up" || E.name === "down") &&
          !previewOpen &&
          editor.getSnapshot().query.includes(`
`)) ||
        (jumpGroupHeader(h, At, focusedIdx) ??
          nextFocusableRow(h, focusedIdx, E.name === "down" || E.key === "n" ? 1 : -1)) === focusedIdx
      )
        return;
      attach.abandonRespawnAttempt();
      let disarm = attach.disarm();
      if (disarm !== null) clearAttachBeacon(disarm, storageV5).catch(() => {});
    } else return;
  }
  if (E.ctrl && E.key === "c") {
    if ((Ne(), helpOpen || debugOpen)) {
      (view.setHelpOpen(!1), view.setDebugOpen(!1));
      return;
    }
    if (editor.getSnapshot().query) setQuery("");
    if (editor.getSnapshot().mode === "bash") rt("prompt");
    pressExitKey("Ctrl-C");
    return;
  }
  if (E.name === "escape") {
    if ((Ne(), previewOpen)) view.setPreviewOpen(!1);
    else if (helpOpen) view.setHelpOpen(!1);
    else if (debugOpen) view.setDebugOpen(!1);
    else if (showAllAgents) setShowAllAgents(!1);
    else if (
      vimMode !== void 0 &&
      dispatchInputActive &&
      (vimMode !== "NORMAL" || editor.getSnapshot().query !== "")
    ) {
      if (deleteConfirm.pending) deleteConfirm.dismiss();
      searchKeyDown(E);
    } else if (editor.getSnapshot().query) setQuery("");
    else if (editor.getSnapshot().mode === "bash") rt("prompt");
    else if (deleteConfirm.pending) deleteConfirm.dismiss();
    else
      switch (
        resolveExitAction({
          originJobId: originJobId,
          originRowPresent: originJobId !== void 0 && (jobs?.some((Ke) => Ke.id === originJobId) ?? !1),
          originSpawn: originSpawn,
        }).kind
      ) {
        case "attach-origin":
          openOrRespawn(
            jobs?.find((Ke) => Ke.id === originJobId),
            "esc",
          );
          break;
        case "wait-starting":
          setError(STILL_STARTING_MESSAGE);
          break;
        case "exit-with-hint":
          if (originSpawn) originSpawn.resumeHintRequested = !0;
          exit();
          break;
        case "exit":
          exit();
          break;
      }
    return;
  }
  if (
    helpOpen &&
    E.key !== "?" &&
    E.name !== "up" &&
    E.name !== "down" &&
    !(E.ctrl && (E.key === "p" || E.key === "n"))
  )
    view.setHelpOpen(!1);
  if (E.shift && (E.name === "up" || E.name === "down") && suggestions.length === 0 && !previewOpen) {
    (Ne(), reorderFocusedJob(h, E.name === "up" ? -1 : 1));
    return;
  }
  if (At === "agents:switchView") {
    if ((Ne(), simpleView)) return;
    if (!selection.getSnapshot().draftPick)
      ((selection.followId = focused?.id ?? null), (selection.followOrigin = null));
    deleteConfirm.disarm();
    let Ce = groupsEnabled ? ["state", "directory", "group"] : ["state", "directory"],
      index = Ce.indexOf(view.getSnapshot().groupMode),
      at = Ce[(index + 1) % Ce.length];
    if (at === "group") logFeatureOk("fleet_view_group_mode");
    (view.setGroupMode(at),
      saveGlobalConfig(
        (Mt) => (Mt.fleetViewGroupMode === at ? Mt : { ...Mt, fleetViewGroupMode: at }),
        storageV5,
      ));
    return;
  }
  if (At === "chat:externalEditor" && !previewOpen && !simpleView) {
    Ne();
    let Ce = editPromptInEditor(editor.getSnapshot().query);
    if (Ce.content !== null && Ce.content !== editor.getSnapshot().query) setQuery(Ce.content);
    if (Ce.error) setError(Ce.error);
    return;
  }
  if (At === "agents:togglePin") {
    Ne();
    let Ce = rows[selection.getSnapshot().focusedIdx],
      Ke = Ce?.kind === "job" ? Ce.job : void 0;
    if (!Ke || pendings.some((no) => no.id === Ke.id)) return;
    let at = !1,
      Mt = at ? remoteRowIdOf(Ke) : void 0;
    if (at && Mt === void 0) {
      setError(STILL_STARTING_MESSAGE);
      return;
    }
    if (Ke.state.backend !== "daemon" && !at) {
      (setError("Can't pin a session that's running in another terminal"),
        logFeatureOk("fleet_view_pin_toggle"));
      return;
    }
    let id = Ke.id,
      vo = !(
        (at ? roster.getSnapshot().remoteJobs : roster.jobs)?.find((no) => no.id === id)?.state.pinned ??
        Ke.state.pinned
      );
    if (((selection.followId = id), vo)) selection.uncollapse(ck("pinned"));
    if (at && Mt !== void 0) {
      if (editor.getSnapshot().error === STILL_STARTING_MESSAGE) setError(null);
      roster
        .markRemoteRow(Mt, (no) => ({ ...no, pinned: vo ? !0 : void 0 }))
        .then((no) => {
          if (no) logFeatureOk("fleet_view_pin_toggle");
          else Ia(setError, "fleet_view_pin_toggle");
        });
      return;
    }
    (roster.bumpGen(),
      roster.updateJobs(
        (no) => no?.map((_e) => (_e.id === id ? { ..._e, state: { ..._e.state, pinned: vo } } : _e)) ?? no,
      ));
    let holdJob = roster.holdJob(id);
    writeJobPinned(id, vo, storageV5)
      .then(() => {
        logFeatureOk("fleet_view_pin_toggle");
      })
      .catch((no) => {
        (logError(no),
          setError(`Couldn't ${vo ? "pin" : "unpin"} \u2014 ${errorMessage(no)}`),
          logFeatureBad("fleet_view_pin_toggle", "pin_write_failed"),
          roster.reload());
      })
      .finally(holdJob);
    return;
  }
  let pt =
    At === "agents:find" && !previewOpen && !simpleView && editor.getSnapshot().mode === "prompt"
      ? parseNewSessionPrefix(editor.getSnapshot().query)
      : null;
  if (pt !== null) {
    Ne();
    let { query: query, cursorOffset: cursorOffset } = editor.getSnapshot(),
      trimStart = query.trimStart(),
      max = Math.max(0, cursorOffset - (query.length - trimStart.length));
    if (
      (editor.setQueryAndCursor(
        pt,
        vimMode === void 0 ? Math.max(0, max + pt.length - trimStart.length) : pt.length,
      ),
      enterInsertMode(),
      pt.length > trimStart.length && view.firstImpression("find"))
    )
      logFeatureOk("fleet_view_find");
    return;
  }
  let focusedIdx_2 = selection.getSnapshot().focusedIdx,
    oo = jumpGroupHeader(h, At, focusedIdx_2);
  if (oo !== null) {
    if ((Ne(), setError(null), deleteConfirm.disarm(), oo !== focusedIdx_2)) {
      if ((selection.jumpToHeader(oo, rows[oo]), view.firstImpression("groupJump")))
        logFeatureOk("fleet_view_group_jump");
    }
    return;
  }
  if (At === "agents:rename") {
    if (
      (Ne(),
      byGroup &&
        focusedRow?.kind === "header" &&
        focusedRow.group !== UNGROUPED &&
        focusedRow.group !== "pinned" &&
        focusedRow.group !== EARLIER)
    ) {
      (setGroupDraft(focusedRow.group),
        St(),
        view.openGroupEdit({ kind: "rename", from: focusedRow.group }, !0));
      return;
    }
    if (!focused || pendings.some((at) => at.id === focused.id)) return;
    let Ce = !1;
    if (Ce && !cd(focused.id)) {
      setError(STILL_STARTING_MESSAGE);
      return;
    }
    if (Ce && roster.isRetitling(focused.id)) {
      setError(FE);
      return;
    }
    if (!Ce && focused.state.backend !== "daemon" && !focused.state.sock) return;
    let Ke = Dr(focused.state.name ?? "");
    if (Ce && editor.getSnapshot().error === STILL_STARTING_MESSAGE) setError(null);
    (setRenameDraft(Ke),
      St(),
      view.startRename(
        focused.id,
        focused.state.backend !== "daemon" ? (focused.state.sock ?? null) : null,
        Ce ? { sessionId: focused.state.sessionId, prefill: Ke } : null,
      ));
    return;
  }
  if (groupsEnabled && At === "agents:setGroup" && !previewOpen && editor.getSnapshot().query === "") {
    let at = !!focused && (pendings.some((Mt) => Mt.id === focused.id) || !1);
    if (!focused || at || (focused.state.backend !== "daemon" && !0)) {
      Ne();
      let Mt = shortcutDisplayFor("agents:rename", keybindings);
      setError(
        !focused
          ? focusedRow?.kind === "header"
            ? `${shortcutDisplayFor("agents:setGroup", keybindings)} groups a session \u2014 focus a session row${Mt && ` (${Mt} renames this group)`}`
            : null
          : at
            ? STILL_STARTING_MESSAGE
            : "Can't group a session that's running in another terminal",
      );
      return;
    }
    (Ne(),
      setGroupDraft(focused.state.group ?? ""),
      St(),
      view.openGroupEdit(
        { kind: "assign", jobId: focused.id, cur: focused.state.group },
        !!focused.state.group,
      ));
    return;
  }
  if (E.name === "up" || (E.ctrl && E.key === "p")) {
    if ((Ne(), suggestions.length > 0)) {
      (setHoveredSuggestionId(null), setSelectedSuggestion((Ke) => Math.max(0, Ke - 1)));
      return;
    }
    if (
      E.name === "up" &&
      !previewOpen &&
      editor.getSnapshot().query.includes(`
`)
    ) {
      searchKeyDown(E);
      return;
    }
    setError(null);
    let Ce = nextFocusableRow(h, selection.getSnapshot().focusedIdx, -1);
    selection.navigateTo(Ce, rows[Ce]);
    return;
  }
  if (
    (E.name === "home" || E.name === "end" || E.name === "pageup" || E.name === "pagedown") &&
    suggestions.length === 0 &&
    !hasComposedDispatch
  ) {
    (Ne(), setError(null));
    let max = Math.max(1, termRows - 6),
      Ke = rows.length;
    if (Ke === 0) {
      (selection.setHoverFocusIdx(null), selection.focus(0));
      return;
    }
    let focusedIdx = selection.getSnapshot().focusedIdx,
      Mt =
        E.name === "home"
          ? 0
          : E.name === "end"
            ? Ke - 1
            : E.name === "pageup"
              ? focusedIdx - max
              : focusedIdx + max,
      max_2 = Math.max(0, Math.min(Ke - 1, Mt));
    selection.navigateTo(max_2, rows[max_2]);
    return;
  }
  if (E.name === "down" || (E.ctrl && E.key === "n")) {
    if ((Ne(), suggestions.length > 0)) {
      (setHoveredSuggestionId(null), setSelectedSuggestion((Ke) => Math.min(suggestions.length - 1, Ke + 1)));
      return;
    }
    if (
      E.name === "down" &&
      !previewOpen &&
      editor.getSnapshot().query.includes(`
`)
    ) {
      searchKeyDown(E);
      return;
    }
    setError(null);
    let Ce = nextFocusableRow(h, selection.getSnapshot().focusedIdx, 1);
    selection.navigateTo(Ce, rows[Ce]);
    return;
  }
  if (previewOpen && E.ctrl && E.key === "x") {
    if ((Ne(), focused && pendings.some((at) => at.id === focused.id))) return;
    let Ce = rows[selection.getSnapshot().focusedIdx],
      Ke = Ce?.kind === "job" ? Ce.job : void 0;
    if (deleteConfirm.pending !== null && Ke !== void 0 && deleteConfirm.pending.id !== Ke.id)
      deleteConfirm.disarm();
    stopOrDeleteJob(h, "x", Ke);
    return;
  }
  if (previewOpen) return;
  if (E.name === "tab") {
    if ((Ne(), simpleView)) return;
    if (!editor.getSnapshot().query && editor.getSnapshot().mode === "prompt" && templates.length > 0)
      setShowAllAgents((Ce) => !Ce);
    else if (suggestions.length > 0) applySuggestion(pickSuggestion());
    return;
  }
  if (
    E.name === "right" &&
    !E.shift &&
    !editor.getSnapshot().query &&
    editor.getSnapshot().mode === "prompt" &&
    !previewOpen
  ) {
    if ((Ne(), focusedRow?.kind === "earlier")) openEarlier(focusedRow.entry, "section");
    else if (focusedRow?.kind === "newsession") openNewSessionRow(focusedRow.origin);
    else openOrRespawn(focused);
    return;
  }
  if ((E.meta || E.superKey) && E.key >= "1" && E.key <= "9") {
    Ne();
    let Ce = Number(E.key),
      found = rows.find((at) => at.kind === "job" && at.origin === altOpenOrigin && --Ce === 0);
    if (found?.kind === "job") openOrRespawn(found.job);
    return;
  }
  if (E.name === "return") {
    submitDispatch(h.submit, E);
    return;
  }
  if (E.ctrl && E.key === "x") {
    if ((Ne(), suggestions.length > 0)) return;
    if (!hasComposedDispatch && byGroup && focusedRow?.kind === "header") {
      if (focusedRow.group === "pinned" || focusedRow.group === UNGROUPED || focusedRow.group === EARLIER) {
        setError(
          `${focusedRow.group === "pinned" ? "Pinned" : focusedRow.group === UNGROUPED ? "Ungrouped" : "Past"} is reserved \u2014 can't ungroup`,
        );
        return;
      }
      if (
        ((selection.followOrigin = focusedRow.group),
        (selection.followId = null),
        deleteConfirm.pending?.id !== headerArmId(focusedRow.group))
      ) {
        deleteConfirm.arm(headerArmId(focusedRow.group));
        return;
      }
      (deleteConfirm.disarm(), stopGroup(h, focusedRow.group));
      return;
    }
    if (!hasComposedDispatch && focusedRow?.kind === "header" && headerJobs.length > 0) {
      if (
        ((selection.followOrigin = focusedRow.group),
        (selection.followId = null),
        deleteConfirm.pending?.id !== headerArmId(focusedRow.group))
      ) {
        deleteConfirm.arm(headerArmId(focusedRow.group));
        return;
      }
      deleteConfirm.disarm();
      for (let at of headerJobs) {
        if (pendings.some((Mt) => Mt.id === at.id)) continue;
        stopOrDeleteJob(h, "x", at, !0);
      }
      return;
    }
    if (focused && pendings.some((at) => at.id === focused.id)) return;
    let Ce = rows[selection.getSnapshot().focusedIdx],
      Ke = Ce?.kind === "job" ? Ce.job : void 0;
    if (deleteConfirm.pending !== null && Ke !== void 0 && deleteConfirm.pending.id !== Ke.id)
      deleteConfirm.disarm();
    stopOrDeleteJob(h, "x", Ke);
    return;
  }
  if (E.ctrl && E.key === "d" && (simpleView || editor.getSnapshot().query === "")) {
    if ((Ne(), helpOpen || view.getSnapshot().debugOpen)) {
      view.setDebugOpen(!1);
      return;
    }
    let snapshot = editor.getSnapshot();
    if (snapshot.mode === "bash" && snapshot.query === "") rt("prompt");
    pressExitKey("Ctrl-D");
    return;
  }
  if (
    (E.ctrl && E.key,
    E.key === "?" && editor.getSnapshot().query === "" && editor.getSnapshot().mode === "prompt")
  ) {
    Ne();
    let helpOpen = view.getSnapshot().helpOpen;
    if (!helpOpen) St();
    (view.setHelpOpen(!helpOpen), logEvent("tengu_bg_agent_action", { action: lit("help_toggled") }));
    return;
  }
  if (isPasteImageKey(E) && !simpleView) {
    (Ne(),
      pasteImageFromClipboard(
        (Ce) => attachPastedImage(Ce.base64, { mediaType: Ce.mediaType, dimensions: Ce.dimensions }),
        setHint,
      ));
    return;
  }
  if (
    nmt() &&
    !simpleView &&
    isBashModeChar(E.key) &&
    !editor.getSnapshot().query &&
    editor.getSnapshot().mode === "prompt"
  ) {
    (Ne(), rt("bash"));
    return;
  }
  if (E.name === "backspace" && !editor.getSnapshot().query && editor.getSnapshot().mode === "bash") {
    (Ne(), rt("prompt"));
    return;
  }
  if (simpleView && !previewOpen && renamingJobId === null) {
    if (E.key === "q" && !E.ctrl && !E.meta) (Ne(), pressExitKey("Ctrl-C"));
    if (E.key === "l" && !E.ctrl && !E.meta && !hasCredentials) (Ne(), onAction({ type: "login" }));
    return;
  }
  searchKeyDown(E);
}
//@ chunk-93kwxas0.js:177067-177083 placement
var tu = {},
  ou = {};
/**
 * 派发建议数据存储（模板、技能、routine、子仓库、worktree）。
 */
//@ chunk-93kwxas0.js:177083-178405 placement
class FleetCatalogStore {
  #n = createSignal();
  #e = {
    templates: new Map(),
    skills: new Map(),
    routines: new Map(),
    childRepos: new Map(),
    repoWorktrees: new Map(),
  };
  #l = new Set();
  getSnapshot = () => this.#e;
  subscribe = (h) => this.#n.subscribe(h);
  #t(h) {
    ((this.#e = { ...this.#e, ...h }), this.#n.emit());
  }
  loadLauncher(h) {
    this.#r(h, { rescanKnown: !1 });
  }
  refreshLauncher(h) {
    this.#r(h, { rescanKnown: !0 });
  }
  #r(h, { rescanKnown: E }) {
    if (this.#l.has(h)) return;
    let k = [];
    if (E || !this.#e.childRepos.has(h))
      k.push(
        findGitRoot(h).then((C) => {
          let x = updateCatalogEntry(this.#e.childRepos, h, C, tu);
          if (x) this.#t({ childRepos: x });
        }),
      );
    if (E || !this.#e.repoWorktrees.has(h))
      k.push(
        listRepoWorktrees(h)
          .then((C) => {
            if (C === null) return;
            let x = updateCatalogEntry(this.#e.repoWorktrees, h, C, ou);
            if (x) this.#t({ repoWorktrees: x });
          })
          .catch(() => {}),
      );
    if (k.length === 0) return;
    (this.#l.add(h),
      Promise.all(k).finally(() => {
        this.#l.delete(h);
      }));
  }
  loadTarget(h, E) {
    let k = !1;
    if (!this.#e.templates.has(h))
      listUserAgentTemplates(h, E)
        .catch(() => [])
        .then((C) => {
          if (!k && !this.#e.templates.has(h)) this.#t({ templates: new Map(this.#e.templates).set(h, C) });
        });
    if (!this.#e.skills.has(h))
      getCommands(h, E)
        .catch(() => [])
        .then((C) => {
          if (k || this.#e.skills.has(h)) return;
          let mapped = C.filter((T) => !T.isHidden && !isSkillOff(T)).map((T) => ({
            kind: T.type !== "prompt" ? "command" : T.kind === "workflow" ? "workflow" : "skill",
            name: T.name,
            aliases: T.aliases,
            description:
              (T.type !== "prompt" && Xc.get(T.name)) || getFirstLine(getHumanFacingDescription(T) ?? ""),
          }));
          this.#t({ skills: new Map(this.#e.skills).set(h, mapped) });
        });
    return () => {
      k = !0;
    };
  }
}
//@ chunk-93kwxas0.js:178405-178444 placement
function ng(h) {
  return (h.scope ??= new FleetCatalogStore());
}
/**
 * 目录项变化时返回新 Map，否则 null。
 */
//@ chunk-93kwxas0.js:178444-178556 placement
function updateCatalogEntry(h, E, k, C) {
  let x = Object.keys(k).length > 0 ? k : C;
  if (isDeepStrictEqual(h.get(E), x)) return null;
  return new Map(h).set(E, x);
}
//@ chunk-93kwxas0.js:178556-178560 placement
j();
//@ chunk-93kwxas0.js:178560-178586 placement
var DE = 120,
  IDLE_SEED = "idle-seed";
/**
 * 比较会话所在分区的变化，生成"需要输入/已完成"通知。
 */
//@ chunk-93kwxas0.js:178586-179308 placement
function diffJobBands(h, E) {
  let k = new Map(),
    C = [],
    x = [];
  for (let T of E) {
    let A = h.get(T.id),
      L = T.band === "blocked" && T.needs === IDLE_NEEDS;
    if ((k.set(T.id, L ? (A ?? IDLE_SEED) : T.band), A === void 0 || A === T.band || L)) continue;
    switch (T.band) {
      case "blocked":
        (C.push({
          message: T.needs
            ? `${T.label} needs your input: ${truncateWithEllipsis(T.needs, DE)}`
            : `${T.label} needs your input`,
          notificationType: "agent_needs_input",
        }),
          x.push({ sessionId: T.sessionId, kind: "needs_input" }));
        break;
      case "completed":
        if (T.outcome !== "stopped" && !T.selfDriving && !(A === IDLE_SEED && T.outcome === "success"))
          (C.push({
            message: `${T.label} ${T.outcome === "failure" ? "failed" : "finished"}`,
            notificationType: "agent_completed",
          }),
            x.push({ sessionId: T.sessionId, kind: "completed" }));
        break;
      case "active":
        break;
    }
  }
  return { next: k, notifications: C, notified: x };
}
/**
 * 会话分区变化时发通知的 hook。
 */
//@ chunk-93kwxas0.js:179308-179650 placement
function useJobBandNotifications(h, E) {
  let k = useTerminalNotification(),
    { storageV5: storageV5, credentials: credentials } = Me(),
    T = R(new Map());
  P(() => {
    let { next: A, notifications: notifications, notified: notified } = diffJobBands(T.current, h);
    T.current = A;
    for (let U of notifications) gB(U, k, { storageV5: storageV5, credentials: credentials });
    let now = Date.now();
    for (let U of notified)
      if (markAgentsNotified(E, U.sessionId, U.kind, now))
        logEvent("tengu_bg_agent_notification", { kind: fromEnum(U.kind), jobSessionId: ye(U.sessionId) });
  });
}
//@ chunk-93kwxas0.js:179650-179660 placement
var BE = [];
/**
 * Agents（fleet）视图主组件：管理会话名单、选择、编辑器、附加与派发。
 */
//@ chunk-93kwxas0.js:179660-199227 placement
function FleetView({
  onAction: onAction,
  initialJobId: initialJobId,
  originJobId: originJobId,
  originSpawn: originSpawn,
  cwdFilter: cwdFilter,
  dispatchDefaults: dispatchDefaults,
  typedAgent: typedAgent,
  canGoBack: canGoBack,
  autoOpenJobId: autoOpenJobId,
  entryChannel: entryChannel,
  relaunchTab: relaunchTab,
  typedAhead: typedAhead,
  fromLauncher: fromLauncher,
  awayLoop: awayLoop,
  host: host,
  storageV5: storageV5,
}) {
  let oe = useClock(),
    { stdin: stdin, isRawModeSupported: isRawModeSupported } = useStdin(),
    { credentials: credentials } = Me(),
    ae = Bo(),
    me = isAgentsSimpleViewEnabled(),
    Je = !me || !!initialJobId?.startsWith("remote-"),
    le = !1;
  useTimeout(
    () => {
      if (!isRawModeSupported) return;
      let listenerCount = stdin.listenerCount("readable");
      if (listenerCount > 1) logEvent("tengu_fleetview_stdin_contention", { listeners: listenerCount });
    },
    1500,
    [],
  );
  let [Oe] = y(() => awayLoop ?? rs()),
    [De] = y(() => host ?? createFleetViewHost()),
    [we] = y(() => ensureFleetRoster(De, storageV5)),
    {
      jobs: jobs,
      adoptedPeers: adoptedPeers,
      remoteJobs: remoteJobs,
      remoteListLoaded: remoteListLoaded,
      remoteListFailure: remoteListFailure,
      remoteListHasOlder: remoteListHasOlder,
      pendings: pendings,
      prStatuses: prStatuses,
      loopKicks: loopKicks,
      overlaidLoadLanded: overlaidLoadLanded,
    } = useStoreSelector(we),
    [ke] = y(() => ws(De, we, storageV5)),
    {
      focusedIdx: focusedIdx,
      hoverFocusIdx: hoverFocusIdx,
      collapsed: collapsed,
      capExpanded: capExpanded,
      draftPick: draftPick,
      followOrigin: followOrigin,
    } = useStoreSelector(ke),
    Ot = !1,
    Yt = R(!1),
    [Ue] = y(() => ensureFleetViewStore(De, Ot, "local")),
    {
      groupMode: groupMode,
      activeTab: activeTab,
      groupEdit: groupEdit,
      resumePicker: resumePicker,
      settingPicker: settingPicker,
      renaming: renaming,
      previewOpen: previewOpen,
      helpOpen: helpOpen,
      debugOpen: debugOpen,
    } = useStoreSelector(Ue),
    [$e] = y(() => Ss(De)),
    { attachingJobId: attachingJobId, autoOpened: autoOpened } = useStoreSelector($e),
    [We] = y(() => Rs(De)),
    { mode: mode, expandHintPasteId: expandHintPasteId } = useStoreSelector(We),
    [He] = y(() => Um(De, { onArm: () => clearFleetOfferState($e, We) })),
    { pending: pending } = useStoreSelector(He);
  useTimeout(() => He.disarm(), pending ? 2000 : null, [pending]);
  let [vt] = y(() => ({
      roster: we,
      selection: ke,
      view: Ue,
      attach: $e,
      editor: We,
      deleteConfirm: He,
      earlier: De.earlier,
    })),
    { setError: setError, setHint: setHint } = We,
    Xe = renaming?.jobId ?? null,
    St = Je ? remoteJobs : BE;
  (P(() => {
    we.setRemoteWanted(Je);
  }, [we, Je]),
    P(() => we.attachView(oe), [we, oe]));
  let Ne = getCwd(),
    uo = bs({ cwd: Ne }),
    [Kt, po] = y(Ne);
  P(() => {
    let ee = !1;
    return (
      canonicalizePath(Ne, getRealPathOptions(storageV5)).then((Ve) => {
        if (!ee && Ve !== Ne) po(Ve);
      }),
      () => {
        ee = !0;
      }
    );
  }, [Ne, storageV5]);
  let At = cwdFilter && !jobMatchesCwd({ cwd: Kt }, cwdFilter) ? cwdFilter : Kt,
    [pt, Nt] = y(Ne),
    oo = activeTab === "remote" ? At : pt,
    [Ce] = y(() => ng(De)),
    {
      templates: templates,
      skills: skills,
      routines: routines,
      childRepos: childRepos,
      repoWorktrees: repoWorktrees,
    } = useStoreSelector(Ce);
  P(() => {
    Ce.loadLauncher(Ne);
  }, [Ce, Ne]);
  let vo = childRepos.get(Ne) ?? tu,
    zo = repoWorktrees.get(Ne) ?? ou,
    joined = uniq([...(jobs ?? []), ...adoptedPeers].map((ee) => spawnOrigin(ee.state)))
      .sort()
      .join("\x00"),
    { allRepos: allRepos, worktreeBranches: worktreeBranches } = Q(() => {
      let ee = { ...vo };
      for (let et of joined ? joined.split("\x00") : []) {
        let Xt = basename_2(et);
        if (Xt && !/\s/.test(Xt) && ee[Xt] === void 0) ee[Xt] = et;
      }
      let Ve = {};
      for (let [et, Xt] of Object.entries(zo)) {
        if (ee[et] === void 0) ee[et] = Xt.path;
        if (ee[et] === Xt.path) Ve[et] = Xt.branch;
      }
      return { allRepos: ee, worktreeBranches: Ve };
    }, [vo, joined, zo]),
    go = () => onAction({ type: "done" }),
    No = R("Ctrl-C"),
    Qo = useDoublePress((ee) => {
      if (ee) Cn();
      Ue.setExitPending(ee ? No.current : null);
    }, go),
    Po = (ee) => {
      ((No.current = ee), Qo());
    },
    xe = () => {
      (Ue.clearRename(), setQuery_2(""));
    },
    qt = (ee, Ve) => Sn(Ve ?? Ue.getSnapshot().groupMode, ee),
    it = (ee) => `header:${Ue.getSnapshot().groupMode}:${ee}`,
    io = useStoreSelector(De.earlier, (ee) => ee.entries);
  P(() => {
    if (cwdFilter || !vs()) {
      if (!cwdFilter) De.earlier.clear();
      return;
    }
    let ee = !1,
      beginLoad = De.earlier.beginLoad();
    return (
      listPastSessions(new Set(), !1, storageV5)
        .finally(() => {
          De.earlier.endLoad(beginLoad);
        })
        .then((et) => {
          if (et === null) logFeatureBad("fleet_view_earlier_load", "load_failed");
          else logFeatureOk("fleet_view_earlier_load");
          if (!ee && (et === null || et.length === 0) && !initialJobId && ke.restoreAttempts === 1)
            ke.restoreAttempts = 2;
          if (et === null) return;
          if ((De.earlier.setEntries(et), !ee && et.length > 0))
            logEvent("tengu_fleetview_earlier_loaded", { count: et.length });
        }),
      () => {
        ee = !0;
      }
    );
  }, []);
  let bo = (ee) => ke.toggleCollapsed(qt(ee), Ue.getSnapshot().groupMode === "state" ? ee : null),
    wo = useTerminalFocus();
  P(() => {
    if (wo) we.resetPrFetchGate();
  }, [we, wo]);
  let Ho = useAppState((ee) => ee.autoUpdaterResult?.status === "success"),
    { columns: columns, rows: rows } = useTerminalSize(),
    { pathOwnRow: pathOwnRow } = useDispatchWindowDefaults(We, dispatchDefaults),
    [kn] = y(() => Date.now()),
    Qr = R(null),
    Xr = R(null);
  useFocusOnMount(Xr, jobs !== null && !previewOpen);
  let qi = useVoiceAvailable(),
    vn = useAppState((ee) => ee.settings.voice?.mode ?? "hold"),
    Zr = useGetVoiceState(),
    un = () => {
      let focusedRow = ke.focusedRow(),
        Ve = focusedRow?.kind === "job" ? focusedRow.job : void 0;
      if (!Ve) return;
      ui(!1);
      let previewOpen = Ue.getSnapshot().previewOpen;
      if (!previewOpen) ((ke.followId = Ve.id), Cn());
      Ue.setPreviewOpen(!previewOpen);
    },
    Nn =
      !me &&
      !previewOpen &&
      Xe === null &&
      groupEdit === null &&
      attachingJobId === null &&
      resumePicker === null &&
      settingPicker === null,
    {
      query: query,
      queryRef: queryRef,
      setQuery: setQuery,
      willInsertNewline: willInsertNewline,
      setCursorOffset: setCursorOffset,
      handleKeyDown: handleKeyDown,
      handlePaste: handlePaste,
      vimMode: vimMode,
      enterInsertMode: enterInsertMode,
    } = useSearchInput({
      buffer: We,
      isActive: Nn,
      multiline: !0,
      honorEditorMode: !0,
      onExit: () => {},
      onCancel: jobs === null ? () => Po("Ctrl-C") : void 0,
      onSpaceOnEmpty: () => {
        if (We.getSnapshot().mode === "bash") return;
        if (qi && vn !== "tap")
          Ue.schedulePeekTap(
            (ee) => oe.setTimeout(ee, Dl),
            () => {
              let ee = Zr();
              if (ee.voiceState !== "idle" || ee.voiceWarmingUp) return;
              if (queryRef.current.trim() !== "") return;
              un();
            },
          );
        else un();
      },
    });
  useIdeMcpClients((ee) => {
    let { query: query, cursorOffset: cursorOffset } = We.getSnapshot();
    We.insertText(formatAtMention(ee, query[cursorOffset - 1]));
  });
  let So = cacheImagePath(() => We.pastes, handlePaste, { onMinted: We.noteMintedPaste });
  (P(() => {
    We.pruneOrphanedPastes();
  }, [We, query]),
    useTimeout(() => We.setExpandHintPasteId(null), expandHintPasteId === null ? null : 8000, [
      expandHintPasteId,
    ]));
  let [zi] = y(() => ({
      get value() {
        return We.getSnapshot().query;
      },
      get cursorOffset() {
        return We.getSnapshot().cursorOffset;
      },
      setValueWithCursor: (ee, Ve) => We.setQueryAndCursor(ee, Ve),
    })),
    pn = useVoiceIntegration({ composer: zi, isActive: Nn }),
    jo = useAppState_2((ee) => ee.voiceState);
  P(() => {
    if (jo !== "idle") Ue.cancelPeekTap();
  }, [Ue, jo]);
  let { handleKeyDown: handleKeyDown_2 } = useVoiceKeybindingHandler({
      voiceHandleKeyEvent: pn.handleKeyEvent,
      voiceCancelRecording: pn.cancelRecording,
      stripTrailing: pn.stripTrailing,
      resetAnchor: pn.resetAnchor,
      isActive: (vn !== "tap" || query.trim().length > 0) && mode !== "bash" && Nn,
      composer: zi,
    }),
    Ta = useAppState((ee) => isReducedMotion(ee.settings.prefersReducedMotion)),
    Oa = jo === "recording" && !Ta;
  (DispatchModeLine({
    editor: We,
    selection: ke,
    query: query,
    dispatchMode: mode,
    collapsed: collapsed,
    canonicalLauncherCwd: Kt,
    storageV5: storageV5,
  }),
    useAttachFleetOwners(vt, { clock: oe, groupsEnabled: Ot }));
  let Cn = () => clearFleetOfferState($e, We),
    fn = Q(modelSuggestions, []),
    {
      query: query_2,
      queryRef: queryRef_2,
      setQuery: setQuery_2,
      cursorOffset: cursorOffset,
      handleKeyDown: handleKeyDown_3,
      handlePaste: handlePaste_2,
    } = useSearchInput({
      isActive: Xe !== null,
      honorEditorMode: !0,
      backspaceExitsOnEmpty: !1,
      onExit: () => submitRename(od()),
      onCancel: xe,
    }),
    ar = () => {
      (Ue.closeGroupEdit(), setQuery_3(""));
    },
    {
      query: query_3,
      queryRef: queryRef_3,
      setQuery: setQuery_3,
      cursorOffset: cursorOffset_2,
      handleKeyDown: handleKeyDown_4,
      handlePaste: handlePaste_3,
    } = useSearchInput({
      isActive: groupEdit !== null,
      backspaceExitsOnEmpty: !1,
      onExit: () => submitGroupEdit(od()),
      onCancel: ar,
    }),
    Xi = Q(() => {
      let ee = new Set();
      for (let Ve of jobs ?? []) if (Ve.state.group) ee.add(Ve.state.group);
      for (let Ve of remoteJobs) if (Ve.state.group) ee.add(Ve.state.group);
      return ee;
    }, [jobs, remoteJobs]),
    Wo = Q(() => {
      if (!groupEdit) return [];
      let ee = new Set();
      if (groupEdit.kind === "assign") {
        let Xt = (
          jobs?.find((to) => to.id === groupEdit.jobId) ??
          remoteJobs.find((to) => remoteRowIdOf(to) === groupEdit.jobId)
        )?.state.group;
        if (Xt) ee.add(Xt);
      } else ee.add(groupEdit.from);
      let trimmed = query_3.trim(),
        lower = trimmed.toLowerCase();
      return [...Xi]
        .filter((Xt) => !ee.has(Xt) && Xt.toLowerCase().startsWith(lower))
        .sort((Xt, to) => {
          let startsWith = Xt.startsWith(trimmed),
            startsWith_2 = to.startsWith(trimmed);
          return startsWith !== startsWith_2 ? (startsWith ? -1 : 1) : Xt.localeCompare(to);
        });
    }, [groupEdit, Xi, jobs, remoteJobs, query_3]),
    trimmed = query_3.trim(),
    Zi = trimmed !== "" && isReservedGroupName(trimmed),
    Ma =
      groupEdit !== null &&
      trimmed !== "" &&
      !Zi &&
      !Xi.has(trimmed) &&
      !(groupEdit.kind === "rename" && groupEdit.from === trimmed),
    included = Wo.includes(trimmed),
    joined_2 = Wo.join(`
`);
  P(() => {
    Ue.setGroupPickIdx(
      groupEdit?.kind === "assign" && trimmed !== "" && trimmed !== groupEdit.cur && Wo.length > 0 ? 0 : -1,
    );
  }, [joined_2, trimmed]);
  let pu = groupEdit?.kind === "assign" && trimmed !== "" && trimmed !== groupEdit.cur && Wo.length > 0,
    Aa = templates.get(Ne) ?? Od,
    ag = routines.get(Ne) ?? Os,
    dr = findMentionedTemplate(query, allRepos, Aa, ag),
    Bn = dr ?? oo,
    fu = templates.get(Bn) ?? Od,
    Jn = Q(() => mergeSuggestionsByName(fu, Aa), [fu, Aa]),
    La = skills.get(Bn) ?? skills.get(Ne) ?? Os,
    _n = routines.get(Bn) ?? routines.get(Ne) ?? Os,
    ur = prependModeCharacterToInput(query, mode, jobs, cwdFilter),
    cr = Q(
      () => Ws(query, mode, ur, { templates: Jn, allRepos: allRepos, routines: _n }),
      [mode, ur, query, Jn, allRepos, _n],
    ),
    mu = ce(
      (ee) =>
        relaunchAgentsView(ee, {
          cwdFilter: cwdFilter,
          dispatchDefaults: dispatchDefaults,
          typedAgent: typedAgent,
          activeTab: activeTab,
          onError: setError,
        }),
      [cwdFilter, dispatchDefaults, typedAgent, activeTab],
    );
  useInterval(
    () => {
      let ee = Number(process.env[CLAUDE_AGENTS_AUTO_RELAUNCHED_AT]) || 0;
      if (Date.now() - ee < Hc) return;
      if (Date.now() - getLastInteractionTime() < ks) return;
      mu("auto");
    },
    Ho && !wo ? ks : null,
  );
  let [pr, ui] = y(!1),
    [Da, gu] = y(0),
    [Va, Ba] = y(null);
  (P(() => {
    if (query && pr) ui(!1);
  }, [query, pr]),
    P(() => {
      if (Da !== 0) gu(0);
    }, [query, pr, Bn]));
  let [dg, hu] = Uy((ee) => ee + 1, 0),
    lg = Q(
      () =>
        buildDispatchSuggestions(query, {
          templates: Jn,
          routines: _n,
          repos: allRepos,
          worktreeBranches: worktreeBranches,
          skills: La,
          models: fn,
          dispatch: cr,
          showAllAgents: pr,
        }),
      [query, Jn, _n, allRepos, worktreeBranches, La, fn, cr, pr, dg],
    ),
    {
      firstWord: firstWord,
      isSlashQuery: isSlashQuery,
      atMatch: atMatch,
      slashMatch: slashMatch,
      modelArgMatch: modelArgMatch,
      templateNames: templateNames,
      repoNames: repoNames,
      suggestions: suggestions,
    } = lg;
  P(() => {
    if (atMatch) Ce.refreshLauncher(Ne);
  }, [atMatch, Ce, Ne]);
  let bu = (ee) => {
      if ((Ba(null), ee.kind === "model" && modelArgMatch)) {
        setQuery(`/model ${ee.name}`);
        return;
      }
      let Ve = Id[ee.kind];
      setQuery(atMatch || slashMatch ? zc(query, Ve, ee.name) : `${Ve}${ee.name} `);
    },
    mg = () =>
      (Va ? suggestions.find((ee) => `${ee.kind}:${ee.name}` === Va) : void 0) ??
      suggestions[Math.min(Da, suggestions.length - 1)],
    Ga = Q(
      () =>
        buildJobActions(
          we.reload,
          (ee) => {
            ke.followId = ee;
          },
          we.optimistic,
          we.noteDeleteRefusal,
          we.deleteRefusalOf,
          storageV5,
        ),
      [we, ke, storageV5],
    ),
    gg = ce(
      async (ee) => {
        let found = Ga.find((et) => et.label === "stop");
        if (!found) throw Error("the stop action is missing");
        await found.run(ee, { bulk: !1 });
      },
      [Ga],
    );
  P(() => {
    (logForDebugging("[PERF:bg-remount-end]"), logFeatureOk("screen_fleet_view"));
  }, []);
  let Ua = ce(
    () =>
      pruneReplyDrafts(We, we, {
        jobs: jobs,
        pendings: pendings,
        adoptedPeers: adoptedPeers,
        remoteJobs: St,
        remoteListLoaded: remoteListLoaded,
      }),
    [We, we, jobs, pendings, adoptedPeers, St, remoteListLoaded],
  );
  (P(() => {
    Ua();
  }, [Ua]),
    useInterval(() => {
      if (We.hasReplyDrafts()) Ua();
    }, 15000));
  let wu = R(null),
    Ka = ce(() => {
      let ee = wu.current;
      wu.current = null;
    }, [storageV5]),
    HE = useDebouncedCallback(Ka, 300);
  P(() => Ka, [Ka]);
  let yu = (ee) => {
      if (ee === Ue.getSnapshot().activeTab) return;
      if (ee === "remote" && !$6s()) return;
      if (
        (Ue.setActiveTab(ee),
        setHint(null),
        setError(null),
        (ke.followOrigin = null),
        He.disarm(),
        ee === "remote")
      )
        we.loadRemote();
    },
    Eu = (ee) => we.liveStatus(ee),
    hg = isCrossSessionMessagingEnabled() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_fleetview_peers", !1),
    [wg, Sg] = y(() => Date.now()),
    Ru = useIsScreenReaderEnabled(),
    yg = Ru ? wg : void 0,
    now = Date.now(),
    ku = Q(() => new Set((jobs ?? []).filter((ee) => isLoopJob(ee.state)).map((ee) => ee.id)), [jobs]),
    any = (jobs ?? []).some((ee) => {
      if (!ku.has(ee.id)) return !1;
      let Ve = loopKicks.get(ee.state.sessionId)?.nextAt;
      return Ve != null && Ve > now && Ve - now < 60000;
    });
  (useInterval(() => Sg(Date.now()), Ru ? Bs : any ? 1000 : jobs?.length || St.length ? 30000 : null),
    P(() => {
      Y$n(At, !0, dispatchDefaults, templates.get(At), storageV5);
    }, [At, dispatchDefaults, templates, storageV5]),
    P(() => {
      if (De.agentLastUsedMigrationDone) return;
      ((De.agentLastUsedMigrationDone = !0),
        backfillAgentLastUsed(storageV5).then((ee) => {
          if (ee) hu();
        }));
    }, [De, storageV5]),
    P(() => Ce.loadTarget(Bn, storageV5), [Ce, Bn, storageV5]));
  let { addNotification: addNotification } = useNotifications(),
    es = useSelection(),
    vu = (ee) => {
      addNotification(buildCopiedNotification(ee));
    },
    kg = useCopyOnSelect(es, !0, vu);
  useSelectionBgColor(es);
  let _u = modalPagerAction(es, kg, vu);
  (useSelectionClearKeybinding(es),
    zt(() => {
      let ee = di().get(process.stdout);
      if (!ee) return;
      return (
        (ee.onHyperlinkClick = (Ve) => {
          let et = !1,
            { activeTab: activeTab, previewOpen: previewOpen } = Ue.getSnapshot(),
            { error: error } = We.getSnapshot();
          openClickedLink(Ve);
        }),
        () => {
          ee.onHyperlinkClick = void 0;
        }
      );
    }, [Ue, We, !1]));
  let Ya = !1,
    Iu = Q(() => getAuthTokenSource().hasToken, []),
    Tu = CloudListFailureNotice({
      onCloudTab: activeTab === "remote" && !me && !previewOpen,
      remoteJobs: St,
      remoteListLoaded: remoteListLoaded,
      remoteListFailure: remoteListFailure,
    }),
    Ou = !1,
    fr = buildFleetRows({
      jobs: jobs,
      adoptedPeers: adoptedPeers,
      remoteJobs: St,
      pendings: pendings,
      prStatuses: prStatuses,
      liveStatus: Eu,
      heldInTerminal: (ee) => we.terminalHolderOf(ee) !== void 0,
      loopJobIds: ku,
      loopKicks: loopKicks,
      focusedIdx: focusedIdx,
      hoverFocusIdx: hoverFocusIdx,
      followOrigin: followOrigin,
      collapsed: collapsed,
      capExpanded: capExpanded,
      groupMode: groupMode,
      activeTab: activeTab,
      query: query,
      mode: mode,
      dispatch: cr,
      linkMatchId: ur,
      dispatchRepoCwd: dr,
      pendingDelete: pending,
      earlierEntries: io,
      cwdFilter: cwdFilter,
      initialJobId: initialJobId,
      simpleView: me,
      simpleWantsRemote: Je,
      peersEnabled: hg,
      showRemoteTabs: Ya,
      launcherCwd: Ne,
      launcherGroup: uo,
      scopedFallbackOrigin: At,
      termRows: rows - (Tu !== null && St.length > 0 ? cc : 0) - (pathOwnRow ? 1 : 0) - (Ou ? 1 : 0),
      columns: columns,
      now: now,
      ageNow: yg,
    }),
    {
      byState: byState,
      byGroup: byGroup,
      hasComposedDispatch: hasComposedDispatch,
      scopedLocalJobs: scopedLocalJobs,
      scopedJobs: scopedJobs,
      filtered: filtered,
      groupOf: groupOf,
      jobSessionIds: jobSessionIds,
      doneCap: doneCap,
      simpleBuilt: simpleBuilt,
      built: built,
      rows: rows_2,
      homeIdx: homeIdx,
      onlyOrigin: onlyOrigin,
      isOnboarding: isOnboarding,
      focusedRow: focusedRow,
      focused: focused,
      altOpenOrigin: altOpenOrigin,
      dispatchOrigin: dispatchOrigin,
      focusIsFromHover: focusIsFromHover,
      headerJobs: headerJobs,
      isBashDispatch: isBashDispatch,
      queryIsFilter: queryIsFilter,
      hasNameFilter: hasNameFilter,
    } = fr,
    mi = (ee) => rows_2.findIndex((Ve) => Ve.kind === "job" && Ve.job.id === ee);
  if (($e.releasePromoted(jobSessionIds), me && Ue.firstImpression("simple")))
    logFeatureOk("fleet_view_simple");
  if (hasNameFilter && Ue.firstImpression("nameFilter")) logFeatureOk("fleet_view_name_filter");
  if (built.doneFoldHidden > 0 && Ue.firstImpression("fold"))
    logEvent("tengu_fleetview_fold_shown", {
      done_count: built.doneCount,
      hidden_count: built.doneFoldHidden,
      k: simpleBuilt?.doneCap ?? doneCap,
      terminal_rows: rows,
    });
  P(() => {
    if (jobs === null || !overlaidLoadLanded) return;
    let ee = (et) => oc(et, originJobId) && !we.isHolding(et.id),
      Ve = (et) => jobTempo(et.state) === "completed";
    emitFinishedJobs(De.resultSeen, {
      visibleFinished: rows_2
        .filter((et) => et.kind === "job")
        .map((et) => et.job)
        .filter((et) => ee(et) && Ve(et)),
      allFinished: jobs.filter((et) => ee(et) && Ve(et)),
      allCandidates: jobs.filter(ee),
    });
  }, [De, we, rows_2, jobs, originJobId, overlaidLoadLanded]);
  let Fg = Q(() => env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE, []);
  (useTerminalTitle(Fg ? null : hc(count(scopedJobs, (ee) => jobTempo(ee.state, Eu(ee)) === "blocked"))),
    useJobBandNotifications(
      scopedLocalJobs
        .filter((ee) => isLocalDaemonAgent(ee.state))
        .map((ee) => ({
          id: ee.id,
          sessionId: ee.state.sessionId,
          band: jobTempo(ee.state),
          label: getJobTitle(ee.state, ee.id === initialJobId),
          needs: ee.state.needs,
          outcome: terminalOutcome(ee.state.state),
          selfDriving: isSelfDriving(ee.state),
        })),
      Oe,
    ));
  let Pg = ke.followId ?? focused?.id ?? focusedRow?.group;
  (P(() => {
    if (He.pending !== null && He.pending.id === ke.followId) return;
    He.disarm();
  }, [Pg]),
    zt(() => {
      if ((ke.syncRows(rows_2), !ke.getSnapshot().draftPick)) return;
      if (!queryIsFilter) ke.releasePick(rows_2, homeIdx, !hasComposedDispatch && !byGroup);
      else if (hasNameFilter && !ke.followId) ke.followPick(homeIdx, rows_2[homeIdx]);
    }),
    P(() => {
      if (pendings.length === 0 || !jobs) return;
      let filtered = pendings.filter((et) => jobs.some((Xt) => Xt.id === et.id));
      if (filtered.length === 0) return;
      we.settleLandedPendings(filtered);
      let followId = ke.followId;
      if (followId && filtered.some((et) => et.id === followId)) {
        let et = mi(followId);
        if (et >= 0) ke.focus(et);
      }
    }, [we, ke, pendings, jobs]),
    P(() => {
      if (ke.isFirstQueryOfLook()) return;
      if (We.takeProgrammaticChange()) return;
      if ((setError(null), setHint(null), !queryIsFilter)) return;
      if (ur) {
        let ee = mi(ur);
        if (ee >= 0) ke.followPick(ee, rows_2[ee]);
        else ke.clearFollow();
        return;
      }
      if (hasNameFilter) {
        ke.followPick(homeIdx, rows_2[homeIdx]);
        return;
      }
      (ke.clearFollow(), ke.focus(homeIdx));
    }, [query]),
    P(() => {
      if (focusIsFromHover || (!byState && (draftPick || ke.getSnapshot().draftPick))) return;
      if (pt !== dispatchOrigin) Nt(dispatchOrigin);
    }, [dispatchOrigin, focusIsFromHover, draftPick, byState, pt]),
    P(() => {
      ke.clampFocus(rows_2.length);
    }, [ke, rows_2.length]),
    P(() => {
      if (ur) {
        ke.savedFocusJobId = null;
        return;
      }
      if (!hasComposedDispatch) {
        let savedFocusJobId = ke.savedFocusJobId;
        if (((ke.savedFocusJobId = null), savedFocusJobId && hasNameFilter)) ke.returnPickTo(savedFocusJobId);
        else if (savedFocusJobId) {
          ((ke.followOrigin = null), (ke.followId = savedFocusJobId));
          let Go = mi(savedFocusJobId);
          if (Go >= 0) ke.focus(Go);
        }
        return;
      }
      let focusedIdx = ke.getSnapshot().focusedIdx,
        Ve = rows_2[focusedIdx];
      if (Ve?.kind === "job" && ke.savedFocusJobId === null) ke.savedFocusJobId = Ve.job.id;
      let et = (_o) => rows_2.findIndex((Go) => Go.kind === "header" && _o(Go)),
        Xt = -1,
        to = null;
      if (byState) to = "working";
      else if (dr) {
        if (((Xt = et((_o) => _o.origin === dr && _o.group !== "pinned")), Xt >= 0)) to = rows_2[Xt].group;
      } else if (Ve?.kind === "job")
        if (Ve.group === "pinned")
          to =
            rows_2.find((Go) => Go.kind === "header" && Go.origin === Ve.origin && Go.group !== "pinned")
              ?.group ?? null;
        else to = Ve.group;
      else if (Ve?.kind === "header") {
        if (Ve.group !== "pinned") ((to = Ve.group), (Xt = focusedIdx));
      }
      if (Xt < 0) return;
      if (((ke.followId = null), (ke.followOrigin = to), Xt !== focusedIdx)) ke.focus(Xt);
    }, [hasComposedDispatch, byState, dr]));
  let Vu =
    previewOpen &&
    (filtered.length === 0 ||
      (focusedRow !== void 0 && focusedRow.kind !== "job") ||
      (focusedRow === void 0 && (ke.followId === null || mi(ke.followId) < 0)));
  P(() => {
    if (Vu) Ue.setPreviewOpen(!1);
  }, [Vu]);
  let Bu = R(!1);
  P(() => {
    if (ke.restoreAttempts >= 2 || jobs === null) return;
    let ee = !!initialJobId?.startsWith("remote-"),
      Ve = ee && St.some((to) => to.id === initialJobId);
    if (ee && !remoteListLoaded && !Ve) return;
    if (!initialJobId && activeTab === "remote" && !rows_2.some((to) => to.kind === "job")) {
      Bu.current = St.length > 0;
      return;
    }
    if (!initialJobId && activeTab === "remote" && Bu.current && ke.followOrigin !== null) {
      ke.restoreAttempts = 2;
      return;
    }
    if (!me && ee && activeTab !== "remote" && Ve) {
      Ue.setActiveTab("remote");
      return;
    }
    if (!ee && initialJobId && jobs === ke.restoreCountedJobs) return;
    ((ke.restoreCountedJobs = jobs), ke.restoreAttempts++);
    let et = () => {
      let to = rows_2[homeIdx];
      if (hasNameFilter) {
        ke.followPick(homeIdx, to);
        return;
      }
      if ((ke.focus(homeIdx), to?.kind === "job")) ((ke.followId = to.job.id), (ke.followOrigin = null));
      else if (to?.kind === "earlier") ((ke.followId = null), (ke.followOrigin = null));
      else if (to?.kind === "header") ((ke.followId = null), (ke.followOrigin = to.group));
    };
    if (!initialJobId) {
      ((ke.restoreAttempts =
        rows_2.some((to) => to.kind === "job" || to.kind === "earlier") || !De.earlier.pending ? 2 : 1),
        et());
      return;
    }
    let Xt = mi(initialJobId);
    if (Xt >= 0) ((ke.restoreAttempts = 2), ke.focus(Xt), (ke.followId = initialJobId));
    else if (ke.restoreAttempts >= 2) et();
  }, [jobs, St, remoteListLoaded, activeTab, initialJobId, homeIdx]);
  let Za = {
      editor: We,
      roster: we,
      selection: ke,
      view: Ue,
      attach: $e,
      deleteConfirm: He,
      storageV5: storageV5,
      onAction: onAction,
      pendings: pendings,
      mountAt: kn,
      canonicalLauncherCwd: Kt,
      cwdFilter: cwdFilter,
      parseScope: { templates: Jn, allRepos: allRepos, routines: _n },
    },
    Ju = (ee, Ve) => openEarlierSession(Za, ee, Ve),
    ns = (ee, Ve) => {
      let et = queryIsFilter && ee ? groupOf.get(ee.id) : void 0;
      if (et !== void 0) ke.uncollapse(qt(et));
      attachToJob(Za, ee, Ve);
    },
    Hu = (ee) => openNewSession(Za, ee),
    td = autoOpenJobId !== void 0 && (!autoOpened || attachingJobId !== null);
  P(() => {
    if ($e.getSnapshot().autoOpened || !autoOpenJobId || jobs === null) return;
    ($e.markAutoOpened(), ns(jobs.find((ee) => ee.id === autoOpenJobId)));
  }, [autoOpenJobId, jobs]);
  let ju = jobs !== null && !td && onlyOrigin && activeTab !== "remote" && !query && !me,
    any_2 = filtered.some((ee) => ee.id === initialJobId);
  P(() => {
    if (!ju || !Ue.firstImpression("empty")) return;
    logEvent("tengu_fleetview_empty_state_shown", { skeleton: isOnboarding, has_origin: any_2 });
  }, [ju, isOnboarding, any_2]);
  let od = () => ({
      submit: {
        editor: We,
        roster: we,
        selection: ke,
        view: Ue,
        attach: $e,
        storageV5: storageV5,
        credentials: credentials,
        onAction: onAction,
        exit: go,
        relaunchForUpdate: mu,
        searchKeyDown: handleKeyDown,
        willInsertNewline: willInsertNewline,
        vimMode: vimMode,
        dispatchInputActive: Nn,
        canonicalLauncherCwd: Kt,
        launcherCwd: Ne,
        effectiveCwd: oo,
        scopedFallbackOrigin: At,
        cwdFilter: cwdFilter,
        dispatchDefaults: dispatchDefaults,
        query: query,
        dispatch: cr,
        templates: Jn,
        allRepos: allRepos,
        routines: _n,
        templateCache: templates,
        suggestions: suggestions,
        skills: La,
        modelArgMatch: modelArgMatch,
        modelSuggestions: fn,
        pickSuggestion: mg,
        applySuggestion: bu,
        closeAgentBrowse: () => ui(!1),
        jobSessionIds: jobSessionIds,
        builtRows: built.rows,
        bumpSuggGen: hu,
        mountAt: kn,
        focusedRow: focusedRow,
        focused: focused,
        isOnboarding: isOnboarding,
        toggleCollapse: bo,
        openEarlier: Ju,
        openNewSessionRow: Hu,
        openOrRespawn: ns,
      },
      deleteConfirm: He,
      actions: Ga,
      rows: rows_2,
      focusedIdx: focusedIdx,
      altOpenOrigin: altOpenOrigin,
      byGroup: byGroup,
      byState: byState,
      hasComposedDispatch: hasComposedDispatch,
      dispatchRepoCwd: dr,
      headerJobs: headerJobs,
      groupOf: groupOf,
      groupSuggestions: Wo,
      previewOpen: previewOpen,
      helpOpen: helpOpen,
      debugOpen: debugOpen,
      groupEdit: groupEdit,
      renamingJobId: Xe,
      attachingJobId: attachingJobId,
      showAllAgents: pr,
      jobs: jobs,
      pendings: pendings,
      keybindings: ae,
      simpleView: me,
      groupsEnabled: Ot,
      hasCredentials: Iu,
      termRows: rows,
      canGoBack: canGoBack,
      originJobId: originJobId,
      originSpawn: originSpawn,
      renameKeyDown: handleKeyDown_3,
      groupKeyDown: handleKeyDown_4,
      setQuery: setQuery,
      enterInsertMode: enterInsertMode,
      setRenameDraft: setQuery_2,
      setGroupDraft: setQuery_3,
      readRenameDraft: () => queryRef_2.current,
      readGroupDraft: () => queryRef_3.current,
      pressExitKey: Po,
      switchTab: yu,
      clearRename: xe,
      clearGroupEdit: ar,
      headerArmId: it,
      ck: qt,
      setShowAllAgents: ui,
      setSelectedSuggestion: gu,
      setHoveredSuggestionId: Ba,
      attachPastedImage: So,
    }),
    Mg = (ee) => handleFleetKey(od(), ee),
    { handleKeyDown: handleKeyDown_5, handlePaste: handlePaste_4 } = usePasteHandler({
      handleKeyDown: Mg,
      onPaste: (ee) =>
        handlePasteIntoDispatch(
          { editor: We, dispatchInputActive: Nn, insertAtCursor: (Ve) => handlePaste(new PasteEvent(Ve)) },
          ee,
        ),
      onImagePaste: So,
    }),
    Gu = (ee) => {
      let snapshot = Ue.getSnapshot();
      if (snapshot.resumePicker !== null || snapshot.settingPicker !== null) return;
      if (Xe !== null || snapshot.renaming !== null) {
        handlePaste_2(ee);
        return;
      }
      if (groupEdit !== null) {
        if ((Ue.setGroupPickIdx(-1), snapshot.groupPristine)) (setQuery_3(""), Ue.setGroupPristine(!1));
        handlePaste_3(ee);
        return;
      }
      if (helpOpen) Ue.setHelpOpen(!1);
      handlePaste_4(ee);
    },
    Dg = jobs !== null && !td,
    jE = R(null),
    WE = useInputClock(),
    { subscribeFrames: subscribeFrames } = Se(kp);
  zt(() => {
    return;
  }, [Dg, subscribeFrames]);
  let Vg = (ee) => !1;
  if (jobs === null || td)
    return e(Box, {
      tabIndex: 0,
      autoFocus: !0,
      onKeyDownCapture: _u,
      onKeyDown: (Ve) => {
        if (Ve.ctrl && Ve.key === "d" && (me || (jobs === null && We.getSnapshot().query === ""))) {
          (Ve.stopImmediatePropagation(), Po("Ctrl-D"));
          return;
        }
        if (me && (Ve.name === "escape" || (Ve.ctrl && Ve.key === "c"))) {
          (Ve.stopImmediatePropagation(), Po("Ctrl-C"));
          return;
        }
        handleKeyDown(Ve);
      },
      onPaste: Gu,
    });
  let Bg =
      suggestions.length > 0
        ? e(Box, {
            paddingLeft: 2,
            marginBottom: 1,
            children: e(PromptInputFooterSuggestions, {
              suggestions: suggestions.map((ee) => ({
                id: `${ee.kind}:${ee.name}`,
                displayText: modelArgMatch ? ee.name : `${Id[ee.kind]}${ee.name}`,
                description: `${SUGGESTION_KIND_LABELS[ee.kind]} \xB7 ${ee.description}`,
              })),
              selectedSuggestion: Math.min(Da, suggestions.length - 1),
              maxColumnWidth: 35,
              noPad: !0,
              hoveredId: Va,
              onHoverChange: Ba,
              onSelect: (ee) => {
                let Ve = suggestions[ee];
                if (Ve) (bu(Ve), ui(!1));
              },
            }),
          })
        : null,
    Jg = new Set([
      ...templateNames,
      ..._n.map((ee) => ee.name.toLowerCase()),
      ...repoNames.map((ee) => ee.toLowerCase()),
    ]),
    nd = isBashDispatch ? [] : mentionRanges(query, Jg),
    Hg = isBashDispatch
      ? []
      : cr?.matched && firstWord === cr.template.name.toLowerCase()
        ? [[0, firstWord.length], ...nd]
        : isSlashQuery
          ? [[0, firstWord.length], ...nd]
          : [...newSessionPrefixRanges(query), ...nd];
  return r(Box, {
    ref: Xr,
    flexDirection: "column",
    flexGrow: 1,
    tabIndex: 0,
    autoFocus: !0,
    onKeyDownCapture: (ee) => {
      if (Vg(ee)) return;
      (_u(ee), handleKeyDown_2(ee));
    },
    onKeyDown: handleKeyDown_5,
    onPaste: Gu,
    onWheel: (ee) => {
      if (previewOpen) return;
      (ee.preventDefault(), Qr.current?.scrollBy(ee.deltaY > 0 ? 3 : -3));
    },
    children: [
      e(FleetRowList, {
        owners: vt,
        layout: fr,
        scrollRef: Qr,
        header: e(FleetComposer, {
          editor: We,
          layout: fr,
          simpleView: me,
          dispatchDefaults: dispatchDefaults,
          targetCwd: Bn,
          launcherCwd: Ne,
          canonicalLauncherCwd: Kt,
          originJobId: originJobId,
        }),
        renameInput: { draft: query_2, cursor: cursorOffset },
        groupInput: {
          draft: query_3,
          cursor: cursorOffset_2,
          suggestions: Wo,
          reserved: Zi,
          isNew: Ma,
          matchesExisting: included,
          panelOpen: pu,
        },
        initialJobId: initialJobId,
        cwdFilter: cwdFilter,
        simpleView: me,
        endsWithOlderSessionsLine: Ou,
        hasCredentials: Iu,
        mountAt: kn,
        actions: { toggleCollapse: bo, openOrRespawn: ns, openEarlier: Ju, openNewSessionRow: Hu },
      }),
      e(FleetSearchInput, {
        owners: vt,
        layout: fr,
        onCursorOffsetChange: setCursorOffset,
        highlights: Hg,
        voice: { interimRange: pn.interimRange, showCursor: Oa },
        isTerminalFocused: wo,
        simpleView: me,
        showRemoteTabs: Ya,
        switchTab: yu,
        remoteJobs: St,
        hasGroups: (jobs ?? []).some((ee) => !!ee.state.group),
        suggestionList: Bg,
        cloudListNotice: Tu,
      }),
      e(FleetBody, {
        owners: vt,
        layout: fr,
        footer: e(FleetFooter, {
          owners: vt,
          layout: fr,
          simpleView: me,
          canGoBack: canGoBack,
          dispatchDefaults: dispatchDefaults,
          launcherCwd: Ne,
          storageV5: storageV5,
          groupInput: { draft: query_3, suggestions: Wo },
          suggestionsOpen: suggestions.length > 0,
        }),
        simpleView: me,
        groupsEnabled: Ot,
        showRemoteTabs: Ya,
        canGoBack: canGoBack,
        canMention: Jn.length + _n.length + Object.keys(allRepos).length > 0,
        isTerminalFocused: wo,
        awayLoop: Oe,
        storageV5: storageV5,
        onOpen: ns,
        onStop: gg,
      }),
    ],
  });
}
//@ chunk-93kwxas0.js:199227-199239 placement
var co = null;
//@ chunk-93kwxas0.js:199239-199279 placement
function seedHostJobs(h, E, k) {
  ensureFleetRoster(h, k).seedJobs(E);
}
//@ chunk-93kwxas0.js:199279-199412 placement
function remountClearSeq(h, E, k) {
  if (h) return enterAltScreenSequence();
  let rows = getTerminalSize(process.stdout, null).rows;
  if (rows !== process.stdout.rows) return "";
  return E && !k ? eraseViewportInPlace(rows) : "";
}
//@ chunk-93kwxas0.js:199412-209165 placement
async function mountFleetView(h, E) {
  let k = !1;
  function C() {
    k = !0;
  }
  process.stdout.on("resize", C);
  using x = {
    [Symbol.dispose]: () => {
      process.stdout.removeListener("resize", C);
    },
  };
  let T = "inline",
    A = Qu();
  if (!A.ok) {
    await reportFatalAndExit(A.error);
    return;
  }
  if (
    ((await import("./chunk-7dsst868.js")).registerToolHosts(),
    initBuiltinPlugins(),
    initBundledSkills(),
    isAgentSwarmsEnabled() && !hasTeammateModeSnapshot())
  )
    captureTeammateModeSnapshot();
  (pxs(E?.dispatchExtraArgs ?? []),
    logEvent("tengu_bg_agent_action", {
      action: lit("list_open"),
      mode: fromEnum(getGlobalConfig().fleetViewGroupMode ?? "state"),
    }));
  let L = E?.host ?? createFleetViewHost(),
    V = getRootSession(),
    host = V.host,
    U = xo(V);
  if ((nc(L.resultSeen, E?.entryChannel), !getGlobalConfig().hasOpenedAgentsView))
    await saveGlobalConfig((Fe) => ({ ...Fe, hasOpenedAgentsView: !0 }), E?.storageV5);
  let N = [];
  function X() {
    let Fe;
    while ((Fe = process.stdin.read()) !== null) {
      if ((typeof Fe === "string" ? Buffer.from(Fe, "utf8") : Fe).includes(3)) {
        process.emit("SIGINT");
        return;
      }
      N.push(Fe);
    }
  }
  (process.stdin.on("readable", X),
    await composePolicyLimitsForFleet({ storageV5: E?.storageV5, credentials: E?.credentials }));
  let K = E?.cwdFilter
      ? await canonicalizePath(resolve(E.cwdFilter), getRealPathOptions(E?.storageV5))
      : void 0,
    W = resolveDispatchPermissionMode(E?.dispatchDefaults),
    z = isStorageV5Enabled() ? E?.storageV5 : void 0;
  (registerCleanup(z ? () => yAr(z) : yAr), registerCleanup(openDaemonLease("claude agents")));
  let oe = h,
    ge = E?.screen,
    se = (Fe) => {
      if (ge) ge.update(Fe);
      else ge = showScreen(oe, Fe);
    },
    CLAUDE_AGENTS_SELECT = env.CLAUDE_AGENTS_SELECT,
    ae = j6s(),
    me = E?.autoOpenJobId ?? ae?.short,
    Je = ae?.left,
    le = me !== void 0 && E?.canGoBack && ae === void 0,
    Oe = [],
    De = new Set(),
    we,
    Re = !1,
    je = !1,
    st = new Set(),
    mt = () =>
      co !== null &&
      !je &&
      tgo({ presentation: T, rows: getTerminalSize(process.stdout, null).rows, embedded: !1 }),
    Ye = (Fe, Rt) => {
      if ((oe.unmount(), Rt && process.stdin.isTTY)) setRawModeSafe(process.stdin, !1);
      if (Rt && shouldUseFullscreenByDefault()) process.stdout.write(exitAltScreenSequence());
      if (Fe !== void 0)
        process.stderr.write(`${Fe}
`);
    },
    Lt = !1,
    dt = CLAUDE_AGENTS_SELECT,
    Dt = rs(),
    eo = 0,
    Wt = (Fe) => {
      let Rt = {
        ...fleetAttachFields(Fe.id, dt, eo),
        ...takeNotificationLatency(Dt, Fe.state.sessionId, Date.now()),
      };
      return (eo++, Rt);
    },
    ke = E?.originJobId,
    Ge = E?.originSpawn;
  delete process.env.CLAUDE_AGENTS_SELECT;
  let yt,
    Bt = await readJobDraft(await canonicalizePath(getCwd(), getRealPathOptions(E?.storageV5)), E?.storageV5),
    lt = ensureFleetRoster(L, E?.storageV5);
  ws(L, lt, E?.storageV5, Bt?.collapsed);
  let Tt = Rs(L, { query: Bt?.q || void 0 }),
    Et = Ss(L);
  sweepJobDrafts();
  let Ot;
  process.stdin.off("readable", X);
  let Yt = !1;
  while (N.length) process.stdin.unshift(N.pop());
  let Ue;
  if (me !== void 0) {
    if (lt.jobs === null) lt.seedJobs(await listJobs(void 0, E?.storageV5));
    let Fe = lt.jobs?.find((Rt) => Rt.id === me);
    if (Fe) {
      let startTime = performance.now(),
        Vt = randomUUID();
      startAttachBeacon(Vt, "fleet", E?.storageV5).catch(() => {});
      let Be = await safeRespawnBgSession(Fe.id, { knownState: Fe.state }, E?.storageV5);
      if (co && ae !== void 0) {
        if (!Be.ok && !Be.alive) (await co.backToCloudSession(ae.left, !1, E?.storageV5), (Je = void 0));
        if (shouldUseFullscreenByDefault()) process.stdout.write(enterAltScreenSequence());
      }
      Ue = { type: "open", job: Fe, respawnResult: Be, gestureT0: startTime, gestureId: Vt };
    } else if (co && ae !== void 0) await co.backToCloudSession(ae.left, !1, E?.storageV5);
    else if (co && ke !== void 0 && (mt() || parseSwitchTarget(me).kind === "cloud")) {
      let sessionTabsNext = await co.sessionTabsNext({
          ending: { kind: "asked", intent: parseSwitchTarget(me) },
          leftJobId: ke,
          visited: [],
          ended: De,
          landed: void 0,
          storageV5: E?.storageV5,
        }),
        Vt =
          sessionTabsNext.kind === "cloud"
            ? await co.stayAfterCloudTab(
                sessionTabsNext,
                E?.dispatchExtraArgs ?? [],
                !1,
                () => Ge?.settled === !0 && !Ge.ok,
                E?.storageV5,
              )
            : sessionTabsNext;
      if (Vt.kind === "open") {
        if (Vt.jobs) lt.seedJobs(Vt.jobs);
        let jobToOpen = await co.jobToOpen(Vt.jobId, lt.jobs, E?.storageV5);
        if (jobToOpen) ((Ue = { type: "open", job: jobToOpen }), (Re = !Vt.asked), (Lt = Vt.booting));
      }
      if (Ue === void 0) {
        if (Ge) Ge.resumeHintRequested = !0;
        Ye(co.NO_SESSION_QUIT_LINE, !1);
        return;
      }
    }
  }
  let Qt = !1,
    tt,
    ze = Ue !== void 0 && ke !== void 0;
  for (;;) {
    if (Ue === void 0 && ze && mt()) {
      Ye(co?.NO_SESSION_QUIT_LINE, !0);
      break;
    }
    if (((je ||= Ue === void 0), Qt)) or();
    ((tt = checkDispatchDefaultsChanged(tt, W, E?.storageV5)), (Qt = !0));
    let Fe =
      Ue ??
      (await new Promise((vt) => {
        (se(
          e(FleetViewScreen, {
            killRing: L.killRing,
            children: e(
              AppRoot,
              {
                host: host,
                project: U,
                storageV5: E?.storageV5,
                initialState: Ot && { ...Ot, notifications: { current: null, queue: [], pinned: [] } },
                onChangeAppState: ({ newState: newState }) => {
                  Ot = newState;
                },
                children: e(FleetView, {
                  onAction: vt,
                  host: L,
                  initialJobId: CLAUDE_AGENTS_SELECT,
                  awayLoop: Dt,
                  originJobId: ke,
                  originSpawn: Ge,
                  cwdFilter: K,
                  dispatchDefaults: W,
                  typedAgent: E?.dispatchDefaults?.agent,
                  canGoBack: E?.canGoBack,
                  autoOpenJobId: me,
                  entryChannel: E?.entryChannel,
                  relaunchTab: yt,
                  typedAhead: Yt,
                  fromLauncher: E?.fromLauncher,
                  storageV5: E?.storageV5,
                }),
              },
              "agents-list",
            ),
          }),
        ),
          setJitPolicyAfterStartup());
      }));
    Ue = void 0;
    let Rt = Re;
    Re = !1;
    let Vt = Lt;
    Lt = !1;
    let Be = shouldUseFullscreenByDefault();
    if (Fe.type === "back") {
      oe.unmount();
      break;
    }
    if (Fe.type === "open" && Fe.job.id !== me) le = !1;
    if (((me = void 0), Fe.type === "login")) {
      let { getLoginStartingMessage: getLoginStartingMessage, Login: Login } =
          await import("./chunk-whwtfsqf.js"),
        Qe = !1,
        winner = await Promise.race([
          new Promise((St) => {
            ((ge = void 0),
              showScreen(
                oe,
                e(AppRoot, {
                  storageV5: E?.storageV5,
                  initialState: Ot && { ...Ot, notifications: { current: null, queue: [], pinned: [] } },
                  onChangeAppState: ({ newState: newState }) => {
                    Ot = newState;
                  },
                  children: e(Login, {
                    onDone: St,
                    onOrgDocumentsReload: (Ne) => {
                      if (Ne === "previous") Qe = !0;
                    },
                    startingMessage: getLoginStartingMessage(),
                  }),
                }),
              ));
          }),
          oe.waitUntilExit().then(() => "exited"),
        ]);
      if (winner === "exited") break;
      if ((showScreen(oe, null), process.stdout.isTTY)) process.stdout.write(getEraseScreenSequence());
      if (winner) {
        let { runOrgMemoryAuthBoundary: runOrgMemoryAuthBoundary } = await import("./chunk-whwtfsqf.js");
        if ((runOrgMemoryAuthBoundary(), await yAr(E?.storageV5), getAPIProvider() === "gateway")) {
          oe.unmount();
          break;
        }
        Tt.setHint("Login successful");
      }
      if (winner || Qe) {
        let [
          { refreshRemoteManagedSettings: St },
          { refreshPolicyLimits: Ne },
          { declareNoConsentSurface: uo },
          { HoldForSettingsReload: Kt, enforceOrgConfigGateAfterStepSignIn: po },
        ] = await Promise.all([
          import("./chunk-r42q9dtm.js"),
          import("./chunk-qchbrsbw.js"),
          import("./chunk-0evt542c.js"),
          import("./chunk-xcagebg7.js"),
        ]);
        uo();
        let results = Promise.all([St(void 0, E?.storageV5, E?.credentials), Ne().catch(() => {})]);
        (await new Promise((pt) => {
          showScreen(
            oe,
            e(AppRoot, { storageV5: E?.storageV5, children: e(Kt, { reload: results, onDone: pt }) }),
          );
        }),
          showScreen(oe, null),
          await po(oe));
      }
      continue;
    }
    let gt = di().get(process.stdout);
    if (Be && Fe.type === "open") gt?.handoffAltScreen();
    if (getPlatform() === "windows" && Fe.type === "open") gt?.handoffRawMode();
    let kt = gt?.lastFrameFillsCurrentViewport ?? !1;
    if (!Be) se(null);
    if ((oe.unmount(), Fe.type === "done")) break;
    if (getPlatform() === "windows" && process.stdin.isTTY)
      (setRawModeSafe(process.stdin, !0), process.stdin.ref());
    let $e = "",
      ht = Be ? onExit(() => void process.stdout.write(exitAltScreenSequence() + $e)) : () => {};
    if (
      CLAUDE_AGENTS_SELECT !== void 0 &&
      CLAUDE_AGENTS_SELECT !== Fe.job.id &&
      CLAUDE_AGENTS_SELECT !== we
    ) {
      let vt = CLAUDE_AGENTS_SELECT;
      Oe.splice(0, Oe.length, vt, ...Oe.filter((rt) => rt !== vt));
    }
    if (((CLAUDE_AGENTS_SELECT = Fe.job.id), (we = void 0), !Fe.keepQuery)) Tt.dropDraft();
    L.agentLastUsedMigrationDone = !0;
    let now = Date.now(),
      We;
    if (Fe.respawnResult === void 0 && Fe.gestureId === void 0)
      ((We = randomUUID()), startAttachBeacon(We, "fleet", E?.storageV5).catch(() => {}));
    let Jt =
      co !== null &&
      tgo({ presentation: T, rows: Qtn, embedded: !1 }) &&
      !je &&
      !(le && E?.screen !== void 0) &&
      !isExecLaunch(Fe.job.state);
    if (Jt) le = !1;
    let qe = { kind: "failed" },
      He =
        Fe.respawnResult ??
        (await safeRespawnBgSession(
          Fe.job.id,
          Fe.freshDispatch ? void 0 : { knownState: Fe.job.state },
          E?.storageV5,
        ));
    if (
      (logForDebugging(
        `[FV-attach] respawnJob ${Fe.job.id}: ok=${He.ok} alive=${!He.ok && He.alive} err=${He.ok ? "" : He.error}`,
      ),
      He.ok || He.alive)
    ) {
      (logFleetJobAction("attach", Fe.job.state, {
        jobId: ye(Fe.job.id),
        attachShort: ye(He.short ?? Fe.job.id),
        ...Wt(Fe.job),
      }),
        process.stdout.write(osc(OSC.SET_TITLE_AND_ICON, getJobTitle(Fe.job.state, !0))));
      let now_2 = Date.now(),
        rt = {
          gestureId: Fe.gestureId ?? We ?? randomUUID(),
          attempt: 0,
          t0: Fe.gestureT0,
          surface: "fleet",
          interactive: {},
        };
      if (Fe.gestureId === void 0 && We === void 0)
        startAttachBeacon(rt.gestureId, "fleet", E?.storageV5).catch(() => {});
      let Qe = (Ne, uo) =>
          attachJob(Ne, {
            alreadyInAlt: Be,
            onExitNotice: (Kt) => {
              $e = Kt;
            },
            gateStdinUntilFirstFrame: uo,
            gesture: rt,
            sessionTabs: Jt,
            cloudTabs: co?.hostRestartsForCloudTabs(E?.dispatchExtraArgs ?? []) ?? !1,
            tabsLanding: Fe.landing,
            storageV5: E?.storageV5,
          }).catch(
            (Kt) => (
              logError(Kt),
              logFeatureBad("job_attach", "threw"),
              { kind: "error", msg: `Couldn't attach \u2014 ${errorMessage(Kt)}` }
            ),
          ),
        Xe = await Qe(He.short ?? Fe.job.id, He.ok || Fe.afterNoResponse === !0 || Rt || Vt),
        St = !1;
      if (Xe.kind === "error" && Xe.orphaned && !isExecLaunch(Fe.job.state) && !isTerminalShutdown()) {
        let Ne = await safeRespawnBgSession(Fe.job.id, { force: !0, knownState: Fe.job.state }, E?.storageV5);
        if (Ne.ok || Ne.alive) ((St = !0), (Xe = await Qe(Ne.short ?? Fe.job.id, Ne.ok)));
        else Xe = { kind: "error", msg: Ne.error };
      }
      if ((clearAttachBeacon(rt.gestureId, E?.storageV5).catch(() => {}), isTerminalShutdown()))
        return heldUntilExit();
      if (co) qe = co.attachEndingOf(Xe, !Rt);
      if (Xe.kind === "error" && !Xe.ended) {
        if (Xe.notResponding)
          if (isExecLaunch(Fe.job.state)) Tt.setError(Ap);
          else offerJobRestart(Et, Tt, Fe.job.id);
        else Tt.setError(Xe.msg);
        if (St && Xe.orphaned) logFeatureSad("fleet_view_open", "recovered_then_crashed");
        else logFeatureBad("fleet_view_open", St ? "orphan_recovery_failed" : "attach_failed");
      } else {
        if (Xe.msg) Tt.setError(Xe.msg);
        logFeatureOk("fleet_view_open");
      }
      (logFleetJobAction("detach", Fe.job.state, { attachDurationMs: Date.now() - now_2 }),
        logForDebugging(`[FV-attach] attachJob returned after ${Date.now() - now}ms \u2014 remounting list`));
    } else {
      Tt.setError(He.error);
      let vt = Fe.gestureId ?? We;
      if (vt !== void 0) clearAttachBeacon(vt, E?.storageV5).catch(() => {});
      if (He.errorCode === "fork_transcript_never_materialized")
        logFeatureSad("fleet_view_open", "fork_transcript_never_materialized");
      else logFeatureBad("fleet_view_open", "respawn_failed");
    }
    resetInteractionBaseline();
    let ct = !1;
    if (co && !le && mt()) {
      if (
        ((oe = await createRoot(getBaseRenderOptions(!1))),
        (ge = void 0),
        (ct = !0),
        Be && (qe.kind === "ended" || qe.kind === "failed"))
      )
        process.stdout.write(enterAltScreenSequence());
      if (qe.kind === "failed" || (qe.kind === "back" && qe.why === "taken")) st.add(Fe.job.id);
      else (st.delete(Fe.job.id), (Je = void 0));
      let vt = process.stdin.isTTY === !0 && process.stdin.isRaw !== !0;
      if (vt) setRawModeSafe(process.stdin, !0);
      if (qe.kind === "ended" || (qe.kind === "asked" && qe.intent.kind === "leave" && !qe.intent.running))
        De.add(Fe.job.id);
      else De.delete(Fe.job.id);
      let { stayAfterCloudTab: stayAfterCloudTab } = co,
        Qe = await co
          .sessionTabsNext({
            ending: qe,
            leftJobId: Fe.job.id,
            visited: Oe.filter((Xe) => !st.has(Xe)),
            ended: De,
            landed: He.ok || He.alive ? void 0 : Fe.landing,
            storageV5: E?.storageV5,
          })
          .then((Xe) =>
            Xe.kind === "cloud"
              ? stayAfterCloudTab(Xe, E?.dispatchExtraArgs ?? [], !0, () => !1, E?.storageV5)
              : Xe,
          )
          .finally(() => {
            if (vt) setRawModeSafe(process.stdin, !1);
          });
      if (Qe.kind === "quit") {
        (await co.backToCloudSession(Je, !0, E?.storageV5), Ye(Qe.say, !0), ht());
        break;
      }
      if (Qe.kind === "open") {
        if (Qe.jobs) lt.seedJobs(Qe.jobs);
        let jobToOpen = await co.jobToOpen(Qe.jobId, lt.jobs, E?.storageV5);
        if (!jobToOpen) {
          (await co.backToCloudSession(Je, !0, E?.storageV5), Ye(co.NO_SESSION_QUIT_LINE, !0), ht());
          break;
        }
        if (
          ((Ue = { type: "open", job: jobToOpen, ...(Qe.landing && { landing: Qe.landing }) }),
          qe.kind === "asked" && qe.intent.kind === "quit")
        ) {
          let id = Fe.job.id;
          ((we = id), Oe.splice(0, Oe.length, ...Oe.filter((Ne) => Ne !== id)));
        }
        ((Re = !Qe.asked), (Lt = Qe.booting), (le = !1), Tt.setError(null), ht());
        continue;
      }
    }
    if (!ct) ((oe = await createRoot(getBaseRenderOptions(!1))), (ge = void 0));
    if (le) {
      if (!Be) process.stdout.write(remountClearSeq(Be, kt, k));
      return ((le = !1), ht(), (ge ??= showScreen(oe, null)), { back: !0, root: oe, screen: ge });
    }
    (process.stdout.write(remountClearSeq(Be, kt, k)), logForDebugging("[PERF:bg-remount-start]"), ht());
  }
}

export { mountFleetView };
