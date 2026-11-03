/**
 * components/fleet/FleetViewInput.tsx
 *
 * 2.1.316 新增：会话预览面板：日志尾、回复输入、附加、停止、重命名；Agents 视图主体（列表、预览、标签页、云会话行）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-93kwxas0.js (49)
 * attribution: placement 49
 */
import { FLEET_KEY_ACTIONS, Bo, FLEET_EDITOR_SAFE_ACTIONS } from "./FleetList.js";
import { getSingleKeyActionInContexts } from "../../keybindings/resolver.js";
import { gS, hS } from "../agents/utils.js";
import { chordToDisplayString } from "../../keybindings/parser.js";
import { getShortcutDisplayPlatform } from "../../utils/keyboardShortcuts.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import {
  useVoiceAvailable,
  useVoiceIntegration,
  useVoiceKeybindingHandler,
} from "../../hooks/useVoiceIntegration.js";
import { useAppState, useAppState_2 } from "../../state/AppState.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { Sn, Ep, Cp, InlineMarkup, Ci, wn, SIMPLE_PINNED, childFrameRows } from "./FleetRow.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { plural, Dr, CONTROL_CHARS_EXCEPT_WS_RE, countCharInString } from "../../utils/stringUtils.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { KeepHoldingHint, VoiceStateIndicator, VoiceLevelGlyph } from "../PromptInput/VoiceIndicator.js";
import {
  isSettled,
  UNGROUPED,
  EARLIER,
  getJobDir,
  terminalOutcome,
  isExecLaunch,
  syncJobName,
  sanitizeGroupName,
  isReservedGroupName,
  writeJobGroup,
} from "../../services/daemon/jobState.js";
import {
  hasNonDefaultDispatchSettings,
  DispatchDefaultsLine,
  mo,
  Io,
  stripJobPreviewText,
  cs,
  jobTempo,
  jobSortKey,
  remoteRowIdOf,
} from "./fleetRows.js";
import { parseNewSessionPrefix, isPasteImageKey, pasteImageFromClipboard } from "./fleetSessions.js";
import { j, y, P, R, Kc, Oo } from "../../../vendor/react/cjs/react.production.js";
import { T4e } from "../../services/artifacts/frameApi.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useInterval } from "../../ink/components/Input.js";
import { formatDuration } from "../../utils/format.js";
import { logFleetJobAction, FleetActionUnconfirmedError } from "./fleetActions.js";
import { Me } from "../design-system/ThemeProvider.js";
import { VERIFICATION_REQUIRED_NEEDS } from "../../services/sessionStatus/sessionStateClassifier.js";
import { safeVerificationUrl } from "../../services/api/verificationRequired.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { Bs, replyToJob } from "./fleetDispatch.js";
import { useFocusOnMount } from "../../hooks/useFocusOnMount.js";
import {
  getModeFromInput,
  stripModePrefix,
  prependModeCharacterToInput as prependModeCharacterToInput_2,
  isBashModeChar,
} from "../PromptInput/inputModes.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useGetVoiceState } from "../../context/voice.js";
import { useSearchInput } from "../../hooks/useSearchInput.js";
import { sanitizePromptText, M1r } from "../../utils/promptTextSanitize.js";
import { formatInvisibleCharsRemoved } from "../../utils/invisibleChars.js";
import { parsePastedRefs, zZ } from "../../history.js";
import { materializePastedImages } from "../../cli/bg/bgSpawnEnv.js";
import { isNonPromptInput } from "../../services/daemon/spawnLauncher.js";
import { logError } from "../../utils/log.js";
import { errorMessage, isFsInaccessible } from "../../utils/errors.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { recordSuggestionOutcome } from "../../services/PromptSuggestion/backOff.js";
import { cacheImagePath } from "../../utils/imageStore.js";
import { usePasteHandler } from "../../hooks/usePasteHandler.js";
import { PasteEvent } from "../../ink/frame.js";
import { isReducedMotion } from "../Spinner/spinnerFlags.js";
import { shouldUseFullscreenByDefault } from "../../utils/fullscreen.js";
import { keyEventToKeystroke } from "../../keybindings/match.js";
import { LinkifiedText } from "../LinkifiedText.js";
import { PrBadge, DiffStatCounts } from "../PrBadge.js";
import { hf } from "../../utils/permissions/autoModeRulesPrompt.js";
import { See } from "../../utils/ghPrStatus.js";
import { SearchBox } from "../SearchBox.js";
import { rHt } from "../../utils/Cursor.js";
import { count } from "../../utils/collections.js";
import { supportsExtendedKeys } from "../../ink/terminal.js";
import { AutoUpdaterWrapper } from "../AutoUpdaterWrapper.js";
import { PromptToast } from "../PromptInput/Notifications.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { registerPreExitFlush } from "../../utils/cleanupRegistry.js";
import { writeJobDraft, ZOo, TVn, deleteJobDraft } from "../../daemon/jobs/draftSweep.js";
import { onExit } from "../../../vendor/signal-exit/dist/mjs/index.js";
import { createSignal } from "../../utils/signal.js";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
import { getGlobalConfig } from "../../utils/config.js";
import { sendControlToUdsSocket } from "../../utils/udsMessaging/udsClient.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { renderListResultMessage } from "../../tools/ScheduleCronTool/UI.js";

//@ chunk-93kwxas0.js:123639-123687 placement
function zf(h) {
  return FLEET_KEY_ACTIONS.find((E) => E === h) ?? null;
}
/**
 * 按两组快捷键上下文解析单键动作。
 */
//@ chunk-93kwxas0.js:123687-123790 placement
function resolveFleetKeyAction(h, E) {
  if (!h) return null;
  let k = getSingleKeyActionInContexts(h, gS, E);
  if (k !== void 0) return zf(k);
  return zf(getSingleKeyActionInContexts(h, hS, E));
}
/**
 * 找某动作的单键快捷键显示文本。
 */
//@ chunk-93kwxas0.js:123790-123967 placement
function shortcutDisplayFor(h, E) {
  for (let k = E.length - 1; k >= 0; k--) {
    let C = E[k];
    if (!C || C.action !== h || C.chord.length !== 1) continue;
    let x = C.chord[0];
    if (x && resolveFleetKeyAction(x, E) === h)
      return chordToDisplayString(C.chord, getShortcutDisplayPlatform());
  }
  return "";
}
//@ chunk-93kwxas0.js:123967-124003 placement
function KS(jt) {
  return jt.collapsed;
}
//@ chunk-93kwxas0.js:124003-124058 placement
function $S(We) {
  return We.settings.voice?.mode ?? "hold";
}
//@ chunk-93kwxas0.js:124058-124095 placement
function qS(Jt) {
  return Jt.voiceState;
}
//@ chunk-93kwxas0.js:124095-124136 placement
function YS(qe) {
  return qe.voiceWarmingUp;
}
//@ chunk-93kwxas0.js:124136-124226 placement
var Xf = { "Ctrl-C": "press ctrl+c or q again to exit", "Ctrl-D": "press ctrl+d again to exit" };
/**
 * Agents 视图底部快捷键提示栏。
 */
//@ chunk-93kwxas0.js:124226-127689 placement
function FleetFooter(h) {
  let W = w(6),
    {
      owners: owners,
      layout: layout,
      simpleView: simpleView,
      dispatchDefaults: dispatchDefaults,
      groupInput: groupInput,
      suggestionsOpen: suggestionsOpen,
    } = h,
    { selection: selection, view: view, editor: editor, deleteConfirm: deleteConfirm } = owners,
    { columns: columns } = useTerminalSize(),
    X = Bo(),
    K = shortcutDisplayFor("agents:find", X),
    z;
  if (W[0] !== X) ((z = shortcutDisplayFor("agents:setGroup", X)), (W[0] = X), (W[1] = z));
  else z = W[1];
  let oe = z,
    ge = useStoreSelector(selection, KS),
    {
      groupMode: groupMode,
      groupEdit: groupEdit,
      groupPickIdx: groupPickIdx,
      renaming: renaming,
      previewOpen: previewOpen,
      exitPending: exitPending,
    } = useStoreSelector(view),
    {
      query: query,
      error: error,
      hint: hint,
      expandHintPasteId: expandHintPasteId,
    } = useStoreSelector(editor),
    { pending: pending } = useStoreSelector(deleteConfirm),
    st = useVoiceAvailable(),
    mt = useAppState($S),
    Ye = useAppState_2(qS),
    Lt = useAppState_2(YS),
    {
      focusedRow: focusedRow,
      focused: focused,
      focusedIsPending: focusedIsPending,
      runningCount: runningCount,
      hasDispatch: hasDispatch,
      hasComposedDispatch: hasComposedDispatch,
      isBashDispatch: isBashDispatch,
      enterIsNoop: enterIsNoop,
      enterLabel: enterLabel,
      isOnboarding: isOnboarding,
      byGroup: byGroup,
      headerJobs: headerJobs,
    } = layout,
    { draft: draft, suggestions: suggestions } = groupInput,
    Qt = enterLabel,
    tt = bunStringWidth(Qt) - bunStringWidth(enterLabel),
    ze = renaming?.jobId ?? null,
    Rt = (Fe) => Sn(groupMode, Fe);
  const Vt = Box,
    Be = 0,
    gt = simpleView ? 1 : 2,
    kt = 1,
    $e =
      exitPending !== null
        ? r(Text, {
            dimColor: !0,
            children: [
              simpleView ? Xf[exitPending] : `Press ${exitPending} again to exit`,
              runningCount > 0 && ` \xB7 ${runningCount} ${plural(runningCount, "agent")} will keep running`,
            ],
          })
        : ze !== null || groupEdit !== null
          ? e(Text, {
              dimColor: !0,
              children: r(Byline, {
                children: [
                  e(KeyboardShortcutHint, { chord: "enter", action: "save", format: { keyCase: "lower" } }),
                  groupEdit?.kind === "assign" &&
                    draft.trim() !== "" &&
                    draft.trim() !== groupEdit.cur &&
                    suggestions.length > 0 &&
                    e(KeyboardShortcutHint, {
                      chord: "tab",
                      action: "complete",
                      format: { keyCase: "lower" },
                    }),
                  groupEdit?.kind === "assign" &&
                    groupPickIdx >= 0 &&
                    e(KeyboardShortcutHint, {
                      chord: re.arrowLeft,
                      action: "deselect",
                      format: { keyCase: "lower" },
                    }),
                  e(KeyboardShortcutHint, {
                    chord: "escape",
                    action: "cancel",
                    format: { keyCase: "lower" },
                  }),
                ],
              }),
            })
          : pending
            ? e(Text, {
                dimColor: !0,
                children: simpleView
                  ? e(Text, {
                      children: pending.justKilled
                        ? "stopped \xB7 ctrl+x again to delete \xB7 esc to keep"
                        : "ctrl+x again to delete \xB7 esc to keep",
                    })
                  : e(KeyboardShortcutHint, { chord: "ctrl+x", action: "confirm" }),
              })
            : error
              ? e(Text, { color: "error", wrap: "truncate-end", children: error })
              : st && Lt
                ? e(KeepHoldingHint, {})
                : st && Ye !== "idle"
                  ? e(VoiceStateIndicator, { voiceState: Ye })
                  : hint
                    ? e(Text, { dimColor: !0, wrap: "truncate-end", children: hint })
                    : simpleView && !suggestionsOpen && query === ""
                      ? e(Text, {
                          dimColor: !0,
                          wrap: "truncate-end",
                          children: r(Byline, {
                            children: [
                              e(Text, {
                                children:
                                  focusedRow?.kind === "newsession"
                                    ? `${re.arrowRight} or enter to start`
                                    : `${re.arrowRight} or enter to open`,
                              }),
                              focused &&
                                !focusedIsPending &&
                                e(Text, {
                                  children: isSettled(focused.state) ? "ctrl+x to delete" : "ctrl+x to stop",
                                }),
                              e(Text, { children: "? for shortcuts" }),
                              null,
                            ],
                          }),
                        })
                      : !previewOpen && !suggestionsOpen
                        ? r(Text, {
                            dimColor: !0,
                            wrap: "truncate-end",
                            children: [
                              null,
                              r(Byline, {
                                children: [
                                  dispatchDefaults &&
                                    hasNonDefaultDispatchSettings(dispatchDefaults) &&
                                    e(DispatchDefaultsLine, { defaults: dispatchDefaults }),
                                  ((focused && !focusedIsPending) || hasDispatch) &&
                                    !enterIsNoop &&
                                    !isBashDispatch &&
                                    e(KeyboardShortcutHint, {
                                      chord: "enter",
                                      action: Qt,
                                      format: { keyCase: "lower" },
                                    }),
                                  expandHintPasteId !== null &&
                                    query !== "" &&
                                    columns >= 90 + tt &&
                                    e(Text, { dimColor: !0, children: "paste again to expand" }),
                                  focusedRow?.kind === "header" &&
                                    query === "" &&
                                    !isOnboarding &&
                                    e(KeyboardShortcutHint, {
                                      chord: "enter",
                                      action: ge.has(Rt(focusedRow.group)) ? "expand" : "collapse",
                                      format: { keyCase: "lower" },
                                    }),
                                  focusedRow?.kind === "fold" &&
                                    query === "" &&
                                    e(KeyboardShortcutHint, {
                                      chord: "enter",
                                      action: "show all",
                                      format: { keyCase: "lower" },
                                    }),
                                  focused &&
                                    query === "" &&
                                    !isBashDispatch &&
                                    columns >= 55 &&
                                    e(KeyboardShortcutHint, {
                                      chord: " ",
                                      action: "reply",
                                      format: { keyCase: "lower" },
                                    }),
                                  st && mt !== "tap" && query === "" && !isBashDispatch && columns >= 55
                                    ? e(Text, { children: "hold space to speak" })
                                    : null,
                                  columns >= 80 &&
                                    (focused && !focusedIsPending && query === ""
                                      ? e(KeyboardShortcutHint, { chord: "ctrl+x", action: "delete" })
                                      : !hasComposedDispatch && byGroup && focusedRow?.kind === "header"
                                        ? focusedRow.group !== "pinned" &&
                                          focusedRow.group !== UNGROUPED &&
                                          focusedRow.group !== EARLIER
                                          ? e(KeyboardShortcutHint, { chord: "ctrl+x", action: "ungroup" })
                                          : null
                                        : !hasComposedDispatch && headerJobs.length > 0
                                          ? e(KeyboardShortcutHint, { chord: "ctrl+x", action: "delete all" })
                                          : null),
                                  isBashDispatch
                                    ? e(Text, { color: "bashBorder", children: "! for shell mode" })
                                    : query !== ""
                                      ? e(KeyboardShortcutHint, {
                                          chord: "escape",
                                          action: "clear",
                                          format: { keyCase: "lower" },
                                        })
                                      : e(Text, { children: "? for shortcuts" }),
                                  hasComposedDispatch &&
                                    !isBashDispatch &&
                                    K !== "" &&
                                    parseNewSessionPrefix(query) !== null &&
                                    expandHintPasteId === null &&
                                    columns >= 43 + tt + bunStringWidth(K) &&
                                    r(Text, { children: [K, " to find"] }),
                                  null,
                                  byGroup &&
                                    query === "" &&
                                    !!focused &&
                                    !focusedIsPending &&
                                    focused.state.backend === "daemon" &&
                                    oe !== "" &&
                                    columns >= 111 &&
                                    r(Text, { children: [oe, " to group"] }),
                                ],
                              }),
                            ],
                          })
                        : null;
  let ht;
  if (W[2] !== Vt || W[3] !== gt || W[4] !== $e)
    ((ht = e(Vt, { flexShrink: Be, paddingLeft: gt, height: kt, children: $e })),
      (W[2] = Vt),
      (W[3] = gt),
      (W[4] = $e),
      (W[5] = ht));
  else ht = W[5];
  return ht;
}
//@ chunk-93kwxas0.js:127689-127693 placement
j();
//@ chunk-93kwxas0.js:127693-127697 placement
j();
//@ chunk-93kwxas0.js:127697-127729 placement
function XS() {
  return Date.now();
}
//@ chunk-93kwxas0.js:127729-127743 placement
var fm = 2,
  mm = 4;
