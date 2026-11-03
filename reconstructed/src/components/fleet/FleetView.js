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
import { basename, resolve } from "path";
import { randomUUID } from "crypto";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import {
  SIMPLE_PINNED,
  groupCollapseKey,
  prependModeCharacterToInput,
  parseDraftInput,
  buildFleetRows,
  getJobTitle,
} from "./FleetRow.js";
import {
  jobSortKey_2,
  jobSortKey,
  sortJobs,
  remoteRowIdOf,
  isRemoteRowId,
  ensureFleetRoster,
  ensureFleetSelection,
  ensureFleetLiveStatus,
  canonicalRepoRoot,
  CloudListFailureNotice,
  CLOUD_LIST_ATTEMPTS,
  isOtherLocalDaemonJob,
  jobTempo,
  emitFinishedJobs,
  terminalTitle,
  prepareFatalExit,
  reportFatalAndExit,
  markJobFinished,
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
  COMMAND_NOT_RESPONDING_TEXT,
  offerJobRestart,
} from "./fleetActions.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import {
  setDispatchWindowValue,
  STILL_STARTING_MESSAGE,
  parseNewSessionPrefix,
  isPasteImageKey,
  pasteImageFromClipboard,
  DISPATCH_FLAG_HINTS,
  ensureFleetEditor,
  shouldListPastSessions,
  listPastSessions,
  modelSuggestions,
  EMPTY_AGENT_SUGGESTIONS,
  EMPTY_SKILL_SUGGESTIONS,
  findMentionedTemplate,
  mergeSuggestionsByName,
  relaunchAgentsView,
  CLAUDE_AGENTS_AUTO_RELAUNCHED_AT,
  RELAUNCH_COOLDOWN_MS,
  RELAUNCH_RECENT_MS,
  buildDispatchSuggestions,
  SUGGESTION_KIND_LABELS,
  replaceTrailingMention,
  pruneReplyDrafts,
  backfillAgentLastUsed,
  SUGGESTION_KIND_LABELS_2,
  mentionRanges,
  newSessionPrefixRanges,
  composePolicyLimitsForFleet,
  safeRespawnBgSession,
} from "./fleetSessions.js";
import {
  RENAME_SAVE_WAIT_MS,
  resolveFleetKeyAction,
  jumpGroupHeader,
  nextFocusableRow,
  resolveExitAction,
  logFleetActionFailure,
  RENAME_BUSY_TEXT,
  shortcutDisplayFor,
  stopOrDeleteJob,
  stopGroup,
  ensureFleetViewStore,
  ensureDeleteConfirmStore,
  PREVIEW_BACK_TIMEOUT_MS,
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
import { collapseWhitespace, getFirstLine } from "../../utils/stringUtils.js";
import { submitDispatch, DISPATCH_TIMEOUT_MS, handlePasteIntoDispatch } from "./fleetDispatch.js";
import { logEvent } from "../../services/analytics/index.js";
import { isFleetDispatchEnabled, claimSpareFromPool, discardSpare } from "../../cli/bg/bgSpare.js";
import { isBashModeChar } from "../PromptInput/inputModes.js";
import { Text, Box } from "../../ink/components/Text.js";
import { createSignal } from "../../utils/signal.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { findGitRoot, listUserAgentTemplates, setSpareExtraArgs } from "../../cli/bg/bgSpawnEnv.js";
import { listRepoWorktrees } from "../../utils/worktree.js";
import { getCommands, isSkillOff, getHumanFacingDescription } from "../../commands.js";
import {
  init_react_production,
  R,
  P,
  y,
  Q,
  ce,
  Uy,
  zt,
  Se,
} from "../../../vendor/react/cjs/react.production.js";
import { truncateWithEllipsis } from "../../services/sessionStatus/sessionStateClassifier.js";
import { useTerminalNotification } from "../../ink/useTerminalNotification.js";
import { useTheme_2, useStdin } from "../design-system/ThemeProvider.js";
import { notifyAsync } from "../../utils/terminalProbe.js";
import { markAgentsNotified, createNotifiedState } from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useFleetBindings, useDispatchWindowDefaults, FleetRowList, FleetComposer } from "./FleetList.js";
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
import { returnFalseAttention } from "./sessionAttention.js";
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
import { getSecondRootError, enterAltScreenSequence, exitAltScreenSequence } from "../../ink/terminal.js";
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
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { openDaemonLease } from "../../services/daemon/controlClient.js";
import { showScreen } from "../../utils/runSteps.js";
import { noRemoteSessionCommands } from "../../utils/remoteSessionCommands.js";
import { neverEmbedded } from "../SearchBox.js";
import { setRawModeSafe } from "../../ink/setRawModeSafe.js";
import { shouldUseFullscreenByDefault } from "../../utils/fullscreen.js";
import { takeNotificationLatency, checkDispatchDefaultsChanged } from "./dispatchDefaults.js";
import { readJobDraft, sweepJobDrafts } from "../../daemon/jobs/draftSweep.js";
import { parseSwitchTarget } from "../../daemon/attach/attachJob.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import { FleetViewScreen } from "../../screens/FleetView/FleetViewScreen.js";
import { AppRoot } from "../AppRoot.js";
import { setJitPolicyAfterStartup } from "../../utils/jitPolicy.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { getPlatform } from "../../utils/platform.js";
import { onExit } from "../../../vendor/signal-exit/dist/mjs/index.js";
import { NOTICE_WIDTH_LIMIT } from "../PromptInput/Notifications.js";
import { osc, OSC } from "../../ink/termio/osc.js";
import { attachJob } from "../../daemon/jobs/killJob.js";
import { isTerminalShutdown, heldUntilExit } from "../../utils/terminalShutdown.js";
import { getBaseRenderOptions } from "../../utils/renderOptions.js";

//@ chunk-93kwxas0.js:5808-5932 placement
function fleetAttachFields(id, E, k) {
  return {
    attach_kind: !E ? lit("no_origin") : id === E ? lit("origin_return") : lit("other"),
    is_first_attach_of_visit: k === 0,
  };
}
//@ chunk-93kwxas0.js:163196-164309 placement
/**
 * 在同组内上下移动当前会话（固定排序）。
 */
function reorderFocusedJob(h, E) {
  let { roster, selection, editor } = h.submit;
  let { rows, pendings, byGroup, byState, simpleView } = h;
  let setError = editor.setError;
  if (selection.reorderIssued) return;
  let focusedIdx = selection.getSnapshot().focusedIdx;
  let X = rows[focusedIdx];
  if (X?.kind !== "job") return;
  let K = focusedIdx + E;
  while (rows[K]?.kind === "earlier") K += E;
  let W = rows[K];
  if (W?.kind !== "job" || X.group !== W.group) return;
  let job = X.job;
  let job_2 = W.job;
  if (pendings.some((pending) => pending.id === job.id || pending.id === job_2.id)) return;
  if (job.state.backend !== "daemon" || job_2.state.backend !== "daemon") return;
  setError(null);
  let ge = X.group === "pinned" || X.group === SIMPLE_PINNED;
  if ((byGroup || simpleView) && !ge) return;
  let se = byState && !ge;
  let ne = se ? (Oe) => jobSortKey_2(Oe, X.group) : jobSortKey;
  let ae = ne(job.state);
  let me = ne(job_2.state);
  let Je = new Map();
  if (ae === me) {
    let Oe = new Set(pendings.map((pending) => pending.id));
    let De = 0;
    for (let Re of rows)
      if (Re.kind === "job" && Re.group === X.group && !Oe.has(Re.job.id)) Je.set(Re.job.id, De++);
    let we = Je.get(job.id);
    Je.set(job.id, Je.get(job_2.id));
    Je.set(job_2.id, we);
  } else {
    Je.set(job.id, me);
    Je.set(job_2.id, ae);
  }
  selection.beginReorder(job.id, K);
  roster.bumpGen();
  let le = se ? "stateSortOrder" : "sortOrder";
  roster.updateJobs((Oe) =>
    Oe
      ? sortJobs(
          Oe.map((De) => {
            let we = Je.get(De.id);
            return we === undefined
              ? De
              : {
                  ...De,
                  state: {
                    ...De.state,
                    [le]: we,
                  },
                };
          }),
        )
      : Oe,
  );
  selection.queueOrderWrites(Je, se ? "state" : "directory");
}
//@ chunk-93kwxas0.js:164309-177025 placement
/**
 * Agents 视图的键盘处理：导航、打开、派发、重命名、分组、删除、搜索、vim 模式等。
 */
