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
import { FLEET_KEY_ACTIONS, useFleetBindings, FLEET_EDITOR_SAFE_ACTIONS } from "./FleetList.js";
import { getSingleKeyActionInContexts } from "../../keybindings/resolver.js";
import { AGENTS_GROUP_PATH, GLOBAL_CHAT_GROUP_PATH } from "../agents/utils.js";
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
import {
  groupCollapseKey,
  hasSafeModeFlag,
  activityColors,
  InlineMarkup,
  prKindOf,
  isFrameRow,
  SIMPLE_PINNED,
  childFrameRows,
} from "./FleetRow.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import {
  plural,
  collapseWhitespace,
  CONTROL_CHARS_EXCEPT_WS_RE,
  countCharInString,
} from "../../utils/stringUtils.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
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
  jobPreviewText,
  returnFalse_2,
  stripJobPreviewText,
  isFailedSettledJob,
  jobTempo,
  jobSortKey_2,
  remoteRowIdOf,
} from "./fleetRows.js";
import { parseNewSessionPrefix, isPasteImageKey, pasteImageFromClipboard } from "./fleetSessions.js";
import { init_react_production, y, P, R, Kc, Oo } from "../../../vendor/react/cjs/react.production.js";
import { sumByAliasField } from "../../services/artifacts/frameApi.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useInterval } from "../../ink/components/Input.js";
import { formatDuration } from "../../utils/format.js";
import { logFleetJobAction, FleetActionUnconfirmedError } from "./fleetActions.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { VERIFICATION_REQUIRED_NEEDS } from "../../services/sessionStatus/sessionStateClassifier.js";
import { safeVerificationUrl } from "../../services/api/verificationRequired.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { DISPATCH_TIMEOUT_MS, replyToJob } from "./fleetDispatch.js";
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
import { sanitizePromptText_2, forceRedraw } from "../../utils/promptTextSanitize.js";
import { formatInvisibleCharsRemoved } from "../../utils/invisibleChars.js";
import { parsePastedRefs, registerPasteCarrier } from "../../history.js";
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
import { BOXED_DIAMOND_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";
import { expandPrUrlIfTemplate } from "../../utils/ghPrStatus.js";
import { SearchBox } from "../SearchBox.js";
import { isNoForceUpdateRenders } from "../../utils/Cursor.js";
import { count } from "../../utils/collections.js";
import { supportsExtendedKeys } from "../../ink/terminal.js";
import { AutoUpdaterWrapper } from "../AutoUpdaterWrapper.js";
import { PromptToast } from "../PromptInput/Notifications.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { registerPreExitFlush } from "../../utils/cleanupRegistry.js";
import {
  writeJobDraft,
  writeDraftBestEffort,
  sweepDraft,
  deleteJobDraft,
} from "../../daemon/jobs/draftSweep.js";
import { onExit } from "../../../vendor/signal-exit/dist/mjs/index.js";
import { createSignal } from "../../utils/signal.js";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { string } from "../../../vendor/zod/v4/classic/schemas.js";
import { getGlobalConfig } from "../../utils/config.js";
import { sendControlToUdsSocket } from "../../utils/udsMessaging/udsClient.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { renderListResultMessage } from "../../tools/ScheduleCronTool/UI.js";

//@ chunk-93kwxas0.js:123639-123687 placement
function matchFleetKeyAction(singleKeyActionInContexts) {
  return FLEET_KEY_ACTIONS.find((E) => E === singleKeyActionInContexts) ?? null;
}
//@ chunk-93kwxas0.js:123687-123790 placement
/**
 * 按两组快捷键上下文解析单键动作。
 */
function resolveFleetKeyAction(h, E) {
  if (!h) return null;
  let singleKeyActionInContexts = getSingleKeyActionInContexts(h, AGENTS_GROUP_PATH, E);
  if (singleKeyActionInContexts !== undefined) return matchFleetKeyAction(singleKeyActionInContexts);
  return matchFleetKeyAction(getSingleKeyActionInContexts(h, GLOBAL_CHAT_GROUP_PATH, E));
}
//@ chunk-93kwxas0.js:123790-123967 placement
/**
 * 找某动作的单键快捷键显示文本。
 */
function shortcutDisplayFor(h, fleetBindings) {
  for (let k = fleetBindings.length - 1; k >= 0; k--) {
    let C = fleetBindings[k];
    if (!C || C.action !== h || C.chord.length !== 1) continue;
    let x = C.chord[0];
    if (x && resolveFleetKeyAction(x, fleetBindings) === h)
      return chordToDisplayString(C.chord, getShortcutDisplayPlatform());
  }
  return "";
}
//@ chunk-93kwxas0.js:123967-124003 placement
function selectCollapsedKeys(jt) {
  return jt.collapsed;
}
//@ chunk-93kwxas0.js:124003-124058 placement
function selectVoiceMode(We) {
  return We.settings.voice?.mode ?? "hold";
}
//@ chunk-93kwxas0.js:124058-124095 placement
function selectVoiceState(Jt) {
  return Jt.voiceState;
}
//@ chunk-93kwxas0.js:124095-124136 placement
function selectVoiceWarmingUp(qe) {
  return qe.voiceWarmingUp;
}
//@ chunk-93kwxas0.js:124136-124226 placement
var EXIT_HINT_TEXT = {
  "Ctrl-C": "press ctrl+c or q again to exit",
  "Ctrl-D": "press ctrl+d again to exit",
};
//@ chunk-93kwxas0.js:124226-127689 placement
/**
 * Agents 视图底部快捷键提示栏。
 */
function FleetFooter(props) {
  let W = w(6);
  let { owners, layout, simpleView, dispatchDefaults, groupInput, suggestionsOpen } = props;
  let { selection, view, editor, deleteConfirm } = owners;
  let { columns } = useTerminalSize();
  let fleetBindings = useFleetBindings();
  let K = shortcutDisplayFor("agents:find", fleetBindings);
  let z;
  if (W[0] !== fleetBindings) {
    z = shortcutDisplayFor("agents:setGroup", fleetBindings);
    W[0] = fleetBindings;
    W[1] = z;
  } else z = W[1];
  let oe = z;
  let storeSelector = useStoreSelector(selection, selectCollapsedKeys);
  let { groupMode, groupEdit, groupPickIdx, renaming, previewOpen, exitPending } = useStoreSelector(view);
  let { query, error, hint, expandHintPasteId } = useStoreSelector(editor);
  let { pending } = useStoreSelector(deleteConfirm);
  let voiceAvailable = useVoiceAvailable();
  let appState = useAppState(selectVoiceMode);
  let appState_2 = useAppState_2(selectVoiceState);
  let appState_3 = useAppState_2(selectVoiceWarmingUp);
  let {
    focusedRow,
    focused,
    focusedIsPending,
    runningCount,
    hasDispatch,
    hasComposedDispatch,
    isBashDispatch,
    enterIsNoop,
    enterLabel,
    isOnboarding,
    byGroup,
    headerJobs,
  } = layout;
  let { draft, suggestions } = groupInput;
  let Qt = enterLabel;
  let tt = bunStringWidth(Qt) - bunStringWidth(enterLabel);
  let jobId = renaming?.jobId ?? null;
  let Rt = (group) => groupCollapseKey(groupMode, group);
  const Vt = Box;
  const flexShrink = 0;
  const paddingLeft = simpleView ? 1 : 2;
  const height = 1;
  const children =
    exitPending !== null
      ? jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            simpleView ? EXIT_HINT_TEXT[exitPending] : `Press ${exitPending} again to exit`,
            runningCount > 0 && ` \xB7 ${runningCount} ${plural(runningCount, "agent")} will keep running`,
          ],
        })
      : jobId !== null || groupEdit !== null
        ? jsxProd_default(Text, {
            dimColor: true,
            children: jsxProd_default_2(Byline, {
              children: [
                jsxProd_default(KeyboardShortcutHint, {
                  chord: "enter",
                  action: "save",
                  format: {
                    keyCase: "lower",
                  },
                }),
                groupEdit?.kind === "assign" &&
                  draft.trim() !== "" &&
                  draft.trim() !== groupEdit.cur &&
                  suggestions.length > 0 &&
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: "tab",
                    action: "complete",
                    format: {
                      keyCase: "lower",
                    },
                  }),
                groupEdit?.kind === "assign" &&
                  groupPickIdx >= 0 &&
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: figures_default.arrowLeft,
                    action: "deselect",
                    format: {
                      keyCase: "lower",
                    },
                  }),
                jsxProd_default(KeyboardShortcutHint, {
                  chord: "escape",
                  action: "cancel",
                  format: {
                    keyCase: "lower",
                  },
                }),
              ],
            }),
          })
        : pending
          ? jsxProd_default(Text, {
              dimColor: true,
              children: simpleView
                ? jsxProd_default(Text, {
                    children: pending.justKilled
                      ? "stopped \xB7 ctrl+x again to delete \xB7 esc to keep"
                      : "ctrl+x again to delete \xB7 esc to keep",
                  })
                : jsxProd_default(KeyboardShortcutHint, {
                    chord: "ctrl+x",
                    action: "confirm",
                  }),
            })
          : error
            ? jsxProd_default(Text, {
                color: "error",
                wrap: "truncate-end",
                children: error,
              })
            : voiceAvailable && appState_3
              ? jsxProd_default(KeepHoldingHint, {})
              : voiceAvailable && appState_2 !== "idle"
                ? jsxProd_default(VoiceStateIndicator, {
                    voiceState: appState_2,
                  })
                : hint
                  ? jsxProd_default(Text, {
                      dimColor: true,
                      wrap: "truncate-end",
                      children: hint,
                    })
                  : simpleView && !suggestionsOpen && query === ""
                    ? jsxProd_default(Text, {
                        dimColor: true,
                        wrap: "truncate-end",
                        children: jsxProd_default_2(Byline, {
                          children: [
                            jsxProd_default(Text, {
                              children:
                                focusedRow?.kind === "newsession"
                                  ? `${figures_default.arrowRight} or enter to start`
                                  : `${figures_default.arrowRight} or enter to open`,
                            }),
                            focused &&
                              !focusedIsPending &&
                              jsxProd_default(Text, {
                                children: isSettled(focused.state) ? "ctrl+x to delete" : "ctrl+x to stop",
                              }),
                            jsxProd_default(Text, {
                              children: "? for shortcuts",
                            }),
                            null,
                          ],
                        }),
                      })
                    : !previewOpen && !suggestionsOpen
                      ? jsxProd_default_2(Text, {
                          dimColor: true,
                          wrap: "truncate-end",
                          children: [
                            null,
                            jsxProd_default_2(Byline, {
                              children: [
                                dispatchDefaults &&
                                  hasNonDefaultDispatchSettings(dispatchDefaults) &&
                                  jsxProd_default(DispatchDefaultsLine, {
                                    defaults: dispatchDefaults,
                                  }),
                                ((focused && !focusedIsPending) || hasDispatch) &&
                                  !enterIsNoop &&
                                  !isBashDispatch &&
                                  jsxProd_default(KeyboardShortcutHint, {
                                    chord: "enter",
                                    action: Qt,
                                    format: {
                                      keyCase: "lower",
                                    },
                                  }),
                                expandHintPasteId !== null &&
                                  query !== "" &&
                                  columns >= 90 + tt &&
                                  jsxProd_default(Text, {
                                    dimColor: true,
                                    children: "paste again to expand",
                                  }),
                                focusedRow?.kind === "header" &&
                                  query === "" &&
                                  !isOnboarding &&
                                  jsxProd_default(KeyboardShortcutHint, {
                                    chord: "enter",
                                    action: storeSelector.has(Rt(focusedRow.group)) ? "expand" : "collapse",
                                    format: {
                                      keyCase: "lower",
                                    },
                                  }),
                                focusedRow?.kind === "fold" &&
                                  query === "" &&
                                  jsxProd_default(KeyboardShortcutHint, {
                                    chord: "enter",
                                    action: "show all",
                                    format: {
                                      keyCase: "lower",
                                    },
                                  }),
                                focused &&
                                  query === "" &&
                                  !isBashDispatch &&
                                  columns >= 55 &&
                                  jsxProd_default(KeyboardShortcutHint, {
                                    chord: " ",
                                    action: "reply",
                                    format: {
                                      keyCase: "lower",
                                    },
                                  }),
                                voiceAvailable &&
                                appState !== "tap" &&
                                query === "" &&
                                !isBashDispatch &&
                                columns >= 55
                                  ? jsxProd_default(Text, {
                                      children: "hold space to speak",
                                    })
                                  : null,
                                columns >= 80 &&
                                  (focused && !focusedIsPending && query === ""
                                    ? jsxProd_default(KeyboardShortcutHint, {
                                        chord: "ctrl+x",
                                        action: "delete",
                                      })
                                    : !hasComposedDispatch && byGroup && focusedRow?.kind === "header"
                                      ? focusedRow.group !== "pinned" &&
                                        focusedRow.group !== UNGROUPED &&
                                        focusedRow.group !== EARLIER
                                        ? jsxProd_default(KeyboardShortcutHint, {
                                            chord: "ctrl+x",
                                            action: "ungroup",
                                          })
                                        : null
                                      : !hasComposedDispatch && headerJobs.length > 0
                                        ? jsxProd_default(KeyboardShortcutHint, {
                                            chord: "ctrl+x",
                                            action: "delete all",
                                          })
                                        : null),
                                isBashDispatch
                                  ? jsxProd_default(Text, {
                                      color: "bashBorder",
                                      children: "! for shell mode",
                                    })
                                  : query !== ""
                                    ? jsxProd_default(KeyboardShortcutHint, {
                                        chord: "escape",
                                        action: "clear",
                                        format: {
                                          keyCase: "lower",
                                        },
                                      })
                                    : jsxProd_default(Text, {
                                        children: "? for shortcuts",
                                      }),
                                hasComposedDispatch &&
                                  !isBashDispatch &&
                                  K !== "" &&
                                  parseNewSessionPrefix(query) !== null &&
                                  expandHintPasteId === null &&
                                  columns >= 43 + tt + bunStringWidth(K) &&
                                  jsxProd_default_2(Text, {
                                    children: [K, " to find"],
                                  }),
                                null,
                                byGroup &&
                                  query === "" &&
                                  !!focused &&
                                  !focusedIsPending &&
                                  focused.state.backend === "daemon" &&
                                  oe !== "" &&
                                  columns >= 111 &&
                                  jsxProd_default_2(Text, {
                                    children: [oe, " to group"],
                                  }),
                              ],
                            }),
                          ],
                        })
                      : null;
  let ht;
  if (W[2] !== Vt || W[3] !== paddingLeft || W[4] !== children) {
    ht = jsxProd_default(Vt, {
      flexShrink,
      paddingLeft,
      height,
      children,
    });
    W[2] = Vt;
    W[3] = paddingLeft;
    W[4] = children;
    W[5] = ht;
  } else ht = W[5];
  return ht;
}
//@ chunk-93kwxas0.js:127689-127693 placement
init_react_production();
//@ chunk-93kwxas0.js:127693-127697 placement
init_react_production();
//@ chunk-93kwxas0.js:127697-127729 placement
function nowMs() {
  return Date.now();
}
//@ chunk-93kwxas0.js:127729-127743 placement
var HINT_PADDING = 2;
var HINT_ITEM_GAP = 4;
//@ chunk-93kwxas0.js:127743-129270 placement
/**
 * 根据当前可用操作生成快捷键提示。
 */