/**
 * 根据当前可用操作生成快捷键提示。
 */
//@ chunk-93kwxas0.js:127743-129270 placement
function FleetKeyHints({
  focusedPinned: focusedPinned,
  canReorder: canReorder,
  canRename: canRename,
  canGroup: canGroup,
  canPin: canPin,
  canMention: canMention,
  canSwitchViews: canSwitchViews,
  canSwitchTabs: canSwitchTabs,
  canDispatchAndOpen: canDispatchAndOpen,
  altOpenCount: altOpenCount,
  canDelete: canDelete,
  canGoBack: canGoBack,
}) {
  let X = Bo(),
    { columns: columns } = useTerminalSize(),
    W = shortcutDisplayFor("agents:switchView", X),
    z = shortcutDisplayFor("agents:togglePin", X),
    oe = shortcutDisplayFor("agents:find", X),
    ge = shortcutDisplayFor("agents:rename", X),
    se = shortcutDisplayFor("agents:setGroup", X),
    ne = shortcutDisplayFor("agents:previousGroup", X),
    ae = shortcutDisplayFor("agents:nextGroup", X),
    sliced = ne.slice(0, ne.lastIndexOf("+") + 1),
    Je =
      ne && ae && ae.startsWith(sliced)
        ? `${ne}/${ae.slice(sliced.length)}`
        : [ne, ae].filter(Boolean).join(" and "),
    le = [];
  if (canReorder) le.push(`shift+${re.arrowUp + re.arrowDown} to reorder`);
  if (canRename && ge) le.push(`${ge} to rename`);
  if (canGroup && se) le.push(`${se} to set group`);
  if (canSwitchViews) {
    if (oe) le.push(`${oe} to find`);
    if (Je) le.push(`${Je} to jump groups`);
    if (W) le.push(`${W} to switch views`);
    if ((le.push("ctrl+j for newline"), canDispatchAndOpen)) le.push("ctrl+enter to start and open");
  }
  if (canMention) le.push("@ to mention");
  if (canPin && z) le.push(`${z} to ${focusedPinned ? "unpin" : "pin to top"}`);
  if (altOpenCount > 0) le.push(`alt+1${altOpenCount > 1 ? `-${altOpenCount}` : ""} to open`);
  if (canDelete) le.push(`ctrl+x to ${canDelete}`);
  if (canGoBack) le.push(`${re.arrowLeft} to go back`);
  (le.push(canSwitchViews ? "esc to quit" : "esc to close \xB7 esc again quits"), le.push("? to close"));
  let Oe = [];
  for (let De = 3; ; De++) {
    Oe = [];
    for (let Re = 0; Re < le.length; Re += De) Oe.push(le.slice(Re, Re + De));
    if (
      2 * fm + mm * (Oe.length - 1) + T4e(Oe, (Re) => Math.max(...Re.map((je) => bunStringWidth(je)))) <=
        columns ||
      Oe.length === 1
    )
      break;
  }
  return e(Box, {
    flexShrink: 0,
    paddingX: fm,
    flexDirection: "row",
    gap: mm,
    children: Oe.map((De, we) =>
      e(
        Box,
        { flexDirection: "column", children: De.map((Re) => e(Text, { dimColor: !0, children: Re }, Re)) },
        we,
      ),
    ),
  });
}
/**
 * 会话预览头部（更新时间定时刷新）。
 */
//@ chunk-93kwxas0.js:129270-132789 placement
function JobPeekHeader(h) {
  let k = w(43),
    { job: job } = h,
    C;
  if (k[0] !== job) ((C = job ? Date.parse(job.state.updatedAt) : 0), (k[0] = job), (k[1] = C));
  else C = k[1];
  let x = C,
    [T, A] = y(XS),
    L;
  if (k[2] === MEMO_CACHE_SENTINEL) ((L = () => A(Date.now())), (k[2] = L));
  else L = k[2];
  if ((useInterval(L, !job ? null : T - x < 60000 ? 1000 : 30000), !job)) {
    let V;
    if (k[3] === MEMO_CACHE_SENTINEL)
      ((V = e(Box, {
        flexShrink: 0,
        paddingX: 2,
        children: e(Text, { dimColor: !0, children: "no job focused" }),
      })),
        (k[3] = V));
    else V = k[3];
    return V;
  }
  let state = job.state;
  const max = Math.max(0, T - x);
  let U;
  if (k[4] !== max) ((U = formatDuration(max, { mostSignificantOnly: !0 })), (k[4] = max), (k[5] = U));
  else U = k[5];
  let N = U,
    X;
  if (k[6] === MEMO_CACHE_SENTINEL) ((X = e(Text, { dimColor: !0, children: "backend " })), (k[6] = X));
  else X = k[6];
  let K;
  if (k[7] !== state.backend)
    ((K = r(Text, { children: [X, state.backend] })), (k[7] = state.backend), (k[8] = K));
  else K = k[8];
  let W;
  if (k[9] === MEMO_CACHE_SENTINEL) ((W = e(Text, { dimColor: !0, children: "dir " })), (k[9] = W));
  else W = k[9];
  let z;
  if (k[10] !== job.id) ((z = getJobDir(job.id)), (k[10] = job.id), (k[11] = z));
  else z = k[11];
  let oe;
  if (k[12] !== z) ((oe = r(Text, { children: [W, z] })), (k[12] = z), (k[13] = oe));
  else oe = k[13];
  let ge;
  if (k[14] === MEMO_CACHE_SENTINEL) ((ge = e(Text, { dimColor: !0, children: "cwd " })), (k[14] = ge));
  else ge = k[14];
  const se = state.worktreePath ?? state.cwd;
  let ne;
  if (k[15] !== se) ((ne = r(Text, { children: [ge, se] })), (k[15] = se), (k[16] = ne));
  else ne = k[16];
  let ae;
  if (k[17] !== ne || k[18] !== K || k[19] !== oe)
    ((ae = r(Box, { flexDirection: "column", children: [K, oe, ne] })),
      (k[17] = ne),
      (k[18] = K),
      (k[19] = oe),
      (k[20] = ae));
  else ae = k[20];
  let me;
  if (k[21] !== job.id || k[22] !== state.backend)
    ((me =
      state.backend === "daemon"
        ? r(Text, { children: [e(Text, { dimColor: !0, children: "shell " }), "claude attach ", job.id] })
        : null),
      (k[21] = job.id),
      (k[22] = state.backend),
      (k[23] = me));
  else me = k[23];
  let Je;
  if (k[24] === MEMO_CACHE_SENTINEL) ((Je = e(Text, { dimColor: !0, children: "session " })), (k[24] = Je));
  else Je = k[24];
  const le = state.resumeSessionId ?? state.sessionId;
  let Oe;
  if (k[25] !== le) ((Oe = r(Text, { children: [Je, le] })), (k[25] = le), (k[26] = Oe));
  else Oe = k[26];
  let De;
  if (k[27] === MEMO_CACHE_SENTINEL) ((De = e(Text, { dimColor: !0, children: "version " })), (k[27] = De));
  else De = k[27];
  let we;
  if (k[28] !== state.cliVersion)
    ((we =
      state.cliVersion === void 0
        ? e(Text, { dimColor: !0, children: "\u2014" })
        : state.cliVersion ===
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
            }.VERSION
          ? state.cliVersion
          : r(Fragment, {
              children: [
                e(Text, { color: "warning", children: state.cliVersion }),
                r(Text, {
                  dimColor: !0,
                  children: [
                    " \xB7 current ",
                    {
                      ISSUES_EXPLAINER:
                        "report the issue at https://github.com/anthropics/claude-code/issues",
                      PACKAGE_URL: "@anthropic-ai/claude-code",
                      README_URL: "https://code.claude.com/docs/en/overview",
                      VERSION: "2.1.316",
                      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                      BUILD_TIME: "2026-10-30T23:28:13Z",
                      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                      HOOKS_WORKER_URL:
                        import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                      DD_SOURCEMAP_GROUP: "default",
                    }.VERSION,
                  ],
                }),
              ],
            })),
      (k[28] = state.cliVersion),
      (k[29] = we));
  else we = k[29];
  let Re;
  if (k[30] !== we) ((Re = r(Text, { children: [De, we] })), (k[30] = we), (k[31] = Re));
  else Re = k[31];
  let je;
  if (k[32] === MEMO_CACHE_SENTINEL) ((je = e(Text, { dimColor: !0, children: "updated " })), (k[32] = je));
  else je = k[32];
  let st;
  if (k[33] !== N) ((st = r(Text, { children: [je, N, " ago"] })), (k[33] = N), (k[34] = st));
  else st = k[34];
  let mt;
  if (k[35] !== me || k[36] !== Oe || k[37] !== Re || k[38] !== st)
    ((mt = r(Box, { flexDirection: "column", children: [me, Oe, Re, st] })),
      (k[35] = me),
      (k[36] = Oe),
      (k[37] = Re),
      (k[38] = st),
      (k[39] = mt));
  else mt = k[39];
  let Ye;
  if (k[40] !== ae || k[41] !== mt)
    ((Ye = r(Box, { flexShrink: 0, paddingX: 2, flexDirection: "row", gap: 4, children: [ae, mt] })),
      (k[40] = ae),
      (k[41] = mt),
      (k[42] = Ye));
  else Ye = k[42];
  return Ye;
}
//@ chunk-93kwxas0.js:132789-132793 placement
j();
//@ chunk-93kwxas0.js:132793-132797 placement
j();
/**
 * 渲染待回答问题的一个选项行（序号、标签、说明）。
 */