function handleFleetKey(h, event) {
  let {
    editor,
    roster,
    selection,
    view,
    attach,
    storageV5,
    onAction,
    exit,
    searchKeyDown,
    vimMode,
    dispatchInputActive,
    templates,
    suggestions,
    pickSuggestion,
    applySuggestion,
    jobSessionIds,
    focusedRow,
    focused,
    openEarlier,
    openNewSessionRow,
    openOrRespawn,
  } = h.submit;
  let {
    deleteConfirm,
    rows,
    focusedIdx,
    altOpenOrigin,
    byGroup,
    hasComposedDispatch,
    headerJobs,
    groupSuggestions,
    previewOpen,
    helpOpen,
    debugOpen,
    groupEdit,
    renamingJobId,
    attachingJobId,
    showAllAgents,
    jobs,
    pendings,
    keybindings,
    simpleView,
    groupsEnabled,
    hasCredentials,
    termRows,
    canGoBack,
    originJobId,
    originSpawn,
    renameKeyDown,
    groupKeyDown,
    setQuery,
    enterInsertMode,
    setRenameDraft,
    setGroupDraft,
    readGroupDraft,
    pressExitKey,
    switchTab,
    clearRename,
    clearGroupEdit,
    headerArmId,
    ck,
    setShowAllAgents,
    setSelectedSuggestion,
    setHoveredSuggestionId,
    attachPastedImage,
  } = h;
  let rt = (Ce) => editor.setMode(Ce);
  let { setError, setHint } = editor;
  let St = () => clearFleetOfferState(attach, editor);
  if (event.key !== " ") view.cancelPeekTap();
  if (
    simpleView &&
    deleteConfirm.pending !== null &&
    !(event.ctrl && event.key === "x") &&
    event.name !== "escape"
  )
    deleteConfirm.disarm();
  let Ne = () => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  if (renamingJobId !== null || view.getSnapshot().renaming !== null) {
    Ne();
    if (event.ctrl && event.key === "c") {
      clearRename();
      return;
    }
    if (event.name === "up" || event.name === "down") return;
    renameKeyDown(event);
    return;
  }
  if (groupEdit !== null) {
    Ne();
    if (event.ctrl && event.key === "c") {
      clearGroupEdit();
      return;
    }
    if (view.getSnapshot().groupPristine) {
      if (
        event.name === "backspace" ||
        event.name === "delete" ||
        (event.ctrl && (event.key === "u" || event.key === "w" || event.key === "k"))
      ) {
        setGroupDraft("");
        view.setGroupPristine(false);
        return;
      }
      switch (event.name) {
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
          view.setGroupPristine(false);
          return;
        default:
          if (event.name.startsWith("f") && /^f\d+$/.test(event.name)) return;
          if (!event.ctrl && !event.meta) {
            setGroupDraft("");
            view.setGroupPristine(false);
            groupKeyDown(event);
            return;
          }
          return;
      }
    }
    if (groupEdit.kind === "rename") {
      if (event.name === "up" || event.name === "down") return;
      groupKeyDown(event);
      return;
    }
    let Ce = groupSuggestions;
    let trimmed = readGroupDraft().trim();
    let at = trimmed === "" || trimmed === groupEdit.cur;
    let groupPickIdx = view.getSnapshot().groupPickIdx;
    if (event.name === "down") {
      if (Ce.length > 0 && !at) view.setGroupPickIdx(Math.min(groupPickIdx + 1, Ce.length - 1));
      return;
    }
    if (event.name === "up") {
      view.setGroupPickIdx(Math.max(groupPickIdx - 1, -1));
      return;
    }
    if (event.name === "left" && groupPickIdx >= 0) {
      view.setGroupPickIdx(-1);
      return;
    }
    if (event.name === "tab") {
      if (at) return;
      let so = Ce[Math.max(groupPickIdx, 0)];
      if (so !== undefined) {
        setGroupDraft(so);
        view.setGroupPickIdx(-1);
      }
      return;
    }
    if (event.name !== "return") view.setGroupPickIdx(-1);
    groupKeyDown(event);
    return;
  }
  let resumePicker = view.getSnapshot().resumePicker;
  if (resumePicker !== null) {
    Ne();
    if ((event.ctrl && event.key === "c") || event.name === "escape" || event.meta) {
      view.closeResumePicker();
      return;
    }
    let entries = resumePicker.entries;
    let Ke = entries?.length ?? 0;
    let resumePickerIdx = view.getSnapshot().resumePickerIdx;
    if (event.name === "down" || (event.ctrl && event.key === "n")) {
      view.setResumePickerIdx(Math.min(resumePickerIdx + 1, Math.max(0, Ke - 1)));
      return;
    }
    if (event.name === "up" || (event.ctrl && event.key === "p")) {
      view.setResumePickerIdx(Math.max(resumePickerIdx - 1, 0));
      return;
    }
    if (event.name === "return") {
      let Mt = entries?.[resumePickerIdx];
      if (Mt !== undefined) {
        let so = roster.isDeleting(Mt.sessionId.slice(0, 8)) || roster.isDeletingSession(Mt.sessionId);
        if (jobSessionIds.has(Mt.sessionId) || so) {
          logFeatureSad("fleet_view_resume_picker", so ? "deleting_in_flight" : "already_in_list");
          view.refuseResumePick(Date.now());
          setError(
            so
              ? "This session is being deleted \u2014 reopen /resume once it finishes"
              : "This session is already in the list \u2014 press enter on its row",
          );
          return;
        }
        view.resumePromoteSessionId = Mt.sessionId;
        view.closeResumePicker();
        openEarlier(Mt, "resume_picker");
      }
      return;
    }
    return;
  }
  let settingPicker = view.getSnapshot().settingPicker;
  if (settingPicker !== null) {
    Ne();
    if ((event.ctrl && event.key === "c") || event.name === "escape" || event.meta) {
      view.closeSettingPicker();
      return;
    }
    let settingPickerIdx = view.getSnapshot().settingPickerIdx;
    if (event.name === "down" || (event.ctrl && event.key === "n")) {
      view.setSettingPickerIdx(Math.min(settingPickerIdx + 1, settingPicker.options.length - 1));
      return;
    }
    if (event.name === "up" || (event.ctrl && event.key === "p")) {
      view.setSettingPickerIdx(Math.max(settingPickerIdx - 1, 0));
      return;
    }
    if (event.name === "return") {
      let Ke = settingPicker.options[settingPickerIdx];
      view.closeSettingPicker();
      if (Ke !== undefined)
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
    if (Ce >= 0 && Ce < RENAME_SAVE_WAIT_MS && event.name === "return") {
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
    Ne();
    if ((event.ctrl && event.key === "c") || event.name === "escape") view.resumePromoteSessionId = null;
    return;
  }
  view.resumePromoteSessionId = null;
  if (attach.getSnapshot().newSessionOpening) {
    Ne();
    if ((event.ctrl && event.key === "c") || event.name === "escape") attach.abandonNewSession();
    return;
  }
  let fleetKeyAction = resolveFleetKeyAction(keyEventToKeystroke(event), keybindings);
  if (attachingJobId !== null) {
    Ne();
    if ((event.ctrl && event.key === "c") || event.name === "escape") {
      attach.abandonRespawnAttempt();
      let Ce = attach.disarm();
      if (Ce !== null) clearAttachBeacon(Ce, storageV5).catch(() => {});
      attach.dropWarming(attachingJobId);
      return;
    }
    if (
      !event.shift &&
      (event.name === "up" ||
        event.name === "down" ||
        (event.ctrl && (event.key === "p" || event.key === "n")))
    ) {
      if (
        suggestions.length > 0 ||
        ((event.name === "up" || event.name === "down") &&
          !previewOpen &&
          editor.getSnapshot().query.includes(`
`)) ||
        (jumpGroupHeader(h, fleetKeyAction, focusedIdx) ??
          nextFocusableRow(h, focusedIdx, event.name === "down" || event.key === "n" ? 1 : -1)) === focusedIdx
      )
        return;
      attach.abandonRespawnAttempt();
      let Ce = attach.disarm();
      if (Ce !== null) clearAttachBeacon(Ce, storageV5).catch(() => {});
    } else return;
  }
  if (event.ctrl && event.key === "c") {
    Ne();
    if (helpOpen || debugOpen) {
      view.setHelpOpen(false);
      view.setDebugOpen(false);
      return;
    }
    if (editor.getSnapshot().query) setQuery("");
    if (editor.getSnapshot().mode === "bash") rt("prompt");
    pressExitKey("Ctrl-C");
    return;
  }
  if (event.name === "escape") {
    Ne();
    if (previewOpen) view.setPreviewOpen(false);
    else if (helpOpen) view.setHelpOpen(false);
    else if (debugOpen) view.setDebugOpen(false);
    else if (showAllAgents) setShowAllAgents(false);
    else if (
      vimMode !== undefined &&
      dispatchInputActive &&
      (vimMode !== "NORMAL" || editor.getSnapshot().query !== "")
    ) {
      if (deleteConfirm.pending) deleteConfirm.dismiss();
      searchKeyDown(event);
    } else if (editor.getSnapshot().query) setQuery("");
    else if (editor.getSnapshot().mode === "bash") rt("prompt");
    else if (deleteConfirm.pending) deleteConfirm.dismiss();
    else
      switch (
        resolveExitAction({
          originJobId,
          originRowPresent:
            originJobId !== undefined && (jobs?.some((job) => job.id === originJobId) ?? false),
          originSpawn,
        }).kind
      ) {
        case "attach-origin":
          openOrRespawn(
            jobs?.find((job) => job.id === originJobId),
            "esc",
          );
          break;
        case "wait-starting":
          setError(STILL_STARTING_MESSAGE);
          break;
        case "exit-with-hint":
          if (originSpawn) originSpawn.resumeHintRequested = true;
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
    event.key !== "?" &&
    event.name !== "up" &&
    event.name !== "down" &&
    !(event.ctrl && (event.key === "p" || event.key === "n"))
  )
    view.setHelpOpen(false);
  if (
    event.shift &&
    (event.name === "up" || event.name === "down") &&
    suggestions.length === 0 &&
    !previewOpen
  ) {
    Ne();
    reorderFocusedJob(h, event.name === "up" ? -1 : 1);
    return;
  }
  if (fleetKeyAction === "agents:switchView") {
    Ne();
    if (simpleView) return;
    if (!selection.getSnapshot().draftPick) {
      selection.followId = focused?.id ?? null;
      selection.followOrigin = null;
    }
    deleteConfirm.disarm();
    let Ce = groupsEnabled ? ["state", "directory", "group"] : ["state", "directory"];
    let index = Ce.indexOf(view.getSnapshot().groupMode);
    let at = Ce[(index + 1) % Ce.length];
    if (at === "group") logFeatureOk("fleet_view_group_mode");
    view.setGroupMode(at);
    saveGlobalConfig(
      (Mt) =>
        Mt.fleetViewGroupMode === at
          ? Mt
          : {
              ...Mt,
              fleetViewGroupMode: at,
            },
      storageV5,
    );
    return;
  }
  if (fleetKeyAction === "chat:externalEditor" && !previewOpen && !simpleView) {
    Ne();
    let Ce = editPromptInEditor(editor.getSnapshot().query);
    if (Ce.content !== null && Ce.content !== editor.getSnapshot().query) setQuery(Ce.content);
    if (Ce.error) setError(Ce.error);
    return;
  }
  if (fleetKeyAction === "agents:togglePin") {
    Ne();
    let Ce = rows[selection.getSnapshot().focusedIdx];
    let job = Ce?.kind === "job" ? Ce.job : undefined;
    if (!job || pendings.some((pending) => pending.id === job.id)) return;
    let at = false;
    let Mt = at ? remoteRowIdOf(job) : undefined;
    if (at && Mt === undefined) {
      setError(STILL_STARTING_MESSAGE);
      return;
    }
    if (job.state.backend !== "daemon" && !at) {
      setError("Can't pin a session that's running in another terminal");
      logFeatureOk("fleet_view_pin_toggle");
      return;
    }
    let id = job.id;
    let vo = !(
      (at ? roster.getSnapshot().remoteJobs : roster.jobs)?.find((no) => no.id === id)?.state.pinned ??
      job.state.pinned
    );
    selection.followId = id;
    if (vo) selection.uncollapse(ck("pinned"));
    if (at && Mt !== undefined) {
      if (editor.getSnapshot().error === STILL_STARTING_MESSAGE) setError(null);
      roster
        .markRemoteRow(Mt, (no) => ({
          ...no,
          pinned: vo ? true : undefined,
        }))
        .then((no) => {
          if (no) logFeatureOk("fleet_view_pin_toggle");
          else logFleetActionFailure(setError, "fleet_view_pin_toggle");
        });
      return;
    }
    roster.bumpGen();
    roster.updateJobs(
      (no) =>
        no?.map((_e) =>
          _e.id === id
            ? {
                ..._e,
                state: {
                  ..._e.state,
                  pinned: vo,
                },
              }
            : _e,
        ) ?? no,
    );
    let zo = roster.holdJob(id);
    writeJobPinned(id, vo, storageV5)
      .then(() => {
        logFeatureOk("fleet_view_pin_toggle");
      })
      .catch((error) => {
        logError(error);
        setError(`Couldn't ${vo ? "pin" : "unpin"} \u2014 ${errorMessage(error)}`);
        logFeatureBad("fleet_view_pin_toggle", "pin_write_failed");
        roster.reload();
      })
      .finally(zo);
    return;
  }
  let pt =
    fleetKeyAction === "agents:find" && !previewOpen && !simpleView && editor.getSnapshot().mode === "prompt"
      ? parseNewSessionPrefix(editor.getSnapshot().query)
      : null;
  if (pt !== null) {
    Ne();
    let { query, cursorOffset } = editor.getSnapshot();
    let at = query.trimStart();
    let max = Math.max(0, cursorOffset - (query.length - at.length));
    editor.setQueryAndCursor(
      pt,
      vimMode === undefined ? Math.max(0, max + pt.length - at.length) : pt.length,
    );
    enterInsertMode();
    if (pt.length > at.length && view.firstImpression("find")) logFeatureOk("fleet_view_find");
    return;
  }
  let focusedIdx_2 = selection.getSnapshot().focusedIdx;
  let oo = jumpGroupHeader(h, fleetKeyAction, focusedIdx_2);
  if (oo !== null) {
    Ne();
    setError(null);
    deleteConfirm.disarm();
    if (oo !== focusedIdx_2) {
      selection.jumpToHeader(oo, rows[oo]);
      if (view.firstImpression("groupJump")) logFeatureOk("fleet_view_group_jump");
    }
    return;
  }
  if (fleetKeyAction === "agents:rename") {
    Ne();
    if (
      byGroup &&
      focusedRow?.kind === "header" &&
      focusedRow.group !== UNGROUPED &&
      focusedRow.group !== "pinned" &&
      focusedRow.group !== EARLIER
    ) {
      setGroupDraft(focusedRow.group);
      St();
      view.openGroupEdit(
        {
          kind: "rename",
          from: focusedRow.group,
        },
        true,
      );
      return;
    }
    if (!focused || pendings.some((pending) => pending.id === focused.id)) return;
    let Ce = false;
    if (Ce && !isRemoteRowId(focused.id)) {
      setError(STILL_STARTING_MESSAGE);
      return;
    }
    if (Ce && roster.isRetitling(focused.id)) {
      setError(RENAME_BUSY_TEXT);
      return;
    }
    if (!Ce && focused.state.backend !== "daemon" && !focused.state.sock) return;
    let Ke = collapseWhitespace(focused.state.name ?? "");
    if (Ce && editor.getSnapshot().error === STILL_STARTING_MESSAGE) setError(null);
    setRenameDraft(Ke);
    St();
    view.startRename(
      focused.id,
      focused.state.backend !== "daemon" ? (focused.state.sock ?? null) : null,
      Ce
        ? {
            sessionId: focused.state.sessionId,
            prefill: Ke,
          }
        : null,
    );
    return;
  }
  if (
    groupsEnabled &&
    fleetKeyAction === "agents:setGroup" &&
    !previewOpen &&
    editor.getSnapshot().query === ""
  ) {
    let at = !!focused && (pendings.some((pending) => pending.id === focused.id) || false);
    if (!focused || at || (focused.state.backend !== "daemon" && true)) {
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
    Ne();
    setGroupDraft(focused.state.group ?? "");
    St();
    view.openGroupEdit(
      {
        kind: "assign",
        jobId: focused.id,
        cur: focused.state.group,
      },
      !!focused.state.group,
    );
    return;
  }
  if (event.name === "up" || (event.ctrl && event.key === "p")) {
    Ne();
    if (suggestions.length > 0) {
      setHoveredSuggestionId(null);
      setSelectedSuggestion((Ke) => Math.max(0, Ke - 1));
      return;
    }
    if (
      event.name === "up" &&
      !previewOpen &&
      editor.getSnapshot().query.includes(`
`)
    ) {
      searchKeyDown(event);
      return;
    }
    setError(null);
    let Ce = nextFocusableRow(h, selection.getSnapshot().focusedIdx, -1);
    selection.navigateTo(Ce, rows[Ce]);
    return;
  }
  if (
    (event.name === "home" || event.name === "end" || event.name === "pageup" || event.name === "pagedown") &&
    suggestions.length === 0 &&
    !hasComposedDispatch
  ) {
    Ne();
    setError(null);
    let max = Math.max(1, termRows - 6);
    let Ke = rows.length;
    if (Ke === 0) {
      selection.setHoverFocusIdx(null);
      selection.focus(0);
      return;
    }
    let focusedIdx = selection.getSnapshot().focusedIdx;
    let Mt =
      event.name === "home"
        ? 0
        : event.name === "end"
          ? Ke - 1
          : event.name === "pageup"
            ? focusedIdx - max
            : focusedIdx + max;
    let max_2 = Math.max(0, Math.min(Ke - 1, Mt));
    selection.navigateTo(max_2, rows[max_2]);
    return;
  }
  if (event.name === "down" || (event.ctrl && event.key === "n")) {
    Ne();
    if (suggestions.length > 0) {
      setHoveredSuggestionId(null);
      setSelectedSuggestion((Ke) => Math.min(suggestions.length - 1, Ke + 1));
      return;
    }
    if (
      event.name === "down" &&
      !previewOpen &&
      editor.getSnapshot().query.includes(`
`)
    ) {
      searchKeyDown(event);
      return;
    }
    setError(null);
    let Ce = nextFocusableRow(h, selection.getSnapshot().focusedIdx, 1);
    selection.navigateTo(Ce, rows[Ce]);
    return;
  }
  if (previewOpen && event.ctrl && event.key === "x") {
    Ne();
    if (focused && pendings.some((pending) => pending.id === focused.id)) return;
    let Ce = rows[selection.getSnapshot().focusedIdx];
    let job = Ce?.kind === "job" ? Ce.job : undefined;
    if (deleteConfirm.pending !== null && job !== undefined && deleteConfirm.pending.id !== job.id)
      deleteConfirm.disarm();
    stopOrDeleteJob(h, "x", job);
    return;
  }
  if (previewOpen) return;
  if (event.name === "tab") {
    Ne();
    if (simpleView) return;
    if (!editor.getSnapshot().query && editor.getSnapshot().mode === "prompt" && templates.length > 0)
      setShowAllAgents((Ce) => !Ce);
    else if (suggestions.length > 0) applySuggestion(pickSuggestion());
    return;
  }
  if (
    event.name === "right" &&
    !event.shift &&
    !editor.getSnapshot().query &&
    editor.getSnapshot().mode === "prompt" &&
    !previewOpen
  ) {
    Ne();
    if (focusedRow?.kind === "earlier") openEarlier(focusedRow.entry, "section");
    else if (focusedRow?.kind === "newsession") openNewSessionRow(focusedRow.origin);
    else openOrRespawn(focused);
    return;
  }
  if ((event.meta || event.superKey) && event.key >= "1" && event.key <= "9") {
    Ne();
    let Ce = Number(event.key);
    let found = rows.find((at) => at.kind === "job" && at.origin === altOpenOrigin && --Ce === 0);
    if (found?.kind === "job") openOrRespawn(found.job);
    return;
  }
  if (event.name === "return") {
    submitDispatch(h.submit, event);
    return;
  }
  if (event.ctrl && event.key === "x") {
    Ne();
    if (suggestions.length > 0) return;
    if (!hasComposedDispatch && byGroup && focusedRow?.kind === "header") {
      if (focusedRow.group === "pinned" || focusedRow.group === UNGROUPED || focusedRow.group === EARLIER) {
        setError(
          `${focusedRow.group === "pinned" ? "Pinned" : focusedRow.group === UNGROUPED ? "Ungrouped" : "Past"} is reserved \u2014 can't ungroup`,
        );
        return;
      }
      selection.followOrigin = focusedRow.group;
      selection.followId = null;
      if (deleteConfirm.pending?.id !== headerArmId(focusedRow.group)) {
        deleteConfirm.arm(headerArmId(focusedRow.group));
        return;
      }
      deleteConfirm.disarm();
      stopGroup(h, focusedRow.group);
      return;
    }
    if (!hasComposedDispatch && focusedRow?.kind === "header" && headerJobs.length > 0) {
      selection.followOrigin = focusedRow.group;
      selection.followId = null;
      if (deleteConfirm.pending?.id !== headerArmId(focusedRow.group)) {
        deleteConfirm.arm(headerArmId(focusedRow.group));
        return;
      }
      deleteConfirm.disarm();
      for (let headerJob of headerJobs) {
        if (pendings.some((pending) => pending.id === headerJob.id)) continue;
        stopOrDeleteJob(h, "x", headerJob, true);
      }
      return;
    }
    if (focused && pendings.some((pending) => pending.id === focused.id)) return;
    let Ce = rows[selection.getSnapshot().focusedIdx];
    let job = Ce?.kind === "job" ? Ce.job : undefined;
    if (deleteConfirm.pending !== null && job !== undefined && deleteConfirm.pending.id !== job.id)
      deleteConfirm.disarm();
    stopOrDeleteJob(h, "x", job);
    return;
  }
  if (event.ctrl && event.key === "d" && (simpleView || editor.getSnapshot().query === "")) {
    Ne();
    if (helpOpen || view.getSnapshot().debugOpen) {
      view.setDebugOpen(false);
      return;
    }
    let snapshot = editor.getSnapshot();
    if (snapshot.mode === "bash" && snapshot.query === "") rt("prompt");
    pressExitKey("Ctrl-D");
    return;
  }
  if (event.ctrl) event.key;
  if (event.key === "?" && editor.getSnapshot().query === "" && editor.getSnapshot().mode === "prompt") {
    Ne();
    let helpOpen = view.getSnapshot().helpOpen;
    if (!helpOpen) St();
    view.setHelpOpen(!helpOpen);
    logEvent("tengu_bg_agent_action", {
      action: lit("help_toggled"),
    });
    return;
  }
  if (isPasteImageKey(event) && !simpleView) {
    Ne();
    pasteImageFromClipboard(
      (Ce) =>
        attachPastedImage(Ce.base64, {
          mediaType: Ce.mediaType,
          dimensions: Ce.dimensions,
        }),
      setHint,
    );
    return;
  }
  if (
    isFleetDispatchEnabled() &&
    !simpleView &&
    isBashModeChar(event.key) &&
    !editor.getSnapshot().query &&
    editor.getSnapshot().mode === "prompt"
  ) {
    Ne();
    rt("bash");
    return;
  }
  if (event.name === "backspace" && !editor.getSnapshot().query && editor.getSnapshot().mode === "bash") {
    Ne();
    rt("prompt");
    return;
  }
  if (simpleView && !previewOpen && renamingJobId === null) {
    if (event.key === "q" && !event.ctrl && !event.meta) {
      Ne();
      pressExitKey("Ctrl-C");
    }
    if (event.key === "l" && !event.ctrl && !event.meta && !hasCredentials) {
      Ne();
      onAction({
        type: "login",
      });
    }
    return;
  }
  searchKeyDown(event);
}
//@ chunk-93kwxas0.js:177067-177083 placement
var EMPTY_REPO_UPDATES = {};
var EMPTY_CATALOG_STATE = {};
//@ chunk-93kwxas0.js:177083-178405 placement
/**
 * 派发建议数据存储（模板、技能、routine、子仓库、worktree）。
 */
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
    this.#e = {
      ...this.#e,
      ...h,
    };
    this.#n.emit();
  }
  loadLauncher(h) {
    this.#r(h, {
      rescanKnown: false,
    });
  }
  refreshLauncher(h) {
    this.#r(h, {
      rescanKnown: true,
    });
  }
  #r(h, { rescanKnown }) {
    if (this.#l.has(h)) return;
    let k = [];
    if (rescanKnown || !this.#e.childRepos.has(h))
      k.push(
        findGitRoot(h).then((gitRoot) => {
          let x = updateCatalogEntry(this.#e.childRepos, h, gitRoot, EMPTY_REPO_UPDATES);
          if (x)
            this.#t({
              childRepos: x,
            });
        }),
      );
    if (rescanKnown || !this.#e.repoWorktrees.has(h))
      k.push(
        listRepoWorktrees(h)
          .then((C) => {
            if (C === null) return;
            let x = updateCatalogEntry(this.#e.repoWorktrees, h, C, EMPTY_CATALOG_STATE);
            if (x)
              this.#t({
                repoWorktrees: x,
              });
          })
          .catch(() => {}),
      );
    if (k.length === 0) return;
    this.#l.add(h);
    Promise.all(k).finally(() => {
      this.#l.delete(h);
    });
  }
  loadTarget(h, E) {
    let k = false;
    if (!this.#e.templates.has(h))
      listUserAgentTemplates(h, E)
        .catch(() => [])
        .then((C) => {
          if (!k && !this.#e.templates.has(h))
            this.#t({
              templates: new Map(this.#e.templates).set(h, C),
            });
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
              (T.type !== "prompt" && DISPATCH_FLAG_HINTS.get(T.name)) ||
              getFirstLine(getHumanFacingDescription(T) ?? ""),
          }));
          this.#t({
            skills: new Map(this.#e.skills).set(h, mapped),
          });
        });
    return () => {
      k = true;
    };
  }
}
//@ chunk-93kwxas0.js:178405-178444 placement
function ensureFleetCatalog(h) {
  return (h.scope ??= new FleetCatalogStore());
}
//@ chunk-93kwxas0.js:178444-178556 placement
/**
 * 目录项变化时返回新 Map，否则 null。
 */