function FleetKeyHints({
  focusedPinned,
  canReorder,
  canRename,
  canGroup,
  canPin,
  canMention,
  canSwitchViews,
  canSwitchTabs,
  canDispatchAndOpen,
  altOpenCount,
  canDelete,
  canGoBack,
}) {
  let fleetBindings = useFleetBindings();
  let { columns } = useTerminalSize();
  let W = shortcutDisplayFor("agents:switchView", fleetBindings);
  let z = shortcutDisplayFor("agents:togglePin", fleetBindings);
  let oe = shortcutDisplayFor("agents:find", fleetBindings);
  let ge = shortcutDisplayFor("agents:rename", fleetBindings);
  let se = shortcutDisplayFor("agents:setGroup", fleetBindings);
  let ne = shortcutDisplayFor("agents:previousGroup", fleetBindings);
  let ae = shortcutDisplayFor("agents:nextGroup", fleetBindings);
  let sliced = ne.slice(0, ne.lastIndexOf("+") + 1);
  let Je =
    ne && ae && ae.startsWith(sliced)
      ? `${ne}/${ae.slice(sliced.length)}`
      : [ne, ae].filter(Boolean).join(" and ");
  let le = [];
  if (canReorder) le.push(`shift+${figures_default.arrowUp + figures_default.arrowDown} to reorder`);
  if (canRename && ge) le.push(`${ge} to rename`);
  if (canGroup && se) le.push(`${se} to set group`);
  if (canSwitchViews) {
    if (oe) le.push(`${oe} to find`);
    if (Je) le.push(`${Je} to jump groups`);
    if (W) le.push(`${W} to switch views`);
    le.push("ctrl+j for newline");
    if (canDispatchAndOpen) le.push("ctrl+enter to start and open");
  }
  if (canMention) le.push("@ to mention");
  if (canPin && z) le.push(`${z} to ${focusedPinned ? "unpin" : "pin to top"}`);
  if (altOpenCount > 0) le.push(`alt+1${altOpenCount > 1 ? `-${altOpenCount}` : ""} to open`);
  if (canDelete) le.push(`ctrl+x to ${canDelete}`);
  if (canGoBack) le.push(`${figures_default.arrowLeft} to go back`);
  le.push(canSwitchViews ? "esc to quit" : "esc to close \xB7 esc again quits");
  le.push("? to close");
  let Oe = [];
  for (let idx = 3; ; idx++) {
    Oe = [];
    for (let Re = 0; Re < le.length; Re += idx) Oe.push(le.slice(Re, Re + idx));
    if (
      2 * HINT_PADDING +
        HINT_ITEM_GAP * (Oe.length - 1) +
        sumByAliasField(Oe, (Re) => Math.max(...Re.map((je) => bunStringWidth(je)))) <=
        columns ||
      Oe.length === 1
    )
      break;
  }
  return jsxProd_default(Box, {
    flexShrink: 0,
    paddingX: HINT_PADDING,
    flexDirection: "row",
    gap: HINT_ITEM_GAP,
    children: Oe.map((De, we) =>
      jsxProd_default(
        Box,
        {
          flexDirection: "column",
          children: De.map((Re) =>
            jsxProd_default(
              Text,
              {
                dimColor: true,
                children: Re,
              },
              Re,
            ),
          ),
        },
        we,
      ),
    ),
  });
}
//@ chunk-93kwxas0.js:129270-132789 placement
/**
 * 会话预览头部（更新时间定时刷新）。
 */
function JobPeekHeader(props) {
  let k = w(43);
  let { job } = props;
  let C;
  if (k[0] !== job) {
    C = job ? Date.parse(job.state.updatedAt) : 0;
    k[0] = job;
    k[1] = C;
  } else C = k[1];
  let x = C;
  let [T, A] = y(nowMs);
  let L;
  if (k[2] === MEMO_CACHE_SENTINEL) {
    L = () => A(Date.now());
    k[2] = L;
  } else L = k[2];
  useInterval(L, !job ? null : T - x < 60000 ? 1000 : 30000);
  if (!job) {
    let V;
    if (k[3] === MEMO_CACHE_SENTINEL) {
      V = jsxProd_default(Box, {
        flexShrink: 0,
        paddingX: 2,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "no job focused",
        }),
      });
      k[3] = V;
    } else V = k[3];
    return V;
  }
  let state = job.state;
  const max = Math.max(0, T - x);
  let U;
  if (k[4] !== max) {
    U = formatDuration(max, {
      mostSignificantOnly: true,
    });
    k[4] = max;
    k[5] = U;
  } else U = k[5];
  let N = U;
  let X;
  if (k[6] === MEMO_CACHE_SENTINEL) {
    X = jsxProd_default(Text, {
      dimColor: true,
      children: "backend ",
    });
    k[6] = X;
  } else X = k[6];
  let K;
  if (k[7] !== state.backend) {
    K = jsxProd_default_2(Text, {
      children: [X, state.backend],
    });
    k[7] = state.backend;
    k[8] = K;
  } else K = k[8];
  let W;
  if (k[9] === MEMO_CACHE_SENTINEL) {
    W = jsxProd_default(Text, {
      dimColor: true,
      children: "dir ",
    });
    k[9] = W;
  } else W = k[9];
  let z;
  if (k[10] !== job.id) {
    z = getJobDir(job.id);
    k[10] = job.id;
    k[11] = z;
  } else z = k[11];
  let oe;
  if (k[12] !== z) {
    oe = jsxProd_default_2(Text, {
      children: [W, z],
    });
    k[12] = z;
    k[13] = oe;
  } else oe = k[13];
  let ge;
  if (k[14] === MEMO_CACHE_SENTINEL) {
    ge = jsxProd_default(Text, {
      dimColor: true,
      children: "cwd ",
    });
    k[14] = ge;
  } else ge = k[14];
  const se = state.worktreePath ?? state.cwd;
  let ne;
  if (k[15] !== se) {
    ne = jsxProd_default_2(Text, {
      children: [ge, se],
    });
    k[15] = se;
    k[16] = ne;
  } else ne = k[16];
  let ae;
  if (k[17] !== ne || k[18] !== K || k[19] !== oe) {
    ae = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [K, oe, ne],
    });
    k[17] = ne;
    k[18] = K;
    k[19] = oe;
    k[20] = ae;
  } else ae = k[20];
  let me;
  if (k[21] !== job.id || k[22] !== state.backend) {
    me =
      state.backend === "daemon"
        ? jsxProd_default_2(Text, {
            children: [
              jsxProd_default(Text, {
                dimColor: true,
                children: "shell ",
              }),
              "claude attach ",
              job.id,
            ],
          })
        : null;
    k[21] = job.id;
    k[22] = state.backend;
    k[23] = me;
  } else me = k[23];
  let Je;
  if (k[24] === MEMO_CACHE_SENTINEL) {
    Je = jsxProd_default(Text, {
      dimColor: true,
      children: "session ",
    });
    k[24] = Je;
  } else Je = k[24];
  const le = state.resumeSessionId ?? state.sessionId;
  let Oe;
  if (k[25] !== le) {
    Oe = jsxProd_default_2(Text, {
      children: [Je, le],
    });
    k[25] = le;
    k[26] = Oe;
  } else Oe = k[26];
  let De;
  if (k[27] === MEMO_CACHE_SENTINEL) {
    De = jsxProd_default(Text, {
      dimColor: true,
      children: "version ",
    });
    k[27] = De;
  } else De = k[27];
  let we;
  if (k[28] !== state.cliVersion) {
    we =
      state.cliVersion === undefined
        ? jsxProd_default(Text, {
            dimColor: true,
            children: "\u2014",
          })
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
          : jsxProd_default_2(Fragment, {
              children: [
                jsxProd_default(Text, {
                  color: "warning",
                  children: state.cliVersion,
                }),
                jsxProd_default_2(Text, {
                  dimColor: true,
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
            });
    k[28] = state.cliVersion;
    k[29] = we;
  } else we = k[29];
  let Re;
  if (k[30] !== we) {
    Re = jsxProd_default_2(Text, {
      children: [De, we],
    });
    k[30] = we;
    k[31] = Re;
  } else Re = k[31];
  let je;
  if (k[32] === MEMO_CACHE_SENTINEL) {
    je = jsxProd_default(Text, {
      dimColor: true,
      children: "updated ",
    });
    k[32] = je;
  } else je = k[32];
  let st;
  if (k[33] !== N) {
    st = jsxProd_default_2(Text, {
      children: [je, N, " ago"],
    });
    k[33] = N;
    k[34] = st;
  } else st = k[34];
  let mt;
  if (k[35] !== me || k[36] !== Oe || k[37] !== Re || k[38] !== st) {
    mt = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [me, Oe, Re, st],
    });
    k[35] = me;
    k[36] = Oe;
    k[37] = Re;
    k[38] = st;
    k[39] = mt;
  } else mt = k[39];
  let Ye;
  if (k[40] !== ae || k[41] !== mt) {
    Ye = jsxProd_default_2(Box, {
      flexShrink: 0,
      paddingX: 2,
      flexDirection: "row",
      gap: 4,
      children: [ae, mt],
    });
    k[40] = ae;
    k[41] = mt;
    k[42] = Ye;
  } else Ye = k[42];
  return Ye;
}
//@ chunk-93kwxas0.js:132789-132793 placement
init_react_production();
//@ chunk-93kwxas0.js:132793-132797 placement
init_react_production();
//@ chunk-93kwxas0.js:132797-133089 placement
/**
 * 渲染待回答问题的一个选项行（序号、标签、说明）。
 */