//@ chunk-93kwxas0.js:132797-133089 placement
function renderQuestionOption(U, N) {
  return r(
    Box,
    {
      paddingLeft: 2,
      children: [
        e(Box, { width: 3, flexShrink: 0, children: r(Text, { dimColor: !0, children: [N + 1, "."] }) }),
        e(Box, {
          flexGrow: 1,
          width: 0,
          children: r(Text, {
            wrap: "truncate",
            children: [
              Dr(U.label),
              U.description && r(Text, { dimColor: !0, children: [" \xB7 ", Dr(U.description)] }),
            ],
          }),
        }),
      ],
    },
    U.label,
  );
}
/**
 * 显示会话等待中的第一个问题。
 */
//@ chunk-93kwxas0.js:133089-133837 placement
function PendingQuestionLine(h) {
  let C = w(14),
    { questions: questions } = h,
    k = questions[0];
  if (!k) {
    return null;
  }
  let x;
  if (C[0] !== k.question) ((x = Dr(k.question)), (C[0] = k.question), (C[1] = x));
  else x = C[1];
  let T;
  if (C[2] !== x)
    ((T = e(Box, { flexGrow: 1, width: 0, children: e(Text, { bold: !0, wrap: "truncate", children: x }) })),
      (C[2] = x),
      (C[3] = T));
  else T = C[3];
  let A;
  if (C[4] !== questions.length)
    ((A =
      questions.length > 1 &&
      e(Box, {
        flexShrink: 0,
        paddingLeft: 1,
        children: r(Text, {
          dimColor: !0,
          children: ["+", questions.length - 1, " more \xB7 enter to open"],
        }),
      })),
      (C[4] = questions.length),
      (C[5] = A));
  else A = C[5];
  let L;
  if (C[6] !== T || C[7] !== A) ((L = r(Box, { children: [T, A] })), (C[6] = T), (C[7] = A), (C[8] = L));
  else L = C[8];
  let V;
  if (C[9] !== k.options) ((V = k.options.map(renderQuestionOption)), (C[9] = k.options), (C[10] = V));
  else V = C[10];
  let D;
  if (C[11] !== L || C[12] !== V)
    ((D = r(Box, { flexDirection: "column", children: [L, V] })), (C[11] = L), (C[12] = V), (C[13] = D));
  else D = C[13];
  return D;
}
/**
 * 数字键 1–9 对应的第一个问题的选项标签。
 */
//@ chunk-93kwxas0.js:133837-133965 placement
function optionLabelForDigit(h, E) {
  let k = E?.[0];
  if (!k || h < "1" || h > "9") return null;
  let C = Number(h) - 1;
  return k.options[C]?.label.replace(CONTROL_CHARS_EXCEPT_WS_RE, "") ?? null;
}
//@ chunk-93kwxas0.js:133965-133993 placement
var wm = 8,
  Sm = 5,
  Dl = 500,
  ty = 150;
/**
 * 会话预览面板：日志尾、回复输入、附加、停止、重命名。
 */
