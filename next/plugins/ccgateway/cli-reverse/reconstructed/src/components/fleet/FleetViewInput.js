/**
 * components/fleet/FleetViewInput.tsx
 *
 * 2.1.316 新增：会话预览面板：日志尾、回复输入、附加、停止、重命名；Agents 视图主体（列表、预览、标签页、云会话行）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-avy0g5d4.js (49)
 * attribution: placement 49
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { FLEET_KEY_ACTIONS, useFleetBindings, FLEET_EDITOR_SAFE_ACTIONS } from "./FleetList.js";
import { getSingleKeyActionInContexts } from "../../keybindings/resolver.js";
import { AGENTS_GROUP_PATH, GLOBAL_CHAT_GROUP_PATH } from "../agents/utils.js";
import { chordToDisplayString } from "../../keybindings/parser.js";
import { getShortcutDisplayPlatform } from "../../utils/keyboardShortcuts.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import {
  deleteMethodName,
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
import { parseNewSessionPrefix, isPasteImageKey, pasteImageFromClipboard } from "./fleetSessions.js";
import {
  init_react_production,
  useState,
  useEffect,
  useRef,
  fragmentTypeExport,
  useEffectEvent,
} from "../../../vendor/react/cjs/react.production.js";
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
import { lit } from "../../services/analytics/safeMetadata.js";
import { recordSuggestionOutcome } from "../../services/PromptSuggestion/backOff.js";
import { cacheImagePath } from "../../utils/imageStore.js";
import { usePasteHandler } from "../../hooks/usePasteHandler.js";
import { PasteEvent } from "../../ink/frame.js";
import { isReducedMotion } from "../Spinner/spinnerFlags.js";
import { shouldUseFullscreenByDefault } from "../../utils/fullscreen.js";
import { keyEventToKeystroke } from "../../keybindings/match.js";
import { LinkifiedText } from "../LinkifiedText.js";
import { PrBadge, DiffStatCounts } from "../PrBadge.js";
import { BOXED_DIAMOND_GLYPH } from "../../constants/figures.js";
import { expandPrUrlIfTemplate } from "../../utils/ghPrStatus.js";
import { SearchBox } from "../SearchBox.js";
import { isNoForceUpdateRenders } from "../../utils/Cursor.js";
import { countWhere } from "../../utils/collections.js";
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
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { getGlobalConfig } from "../../utils/config.js";
import { sendControlToUdsSocket } from "../../utils/udsMessaging/udsClient.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { renderListResultMessage } from "../../tools/ScheduleCronTool/UI.js";

//@ chunk-avy0g5d4.js:123736-123784 placement
function matchFleetKeyAction(singleKeyActionInContexts) {
  return FLEET_KEY_ACTIONS.find((action) => action === singleKeyActionInContexts) ?? null;
}
//@ chunk-avy0g5d4.js:123784-123887 placement
/**
 * 按两组快捷键上下文解析单键动作。
 */
function resolveFleetKeyAction(key, bindings) {
  if (!key) return null;
  let singleKeyActionInContexts = getSingleKeyActionInContexts(key, AGENTS_GROUP_PATH, bindings);
  if (singleKeyActionInContexts !== undefined) return matchFleetKeyAction(singleKeyActionInContexts);
  return matchFleetKeyAction(getSingleKeyActionInContexts(key, GLOBAL_CHAT_GROUP_PATH, bindings));
}
//@ chunk-avy0g5d4.js:123887-124064 placement
/**
 * 找某动作的单键快捷键显示文本。
 */
function shortcutDisplayFor(action, bindings) {
  for (let index = bindings.length - 1; index >= 0; index--) {
    let binding = bindings[index];
    if (!binding || binding.action !== action || binding.chord.length !== 1) continue;
    let key = binding.chord[0];
    if (key && resolveFleetKeyAction(key, bindings) === action)
      return chordToDisplayString(binding.chord, getShortcutDisplayPlatform());
  }
  return "";
}
//@ chunk-avy0g5d4.js:124064-124100 placement
function selectCollapsedKeys(state) {
  return state.collapsed;
}
//@ chunk-avy0g5d4.js:124100-124155 placement
function selectVoiceMode(state) {
  return state.settings.voice?.mode ?? "hold";
}
//@ chunk-avy0g5d4.js:124155-124192 placement
function selectVoiceState(state) {
  return state.voiceState;
}
//@ chunk-avy0g5d4.js:124192-124233 placement
function selectVoiceWarmingUp(state) {
  return state.voiceWarmingUp;
}
//@ chunk-avy0g5d4.js:124233-124323 placement
var EXIT_HINT_TEXT = {
  "Ctrl-C": "press ctrl+c or q again to exit",
  "Ctrl-D": "press ctrl+d again to exit",
};
//@ chunk-avy0g5d4.js:124323-127811 placement
/**
 * Agents 视图底部快捷键提示栏。
 */
function FleetFooter(props) {
  let $ = useMemoCache(6);
  let { owners, layout, simpleView, dispatchDefaults, groupInput, suggestionsOpen } = props;
  let { selection, view, editor, deleteConfirm } = owners;
  let { columns } = useTerminalSize();
  let fleetBindings = useFleetBindings();
  let findHint = shortcutDisplayFor("agents:find", fleetBindings);
  let groupHint;
  if ($[0] !== fleetBindings) {
    groupHint = shortcutDisplayFor("agents:setGroup", fleetBindings);
    $[0] = fleetBindings;
    $[1] = groupHint;
  } else groupHint = $[1];
  let groupHint_2 = groupHint;
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
  let enterAction = enterLabel;
  let enterLabelExtraWidth = bunStringWidth(enterAction) - bunStringWidth(enterLabel);
  let jobId = renaming?.jobId ?? null;
  let collapseKeyFor = (group) => groupCollapseKey(groupMode, group);
  const footerBox = Box;
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
              children:
                simpleView && pending.backend !== null
                  ? jsxProd_default(Text, {
                      children: `${pending.justKilled ? "stopped \xB7 " : ""}ctrl+x again to ${deleteMethodName(pending.backend)} \xB7 esc to keep`,
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
                                children: isSettled(focused.state)
                                  ? `ctrl+x to ${deleteMethodName(focused.state.backend)}`
                                  : "ctrl+x to stop",
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
                                    action: enterAction,
                                    format: {
                                      keyCase: "lower",
                                    },
                                  }),
                                expandHintPasteId !== null &&
                                  query !== "" &&
                                  columns >= 90 + enterLabelExtraWidth &&
                                  jsxProd_default(Text, {
                                    dimColor: true,
                                    children: "paste again to expand",
                                  }),
                                focusedRow?.kind === "header" &&
                                  query === "" &&
                                  !isOnboarding &&
                                  jsxProd_default(KeyboardShortcutHint, {
                                    chord: "enter",
                                    action: storeSelector.has(collapseKeyFor(focusedRow.group))
                                      ? "expand"
                                      : "collapse",
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
                                        action: deleteMethodName(focused.state.backend),
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
                                  findHint !== "" &&
                                  parseNewSessionPrefix(query) !== null &&
                                  expandHintPasteId === null &&
                                  columns >= 43 + enterLabelExtraWidth + bunStringWidth(findHint) &&
                                  jsxProd_default_2(Text, {
                                    children: [findHint, " to find"],
                                  }),
                                null,
                                byGroup &&
                                  query === "" &&
                                  !!focused &&
                                  !focusedIsPending &&
                                  focused.state.backend === "daemon" &&
                                  groupHint_2 !== "" &&
                                  columns >= 111 &&
                                  jsxProd_default_2(Text, {
                                    children: [groupHint_2, " to group"],
                                  }),
                              ],
                            }),
                          ],
                        })
                      : null;
  let footer;
  if ($[2] !== footerBox || $[3] !== paddingLeft || $[4] !== children) {
    footer = jsxProd_default(footerBox, {
      flexShrink,
      paddingLeft,
      height,
      children,
    });
    $[2] = footerBox;
    $[3] = paddingLeft;
    $[4] = children;
    $[5] = footer;
  } else footer = $[5];
  return footer;
}
//@ chunk-avy0g5d4.js:127811-127815 placement
init_react_production();
//@ chunk-avy0g5d4.js:127815-127819 placement
init_react_production();
//@ chunk-avy0g5d4.js:127819-127851 placement
function nowMs() {
  return Date.now();
}
//@ chunk-avy0g5d4.js:127851-127865 placement
var HINT_PADDING = 2;
var HINT_ITEM_GAP = 4;
//@ chunk-avy0g5d4.js:127865-129392 placement
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
  let switchViewHint = shortcutDisplayFor("agents:switchView", fleetBindings);
  let pinHint = shortcutDisplayFor("agents:togglePin", fleetBindings);
  let findHint = shortcutDisplayFor("agents:find", fleetBindings);
  let renameHint = shortcutDisplayFor("agents:rename", fleetBindings);
  let groupHint = shortcutDisplayFor("agents:setGroup", fleetBindings);
  let prevGroupHint = shortcutDisplayFor("agents:previousGroup", fleetBindings);
  let nextGroupHint = shortcutDisplayFor("agents:nextGroup", fleetBindings);
  let sliced = prevGroupHint.slice(0, prevGroupHint.lastIndexOf("+") + 1);
  let jumpGroupsHint =
    prevGroupHint && nextGroupHint && nextGroupHint.startsWith(sliced)
      ? `${prevGroupHint}/${nextGroupHint.slice(sliced.length)}`
      : [prevGroupHint, nextGroupHint].filter(Boolean).join(" and ");
  let hints = [];
  if (canReorder) hints.push(`shift+${figures_default.arrowUp + figures_default.arrowDown} to reorder`);
  if (canRename && renameHint) hints.push(`${renameHint} to rename`);
  if (canGroup && groupHint) hints.push(`${groupHint} to set group`);
  if (canSwitchViews) {
    if (findHint) hints.push(`${findHint} to find`);
    if (jumpGroupsHint) hints.push(`${jumpGroupsHint} to jump groups`);
    if (switchViewHint) hints.push(`${switchViewHint} to switch views`);
    hints.push("ctrl+j for newline");
    if (canDispatchAndOpen) hints.push("ctrl+enter to start and open");
  }
  if (canMention) hints.push("@ to mention");
  if (canPin && pinHint) hints.push(`${pinHint} to ${focusedPinned ? "unpin" : "pin to top"}`);
  if (altOpenCount > 0) hints.push(`alt+1${altOpenCount > 1 ? `-${altOpenCount}` : ""} to open`);
  if (canDelete) hints.push(`ctrl+x to ${canDelete}`);
  if (canGoBack) hints.push(`${figures_default.arrowLeft} to go back`);
  hints.push(canSwitchViews ? "esc to quit" : "esc to close \xB7 esc again quits");
  hints.push("? to close");
  let columnsOfHints = [];
  for (let idx = 3; ; idx++) {
    columnsOfHints = [];
    for (let startIndex = 0; startIndex < hints.length; startIndex += idx)
      columnsOfHints.push(hints.slice(startIndex, startIndex + idx));
    if (
      2 * HINT_PADDING +
        HINT_ITEM_GAP * (columnsOfHints.length - 1) +
        sumByAliasField(columnsOfHints, (columnHints) =>
          Math.max(...columnHints.map((hint) => bunStringWidth(hint))),
        ) <=
        columns ||
      columnsOfHints.length === 1
    )
      break;
  }
  return jsxProd_default(Box, {
    flexShrink: 0,
    paddingX: HINT_PADDING,
    flexDirection: "row",
    gap: HINT_ITEM_GAP,
    children: columnsOfHints.map((columnHints, columnIndex) =>
      jsxProd_default(
        Box,
        {
          flexDirection: "column",
          children: columnHints.map((hint) =>
            jsxProd_default(
              Text,
              {
                dimColor: true,
                children: hint,
              },
              hint,
            ),
          ),
        },
        columnIndex,
      ),
    ),
  });
}
//@ chunk-avy0g5d4.js:129392-132912 placement
/**
 * 会话预览头部（更新时间定时刷新）。
 */