function renderQuestionOption(U, N) {
  return jsxProd_default_2(
    Box,
    {
      paddingLeft: 2,
      children: [
        jsxProd_default(Box, {
          width: 3,
          flexShrink: 0,
          children: jsxProd_default_2(Text, {
            dimColor: true,
            children: [N + 1, "."],
          }),
        }),
        jsxProd_default(Box, {
          flexGrow: 1,
          width: 0,
          children: jsxProd_default_2(Text, {
            wrap: "truncate",
            children: [
              collapseWhitespace(U.label),
              U.description &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [" \xB7 ", collapseWhitespace(U.description)],
                }),
            ],
          }),
        }),
      ],
    },
    U.label,
  );
}
//@ chunk-93kwxas0.js:133089-133837 placement
/**
 * 显示会话等待中的第一个问题。
 */
function PendingQuestionLine(props) {
  let C = w(14);
  let { questions } = props;
  let k = questions[0];
  if (!k) {
    return null;
  }
  let children;
  if (C[0] !== k.question) {
    children = collapseWhitespace(k.question);
    C[0] = k.question;
    C[1] = children;
  } else children = C[1];
  let T;
  if (C[2] !== children) {
    T = jsxProd_default(Box, {
      flexGrow: 1,
      width: 0,
      children: jsxProd_default(Text, {
        bold: true,
        wrap: "truncate",
        children,
      }),
    });
    C[2] = children;
    C[3] = T;
  } else T = C[3];
  let A;
  if (C[4] !== questions.length) {
    A =
      questions.length > 1 &&
      jsxProd_default(Box, {
        flexShrink: 0,
        paddingLeft: 1,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: ["+", questions.length - 1, " more \xB7 enter to open"],
        }),
      });
    C[4] = questions.length;
    C[5] = A;
  } else A = C[5];
  let L;
  if (C[6] !== T || C[7] !== A) {
    L = jsxProd_default_2(Box, {
      children: [T, A],
    });
    C[6] = T;
    C[7] = A;
    C[8] = L;
  } else L = C[8];
  let V;
  if (C[9] !== k.options) {
    V = k.options.map(renderQuestionOption);
    C[9] = k.options;
    C[10] = V;
  } else V = C[10];
  let D;
  if (C[11] !== L || C[12] !== V) {
    D = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [L, V],
    });
    C[11] = L;
    C[12] = V;
    C[13] = D;
  } else D = C[13];
  return D;
}
//@ chunk-93kwxas0.js:133837-133965 placement
/**
 * 数字键 1–9 对应的第一个问题的选项标签。
 */
function optionLabelForDigit(key, E) {
  let k = E?.[0];
  if (!k || key < "1" || key > "9") return null;
  let C = Number(key) - 1;
  return k.options[C]?.label.replace(CONTROL_CHARS_EXCEPT_WS_RE, "") ?? null;
}
//@ chunk-93kwxas0.js:133965-133993 placement
var PREVIEW_MAX_CHILD_ROWS = 8;
var PREVIEW_MIN_ROWS = 5;
var PREVIEW_BACK_TIMEOUT_MS = 500;
var PREVIEW_HINT_DELAY_MS = 150;
//@ chunk-93kwxas0.js:133993-143138 placement
/**
 * 会话预览面板：日志尾、回复输入、附加、停止、重命名。
 */