//@ chunk-93kwxas0.js:133993-143138 placement
function JobPeek({
  job: job,
  status: status,
  isPending: isPending,
  deleteArmed: deleteArmed,
  onBack: onBack,
  onAttach: onAttach,
  onReply: onReply,
  onRefreshCloudRows: onRefreshCloudRows,
  isTerminalFocused: isTerminalFocused,
  childRows: childRows,
  editor: editor,
  replyError: replyError,
  renaming: renaming,
  heldInTerminal: heldInTerminal,
}) {
  let W = (_e) => editor.setReplyError(job.id, _e);
  P(() => logFleetJobAction("peek", job.state), []);
  let parse = Date.parse(job.state.updatedAt),
    { storageV5: storageV5 } = Me(),
    [ge, se] = y(() => Date.now()),
    ne = terminalOutcome(job.state.state) === null ? mo(job.state, job.state.needs ?? "") || void 0 : void 0,
    ae = Io(job.state),
    me = job.state.needs?.startsWith(VERIFICATION_REQUIRED_NEEDS) ? safeVerificationUrl : void 0,
    Je = job.state.tempo === "blocked" ? job.state.block?.questions : void 0,
    le = Je?.length ? Je : void 0,
    mapped = childRows.map((_e) => _e.row.href),
    De = (_e) =>
      mapped.some((It) => {
        let index = _e.indexOf(It);
        return index >= 0 && !/\w/.test(_e[index + It.length] ?? "") && _e.length - It.length < 16;
      }),
    we = ne ? [] : Object.entries(job.state.output ?? {}).filter(([, _e]) => !De(_e)),
    Re = le ? "questions" : ne ? "needs" : we.length > 0 ? "output" : "detail",
    je = Re === "questions" || Re === "needs",
    st = useIsScreenReaderEnabled() ? Bs : 1000;
  useInterval(() => se(Date.now()), je ? (ge - parse < 60000 ? st : 30000) : null);
  let mt = je ? formatDuration(Math.max(0, ge - parse), { mostSignificantOnly: !0 }) : "",
    Ye = R(!1),
    Lt = R(null);
  useFocusOnMount(Lt, !0);
  let dt = editor.replyDraft(job.id) ?? "",
    [Dt, eo] = y(getModeFromInput(dt) === "bash" ? "bash" : "prompt"),
    Wt = R(Dt),
    ke = (_e) => {
      ((Wt.current = _e), eo(_e));
    },
    Ge = Dt === "bash",
    yt =
      job.state.tempo === "blocked" && !job.state.block?.questions && job.state.suggestedReply
        ? Dr(job.state.suggestedReply) || void 0
        : void 0,
    Bt = !1,
    lt = !1,
    Tt = useVoiceAvailable(),
    Et = useAppState((_e) => _e.settings.voice?.mode ?? "hold"),
    Ot = useClock(),
    Yt = R(null),
    Ue = R(null),
    Qt = useGetVoiceState();
  P(
    () => () => {
      (Yt.current?.(), (Yt.current = null));
    },
    [],
  );
  let {
      query: query,
      queryRef: queryRef,
      setQuery: setQuery,
      cursorOffset: cursorOffset,
      cursorOffsetRef: cursorOffsetRef,
      setCursorOffset: setCursorOffset,
      handleKeyDown: handleKeyDown,
      handlePaste: handlePaste,
    } = useSearchInput({
      isActive: !0,
      multiline: !0,
      honorEditorMode: !0,
      backspaceExitsOnEmpty: !1,
      initialQuery: stripModePrefix(dt),
      onExit: () => {
        if (Ye.current) return;
        let _e = Ue.current;
        if (_e !== null && (_e.sameChunk || performance.now() - _e.at < ty)) return;
        let It = sanitizePromptText(queryRef.current, "fleet_reply");
        if (It.removedTotal > 0) {
          let it = { sameChunk: !0, at: performance.now() };
          ((Ue.current = it),
            queueMicrotask(() => {
              it.sameChunk = !1;
            }));
          let io = It.text.trim() === "";
          (setQuery(It.text),
            W(formatInvisibleCharsRemoved(It.removedTotal, io ? "empty" : "review")),
            M1r());
          return;
        }
        let trimmed = queryRef.current.trim();
        if (!trimmed && Wt.current === "prompt") {
          ((Ye.current = !0), onAttach());
          return;
        }
        if (!trimmed) return;
        let No = prependModeCharacterToInput_2(trimmed, Wt.current),
          Qo = Wt.current;
        ((Ye.current = !0), setQuery(""), ke("prompt"), W(null), editor.deleteReplyDraft(job.id));
        let Po = parsePastedRefs(No),
          xe = {};
        for (let it of Po) {
          let io = editor.pastes[it.id];
          if (io) xe[it.id] = io;
        }
        let qt = () => {
          if (queryRef.current === "" && stripModePrefix(editor.replyDraft(job.id) ?? "") === "") {
            (editor.saveReplyDraft(job.id, No), setQuery(trimmed), ke(Qo));
            for (let it of Po) {
              let io = xe[it.id];
              if (io) editor.pastes[it.id] = io;
            }
          }
        };
        if (job.state.backend === "remote" && Qo === "bash") {
          ((Ye.current = !1),
            qt(),
            W(
              "'!' commands can't be sent to a cloud session from this view; open the session to try it there",
            ));
          return;
        }
        if (job.state.backend === "remote" && Po.some((it) => xe[it.id]?.type === "image")) {
          ((Ye.current = !1),
            qt(),
            W(
              "Image attachments aren't available when replying to cloud sessions yet \u2014 open the session to send images",
            ));
          return;
        }
        materializePastedImages(
          No,
          xe,
          job.id,
          storageV5,
          isNonPromptInput(No, null) || isExecLaunch(job.state) ? "path" : "note",
        )
          .catch((it) => (logError(it), No))
          .then((it) => onReply(it))
          .then(
            (it) => {
              if (it) (qt(), W(it));
              else editor.pruneOrphanedPastes({ pruneTextPastes: !0 });
            },
            (it) => {
              (qt(), W(errorMessage(it)));
            },
          )
          .finally(() => {
            Ye.current = !1;
          });
      },
      onCancel: onBack,
      onSpaceOnEmpty: Ge
        ? void 0
        : Tt && Et !== "tap"
          ? () => {
              (Yt.current?.(),
                (Yt.current = Ot.setTimeout(() => {
                  Yt.current = null;
                  let _e = Qt();
                  if (_e.voiceState !== "idle" || _e.voiceWarmingUp) return;
                  if (queryRef.current.trim() !== "") return;
                  onBack();
                }, Dl)));
            }
          : onBack,
      onTabOnEmpty:
        yt && !Ge
          ? () => {
              (setQuery(yt),
                logEvent("tengu_prompt_suggestion", {
                  outcome: lit("accepted"),
                  source: lit("fleetview_peek"),
                }),
                recordSuggestionOutcome(!0, storageV5));
            }
          : void 0,
    }),
    $e = replyError?.error ?? null;
  (P(() => {
    editor.saveReplyDraft(job.id, prependModeCharacterToInput_2(query, Dt));
  }, [query, Dt, job.id, editor]),
    P(() => {
      let registerLivePeekQuery = editor.registerLivePeekQuery(() => queryRef.current);
      return () => {
        (registerLivePeekQuery(), editor.pruneOrphanedPastes());
      };
    }, [editor, queryRef]),
    P(() => zZ(() => [queryRef.current]), [queryRef]));
  let ht = cacheImagePath(() => editor.pastes, handlePaste, { onMinted: editor.noteMintedPaste }),
    { handleKeyDown: handleKeyDown_2, handlePaste: handlePaste_2 } = usePasteHandler({
      handleKeyDown: handleKeyDown,
      onPaste: (_e) =>
        handlePaste(
          new PasteEvent(
            _e.replace(
              /\r\n|\r/g,
              `
`,
            ),
          ),
        ),
      onImagePaste: ht,
    }),
    [Jt] = y(() => ({
      get value() {
        return queryRef.current;
      },
      get cursorOffset() {
        return cursorOffsetRef.current;
      },
      setValueWithCursor: (_e, It) => {
        (setQuery(_e), setCursorOffset(It));
      },
    })),
    qe = useVoiceIntegration({ composer: Jt }),
    He = useAppState_2((_e) => _e.voiceState),
    ct = useAppState_2((_e) => _e.voiceWarmingUp);
  P(() => {
    if (He !== "idle" && Yt.current) (Yt.current(), (Yt.current = null));
  }, [He]);
  let vt = useAppState((_e) => isReducedMotion(_e.settings.prefersReducedMotion)),
    rt = useAppState((_e) => _e.settings?.prUrlTemplate),
    Qe = He === "recording" && !vt,
    { handleKeyDown: handleKeyDown_3 } = useVoiceKeybindingHandler({
      voiceHandleKeyEvent: qe.handleKeyEvent,
      voiceCancelRecording: qe.cancelRecording,
      stripTrailing: qe.stripTrailing,
      resetAnchor: qe.resetAnchor,
      isActive: (Et !== "tap" || query.trim().length > 0) && !Ge && !renaming,
      composer: Jt,
    }),
    St = le ? 2 + (le[0]?.options.length ?? 0) : 0,
    Ne = !heldInTerminal && Ep(job.state.respawnFlags),
    uo = je || Ne ? 1 : 0,
    { rows: rows, columns: columns } = useTerminalSize(),
    At = Bo(),
    pt = 8,
    Nt = query
      ? countCharInString(
          query,
          `
`,
        )
      : 0,
    ceil = Math.ceil(
      Math.max(
        1,
        ...(Re === "needs"
          ? [bunStringWidth(mo(job.state, ne ?? ""))]
          : Re === "output"
            ? we.map(([, _e]) => bunStringWidth(mo(job.state, _e)))
            : Re === "detail"
              ? [bunStringWidth(mo(job.state, job.state.detail))]
              : []),
      ) / Math.max(40, columns - 6),
    ),
    Ce = shouldUseFullscreenByDefault()
      ? Math.min(
          ceil,
          Math.max(Sm, rows - pt - Math.min(childRows.length, wm) - St - uo - Nt - ($e ? 1 : 0) - 1),
        )
      : Sm,
    at = (Re === "questions" ? St : Re === "output" ? we.length * Ce : Ce) + uo + Nt + ($e ? 1 : 0) + 1,
    max = Math.max(wm, rows - pt - at),
    sliced = childRows.slice(0, max),
    Jo = childRows.length - sliced.length,
    max_2 = Math.max(0, ...we.map(([_e]) => bunStringWidth(_e))),
    zo = 5,
    { color: color } = Cp(job.state, job.activity, status);
  return r(Fragment, {
    children: [
      r(Box, {
        ref: Lt,
        flexDirection: "column",
        borderStyle: "round",
        borderColor: Ge ? "bashBorder" : void 0,
        borderDimColor: !Ge,
        paddingX: 1,
        minHeight: zo,
        width: "100%",
        tabIndex: 0,
        autoFocus: !0,
        onKeyDownCapture: handleKeyDown_3,
        onKeyDown: (_e) => {
          if (_e.key !== " " && Yt.current) (Yt.current(), (Yt.current = null));
          if (renaming) return;
          if (FLEET_EDITOR_SAFE_ACTIONS.has(resolveFleetKeyAction(keyEventToKeystroke(_e), At))) return;
          if (isPasteImageKey(_e)) {
            (_e.preventDefault(),
              _e.stopImmediatePropagation(),
              pasteImageFromClipboard(
                (It) => ht(It.base64, { mediaType: It.mediaType, dimensions: It.dimensions }),
                (It) => editor.setReplyError(job.id, It, "paste"),
              ));
            return;
          }
          if (Wt.current === "prompt") {
            if (_e.name === "right" && !_e.shift && !queryRef.current) {
              if ((_e.preventDefault(), Ye.current)) return;
              ((Ye.current = !0), onAttach());
              return;
            }
            if (isBashModeChar(_e.key) && !queryRef.current) {
              (_e.preventDefault(), ke("bash"));
              return;
            }
            if (!queryRef.current) {
              let It = optionLabelForDigit(_e.key, le);
              if (It) {
                (_e.preventDefault(), setQuery(It), setCursorOffset(It.length));
                return;
              }
            }
          } else if (_e.name === "backspace" && !queryRef.current) {
            (_e.preventDefault(), ke("prompt"));
            return;
          }
          handleKeyDown_2(_e);
        },
        onPaste: renaming ? void 0 : handlePaste_2,
        children: [
          Re === "questions" && le
            ? e(PendingQuestionLine, { questions: le })
            : Re === "needs"
              ? e(Box, {
                  maxHeight: Ce,
                  overflowY: "hidden",
                  children: e(Text, {
                    wrap: "wrap",
                    children: ae
                      ? e(Text, { dimColor: !0, children: ne ?? "" })
                      : e(InlineMarkup, { value: stripJobPreviewText(ne ?? ""), linkHref: me }),
                  }),
                })
              : Re === "output"
                ? e(Box, {
                    flexDirection: "column",
                    children: we.map(([_e, It]) =>
                      r(
                        Box,
                        {
                          children: [
                            we.length > 1 &&
                              e(Box, {
                                width: max_2 + 2,
                                flexShrink: 0,
                                children: e(Text, { dimColor: !0, children: _e }),
                              }),
                            e(Box, {
                              flexGrow: 1,
                              width: 0,
                              maxHeight: Ce,
                              overflowY: "hidden",
                              children: e(Text, {
                                wrap: "wrap",
                                children: ae
                                  ? e(Text, { dimColor: !0, children: mo(job.state, It) })
                                  : e(InlineMarkup, { value: stripJobPreviewText(It) }),
                              }),
                            }),
                          ],
                        },
                        _e,
                      ),
                    ),
                  })
                : e(Box, {
                    maxHeight: Ce,
                    overflowY: "hidden",
                    children: e(Text, {
                      wrap: "wrap",
                      children: ae
                        ? mo(job.state, job.state.detail)
                        : e(LinkifiedText, { children: stripJobPreviewText(job.state.detail) }),
                    }),
                  }),
          sliced.length > 0 &&
            r(Box, {
              flexDirection: "column",
              children: [
                sliced.map((_e) =>
                  r(
                    Box,
                    {
                      children: [
                        e(Box, {
                          flexGrow: 1,
                          width: 0,
                          children: r(Text, {
                            wrap: "truncate",
                            children: [
                              _e.prNumber !== void 0
                                ? e(PrBadge, {
                                    number: _e.prNumber,
                                    url: _e.row.href,
                                    kind: Ci(_e.row),
                                    color: _e.color,
                                    underline: !1,
                                    hidePrefix: !0,
                                  })
                                : e(Text, {
                                    color: _e.color,
                                    dimColor: !wn(_e),
                                    children: wn(_e) ? hf : "PR",
                                  }),
                              _e.label
                                ? r(Fragment, {
                                    children: [
                                      " ",
                                      e(Link, {
                                        url: See(_e.row.href, rt),
                                        children: r(Text, {
                                          color: _e.isDraft ? "inactive" : void 0,
                                          children: [_e.label, _e.isDraft ? " (draft)" : ""],
                                        }),
                                      }),
                                    ],
                                  })
                                : null,
                            ],
                          }),
                        }),
                        _e.diffStat &&
                          _e.diffStat.additions + _e.diffStat.deletions > 0 &&
                          e(Box, {
                            flexShrink: 0,
                            paddingLeft: 1,
                            children: e(Link, {
                              url: `${_e.row.href}/files`,
                              children: e(DiffStatCounts, {
                                added: _e.diffStat.additions,
                                removed: _e.diffStat.deletions,
                              }),
                            }),
                          }),
                        e(Box, {
                          flexShrink: 0,
                          paddingLeft: 1,
                          children: _e.status.map((It, go) =>
                            r(
                              Kc,
                              {
                                children: [
                                  go > 0 && e(Text, { children: " " }),
                                  e(Text, { color: It.color, dimColor: !It.color, children: It.text }),
                                ],
                              },
                              go,
                            ),
                          ),
                        }),
                      ],
                    },
                    _e.row.href,
                  ),
                ),
                Jo > 0 &&
                  e(Box, {
                    paddingLeft: 2,
                    children: r(Text, { dimColor: !0, children: ["\u2026 ", Jo, " more"] }),
                  }),
              ],
            }),
          uo > 0 &&
            e(Box, {
              paddingLeft: 2,
              children: e(Text, {
                wrap: "truncate",
                children: r(Byline, {
                  children: [
                    je && r(Text, { color: color, children: ["waiting ", mt] }),
                    Ne && e(Text, { dimColor: !0, children: "safe mode" }),
                    Ne && e(Text, { dimColor: !0, children: "customizations are off" }),
                  ],
                }),
              }),
            }),
          e(Box, { flexGrow: 1 }),
          e(Box, {
            marginTop: 1,
            children: e(SearchBox, {
              query: query,
              cursorOffset: cursorOffset,
              onCursorOffsetChange: setCursorOffset,
              placeholder:
                Tt && (He !== "idle" || ct)
                  ? ""
                  : le
                    ? `press 1-${le[0]?.options.length ?? 2} or type your answer`
                    : yt && !Ge
                      ? yt
                      : "reply",
              prefix: Ge ? "!" : re.pointer,
              prefixColor: Ge ? "bashBorder" : void 0,
              prefixDim: !query.trim(),
              dimRange: qe.interimRange ? [qe.interimRange.start, qe.interimRange.end] : void 0,
              cursorChar: Qe ? e(VoiceLevelGlyph, {}) : void 0,
              isFocused: !renaming,
              isTerminalFocused: isTerminalFocused,
              width: "100%",
              borderless: !0,
              wrapColumns: columns - 4,
            }),
          }),
          $e && e(Text, { color: "error", dimColor: !0, wrap: "truncate", children: $e }),
        ],
      }),
      e(Box, {
        paddingLeft: 2,
        children:
          Tt && ct && !renaming
            ? e(KeepHoldingHint, {})
            : Tt && He !== "idle" && !renaming
              ? e(VoiceStateIndicator, { voiceState: He })
              : e(Text, {
                  dimColor: !0,
                  children: renaming
                    ? r(Byline, {
                        children: [
                          e(KeyboardShortcutHint, {
                            chord: "enter",
                            action: "save",
                            format: { keyCase: "lower" },
                          }),
                          e(KeyboardShortcutHint, {
                            chord: "escape",
                            action: "cancel",
                            format: { keyCase: "lower" },
                          }),
                        ],
                      })
                    : r(Byline, {
                        children: [
                          Ge && e(Text, { color: "bashBorder", children: "! for shell mode" }),
                          (query.trim() || (!Ge && !isPending)) &&
                            e(KeyboardShortcutHint, {
                              chord: "enter",
                              action: query.trim() ? "send" : cs(job.state) ? "resume" : "open",
                              format: { keyCase: "lower" },
                            }),
                          e(KeyboardShortcutHint, {
                            chord: query.trim() || Ge ? "escape" : " ",
                            action: "close",
                            format: { keyCase: "lower" },
                          }),
                          Tt && Et !== "tap" && !Ge && !query.trim()
                            ? e(Text, { children: "hold space to speak" })
                            : null,
                          e(KeyboardShortcutHint, {
                            chord: "ctrl+x",
                            action: deleteArmed ? "confirm" : "delete",
                          }),
                        ],
                      }),
                }),
      }),
    ],
  });
}
//@ chunk-93kwxas0.js:143138-143175 placement
function Jy(oo) {
  return oo.replyError;
}
//@ chunk-93kwxas0.js:143175-143212 placement
function jy(Ce) {
  return Ce.prStatuses;
}
//@ chunk-93kwxas0.js:143212-143266 placement
function Wy(Ke) {
  return Ke.kind === "job" && Ke.group === SIMPLE_PINNED;
}
/**
 * Agents 视图主体（列表、预览、标签页、云会话行）。
 */