function JobPeekHeader(props) {
  let $ = useMemoCache(43);
  let { job } = props;
  let updatedMs;
  if ($[0] !== job) {
    updatedMs = job ? Date.parse(job.state.updatedAt) : 0;
    $[0] = job;
    $[1] = updatedMs;
  } else updatedMs = $[1];
  let updatedMs_2 = updatedMs;
  let [nowMsState, setNowMs] = useState(nowMs);
  let tick;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    tick = () => setNowMs(Date.now());
    $[2] = tick;
  } else tick = $[2];
  useInterval(tick, !job ? null : nowMsState - updatedMs_2 < 60000 ? 1000 : 30000);
  if (!job) {
    let emptyState;
    if ($[3] === MEMO_CACHE_SENTINEL) {
      emptyState = jsxProd_default(Box, {
        flexShrink: 0,
        paddingX: 2,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "no job focused",
        }),
      });
      $[3] = emptyState;
    } else emptyState = $[3];
    return emptyState;
  }
  let state = job.state;
  const max = Math.max(0, nowMsState - updatedMs_2);
  let ageMs;
  if ($[4] !== max) {
    ageMs = formatDuration(max, {
      mostSignificantOnly: true,
    });
    $[4] = max;
    $[5] = ageMs;
  } else ageMs = $[5];
  let ageText = ageMs;
  let backendLabel;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    backendLabel = jsxProd_default(Text, {
      dimColor: true,
      children: "backend ",
    });
    $[6] = backendLabel;
  } else backendLabel = $[6];
  let backendText;
  if ($[7] !== state.backend) {
    backendText = jsxProd_default_2(Text, {
      children: [backendLabel, state.backend],
    });
    $[7] = state.backend;
    $[8] = backendText;
  } else backendText = $[8];
  let dirLabel;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    dirLabel = jsxProd_default(Text, {
      dimColor: true,
      children: "dir ",
    });
    $[9] = dirLabel;
  } else dirLabel = $[9];
  let jobDir;
  if ($[10] !== job.id) {
    jobDir = getJobDir(job.id);
    $[10] = job.id;
    $[11] = jobDir;
  } else jobDir = $[11];
  let dirText;
  if ($[12] !== jobDir) {
    dirText = jsxProd_default_2(Text, {
      children: [dirLabel, jobDir],
    });
    $[12] = jobDir;
    $[13] = dirText;
  } else dirText = $[13];
  let cwdLabel;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    cwdLabel = jsxProd_default(Text, {
      dimColor: true,
      children: "cwd ",
    });
    $[14] = cwdLabel;
  } else cwdLabel = $[14];
  const workingDir = state.worktreePath ?? state.cwd;
  let cwdText;
  if ($[15] !== workingDir) {
    cwdText = jsxProd_default_2(Text, {
      children: [cwdLabel, workingDir],
    });
    $[15] = workingDir;
    $[16] = cwdText;
  } else cwdText = $[16];
  let identityBox;
  if ($[17] !== cwdText || $[18] !== backendText || $[19] !== dirText) {
    identityBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [backendText, dirText, cwdText],
    });
    $[17] = cwdText;
    $[18] = backendText;
    $[19] = dirText;
    $[20] = identityBox;
  } else identityBox = $[20];
  let attachHint;
  if ($[21] !== job.id || $[22] !== state.backend) {
    attachHint =
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
    $[21] = job.id;
    $[22] = state.backend;
    $[23] = attachHint;
  } else attachHint = $[23];
  let sessionLabel;
  if ($[24] === MEMO_CACHE_SENTINEL) {
    sessionLabel = jsxProd_default(Text, {
      dimColor: true,
      children: "session ",
    });
    $[24] = sessionLabel;
  } else sessionLabel = $[24];
  const sessionId = state.resumeSessionId ?? state.sessionId;
  let sessionText;
  if ($[25] !== sessionId) {
    sessionText = jsxProd_default_2(Text, {
      children: [sessionLabel, sessionId],
    });
    $[25] = sessionId;
    $[26] = sessionText;
  } else sessionText = $[26];
  let versionLabel;
  if ($[27] === MEMO_CACHE_SENTINEL) {
    versionLabel = jsxProd_default(Text, {
      dimColor: true,
      children: "version ",
    });
    $[27] = versionLabel;
  } else versionLabel = $[27];
  let versionText;
  if ($[28] !== state.cliVersion) {
    versionText =
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
              VERSION: "2.1.318",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-11-03T18:52:53Z",
              GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
                      VERSION: "2.1.318",
                      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                      BUILD_TIME: "2026-11-03T18:52:53Z",
                      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
                      HOOKS_WORKER_URL:
                        import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                      DD_SOURCEMAP_GROUP: "default",
                    }.VERSION,
                  ],
                }),
              ],
            });
    $[28] = state.cliVersion;
    $[29] = versionText;
  } else versionText = $[29];
  let versionLine;
  if ($[30] !== versionText) {
    versionLine = jsxProd_default_2(Text, {
      children: [versionLabel, versionText],
    });
    $[30] = versionText;
    $[31] = versionLine;
  } else versionLine = $[31];
  let updatedLabel;
  if ($[32] === MEMO_CACHE_SENTINEL) {
    updatedLabel = jsxProd_default(Text, {
      dimColor: true,
      children: "updated ",
    });
    $[32] = updatedLabel;
  } else updatedLabel = $[32];
  let updatedText;
  if ($[33] !== ageText) {
    updatedText = jsxProd_default_2(Text, {
      children: [updatedLabel, ageText, " ago"],
    });
    $[33] = ageText;
    $[34] = updatedText;
  } else updatedText = $[34];
  let metaBox;
  if ($[35] !== attachHint || $[36] !== sessionText || $[37] !== versionLine || $[38] !== updatedText) {
    metaBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [attachHint, sessionText, versionLine, updatedText],
    });
    $[35] = attachHint;
    $[36] = sessionText;
    $[37] = versionLine;
    $[38] = updatedText;
    $[39] = metaBox;
  } else metaBox = $[39];
  let header;
  if ($[40] !== identityBox || $[41] !== metaBox) {
    header = jsxProd_default_2(Box, {
      flexShrink: 0,
      paddingX: 2,
      flexDirection: "row",
      gap: 4,
      children: [identityBox, metaBox],
    });
    $[40] = identityBox;
    $[41] = metaBox;
    $[42] = header;
  } else header = $[42];
  return header;
}
//@ chunk-avy0g5d4.js:132912-132916 placement
init_react_production();
//@ chunk-avy0g5d4.js:132916-132920 placement
init_react_production();
//@ chunk-avy0g5d4.js:132920-133212 placement
/**
 * 渲染待回答问题的一个选项行（序号、标签、说明）。
 */
function renderQuestionOption(option, optionIndex) {
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
            children: [optionIndex + 1, "."],
          }),
        }),
        jsxProd_default(Box, {
          flexGrow: 1,
          width: 0,
          children: jsxProd_default_2(Text, {
            wrap: "truncate",
            children: [
              collapseWhitespace(option.label),
              option.description &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [" \xB7 ", collapseWhitespace(option.description)],
                }),
            ],
          }),
        }),
      ],
    },
    option.label,
  );
}
//@ chunk-avy0g5d4.js:133212-133960 placement
/**
 * 显示会话等待中的第一个问题。
 */