function JobPeek({
  job,
  status,
  isPending,
  deleteArmed,
  onBack,
  onAttach,
  onReply,
  onRefreshCloudRows,
  isTerminalFocused,
  childRows,
  editor,
  replyError,
  renaming,
  heldInTerminal,
}) {
  let W = (_e) => editor.setReplyError(job.id, _e);
  P(() => logFleetJobAction("peek", job.state), []);
  let timestamp = Date.parse(job.state.updatedAt);
  let { storageV5 } = useTheme_2();
  let [ge, se] = y(() => Date.now());
  let ne =
    terminalOutcome(job.state.state) === null
      ? jobPreviewText(job.state, job.state.needs ?? "") || undefined
      : undefined;
  let ae = returnFalse_2(job.state);
  let linkHref = job.state.needs?.startsWith(VERIFICATION_REQUIRED_NEEDS) ? safeVerificationUrl : undefined;
  let questions = job.state.tempo === "blocked" ? job.state.block?.questions : undefined;
  let le = questions?.length ? questions : undefined;
  let mapped = childRows.map((_e) => _e.row.href);
  let De = (_e) =>
    mapped.some((It) => {
      let index = _e.indexOf(It);
      return index >= 0 && !/\w/.test(_e[index + It.length] ?? "") && _e.length - It.length < 16;
    });
  let we = ne ? [] : Object.entries(job.state.output ?? {}).filter(([, value]) => !De(value));
  let Re = le ? "questions" : ne ? "needs" : we.length > 0 ? "output" : "detail";
  let je = Re === "questions" || Re === "needs";
  let st = useIsScreenReaderEnabled() ? DISPATCH_TIMEOUT_MS : 1000;
  useInterval(() => se(Date.now()), je ? (ge - timestamp < 60000 ? st : 30000) : null);
  let mt = je
    ? formatDuration(Math.max(0, ge - timestamp), {
        mostSignificantOnly: true,
      })
    : "";
  let Ye = R(false);
  let Lt = R(null);
  useFocusOnMount(Lt, true);
  let dt = editor.replyDraft(job.id) ?? "";
  let [Dt, eo] = y(getModeFromInput(dt) === "bash" ? "bash" : "prompt");
  let Wt = R(Dt);
  let ke = (_e) => {
    Wt.current = _e;
    eo(_e);
  };
  let Ge = Dt === "bash";
  let yt =
    job.state.tempo === "blocked" && !job.state.block?.questions && job.state.suggestedReply
      ? collapseWhitespace(job.state.suggestedReply) || undefined
      : undefined;
  let Bt = false;
  let lt = false;
  let voiceAvailable = useVoiceAvailable();
  let Et = useAppState((_e) => _e.settings.voice?.mode ?? "hold");
  let clock = useClock();
  let Yt = R(null);
  let Ue = R(null);
  let getVoiceState = useGetVoiceState();
  P(
    () => () => {
      Yt.current?.();
      Yt.current = null;
    },
    [],
  );
  let {
    query,
    queryRef,
    setQuery,
    cursorOffset,
    cursorOffsetRef,
    setCursorOffset,
    handleKeyDown,
    handlePaste,
  } = useSearchInput({
    isActive: true,
    multiline: true,
    honorEditorMode: true,
    backspaceExitsOnEmpty: false,
    initialQuery: stripModePrefix(dt),
    onExit: () => {
      if (Ye.current) return;
      let _e = Ue.current;
      if (_e !== null && (_e.sameChunk || performance.now() - _e.at < PREVIEW_HINT_DELAY_MS)) return;
      let It = sanitizePromptText_2(queryRef.current, "fleet_reply");
      if (It.removedTotal > 0) {
        let it = {
          sameChunk: true,
          at: performance.now(),
        };
        Ue.current = it;
        queueMicrotask(() => {
          it.sameChunk = false;
        });
        let io = It.text.trim() === "";
        setQuery(It.text);
        W(formatInvisibleCharsRemoved(It.removedTotal, io ? "empty" : "review"));
        forceRedraw();
        return;
      }
      let trimmed = queryRef.current.trim();
      if (!trimmed && Wt.current === "prompt") {
        Ye.current = true;
        onAttach();
        return;
      }
      if (!trimmed) return;
      let No = prependModeCharacterToInput_2(trimmed, Wt.current);
      let Qo = Wt.current;
      Ye.current = true;
      setQuery("");
      ke("prompt");
      W(null);
      editor.deleteReplyDraft(job.id);
      let pastedRefs = parsePastedRefs(No);
      let xe = {};
      for (let pastedRef of pastedRefs) {
        let io = editor.pastes[pastedRef.id];
        if (io) xe[pastedRef.id] = io;
      }
      let qt = () => {
        if (queryRef.current === "" && stripModePrefix(editor.replyDraft(job.id) ?? "") === "") {
          editor.saveReplyDraft(job.id, No);
          setQuery(trimmed);
          ke(Qo);
          for (let pastedRef of pastedRefs) {
            let io = xe[pastedRef.id];
            if (io) editor.pastes[pastedRef.id] = io;
          }
        }
      };
      if (job.state.backend === "remote" && Qo === "bash") {
        Ye.current = false;
        qt();
        W("'!' commands can't be sent to a cloud session from this view; open the session to try it there");
        return;
      }
      if (
        job.state.backend === "remote" &&
        pastedRefs.some((pastedRef) => xe[pastedRef.id]?.type === "image")
      ) {
        Ye.current = false;
        qt();
        W(
          "Image attachments aren't available when replying to cloud sessions yet \u2014 open the session to send images",
        );
        return;
      }
      materializePastedImages(
        No,
        xe,
        job.id,
        storageV5,
        isNonPromptInput(No, null) || isExecLaunch(job.state) ? "path" : "note",
      )
        .catch((error) => {
          logError(error);
          return No;
        })
        .then((it) => onReply(it))
        .then(
          (it) => {
            if (it) {
              qt();
              W(it);
            } else
              editor.pruneOrphanedPastes({
                pruneTextPastes: true,
              });
          },
          (error) => {
            qt();
            W(errorMessage(error));
          },
        )
        .finally(() => {
          Ye.current = false;
        });
    },
    onCancel: onBack,
    onSpaceOnEmpty: Ge
      ? undefined
      : voiceAvailable && Et !== "tap"
        ? () => {
            Yt.current?.();
            Yt.current = clock.setTimeout(() => {
              Yt.current = null;
              let voiceState = getVoiceState();
              if (voiceState.voiceState !== "idle" || voiceState.voiceWarmingUp) return;
              if (queryRef.current.trim() !== "") return;
              onBack();
            }, PREVIEW_BACK_TIMEOUT_MS);
          }
        : onBack,
    onTabOnEmpty:
      yt && !Ge
        ? () => {
            setQuery(yt);
            logEvent("tengu_prompt_suggestion", {
              outcome: lit("accepted"),
              source: lit("fleetview_peek"),
            });
            recordSuggestionOutcome(true, storageV5);
          }
        : undefined,
  });
  let error = replyError?.error ?? null;
  P(() => {
    editor.saveReplyDraft(job.id, prependModeCharacterToInput_2(query, Dt));
  }, [query, Dt, job.id, editor]);
  P(() => {
    let _e = editor.registerLivePeekQuery(() => queryRef.current);
    return () => {
      _e();
      editor.pruneOrphanedPastes();
    };
  }, [editor, queryRef]);
  P(() => registerPasteCarrier(() => [queryRef.current]), [queryRef]);
  let ht = cacheImagePath(() => editor.pastes, handlePaste, {
    onMinted: editor.noteMintedPaste,
  });
  let { handleKeyDown: handleKeyDown_2, handlePaste: handlePaste_2 } = usePasteHandler({
    handleKeyDown,
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
  });
  let [Jt] = y(() => ({
    get value() {
      return queryRef.current;
    },
    get cursorOffset() {
      return cursorOffsetRef.current;
    },
    setValueWithCursor: (_e, It) => {
      setQuery(_e);
      setCursorOffset(It);
    },
  }));
  let voiceIntegration = useVoiceIntegration({
    composer: Jt,
  });
  let He = useAppState_2((_e) => _e.voiceState);
  let ct = useAppState_2((_e) => _e.voiceWarmingUp);
  P(() => {
    if (He !== "idle" && Yt.current) {
      Yt.current();
      Yt.current = null;
    }
  }, [He]);
  let vt = useAppState((_e) => isReducedMotion(_e.settings.prefersReducedMotion));
  let rt = useAppState((_e) => _e.settings?.prUrlTemplate);
  let Qe = He === "recording" && !vt;
  let { handleKeyDown: handleKeyDown_3 } = useVoiceKeybindingHandler({
    voiceHandleKeyEvent: voiceIntegration.handleKeyEvent,
    voiceCancelRecording: voiceIntegration.cancelRecording,
    stripTrailing: voiceIntegration.stripTrailing,
    resetAnchor: voiceIntegration.resetAnchor,
    isActive: (Et !== "tap" || query.trim().length > 0) && !Ge && !renaming,
    composer: Jt,
  });
  let St = le ? 2 + (le[0]?.options.length ?? 0) : 0;
  let Ne = !heldInTerminal && hasSafeModeFlag(job.state.respawnFlags);
  let uo = je || Ne ? 1 : 0;
  let { rows, columns } = useTerminalSize();
  let fleetBindings = useFleetBindings();
  let pt = 8;
  let Nt = query
    ? countCharInString(
        query,
        `
`,
      )
    : 0;
  let oo = Math.ceil(
    Math.max(
      1,
      ...(Re === "needs"
        ? [bunStringWidth(jobPreviewText(job.state, ne ?? ""))]
        : Re === "output"
          ? we.map(([, _e]) => bunStringWidth(jobPreviewText(job.state, _e)))
          : Re === "detail"
            ? [bunStringWidth(jobPreviewText(job.state, job.state.detail))]
            : []),
    ) / Math.max(40, columns - 6),
  );
  let Ce = shouldUseFullscreenByDefault()
    ? Math.min(
        oo,
        Math.max(
          PREVIEW_MIN_ROWS,
          rows - pt - Math.min(childRows.length, PREVIEW_MAX_CHILD_ROWS) - St - uo - Nt - (error ? 1 : 0) - 1,
        ),
      )
    : PREVIEW_MIN_ROWS;
  let at = (Re === "questions" ? St : Re === "output" ? we.length * Ce : Ce) + uo + Nt + (error ? 1 : 0) + 1;
  let max = Math.max(PREVIEW_MAX_CHILD_ROWS, rows - pt - at);
  let sliced = childRows.slice(0, max);
  let Jo = childRows.length - sliced.length;
  let max_2 = Math.max(0, ...we.map(([_e]) => bunStringWidth(_e)));
  let minHeight = 5;
  let { color } = activityColors(job.state, job.activity, status);
  return jsxProd_default_2(Fragment, {
    children: [
      jsxProd_default_2(Box, {
        ref: Lt,
        flexDirection: "column",
        borderStyle: "round",
        borderColor: Ge ? "bashBorder" : undefined,
        borderDimColor: !Ge,
        paddingX: 1,
        minHeight,
        width: "100%",
        tabIndex: 0,
        autoFocus: true,
        onKeyDownCapture: handleKeyDown_3,
        onKeyDown: (event) => {
          if (event.key !== " " && Yt.current) {
            Yt.current();
            Yt.current = null;
          }
          if (renaming) return;
          if (FLEET_EDITOR_SAFE_ACTIONS.has(resolveFleetKeyAction(keyEventToKeystroke(event), fleetBindings)))
            return;
          if (isPasteImageKey(event)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            pasteImageFromClipboard(
              (It) =>
                ht(It.base64, {
                  mediaType: It.mediaType,
                  dimensions: It.dimensions,
                }),
              (It) => editor.setReplyError(job.id, It, "paste"),
            );
            return;
          }
          if (Wt.current === "prompt") {
            if (event.name === "right" && !event.shift && !queryRef.current) {
              event.preventDefault();
              if (Ye.current) return;
              Ye.current = true;
              onAttach();
              return;
            }
            if (isBashModeChar(event.key) && !queryRef.current) {
              event.preventDefault();
              ke("bash");
              return;
            }
            if (!queryRef.current) {
              let It = optionLabelForDigit(event.key, le);
              if (It) {
                event.preventDefault();
                setQuery(It);
                setCursorOffset(It.length);
                return;
              }
            }
          } else if (event.name === "backspace" && !queryRef.current) {
            event.preventDefault();
            ke("prompt");
            return;
          }
          handleKeyDown_2(event);
        },
        onPaste: renaming ? undefined : handlePaste_2,
        children: [
          Re === "questions" && le
            ? jsxProd_default(PendingQuestionLine, {
                questions: le,
              })
            : Re === "needs"
              ? jsxProd_default(Box, {
                  maxHeight: Ce,
                  overflowY: "hidden",
                  children: jsxProd_default(Text, {
                    wrap: "wrap",
                    children: ae
                      ? jsxProd_default(Text, {
                          dimColor: true,
                          children: ne ?? "",
                        })
                      : jsxProd_default(InlineMarkup, {
                          value: stripJobPreviewText(ne ?? ""),
                          linkHref,
                        }),
                  }),
                })
              : Re === "output"
                ? jsxProd_default(Box, {
                    flexDirection: "column",
                    children: we.map(([_e, It]) =>
                      jsxProd_default_2(
                        Box,
                        {
                          children: [
                            we.length > 1 &&
                              jsxProd_default(Box, {
                                width: max_2 + 2,
                                flexShrink: 0,
                                children: jsxProd_default(Text, {
                                  dimColor: true,
                                  children: _e,
                                }),
                              }),
                            jsxProd_default(Box, {
                              flexGrow: 1,
                              width: 0,
                              maxHeight: Ce,
                              overflowY: "hidden",
                              children: jsxProd_default(Text, {
                                wrap: "wrap",
                                children: ae
                                  ? jsxProd_default(Text, {
                                      dimColor: true,
                                      children: jobPreviewText(job.state, It),
                                    })
                                  : jsxProd_default(InlineMarkup, {
                                      value: stripJobPreviewText(It),
                                    }),
                              }),
                            }),
                          ],
                        },
                        _e,
                      ),
                    ),
                  })
                : jsxProd_default(Box, {
                    maxHeight: Ce,
                    overflowY: "hidden",
                    children: jsxProd_default(Text, {
                      wrap: "wrap",
                      children: ae
                        ? jobPreviewText(job.state, job.state.detail)
                        : jsxProd_default(LinkifiedText, {
                            children: stripJobPreviewText(job.state.detail),
                          }),
                    }),
                  }),
          sliced.length > 0 &&
            jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [
                sliced.map((_e) =>
                  jsxProd_default_2(
                    Box,
                    {
                      children: [
                        jsxProd_default(Box, {
                          flexGrow: 1,
                          width: 0,
                          children: jsxProd_default_2(Text, {
                            wrap: "truncate",
                            children: [
                              _e.prNumber !== undefined
                                ? jsxProd_default(PrBadge, {
                                    number: _e.prNumber,
                                    url: _e.row.href,
                                    kind: prKindOf(_e.row),
                                    color: _e.color,
                                    underline: false,
                                    hidePrefix: true,
                                  })
                                : jsxProd_default(Text, {
                                    color: _e.color,
                                    dimColor: !isFrameRow(_e),
                                    children: isFrameRow(_e) ? BOXED_DIAMOND_GLYPH : "PR",
                                  }),
                              _e.label
                                ? jsxProd_default_2(Fragment, {
                                    children: [
                                      " ",
                                      jsxProd_default(Link, {
                                        url: expandPrUrlIfTemplate(_e.row.href, rt),
                                        children: jsxProd_default_2(Text, {
                                          color: _e.isDraft ? "inactive" : undefined,
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
                          jsxProd_default(Box, {
                            flexShrink: 0,
                            paddingLeft: 1,
                            children: jsxProd_default(Link, {
                              url: `${_e.row.href}/files`,
                              children: jsxProd_default(DiffStatCounts, {
                                added: _e.diffStat.additions,
                                removed: _e.diffStat.deletions,
                              }),
                            }),
                          }),
                        jsxProd_default(Box, {
                          flexShrink: 0,
                          paddingLeft: 1,
                          children: _e.status.map((It, go) =>
                            jsxProd_default_2(
                              Kc,
                              {
                                children: [
                                  go > 0 &&
                                    jsxProd_default(Text, {
                                      children: " ",
                                    }),
                                  jsxProd_default(Text, {
                                    color: It.color,
                                    dimColor: !It.color,
                                    children: It.text,
                                  }),
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
                  jsxProd_default(Box, {
                    paddingLeft: 2,
                    children: jsxProd_default_2(Text, {
                      dimColor: true,
                      children: ["\u2026 ", Jo, " more"],
                    }),
                  }),
              ],
            }),
          uo > 0 &&
            jsxProd_default(Box, {
              paddingLeft: 2,
              children: jsxProd_default(Text, {
                wrap: "truncate",
                children: jsxProd_default_2(Byline, {
                  children: [
                    je &&
                      jsxProd_default_2(Text, {
                        color,
                        children: ["waiting ", mt],
                      }),
                    Ne &&
                      jsxProd_default(Text, {
                        dimColor: true,
                        children: "safe mode",
                      }),
                    Ne &&
                      jsxProd_default(Text, {
                        dimColor: true,
                        children: "customizations are off",
                      }),
                  ],
                }),
              }),
            }),
          jsxProd_default(Box, {
            flexGrow: 1,
          }),
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(SearchBox, {
              query,
              cursorOffset,
              onCursorOffsetChange: setCursorOffset,
              placeholder:
                voiceAvailable && (He !== "idle" || ct)
                  ? ""
                  : le
                    ? `press 1-${le[0]?.options.length ?? 2} or type your answer`
                    : yt && !Ge
                      ? yt
                      : "reply",
              prefix: Ge ? "!" : figures_default.pointer,
              prefixColor: Ge ? "bashBorder" : undefined,
              prefixDim: !query.trim(),
              dimRange: voiceIntegration.interimRange
                ? [voiceIntegration.interimRange.start, voiceIntegration.interimRange.end]
                : undefined,
              cursorChar: Qe ? jsxProd_default(VoiceLevelGlyph, {}) : undefined,
              isFocused: !renaming,
              isTerminalFocused,
              width: "100%",
              borderless: true,
              wrapColumns: columns - 4,
            }),
          }),
          error &&
            jsxProd_default(Text, {
              color: "error",
              dimColor: true,
              wrap: "truncate",
              children: error,
            }),
        ],
      }),
      jsxProd_default(Box, {
        paddingLeft: 2,
        children:
          voiceAvailable && ct && !renaming
            ? jsxProd_default(KeepHoldingHint, {})
            : voiceAvailable && He !== "idle" && !renaming
              ? jsxProd_default(VoiceStateIndicator, {
                  voiceState: He,
                })
              : jsxProd_default(Text, {
                  dimColor: true,
                  children: renaming
                    ? jsxProd_default_2(Byline, {
                        children: [
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "enter",
                            action: "save",
                            format: {
                              keyCase: "lower",
                            },
                          }),
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "escape",
                            action: "cancel",
                            format: {
                              keyCase: "lower",
                            },
                          }),
                        ],
                      })
                    : jsxProd_default_2(Byline, {
                        children: [
                          Ge &&
                            jsxProd_default(Text, {
                              color: "bashBorder",
                              children: "! for shell mode",
                            }),
                          (query.trim() || (!Ge && !isPending)) &&
                            jsxProd_default(KeyboardShortcutHint, {
                              chord: "enter",
                              action: query.trim()
                                ? "send"
                                : isFailedSettledJob(job.state)
                                  ? "resume"
                                  : "open",
                              format: {
                                keyCase: "lower",
                              },
                            }),
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: query.trim() || Ge ? "escape" : " ",
                            action: "close",
                            format: {
                              keyCase: "lower",
                            },
                          }),
                          voiceAvailable && Et !== "tap" && !Ge && !query.trim()
                            ? jsxProd_default(Text, {
                                children: "hold space to speak",
                              })
                            : null,
                          jsxProd_default(KeyboardShortcutHint, {
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
function selectReplyError(oo) {
  return oo.replyError;
}
//@ chunk-93kwxas0.js:143175-143212 placement
function selectPrStatuses(Ce) {
  return Ce.prStatuses;
}
//@ chunk-93kwxas0.js:143212-143266 placement
function isPinnedJobRow(Ke) {
  return Ke.kind === "job" && Ke.group === SIMPLE_PINNED;
}
//@ chunk-93kwxas0.js:143266-148818 placement
/**
 * Agents 视图主体（列表、预览、标签页、云会话行）。
 */
function FleetBody(props) {
  let Et = w(57);
  let {
    owners,
    layout,
    footer,
    simpleView,
    groupsEnabled,
    showRemoteTabs,
    canMention,
    isTerminalFocused,
    awayLoop,
    storageV5,
    onOpen,
    onStop,
  } = props;
  let { roster, view, attach, editor, deleteConfirm } = owners;
  let {
    helpOpen,
    debugOpen,
    previewOpen,
    groupEdit,
    renaming,
    resumePicker,
    resumePickerIdx,
    settingPicker,
    settingPickerIdx,
    activeTab,
  } = useStoreSelector(view);
  let storeSelector = useStoreSelector(editor, selectReplyError);
  let storeSelector_2 = useStoreSelector(roster, selectPrStatuses);
  let { pending } = useStoreSelector(deleteConfirm);
  let [Ye, Lt] = y(false);
  let showSuccessMessage = isNoForceUpdateRenders();
  let { rows, byState, byGroup, focusedRow, focused, focusedIsPending, altOpenOrigin, ageNow } = layout;
  let jobId = renaming?.jobId ?? null;
  let Ot;
  if (Et[0] !== roster) {
    Ot = (Yt) => roster.liveStatus(Yt);
    Et[0] = roster;
    Et[1] = Ot;
  } else Ot = Et[1];
  let Ue = Ot;
  let Qt = onOpen;
  let tt;
  if (Et[2] !== focused || Et[3] !== storeSelector_2) {
    tt = focused?.state.children ? childFrameRows(focused.state.children, storeSelector_2) : [];
    Et[2] = focused;
    Et[3] = storeSelector_2;
    Et[4] = tt;
  } else tt = Et[4];
  let childRows = tt;
  let Fe;
  if (Et[5] !== ageNow || Et[6] !== resumePicker || Et[7] !== resumePickerIdx) {
    Fe =
      resumePicker !== null
        ? (() => {
            let Rt;
            if (resumePicker.entries === null)
              Rt = jsxProd_default(Text, {
                dimColor: true,
                children: "Looking for past sessions\u2026",
              });
            else if (resumePicker.failed)
              Rt = jsxProd_default(Text, {
                dimColor: true,
                children: "Couldn't load past sessions \u2014 press esc, then try /resume again",
              });
            else if (resumePicker.entries.length === 0)
              Rt = jsxProd_default(Text, {
                dimColor: true,
                children: "No past sessions to resume",
              });
            else {
              let entries = resumePicker.entries;
              let max = Math.max(0, Math.min(resumePickerIdx - 3, entries.length - 8));
              let sliced = entries.slice(max, max + 8);
              let kt = entries.length - max - sliced.length;
              Rt = jsxProd_default_2(Fragment, {
                children: [
                  max > 0 &&
                    jsxProd_default_2(Text, {
                      dimColor: true,
                      children: ["  ", "\u2026 ", max, " above"],
                    }),
                  sliced.map(($e, ht) => {
                    let jt = max + ht === resumePickerIdx;
                    return jsxProd_default_2(
                      Box,
                      {
                        children: [
                          jsxProd_default(Box, {
                            flexGrow: 1,
                            flexShrink: 1,
                            overflow: "hidden",
                            children: jsxProd_default_2(Text, {
                              color: jt ? "suggestion" : undefined,
                              dimColor: !jt,
                              wrap: "truncate",
                              children: [jt ? figures_default.pointer : " ", " ", $e.title],
                            }),
                          }),
                          jsxProd_default(Box, {
                            flexShrink: 0,
                            marginLeft: 1,
                            children: jsxProd_default(Text, {
                              dimColor: true,
                              children: formatDuration(
                                Math.max(0, (ageNow ?? Date.now()) - $e.modified.getTime()),
                                {
                                  mostSignificantOnly: true,
                                },
                              ),
                            }),
                          }),
                        ],
                      },
                      $e.sessionId,
                    );
                  }),
                  kt > 0 &&
                    jsxProd_default_2(Text, {
                      dimColor: true,
                      children: ["  ", "\u2026 ", kt, " more"],
                    }),
                ],
              });
            }
            return jsxProd_default(Box, {
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              flexDirection: "column",
              opaque: true,
              children: jsxProd_default_2(Box, {
                flexDirection: "column",
                borderStyle: "round",
                paddingX: 1,
                children: [
                  jsxProd_default(Text, {
                    bold: true,
                    children: "Resume a past session",
                  }),
                  Rt,
                  jsxProd_default(Text, {
                    dimColor: true,
                    children:
                      "\u2191/\u2193 to navigate \xB7 enter to resume as a background session \xB7 esc to close",
                  }),
                ],
              }),
            });
          })()
        : null;
    Et[5] = ageNow;
    Et[6] = resumePicker;
    Et[7] = resumePickerIdx;
    Et[8] = Fe;
  } else Fe = Et[8];
  let We = Fe;
  let Jt;
  if (Et[9] !== settingPicker || Et[10] !== settingPickerIdx) {
    Jt =
      settingPicker !== null
        ? (() => {
            let { setting, options } = settingPicker;
            let max = Math.max(0, Math.min(settingPickerIdx - 3, options.length - 8));
            let sliced = options.slice(max, max + 8);
            let rt = options.length - max - sliced.length;
            return jsxProd_default(Box, {
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              flexDirection: "column",
              opaque: true,
              children: jsxProd_default_2(Box, {
                flexDirection: "column",
                borderStyle: "round",
                paddingX: 1,
                children: [
                  jsxProd_default_2(Text, {
                    bold: true,
                    children: [
                      setting === "model" ? "Model" : setting === "effort" ? "Effort" : "Fast mode",
                      " ",
                      "for new sessions from this window (not saved)",
                    ],
                  }),
                  max > 0 &&
                    jsxProd_default_2(Text, {
                      dimColor: true,
                      children: ["  ", "\u2026 ", max, " above"],
                    }),
                  sliced.map((Qe, Xe) => {
                    let St = max + Xe === settingPickerIdx;
                    return jsxProd_default_2(
                      Text,
                      {
                        color: St ? "suggestion" : undefined,
                        dimColor: !St,
                        wrap: "truncate",
                        children: [
                          St ? figures_default.pointer : " ",
                          " ",
                          Qe.value,
                          Qe.description ? ` \xB7 ${Qe.description}` : "",
                        ],
                      },
                      Qe.value,
                    );
                  }),
                  rt > 0 &&
                    jsxProd_default_2(Text, {
                      dimColor: true,
                      children: ["  ", "\u2026 ", rt, " more"],
                    }),
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: "\u2191/\u2193 to navigate \xB7 enter to select \xB7 esc to close",
                  }),
                ],
              }),
            });
          })()
        : null;
    Et[9] = settingPicker;
    Et[10] = settingPickerIdx;
    Et[11] = Jt;
  } else Jt = Et[11];
  let Ne = Jt;
  let uo;
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
  ) {
    uo =
      helpOpen && !previewOpen
        ? jsxProd_default(FleetKeyHints, {
            focusedPinned: focused?.state.pinned ?? false,
            canReorder:
              !!focused &&
              (simpleView
                ? (focused.state.pinned ?? false) && count(rows, isPinnedJobRow) > 1
                : (!byState && !byGroup) || (focused.state.pinned ?? false)),
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
            canDelete:
              focused && !focusedIsPending ? (isSettled(focused.state) ? "delete" : "stop") : undefined,
            canGoBack: false,
          })
        : debugOpen && !previewOpen
          ? jsxProd_default(JobPeekHeader, {
              job: focused,
            })
          : footer;
    Et[12] = activeTab;
    Et[13] = altOpenOrigin;
    Et[14] = byGroup;
    Et[15] = byState;
    Et[16] = canMention;
    Et[17] = debugOpen;
    Et[18] = focused;
    Et[19] = focusedIsPending;
    Et[20] = focusedRow;
    Et[21] = footer;
    Et[22] = groupsEnabled;
    Et[23] = helpOpen;
    Et[24] = previewOpen;
    Et[25] = rows;
    Et[26] = showRemoteTabs;
    Et[27] = simpleView;
    Et[28] = uo;
  } else uo = Et[28];
  let po;
  if (Et[29] !== Ye || Et[30] !== showSuccessMessage) {
    po = jsxProd_default(AutoUpdaterWrapper, {
      isUpdating: Ye,
      onChangeIsUpdating: Lt,
      showSuccessMessage,
      verbose: false,
    });
    Et[29] = Ye;
    Et[30] = showSuccessMessage;
    Et[31] = po;
  } else po = Et[31];
  let At;
  if (
    Et[32] !== attach ||
    Et[33] !== awayLoop ||
    Et[34] !== editor ||
    Et[35] !== focused ||
    Et[36] !== childRows ||
    Et[37] !== focusedIsPending ||
    Et[38] !== groupEdit ||
    Et[39] !== isTerminalFocused ||
    Et[40] !== Ue ||
    Et[41] !== onStop ||
    Et[42] !== Qt ||
    Et[43] !== pending ||
    Et[44] !== previewOpen ||
    Et[45] !== jobId ||
    Et[46] !== storeSelector ||
    Et[47] !== roster ||
    Et[48] !== storageV5 ||
    Et[49] !== view
  ) {
    At =
      previewOpen &&
      focused &&
      jsxProd_default(Box, {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "column",
        opaque: true,
        children: jsxProd_default(
          JobPeek,
          {
            job: focused,
            renaming: jobId !== null || groupEdit !== null,
            editor,
            replyError: storeSelector?.jobId === focused.id ? storeSelector : null,
            status: Ue(focused),
            heldInTerminal: roster.terminalHolderOf(focused) !== undefined,
            isPending: focusedIsPending,
            deleteArmed:
              pending?.id === focused.id
                ? {
                    justKilled: pending.justKilled,
                  }
                : undefined,
            onBack: () => view.setPreviewOpen(false),
            onAttach: () => {
              Qt(focused);
              view.setPreviewOpen(false);
            },
            childRows,
            onReply: (pt) =>
              replyToJob(
                {
                  editor,
                  roster,
                  attach,
                  awayLoop,
                  storageV5,
                  stop: onStop,
                },
                focused,
                pt,
              ),
            onRefreshCloudRows: undefined,
            isTerminalFocused,
          },
          focused.id,
        ),
      });
    Et[32] = attach;
    Et[33] = awayLoop;
    Et[34] = editor;
    Et[35] = focused;
    Et[36] = childRows;
    Et[37] = focusedIsPending;
    Et[38] = groupEdit;
    Et[39] = isTerminalFocused;
    Et[40] = Ue;
    Et[41] = onStop;
    Et[42] = Qt;
    Et[43] = pending;
    Et[44] = previewOpen;
    Et[45] = jobId;
    Et[46] = storeSelector;
    Et[47] = roster;
    Et[48] = storageV5;
    Et[49] = view;
    Et[50] = At;
  } else At = Et[50];
  let Nt;
  if (Et[51] !== We || Et[52] !== Ne || Et[53] !== uo || Et[54] !== po || Et[55] !== At) {
    Nt = jsxProd_default_2(Fragment, {
      children: [uo, po, We, Ne, At],
    });
    Et[51] = We;
    Et[52] = Ne;
    Et[53] = uo;
    Et[54] = po;
    Et[55] = At;
    Et[56] = Nt;
  } else Nt = Et[56];
  return Nt;
}
//@ chunk-93kwxas0.js:148818-148822 placement
init_react_production();
//@ chunk-93kwxas0.js:148822-148859 placement
function selectVoiceState_2(Qt) {
  return Qt.voiceState;
}
//@ chunk-93kwxas0.js:148859-148900 placement
function selectVoiceWarmingUp_2(tt) {
  return tt.voiceWarmingUp;
}
//@ chunk-93kwxas0.js:148900-152228 placement
/**
 * Agents 视图搜索/派发输入框（高亮、语音、建议列表）。
 */
function FleetSearchInput(props) {
  let dt = w(47);
  let {
    owners,
    layout,
    onCursorOffsetChange,
    highlights,
    voice,
    isTerminalFocused,
    simpleView,
    hasGroups,
    suggestionList,
    cloudListNotice,
  } = props;
  let { view, editor } = owners;
  let { columns } = useTerminalSize();
  let { query, cursorOffset, mode } = useStoreSelector(editor);
  let { activeTab, groupEdit, renaming, previewOpen, resumePicker, settingPicker } = useStoreSelector(view);
  let voiceAvailable = useVoiceAvailable();
  let appState = useAppState_2(selectVoiceState_2);
  let appState_2 = useAppState_2(selectVoiceWarmingUp_2);
  let { onlyOrigin, byGroup, filtered, isBashDispatch, hasDispatch, queryIsFilter } = layout;
  let jobId = renaming?.jobId ?? null;
  let Dt;
  if (dt[0] === MEMO_CACHE_SENTINEL) {
    Dt = jsxProd_default(Text, {
      dimColor: true,
      children:
        "A different way to work with Claude: hand off a bigger task than you would chat through, and Claude organizes it in the sections above so you know when it needs you.",
    });
    dt[0] = Dt;
  } else Dt = dt[0];
  let children = Dt;
  const fleetBindings = useFleetBindings();
  let ke;
  if (dt[1] !== fleetBindings) {
    ke = shortcutDisplayFor("agents:setGroup", fleetBindings);
    dt[1] = fleetBindings;
    dt[2] = ke;
  } else ke = dt[2];
  let Ge = ke;
  let yt;
  if (
    dt[3] !== byGroup ||
    dt[4] !== filtered ||
    dt[5] !== hasGroups ||
    dt[6] !== query ||
    dt[7] !== Ge ||
    dt[8] !== simpleView
  ) {
    yt =
      !simpleView && byGroup && !hasGroups && filtered.length > 0 && !query && Ge !== ""
        ? jsxProd_default_2(Text, {
            dimColor: true,
            children: ["No groups yet \u2014 press ", Ge, " on a session to tag it."],
          })
        : null;
    dt[3] = byGroup;
    dt[4] = filtered;
    dt[5] = hasGroups;
    dt[6] = query;
    dt[7] = Ge;
    dt[8] = simpleView;
    dt[9] = yt;
  } else yt = dt[9];
  let Bt = yt;
  let lt;
  if (dt[10] === MEMO_CACHE_SENTINEL) {
    lt = jsxProd_default(Box, {
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
      children: jsxProd_default(PromptToast, {}),
    });
    dt[10] = lt;
  } else lt = dt[10];
  let Tt;
  if (dt[11] !== cloudListNotice) {
    Tt =
      cloudListNotice &&
      jsxProd_default(Box, {
        paddingLeft: 1,
        marginBottom: 1,
        children: jsxProd_default_2(Text, {
          wrap: "truncate-end",
          children: [
            cloudListNotice.failed
              ? jsxProd_default(Text, {
                  color: "warning",
                  children: cloudListNotice.text,
                })
              : jsxProd_default(Text, {
                  dimColor: true,
                  children: cloudListNotice.text,
                }),
            cloudListNotice.hint !== undefined &&
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [" \xB7 ", cloudListNotice.hint],
              }),
          ],
        }),
      });
    dt[11] = cloudListNotice;
    dt[12] = Tt;
  } else Tt = dt[12];
  let Et;
  if (dt[13] !== activeTab || dt[14] !== onlyOrigin || dt[15] !== query || dt[16] !== simpleView) {
    Et =
      onlyOrigin &&
      activeTab !== "remote" &&
      !query &&
      !simpleView &&
      jsxProd_default(Box, {
        paddingLeft: 1,
        marginBottom: 1,
        children,
      });
    dt[13] = activeTab;
    dt[14] = onlyOrigin;
    dt[15] = query;
    dt[16] = simpleView;
    dt[17] = Et;
  } else Et = dt[17];
  let Ot;
  if (dt[18] !== Bt) {
    Ot =
      Bt &&
      jsxProd_default(Box, {
        paddingLeft: 1,
        marginBottom: 1,
        children: Bt,
      });
    dt[18] = Bt;
    dt[19] = Ot;
  } else Ot = dt[19];
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
    dt[32] !== jobId ||
    dt[33] !== resumePicker ||
    dt[34] !== settingPicker ||
    dt[35] !== simpleView ||
    dt[36] !== voice ||
    dt[37] !== voiceAvailable ||
    dt[38] !== appState ||
    dt[39] !== appState_2
  ) {
    Yt = simpleView
      ? null
      : jsxProd_default(Box, {
          flexDirection: "column",
          borderStyle: "round",
          borderLeft: false,
          borderRight: false,
          borderColor: isBashDispatch ? "bashBorder" : undefined,
          borderDimColor: !isBashDispatch,
          children: jsxProd_default(SearchBox, {
            query,
            cursorOffset,
            onCursorOffsetChange,
            placeholder:
              isBashDispatch || (voiceAvailable && (appState !== "idle" || appState_2))
                ? ""
                : "describe a task for a new session",
            prefix: mode === "bash" ? "!" : !queryIsFilter ? figures_default.pointer : undefined,
            prefixDim: !hasDispatch && !isBashDispatch,
            prefixColor: isBashDispatch ? "bashBorder" : undefined,
            highlights,
            dimRange: voice.interimRange ? [voice.interimRange.start, voice.interimRange.end] : undefined,
            cursorChar: voice.showCursor ? jsxProd_default(VoiceLevelGlyph, {}) : undefined,
            isFocused:
              !previewOpen &&
              jobId === null &&
              groupEdit === null &&
              resumePicker === null &&
              settingPicker === null,
            isTerminalFocused,
            width: "100%",
            borderless: true,
            wrapColumns: columns,
          }),
        });
    dt[20] = columns;
    dt[21] = cursorOffset;
    dt[22] = mode;
    dt[23] = groupEdit;
    dt[24] = hasDispatch;
    dt[25] = highlights;
    dt[26] = isBashDispatch;
    dt[27] = isTerminalFocused;
    dt[28] = onCursorOffsetChange;
    dt[29] = previewOpen;
    dt[30] = query;
    dt[31] = queryIsFilter;
    dt[32] = jobId;
    dt[33] = resumePicker;
    dt[34] = settingPicker;
    dt[35] = simpleView;
    dt[36] = voice;
    dt[37] = voiceAvailable;
    dt[38] = appState;
    dt[39] = appState_2;
    dt[40] = Yt;
  } else Yt = dt[40];
  let Ue;
  if (dt[41] !== suggestionList || dt[42] !== Tt || dt[43] !== Et || dt[44] !== Ot || dt[45] !== Yt) {
    Ue = jsxProd_default_2(Box, {
      flexShrink: 0,
      flexDirection: "column",
      marginTop: 1,
      children: [lt, Tt, Et, Ot, suggestionList, null, Yt],
    });
    dt[41] = suggestionList;
    dt[42] = Tt;
    dt[43] = Et;
    dt[44] = Ot;
    dt[45] = Yt;
    dt[46] = Ue;
  } else Ue = dt[46];
  return Ue;
}
//@ chunk-93kwxas0.js:152228-153447 placement
/**
 * 派发模式提示行。
 */
function DispatchModeLine(props) {
  let V = w(30);
  let { editor, selection, query, dispatchMode, collapsed, canonicalLauncherCwd, storageV5 } = props;
  let D;
  if (V[0] !== canonicalLauncherCwd || V[1] !== editor || V[2] !== selection || V[3] !== storageV5) {
    D = () => persistFleetDraft(editor, selection, canonicalLauncherCwd, storageV5);
    V[0] = canonicalLauncherCwd;
    V[1] = editor;
    V[2] = selection;
    V[3] = storageV5;
    V[4] = D;
  } else D = V[4];
  let U;
  if (
    V[5] !== canonicalLauncherCwd ||
    V[6] !== collapsed ||
    V[7] !== dispatchMode ||
    V[8] !== query ||
    V[9] !== storageV5
  ) {
    U = [query, dispatchMode, collapsed, canonicalLauncherCwd, storageV5];
    V[5] = canonicalLauncherCwd;
    V[6] = collapsed;
    V[7] = dispatchMode;
    V[8] = query;
    V[9] = storageV5;
    V[10] = U;
  } else U = V[10];
  useTimeout(D, 300, U);
  let N;
  if (V[11] !== canonicalLauncherCwd || V[12] !== editor || V[13] !== selection || V[14] !== storageV5) {
    N = () => persistFleetDraft(editor, selection, canonicalLauncherCwd, storageV5);
    V[11] = canonicalLauncherCwd;
    V[12] = editor;
    V[13] = selection;
    V[14] = storageV5;
    V[15] = N;
  } else N = V[15];
  let X = Oo(N);
  let K;
  if (V[16] !== X) {
    K = () => () => X();
    V[16] = X;
    V[17] = K;
  } else K = V[17];
  let W;
  if (V[18] === MEMO_CACHE_SENTINEL) {
    W = [];
    V[18] = W;
  } else W = V[18];
  P(K, W);
  let z = R(false);
  let oe;
  let ge;
  if (V[19] !== canonicalLauncherCwd || V[20] !== editor || V[21] !== selection || V[22] !== storageV5) {
    oe = () =>
      isStorageV5Enabled() && storageV5 !== undefined
        ? registerPreExitFlush(async () => {
            let se = editor.draftForDisk();
            let ne = [...selection.getSnapshot().collapsed];
            z.current =
              se || ne.length
                ? await writeJobDraft(
                    canonicalLauncherCwd,
                    {
                      q: se,
                      collapsed: ne,
                    },
                    storageV5,
                  )
                : true;
          })
        : undefined;
    ge = [canonicalLauncherCwd, editor, selection, storageV5];
    V[19] = canonicalLauncherCwd;
    V[20] = editor;
    V[21] = selection;
    V[22] = storageV5;
    V[23] = oe;
    V[24] = ge;
  } else {
    oe = V[23];
    ge = V[24];
  }
  P(oe, ge);
  let ae;
  let me;
  if (V[25] !== canonicalLauncherCwd || V[26] !== editor || V[27] !== selection) {
    ae = () =>
      onExit(() => {
        if (z.current) {
          return;
        }
        let Je = editor.draftForDisk();
        let le = [...selection.getSnapshot().collapsed];
        if (Je || le.length)
          writeDraftBestEffort(canonicalLauncherCwd, {
            q: Je,
            collapsed: le,
          });
      });
    me = [canonicalLauncherCwd, editor, selection];
    V[25] = canonicalLauncherCwd;
    V[26] = editor;
    V[27] = selection;
    V[28] = ae;
    V[29] = me;
  } else {
    ae = V[28];
    me = V[29];
  }
  P(ae, me);
}
//@ chunk-93kwxas0.js:153447-153572 placement
/**
 * 保存或清除 Agents 视图的草稿与折叠状态。
 */
function persistFleetDraft(editor, selection, canonicalLauncherCwd, storageV5) {
  let x = editor.draftForDisk();
  let T = [...selection.getSnapshot().collapsed];
  if (x || T.length)
    sweepDraft(
      canonicalLauncherCwd,
      {
        q: x,
        collapsed: T,
      },
      storageV5,
    );
  else deleteJobDraft(canonicalLauncherCwd, storageV5);
}
//@ chunk-93kwxas0.js:153572-153594 placement
var INITIAL_AWAY_STATE = {
  pending: null,
};
//@ chunk-93kwxas0.js:153594-154228 placement
/**
 * 离开期间循环（away loop）状态存储。
 */
class AwayLoopStore {
  #n = createSignal();
  #e = INITIAL_AWAY_STATE;
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
    let h = false;
    return () => {
      if (h) return;
      h = true;
      this.#l--;
      if (this.#l === 0) {
        this.#r.clear();
        this.#t++;
        this.#e = INITIAL_AWAY_STATE;
      }
    };
  }
  get pending() {
    return this.#e.pending;
  }
  get generation() {
    return this.#t;
  }
  arm(h, justKilled = false, group, sortKey) {
    this.#i();
    this.#r.delete(h);
    this.#e = {
      pending: {
        id: h,
        justKilled,
        group,
        sortKey,
      },
    };
    this.#n.emit();
  }
  disarm() {
    if (this.#e.pending === null) return;
    this.#e = INITIAL_AWAY_STATE;
    this.#n.emit();
  }
  dismiss() {
    let pending = this.#e.pending;
    if (pending === null) return;
    this.#r.add(pending.id);
    this.disarm();
  }
  isDismissed(h) {
    return this.#r.has(h);
  }
}
//@ chunk-93kwxas0.js:154228-154280 placement
function ensureDeleteConfirmStore(h, E) {
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
//@ chunk-93kwxas0.js:154486-154701 placement
/**
 * Agents 视图浮层状态初始值。
 */
function createInitialFleetViewOverlays() {
  return {
    groupEdit: null,
    groupPickIdx: -1,
    groupPristine: false,
    resumePicker: null,
    resumePickerIdx: 0,
    settingPicker: null,
    settingPickerIdx: 0,
    renaming: null,
    previewOpen: false,
    helpOpen: false,
    debugOpen: false,
    exitPending: null,
  };
}
//@ chunk-93kwxas0.js:154701-156979 placement
/**
 * Agents 视图状态存储（分组模式、标签页、重命名、分组编辑等）。
 */
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
    let E = this.#e;
    let k = {
      ...E,
      ...h,
    };
    if (FLEET_VIEW_SNAPSHOT_KEYS.every((C) => Object.is(k[C], E[C]))) return;
    this.#e = k;
    this.#n.emit();
  }
  attachView(h) {
    this.#l++;
    this.restrictGroupMode(h.groupsEnabled);
    let E = false;
    return () => {
      if (E) return;
      E = true;
      this.#l--;
      if (this.#l === 0) {
        this.#t++;
        this.#i = null;
        this.#c = 0;
        this.#r = null;
        this.cancelPeekTap();
        this.#a.clear();
        this.#e = {
          ...this.#e,
          ...createInitialFleetViewOverlays(),
        };
      }
    };
  }
  setGroupMode(groupMode) {
    this.#o({
      groupMode,
    });
  }
  restrictGroupMode(h) {
    if (!h && this.#e.groupMode === "group")
      this.#o({
        groupMode: "state",
      });
  }
  vouchForLink(h) {
    this.#r = h;
  }
  takeVouchedLink(h) {
    let E = this.#r === h;
    this.#r = null;
    return E;
  }
  setActiveTab(activeTab) {
    this.#t++;
    this.#r = null;
    this.#o({
      activeTab,
      resumePicker: null,
      settingPicker: null,
    });
  }
  openGroupEdit(groupEdit, groupPristine) {
    this.#o({
      groupEdit,
      groupPristine,
    });
  }
  closeGroupEdit() {
    this.#o({
      groupEdit: null,
      groupPickIdx: -1,
      groupPristine: false,
    });
  }
  setGroupPickIdx(groupPickIdx) {
    this.#o({
      groupPickIdx,
    });
  }
  setGroupPristine(groupPristine) {
    this.#o({
      groupPristine,
    });
  }
  openResumePicker() {
    let h = ++this.#t;
    this.#o({
      resumePicker: {
        entries: null,
        failed: false,
      },
      resumePickerIdx: 0,
    });
    return h;
  }
  get resumePickerGen() {
    return this.#t;
  }
  setResumePicker(resumePicker) {
    this.#o({
      resumePicker,
    });
  }
  closeResumePicker() {
    this.#t++;
    this.#o({
      resumePicker: null,
    });
  }
  setResumePickerIdx(resumePickerIdx) {
    this.#o({
      resumePickerIdx,
    });
  }
  get resumePromoteSessionId() {
    return this.#i;
  }
  set resumePromoteSessionId(h) {
    this.#i = h;
  }
  refuseResumePick(h) {
    this.#c = h;
    this.closeResumePicker();
  }
  get resumePickerRefusedAt() {
    return this.#c;
  }
  clearResumePickerRefusal() {
    this.#c = 0;
  }
  openSettingPicker(settingPicker, settingPickerIdx) {
    this.#o({
      settingPicker,
      settingPickerIdx,
    });
  }
  closeSettingPicker() {
    this.#o({
      settingPicker: null,
    });
  }
  setSettingPickerIdx(settingPickerIdx) {
    this.#o({
      settingPickerIdx,
    });
  }
  startRename(jobId, sock, cloud) {
    this.#o({
      renaming: {
        jobId,
        sock,
        cloud,
      },
    });
  }
  clearRename() {
    this.#o({
      renaming: null,
    });
  }
  setPreviewOpen(previewOpen) {
    this.#o({
      previewOpen,
    });
  }
  schedulePeekTap(h, E) {
    this.cancelPeekTap();
    this.#s = h(() => {
      this.#s = null;
      E();
    });
  }
  cancelPeekTap() {
    if (this.#s === null) return;
    let h = this.#s;
    this.#s = null;
    h();
  }
  setHelpOpen(helpOpen) {
    this.#o({
      helpOpen,
    });
  }
  setDebugOpen(debugOpen) {
    this.#o({
      debugOpen,
    });
  }
  setExitPending = (exitPending) => {
    this.#o({
      exitPending,
    });
  };
  firstImpression(h) {
    if (this.#a.has(h)) return false;
    this.#a.add(h);
    return true;
  }
}
//@ chunk-93kwxas0.js:156979-157133 placement
/**
 * 取或创建 FleetViewStore，分组模式取全局配置。
 */