//@ chunk-93kwxas0.js:143266-148818 placement
function FleetBody(h) {
  let Et = w(57),
    {
      owners: owners,
      layout: layout,
      footer: footer,
      simpleView: simpleView,
      groupsEnabled: groupsEnabled,
      showRemoteTabs: showRemoteTabs,
      canMention: canMention,
      isTerminalFocused: isTerminalFocused,
      awayLoop: awayLoop,
      storageV5: storageV5,
      onOpen: onOpen,
      onStop: onStop,
    } = h,
    { roster: roster, view: view, attach: attach, editor: editor, deleteConfirm: deleteConfirm } = owners,
    {
      helpOpen: helpOpen,
      debugOpen: debugOpen,
      previewOpen: previewOpen,
      groupEdit: groupEdit,
      renaming: renaming,
      resumePicker: resumePicker,
      resumePickerIdx: resumePickerIdx,
      settingPicker: settingPicker,
      settingPickerIdx: settingPickerIdx,
      activeTab: activeTab,
    } = useStoreSelector(view),
    je = useStoreSelector(editor, Jy),
    st = useStoreSelector(roster, jy),
    { pending: pending } = useStoreSelector(deleteConfirm),
    [Ye, Lt] = y(!1),
    dt = rHt(),
    {
      rows: rows,
      byState: byState,
      byGroup: byGroup,
      focusedRow: focusedRow,
      focused: focused,
      focusedIsPending: focusedIsPending,
      altOpenOrigin: altOpenOrigin,
      ageNow: ageNow,
    } = layout,
    Tt = renaming?.jobId ?? null,
    Ot;
  if (Et[0] !== roster) ((Ot = (Yt) => roster.liveStatus(Yt)), (Et[0] = roster), (Et[1] = Ot));
  else Ot = Et[1];
  let Ue = Ot,
    Qt = onOpen,
    tt;
  if (Et[2] !== focused || Et[3] !== st)
    ((tt = focused?.state.children ? childFrameRows(focused.state.children, st) : []),
      (Et[2] = focused),
      (Et[3] = st),
      (Et[4] = tt));
  else tt = Et[4];
  let ze = tt,
    Fe;
  if (Et[5] !== ageNow || Et[6] !== resumePicker || Et[7] !== resumePickerIdx)
    ((Fe =
      resumePicker !== null
        ? (() => {
            let Rt;
            if (resumePicker.entries === null)
              Rt = e(Text, { dimColor: !0, children: "Looking for past sessions\u2026" });
            else if (resumePicker.failed)
              Rt = e(Text, {
                dimColor: !0,
                children: "Couldn't load past sessions \u2014 press esc, then try /resume again",
              });
            else if (resumePicker.entries.length === 0)
              Rt = e(Text, { dimColor: !0, children: "No past sessions to resume" });
            else {
              let entries = resumePicker.entries;
              let max = Math.max(0, Math.min(resumePickerIdx - 3, entries.length - 8));
              let sliced = entries.slice(max, max + 8);
              let kt = entries.length - max - sliced.length;
              Rt = r(Fragment, {
                children: [
                  max > 0 && r(Text, { dimColor: !0, children: ["  ", "\u2026 ", max, " above"] }),
                  sliced.map(($e, ht) => {
                    let jt = max + ht === resumePickerIdx;
                    return r(
                      Box,
                      {
                        children: [
                          e(Box, {
                            flexGrow: 1,
                            flexShrink: 1,
                            overflow: "hidden",
                            children: r(Text, {
                              color: jt ? "suggestion" : void 0,
                              dimColor: !jt,
                              wrap: "truncate",
                              children: [jt ? re.pointer : " ", " ", $e.title],
                            }),
                          }),
                          e(Box, {
                            flexShrink: 0,
                            marginLeft: 1,
                            children: e(Text, {
                              dimColor: !0,
                              children: formatDuration(
                                Math.max(0, (ageNow ?? Date.now()) - $e.modified.getTime()),
                                { mostSignificantOnly: !0 },
                              ),
                            }),
                          }),
                        ],
                      },
                      $e.sessionId,
                    );
                  }),
                  kt > 0 && r(Text, { dimColor: !0, children: ["  ", "\u2026 ", kt, " more"] }),
                ],
              });
            }
            return e(Box, {
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              flexDirection: "column",
              opaque: !0,
              children: r(Box, {
                flexDirection: "column",
                borderStyle: "round",
                paddingX: 1,
                children: [
                  e(Text, { bold: !0, children: "Resume a past session" }),
                  Rt,
                  e(Text, {
                    dimColor: !0,
                    children:
                      "\u2191/\u2193 to navigate \xB7 enter to resume as a background session \xB7 esc to close",
                  }),
                ],
              }),
            });
          })()
        : null),
      (Et[5] = ageNow),
      (Et[6] = resumePicker),
      (Et[7] = resumePickerIdx),
      (Et[8] = Fe));
  else Fe = Et[8];
  let We = Fe,
    Jt;
  if (Et[9] !== settingPicker || Et[10] !== settingPickerIdx)
    ((Jt =
      settingPicker !== null
        ? (() => {
            let { setting: setting, options: options } = settingPicker;
            let max = Math.max(0, Math.min(settingPickerIdx - 3, options.length - 8));
            let sliced = options.slice(max, max + 8);
            let rt = options.length - max - sliced.length;
            return e(Box, {
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              flexDirection: "column",
              opaque: !0,
              children: r(Box, {
                flexDirection: "column",
                borderStyle: "round",
                paddingX: 1,
                children: [
                  r(Text, {
                    bold: !0,
                    children: [
                      setting === "model" ? "Model" : setting === "effort" ? "Effort" : "Fast mode",
                      " ",
                      "for new sessions from this window (not saved)",
                    ],
                  }),
                  max > 0 && r(Text, { dimColor: !0, children: ["  ", "\u2026 ", max, " above"] }),
                  sliced.map((Qe, Xe) => {
                    let St = max + Xe === settingPickerIdx;
                    return r(
                      Text,
                      {
                        color: St ? "suggestion" : void 0,
                        dimColor: !St,
                        wrap: "truncate",
                        children: [
                          St ? re.pointer : " ",
                          " ",
                          Qe.value,
                          Qe.description ? ` \xB7 ${Qe.description}` : "",
                        ],
                      },
                      Qe.value,
                    );
                  }),
                  rt > 0 && r(Text, { dimColor: !0, children: ["  ", "\u2026 ", rt, " more"] }),
                  e(Text, {
                    dimColor: !0,
                    children: "\u2191/\u2193 to navigate \xB7 enter to select \xB7 esc to close",
                  }),
                ],
              }),
            });
          })()
        : null),
      (Et[9] = settingPicker),
      (Et[10] = settingPickerIdx),
      (Et[11] = Jt));
  else Jt = Et[11];
  let Ne = Jt,
    uo;
  if (
    Et[12] !== activeTab ||
    Et[13] !== altOpenOrigin ||
    Et[14] !== byGroup ||
    Et[15] !== byState ||
    Et[16] !== canMention ||
    Et[17] !== debugOpen ||
    Et[18] !== focused ||
    Et[19] !== focusedIsPending ||
    Et[20] !== focusedRow ||
    Et[21] !== footer ||
    Et[22] !== groupsEnabled ||
    Et[23] !== helpOpen ||
    Et[24] !== previewOpen ||
    Et[25] !== rows ||
    Et[26] !== showRemoteTabs ||
    Et[27] !== simpleView
  )
    ((uo =
      helpOpen && !previewOpen
        ? e(FleetKeyHints, {
            focusedPinned: focused?.state.pinned ?? !1,
            canReorder:
              !!focused &&
              (simpleView
                ? (focused.state.pinned ?? !1) && count(rows, Wy) > 1
                : (!byState && !byGroup) || (focused.state.pinned ?? !1)),
            canRename:
              (byGroup &&
                focusedRow?.kind === "header" &&
                focusedRow.group !== "pinned" &&
                focusedRow.group !== UNGROUPED &&
                focusedRow.group !== EARLIER) ||
              (!!focused &&
                !focusedIsPending &&
                (focused.state.backend === "daemon" || !!focused.state.sock)),
            canGroup: groupsEnabled && !!focused && !focusedIsPending && focused.state.backend === "daemon",
            canPin: !!focused && !focusedIsPending,
            canMention: !simpleView && canMention,
            canSwitchViews: !simpleView,
            canSwitchTabs: showRemoteTabs && !simpleView,
            canDispatchAndOpen: activeTab === "local" && supportsExtendedKeys(),
            altOpenCount: Math.min(
              9,
              count(rows, (Kt) => Kt.kind === "job" && Kt.origin === altOpenOrigin),
            ),
            canDelete: focused && !focusedIsPending ? (isSettled(focused.state) ? "delete" : "stop") : void 0,
            canGoBack: !1,
          })
        : debugOpen && !previewOpen
          ? e(JobPeekHeader, { job: focused })
          : footer),
      (Et[12] = activeTab),
      (Et[13] = altOpenOrigin),
      (Et[14] = byGroup),
      (Et[15] = byState),
      (Et[16] = canMention),
      (Et[17] = debugOpen),
      (Et[18] = focused),
      (Et[19] = focusedIsPending),
      (Et[20] = focusedRow),
      (Et[21] = footer),
      (Et[22] = groupsEnabled),
      (Et[23] = helpOpen),
      (Et[24] = previewOpen),
      (Et[25] = rows),
      (Et[26] = showRemoteTabs),
      (Et[27] = simpleView),
      (Et[28] = uo));
  else uo = Et[28];
  let po;
  if (Et[29] !== Ye || Et[30] !== dt)
    ((po = e(AutoUpdaterWrapper, {
      isUpdating: Ye,
      onChangeIsUpdating: Lt,
      showSuccessMessage: dt,
      verbose: !1,
    })),
      (Et[29] = Ye),
      (Et[30] = dt),
      (Et[31] = po));
  else po = Et[31];
  let At;
  if (
    Et[32] !== attach ||
    Et[33] !== awayLoop ||
    Et[34] !== editor ||
    Et[35] !== focused ||
    Et[36] !== ze ||
    Et[37] !== focusedIsPending ||
    Et[38] !== groupEdit ||
    Et[39] !== isTerminalFocused ||
    Et[40] !== Ue ||
    Et[41] !== onStop ||
    Et[42] !== Qt ||
    Et[43] !== pending ||
    Et[44] !== previewOpen ||
    Et[45] !== Tt ||
    Et[46] !== je ||
    Et[47] !== roster ||
    Et[48] !== storageV5 ||
    Et[49] !== view
  )
    ((At =
      previewOpen &&
      focused &&
      e(Box, {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "column",
        opaque: !0,
        children: e(
          JobPeek,
          {
            job: focused,
            renaming: Tt !== null || groupEdit !== null,
            editor: editor,
            replyError: je?.jobId === focused.id ? je : null,
            status: Ue(focused),
            heldInTerminal: roster.terminalHolderOf(focused) !== void 0,
            isPending: focusedIsPending,
            deleteArmed: pending?.id === focused.id ? { justKilled: pending.justKilled } : void 0,
            onBack: () => view.setPreviewOpen(!1),
            onAttach: () => {
              (Qt(focused), view.setPreviewOpen(!1));
            },
            childRows: ze,
            onReply: (pt) =>
              replyToJob(
                {
                  editor: editor,
                  roster: roster,
                  attach: attach,
                  awayLoop: awayLoop,
                  storageV5: storageV5,
                  stop: onStop,
                },
                focused,
                pt,
              ),
            onRefreshCloudRows: void 0,
            isTerminalFocused: isTerminalFocused,
          },
          focused.id,
        ),
      })),
      (Et[32] = attach),
      (Et[33] = awayLoop),
      (Et[34] = editor),
      (Et[35] = focused),
      (Et[36] = ze),
      (Et[37] = focusedIsPending),
      (Et[38] = groupEdit),
      (Et[39] = isTerminalFocused),
      (Et[40] = Ue),
      (Et[41] = onStop),
      (Et[42] = Qt),
      (Et[43] = pending),
      (Et[44] = previewOpen),
      (Et[45] = Tt),
      (Et[46] = je),
      (Et[47] = roster),
      (Et[48] = storageV5),
      (Et[49] = view),
      (Et[50] = At));
  else At = Et[50];
  let Nt;
  if (Et[51] !== We || Et[52] !== Ne || Et[53] !== uo || Et[54] !== po || Et[55] !== At)
    ((Nt = r(Fragment, { children: [uo, po, We, Ne, At] })),
      (Et[51] = We),
      (Et[52] = Ne),
      (Et[53] = uo),
      (Et[54] = po),
      (Et[55] = At),
      (Et[56] = Nt));
  else Nt = Et[56];
  return Nt;
}
//@ chunk-93kwxas0.js:148818-148822 placement
j();
//@ chunk-93kwxas0.js:148822-148859 placement
function IE(Qt) {
  return Qt.voiceState;
}
//@ chunk-93kwxas0.js:148859-148900 placement
function TE(tt) {
  return tt.voiceWarmingUp;
}
/**
 * Agents 视图搜索/派发输入框（高亮、语音、建议列表）。
 */