function PendingQuestionLine(props) {
  let $ = useMemoCache(14);
  let { questions } = props;
  let firstQuestion = questions[0];
  if (!firstQuestion) {
    return null;
  }
  let children;
  if ($[0] !== firstQuestion.question) {
    children = collapseWhitespace(firstQuestion.question);
    $[0] = firstQuestion.question;
    $[1] = children;
  } else children = $[1];
  let questionBox;
  if ($[2] !== children) {
    questionBox = jsxProd_default(Box, {
      flexGrow: 1,
      width: 0,
      children: jsxProd_default(Text, {
        bold: true,
        wrap: "truncate",
        children,
      }),
    });
    $[2] = children;
    $[3] = questionBox;
  } else questionBox = $[3];
  let moreBox;
  if ($[4] !== questions.length) {
    moreBox =
      questions.length > 1 &&
      jsxProd_default(Box, {
        flexShrink: 0,
        paddingLeft: 1,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: ["+", questions.length - 1, " more \xB7 enter to open"],
        }),
      });
    $[4] = questions.length;
    $[5] = moreBox;
  } else moreBox = $[5];
  let titleRow;
  if ($[6] !== questionBox || $[7] !== moreBox) {
    titleRow = jsxProd_default_2(Box, {
      children: [questionBox, moreBox],
    });
    $[6] = questionBox;
    $[7] = moreBox;
    $[8] = titleRow;
  } else titleRow = $[8];
  let options;
  if ($[9] !== firstQuestion.options) {
    options = firstQuestion.options.map(renderQuestionOption);
    $[9] = firstQuestion.options;
    $[10] = options;
  } else options = $[10];
  let line;
  if ($[11] !== titleRow || $[12] !== options) {
    line = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [titleRow, options],
    });
    $[11] = titleRow;
    $[12] = options;
    $[13] = line;
  } else line = $[13];
  return line;
}
//@ chunk-avy0g5d4.js:133960-134088 placement
/**
 * 数字键 1–9 对应的第一个问题的选项标签。
 */