function ensureFleetViewStore(h, E, activeTab) {
  if (h.view) return h.view;
  let fleetViewGroupMode = getGlobalConfig().fleetViewGroupMode ?? "state";
  return (h.view = new FleetViewStore({
    groupMode: fleetViewGroupMode === "group" && !E ? "state" : fleetViewGroupMode,
    activeTab,
  }));
}
//@ chunk-93kwxas0.js:157133-157421 placement
/**
 * 退出 Agents 视图时的动作：直接退出、等待启动、提示或回到来源会话。
 */
function resolveExitAction(h) {
  if (h.originJobId === undefined)
    return {
      kind: "exit",
    };
  if (h.originSpawn !== undefined && !h.originSpawn.settled)
    return {
      kind: "wait-starting",
    };
  if (h.originSpawn !== undefined && !h.originSpawn.ok)
    return {
      kind: "exit-with-hint",
    };
  return h.originRowPresent
    ? {
        kind: "attach-origin",
      }
    : {
        kind: "exit-with-hint",
      };
}
//@ chunk-93kwxas0.js:157421-157490 placement
var RENAME_SAVE_WAIT_MS = 300;
var RENAME_BUSY_TEXT = "Still saving the last rename. Try again in a moment.";
//@ chunk-93kwxas0.js:157490-158765 placement
/**
 * 提交会话重命名。
 */