//@ chunk-93kwxas0.js:148900-152228 placement
function FleetSearchInput(h) {
  let dt = w(47),
    {
      owners: owners,
      layout: layout,
      onCursorOffsetChange: onCursorOffsetChange,
      highlights: highlights,
      voice: voice,
      isTerminalFocused: isTerminalFocused,
      simpleView: simpleView,
      hasGroups: hasGroups,
      suggestionList: suggestionList,
      cloudListNotice: cloudListNotice,
    } = h,
    { view: view, editor: editor } = owners,
    { columns: columns } = useTerminalSize(),
    { query: query, cursorOffset: cursorOffset, mode: mode } = useStoreSelector(editor),
    {
      activeTab: activeTab,
      groupEdit: groupEdit,
      renaming: renaming,
      previewOpen: previewOpen,
      resumePicker: resumePicker,
      settingPicker: settingPicker,
    } = useStoreSelector(view),
    le = useVoiceAvailable(),
    Oe = useAppState_2(IE),
    De = useAppState_2(TE),
    {
      onlyOrigin: onlyOrigin,
      byGroup: byGroup,
      filtered: filtered,
      isBashDispatch: isBashDispatch,
      hasDispatch: hasDispatch,
      queryIsFilter: queryIsFilter,
    } = layout,
    Lt = renaming?.jobId ?? null,
    Dt;
  if (dt[0] === MEMO_CACHE_SENTINEL)
    ((Dt = e(Text, {
      dimColor: !0,
      children:
        "A different way to work with Claude: hand off a bigger task than you would chat through, and Claude organizes it in the sections above so you know when it needs you.",
    })),
      (dt[0] = Dt));
  else Dt = dt[0];
  let eo = Dt;
  const Wt = Bo();
  let ke;
  if (dt[1] !== Wt) ((ke = shortcutDisplayFor("agents:setGroup", Wt)), (dt[1] = Wt), (dt[2] = ke));
  else ke = dt[2];
  let Ge = ke,
    yt;
  if (
    dt[3] !== byGroup ||
    dt[4] !== filtered ||
    dt[5] !== hasGroups ||
    dt[6] !== query ||
    dt[7] !== Ge ||
    dt[8] !== simpleView
  )
    ((yt =
      !simpleView && byGroup && !hasGroups && filtered.length > 0 && !query && Ge !== ""
        ? r(Text, { dimColor: !0, children: ["No groups yet \u2014 press ", Ge, " on a session to tag it."] })
        : null),
      (dt[3] = byGroup),
      (dt[4] = filtered),
      (dt[5] = hasGroups),
      (dt[6] = query),
      (dt[7] = Ge),
      (dt[8] = simpleView),
      (dt[9] = yt));
  else yt = dt[9];
  let Bt = yt,
    lt;
  if (dt[10] === MEMO_CACHE_SENTINEL)
    ((lt = e(Box, {
      position: "absolute",
      marginTop: -1,
      height: 1,
      width: "100%",
      paddingLeft: 2,
      paddingRight: 1,
      flexDirection: "column",
      alignItems: "flex-end",
      justifyContent: "flex-end",
      overflow: "hidden",
      children: e(PromptToast, {}),
    })),
      (dt[10] = lt));
  else lt = dt[10];
  let Tt;
  if (dt[11] !== cloudListNotice)
    ((Tt =
      cloudListNotice &&
      e(Box, {
        paddingLeft: 1,
        marginBottom: 1,
        children: r(Text, {
          wrap: "truncate-end",
          children: [
            cloudListNotice.failed
              ? e(Text, { color: "warning", children: cloudListNotice.text })
              : e(Text, { dimColor: !0, children: cloudListNotice.text }),
            cloudListNotice.hint !== void 0 &&
              r(Text, { dimColor: !0, children: [" \xB7 ", cloudListNotice.hint] }),
          ],
        }),
      })),
      (dt[11] = cloudListNotice),
      (dt[12] = Tt));
  else Tt = dt[12];
  let Et;
  if (dt[13] !== activeTab || dt[14] !== onlyOrigin || dt[15] !== query || dt[16] !== simpleView)
    ((Et =
      onlyOrigin &&
      activeTab !== "remote" &&
      !query &&
      !simpleView &&
      e(Box, { paddingLeft: 1, marginBottom: 1, children: eo })),
      (dt[13] = activeTab),
      (dt[14] = onlyOrigin),
      (dt[15] = query),
      (dt[16] = simpleView),
      (dt[17] = Et));
  else Et = dt[17];
  let Ot;
  if (dt[18] !== Bt)
    ((Ot = Bt && e(Box, { paddingLeft: 1, marginBottom: 1, children: Bt })), (dt[18] = Bt), (dt[19] = Ot));
  else Ot = dt[19];
  let Yt;
  if (
    dt[20] !== columns ||
    dt[21] !== cursorOffset ||
    dt[22] !== mode ||
    dt[23] !== groupEdit ||
    dt[24] !== hasDispatch ||
    dt[25] !== highlights ||
    dt[26] !== isBashDispatch ||
    dt[27] !== isTerminalFocused ||
    dt[28] !== onCursorOffsetChange ||
    dt[29] !== previewOpen ||
    dt[30] !== query ||
    dt[31] !== queryIsFilter ||
    dt[32] !== Lt ||
    dt[33] !== resumePicker ||
    dt[34] !== settingPicker ||
    dt[35] !== simpleView ||
    dt[36] !== voice ||
    dt[37] !== le ||
    dt[38] !== Oe ||
    dt[39] !== De
  )
    ((Yt = simpleView
      ? null
      : e(Box, {
          flexDirection: "column",
          borderStyle: "round",
          borderLeft: !1,
          borderRight: !1,
          borderColor: isBashDispatch ? "bashBorder" : void 0,
          borderDimColor: !isBashDispatch,
          children: e(SearchBox, {
            query: query,
            cursorOffset: cursorOffset,
            onCursorOffsetChange: onCursorOffsetChange,
            placeholder:
              isBashDispatch || (le && (Oe !== "idle" || De)) ? "" : "describe a task for a new session",
            prefix: mode === "bash" ? "!" : !queryIsFilter ? re.pointer : void 0,
            prefixDim: !hasDispatch && !isBashDispatch,
            prefixColor: isBashDispatch ? "bashBorder" : void 0,
            highlights: highlights,
            dimRange: voice.interimRange ? [voice.interimRange.start, voice.interimRange.end] : void 0,
            cursorChar: voice.showCursor ? e(VoiceLevelGlyph, {}) : void 0,
            isFocused:
              !previewOpen &&
              Lt === null &&
              groupEdit === null &&
              resumePicker === null &&
              settingPicker === null,
            isTerminalFocused: isTerminalFocused,
            width: "100%",
            borderless: !0,
            wrapColumns: columns,
          }),
        })),
      (dt[20] = columns),
      (dt[21] = cursorOffset),
      (dt[22] = mode),
      (dt[23] = groupEdit),
      (dt[24] = hasDispatch),
      (dt[25] = highlights),
      (dt[26] = isBashDispatch),
      (dt[27] = isTerminalFocused),
      (dt[28] = onCursorOffsetChange),
      (dt[29] = previewOpen),
      (dt[30] = query),
      (dt[31] = queryIsFilter),
      (dt[32] = Lt),
      (dt[33] = resumePicker),
      (dt[34] = settingPicker),
      (dt[35] = simpleView),
      (dt[36] = voice),
      (dt[37] = le),
      (dt[38] = Oe),
      (dt[39] = De),
      (dt[40] = Yt));
  else Yt = dt[40];
  let Ue;
  if (dt[41] !== suggestionList || dt[42] !== Tt || dt[43] !== Et || dt[44] !== Ot || dt[45] !== Yt)
    ((Ue = r(Box, {
      flexShrink: 0,
      flexDirection: "column",
      marginTop: 1,
      children: [lt, Tt, Et, Ot, suggestionList, null, Yt],
    })),
      (dt[41] = suggestionList),
      (dt[42] = Tt),
      (dt[43] = Et),
      (dt[44] = Ot),
      (dt[45] = Yt),
      (dt[46] = Ue));
  else Ue = dt[46];
  return Ue;
}
/**
 * 派发模式提示行。
 */