function updateCatalogEntry(h, E, k, C) {
  let x = Object.keys(k).length > 0 ? k : C;
  if (isDeepStrictEqual(h.get(E), x)) return null;
  return new Map(h).set(E, x);
}
//@ chunk-93kwxas0.js:178556-178560 placement
init_react_production();
//@ chunk-93kwxas0.js:178560-178586 placement
var NEEDS_INPUT_PREVIEW_CHARS = 120;
var IDLE_SEED = "idle-seed";
//@ chunk-93kwxas0.js:178586-179308 placement
/**
 * 比较会话所在分区的变化，生成"需要输入/已完成"通知。
 */
function diffJobBands(h, E) {
  let k = new Map();
  let C = [];
  let x = [];
  for (let T of E) {
    let A = h.get(T.id);
    let L = T.band === "blocked" && T.needs === IDLE_NEEDS;
    k.set(T.id, L ? (A ?? IDLE_SEED) : T.band);
    if (A === undefined || A === T.band || L) continue;
    switch (T.band) {
      case "blocked":
        C.push({
          message: T.needs
            ? `${T.label} needs your input: ${truncateWithEllipsis(T.needs, NEEDS_INPUT_PREVIEW_CHARS)}`
            : `${T.label} needs your input`,
          notificationType: "agent_needs_input",
        });
        x.push({
          sessionId: T.sessionId,
          kind: "needs_input",
        });
        break;
      case "completed":
        if (T.outcome !== "stopped" && !T.selfDriving && !(A === IDLE_SEED && T.outcome === "success")) {
          C.push({
            message: `${T.label} ${T.outcome === "failure" ? "failed" : "finished"}`,
            notificationType: "agent_completed",
          });
          x.push({
            sessionId: T.sessionId,
            kind: "completed",
          });
        }
        break;
      case "active":
        break;
    }
  }
  return {
    next: k,
    notifications: C,
    notified: x,
  };
}
//@ chunk-93kwxas0.js:179308-179650 placement
/**
 * 会话分区变化时发通知的 hook。
 */