function submitRename(h) {
  let { roster, editor, view, storageV5 } = h.submit;
  let { simpleView, readRenameDraft, clearRename } = h;
  let { setError, setHint } = editor;
  let renaming = view.getSnapshot().renaming;
  let jobId = renaming?.jobId;
  let sock = renaming?.sock ?? null;
  let trimmed = readRenameDraft().trim();
  clearRename();
  if (!jobId || !trimmed) return;
  if (sock) {
    roster.updateAdoptedPeers((W) =>
      W.map((z) =>
        z.id !== jobId
          ? z
          : {
              ...z,
              state: {
                ...z.state,
                name: trimmed,
                intent: trimmed,
                updatedAt: new Date().toISOString(),
              },
            },
      ),
    );
    sendControlToUdsSocket(
      sock,
      {
        action: "rename",
        name: trimmed,
      },
      {
        storageV5,
      },
    )
      .then(() => {
        logFeatureOk("fleet_view_rename_job");
      })
      .catch((error) => {
        logForDebugging(`[fleetview] peer rename failed: ${error}`);
        logFeatureBad("fleet_view_rename_job", "peer_uds_failed");
        setError("Couldn't rename \u2014 that session isn't responding");
        roster.updateAdoptedPeers((z) =>
          z.map((oe) =>
            oe.id === jobId && oe.state.name === trimmed
              ? {
                  ...oe,
                  state: {
                    ...oe.state,
                    updatedAt: new Date(0).toISOString(),
                  },
                }
              : oe,
          ),
        );
      });
    return;
  }
  if (
    simpleView &&
    roster.jobs?.some((job) => job.id !== jobId && job.state.name !== undefined && job.state.name === trimmed)
  )
    setHint(`Another session is already named "${trimmed}"`);
  roster.bumpGen();
  roster.updateJobs((W) =>
    W
      ? W.map((z) =>
          z.id === jobId
            ? {
                ...z,
                state: {
                  ...z.state,
                  name: trimmed,
                },
              }
            : z,
        )
      : W,
  );
  syncJobName(jobId, trimmed, "user", storageV5).then((W) => {
    if (W) {
      logFeatureOk("fleet_view_rename_job");
      return;
    }
    setError("Couldn't rename \u2014 the job may have been removed or its state file is unwritable.");
    logFeatureBad("fleet_view_rename_job", "sync_name_failed");
    roster.updateJobs((z) =>
      z
        ? z.map((oe) =>
            oe.id === jobId && oe.state.name === trimmed
              ? {
                  ...oe,
                  state: {
                    ...oe.state,
                    name: undefined,
                  },
                }
              : oe,
          )
        : z,
    );
  });
}
//@ chunk-93kwxas0.js:158765-159980 placement
/**
 * 提交会话分组编辑。
 */