//@ chunk-93kwxas0.js:152228-153447 placement
function DispatchModeLine(h) {
  let V = w(30),
    {
      editor: editor,
      selection: selection,
      query: query,
      dispatchMode: dispatchMode,
      collapsed: collapsed,
      canonicalLauncherCwd: canonicalLauncherCwd,
      storageV5: storageV5,
    } = h,
    D;
  if (V[0] !== canonicalLauncherCwd || V[1] !== editor || V[2] !== selection || V[3] !== storageV5)
    ((D = () => persistFleetDraft(editor, selection, canonicalLauncherCwd, storageV5)),
      (V[0] = canonicalLauncherCwd),
      (V[1] = editor),
      (V[2] = selection),
      (V[3] = storageV5),
      (V[4] = D));
  else D = V[4];
  let U;
  if (
    V[5] !== canonicalLauncherCwd ||
    V[6] !== collapsed ||
    V[7] !== dispatchMode ||
    V[8] !== query ||
    V[9] !== storageV5
  )
    ((U = [query, dispatchMode, collapsed, canonicalLauncherCwd, storageV5]),
      (V[5] = canonicalLauncherCwd),
      (V[6] = collapsed),
      (V[7] = dispatchMode),
      (V[8] = query),
      (V[9] = storageV5),
      (V[10] = U));
  else U = V[10];
  useTimeout(D, 300, U);
  let N;
  if (V[11] !== canonicalLauncherCwd || V[12] !== editor || V[13] !== selection || V[14] !== storageV5)
    ((N = () => persistFleetDraft(editor, selection, canonicalLauncherCwd, storageV5)),
      (V[11] = canonicalLauncherCwd),
      (V[12] = editor),
      (V[13] = selection),
      (V[14] = storageV5),
      (V[15] = N));
  else N = V[15];
  let X = Oo(N),
    K;
  if (V[16] !== X) ((K = () => () => X()), (V[16] = X), (V[17] = K));
  else K = V[17];
  let W;
  if (V[18] === MEMO_CACHE_SENTINEL) ((W = []), (V[18] = W));
  else W = V[18];
  P(K, W);
  let z = R(!1),
    oe,
    ge;
  if (V[19] !== canonicalLauncherCwd || V[20] !== editor || V[21] !== selection || V[22] !== storageV5)
    ((oe = () =>
      isStorageV5Enabled() && storageV5 !== void 0
        ? registerPreExitFlush(async () => {
            let draftForDisk = editor.draftForDisk();
            let ne = [...selection.getSnapshot().collapsed];
            z.current =
              draftForDisk || ne.length
                ? await writeJobDraft(canonicalLauncherCwd, { q: draftForDisk, collapsed: ne }, storageV5)
                : !0;
          })
        : void 0),
      (ge = [canonicalLauncherCwd, editor, selection, storageV5]),
      (V[19] = canonicalLauncherCwd),
      (V[20] = editor),
      (V[21] = selection),
      (V[22] = storageV5),
      (V[23] = oe),
      (V[24] = ge));
  else ((oe = V[23]), (ge = V[24]));
  P(oe, ge);
  let ae, me;
  if (V[25] !== canonicalLauncherCwd || V[26] !== editor || V[27] !== selection)
    ((ae = () =>
      onExit(() => {
        if (z.current) {
          return;
        }
        let draftForDisk = editor.draftForDisk();
        let le = [...selection.getSnapshot().collapsed];
        if (draftForDisk || le.length) ZOo(canonicalLauncherCwd, { q: draftForDisk, collapsed: le });
      })),
      (me = [canonicalLauncherCwd, editor, selection]),
      (V[25] = canonicalLauncherCwd),
      (V[26] = editor),
      (V[27] = selection),
      (V[28] = ae),
      (V[29] = me));
  else ((ae = V[28]), (me = V[29]));
  P(ae, me);
}
/**
 * 保存或清除 Agents 视图的草稿与折叠状态。
 */
//@ chunk-93kwxas0.js:153447-153572 placement
function persistFleetDraft(h, E, k, C) {
  let draftForDisk = h.draftForDisk(),
    T = [...E.getSnapshot().collapsed];
  draftForDisk || T.length ? TVn(k, { q: draftForDisk, collapsed: T }, C) : deleteJobDraft(k, C);
}
//@ chunk-93kwxas0.js:153572-153594 placement
var Ql = { pending: null };
/**
 * 离开期间循环（away loop）状态存储。
 */