function useJobBandNotifications(h, E) {
  let terminalNotification = useTerminalNotification();
  let { storageV5, credentials } = useTheme_2();
  let T = R(new Map());
  P(() => {
    let { next: A, notifications, notified } = diffJobBands(T.current, h);
    T.current = A;
    for (let notification of notifications)
      notifyAsync(notification, terminalNotification, {
        storageV5,
        credentials,
      });
    let now = Date.now();
    for (let U of notified)
      if (markAgentsNotified(E, U.sessionId, U.kind, now))
        logEvent("tengu_bg_agent_notification", {
          kind: fromEnum(U.kind),
          jobSessionId: sanitizeMarkName(U.sessionId),
        });
  });
}
//@ chunk-93kwxas0.js:179650-179660 placement
var EMPTY_REMOTE_JOBS = [];
//@ chunk-93kwxas0.js:179660-199227 placement
/**
 * Agents（fleet）视图主组件：管理会话名单、选择、编辑器、附加与派发。
 */
function FleetView({
  onAction,
  initialJobId,
  originJobId,
  originSpawn,
  cwdFilter,
  dispatchDefaults,
  typedAgent,
  canGoBack,
  autoOpenJobId,
  entryChannel,
  relaunchTab,
  typedAhead,
  fromLauncher,
  awayLoop,
  host,
  storageV5,
}) {
  let clock = useClock();
  let { stdin, isRawModeSupported } = useStdin();
  let { credentials } = useTheme_2();
  let keybindings = useFleetBindings();
  let me = isAgentsSimpleViewEnabled();
  let Je = !me || !!initialJobId?.startsWith("remote-");
  let le = false;
  useTimeout(
    () => {
      if (!isRawModeSupported) return;
      let ee = stdin.listenerCount("readable");
      if (ee > 1)
        logEvent("tengu_fleetview_stdin_contention", {
          listeners: ee,
        });
    },
    1500,
    [],
  );
  let [Oe] = y(() => awayLoop ?? createNotifiedState());
  let [De] = y(() => host ?? createFleetViewHost());
  let [roster] = y(() => ensureFleetRoster(De, storageV5));
  let {
    jobs,
    adoptedPeers,
    remoteJobs,
    remoteListLoaded,
    remoteListFailure,
    remoteListHasOlder,
    pendings,
    prStatuses,
    loopKicks,
    overlaidLoadLanded,
  } = useStoreSelector(roster);
  let [ke] = y(() => ensureFleetSelection(De, roster, storageV5));
  let { focusedIdx, hoverFocusIdx, collapsed, capExpanded, draftPick, followOrigin } = useStoreSelector(ke);
  let Ot = false;
  let Yt = R(false);
  let [Ue] = y(() => ensureFleetViewStore(De, Ot, "local"));
  let {
    groupMode,
    activeTab,
    groupEdit,
    resumePicker,
    settingPicker,
    renaming,
    previewOpen,
    helpOpen,
    debugOpen,
  } = useStoreSelector(Ue);
  let [$e] = y(() => ensureFleetLiveStatus(De));
  let { attachingJobId, autoOpened } = useStoreSelector($e);
  let [We] = y(() => ensureFleetEditor(De));
  let { mode, expandHintPasteId } = useStoreSelector(We);
  let [He] = y(() =>
    ensureDeleteConfirmStore(De, {
      onArm: () => clearFleetOfferState($e, We),
    }),
  );
  let { pending } = useStoreSelector(He);
  useTimeout(() => He.disarm(), pending ? 2000 : null, [pending]);
  let [vt] = y(() => ({
    roster,
    selection: ke,
    view: Ue,
    attach: $e,
    editor: We,
    deleteConfirm: He,
    earlier: De.earlier,
  }));
  let { setError, setHint } = We;
  let jobId = renaming?.jobId ?? null;
  let St = Je ? remoteJobs : EMPTY_REMOTE_JOBS;
  P(() => {
    roster.setRemoteWanted(Je);
  }, [roster, Je]);
  P(() => roster.attachView(clock), [roster, clock]);
  let cwd = getCwd();
  let launcherGroup = canonicalRepoRoot({
    cwd,
  });
  let [Kt, po] = y(cwd);
  P(() => {
    let ee = false;
    canonicalizePath(cwd, getRealPathOptions(storageV5)).then((Ve) => {
      if (!ee && Ve !== cwd) po(Ve);
    });
    return () => {
      ee = true;
    };
  }, [cwd, storageV5]);
  let At =
    cwdFilter &&
    !jobMatchesCwd(
      {
        cwd: Kt,
      },
      cwdFilter,
    )
      ? cwdFilter
      : Kt;
  let [pt, Nt] = y(cwd);
  let oo = activeTab === "remote" ? At : pt;
  let [Ce] = y(() => ensureFleetCatalog(De));
  let { templates, skills, routines, childRepos, repoWorktrees } = useStoreSelector(Ce);
  P(() => {
    Ce.loadLauncher(cwd);
  }, [Ce, cwd]);
  let vo = childRepos.get(cwd) ?? EMPTY_REPO_UPDATES;
  let zo = repoWorktrees.get(cwd) ?? EMPTY_CATALOG_STATE;
  let joined = uniq([...(jobs ?? []), ...adoptedPeers].map((ee) => spawnOrigin(ee.state)))
    .sort()
    .join("\x00");
  let { allRepos, worktreeBranches } = Q(() => {
    let ee = {
      ...vo,
    };
    for (let et of joined ? joined.split("\x00") : []) {
      let Xt = basename(et);
      if (Xt && !/\s/.test(Xt) && ee[Xt] === undefined) ee[Xt] = et;
    }
    let Ve = {};
    for (let [key, value] of Object.entries(zo)) {
      if (ee[key] === undefined) ee[key] = value.path;
      if (ee[key] === value.path) Ve[key] = value.branch;
    }
    return {
      allRepos: ee,
      worktreeBranches: Ve,
    };
  }, [vo, joined, zo]);
  let go = () =>
    onAction({
      type: "done",
    });
  let No = R("Ctrl-C");
  let Qo = useDoublePress((ee) => {
    if (ee) Cn();
    Ue.setExitPending(ee ? No.current : null);
  }, go);
  let Po = (ee) => {
    No.current = ee;
    Qo();
  };
  let xe = () => {
    Ue.clearRename();
    setQuery_2("");
  };
  let qt = (ee, Ve) => groupCollapseKey(Ve ?? Ue.getSnapshot().groupMode, ee);
  let headerArmId = (ee) => `header:${Ue.getSnapshot().groupMode}:${ee}`;
  let earlierEntries = useStoreSelector(De.earlier, (ee) => ee.entries);
  P(() => {
    if (cwdFilter || !shouldListPastSessions()) {
      if (!cwdFilter) De.earlier.clear();
      return;
    }
    let ee = false;
    let Ve = De.earlier.beginLoad();
    listPastSessions(new Set(), false, storageV5)
      .finally(() => {
        De.earlier.endLoad(Ve);
      })
      .then((et) => {
        if (et === null) logFeatureBad("fleet_view_earlier_load", "load_failed");
        else logFeatureOk("fleet_view_earlier_load");
        if (!ee && (et === null || et.length === 0) && !initialJobId && ke.restoreAttempts === 1)
          ke.restoreAttempts = 2;
        if (et === null) return;
        De.earlier.setEntries(et);
        if (!ee && et.length > 0)
          logEvent("tengu_fleetview_earlier_loaded", {
            count: et.length,
          });
      });
    return () => {
      ee = true;
    };
  }, []);
  let toggleCollapse = (ee) => ke.toggleCollapsed(qt(ee), Ue.getSnapshot().groupMode === "state" ? ee : null);
  let terminalFocus = useTerminalFocus();
  P(() => {
    if (terminalFocus) roster.resetPrFetchGate();
  }, [roster, terminalFocus]);
  let Ho = useAppState((ee) => ee.autoUpdaterResult?.status === "success");
  let { columns, rows } = useTerminalSize();
  let { pathOwnRow } = useDispatchWindowDefaults(We, dispatchDefaults);
  let [kn] = y(() => Date.now());
  let Qr = R(null);
  let Xr = R(null);
  useFocusOnMount(Xr, jobs !== null && !previewOpen);
  let voiceAvailable = useVoiceAvailable();
  let vn = useAppState((ee) => ee.settings.voice?.mode ?? "hold");
  let getVoiceState = useGetVoiceState();
  let un = () => {
    let ee = ke.focusedRow();
    let job = ee?.kind === "job" ? ee.job : undefined;
    if (!job) return;
    ui(false);
    let previewOpen = Ue.getSnapshot().previewOpen;
    if (!previewOpen) {
      ke.followId = job.id;
      Cn();
    }
    Ue.setPreviewOpen(!previewOpen);
  };
  let Nn =
    !me &&
    !previewOpen &&
    jobId === null &&
    groupEdit === null &&
    attachingJobId === null &&
    resumePicker === null &&
    settingPicker === null;
  let {
    query,
    queryRef,
    setQuery,
    willInsertNewline,
    setCursorOffset,
    handleKeyDown,
    handlePaste,
    vimMode,
    enterInsertMode,
  } = useSearchInput({
    buffer: We,
    isActive: Nn,
    multiline: true,
    honorEditorMode: true,
    onExit: () => {},
    onCancel: jobs === null ? () => Po("Ctrl-C") : undefined,
    onSpaceOnEmpty: () => {
      if (We.getSnapshot().mode === "bash") return;
      if (voiceAvailable && vn !== "tap")
        Ue.schedulePeekTap(
          (ee) => clock.setTimeout(ee, PREVIEW_BACK_TIMEOUT_MS),
          () => {
            let voiceState = getVoiceState();
            if (voiceState.voiceState !== "idle" || voiceState.voiceWarmingUp) return;
            if (queryRef.current.trim() !== "") return;
            un();
          },
        );
      else un();
    },
  });
  useIdeMcpClients((ee) => {
    let { query, cursorOffset } = We.getSnapshot();
    We.insertText(formatAtMention(ee, query[cursorOffset - 1]));
  });
  let So = cacheImagePath(() => We.pastes, handlePaste, {
    onMinted: We.noteMintedPaste,
  });
  P(() => {
    We.pruneOrphanedPastes();
  }, [We, query]);
  useTimeout(() => We.setExpandHintPasteId(null), expandHintPasteId === null ? null : 8000, [
    expandHintPasteId,
  ]);
  let [zi] = y(() => ({
    get value() {
      return We.getSnapshot().query;
    },
    get cursorOffset() {
      return We.getSnapshot().cursorOffset;
    },
    setValueWithCursor: (ee, Ve) => We.setQueryAndCursor(ee, Ve),
  }));
  let voiceIntegration = useVoiceIntegration({
    composer: zi,
    isActive: Nn,
  });
  let jo = useAppState_2((ee) => ee.voiceState);
  P(() => {
    if (jo !== "idle") Ue.cancelPeekTap();
  }, [Ue, jo]);
  let { handleKeyDown: handleKeyDown_2 } = useVoiceKeybindingHandler({
    voiceHandleKeyEvent: voiceIntegration.handleKeyEvent,
    voiceCancelRecording: voiceIntegration.cancelRecording,
    stripTrailing: voiceIntegration.stripTrailing,
    resetAnchor: voiceIntegration.resetAnchor,
    isActive: (vn !== "tap" || query.trim().length > 0) && mode !== "bash" && Nn,
    composer: zi,
  });
  let Ta = useAppState((ee) => isReducedMotion(ee.settings.prefersReducedMotion));
  let showCursor = jo === "recording" && !Ta;
  DispatchModeLine({
    editor: We,
    selection: ke,
    query,
    dispatchMode: mode,
    collapsed,
    canonicalLauncherCwd: Kt,
    storageV5,
  });
  useAttachFleetOwners(vt, {
    clock,
    groupsEnabled: Ot,
  });
  let Cn = () => clearFleetOfferState($e, We);
  let fn = Q(modelSuggestions, []);
  let {
    query: query_2,
    queryRef: queryRef_2,
    setQuery: setQuery_2,
    cursorOffset,
    handleKeyDown: handleKeyDown_3,
    handlePaste: handlePaste_2,
  } = useSearchInput({
    isActive: jobId !== null,
    honorEditorMode: true,
    backspaceExitsOnEmpty: false,
    onExit: () => submitRename(od()),
    onCancel: xe,
  });
  let ar = () => {
    Ue.closeGroupEdit();
    setQuery_3("");
  };
  let {
    query: query_3,
    queryRef: queryRef_3,
    setQuery: setQuery_3,
    cursorOffset: cursorOffset_2,
    handleKeyDown: handleKeyDown_4,
    handlePaste: handlePaste_3,
  } = useSearchInput({
    isActive: groupEdit !== null,
    backspaceExitsOnEmpty: false,
    onExit: () => submitGroupEdit(od()),
    onCancel: ar,
  });
  let Xi = Q(() => {
    let ee = new Set();
    for (let Ve of jobs ?? []) if (Ve.state.group) ee.add(Ve.state.group);
    for (let remoteJob of remoteJobs) if (remoteJob.state.group) ee.add(remoteJob.state.group);
    return ee;
  }, [jobs, remoteJobs]);
  let Wo = Q(() => {
    if (!groupEdit) return [];
    let ee = new Set();
    if (groupEdit.kind === "assign") {
      let group = (
        jobs?.find((job) => job.id === groupEdit.jobId) ??
        remoteJobs.find((remoteJob) => remoteRowIdOf(remoteJob) === groupEdit.jobId)
      )?.state.group;
      if (group) ee.add(group);
    } else ee.add(groupEdit.from);
    let trimmed = query_3.trim();
    let lower = trimmed.toLowerCase();
    return [...Xi]
      .filter((Xt) => !ee.has(Xt) && Xt.toLowerCase().startsWith(lower))
      .sort((Xt, to) => {
        let _o = Xt.startsWith(trimmed);
        let Go = to.startsWith(trimmed);
        return _o !== Go ? (_o ? -1 : 1) : Xt.localeCompare(to);
      });
  }, [groupEdit, Xi, jobs, remoteJobs, query_3]);
  let trimmed = query_3.trim();
  let Zi = trimmed !== "" && isReservedGroupName(trimmed);
  let isNew =
    groupEdit !== null &&
    trimmed !== "" &&
    !Zi &&
    !Xi.has(trimmed) &&
    !(groupEdit.kind === "rename" && groupEdit.from === trimmed);
  let matchesExisting = Wo.includes(trimmed);
  let joined_2 = Wo.join(`
`);
  P(() => {
    Ue.setGroupPickIdx(
      groupEdit?.kind === "assign" && trimmed !== "" && trimmed !== groupEdit.cur && Wo.length > 0 ? 0 : -1,
    );
  }, [joined_2, trimmed]);
  let panelOpen =
    groupEdit?.kind === "assign" && trimmed !== "" && trimmed !== groupEdit.cur && Wo.length > 0;
  let Aa = templates.get(cwd) ?? EMPTY_AGENT_SUGGESTIONS;
  let ag = routines.get(cwd) ?? EMPTY_SKILL_SUGGESTIONS;
  let mentionedTemplate = findMentionedTemplate(query, allRepos, Aa, ag);
  let Bn = mentionedTemplate ?? oo;
  let fu = templates.get(Bn) ?? EMPTY_AGENT_SUGGESTIONS;
  let Jn = Q(() => mergeSuggestionsByName(fu, Aa), [fu, Aa]);
  let La = skills.get(Bn) ?? skills.get(cwd) ?? EMPTY_SKILL_SUGGESTIONS;
  let _n = routines.get(Bn) ?? routines.get(cwd) ?? EMPTY_SKILL_SUGGESTIONS;
  let ur = prependModeCharacterToInput(query, mode, jobs, cwdFilter);
  let cr = Q(
    () =>
      parseDraftInput(query, mode, ur, {
        templates: Jn,
        allRepos,
        routines: _n,
      }),
    [mode, ur, query, Jn, allRepos, _n],
  );
  let mu = ce(
    (ee) =>
      relaunchAgentsView(ee, {
        cwdFilter,
        dispatchDefaults,
        typedAgent,
        activeTab,
        onError: setError,
      }),
    [cwdFilter, dispatchDefaults, typedAgent, activeTab],
  );
  useInterval(
    () => {
      let ee = Number(process.env[CLAUDE_AGENTS_AUTO_RELAUNCHED_AT]) || 0;
      if (Date.now() - ee < RELAUNCH_COOLDOWN_MS) return;
      if (Date.now() - getLastInteractionTime() < RELAUNCH_RECENT_MS) return;
      mu("auto");
    },
    Ho && !terminalFocus ? RELAUNCH_RECENT_MS : null,
  );
  let [pr, ui] = y(false);
  let [Da, gu] = y(0);
  let [Va, Ba] = y(null);
  P(() => {
    if (query && pr) ui(false);
  }, [query, pr]);
  P(() => {
    if (Da !== 0) gu(0);
  }, [query, pr, Bn]);
  let [dg, hu] = Uy((ee) => ee + 1, 0);
  let lg = Q(
    () =>
      buildDispatchSuggestions(query, {
        templates: Jn,
        routines: _n,
        repos: allRepos,
        worktreeBranches,
        skills: La,
        models: fn,
        dispatch: cr,
        showAllAgents: pr,
      }),
    [query, Jn, _n, allRepos, worktreeBranches, La, fn, cr, pr, dg],
  );
  let { firstWord, isSlashQuery, atMatch, slashMatch, modelArgMatch, templateNames, repoNames, suggestions } =
    lg;
  P(() => {
    if (atMatch) Ce.refreshLauncher(cwd);
  }, [atMatch, Ce, cwd]);
  let bu = (ee) => {
    Ba(null);
    if (ee.kind === "model" && modelArgMatch) {
      setQuery(`/model ${ee.name}`);
      return;
    }
    let Ve = SUGGESTION_KIND_LABELS[ee.kind];
    setQuery(atMatch || slashMatch ? replaceTrailingMention(query, Ve, ee.name) : `${Ve}${ee.name} `);
  };
  let pickSuggestion = () =>
    (Va ? suggestions.find((suggestion) => `${suggestion.kind}:${suggestion.name}` === Va) : undefined) ??
    suggestions[Math.min(Da, suggestions.length - 1)];
  let Ga = Q(
    () =>
      buildJobActions(
        roster.reload,
        (followId) => {
          ke.followId = followId;
        },
        roster.optimistic,
        roster.noteDeleteRefusal,
        roster.deleteRefusalOf,
        storageV5,
      ),
    [roster, ke, storageV5],
  );
  let onStop = ce(
    async (ee) => {
      let found = Ga.find((et) => et.label === "stop");
      if (!found) throw Error("the stop action is missing");
      await found.run(ee, {
        bulk: false,
      });
    },
    [Ga],
  );
  P(() => {
    logForDebugging("[PERF:bg-remount-end]");
    logFeatureOk("screen_fleet_view");
  }, []);
  let Ua = ce(
    () =>
      pruneReplyDrafts(We, roster, {
        jobs,
        pendings,
        adoptedPeers,
        remoteJobs: St,
        remoteListLoaded,
      }),
    [We, roster, jobs, pendings, adoptedPeers, St, remoteListLoaded],
  );
  P(() => {
    Ua();
  }, [Ua]);
  useInterval(() => {
    if (We.hasReplyDrafts()) Ua();
  }, 15000);
  let wu = R(null);
  let Ka = ce(() => {
    let ee = wu.current;
    wu.current = null;
  }, [storageV5]);
  let debouncedCallback = useDebouncedCallback(Ka, 300);
  P(() => Ka, [Ka]);
  let switchTab = (ee) => {
    if (ee === Ue.getSnapshot().activeTab) return;
    if (ee === "remote" && !returnFalseAttention()) return;
    Ue.setActiveTab(ee);
    setHint(null);
    setError(null);
    ke.followOrigin = null;
    He.disarm();
    if (ee === "remote") roster.loadRemote();
  };
  let Eu = (ee) => roster.liveStatus(ee);
  let peersEnabled =
    isCrossSessionMessagingEnabled() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_fleetview_peers", false);
  let [wg, Sg] = y(() => Date.now());
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let ageNow = isScreenReaderEnabled ? wg : undefined;
  let now = Date.now();
  let ku = Q(() => new Set((jobs ?? []).filter((ee) => isLoopJob(ee.state)).map((ee) => ee.id)), [jobs]);
  let any = (jobs ?? []).some((ee) => {
    if (!ku.has(ee.id)) return false;
    let nextAt = loopKicks.get(ee.state.sessionId)?.nextAt;
    return nextAt != null && nextAt > now && nextAt - now < 60000;
  });
  useInterval(
    () => Sg(Date.now()),
    isScreenReaderEnabled ? DISPATCH_TIMEOUT_MS : any ? 1000 : jobs?.length || St.length ? 30000 : null,
  );
  P(() => {
    claimSpareFromPool(At, true, dispatchDefaults, templates.get(At), storageV5);
  }, [At, dispatchDefaults, templates, storageV5]);
  P(() => {
    if (De.agentLastUsedMigrationDone) return;
    De.agentLastUsedMigrationDone = true;
    backfillAgentLastUsed(storageV5).then((ee) => {
      if (ee) hu();
    });
  }, [De, storageV5]);
  P(() => Ce.loadTarget(Bn, storageV5), [Ce, Bn, storageV5]);
  let { addNotification } = useNotifications();
  let selection = useSelection();
  let onCopied = (ee) => {
    addNotification(buildCopiedNotification(ee));
  };
  let copyOnSelect = useCopyOnSelect(selection, true, onCopied);
  useSelectionBgColor(selection);
  let _u = modalPagerAction(selection, copyOnSelect, onCopied);
  useSelectionClearKeybinding(selection);
  zt(() => {
    let ee = getSecondRootError().get(process.stdout);
    if (!ee) return;
    ee.onHyperlinkClick = (Ve) => {
      let et = false;
      let { activeTab, previewOpen } = Ue.getSnapshot();
      let { error } = We.getSnapshot();
      openClickedLink(Ve);
    };
    return () => {
      ee.onHyperlinkClick = undefined;
    };
  }, [Ue, We, false]);
  let showRemoteTabs = false;
  let hasCredentials = Q(() => getAuthTokenSource().hasToken, []);
  let Tu = CloudListFailureNotice({
    onCloudTab: activeTab === "remote" && !me && !previewOpen,
    remoteJobs: St,
    remoteListLoaded,
    remoteListFailure,
  });
  let Ou = false;
  let fleetRows = buildFleetRows({
    jobs,
    adoptedPeers,
    remoteJobs: St,
    pendings,
    prStatuses,
    liveStatus: Eu,
    heldInTerminal: (ee) => roster.terminalHolderOf(ee) !== undefined,
    loopJobIds: ku,
    loopKicks,
    focusedIdx,
    hoverFocusIdx,
    followOrigin,
    collapsed,
    capExpanded,
    groupMode,
    activeTab,
    query,
    mode,
    dispatch: cr,
    linkMatchId: ur,
    dispatchRepoCwd: mentionedTemplate,
    pendingDelete: pending,
    earlierEntries,
    cwdFilter,
    initialJobId,
    simpleView: me,
    simpleWantsRemote: Je,
    peersEnabled,
    showRemoteTabs,
    launcherCwd: cwd,
    launcherGroup,
    scopedFallbackOrigin: At,
    termRows:
      rows - (Tu !== null && St.length > 0 ? CLOUD_LIST_ATTEMPTS : 0) - (pathOwnRow ? 1 : 0) - (Ou ? 1 : 0),
    columns,
    now,
    ageNow,
  });
  let {
    byState,
    byGroup,
    hasComposedDispatch,
    scopedLocalJobs,
    scopedJobs,
    filtered,
    groupOf,
    jobSessionIds,
    doneCap,
    simpleBuilt,
    built,
    rows: rows_2,
    homeIdx,
    onlyOrigin,
    isOnboarding,
    focusedRow,
    focused,
    altOpenOrigin,
    dispatchOrigin,
    focusIsFromHover,
    headerJobs,
    isBashDispatch,
    queryIsFilter,
    hasNameFilter,
  } = fleetRows;
  let mi = (ee) => rows_2.findIndex((Ve) => Ve.kind === "job" && Ve.job.id === ee);
  $e.releasePromoted(jobSessionIds);
  if (me && Ue.firstImpression("simple")) logFeatureOk("fleet_view_simple");
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
    let ee = (et) => isOtherLocalDaemonJob(et, originJobId) && !roster.isHolding(et.id);
    let Ve = (et) => jobTempo(et.state) === "completed";
    emitFinishedJobs(De.resultSeen, {
      visibleFinished: rows_2
        .filter((et) => et.kind === "job")
        .map((et) => et.job)
        .filter((et) => ee(et) && Ve(et)),
      allFinished: jobs.filter((job) => ee(job) && Ve(job)),
      allCandidates: jobs.filter(ee),
    });
  }, [De, roster, rows_2, jobs, originJobId, overlaidLoadLanded]);
  let Fg = Q(() => env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE, []);
  useTerminalTitle(
    Fg ? null : terminalTitle(count(scopedJobs, (ee) => jobTempo(ee.state, Eu(ee)) === "blocked")),
  );
  useJobBandNotifications(
    scopedLocalJobs
      .filter((scopedLocalJob) => isLocalDaemonAgent(scopedLocalJob.state))
      .map((scopedLocalJob) => ({
        id: scopedLocalJob.id,
        sessionId: scopedLocalJob.state.sessionId,
        band: jobTempo(scopedLocalJob.state),
        label: getJobTitle(scopedLocalJob.state, scopedLocalJob.id === initialJobId),
        needs: scopedLocalJob.state.needs,
        outcome: terminalOutcome(scopedLocalJob.state.state),
        selfDriving: isSelfDriving(scopedLocalJob.state),
      })),
    Oe,
  );
  let Pg = ke.followId ?? focused?.id ?? focusedRow?.group;
  P(() => {
    if (He.pending !== null && He.pending.id === ke.followId) return;
    He.disarm();
  }, [Pg]);
  zt(() => {
    ke.syncRows(rows_2);
    if (!ke.getSnapshot().draftPick) return;
    if (!queryIsFilter) ke.releasePick(rows_2, homeIdx, !hasComposedDispatch && !byGroup);
    else if (hasNameFilter && !ke.followId) ke.followPick(homeIdx, rows_2[homeIdx]);
  });
  P(() => {
    if (pendings.length === 0 || !jobs) return;
    let filtered = pendings.filter((pending) => jobs.some((job) => job.id === pending.id));
    if (filtered.length === 0) return;
    roster.settleLandedPendings(filtered);
    let followId = ke.followId;
    if (followId && filtered.some((et) => et.id === followId)) {
      let et = mi(followId);
      if (et >= 0) ke.focus(et);
    }
  }, [roster, ke, pendings, jobs]);
  P(() => {
    if (ke.isFirstQueryOfLook()) return;
    if (We.takeProgrammaticChange()) return;
    setError(null);
    setHint(null);
    if (!queryIsFilter) return;
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
    ke.clearFollow();
    ke.focus(homeIdx);
  }, [query]);
  P(() => {
    if (focusIsFromHover || (!byState && (draftPick || ke.getSnapshot().draftPick))) return;
    if (pt !== dispatchOrigin) Nt(dispatchOrigin);
  }, [dispatchOrigin, focusIsFromHover, draftPick, byState, pt]);
  P(() => {
    ke.clampFocus(rows_2.length);
  }, [ke, rows_2.length]);
  P(() => {
    if (ur) {
      ke.savedFocusJobId = null;
      return;
    }
    if (!hasComposedDispatch) {
      let savedFocusJobId = ke.savedFocusJobId;
      ke.savedFocusJobId = null;
      if (savedFocusJobId && hasNameFilter) ke.returnPickTo(savedFocusJobId);
      else if (savedFocusJobId) {
        ke.followOrigin = null;
        ke.followId = savedFocusJobId;
        let Go = mi(savedFocusJobId);
        if (Go >= 0) ke.focus(Go);
      }
      return;
    }
    let focusedIdx = ke.getSnapshot().focusedIdx;
    let Ve = rows_2[focusedIdx];
    if (Ve?.kind === "job" && ke.savedFocusJobId === null) ke.savedFocusJobId = Ve.job.id;
    let et = (_o) => rows_2.findIndex((Go) => Go.kind === "header" && _o(Go));
    let Xt = -1;
    let to = null;
    if (byState) to = "working";
    else if (mentionedTemplate) {
      Xt = et((_o) => _o.origin === mentionedTemplate && _o.group !== "pinned");
      if (Xt >= 0) to = rows_2[Xt].group;
    } else if (Ve?.kind === "job") {
      if (Ve.group === "pinned")
        to =
          rows_2.find((Go) => Go.kind === "header" && Go.origin === Ve.origin && Go.group !== "pinned")
            ?.group ?? null;
      else to = Ve.group;
    } else if (Ve?.kind === "header") {
      if (Ve.group !== "pinned") {
        to = Ve.group;
        Xt = focusedIdx;
      }
    }
    if (Xt < 0) return;
    ke.followId = null;
    ke.followOrigin = to;
    if (Xt !== focusedIdx) ke.focus(Xt);
  }, [hasComposedDispatch, byState, mentionedTemplate]);
  let Vu =
    previewOpen &&
    (filtered.length === 0 ||
      (focusedRow !== undefined && focusedRow.kind !== "job") ||
      (focusedRow === undefined && (ke.followId === null || mi(ke.followId) < 0)));
  P(() => {
    if (Vu) Ue.setPreviewOpen(false);
  }, [Vu]);
  let Bu = R(false);
  P(() => {
    if (ke.restoreAttempts >= 2 || jobs === null) return;
    let ee = !!initialJobId?.startsWith("remote-");
    let Ve = ee && St.some((to) => to.id === initialJobId);
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
    ke.restoreCountedJobs = jobs;
    ke.restoreAttempts++;
    let et = () => {
      let to = rows_2[homeIdx];
      if (hasNameFilter) {
        ke.followPick(homeIdx, to);
        return;
      }
      ke.focus(homeIdx);
      if (to?.kind === "job") {
        ke.followId = to.job.id;
        ke.followOrigin = null;
      } else if (to?.kind === "earlier") {
        ke.followId = null;
        ke.followOrigin = null;
      } else if (to?.kind === "header") {
        ke.followId = null;
        ke.followOrigin = to.group;
      }
    };
    if (!initialJobId) {
      ke.restoreAttempts =
        rows_2.some((to) => to.kind === "job" || to.kind === "earlier") || !De.earlier.pending ? 2 : 1;
      et();
      return;
    }
    let Xt = mi(initialJobId);
    if (Xt >= 0) {
      ke.restoreAttempts = 2;
      ke.focus(Xt);
      ke.followId = initialJobId;
    } else if (ke.restoreAttempts >= 2) et();
  }, [jobs, St, remoteListLoaded, activeTab, initialJobId, homeIdx]);
  let Za = {
    editor: We,
    roster,
    selection: ke,
    view: Ue,
    attach: $e,
    deleteConfirm: He,
    storageV5,
    onAction,
    pendings,
    mountAt: kn,
    canonicalLauncherCwd: Kt,
    cwdFilter,
    parseScope: {
      templates: Jn,
      allRepos,
      routines: _n,
    },
  };
  let openEarlier = (ee, Ve) => openEarlierSession(Za, ee, Ve);
  let ns = (ee, Ve) => {
    let et = queryIsFilter && ee ? groupOf.get(ee.id) : undefined;
    if (et !== undefined) ke.uncollapse(qt(et));
    attachToJob(Za, ee, Ve);
  };
  let openNewSessionRow = (ee) => openNewSession(Za, ee);
  let td = autoOpenJobId !== undefined && (!autoOpened || attachingJobId !== null);
  P(() => {
    if ($e.getSnapshot().autoOpened || !autoOpenJobId || jobs === null) return;
    $e.markAutoOpened();
    ns(jobs.find((job) => job.id === autoOpenJobId));
  }, [autoOpenJobId, jobs]);
  let ju = jobs !== null && !td && onlyOrigin && activeTab !== "remote" && !query && !me;
  let any_2 = filtered.some((ee) => ee.id === initialJobId);
  P(() => {
    if (!ju || !Ue.firstImpression("empty")) return;
    logEvent("tengu_fleetview_empty_state_shown", {
      skeleton: isOnboarding,
      has_origin: any_2,
    });
  }, [ju, isOnboarding, any_2]);
  let od = () => ({
    submit: {
      editor: We,
      roster,
      selection: ke,
      view: Ue,
      attach: $e,
      storageV5,
      credentials,
      onAction,
      exit: go,
      relaunchForUpdate: mu,
      searchKeyDown: handleKeyDown,
      willInsertNewline,
      vimMode,
      dispatchInputActive: Nn,
      canonicalLauncherCwd: Kt,
      launcherCwd: cwd,
      effectiveCwd: oo,
      scopedFallbackOrigin: At,
      cwdFilter,
      dispatchDefaults,
      query,
      dispatch: cr,
      templates: Jn,
      allRepos,
      routines: _n,
      templateCache: templates,
      suggestions,
      skills: La,
      modelArgMatch,
      modelSuggestions: fn,
      pickSuggestion,
      applySuggestion: bu,
      closeAgentBrowse: () => ui(false),
      jobSessionIds,
      builtRows: built.rows,
      bumpSuggGen: hu,
      mountAt: kn,
      focusedRow,
      focused,
      isOnboarding,
      toggleCollapse,
      openEarlier,
      openNewSessionRow,
      openOrRespawn: ns,
    },
    deleteConfirm: He,
    actions: Ga,
    rows: rows_2,
    focusedIdx,
    altOpenOrigin,
    byGroup,
    byState,
    hasComposedDispatch,
    dispatchRepoCwd: mentionedTemplate,
    headerJobs,
    groupOf,
    groupSuggestions: Wo,
    previewOpen,
    helpOpen,
    debugOpen,
    groupEdit,
    renamingJobId: jobId,
    attachingJobId,
    showAllAgents: pr,
    jobs,
    pendings,
    keybindings,
    simpleView: me,
    groupsEnabled: Ot,
    hasCredentials,
    termRows: rows,
    canGoBack,
    originJobId,
    originSpawn,
    renameKeyDown: handleKeyDown_3,
    groupKeyDown: handleKeyDown_4,
    setQuery,
    enterInsertMode,
    setRenameDraft: setQuery_2,
    setGroupDraft: setQuery_3,
    readRenameDraft: () => queryRef_2.current,
    readGroupDraft: () => queryRef_3.current,
    pressExitKey: Po,
    switchTab,
    clearRename: xe,
    clearGroupEdit: ar,
    headerArmId,
    ck: qt,
    setShowAllAgents: ui,
    setSelectedSuggestion: gu,
    setHoveredSuggestionId: Ba,
    attachPastedImage: So,
  });
  let handleKeyDown_5 = (event) => handleFleetKey(od(), event);
  let { handleKeyDown: handleKeyDown_6, handlePaste: handlePaste_4 } = usePasteHandler({
    handleKeyDown: handleKeyDown_5,
    onPaste: (ee) =>
      handlePasteIntoDispatch(
        {
          editor: We,
          dispatchInputActive: Nn,
          insertAtCursor: (Ve) => handlePaste(new PasteEvent(Ve)),
        },
        ee,
      ),
    onImagePaste: So,
  });
  let onPaste = (ee) => {
    let snapshot = Ue.getSnapshot();
    if (snapshot.resumePicker !== null || snapshot.settingPicker !== null) return;
    if (jobId !== null || snapshot.renaming !== null) {
      handlePaste_2(ee);
      return;
    }
    if (groupEdit !== null) {
      Ue.setGroupPickIdx(-1);
      if (snapshot.groupPristine) {
        setQuery_3("");
        Ue.setGroupPristine(false);
      }
      handlePaste_3(ee);
      return;
    }
    if (helpOpen) Ue.setHelpOpen(false);
    handlePaste_4(ee);
  };
  let Dg = jobs !== null && !td;
  let jE = R(null);
  let inputClock = useInputClock();
  let { subscribeFrames } = Se(kp);
  zt(() => {
    return;
  }, [Dg, subscribeFrames]);
  let Vg = (ee) => false;
  if (jobs === null || td)
    return jsxProd_default(Box, {
      tabIndex: 0,
      autoFocus: true,
      onKeyDownCapture: _u,
      onKeyDown: (event) => {
        if (event.ctrl && event.key === "d" && (me || (jobs === null && We.getSnapshot().query === ""))) {
          event.stopImmediatePropagation();
          Po("Ctrl-D");
          return;
        }
        if (me && (event.name === "escape" || (event.ctrl && event.key === "c"))) {
          event.stopImmediatePropagation();
          Po("Ctrl-C");
          return;
        }
        handleKeyDown(event);
      },
      onPaste,
    });
  let suggestionList =
    suggestions.length > 0
      ? jsxProd_default(Box, {
          paddingLeft: 2,
          marginBottom: 1,
          children: jsxProd_default(PromptInputFooterSuggestions, {
            suggestions: suggestions.map((suggestion) => ({
              id: `${suggestion.kind}:${suggestion.name}`,
              displayText: modelArgMatch
                ? suggestion.name
                : `${SUGGESTION_KIND_LABELS[suggestion.kind]}${suggestion.name}`,
              description: `${SUGGESTION_KIND_LABELS_2[suggestion.kind]} \xB7 ${suggestion.description}`,
            })),
            selectedSuggestion: Math.min(Da, suggestions.length - 1),
            maxColumnWidth: 35,
            noPad: true,
            hoveredId: Va,
            onHoverChange: Ba,
            onSelect: (ee) => {
              let Ve = suggestions[ee];
              if (Ve) {
                bu(Ve);
                ui(false);
              }
            },
          }),
        })
      : null;
  let Jg = new Set([
    ...templateNames,
    ..._n.map((ee) => ee.name.toLowerCase()),
    ...repoNames.map((repoName) => repoName.toLowerCase()),
  ]);
  let nd = isBashDispatch ? [] : mentionRanges(query, Jg);
  let highlights = isBashDispatch
    ? []
    : cr?.matched && firstWord === cr.template.name.toLowerCase()
      ? [[0, firstWord.length], ...nd]
      : isSlashQuery
        ? [[0, firstWord.length], ...nd]
        : [...newSessionPrefixRanges(query), ...nd];
  return jsxProd_default_2(Box, {
    ref: Xr,
    flexDirection: "column",
    flexGrow: 1,
    tabIndex: 0,
    autoFocus: true,
    onKeyDownCapture: (ee) => {
      if (Vg(ee)) return;
      _u(ee);
      handleKeyDown_2(ee);
    },
    onKeyDown: handleKeyDown_6,
    onPaste,
    onWheel: (event) => {
      if (previewOpen) return;
      event.preventDefault();
      Qr.current?.scrollBy(event.deltaY > 0 ? 3 : -3);
    },
    children: [
      jsxProd_default(FleetRowList, {
        owners: vt,
        layout: fleetRows,
        scrollRef: Qr,
        header: jsxProd_default(FleetComposer, {
          editor: We,
          layout: fleetRows,
          simpleView: me,
          dispatchDefaults,
          targetCwd: Bn,
          launcherCwd: cwd,
          canonicalLauncherCwd: Kt,
          originJobId,
        }),
        renameInput: {
          draft: query_2,
          cursor: cursorOffset,
        },
        groupInput: {
          draft: query_3,
          cursor: cursorOffset_2,
          suggestions: Wo,
          reserved: Zi,
          isNew,
          matchesExisting,
          panelOpen,
        },
        initialJobId,
        cwdFilter,
        simpleView: me,
        endsWithOlderSessionsLine: Ou,
        hasCredentials,
        mountAt: kn,
        actions: {
          toggleCollapse,
          openOrRespawn: ns,
          openEarlier,
          openNewSessionRow,
        },
      }),
      jsxProd_default(FleetSearchInput, {
        owners: vt,
        layout: fleetRows,
        onCursorOffsetChange: setCursorOffset,
        highlights,
        voice: {
          interimRange: voiceIntegration.interimRange,
          showCursor,
        },
        isTerminalFocused: terminalFocus,
        simpleView: me,
        showRemoteTabs,
        switchTab,
        remoteJobs: St,
        hasGroups: (jobs ?? []).some((ee) => !!ee.state.group),
        suggestionList,
        cloudListNotice: Tu,
      }),
      jsxProd_default(FleetBody, {
        owners: vt,
        layout: fleetRows,
        footer: jsxProd_default(FleetFooter, {
          owners: vt,
          layout: fleetRows,
          simpleView: me,
          canGoBack,
          dispatchDefaults,
          launcherCwd: cwd,
          storageV5,
          groupInput: {
            draft: query_3,
            suggestions: Wo,
          },
          suggestionsOpen: suggestions.length > 0,
        }),
        simpleView: me,
        groupsEnabled: Ot,
        showRemoteTabs,
        canGoBack,
        canMention: Jn.length + _n.length + Object.keys(allRepos).length > 0,
        isTerminalFocused: terminalFocus,
        awayLoop: Oe,
        storageV5,
        onOpen: ns,
        onStop,
      }),
    ],
  });
}
//@ chunk-93kwxas0.js:199227-199239 placement
var awayLoopApi = null;
//@ chunk-93kwxas0.js:199239-199279 placement
function seedHostJobs(h, E, k) {
  ensureFleetRoster(h, k).seedJobs(E);
}
//@ chunk-93kwxas0.js:199279-199412 placement
function remountClearSeq(h, lastFrameFillsCurrentViewport, k) {
  if (h) return enterAltScreenSequence();
  let rows = getTerminalSize(process.stdout, null).rows;
  if (rows !== process.stdout.rows) return "";
  return lastFrameFillsCurrentViewport && !k ? eraseViewportInPlace(rows) : "";
}
//@ chunk-93kwxas0.js:199412-209165 placement
async function mountFleetView(h, E) {
  let k = false;
  function C() {
    k = true;
  }
  process.stdout.on("resize", C);
  using x = {
    [Symbol.dispose]: () => {
      process.stdout.removeListener("resize", C);
    },
  };
  let presentation = "inline";
  let fatalExit = prepareFatalExit();
  if (!fatalExit.ok) {
    await reportFatalAndExit(fatalExit.error);
    return;
  }
  (await import("./chunk-7dsst868.js")).registerToolHosts();
  initBuiltinPlugins();
  initBundledSkills();
  if (isAgentSwarmsEnabled() && !hasTeammateModeSnapshot()) captureTeammateModeSnapshot();
  setSpareExtraArgs(E?.dispatchExtraArgs ?? []);
  logEvent("tengu_bg_agent_action", {
    action: lit("list_open"),
    mode: fromEnum(getGlobalConfig().fleetViewGroupMode ?? "state"),
  });
  let L = E?.host ?? createFleetViewHost();
  let rootSession = getRootSession();
  let host = rootSession.host;
  let project = getSessionProject(rootSession);
  markJobFinished(L.resultSeen, E?.entryChannel);
  if (!getGlobalConfig().hasOpenedAgentsView)
    await saveGlobalConfig(
      (Fe) => ({
        ...Fe,
        hasOpenedAgentsView: true,
      }),
      E?.storageV5,
    );
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
  process.stdin.on("readable", X);
  await composePolicyLimitsForFleet({
    storageV5: E?.storageV5,
    credentials: E?.credentials,
  });
  let cwdFilter = E?.cwdFilter
    ? await canonicalizePath(resolve(E.cwdFilter), getRealPathOptions(E?.storageV5))
    : undefined;
  let launch = resolveDispatchPermissionMode(E?.dispatchDefaults);
  let storageV5 = isStorageV5Enabled() ? E?.storageV5 : undefined;
  registerCleanup(storageV5 ? () => discardSpare(storageV5) : discardSpare);
  registerCleanup(openDaemonLease("claude agents"));
  let oe = h;
  let screen = E?.screen;
  let se = (Fe) => {
    if (screen) screen.update(Fe);
    else screen = showScreen(oe, Fe);
  };
  let CLAUDE_AGENTS_SELECT = env.CLAUDE_AGENTS_SELECT;
  let ae = noRemoteSessionCommands();
  let me = E?.autoOpenJobId ?? ae?.short;
  let left = ae?.left;
  let le = me !== undefined && E?.canGoBack && ae === undefined;
  let Oe = [];
  let De = new Set();
  let we;
  let Re = false;
  let je = false;
  let st = new Set();
  let mt = () =>
    awayLoopApi !== null &&
    !je &&
    neverEmbedded({
      presentation,
      rows: getTerminalSize(process.stdout, null).rows,
      embedded: false,
    });
  let Ye = (Fe, Rt) => {
    oe.unmount();
    if (Rt && process.stdin.isTTY) setRawModeSafe(process.stdin, false);
    if (Rt && shouldUseFullscreenByDefault()) process.stdout.write(exitAltScreenSequence());
    if (Fe !== undefined)
      process.stderr.write(`${Fe}
`);
  };
  let Lt = false;
  let dt = CLAUDE_AGENTS_SELECT;
  let notifiedState = createNotifiedState();
  let eo = 0;
  let Wt = (job) => {
    let Rt = {
      ...fleetAttachFields(job.id, dt, eo),
      ...takeNotificationLatency(notifiedState, job.state.sessionId, Date.now()),
    };
    eo++;
    return Rt;
  };
  let originJobId = E?.originJobId;
  let originSpawn = E?.originSpawn;
  delete process.env.CLAUDE_AGENTS_SELECT;
  let relaunchTab;
  let jobDraft = await readJobDraft(
    await canonicalizePath(getCwd(), getRealPathOptions(E?.storageV5)),
    E?.storageV5,
  );
  let roster = ensureFleetRoster(L, E?.storageV5);
  ensureFleetSelection(L, roster, E?.storageV5, jobDraft?.collapsed);
  let fleetEditor = ensureFleetEditor(L, {
    query: jobDraft?.q || undefined,
  });
  let fleetLiveStatus = ensureFleetLiveStatus(L);
  sweepJobDrafts();
  let Ot;
  process.stdin.off("readable", X);
  let typedAhead = false;
  while (N.length) process.stdin.unshift(N.pop());
  let Ue;
  if (me !== undefined) {
    if (roster.jobs === null) roster.seedJobs(await listJobs(undefined, E?.storageV5));
    let found = roster.jobs?.find((job) => job.id === me);
    if (found) {
      let gestureT0 = performance.now();
      let Vt = randomUUID();
      startAttachBeacon(Vt, "fleet", E?.storageV5).catch(() => {});
      let Be = await safeRespawnBgSession(
        found.id,
        {
          knownState: found.state,
        },
        E?.storageV5,
      );
      if (awayLoopApi && ae !== undefined) {
        if (!Be.ok && !Be.alive) {
          await awayLoopApi.backToCloudSession(ae.left, false, E?.storageV5);
          left = undefined;
        }
        if (shouldUseFullscreenByDefault()) process.stdout.write(enterAltScreenSequence());
      }
      Ue = {
        type: "open",
        job: found,
        respawnResult: Be,
        gestureT0,
        gestureId: Vt,
      };
    } else if (awayLoopApi && ae !== undefined)
      await awayLoopApi.backToCloudSession(ae.left, false, E?.storageV5);
    else if (awayLoopApi && originJobId !== undefined && (mt() || parseSwitchTarget(me).kind === "cloud")) {
      let Rt = await awayLoopApi.sessionTabsNext({
        ending: {
          kind: "asked",
          intent: parseSwitchTarget(me),
        },
        leftJobId: originJobId,
        visited: [],
        ended: De,
        landed: undefined,
        storageV5: E?.storageV5,
      });
      let Vt =
        Rt.kind === "cloud"
          ? await awayLoopApi.stayAfterCloudTab(
              Rt,
              E?.dispatchExtraArgs ?? [],
              false,
              () => originSpawn?.settled === true && !originSpawn.ok,
              E?.storageV5,
            )
          : Rt;
      if (Vt.kind === "open") {
        if (Vt.jobs) roster.seedJobs(Vt.jobs);
        let Be = await awayLoopApi.jobToOpen(Vt.jobId, roster.jobs, E?.storageV5);
        if (Be) {
          Ue = {
            type: "open",
            job: Be,
          };
          Re = !Vt.asked;
          Lt = Vt.booting;
        }
      }
      if (Ue === undefined) {
        if (originSpawn) originSpawn.resumeHintRequested = true;
        Ye(awayLoopApi.NO_SESSION_QUIT_LINE, false);
        return;
      }
    }
  }
  let Qt = false;
  let tt;
  let ze = Ue !== undefined && originJobId !== undefined;
  for (;;) {
    if (Ue === undefined && ze && mt()) {
      Ye(awayLoopApi?.NO_SESSION_QUIT_LINE, true);
      break;
    }
    je ||= Ue === undefined;
    if (Qt) invalidateCommandNames();
    tt = checkDispatchDefaultsChanged(tt, launch, E?.storageV5);
    Qt = true;
    let Fe =
      Ue ??
      (await new Promise((resolve) => {
        se(
          jsxProd_default(FleetViewScreen, {
            killRing: L.killRing,
            children: jsxProd_default(
              AppRoot,
              {
                host,
                project,
                storageV5: E?.storageV5,
                initialState: Ot && {
                  ...Ot,
                  notifications: {
                    current: null,
                    queue: [],
                    pinned: [],
                  },
                },
                onChangeAppState: ({ newState }) => {
                  Ot = newState;
                },
                children: jsxProd_default(FleetView, {
                  onAction: resolve,
                  host: L,
                  initialJobId: CLAUDE_AGENTS_SELECT,
                  awayLoop: notifiedState,
                  originJobId,
                  originSpawn,
                  cwdFilter,
                  dispatchDefaults: launch,
                  typedAgent: E?.dispatchDefaults?.agent,
                  canGoBack: E?.canGoBack,
                  autoOpenJobId: me,
                  entryChannel: E?.entryChannel,
                  relaunchTab,
                  typedAhead,
                  fromLauncher: E?.fromLauncher,
                  storageV5: E?.storageV5,
                }),
              },
              "agents-list",
            ),
          }),
        );
        setJitPolicyAfterStartup();
      }));
    Ue = undefined;
    let Rt = Re;
    Re = false;
    let Vt = Lt;
    Lt = false;
    let Be = shouldUseFullscreenByDefault();
    if (Fe.type === "back") {
      oe.unmount();
      break;
    }
    if (Fe.type === "open" && Fe.job.id !== me) le = false;
    me = undefined;
    if (Fe.type === "login") {
      let { getLoginStartingMessage, Login } = await import("./chunk-whwtfsqf.js");
      let Qe = false;
      let winner = await Promise.race([
        new Promise((resolve) => {
          screen = undefined;
          showScreen(
            oe,
            jsxProd_default(AppRoot, {
              storageV5: E?.storageV5,
              initialState: Ot && {
                ...Ot,
                notifications: {
                  current: null,
                  queue: [],
                  pinned: [],
                },
              },
              onChangeAppState: ({ newState }) => {
                Ot = newState;
              },
              children: jsxProd_default(Login, {
                onDone: resolve,
                onOrgDocumentsReload: (Ne) => {
                  if (Ne === "previous") Qe = true;
                },
                startingMessage: getLoginStartingMessage(),
              }),
            }),
          );
        }),
        oe.waitUntilExit().then(() => "exited"),
      ]);
      if (winner === "exited") break;
      showScreen(oe, null);
      if (process.stdout.isTTY) process.stdout.write(getEraseScreenSequence());
      if (winner) {
        let { runOrgMemoryAuthBoundary } = await import("./chunk-whwtfsqf.js");
        runOrgMemoryAuthBoundary();
        await discardSpare(E?.storageV5);
        if (getAPIProvider() === "gateway") {
          oe.unmount();
          break;
        }
        fleetEditor.setHint("Login successful");
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
        let reload = Promise.all([St(undefined, E?.storageV5, E?.credentials), Ne().catch(() => {})]);
        await new Promise((resolve) => {
          showScreen(
            oe,
            jsxProd_default(AppRoot, {
              storageV5: E?.storageV5,
              children: jsxProd_default(Kt, {
                reload,
                onDone: resolve,
              }),
            }),
          );
        });
        showScreen(oe, null);
        await po(oe);
      }
      continue;
    }
    let gt = getSecondRootError().get(process.stdout);
    if (Be && Fe.type === "open") gt?.handoffAltScreen();
    if (getPlatform() === "windows" && Fe.type === "open") gt?.handoffRawMode();
    let lastFrameFillsCurrentViewport = gt?.lastFrameFillsCurrentViewport ?? false;
    if (!Be) se(null);
    oe.unmount();
    if (Fe.type === "done") break;
    if (getPlatform() === "windows" && process.stdin.isTTY) {
      setRawModeSafe(process.stdin, true);
      process.stdin.ref();
    }
    let $e = "";
    let ht = Be ? onExit(() => void process.stdout.write(exitAltScreenSequence() + $e)) : () => {};
    if (
      CLAUDE_AGENTS_SELECT !== undefined &&
      CLAUDE_AGENTS_SELECT !== Fe.job.id &&
      CLAUDE_AGENTS_SELECT !== we
    ) {
      let vt = CLAUDE_AGENTS_SELECT;
      Oe.splice(0, Oe.length, vt, ...Oe.filter((rt) => rt !== vt));
    }
    CLAUDE_AGENTS_SELECT = Fe.job.id;
    we = undefined;
    if (!Fe.keepQuery) fleetEditor.dropDraft();
    L.agentLastUsedMigrationDone = true;
    let now = Date.now();
    let We;
    if (Fe.respawnResult === undefined && Fe.gestureId === undefined) {
      We = randomUUID();
      startAttachBeacon(We, "fleet", E?.storageV5).catch(() => {});
    }
    let Jt =
      awayLoopApi !== null &&
      neverEmbedded({
        presentation,
        rows: NOTICE_WIDTH_LIMIT,
        embedded: false,
      }) &&
      !je &&
      !(le && E?.screen !== undefined) &&
      !isExecLaunch(Fe.job.state);
    if (Jt) le = false;
    let qe = {
      kind: "failed",
    };
    let He =
      Fe.respawnResult ??
      (await safeRespawnBgSession(
        Fe.job.id,
        Fe.freshDispatch
          ? undefined
          : {
              knownState: Fe.job.state,
            },
        E?.storageV5,
      ));
    logForDebugging(
      `[FV-attach] respawnJob ${Fe.job.id}: ok=${He.ok} alive=${!He.ok && He.alive} err=${He.ok ? "" : He.error}`,
    );
    if (He.ok || He.alive) {
      logFleetJobAction("attach", Fe.job.state, {
        jobId: sanitizeMarkName(Fe.job.id),
        attachShort: sanitizeMarkName(He.short ?? Fe.job.id),
        ...Wt(Fe.job),
      });
      process.stdout.write(osc(OSC.SET_TITLE_AND_ICON, getJobTitle(Fe.job.state, true)));
      let now_2 = Date.now();
      let rt = {
        gestureId: Fe.gestureId ?? We ?? randomUUID(),
        attempt: 0,
        t0: Fe.gestureT0,
        surface: "fleet",
        interactive: {},
      };
      if (Fe.gestureId === undefined && We === undefined)
        startAttachBeacon(rt.gestureId, "fleet", E?.storageV5).catch(() => {});
      let Qe = (Ne, gateStdinUntilFirstFrame) =>
        attachJob(Ne, {
          alreadyInAlt: Be,
          onExitNotice: (Kt) => {
            $e = Kt;
          },
          gateStdinUntilFirstFrame,
          gesture: rt,
          sessionTabs: Jt,
          cloudTabs: awayLoopApi?.hostRestartsForCloudTabs(E?.dispatchExtraArgs ?? []) ?? false,
          tabsLanding: Fe.landing,
          storageV5: E?.storageV5,
        }).catch((error) => {
          logError(error);
          logFeatureBad("job_attach", "threw");
          return {
            kind: "error",
            msg: `Couldn't attach \u2014 ${errorMessage(error)}`,
          };
        });
      let Xe = await Qe(He.short ?? Fe.job.id, He.ok || Fe.afterNoResponse === true || Rt || Vt);
      let St = false;
      if (Xe.kind === "error" && Xe.orphaned && !isExecLaunch(Fe.job.state) && !isTerminalShutdown()) {
        let Ne = await safeRespawnBgSession(
          Fe.job.id,
          {
            force: true,
            knownState: Fe.job.state,
          },
          E?.storageV5,
        );
        if (Ne.ok || Ne.alive) {
          St = true;
          Xe = await Qe(Ne.short ?? Fe.job.id, Ne.ok);
        } else
          Xe = {
            kind: "error",
            msg: Ne.error,
          };
      }
      clearAttachBeacon(rt.gestureId, E?.storageV5).catch(() => {});
      if (isTerminalShutdown()) return heldUntilExit();
      if (awayLoopApi) qe = awayLoopApi.attachEndingOf(Xe, !Rt);
      if (Xe.kind === "error" && !Xe.ended) {
        if (Xe.notResponding) {
          if (isExecLaunch(Fe.job.state)) fleetEditor.setError(COMMAND_NOT_RESPONDING_TEXT);
          else offerJobRestart(fleetLiveStatus, fleetEditor, Fe.job.id);
        } else fleetEditor.setError(Xe.msg);
        if (St && Xe.orphaned) logFeatureSad("fleet_view_open", "recovered_then_crashed");
        else logFeatureBad("fleet_view_open", St ? "orphan_recovery_failed" : "attach_failed");
      } else {
        if (Xe.msg) fleetEditor.setError(Xe.msg);
        logFeatureOk("fleet_view_open");
      }
      logFleetJobAction("detach", Fe.job.state, {
        attachDurationMs: Date.now() - now_2,
      });
      logForDebugging(`[FV-attach] attachJob returned after ${Date.now() - now}ms \u2014 remounting list`);
    } else {
      fleetEditor.setError(He.error);
      let gestureId = Fe.gestureId ?? We;
      if (gestureId !== undefined) clearAttachBeacon(gestureId, E?.storageV5).catch(() => {});
      if (He.errorCode === "fork_transcript_never_materialized")
        logFeatureSad("fleet_view_open", "fork_transcript_never_materialized");
      else logFeatureBad("fleet_view_open", "respawn_failed");
    }
    resetInteractionBaseline();
    let ct = false;
    if (awayLoopApi && !le && mt()) {
      oe = await createRoot(getBaseRenderOptions(false));
      screen = undefined;
      ct = true;
      if (Be && (qe.kind === "ended" || qe.kind === "failed")) process.stdout.write(enterAltScreenSequence());
      if (qe.kind === "failed" || (qe.kind === "back" && qe.why === "taken")) st.add(Fe.job.id);
      else {
        st.delete(Fe.job.id);
        left = undefined;
      }
      let vt = process.stdin.isTTY === true && process.stdin.isRaw !== true;
      if (vt) setRawModeSafe(process.stdin, true);
      if (qe.kind === "ended" || (qe.kind === "asked" && qe.intent.kind === "leave" && !qe.intent.running))
        De.add(Fe.job.id);
      else De.delete(Fe.job.id);
      let { stayAfterCloudTab } = awayLoopApi;
      let Qe = await awayLoopApi
        .sessionTabsNext({
          ending: qe,
          leftJobId: Fe.job.id,
          visited: Oe.filter((Xe) => !st.has(Xe)),
          ended: De,
          landed: He.ok || He.alive ? undefined : Fe.landing,
          storageV5: E?.storageV5,
        })
        .then((Xe) =>
          Xe.kind === "cloud"
            ? stayAfterCloudTab(Xe, E?.dispatchExtraArgs ?? [], true, () => false, E?.storageV5)
            : Xe,
        )
        .finally(() => {
          if (vt) setRawModeSafe(process.stdin, false);
        });
      if (Qe.kind === "quit") {
        await awayLoopApi.backToCloudSession(left, true, E?.storageV5);
        Ye(Qe.say, true);
        ht();
        break;
      }
      if (Qe.kind === "open") {
        if (Qe.jobs) roster.seedJobs(Qe.jobs);
        let Xe = await awayLoopApi.jobToOpen(Qe.jobId, roster.jobs, E?.storageV5);
        if (!Xe) {
          await awayLoopApi.backToCloudSession(left, true, E?.storageV5);
          Ye(awayLoopApi.NO_SESSION_QUIT_LINE, true);
          ht();
          break;
        }
        Ue = {
          type: "open",
          job: Xe,
          ...(Qe.landing && {
            landing: Qe.landing,
          }),
        };
        if (qe.kind === "asked" && qe.intent.kind === "quit") {
          let id = Fe.job.id;
          we = id;
          Oe.splice(0, Oe.length, ...Oe.filter((Ne) => Ne !== id));
        }
        Re = !Qe.asked;
        Lt = Qe.booting;
        le = false;
        fleetEditor.setError(null);
        ht();
        continue;
      }
    }
    if (!ct) {
      oe = await createRoot(getBaseRenderOptions(false));
      screen = undefined;
    }
    if (le) {
      if (!Be) process.stdout.write(remountClearSeq(Be, lastFrameFillsCurrentViewport, k));
      le = false;
      ht();
      screen ??= showScreen(oe, null);
      return {
        back: true,
        root: oe,
        screen,
      };
    }
    process.stdout.write(remountClearSeq(Be, lastFrameFillsCurrentViewport, k));
    logForDebugging("[PERF:bg-remount-start]");
    ht();
  }
}
export { mountFleetView };