function optionLabelForDigit(key, questions) {
  let question = questions?.[0];
  if (!question || key < "1" || key > "9") return null;
  let optionIndex = Number(key) - 1;
  return question.options[optionIndex]?.label.replace(CONTROL_CHARS_EXCEPT_WS_RE, "") ?? null;
}
//@ chunk-avy0g5d4.js:134088-134116 placement
var PREVIEW_MAX_CHILD_ROWS = 8;
var PREVIEW_MIN_ROWS = 5;
var PREVIEW_BACK_TIMEOUT_MS = 500;
var PREVIEW_HINT_DELAY_MS = 150;
//@ chunk-avy0g5d4.js:134116-143275 placement
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
  let setReplyError = (message) => editor.setReplyError(job.id, message);
  useEffect(() => logFleetJobAction("peek", job.state), []);
  let timestamp = Date.parse(job.state.updatedAt);
  let { storageV5 } = useTheme_2();
  let [nowMs, setNowMs] = useState(() => Date.now());
  let needsText =
    terminalOutcome(job.state.state) === null
      ? jobPreviewText(job.state, job.state.needs ?? "") || undefined
      : undefined;
  let isPlainText = returnFalse_2(job.state);
  let linkHref = job.state.needs?.startsWith(VERIFICATION_REQUIRED_NEEDS) ? safeVerificationUrl : undefined;
  let questions = job.state.tempo === "blocked" ? job.state.block?.questions : undefined;
  let blockQuestions = questions?.length ? questions : undefined;
  let mapped = childRows.map((row) => row.row.href);
  let mentionsChildHref = (text) =>
    mapped.some((href) => {
      let index = text.indexOf(href);
      return index >= 0 && !/\w/.test(text[index + href.length] ?? "") && text.length - href.length < 16;
    });
  let outputEntries = needsText
    ? []
    : Object.entries(job.state.output ?? {}).filter(([, value]) => !mentionsChildHref(value));
  let section = blockQuestions
    ? "questions"
    : needsText
      ? "needs"
      : outputEntries.length > 0
        ? "output"
        : "detail";
  let showsWaiting = section === "questions" || section === "needs";
  let tickMs = useIsScreenReaderEnabled() ? DISPATCH_TIMEOUT_MS : 1000;
  useInterval(() => setNowMs(Date.now()), showsWaiting ? (nowMs - timestamp < 60000 ? tickMs : 30000) : null);
  let waitingText = showsWaiting
    ? formatDuration(Math.max(0, nowMs - timestamp), {
        mostSignificantOnly: true,
      })
    : "";
  let submittingRef = useRef(false);
  let boxRef = useRef(null);
  useFocusOnMount(boxRef, true);
  let savedDraft = editor.replyDraft(job.id) ?? "";
  let [mode, setMode] = useState(getModeFromInput(savedDraft) === "bash" ? "bash" : "prompt");
  let modeRef = useRef(mode);
  let changeMode = (nextMode) => {
    modeRef.current = nextMode;
    setMode(nextMode);
  };
  let isBashMode = mode === "bash";
  let suggestedReply =
    job.state.tempo === "blocked" && !job.state.block?.questions && job.state.suggestedReply
      ? collapseWhitespace(job.state.suggestedReply) || undefined
      : undefined;
  let isPlain = false;
  let needQuestions = false;
  let voiceAvailable = useVoiceAvailable();
  let voiceMode = useAppState((appState) => appState.settings.voice?.mode ?? "hold");
  let clock = useClock();
  let peekTimerRef = useRef(null);
  let lastEditRef = useRef(null);
  let getVoiceState = useGetVoiceState();
  useEffect(
    () => () => {
      peekTimerRef.current?.();
      peekTimerRef.current = null;
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
    initialQuery: stripModePrefix(savedDraft),
    onExit: () => {
      if (submittingRef.current) return;
      let lastMark = lastEditRef.current;
      if (
        lastMark !== null &&
        (lastMark.sameChunk || performance.now() - lastMark.at < PREVIEW_HINT_DELAY_MS)
      )
        return;
      let sanitized = sanitizePromptText_2(queryRef.current, "fleet_reply");
      if (sanitized.removedTotal > 0) {
        let mark = {
          sameChunk: true,
          at: performance.now(),
        };
        lastEditRef.current = mark;
        queueMicrotask(() => {
          mark.sameChunk = false;
        });
        let becameEmpty = sanitized.text.trim() === "";
        setQuery(sanitized.text);
        setReplyError(formatInvisibleCharsRemoved(sanitized.removedTotal, becameEmpty ? "empty" : "review"));
        forceRedraw();
        return;
      }
      let trimmed = queryRef.current.trim();
      if (!trimmed && modeRef.current === "prompt") {
        submittingRef.current = true;
        onAttach();
        return;
      }
      if (!trimmed) return;
      let withMode = prependModeCharacterToInput_2(trimmed, modeRef.current);
      let prevMode = modeRef.current;
      submittingRef.current = true;
      setQuery("");
      changeMode("prompt");
      setReplyError(null);
      editor.deleteReplyDraft(job.id);
      let pastedRefs = parsePastedRefs(withMode);
      let pastedContents = {};
      for (let pastedRef of pastedRefs) {
        let paste = editor.pastes[pastedRef.id];
        if (paste) pastedContents[pastedRef.id] = paste;
      }
      let restoreDraft = () => {
        if (queryRef.current === "" && stripModePrefix(editor.replyDraft(job.id) ?? "") === "") {
          editor.saveReplyDraft(job.id, withMode);
          setQuery(trimmed);
          changeMode(prevMode);
          for (let pastedRef of pastedRefs) {
            let paste = pastedContents[pastedRef.id];
            if (paste) editor.pastes[pastedRef.id] = paste;
          }
        }
      };
      if (job.state.backend === "remote" && prevMode === "bash") {
        submittingRef.current = false;
        restoreDraft();
        setReplyError(
          "'!' commands can't be sent to a cloud session from this view; open the session to try it there",
        );
        return;
      }
      if (
        job.state.backend === "remote" &&
        pastedRefs.some((pastedRef) => pastedContents[pastedRef.id]?.type === "image")
      ) {
        submittingRef.current = false;
        restoreDraft();
        setReplyError(
          "Image attachments aren't available when replying to cloud sessions yet \u2014 open the session to send images",
        );
        return;
      }
      materializePastedImages(
        withMode,
        pastedContents,
        job.id,
        storageV5,
        isNonPromptInput(withMode, null) || isExecLaunch(job.state) ? "path" : "note",
      )
        .catch((error) => {
          logError(error);
          return withMode;
        })
        .then((materialized) => onReply(materialized))
        .then(
          (replyFailure) => {
            if (replyFailure) {
              restoreDraft();
              setReplyError(replyFailure);
            } else
              editor.pruneOrphanedPastes({
                pruneTextPastes: true,
              });
          },
          (error) => {
            restoreDraft();
            setReplyError(errorMessage(error));
          },
        )
        .finally(() => {
          submittingRef.current = false;
        });
    },
    onCancel: onBack,
    onSpaceOnEmpty: isBashMode
      ? undefined
      : voiceAvailable && voiceMode !== "tap"
        ? () => {
            peekTimerRef.current?.();
            peekTimerRef.current = clock.setTimeout(() => {
              peekTimerRef.current = null;
              let voiceState = getVoiceState();
              if (voiceState.voiceState !== "idle" || voiceState.voiceWarmingUp) return;
              if (queryRef.current.trim() !== "") return;
              onBack();
            }, PREVIEW_BACK_TIMEOUT_MS);
          }
        : onBack,
    onTabOnEmpty:
      suggestedReply && !isBashMode
        ? () => {
            setQuery(suggestedReply);
            logEvent("tengu_prompt_suggestion", {
              outcome: lit("accepted"),
              source: lit("fleetview_peek"),
            });
            recordSuggestionOutcome(true, storageV5);
          }
        : undefined,
  });
  let error = replyError?.error ?? null;
  useEffect(() => {
    editor.saveReplyDraft(job.id, prependModeCharacterToInput_2(query, mode));
  }, [query, mode, job.id, editor]);
  useEffect(() => {
    let unregister = editor.registerLivePeekQuery(() => queryRef.current);
    return () => {
      unregister();
      editor.pruneOrphanedPastes();
    };
  }, [editor, queryRef]);
  useEffect(() => registerPasteCarrier(() => [queryRef.current]), [queryRef]);
  let attachPastedImage = cacheImagePath(() => editor.pastes, handlePaste, {
    onMinted: editor.noteMintedPaste,
  });
  let { handleKeyDown: handleKeyDown_2, handlePaste: handlePaste_2 } = usePasteHandler({
    handleKeyDown,
    onPaste: (text) =>
      handlePaste(
        new PasteEvent(
          text.replace(
            /\r\n|\r/g,
            `
`,
          ),
        ),
      ),
    onImagePaste: attachPastedImage,
  });
  let [composer] = useState(() => ({
    get value() {
      return queryRef.current;
    },
    get cursorOffset() {
      return cursorOffsetRef.current;
    },
    setValueWithCursor: (value, cursorOffset) => {
      setQuery(value);
      setCursorOffset(cursorOffset);
    },
  }));
  let voiceIntegration = useVoiceIntegration({
    composer,
  });
  let voiceState = useAppState_2((appState) => appState.voiceState);
  let voiceWarmingUp = useAppState_2((appState) => appState.voiceWarmingUp);
  useEffect(() => {
    if (voiceState !== "idle" && peekTimerRef.current) {
      peekTimerRef.current();
      peekTimerRef.current = null;
    }
  }, [voiceState]);
  let reducedMotion = useAppState((appState) => isReducedMotion(appState.settings.prefersReducedMotion));
  let prUrlTemplate = useAppState((appState) => appState.settings?.prUrlTemplate);
  let showCursor = voiceState === "recording" && !reducedMotion;
  let { handleKeyDown: handleKeyDown_3 } = useVoiceKeybindingHandler({
    voiceHandleKeyEvent: voiceIntegration.handleKeyEvent,
    voiceCancelRecording: voiceIntegration.cancelRecording,
    stripTrailing: voiceIntegration.stripTrailing,
    resetAnchor: voiceIntegration.resetAnchor,
    isActive: (voiceMode !== "tap" || query.trim().length > 0) && !isBashMode && !renaming,
    composer,
  });
  let questionRows = blockQuestions ? 2 + (blockQuestions[0]?.options.length ?? 0) : 0;
  let isSafeMode = !heldInTerminal && hasSafeModeFlag(job.state.respawnFlags);
  let statusRows = showsWaiting || isSafeMode ? 1 : 0;
  let { rows, columns } = useTerminalSize();
  let bindings = useFleetBindings();
  let reservedRows = 8;
  let queryLineCount = query
    ? countCharInString(
        query,
        `
`,
      )
    : 0;
  let contentRows = Math.ceil(
    Math.max(
      1,
      ...(section === "needs"
        ? [bunStringWidth(jobPreviewText(job.state, needsText ?? ""))]
        : section === "output"
          ? outputEntries.map(([, outputText]) => bunStringWidth(jobPreviewText(job.state, outputText)))
          : section === "detail"
            ? [bunStringWidth(jobPreviewText(job.state, job.state.detail))]
            : []),
    ) / Math.max(40, columns - 6),
  );
  let bodyMaxRows = shouldUseFullscreenByDefault()
    ? Math.min(
        contentRows,
        Math.max(
          PREVIEW_MIN_ROWS,
          rows -
            reservedRows -
            Math.min(childRows.length, PREVIEW_MAX_CHILD_ROWS) -
            questionRows -
            statusRows -
            queryLineCount -
            (error ? 1 : 0) -
            1,
        ),
      )
    : PREVIEW_MIN_ROWS;
  let fixedRows =
    (section === "questions"
      ? questionRows
      : section === "output"
        ? outputEntries.length * bodyMaxRows
        : bodyMaxRows) +
    statusRows +
    queryLineCount +
    (error ? 1 : 0) +
    1;
  let max = Math.max(PREVIEW_MAX_CHILD_ROWS, rows - reservedRows - fixedRows);
  let sliced = childRows.slice(0, max);
  let hiddenChildCount = childRows.length - sliced.length;
  let max_2 = Math.max(0, ...outputEntries.map(([outputKey]) => bunStringWidth(outputKey)));
  let minHeight = 5;
  let { color } = activityColors(job.state, job.activity, status);
  return jsxProd_default_2(Fragment, {
    children: [
      jsxProd_default_2(Box, {
        ref: boxRef,
        flexDirection: "column",
        borderStyle: "round",
        borderColor: isBashMode ? "bashBorder" : undefined,
        borderDimColor: !isBashMode,
        paddingX: 1,
        minHeight,
        width: "100%",
        tabIndex: 0,
        autoFocus: true,
        onKeyDownCapture: handleKeyDown_3,
        onKeyDown: (event) => {
          if (event.key !== " " && peekTimerRef.current) {
            peekTimerRef.current();
            peekTimerRef.current = null;
          }
          if (renaming) return;
          if (FLEET_EDITOR_SAFE_ACTIONS.has(resolveFleetKeyAction(keyEventToKeystroke(event), bindings)))
            return;
          if (isPasteImageKey(event)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            pasteImageFromClipboard(
              (image) =>
                attachPastedImage(image.base64, {
                  mediaType: image.mediaType,
                  dimensions: image.dimensions,
                }),
              (message) => editor.setReplyError(job.id, message, "paste"),
            );
            return;
          }
          if (modeRef.current === "prompt") {
            if (event.name === "right" && !event.shift && !queryRef.current) {
              event.preventDefault();
              if (submittingRef.current) return;
              submittingRef.current = true;
              onAttach();
              return;
            }
            if (isBashModeChar(event.key) && !queryRef.current) {
              event.preventDefault();
              changeMode("bash");
              return;
            }
            if (!queryRef.current) {
              let optionLabel = optionLabelForDigit(event.key, blockQuestions);
              if (optionLabel) {
                event.preventDefault();
                setQuery(optionLabel);
                setCursorOffset(optionLabel.length);
                return;
              }
            }
          } else if (event.name === "backspace" && !queryRef.current) {
            event.preventDefault();
            changeMode("prompt");
            return;
          }
          handleKeyDown_2(event);
        },
        onPaste: renaming ? undefined : handlePaste_2,
        children: [
          section === "questions" && blockQuestions
            ? jsxProd_default(PendingQuestionLine, {
                questions: blockQuestions,
              })
            : section === "needs"
              ? jsxProd_default(Box, {
                  maxHeight: bodyMaxRows,
                  overflowY: "hidden",
                  children: jsxProd_default(Text, {
                    wrap: "wrap",
                    children: isPlainText
                      ? jsxProd_default(Text, {
                          dimColor: true,
                          children: needsText ?? "",
                        })
                      : jsxProd_default(InlineMarkup, {
                          value: stripJobPreviewText(needsText ?? ""),
                          linkHref,
                        }),
                  }),
                })
              : section === "output"
                ? jsxProd_default(Box, {
                    flexDirection: "column",
                    children: outputEntries.map(([outputKey, outputText]) =>
                      jsxProd_default_2(
                        Box,
                        {
                          children: [
                            outputEntries.length > 1 &&
                              jsxProd_default(Box, {
                                width: max_2 + 2,
                                flexShrink: 0,
                                children: jsxProd_default(Text, {
                                  dimColor: true,
                                  children: outputKey,
                                }),
                              }),
                            jsxProd_default(Box, {
                              flexGrow: 1,
                              width: 0,
                              maxHeight: bodyMaxRows,
                              overflowY: "hidden",
                              children: jsxProd_default(Text, {
                                wrap: "wrap",
                                children: isPlainText
                                  ? jsxProd_default(Text, {
                                      dimColor: true,
                                      children: jobPreviewText(job.state, outputText),
                                    })
                                  : jsxProd_default(InlineMarkup, {
                                      value: stripJobPreviewText(outputText),
                                    }),
                              }),
                            }),
                          ],
                        },
                        outputKey,
                      ),
                    ),
                  })
                : jsxProd_default(Box, {
                    maxHeight: bodyMaxRows,
                    overflowY: "hidden",
                    children: jsxProd_default(Text, {
                      wrap: "wrap",
                      children: isPlainText
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
                sliced.map((childRow) =>
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
                              childRow.prNumber !== undefined
                                ? jsxProd_default(PrBadge, {
                                    number: childRow.prNumber,
                                    url: childRow.row.href,
                                    kind: prKindOf(childRow.row),
                                    color: childRow.color,
                                    underline: false,
                                    hidePrefix: true,
                                  })
                                : jsxProd_default(Text, {
                                    color: childRow.color,
                                    dimColor: !isFrameRow(childRow),
                                    children: isFrameRow(childRow) ? BOXED_DIAMOND_GLYPH : "PR",
                                  }),
                              childRow.label
                                ? jsxProd_default_2(Fragment, {
                                    children: [
                                      " ",
                                      jsxProd_default(Link, {
                                        url: expandPrUrlIfTemplate(childRow.row.href, prUrlTemplate),
                                        children: jsxProd_default_2(Text, {
                                          color: childRow.isDraft ? "inactive" : undefined,
                                          children: [childRow.label, childRow.isDraft ? " (draft)" : ""],
                                        }),
                                      }),
                                    ],
                                  })
                                : null,
                            ],
                          }),
                        }),
                        childRow.diffStat &&
                          childRow.diffStat.additions + childRow.diffStat.deletions > 0 &&
                          jsxProd_default(Box, {
                            flexShrink: 0,
                            paddingLeft: 1,
                            children: jsxProd_default(Link, {
                              url: `${childRow.row.href}/files`,
                              children: jsxProd_default(DiffStatCounts, {
                                added: childRow.diffStat.additions,
                                removed: childRow.diffStat.deletions,
                              }),
                            }),
                          }),
                        jsxProd_default(Box, {
                          flexShrink: 0,
                          paddingLeft: 1,
                          children: childRow.status.map((statusItem, statusIndex) =>
                            jsxProd_default_2(
                              fragmentTypeExport,
                              {
                                children: [
                                  statusIndex > 0 &&
                                    jsxProd_default(Text, {
                                      children: " ",
                                    }),
                                  jsxProd_default(Text, {
                                    color: statusItem.color,
                                    dimColor: !statusItem.color,
                                    children: statusItem.text,
                                  }),
                                ],
                              },
                              statusIndex,
                            ),
                          ),
                        }),
                      ],
                    },
                    childRow.row.href,
                  ),
                ),
                hiddenChildCount > 0 &&
                  jsxProd_default(Box, {
                    paddingLeft: 2,
                    children: jsxProd_default_2(Text, {
                      dimColor: true,
                      children: ["\u2026 ", hiddenChildCount, " more"],
                    }),
                  }),
              ],
            }),
          statusRows > 0 &&
            jsxProd_default(Box, {
              paddingLeft: 2,
              children: jsxProd_default(Text, {
                wrap: "truncate",
                children: jsxProd_default_2(Byline, {
                  children: [
                    showsWaiting &&
                      jsxProd_default_2(Text, {
                        color,
                        children: ["waiting ", waitingText],
                      }),
                    isSafeMode &&
                      jsxProd_default(Text, {
                        dimColor: true,
                        children: "safe mode",
                      }),
                    isSafeMode &&
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
                voiceAvailable && (voiceState !== "idle" || voiceWarmingUp)
                  ? ""
                  : blockQuestions
                    ? `press 1-${blockQuestions[0]?.options.length ?? 2} or type your answer`
                    : suggestedReply && !isBashMode
                      ? suggestedReply
                      : "reply",
              prefix: isBashMode ? "!" : figures_default.pointer,
              prefixColor: isBashMode ? "bashBorder" : undefined,
              prefixDim: !query.trim(),
              dimRange: voiceIntegration.interimRange
                ? [voiceIntegration.interimRange.start, voiceIntegration.interimRange.end]
                : undefined,
              cursorChar: showCursor ? jsxProd_default(VoiceLevelGlyph, {}) : undefined,
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
          voiceAvailable && voiceWarmingUp && !renaming
            ? jsxProd_default(KeepHoldingHint, {})
            : voiceAvailable && voiceState !== "idle" && !renaming
              ? jsxProd_default(VoiceStateIndicator, {
                  voiceState,
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
                          isBashMode &&
                            jsxProd_default(Text, {
                              color: "bashBorder",
                              children: "! for shell mode",
                            }),
                          (query.trim() || (!isBashMode && !isPending)) &&
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
                            chord: query.trim() || isBashMode ? "escape" : " ",
                            action: "close",
                            format: {
                              keyCase: "lower",
                            },
                          }),
                          voiceAvailable && voiceMode !== "tap" && !isBashMode && !query.trim()
                            ? jsxProd_default(Text, {
                                children: "hold space to speak",
                              })
                            : null,
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "ctrl+x",
                            action: deleteArmed ? "confirm" : deleteMethodName(job.state.backend),
                          }),
                        ],
                      }),
                }),
      }),
    ],
  });
}
//@ chunk-avy0g5d4.js:143275-143312 placement
function selectReplyError(editor) {
  return editor.replyError;
}
//@ chunk-avy0g5d4.js:143312-143349 placement
function selectPrStatuses(roster) {
  return roster.prStatuses;
}
//@ chunk-avy0g5d4.js:143349-143403 placement
function isPinnedJobRow(row) {
  return row.kind === "job" && row.group === SIMPLE_PINNED;
}
//@ chunk-avy0g5d4.js:143403-148969 placement
/**
 * Agents 视图主体（列表、预览、标签页、云会话行）。
 */