//@ chunk-93kwxas0.js:153594-154228 placement
class AwayLoopStore {
  #n = createSignal();
  #e = Ql;
  #l = 0;
  #t = 0;
  #r = new Set();
  #i;
  constructor(h) {
    this.#i = h.onArm;
  }
  getSnapshot = () => this.#e;
  subscribe = (h) => this.#n.subscribe(h);
  attachView() {
    this.#l++;
    let h = !1;
    return () => {
      if (h) return;
      if (((h = !0), this.#l--, this.#l === 0)) (this.#r.clear(), this.#t++, (this.#e = Ql));
    };
  }
  get pending() {
    return this.#e.pending;
  }
  get generation() {
    return this.#t;
  }
  arm(h, E = !1, k, C) {
    (this.#i(),
      this.#r.delete(h),
      (this.#e = { pending: { id: h, justKilled: E, group: k, sortKey: C } }),
      this.#n.emit());
  }
  disarm() {
    if (this.#e.pending === null) return;
    ((this.#e = Ql), this.#n.emit());
  }
  dismiss() {
    let pending = this.#e.pending;
    if (pending === null) return;
    (this.#r.add(pending.id), this.disarm());
  }
  isDismissed(h) {
    return this.#r.has(h);
  }
}
//@ chunk-93kwxas0.js:154228-154280 placement
function Um(h, E) {
  return (h.deleteConfirm ??= new AwayLoopStore(E));
}
//@ chunk-93kwxas0.js:154280-154486 placement
var FLEET_VIEW_SNAPSHOT_KEYS = [
  "groupMode",
  "activeTab",
  "groupEdit",
  "groupPickIdx",
  "groupPristine",
  "resumePicker",
  "resumePickerIdx",
  "settingPicker",
  "settingPickerIdx",
  "renaming",
  "previewOpen",
  "helpOpen",
  "debugOpen",
  "exitPending",
];
/**
 * Agents 视图浮层状态初始值。
 */
//@ chunk-93kwxas0.js:154486-154701 placement
function createInitialFleetViewOverlays() {
  return {
    groupEdit: null,
    groupPickIdx: -1,
    groupPristine: !1,
    resumePicker: null,
    resumePickerIdx: 0,
    settingPicker: null,
    settingPickerIdx: 0,
    renaming: null,
    previewOpen: !1,
    helpOpen: !1,
    debugOpen: !1,
    exitPending: null,
  };
}
/**
 * Agents 视图状态存储（分组模式、标签页、重命名、分组编辑等）。
 */
//@ chunk-93kwxas0.js:154701-156979 placement
class FleetViewStore {
  #n = createSignal();
  #e;
  #l = 0;
  #t = 0;
  #r = null;
  #i = null;
  #c = 0;
  #s = null;
  #a = new Set();
  constructor(h) {
    this.#e = {
      groupMode: h.groupMode,
      activeTab: h.activeTab ?? "local",
      ...createInitialFleetViewOverlays(),
    };
  }
  getSnapshot = () => this.#e;
  subscribe = (h) => this.#n.subscribe(h);
  #o(h) {
    let E = this.#e,
      k = { ...E, ...h };
    if (FLEET_VIEW_SNAPSHOT_KEYS.every((C) => Object.is(k[C], E[C]))) return;
    ((this.#e = k), this.#n.emit());
  }
  attachView(h) {
    (this.#l++, this.restrictGroupMode(h.groupsEnabled));
    let E = !1;
    return () => {
      if (E) return;
      if (((E = !0), this.#l--, this.#l === 0))
        (this.#t++,
          (this.#i = null),
          (this.#c = 0),
          (this.#r = null),
          this.cancelPeekTap(),
          this.#a.clear(),
          (this.#e = { ...this.#e, ...createInitialFleetViewOverlays() }));
    };
  }
  setGroupMode(h) {
    this.#o({ groupMode: h });
  }
  restrictGroupMode(h) {
    if (!h && this.#e.groupMode === "group") this.#o({ groupMode: "state" });
  }
  vouchForLink(h) {
    this.#r = h;
  }
  takeVouchedLink(h) {
    let E = this.#r === h;
    return ((this.#r = null), E);
  }
  setActiveTab(h) {
    (this.#t++, (this.#r = null), this.#o({ activeTab: h, resumePicker: null, settingPicker: null }));
  }
  openGroupEdit(h, E) {
    this.#o({ groupEdit: h, groupPristine: E });
  }
  closeGroupEdit() {
    this.#o({ groupEdit: null, groupPickIdx: -1, groupPristine: !1 });
  }
  setGroupPickIdx(h) {
    this.#o({ groupPickIdx: h });
  }
  setGroupPristine(h) {
    this.#o({ groupPristine: h });
  }
  openResumePicker() {
    let h = ++this.#t;
    return (this.#o({ resumePicker: { entries: null, failed: !1 }, resumePickerIdx: 0 }), h);
  }
  get resumePickerGen() {
    return this.#t;
  }
  setResumePicker(h) {
    this.#o({ resumePicker: h });
  }
  closeResumePicker() {
    (this.#t++, this.#o({ resumePicker: null }));
  }
  setResumePickerIdx(h) {
    this.#o({ resumePickerIdx: h });
  }
  get resumePromoteSessionId() {
    return this.#i;
  }
  set resumePromoteSessionId(h) {
    this.#i = h;
  }
  refuseResumePick(h) {
    ((this.#c = h), this.closeResumePicker());
  }
  get resumePickerRefusedAt() {
    return this.#c;
  }
  clearResumePickerRefusal() {
    this.#c = 0;
  }
  openSettingPicker(h, E) {
    this.#o({ settingPicker: h, settingPickerIdx: E });
  }
  closeSettingPicker() {
    this.#o({ settingPicker: null });
  }
  setSettingPickerIdx(h) {
    this.#o({ settingPickerIdx: h });
  }
  startRename(h, E, k) {
    this.#o({ renaming: { jobId: h, sock: E, cloud: k } });
  }
  clearRename() {
    this.#o({ renaming: null });
  }
  setPreviewOpen(h) {
    this.#o({ previewOpen: h });
  }
  schedulePeekTap(h, E) {
    (this.cancelPeekTap(),
      (this.#s = h(() => {
        ((this.#s = null), E());
      })));
  }
  cancelPeekTap() {
    if (this.#s === null) return;
    let h = this.#s;
    ((this.#s = null), h());
  }
  setHelpOpen(h) {
    this.#o({ helpOpen: h });
  }
  setDebugOpen(h) {
    this.#o({ debugOpen: h });
  }
  setExitPending = (h) => {
    this.#o({ exitPending: h });
  };
  firstImpression(h) {
    if (this.#a.has(h)) return !1;
    return (this.#a.add(h), !0);
  }
}
/**
 * 取或创建 FleetViewStore，分组模式取全局配置。
 */
//@ chunk-93kwxas0.js:156979-157133 placement
function ensureFleetViewStore(h, E, k) {
  if (h.view) return h.view;
  let C = getGlobalConfig().fleetViewGroupMode ?? "state";
  return (h.view = new FleetViewStore({ groupMode: C === "group" && !E ? "state" : C, activeTab: k }));
}
/**
 * 退出 Agents 视图时的动作：直接退出、等待启动、提示或回到来源会话。
 */
//@ chunk-93kwxas0.js:157133-157421 placement
function resolveExitAction(h) {
  if (h.originJobId === void 0) return { kind: "exit" };
  if (h.originSpawn !== void 0 && !h.originSpawn.settled) return { kind: "wait-starting" };
  if (h.originSpawn !== void 0 && !h.originSpawn.ok) return { kind: "exit-with-hint" };
  return h.originRowPresent ? { kind: "attach-origin" } : { kind: "exit-with-hint" };
}
//@ chunk-93kwxas0.js:157421-157490 placement
var xE = 300,
  FE = "Still saving the last rename. Try again in a moment.";
/**
 * 提交会话重命名。
 */
//@ chunk-93kwxas0.js:157490-158765 placement
function submitRename(h) {
  let { roster: roster, editor: editor, view: view, storageV5: storageV5 } = h.submit,
    { simpleView: simpleView, readRenameDraft: readRenameDraft, clearRename: clearRename } = h,
    { setError: setError, setHint: setHint } = editor,
    renaming = view.getSnapshot().renaming,
    N = renaming?.jobId,
    X = renaming?.sock ?? null,
    trimmed = readRenameDraft().trim();
  if ((clearRename(), !N || !trimmed)) return;
  if (X) {
    (roster.updateAdoptedPeers((W) =>
      W.map((z) =>
        z.id !== N
          ? z
          : {
              ...z,
              state: { ...z.state, name: trimmed, intent: trimmed, updatedAt: new Date().toISOString() },
            },
      ),
    ),
      sendControlToUdsSocket(X, { action: "rename", name: trimmed }, { storageV5: storageV5 })
        .then(() => {
          logFeatureOk("fleet_view_rename_job");
        })
        .catch((W) => {
          (logForDebugging(`[fleetview] peer rename failed: ${W}`),
            logFeatureBad("fleet_view_rename_job", "peer_uds_failed"),
            setError("Couldn't rename \u2014 that session isn't responding"),
            roster.updateAdoptedPeers((z) =>
              z.map((oe) =>
                oe.id === N && oe.state.name === trimmed
                  ? { ...oe, state: { ...oe.state, updatedAt: new Date(0).toISOString() } }
                  : oe,
              ),
            ));
        }));
    return;
  }
  if (
    simpleView &&
    roster.jobs?.some((W) => W.id !== N && W.state.name !== void 0 && W.state.name === trimmed)
  )
    setHint(`Another session is already named "${trimmed}"`);
  (roster.bumpGen(),
    roster.updateJobs((W) =>
      W ? W.map((z) => (z.id === N ? { ...z, state: { ...z.state, name: trimmed } } : z)) : W,
    ),
    syncJobName(N, trimmed, "user", storageV5).then((W) => {
      if (W) {
        logFeatureOk("fleet_view_rename_job");
        return;
      }
      (setError("Couldn't rename \u2014 the job may have been removed or its state file is unwritable."),
        logFeatureBad("fleet_view_rename_job", "sync_name_failed"),
        roster.updateJobs((z) =>
          z
            ? z.map((oe) =>
                oe.id === N && oe.state.name === trimmed
                  ? { ...oe, state: { ...oe.state, name: void 0 } }
                  : oe,
              )
            : z,
        ));
    }));
}
/**
 * 提交会话分组编辑。
 */
//@ chunk-93kwxas0.js:158765-159980 placement
function submitGroupEdit(h) {
  let { roster: roster, selection: selection, editor: editor, view: view, storageV5: storageV5 } = h.submit,
    {
      groupSuggestions: groupSuggestions,
      readGroupDraft: readGroupDraft,
      clearGroupEdit: clearGroupEdit,
      ck: ck,
    } = h,
    setError = editor.setError,
    { groupEdit: groupEdit, groupPickIdx: groupPickIdx } = view.getSnapshot();
  if (!groupEdit) {
    clearGroupEdit();
    return;
  }
  let K = groupEdit.kind === "assign" && groupPickIdx >= 0 ? groupSuggestions[groupPickIdx] : void 0,
    W = sanitizeGroupName(K ?? readGroupDraft()) || void 0;
  if (W && isReservedGroupName(W)) return;
  if (groupEdit.kind === "assign") {
    let found = renderListResultMessage(roster).find((le) => le.id === groupEdit.jobId),
      Je = found?.state.group;
    if ((clearGroupEdit(), W !== Je)) setJobGroup(h, groupEdit.jobId, W, !1);
    return;
  }
  let from = groupEdit.from;
  if (!W || W === from) {
    clearGroupEdit();
    return;
  }
  if (renderListResultMessage(roster).some((ae) => ae.state.group === W)) return;
  clearGroupEdit();
  let mapped = (roster.jobs ?? [])
    .filter((ae) => ae.state.group === from && ae.state.backend === "daemon")
    .map((ae) => ae.id);
  ((selection.followOrigin = W),
    (selection.followId = null),
    roster.bumpGen(),
    selection.renameCollapsedKey(ck(from, "group"), ck(W, "group")),
    roster.updateJobs((ae) =>
      ae ? ae.map((me) => (me.state.group === from ? { ...me, state: { ...me.state, group: W } } : me)) : ae,
    ));
  let ge = !1,
    se = ge ? roster.regroupRemoteRows(from, W) : Promise.resolve(!0),
    mapped_2 = mapped.map(roster.holdJob);
  Promise.all([se, ...mapped.map((ae) => writeJobGroup(getJobDir(ae), W, storageV5))])
    .then(([ae]) => {
      if (ae) logFeatureOk("fleet_view_group_rename");
      else Ia(setError, "fleet_view_group_rename");
    })
    .catch((ae) => {
      if (
        (logError(ae),
        setError(`Couldn't rename group \u2014 ${errorMessage(ae)}`),
        logFeatureBad("fleet_view_group_rename", "write_group_failed"),
        roster.reload(),
        ge)
      )
        roster.regroupRemoteRows(W, from);
    })
    .finally(() => {
      for (let ae of mapped_2) ae();
    });
}
/**
 * 停止或删除会话（非 daemon 会话拒绝），带二次确认。
 */
//@ chunk-93kwxas0.js:159980-161116 placement
function stopOrDeleteJob(h, E, k, C = !1) {
  let { roster: roster, editor: editor } = h.submit,
    { deleteConfirm: deleteConfirm, actions: actions, groupOf: groupOf, simpleView: simpleView } = h,
    setError = editor.setError;
  if (!k) return;
  if (k.state.backend !== "daemon") {
    setError("Can't stop or delete \u2014 this session is running in another terminal");
    return;
  }
  let N = jobTempo(k.state),
    found = actions.find((z) => z.key === E && z.bands.includes(N));
  if (!found) return;
  let K = (z, oe) => {
    if (oe instanceof FleetActionUnconfirmedError)
      logForDebugging(`[FleetView] action '${z}' unconfirmed: ${errorMessage(oe)}`, { level: "warn" });
    else if (isFsInaccessible(oe))
      logForDebugging(`[FleetView] action '${z}' fs failure (${oe.code}): ${errorMessage(oe)}`, {
        level: "error",
      });
    else logError(oe);
    setError(`Couldn't ${z} \u2014 ${errorMessage(oe)}`);
  };
  if (E === "x" && !C && deleteConfirm.pending?.id !== k.id) {
    let found_2 = actions.find((ae) => ae.label === "stop"),
      oe = groupOf.get(k.id),
      ge = jobSortKey(k.state, oe),
      generation = deleteConfirm.generation;
    deleteConfirm.arm(k.id, found.label === "stop", oe, ge);
    let ne = !(simpleView && isSettled(k.state));
    if (found_2 && ne)
      Promise.resolve(found_2.run(k, { bulk: C })).catch((ae) => {
        if (
          deleteConfirm.generation === generation &&
          !roster.isDeleting(k.id) &&
          roster.jobs?.some((me) => me.id === k.id) &&
          (deleteConfirm.pending === null || deleteConfirm.pending.id === k.id) &&
          !deleteConfirm.isDismissed(k.id)
        )
          deleteConfirm.arm(k.id, !1, oe, ge);
        K(found_2.label, ae);
      });
    return;
  }
  deleteConfirm.disarm();
  let W = E === "x" ? (actions.find((z) => z.label === "delete") ?? found) : found;
  Promise.resolve(W.run(k, { bulk: C })).then(
    (z) => {
      if (z) setError(z);
    },
    (z) => K(W.label, z),
  );
}
/**
 * 按方向找下一个可聚焦的行（跳过标题或非会话行）。
 */
//@ chunk-93kwxas0.js:161116-161403 placement
function nextFocusableRow(h, E, k) {
  let {
      rows: rows,
      hasComposedDispatch: hasComposedDispatch,
      byState: byState,
      dispatchRepoCwd: dispatchRepoCwd,
      previewOpen: previewOpen,
    } = h,
    V = rows.length;
  if (V === 0) return 0;
  if (hasComposedDispatch && (byState || dispatchRepoCwd)) return E;
  let D = hasComposedDispatch
      ? (N) => N?.kind !== "header" || N.group === "pinned"
      : previewOpen
        ? (N) => N?.kind !== "job"
        : null,
    U = (E + k + V) % V;
  if (D) while (U !== E && D(rows[U])) U = (U + k + V) % V;
  return U;
}
/**
 * 处理跳到上/下一个分组的快捷键。
 */
//@ chunk-93kwxas0.js:161403-161717 placement
function jumpGroupHeader(h, E, k) {
  if (E !== "agents:nextGroup" && E !== "agents:previousGroup") return null;
  let { rows: rows, hasComposedDispatch: hasComposedDispatch, previewOpen: previewOpen } = h;
  if (
    h.submit.suggestions.length > 0 ||
    previewOpen ||
    hasComposedDispatch ||
    !rows.some((V) => V.kind === "header")
  )
    return null;
  let A = E === "agents:nextGroup" ? 1 : -1,
    L = k + A;
  while (rows[L] && rows[L]?.kind !== "header") L += A;
  return rows[L] ? L : k;
}
/**
 * 设置会话分组（新建/加入/取消分组）并上报。
 */
//@ chunk-93kwxas0.js:161717-162441 placement
function setJobGroup(h, E, k, C) {
  let { roster: roster, selection: selection, editor: editor, storageV5: storageV5 } = h.submit,
    { ck: ck } = h,
    setError = editor.setError,
    U = k !== void 0 && !renderListResultMessage(roster).some((K) => K.id !== E && K.state.group === k),
    N = k === void 0 ? "fleet_view_group_ungroup" : U ? "fleet_view_group_create" : "fleet_view_group_assign";
  if (
    ((selection.followId = C
      ? (roster.getSnapshot().remoteJobs.find((remoteJob) => remoteRowIdOf(remoteJob) === E)?.id ?? E)
      : E),
    C)
  ) {
    (selection.uncollapse(ck(k ?? UNGROUPED, "group")),
      roster
        .markRemoteRow(E, (K) => ({ ...K, group: k }))
        .then((K) => {
          if (K) logFeatureOk(N);
          else Ia(setError, N);
        }));
    return;
  }
  (roster.bumpGen(),
    roster.updateJobs((K) =>
      K ? K.map((W) => (W.id === E ? { ...W, state: { ...W.state, group: k } } : W)) : K,
    ),
    selection.uncollapse(ck(k ?? UNGROUPED, "group")));
  let holdJob = roster.holdJob(E);
  writeJobGroup(getJobDir(E), k, storageV5)
    .then(() => {
      logFeatureOk(N);
    })
    .catch((K) => {
      (logError(K),
        setError(`Couldn't set group \u2014 ${errorMessage(K)}`),
        logFeatureBad(N, "write_group_failed"),
        roster.reload());
    })
    .finally(holdJob);
}
/**
 * 停止某分组内所有 daemon 会话。
 */
//@ chunk-93kwxas0.js:162441-163145 placement
function stopGroup(h, E) {
  let { roster: roster, selection: selection, editor: editor, storageV5: storageV5 } = h.submit,
    { ck: ck } = h,
    setError = editor.setError,
    mapped = (roster.jobs ?? [])
      .filter((N) => N.state.group === E && N.state.backend === "daemon")
      .map((N) => N.id);
  ((selection.followOrigin = UNGROUPED),
    (selection.followId = null),
    roster.bumpGen(),
    selection.uncollapse(ck(E, "group"), ck(UNGROUPED, "group")),
    roster.updateJobs((N) =>
      N ? N.map((X) => (X.state.group === E ? { ...X, state: { ...X.state, group: void 0 } } : X)) : N,
    ));
  let resolved = Promise.resolve(!0),
    mapped_2 = mapped.map(roster.holdJob);
  Promise.all([resolved, ...mapped.map((N) => writeJobGroup(getJobDir(N), void 0, storageV5))])
    .then(([N]) => {
      if (N) logFeatureOk("fleet_view_group_delete");
      else Ia(setError, "fleet_view_group_delete");
    })
    .catch((N) => {
      (logError(N),
        setError(`Couldn't remove group \u2014 ${errorMessage(N)}`),
        logFeatureBad("fleet_view_group_delete", "write_group_failed"),
        roster.reload());
    })
    .finally(() => {
      for (let N of mapped_2) N();
    });
}
//@ chunk-93kwxas0.js:163145-163163 placement
function Ia(h, E) {}

export {
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
};