function submitGroupEdit(h) {
  let { roster, selection, editor, view, storageV5 } = h.submit;
  let { groupSuggestions, readGroupDraft, clearGroupEdit, ck } = h;
  let setError = editor.setError;
  let { groupEdit, groupPickIdx } = view.getSnapshot();
  if (!groupEdit) {
    clearGroupEdit();
    return;
  }
  let K = groupEdit.kind === "assign" && groupPickIdx >= 0 ? groupSuggestions[groupPickIdx] : undefined;
  let W = sanitizeGroupName(K ?? readGroupDraft()) || undefined;
  if (W && isReservedGroupName(W)) return;
  if (groupEdit.kind === "assign") {
    let found = renderListResultMessage(roster).find((le) => le.id === groupEdit.jobId);
    let group = found?.state.group;
    clearGroupEdit();
    if (W !== group) setJobGroup(h, groupEdit.jobId, W, false);
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
  selection.followOrigin = W;
  selection.followId = null;
  roster.bumpGen();
  selection.renameCollapsedKey(ck(from, "group"), ck(W, "group"));
  roster.updateJobs((ae) =>
    ae
      ? ae.map((me) =>
          me.state.group === from
            ? {
                ...me,
                state: {
                  ...me.state,
                  group: W,
                },
              }
            : me,
        )
      : ae,
  );
  let ge = false;
  let se = ge ? roster.regroupRemoteRows(from, W) : Promise.resolve(true);
  let mapped_2 = mapped.map(roster.holdJob);
  Promise.all([se, ...mapped.map((ae) => writeJobGroup(getJobDir(ae), W, storageV5))])
    .then(([ae]) => {
      if (ae) logFeatureOk("fleet_view_group_rename");
      else logFleetActionFailure(setError, "fleet_view_group_rename");
    })
    .catch((error) => {
      logError(error);
      setError(`Couldn't rename group \u2014 ${errorMessage(error)}`);
      logFeatureBad("fleet_view_group_rename", "write_group_failed");
      roster.reload();
      if (ge) roster.regroupRemoteRows(W, from);
    })
    .finally(() => {
      for (let ae of mapped_2) ae();
    });
}
//@ chunk-93kwxas0.js:159980-161116 placement
/**
 * 停止或删除会话（非 daemon 会话拒绝），带二次确认。
 */
function stopOrDeleteJob(h, E, job, C = false) {
  let { roster, editor } = h.submit;
  let { deleteConfirm, actions, groupOf, simpleView } = h;
  let setError = editor.setError;
  if (!job) return;
  if (job.state.backend !== "daemon") {
    setError("Can't stop or delete \u2014 this session is running in another terminal");
    return;
  }
  let N = jobTempo(job.state);
  let found = actions.find((action) => action.key === E && action.bands.includes(N));
  if (!found) return;
  let K = (label, error) => {
    if (error instanceof FleetActionUnconfirmedError)
      logForDebugging(`[FleetView] action '${label}' unconfirmed: ${errorMessage(error)}`, {
        level: "warn",
      });
    else if (isFsInaccessible(error))
      logForDebugging(`[FleetView] action '${label}' fs failure (${error.code}): ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    setError(`Couldn't ${label} \u2014 ${errorMessage(error)}`);
  };
  if (E === "x" && !C && deleteConfirm.pending?.id !== job.id) {
    let found_2 = actions.find((action) => action.label === "stop");
    let oe = groupOf.get(job.id);
    let ge = jobSortKey_2(job.state, oe);
    let generation = deleteConfirm.generation;
    deleteConfirm.arm(job.id, found.label === "stop", oe, ge);
    let ne = !(simpleView && isSettled(job.state));
    if (found_2 && ne)
      Promise.resolve(
        found_2.run(job, {
          bulk: C,
        }),
      ).catch((error) => {
        if (
          deleteConfirm.generation === generation &&
          !roster.isDeleting(job.id) &&
          roster.jobs?.some((job_2) => job_2.id === job.id) &&
          (deleteConfirm.pending === null || deleteConfirm.pending.id === job.id) &&
          !deleteConfirm.isDismissed(job.id)
        )
          deleteConfirm.arm(job.id, false, oe, ge);
        K(found_2.label, error);
      });
    return;
  }
  deleteConfirm.disarm();
  let W = E === "x" ? (actions.find((action) => action.label === "delete") ?? found) : found;
  Promise.resolve(
    W.run(job, {
      bulk: C,
    }),
  ).then(
    (z) => {
      if (z) setError(z);
    },
    (error) => K(W.label, error),
  );
}
//@ chunk-93kwxas0.js:161116-161403 placement
/**
 * 按方向找下一个可聚焦的行（跳过标题或非会话行）。
 */
function nextFocusableRow(h, focusedIdx, k) {
  let { rows, hasComposedDispatch, byState, dispatchRepoCwd, previewOpen } = h;
  let V = rows.length;
  if (V === 0) return 0;
  if (hasComposedDispatch && (byState || dispatchRepoCwd)) return focusedIdx;
  let D = hasComposedDispatch
    ? (N) => N?.kind !== "header" || N.group === "pinned"
    : previewOpen
      ? (N) => N?.kind !== "job"
      : null;
  let U = (focusedIdx + k + V) % V;
  if (D) while (U !== focusedIdx && D(rows[U])) U = (U + k + V) % V;
  return U;
}
//@ chunk-93kwxas0.js:161403-161717 placement
/**
 * 处理跳到上/下一个分组的快捷键。
 */
function jumpGroupHeader(h, fleetKeyAction, focusedIdx) {
  if (fleetKeyAction !== "agents:nextGroup" && fleetKeyAction !== "agents:previousGroup") return null;
  let { rows, hasComposedDispatch, previewOpen } = h;
  if (
    h.submit.suggestions.length > 0 ||
    previewOpen ||
    hasComposedDispatch ||
    !rows.some((V) => V.kind === "header")
  )
    return null;
  let A = fleetKeyAction === "agents:nextGroup" ? 1 : -1;
  let L = focusedIdx + A;
  while (rows[L] && rows[L]?.kind !== "header") L += A;
  return rows[L] ? L : focusedIdx;
}
//@ chunk-93kwxas0.js:161717-162441 placement
/**
 * 设置会话分组（新建/加入/取消分组）并上报。
 */
function setJobGroup(h, jobId, k, C) {
  let { roster, selection, editor, storageV5 } = h.submit;
  let { ck } = h;
  let setError = editor.setError;
  let U =
    k !== undefined && !renderListResultMessage(roster).some((K) => K.id !== jobId && K.state.group === k);
  let N =
    k === undefined ? "fleet_view_group_ungroup" : U ? "fleet_view_group_create" : "fleet_view_group_assign";
  selection.followId = C
    ? (roster.getSnapshot().remoteJobs.find((remoteJob) => remoteRowIdOf(remoteJob) === jobId)?.id ?? jobId)
    : jobId;
  if (C) {
    selection.uncollapse(ck(k ?? UNGROUPED, "group"));
    roster
      .markRemoteRow(jobId, (K) => ({
        ...K,
        group: k,
      }))
      .then((K) => {
        if (K) logFeatureOk(N);
        else logFleetActionFailure(setError, N);
      });
    return;
  }
  roster.bumpGen();
  roster.updateJobs((K) =>
    K
      ? K.map((W) =>
          W.id === jobId
            ? {
                ...W,
                state: {
                  ...W.state,
                  group: k,
                },
              }
            : W,
        )
      : K,
  );
  selection.uncollapse(ck(k ?? UNGROUPED, "group"));
  let X = roster.holdJob(jobId);
  writeJobGroup(getJobDir(jobId), k, storageV5)
    .then(() => {
      logFeatureOk(N);
    })
    .catch((error) => {
      logError(error);
      setError(`Couldn't set group \u2014 ${errorMessage(error)}`);
      logFeatureBad(N, "write_group_failed");
      roster.reload();
    })
    .finally(X);
}
//@ chunk-93kwxas0.js:162441-163145 placement
/**
 * 停止某分组内所有 daemon 会话。
 */
function stopGroup(h, group) {
  let { roster, selection, editor, storageV5 } = h.submit;
  let { ck } = h;
  let setError = editor.setError;
  let mapped = (roster.jobs ?? [])
    .filter((N) => N.state.group === group && N.state.backend === "daemon")
    .map((N) => N.id);
  selection.followOrigin = UNGROUPED;
  selection.followId = null;
  roster.bumpGen();
  selection.uncollapse(ck(group, "group"), ck(UNGROUPED, "group"));
  roster.updateJobs((N) =>
    N
      ? N.map((X) =>
          X.state.group === group
            ? {
                ...X,
                state: {
                  ...X.state,
                  group: undefined,
                },
              }
            : X,
        )
      : N,
  );
  let resolved = Promise.resolve(true);
  let mapped_2 = mapped.map(roster.holdJob);
  Promise.all([resolved, ...mapped.map((N) => writeJobGroup(getJobDir(N), undefined, storageV5))])
    .then(([N]) => {
      if (N) logFeatureOk("fleet_view_group_delete");
      else logFleetActionFailure(setError, "fleet_view_group_delete");
    })
    .catch((error) => {
      logError(error);
      setError(`Couldn't remove group \u2014 ${errorMessage(error)}`);
      logFeatureBad("fleet_view_group_delete", "write_group_failed");
      roster.reload();
    })
    .finally(() => {
      for (let N of mapped_2) N();
    });
}
//@ chunk-93kwxas0.js:163145-163163 placement
function logFleetActionFailure(setError, E) {}
export {
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
};