function FleetBody(props) {
  let $ = useMemoCache(57);
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
  let statusByHref = useStoreSelector(roster, selectPrStatuses);
  let { pending } = useStoreSelector(deleteConfirm);
  let [isUpdating, setIsUpdating] = useState(false);
  let showSuccessMessage = isNoForceUpdateRenders();
  let { rows, byState, byGroup, focusedRow, focused, focusedIsPending, altOpenOrigin, ageNow } = layout;
  let jobId = renaming?.jobId ?? null;
  let getLiveStatus;
  if ($[0] !== roster) {
    getLiveStatus = (job) => roster.liveStatus(job);
    $[0] = roster;
    $[1] = getLiveStatus;
  } else getLiveStatus = $[1];
  let liveStatus = getLiveStatus;
  let openJob = onOpen;
  let childRows;
  if ($[2] !== focused || $[3] !== statusByHref) {
    childRows = focused?.state.children ? childFrameRows(focused.state.children, statusByHref) : [];
    $[2] = focused;
    $[3] = statusByHref;
    $[4] = childRows;
  } else childRows = $[4];
  let childRows_2 = childRows;
  let resumePickerOverlay;
  if ($[5] !== ageNow || $[6] !== resumePicker || $[7] !== resumePickerIdx) {
    resumePickerOverlay =
      resumePicker !== null
        ? (() => {
            let listBody;
            if (resumePicker.entries === null)
              listBody = jsxProd_default(Text, {
                dimColor: true,
                children: "Looking for past sessions\u2026",
              });
            else if (resumePicker.failed)
              listBody = jsxProd_default(Text, {
                dimColor: true,
                children: "Couldn't load past sessions \u2014 press esc, then try /resume again",
              });
            else if (resumePicker.entries.length === 0)
              listBody = jsxProd_default(Text, {
                dimColor: true,
                children: "No past sessions to resume",
              });
            else {
              let entries = resumePicker.entries;
              let max = Math.max(0, Math.min(resumePickerIdx - 3, entries.length - 8));
              let sliced = entries.slice(max, max + 8);
              let hiddenBelow = entries.length - max - sliced.length;
              listBody = jsxProd_default_2(Fragment, {
                children: [
                  max > 0 &&
                    jsxProd_default_2(Text, {
                      dimColor: true,
                      children: ["  ", "\u2026 ", max, " above"],
                    }),
                  sliced.map((entry, entryIndex) => {
                    let isSelected = max + entryIndex === resumePickerIdx;
                    return jsxProd_default_2(
                      Box,
                      {
                        children: [
                          jsxProd_default(Box, {
                            flexGrow: 1,
                            flexShrink: 1,
                            overflow: "hidden",
                            children: jsxProd_default_2(Text, {
                              color: isSelected ? "suggestion" : undefined,
                              dimColor: !isSelected,
                              wrap: "truncate",
                              children: [isSelected ? figures_default.pointer : " ", " ", entry.title],
                            }),
                          }),
                          jsxProd_default(Box, {
                            flexShrink: 0,
                            marginLeft: 1,
                            children: jsxProd_default(Text, {
                              dimColor: true,
                              children: formatDuration(
                                Math.max(0, (ageNow ?? Date.now()) - entry.modified.getTime()),
                                {
                                  mostSignificantOnly: true,
                                },
                              ),
                            }),
                          }),
                        ],
                      },
                      entry.sessionId,
                    );
                  }),
                  hiddenBelow > 0 &&
                    jsxProd_default_2(Text, {
                      dimColor: true,
                      children: ["  ", "\u2026 ", hiddenBelow, " more"],
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
                  listBody,
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
    $[5] = ageNow;
    $[6] = resumePicker;
    $[7] = resumePickerIdx;
    $[8] = resumePickerOverlay;
  } else resumePickerOverlay = $[8];
  let resumePickerOverlay_2 = resumePickerOverlay;
  let settingPickerOverlay;
  if ($[9] !== settingPicker || $[10] !== settingPickerIdx) {
    settingPickerOverlay =
      settingPicker !== null
        ? (() => {
            let { setting, options } = settingPicker;
            let max = Math.max(0, Math.min(settingPickerIdx - 3, options.length - 8));
            let sliced = options.slice(max, max + 8);
            let hiddenBelow = options.length - max - sliced.length;
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
                  sliced.map((option, optionIndex) => {
                    let isSelected = max + optionIndex === settingPickerIdx;
                    return jsxProd_default_2(
                      Text,
                      {
                        color: isSelected ? "suggestion" : undefined,
                        dimColor: !isSelected,
                        wrap: "truncate",
                        children: [
                          isSelected ? figures_default.pointer : " ",
                          " ",
                          option.value,
                          option.description ? ` \xB7 ${option.description}` : "",
                        ],
                      },
                      option.value,
                    );
                  }),
                  hiddenBelow > 0 &&
                    jsxProd_default_2(Text, {
                      dimColor: true,
                      children: ["  ", "\u2026 ", hiddenBelow, " more"],
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
    $[9] = settingPicker;
    $[10] = settingPickerIdx;
    $[11] = settingPickerOverlay;
  } else settingPickerOverlay = $[11];
  let settingPickerOverlay_2 = settingPickerOverlay;
  let bottomArea;
  if (
    $[12] !== activeTab ||
    $[13] !== altOpenOrigin ||
    $[14] !== byGroup ||
    $[15] !== byState ||
    $[16] !== canMention ||
    $[17] !== debugOpen ||
    $[18] !== focused ||
    $[19] !== focusedIsPending ||
    $[20] !== focusedRow ||
    $[21] !== footer ||
    $[22] !== groupsEnabled ||
    $[23] !== helpOpen ||
    $[24] !== previewOpen ||
    $[25] !== rows ||
    $[26] !== showRemoteTabs ||
    $[27] !== simpleView
  ) {
    bottomArea =
      helpOpen && !previewOpen
        ? jsxProd_default(FleetKeyHints, {
            focusedPinned: focused?.state.pinned ?? false,
            canReorder:
              !!focused &&
              (simpleView
                ? (focused.state.pinned ?? false) && countWhere(rows, isPinnedJobRow) > 1
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
              countWhere(rows, (row) => row.kind === "job" && row.origin === altOpenOrigin),
            ),
            canDelete:
              focused && !focusedIsPending
                ? isSettled(focused.state)
                  ? deleteMethodName(focused.state.backend)
                  : "stop"
                : undefined,
            canGoBack: false,
          })
        : debugOpen && !previewOpen
          ? jsxProd_default(JobPeekHeader, {
              job: focused,
            })
          : footer;
    $[12] = activeTab;
    $[13] = altOpenOrigin;
    $[14] = byGroup;
    $[15] = byState;
    $[16] = canMention;
    $[17] = debugOpen;
    $[18] = focused;
    $[19] = focusedIsPending;
    $[20] = focusedRow;
    $[21] = footer;
    $[22] = groupsEnabled;
    $[23] = helpOpen;
    $[24] = previewOpen;
    $[25] = rows;
    $[26] = showRemoteTabs;
    $[27] = simpleView;
    $[28] = bottomArea;
  } else bottomArea = $[28];
  let autoUpdater;
  if ($[29] !== isUpdating || $[30] !== showSuccessMessage) {
    autoUpdater = jsxProd_default(AutoUpdaterWrapper, {
      isUpdating,
      onChangeIsUpdating: setIsUpdating,
      showSuccessMessage,
      verbose: false,
    });
    $[29] = isUpdating;
    $[30] = showSuccessMessage;
    $[31] = autoUpdater;
  } else autoUpdater = $[31];
  let peekOverlay;
  if (
    $[32] !== attach ||
    $[33] !== awayLoop ||
    $[34] !== editor ||
    $[35] !== focused ||
    $[36] !== childRows_2 ||
    $[37] !== focusedIsPending ||
    $[38] !== groupEdit ||
    $[39] !== isTerminalFocused ||
    $[40] !== liveStatus ||
    $[41] !== onStop ||
    $[42] !== openJob ||
    $[43] !== pending ||
    $[44] !== previewOpen ||
    $[45] !== jobId ||
    $[46] !== storeSelector ||
    $[47] !== roster ||
    $[48] !== storageV5 ||
    $[49] !== view
  ) {
    peekOverlay =
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
            status: liveStatus(focused),
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
              openJob(focused);
              view.setPreviewOpen(false);
            },
            childRows: childRows_2,
            onReply: (replyText) =>
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
                replyText,
              ),
            onRefreshCloudRows: undefined,
            isTerminalFocused,
          },
          focused.id,
        ),
      });
    $[32] = attach;
    $[33] = awayLoop;
    $[34] = editor;
    $[35] = focused;
    $[36] = childRows_2;
    $[37] = focusedIsPending;
    $[38] = groupEdit;
    $[39] = isTerminalFocused;
    $[40] = liveStatus;
    $[41] = onStop;
    $[42] = openJob;
    $[43] = pending;
    $[44] = previewOpen;
    $[45] = jobId;
    $[46] = storeSelector;
    $[47] = roster;
    $[48] = storageV5;
    $[49] = view;
    $[50] = peekOverlay;
  } else peekOverlay = $[50];
  let body;
  if (
    $[51] !== resumePickerOverlay_2 ||
    $[52] !== settingPickerOverlay_2 ||
    $[53] !== bottomArea ||
    $[54] !== autoUpdater ||
    $[55] !== peekOverlay
  ) {
    body = jsxProd_default_2(Fragment, {
      children: [bottomArea, autoUpdater, resumePickerOverlay_2, settingPickerOverlay_2, peekOverlay],
    });
    $[51] = resumePickerOverlay_2;
    $[52] = settingPickerOverlay_2;
    $[53] = bottomArea;
    $[54] = autoUpdater;
    $[55] = peekOverlay;
    $[56] = body;
  } else body = $[56];
  return body;
}
//@ chunk-avy0g5d4.js:148969-148973 placement
init_react_production();
//@ chunk-avy0g5d4.js:148973-149010 placement
function selectVoiceState_2(appState) {
  return appState.voiceState;
}
//@ chunk-avy0g5d4.js:149010-149051 placement
function selectVoiceWarmingUp_2(appState) {
  return appState.voiceWarmingUp;
}
//@ chunk-avy0g5d4.js:149051-152379 placement
/**
 * Agents 视图搜索/派发输入框（高亮、语音、建议列表）。
 */
function FleetSearchInput(props) {
  let $ = useMemoCache(47);
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
  let introText;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    introText = jsxProd_default(Text, {
      dimColor: true,
      children:
        "A different way to work with Claude: hand off a bigger task than you would chat through, and Claude organizes it in the sections above so you know when it needs you.",
    });
    $[0] = introText;
  } else introText = $[0];
  let children = introText;
  const fleetBindings = useFleetBindings();
  let groupHint;
  if ($[1] !== fleetBindings) {
    groupHint = shortcutDisplayFor("agents:setGroup", fleetBindings);
    $[1] = fleetBindings;
    $[2] = groupHint;
  } else groupHint = $[2];
  let groupHint_2 = groupHint;
  let noGroupsNotice;
  if (
    $[3] !== byGroup ||
    $[4] !== filtered ||
    $[5] !== hasGroups ||
    $[6] !== query ||
    $[7] !== groupHint_2 ||
    $[8] !== simpleView
  ) {
    noGroupsNotice =
      !simpleView && byGroup && !hasGroups && filtered.length > 0 && !query && groupHint_2 !== ""
        ? jsxProd_default_2(Text, {
            dimColor: true,
            children: ["No groups yet \u2014 press ", groupHint_2, " on a session to tag it."],
          })
        : null;
    $[3] = byGroup;
    $[4] = filtered;
    $[5] = hasGroups;
    $[6] = query;
    $[7] = groupHint_2;
    $[8] = simpleView;
    $[9] = noGroupsNotice;
  } else noGroupsNotice = $[9];
  let noGroupsNotice_2 = noGroupsNotice;
  let toastBox;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    toastBox = jsxProd_default(Box, {
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
    $[10] = toastBox;
  } else toastBox = $[10];
  let cloudNotice;
  if ($[11] !== cloudListNotice) {
    cloudNotice =
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
    $[11] = cloudListNotice;
    $[12] = cloudNotice;
  } else cloudNotice = $[12];
  let introBox;
  if ($[13] !== activeTab || $[14] !== onlyOrigin || $[15] !== query || $[16] !== simpleView) {
    introBox =
      onlyOrigin &&
      activeTab !== "remote" &&
      !query &&
      !simpleView &&
      jsxProd_default(Box, {
        paddingLeft: 1,
        marginBottom: 1,
        children,
      });
    $[13] = activeTab;
    $[14] = onlyOrigin;
    $[15] = query;
    $[16] = simpleView;
    $[17] = introBox;
  } else introBox = $[17];
  let noGroupsBox;
  if ($[18] !== noGroupsNotice_2) {
    noGroupsBox =
      noGroupsNotice_2 &&
      jsxProd_default(Box, {
        paddingLeft: 1,
        marginBottom: 1,
        children: noGroupsNotice_2,
      });
    $[18] = noGroupsNotice_2;
    $[19] = noGroupsBox;
  } else noGroupsBox = $[19];
  let searchBox;
  if (
    $[20] !== columns ||
    $[21] !== cursorOffset ||
    $[22] !== mode ||
    $[23] !== groupEdit ||
    $[24] !== hasDispatch ||
    $[25] !== highlights ||
    $[26] !== isBashDispatch ||
    $[27] !== isTerminalFocused ||
    $[28] !== onCursorOffsetChange ||
    $[29] !== previewOpen ||
    $[30] !== query ||
    $[31] !== queryIsFilter ||
    $[32] !== jobId ||
    $[33] !== resumePicker ||
    $[34] !== settingPicker ||
    $[35] !== simpleView ||
    $[36] !== voice ||
    $[37] !== voiceAvailable ||
    $[38] !== appState ||
    $[39] !== appState_2
  ) {
    searchBox = simpleView
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
    $[20] = columns;
    $[21] = cursorOffset;
    $[22] = mode;
    $[23] = groupEdit;
    $[24] = hasDispatch;
    $[25] = highlights;
    $[26] = isBashDispatch;
    $[27] = isTerminalFocused;
    $[28] = onCursorOffsetChange;
    $[29] = previewOpen;
    $[30] = query;
    $[31] = queryIsFilter;
    $[32] = jobId;
    $[33] = resumePicker;
    $[34] = settingPicker;
    $[35] = simpleView;
    $[36] = voice;
    $[37] = voiceAvailable;
    $[38] = appState;
    $[39] = appState_2;
    $[40] = searchBox;
  } else searchBox = $[40];
  let inputArea;
  if (
    $[41] !== suggestionList ||
    $[42] !== cloudNotice ||
    $[43] !== introBox ||
    $[44] !== noGroupsBox ||
    $[45] !== searchBox
  ) {
    inputArea = jsxProd_default_2(Box, {
      flexShrink: 0,
      flexDirection: "column",
      marginTop: 1,
      children: [toastBox, cloudNotice, introBox, noGroupsBox, suggestionList, null, searchBox],
    });
    $[41] = suggestionList;
    $[42] = cloudNotice;
    $[43] = introBox;
    $[44] = noGroupsBox;
    $[45] = searchBox;
    $[46] = inputArea;
  } else inputArea = $[46];
  return inputArea;
}
//@ chunk-avy0g5d4.js:152379-153598 placement
/**
 * 派发模式提示行。
 */
function DispatchModeLine(props) {
  let $ = useMemoCache(30);
  let { editor, selection, query, dispatchMode, collapsed, canonicalLauncherCwd, storageV5 } = props;
  let persistDraft;
  if ($[0] !== canonicalLauncherCwd || $[1] !== editor || $[2] !== selection || $[3] !== storageV5) {
    persistDraft = () => persistFleetDraft(editor, selection, canonicalLauncherCwd, storageV5);
    $[0] = canonicalLauncherCwd;
    $[1] = editor;
    $[2] = selection;
    $[3] = storageV5;
    $[4] = persistDraft;
  } else persistDraft = $[4];
  let debounceDeps;
  if (
    $[5] !== canonicalLauncherCwd ||
    $[6] !== collapsed ||
    $[7] !== dispatchMode ||
    $[8] !== query ||
    $[9] !== storageV5
  ) {
    debounceDeps = [query, dispatchMode, collapsed, canonicalLauncherCwd, storageV5];
    $[5] = canonicalLauncherCwd;
    $[6] = collapsed;
    $[7] = dispatchMode;
    $[8] = query;
    $[9] = storageV5;
    $[10] = debounceDeps;
  } else debounceDeps = $[10];
  useTimeout(persistDraft, 300, debounceDeps);
  let persistNow;
  if ($[11] !== canonicalLauncherCwd || $[12] !== editor || $[13] !== selection || $[14] !== storageV5) {
    persistNow = () => persistFleetDraft(editor, selection, canonicalLauncherCwd, storageV5);
    $[11] = canonicalLauncherCwd;
    $[12] = editor;
    $[13] = selection;
    $[14] = storageV5;
    $[15] = persistNow;
  } else persistNow = $[15];
  let stablePersist = useEffectEvent(persistNow);
  let cleanupEffect;
  if ($[16] !== stablePersist) {
    cleanupEffect = () => () => stablePersist();
    $[16] = stablePersist;
    $[17] = cleanupEffect;
  } else cleanupEffect = $[17];
  let cleanupDeps;
  if ($[18] === MEMO_CACHE_SENTINEL) {
    cleanupDeps = [];
    $[18] = cleanupDeps;
  } else cleanupDeps = $[18];
  useEffect(cleanupEffect, cleanupDeps);
  let flushedRef = useRef(false);
  let flushEffect;
  let flushDeps;
  if ($[19] !== canonicalLauncherCwd || $[20] !== editor || $[21] !== selection || $[22] !== storageV5) {
    flushEffect = () =>
      isStorageV5Enabled() && storageV5 !== undefined
        ? registerPreExitFlush(async () => {
            let diskDraft = editor.draftForDisk();
            let collapsedKeys = [...selection.getSnapshot().collapsed];
            flushedRef.current =
              diskDraft || collapsedKeys.length
                ? await writeJobDraft(
                    canonicalLauncherCwd,
                    {
                      q: diskDraft,
                      collapsed: collapsedKeys,
                    },
                    storageV5,
                  )
                : true;
          })
        : undefined;
    flushDeps = [canonicalLauncherCwd, editor, selection, storageV5];
    $[19] = canonicalLauncherCwd;
    $[20] = editor;
    $[21] = selection;
    $[22] = storageV5;
    $[23] = flushEffect;
    $[24] = flushDeps;
  } else {
    flushEffect = $[23];
    flushDeps = $[24];
  }
  useEffect(flushEffect, flushDeps);
  let exitFlushEffect;
  let exitFlushDeps;
  if ($[25] !== canonicalLauncherCwd || $[26] !== editor || $[27] !== selection) {
    exitFlushEffect = () =>
      onExit(() => {
        if (flushedRef.current) {
          return;
        }
        let diskDraft = editor.draftForDisk();
        let collapsedKeys = [...selection.getSnapshot().collapsed];
        if (diskDraft || collapsedKeys.length)
          writeDraftBestEffort(canonicalLauncherCwd, {
            q: diskDraft,
            collapsed: collapsedKeys,
          });
      });
    exitFlushDeps = [canonicalLauncherCwd, editor, selection];
    $[25] = canonicalLauncherCwd;
    $[26] = editor;
    $[27] = selection;
    $[28] = exitFlushEffect;
    $[29] = exitFlushDeps;
  } else {
    exitFlushEffect = $[28];
    exitFlushDeps = $[29];
  }
  useEffect(exitFlushEffect, exitFlushDeps);
}
//@ chunk-avy0g5d4.js:153598-153723 placement
/**
 * 保存或清除 Agents 视图的草稿与折叠状态。
 */
function persistFleetDraft(editor, selection, canonicalLauncherCwd, storageV5) {
  let draft = editor.draftForDisk();
  let collapsedKeys = [...selection.getSnapshot().collapsed];
  if (draft || collapsedKeys.length)
    sweepDraft(
      canonicalLauncherCwd,
      {
        q: draft,
        collapsed: collapsedKeys,
      },
      storageV5,
    );
  else deleteJobDraft(canonicalLauncherCwd, storageV5);
}
//@ chunk-avy0g5d4.js:153723-153745 placement
var INITIAL_AWAY_STATE = {
  pending: null,
};
//@ chunk-avy0g5d4.js:153745-154467 placement
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
  constructor(options) {
    this.#i = options.onArm;
  }
  getSnapshot = () => this.#e;
  subscribe = (listener) => this.#n.subscribe(listener);
  attachView() {
    this.#l++;
    let detached = false;
    return () => {
      if (detached) return;
      detached = true;
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
  arm(id, backend, justKilled = false, group, sortKey) {
    this.#u({
      id,
      justKilled,
      group,
      sortKey,
      backend,
    });
  }
  armHeader(id) {
    this.#u({
      id,
      justKilled: false,
      backend: null,
    });
  }
  #u(entry) {
    this.#i();
    this.#r.delete(entry.id);
    this.#e = {
      pending: entry,
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
  isDismissed(jobId) {
    return this.#r.has(jobId);
  }
}
//@ chunk-avy0g5d4.js:154467-154519 placement
function ensureDeleteConfirmStore(visit, options) {
  return (visit.deleteConfirm ??= new AwayLoopStore(options));
}
//@ chunk-avy0g5d4.js:154519-154725 placement
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
//@ chunk-avy0g5d4.js:154725-154940 placement
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
//@ chunk-avy0g5d4.js:154940-157218 placement
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
  #u = 0;
  #s = null;
  #a = new Set();
  constructor(options) {
    this.#e = {
      groupMode: options.groupMode,
      activeTab: options.activeTab ?? "local",
      ...createInitialFleetViewOverlays(),
    };
  }
  getSnapshot = () => this.#e;
  subscribe = (listener) => this.#n.subscribe(listener);
  #o(patch) {
    let previous = this.#e;
    let next = {
      ...previous,
      ...patch,
    };
    if (FLEET_VIEW_SNAPSHOT_KEYS.every((key) => Object.is(next[key], previous[key]))) return;
    this.#e = next;
    this.#n.emit();
  }
  attachView(view) {
    this.#l++;
    this.restrictGroupMode(view.groupsEnabled);
    let detached = false;
    return () => {
      if (detached) return;
      detached = true;
      this.#l--;
      if (this.#l === 0) {
        this.#t++;
        this.#i = null;
        this.#u = 0;
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
  restrictGroupMode(groupsEnabled) {
    if (!groupsEnabled && this.#e.groupMode === "group")
      this.#o({
        groupMode: "state",
      });
  }
  vouchForLink(linkId) {
    this.#r = linkId;
  }
  takeVouchedLink(linkId) {
    let matches = this.#r === linkId;
    this.#r = null;
    return matches;
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
    let generation = ++this.#t;
    this.#o({
      resumePicker: {
        entries: null,
        failed: false,
      },
      resumePickerIdx: 0,
    });
    return generation;
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
  set resumePromoteSessionId(sessionId) {
    this.#i = sessionId;
  }
  refuseResumePick(timestamp) {
    this.#u = timestamp;
    this.closeResumePicker();
  }
  get resumePickerRefusedAt() {
    return this.#u;
  }
  clearResumePickerRefusal() {
    this.#u = 0;
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
  schedulePeekTap(schedule, callback) {
    this.cancelPeekTap();
    this.#s = schedule(() => {
      this.#s = null;
      callback();
    });
  }
  cancelPeekTap() {
    if (this.#s === null) return;
    let cancel = this.#s;
    this.#s = null;
    cancel();
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
  firstImpression(label) {
    if (this.#a.has(label)) return false;
    this.#a.add(label);
    return true;
  }
}
//@ chunk-avy0g5d4.js:157218-157372 placement
/**
 * 取或创建 FleetViewStore，分组模式取全局配置。
 */
function ensureFleetViewStore(visit, groupsEnabled, activeTab) {
  if (visit.view) return visit.view;
  let fleetViewGroupMode = getGlobalConfig().fleetViewGroupMode ?? "state";
  return (visit.view = new FleetViewStore({
    groupMode: fleetViewGroupMode === "group" && !groupsEnabled ? "state" : fleetViewGroupMode,
    activeTab,
  }));
}
//@ chunk-avy0g5d4.js:157372-157660 placement
/**
 * 退出 Agents 视图时的动作：直接退出、等待启动、提示或回到来源会话。
 */
function resolveExitAction(ctx) {
  if (ctx.originJobId === undefined)
    return {
      kind: "exit",
    };
  if (ctx.originSpawn !== undefined && !ctx.originSpawn.settled)
    return {
      kind: "wait-starting",
    };
  if (ctx.originSpawn !== undefined && !ctx.originSpawn.ok)
    return {
      kind: "exit-with-hint",
    };
  return ctx.originRowPresent
    ? {
        kind: "attach-origin",
      }
    : {
        kind: "exit-with-hint",
      };
}
//@ chunk-avy0g5d4.js:157660-157729 placement
var RENAME_SAVE_WAIT_MS = 300;
var RENAME_BUSY_TEXT = "Still saving the last rename. Try again in a moment.";
//@ chunk-avy0g5d4.js:157729-159004 placement
/**
 * 提交会话重命名。
 */
function submitRename(ctx) {
  let { roster, editor, view, storageV5 } = ctx.submit;
  let { simpleView, readRenameDraft, clearRename } = ctx;
  let { setError, setHint } = editor;
  let renaming = view.getSnapshot().renaming;
  let jobId = renaming?.jobId;
  let sock = renaming?.sock ?? null;
  let trimmed = readRenameDraft().trim();
  clearRename();
  if (!jobId || !trimmed) return;
  if (sock) {
    roster.updateAdoptedPeers((peers) =>
      peers.map((peer) =>
        peer.id !== jobId
          ? peer
          : {
              ...peer,
              state: {
                ...peer.state,
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
        roster.updateAdoptedPeers((peers) =>
          peers.map((peer) =>
            peer.id === jobId && peer.state.name === trimmed
              ? {
                  ...peer,
                  state: {
                    ...peer.state,
                    updatedAt: new Date(0).toISOString(),
                  },
                }
              : peer,
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
  roster.updateJobs((jobs) =>
    jobs
      ? jobs.map((job) =>
          job.id === jobId
            ? {
                ...job,
                state: {
                  ...job.state,
                  name: trimmed,
                },
              }
            : job,
        )
      : jobs,
  );
  syncJobName(jobId, trimmed, "user", storageV5).then((ok) => {
    if (ok) {
      logFeatureOk("fleet_view_rename_job");
      return;
    }
    setError("Couldn't rename \u2014 the job may have been removed or its state file is unwritable.");
    logFeatureBad("fleet_view_rename_job", "sync_name_failed");
    roster.updateJobs((jobs) =>
      jobs
        ? jobs.map((job) =>
            job.id === jobId && job.state.name === trimmed
              ? {
                  ...job,
                  state: {
                    ...job.state,
                    name: undefined,
                  },
                }
              : job,
          )
        : jobs,
    );
  });
}
//@ chunk-avy0g5d4.js:159004-160219 placement
/**
 * 提交会话分组编辑。
 */
function submitGroupEdit(ctx) {
  let { roster, selection, editor, view, storageV5 } = ctx.submit;
  let { groupSuggestions, readGroupDraft, clearGroupEdit, ck } = ctx;
  let setError = editor.setError;
  let { groupEdit, groupPickIdx } = view.getSnapshot();
  if (!groupEdit) {
    clearGroupEdit();
    return;
  }
  let pickedSuggestion =
    groupEdit.kind === "assign" && groupPickIdx >= 0 ? groupSuggestions[groupPickIdx] : undefined;
  let nextGroup = sanitizeGroupName(pickedSuggestion ?? readGroupDraft()) || undefined;
  if (nextGroup && isReservedGroupName(nextGroup)) return;
  if (groupEdit.kind === "assign") {
    let found = renderListResultMessage(roster).find((job) => job.id === groupEdit.jobId);
    let group = found?.state.group;
    clearGroupEdit();
    if (nextGroup !== group) setJobGroup(ctx, groupEdit.jobId, nextGroup, false);
    return;
  }
  let from = groupEdit.from;
  if (!nextGroup || nextGroup === from) {
    clearGroupEdit();
    return;
  }
  if (renderListResultMessage(roster).some((job) => job.state.group === nextGroup)) return;
  clearGroupEdit();
  let mapped = (roster.jobs ?? [])
    .filter((job) => job.state.group === from && job.state.backend === "daemon")
    .map((jobId) => jobId.id);
  selection.followOrigin = nextGroup;
  selection.followId = null;
  roster.bumpGen();
  selection.renameCollapsedKey(ck(from, "group"), ck(nextGroup, "group"));
  roster.updateJobs((jobs) =>
    jobs
      ? jobs.map((job) =>
          job.state.group === from
            ? {
                ...job,
                state: {
                  ...job.state,
                  group: nextGroup,
                },
              }
            : job,
        )
      : jobs,
  );
  let hasRemoteRows = false;
  let regroupPromise = hasRemoteRows ? roster.regroupRemoteRows(from, nextGroup) : Promise.resolve(true);
  let mapped_2 = mapped.map(roster.holdJob);
  Promise.all([
    regroupPromise,
    ...mapped.map((jobId) => writeJobGroup(getJobDir(jobId), nextGroup, storageV5)),
  ])
    .then(([ok]) => {
      if (ok) logFeatureOk("fleet_view_group_rename");
      else logFleetActionFailure(setError, "fleet_view_group_rename");
    })
    .catch((error) => {
      logError(error);
      setError(`Couldn't rename group \u2014 ${errorMessage(error)}`);
      logFeatureBad("fleet_view_group_rename", "write_group_failed");
      roster.reload();
      if (hasRemoteRows) roster.regroupRemoteRows(nextGroup, from);
    })
    .finally(() => {
      for (let releaseHold of mapped_2) releaseHold();
    });
}
//@ chunk-avy0g5d4.js:160219-161387 placement
/**
 * 停止或删除会话（非 daemon 会话拒绝），带二次确认。
 */
function stopOrDeleteJob(ctx, key, job, bulk = false) {
  let { roster, editor } = ctx.submit;
  let { deleteConfirm, actions, groupOf, simpleView } = ctx;
  let setError = editor.setError;
  if (!job) return;
  if (job.state.backend !== "daemon") {
    setError("Can't stop or delete \u2014 this session is running in another terminal");
    return;
  }
  let band = jobTempo(job.state);
  let found = actions.find((action) => action.key === key && action.bands.includes(band));
  if (!found) return;
  let reportFailure = (label, error) => {
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
  if (key === "x" && !bulk && deleteConfirm.pending?.id !== job.id) {
    let found_2 = actions.find((action) => action.label === "stop");
    let group = groupOf.get(job.id);
    let sortKey = jobSortKey_2(job.state, group);
    let generation = deleteConfirm.generation;
    deleteConfirm.arm(job.id, job.state.backend, found.label === "stop", group, sortKey);
    let shouldRunNow = !(simpleView && isSettled(job.state));
    if (found_2 && shouldRunNow)
      Promise.resolve(
        found_2.run(job, {
          bulk,
        }),
      ).catch((error) => {
        if (
          deleteConfirm.generation === generation &&
          !roster.isDeleting(job.id) &&
          roster.jobs?.some((job_2) => job_2.id === job.id) &&
          (deleteConfirm.pending === null || deleteConfirm.pending.id === job.id) &&
          !deleteConfirm.isDismissed(job.id)
        )
          deleteConfirm.arm(job.id, job.state.backend, false, group, sortKey);
        reportFailure(found_2.label, error);
      });
    return;
  }
  deleteConfirm.disarm();
  let action = key === "x" ? (actions.find((action) => action.label === "delete") ?? found) : found;
  Promise.resolve(
    action.run(job, {
      bulk,
    }),
  ).then(
    (failure) => {
      if (failure) setError(failure);
    },
    (error) => reportFailure(action.label, error),
  );
}
//@ chunk-avy0g5d4.js:161387-161674 placement
/**
 * 按方向找下一个可聚焦的行（跳过标题或非会话行）。
 */
function nextFocusableRow(ctx, focusedIdx, delta) {
  let { rows, hasComposedDispatch, byState, dispatchRepoCwd, previewOpen } = ctx;
  let rowCount = rows.length;
  if (rowCount === 0) return 0;
  if (hasComposedDispatch && (byState || dispatchRepoCwd)) return focusedIdx;
  let isSkippable = hasComposedDispatch
    ? (row) => row?.kind !== "header" || row.group === "pinned"
    : previewOpen
      ? (row) => row?.kind !== "job"
      : null;
  let nextIdx = (focusedIdx + delta + rowCount) % rowCount;
  if (isSkippable)
    while (nextIdx !== focusedIdx && isSkippable(rows[nextIdx]))
      nextIdx = (nextIdx + delta + rowCount) % rowCount;
  return nextIdx;
}
//@ chunk-avy0g5d4.js:161674-161988 placement
/**
 * 处理跳到上/下一个分组的快捷键。
 */
function jumpGroupHeader(ctx, fleetKeyAction, focusedIdx) {
  if (fleetKeyAction !== "agents:nextGroup" && fleetKeyAction !== "agents:previousGroup") return null;
  let { rows, hasComposedDispatch, previewOpen } = ctx;
  if (
    ctx.submit.suggestions.length > 0 ||
    previewOpen ||
    hasComposedDispatch ||
    !rows.some((row) => row.kind === "header")
  )
    return null;
  let step = fleetKeyAction === "agents:nextGroup" ? 1 : -1;
  let index = focusedIdx + step;
  while (rows[index] && rows[index]?.kind !== "header") index += step;
  return rows[index] ? index : focusedIdx;
}
//@ chunk-avy0g5d4.js:161988-162712 placement
/**
 * 设置会话分组（新建/加入/取消分组）并上报。
 */
function setJobGroup(ctx, jobId, group, isRemote) {
  let { roster, selection, editor, storageV5 } = ctx.submit;
  let { ck } = ctx;
  let setError = editor.setError;
  let isNewGroup =
    group !== undefined &&
    !renderListResultMessage(roster).some((job) => job.id !== jobId && job.state.group === group);
  let featureKey =
    group === undefined
      ? "fleet_view_group_ungroup"
      : isNewGroup
        ? "fleet_view_group_create"
        : "fleet_view_group_assign";
  selection.followId = isRemote
    ? (roster.getSnapshot().remoteJobs.find((remoteJob) => remoteRowIdOf(remoteJob) === jobId)?.id ?? jobId)
    : jobId;
  if (isRemote) {
    selection.uncollapse(ck(group ?? UNGROUPED, "group"));
    roster
      .markRemoteRow(jobId, (mark) => ({
        ...mark,
        group,
      }))
      .then((saved) => {
        if (saved) logFeatureOk(featureKey);
        else logFleetActionFailure(setError, featureKey);
      });
    return;
  }
  roster.bumpGen();
  roster.updateJobs((jobs) =>
    jobs
      ? jobs.map((job) =>
          job.id === jobId
            ? {
                ...job,
                state: {
                  ...job.state,
                  group,
                },
              }
            : job,
        )
      : jobs,
  );
  selection.uncollapse(ck(group ?? UNGROUPED, "group"));
  let releaseHold = roster.holdJob(jobId);
  writeJobGroup(getJobDir(jobId), group, storageV5)
    .then(() => {
      logFeatureOk(featureKey);
    })
    .catch((error) => {
      logError(error);
      setError(`Couldn't set group \u2014 ${errorMessage(error)}`);
      logFeatureBad(featureKey, "write_group_failed");
      roster.reload();
    })
    .finally(releaseHold);
}
//@ chunk-avy0g5d4.js:162712-163416 placement
/**
 * 停止某分组内所有 daemon 会话。
 */
function stopGroup(ctx, group) {
  let { roster, selection, editor, storageV5 } = ctx.submit;
  let { ck } = ctx;
  let setError = editor.setError;
  let mapped = (roster.jobs ?? [])
    .filter((job) => job.state.group === group && job.state.backend === "daemon")
    .map((jobId) => jobId.id);
  selection.followOrigin = UNGROUPED;
  selection.followId = null;
  roster.bumpGen();
  selection.uncollapse(ck(group, "group"), ck(UNGROUPED, "group"));
  roster.updateJobs((jobs) =>
    jobs
      ? jobs.map((job) =>
          job.state.group === group
            ? {
                ...job,
                state: {
                  ...job.state,
                  group: undefined,
                },
              }
            : job,
        )
      : jobs,
  );
  let resolved = Promise.resolve(true);
  let mapped_2 = mapped.map(roster.holdJob);
  Promise.all([resolved, ...mapped.map((jobId) => writeJobGroup(getJobDir(jobId), undefined, storageV5))])
    .then(([ok]) => {
      if (ok) logFeatureOk("fleet_view_group_delete");
      else logFleetActionFailure(setError, "fleet_view_group_delete");
    })
    .catch((error) => {
      logError(error);
      setError(`Couldn't remove group \u2014 ${errorMessage(error)}`);
      logFeatureBad("fleet_view_group_delete", "write_group_failed");
      roster.reload();
    })
    .finally(() => {
      for (let releaseHold of mapped_2) releaseHold();
    });
}
//@ chunk-avy0g5d4.js:163416-163434 placement
function logFleetActionFailure(setError, featureKey) {}
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
