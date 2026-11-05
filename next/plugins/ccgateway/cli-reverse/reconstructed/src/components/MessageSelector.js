/**
 * components/MessageSelector.tsx
 *
 * 回退（Rewind）消息选择器：列出可选用户消息，提供"恢复代码和对话/仅对话/仅代码/从此处总结"等选项及 diff 统计。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/MessageSelector.tsx
 * pieces: chunk-c7hntn0y.js (1), chunk-czq1j3j2.js (15)
 * attribution: fingerprint 8, affinity 1, layout 3, file-local 1, placement 3
 */
import { randomUUID } from "crypto";
import * as pathModule from "path";
import {
  TURN_DIFF_COUNTING_MS,
  fileHistoryEnabled,
  fileHistoryGetDiffStats,
  RewindNoFilesRestoredError,
  fileHistoryCanRestore,
  fileHistoryGetTurnDiffStats,
  fileHistoryRewind,
  reduceFileHistoryState,
} from "../utils/fileHistory.js";
import { useAppState, useAppStoreDirect, useSetAppState } from "../state/AppState.js";
import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "../../vendor/react/cjs/react.production.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import {
  createUserMessage,
  isRealUserPromptMessage,
  REWIND_UNSAFE_PATH_REASON,
  RESTORE_FILES_CAVEAT,
  getUserMessageText,
  isEmptyMessageText,
  isSyntheticMessage,
  isToolUseResultMessage,
  parseQueuedCommandAttachment,
} from "../utils/messages.js";
import { logEvent } from "../services/analytics/index.js";
import { errorMessage } from "../utils/errors.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { CompactionError } from "../services/compact/compact.js";
import { logError } from "../utils/log.js";
import { logForDebugging } from "../utils/debug.js";
import { useGlobalExitKeybindings } from "../keybindings/useKeybinding.js";
import { useRegisterKeybindingContext } from "../keybindings/KeybindingContext.js";
import { stableEmptyObject } from "../utils/stableEmptyObject.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { Dialog } from "./design-system/Dialog.js";
import { ErrorText } from "./ErrorText.js";
import { HintText } from "./design-system/HintText.js";
import { formatRelativeTimeAgo, truncate } from "../utils/format.js";
import { Spinner } from "./Spinner.js";
import { PromptDialog } from "./hooks/PromptDialog.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { merged, isMenuOpen } from "./CustomSelect/select.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../runtime/bun-runtime.js";
import { DiffStatCounts } from "./PrBadge.js";
import { textOrReminderWrapped } from "../utils/systemReminder.js";
import {
  findLastCommandMessage,
  isUsableCommandMessage,
  extractBashInput,
} from "../utils/messages/apiNormalization.js";
import { truncateToLength } from "../utils/stringUtils.js";
import { isHumanTurn } from "../utils/turnOrigin.js";
import { hasCronToolUse } from "../cli/print/rateLimitForwarding.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { useSession } from "../context/session.js";
import { transcriptMessagesStore } from "../screens/repl/ReplEffects.js";
import { mainAgentId, getParentSessionId } from "../bootstrap/state.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import { getLastSessionLog } from "../utils/conversationRecovery.js";

//@ chunk-c7hntn0y.js:37056-37219 fingerprint (2.1.88 match: DiffStatsText, 0.641)
function diffStat(theme, added, removed) {
  let { Text } = theme.ui;
  let hasBoth = added > 0 && removed > 0;
  return h(
    Text,
    null,
    added > 0
      ? h(
          Text,
          {
            color: "diffAddedWord",
          },
          `+${added}`,
        )
      : "",
    hasBoth ? " " : "",
    removed > 0
      ? h(
          Text,
          {
            color: "diffRemovedWord",
          },
          `-${removed}`,
        )
      : "",
  );
}
//@ chunk-czq1j3j2.js:323071-323096 affinity
class ConversationRestoreError extends Error {}
//@ chunk-czq1j3j2.js:323096-323157 fingerprint (2.1.88 match: isSummarizeOption, 1)
function isSummarizeOption(option) {
  return option === "summarize" || option === "summarize_up_to";
}
//@ chunk-czq1j3j2.js:323157-323190 layout
var REWIND = "Rewind";
var CURRENT_ITEM_LABEL = "(current)";
//@ chunk-czq1j3j2.js:323190-329812 fingerprint (2.1.88 match: MessageSelector, 0.642)
function MessageSelector({
  messages,
  onPreRestore,
  onRestoreMessage,
  onRestoreCode,
  onSummarize,
  onClose,
  preselectedMessage,
  onResumePreviousSession,
  parentSessionId,
  confirmDescription,
  restoreWait,
  rowCountingMs = TURN_DIFF_COUNTING_MS,
}) {
  let fileHistory = useAppState((persistedState) => persistedState.fileHistory);
  let [error, setError] = useState(undefined);
  let [dismissError, setDismissError] = useState(false);
  let isFileHistoryEnabled = fileHistoryEnabled();
  let { rows } = useTerminalSize();
  let visibleRows = useIsFullscreen() ? Math.floor(rows / 2) : rows;
  let rowsPerItem = isFileHistoryEnabled ? 3 : 2;
  let chromeRows = 12;
  let max = Math.max(2, Math.floor((visibleRows - 12) / rowsPerItem));
  let currentUUID = useMemo(randomUUID, []);
  let messageOptions = useMemo(randomUUID, []);
  let canResumePrevious = !!onResumePreviousSession;
  let allMessages = useMemo(
    () => [
      ...(canResumePrevious
        ? [
            {
              ...createUserMessage({
                content: "",
              }),
              uuid: messageOptions,
            },
          ]
        : []),
      ...messages.filter(isRealUserPromptMessage),
      {
        ...createUserMessage({
          content: "",
        }),
        uuid: currentUUID,
      },
    ],
    [messages, currentUUID, messageOptions, canResumePrevious],
  );
  let hasMultiple = allMessages.length > 1;
  let [focusedIndex, setFocusedIndex] = useState(undefined);
  let [selectedMessage, setSelectedMessage] = useState(preselectedMessage);
  let [confirmText, setConfirmText] = useState(() =>
    preselectedMessage === undefined ? undefined : confirmDescription?.(preselectedMessage),
  );
  let [now, setNow] = useState(() => new Date());
  let [diffStatsForRestore, setDiffStatsForRestore] = useState(undefined);
  useEffect(() => {
    if (!preselectedMessage || !isFileHistoryEnabled) return;
    let cancelled = false;
    fileHistoryGetDiffStats(fileHistory, preselectedMessage.uuid).then((stats) => {
      if (!cancelled) setDiffStatsForRestore(stats);
    });
    return () => {
      cancelled = true;
    };
  }, [preselectedMessage, isFileHistoryEnabled, fileHistory]);
  let [isRestoring, setIsRestoring] = useState(null);
  let isRestoring_2 = isRestoring !== null;
  let [selectedRestoreOption, setSelectedRestoreOption] = useState("both");
  let [summarizeFromFeedback, setSummarizeFromFeedback] = useState("");
  let [summarizeUpToFeedback, setSummarizeUpToFeedback] = useState("");
  function getRestoreOptions(canRestoreCode) {
    let baseOptions = canRestoreCode
      ? [
          {
            value: "both",
            label: "Restore code and conversation",
          },
          {
            value: "conversation",
            label: "Restore conversation",
          },
          {
            value: "code",
            label: "Restore code",
          },
        ]
      : [
          {
            value: "conversation",
            label: "Restore conversation",
          },
        ];
    let summarizeInputProps = {
      type: "input",
      placeholder: "add context (optional)",
      initialValue: "",
      allowEmptySubmitToCancel: true,
      screenReaderEmptySubmit: true,
      showLabelWithValue: true,
      labelValueSeparator: ": ",
    };
    if (onSummarize) {
      baseOptions.push({
        value: "summarize",
        label: "Summarize from here",
        ...summarizeInputProps,
        onChange: setSummarizeFromFeedback,
      });
      baseOptions.push({
        value: "summarize_up_to",
        label: "Summarize up to here",
        ...summarizeInputProps,
        onChange: setSummarizeUpToFeedback,
      });
    }
    baseOptions.push({
      value: "nevermind",
      label: "Never mind",
    });
    return baseOptions;
  }
  useEffect(() => {
    logEvent("tengu_message_selector_opened", {});
  }, []);
  async function restoreConversationDirectly(message) {
    onPreRestore();
    setIsRestoring("conversation");
    try {
      await onRestoreMessage(message);
      setIsRestoring(null);
      onClose();
    } catch (error) {
      logConversationRestoreError(error);
      setIsRestoring(null);
      setError(`Failed to restore the conversation:
${errorMessage(error)}`);
    }
  }
  async function handleSelect(message) {
    if (message.uuid === messageOptions) {
      onPreRestore();
      onClose();
      onResumePreviousSession?.();
      return;
    }
    let index = messages.indexOf(message);
    let indexFromEnd = messages.length - 1 - index;
    logEvent("tengu_message_selector_selected", {
      index_from_end: indexFromEnd,
      message_type: fromEnum(message.type),
      is_current_prompt: false,
    });
    if (!messages.includes(message)) {
      onClose();
      return;
    }
    if (!isFileHistoryEnabled) {
      if (confirmDescription === undefined) {
        await restoreConversationDirectly(message);
        return;
      }
      setNow(new Date());
      setConfirmText(confirmDescription(message));
      setSelectedMessage(message);
      return;
    }
    let diffStats = await fileHistoryGetDiffStats(fileHistory, message.uuid);
    setNow(new Date());
    setConfirmText(confirmDescription?.(message));
    setSelectedMessage(message);
    setDiffStatsForRestore(diffStats);
  }
  async function onSelectRestoreOption(option) {
    logEvent("tengu_message_selector_restore_option_selected", {
      option: fromEnum(option),
    });
    if (!selectedMessage) {
      setError("Message not found.");
      return;
    }
    if (option === "nevermind") {
      if (preselectedMessage) onClose();
      else setSelectedMessage(undefined);
      return;
    }
    if (isSummarizeOption(option) && onSummarize) {
      onPreRestore();
      setIsRestoring(option);
      setError(undefined);
      setDismissError(false);
      try {
        let direction = option === "summarize_up_to" ? "up_to" : "from";
        let feedback =
          (direction === "up_to" ? summarizeUpToFeedback : summarizeFromFeedback).trim() || undefined;
        await onSummarize(selectedMessage, feedback, direction);
        setIsRestoring(null);
        setSelectedMessage(undefined);
        onClose();
      } catch (error) {
        if (!(error instanceof CompactionError)) logError(error);
        setIsRestoring(null);
        setSelectedMessage(undefined);
        setError(`Failed to summarize:
${errorMessage(error)}`);
      }
      return;
    }
    onPreRestore();
    setIsRestoring(option);
    setError(undefined);
    setDismissError(false);
    let codeError = null;
    let conversationError = null;
    let skippedLinks = 0;
    if (option === "code" || option === "both")
      try {
        skippedLinks = (await onRestoreCode(selectedMessage))?.skippedLinks ?? 0;
      } catch (error) {
        codeError = error;
        if (codeError instanceof RewindNoFilesRestoredError)
          logForDebugging(`MessageSelector: rewind failed: ${codeError.message}`, {
            level: "error",
          });
        else logError(codeError);
      }
    if (option === "conversation" || option === "both")
      try {
        await onRestoreMessage(selectedMessage);
      } catch (error) {
        conversationError = error;
        logConversationRestoreError(conversationError);
      }
    setIsRestoring(null);
    setSelectedMessage(undefined);
    let skippedNote =
      skippedLinks > 0
        ? `Restored the code, but skipped ${skippedLinks} ${skippedLinks === 1 ? "file" : "files"}: ${REWIND_UNSAFE_PATH_REASON}. Skipped files were left untouched \u2014 run with --debug for the paths.`
        : undefined;
    if (conversationError && codeError)
      setError(`Failed to restore the conversation and code:
${errorMessage(conversationError)}
${errorMessage(codeError)}`);
    else if (codeError)
      setError(`Failed to restore the code:
${errorMessage(codeError)}`);
    else if (conversationError || skippedNote) {
      setDismissError(!conversationError);
      setError(
        [
          conversationError
            ? `Failed to restore the conversation:
${errorMessage(conversationError)}`
            : undefined,
          skippedNote,
        ].filter(Boolean).join(`

`),
      );
    } else onClose();
  }
  let handleEscape = useCallback(() => {
    if (selectedMessage && !preselectedMessage) {
      setSelectedMessage(undefined);
      return;
    }
    logEvent("tengu_message_selector_cancelled", {});
    onClose();
  }, [onClose, selectedMessage, preselectedMessage]);
  let globalExit = useGlobalExitKeybindings(
    undefined,
    () => {
      if (!isRestoring_2 || restoreWait === undefined) return false;
      restoreWait.onStopWaiting();
      return true;
    },
    !!selectedMessage,
  );
  useRegisterKeybindingContext(
    "MessageSelector",
    !isRestoring_2 && !error && !selectedMessage && hasMultiple,
  );
  let [fileHistoryMetadata, setFileHistoryMetadata] = useState({});
  let pairCounts = useRef(new Map());
  useEffect(() => {
    if (!isFileHistoryEnabled || preselectedMessage) return;
    let abortController = new AbortController();
    async function loadMetadata() {
      let nextMetadata = {};
      let options = {
        pairCounts: pairCounts.current,
        countUntil: performance.now() + rowCountingMs,
        signal: abortController.signal,
      };
      for (let idx = allMessages.length - 1; idx >= 0; idx--) {
        let message = allMessages[idx];
        if (message.uuid === currentUUID || message.uuid === messageOptions) continue;
        if (!fileHistoryCanRestore(fileHistory, message.uuid)) {
          nextMetadata[idx] = undefined;
          continue;
        }
        let nextIdx = idx + 1;
        while (
          nextIdx < allMessages.length - 1 &&
          !fileHistoryCanRestore(fileHistory, allMessages[nextIdx].uuid)
        )
          nextIdx++;
        let nextUserMessage = allMessages.at(nextIdx);
        nextMetadata[idx] = await fileHistoryGetTurnDiffStats(
          fileHistory,
          message.uuid,
          nextUserMessage?.uuid !== currentUUID ? nextUserMessage?.uuid : undefined,
          options,
        );
        if (abortController.signal.aborted) return;
      }
      setFileHistoryMetadata(nextMetadata);
    }
    loadMetadata().catch(logError);
    return () => {
      abortController.abort();
    };
  }, [
    allMessages,
    currentUUID,
    messageOptions,
    fileHistory,
    isFileHistoryEnabled,
    preselectedMessage,
    rowCountingMs,
  ]);
  let canRestoreCode =
    isFileHistoryEnabled && diffStatsForRestore?.filesChanged && diffStatsForRestore.filesChanged.length > 0;
  let showPickList = !error && !selectedMessage && !preselectedMessage && hasMultiple;
  let showConfirm = !error && !!selectedMessage && hasMultiple;
  let pickPrompt = isFileHistoryEnabled
    ? "Restore the code and/or conversation to the point before\u2026"
    : "Restore the conversation to the point before\u2026";
  let isOneParagraph = false;
  let hintFormat = stableEmptyObject(isOneParagraph);
  let description =
    confirmDescription !== undefined &&
    selectedMessage !== undefined &&
    !isSummarizeOption(selectedRestoreOption)
      ? jsxProd_default(Text, {
          dimColor: true,
          children:
            selectedRestoreOption === "nevermind" ? "The conversation will be unchanged." : confirmText,
        })
      : jsxProd_default(RestoreOptionDescription, {
          selectedRestoreOption,
          canRestoreCode: !!canRestoreCode,
          diffStatsForRestore,
          isOneParagraph,
        });
  let showInputGuide = !!selectedMessage && hasMultiple;
  let hints = jsxProd_default_2(Byline, {
    children: [
      !error &&
        hasMultiple &&
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: isOneParagraph && showConfirm ? "confirm" : "continue",
          ...hintFormat,
        }),
      jsxProd_default(KeyboardShortcutHint, {
        chord: "escape",
        action: "cancel",
        ...hintFormat,
      }),
    ],
  });
  return jsxProd_default_2(Dialog, {
    title: isOneParagraph && showConfirm ? REWIND : "Rewind",
    subtitle: isOneParagraph && showPickList ? pickPrompt : undefined,
    color: isOneParagraph && error && !dismissError ? "error" : "suggestion",
    onCancel: handleEscape,
    isCancelActive: !selectedMessage || !hasMultiple,
    hideInputGuide: showInputGuide && !isOneParagraph,
    inputGuide: isOneParagraph
      ? (prev_1) => {
          if (!showInputGuide) return prev_1.pending ? `Press ${prev_1.keyName} again to cancel` : hints;
          if (isRestoring_2) return " ";
          return globalExit.pending ? `Press ${globalExit.keyName} again to exit` : hints;
        }
      : hints,
    children: [
      isOneParagraph && error
        ? jsxProd_default(Text, {
            children: error,
          })
        : jsxProd_default(ErrorText, {
            error,
          }),
      !hasMultiple &&
        jsxProd_default(HintText, {
          children: "Nothing to rewind to yet.",
        }),
      showConfirm &&
        jsxProd_default_2(Fragment, {
          children: [
            isOneParagraph
              ? jsxProd_default(Box, {
                  paddingLeft: 2,
                  children: jsxProd_default(UserMessageOption, {
                    userMessage: selectedMessage,
                    color: "text",
                    isCurrent: false,
                    isRedesign: true,
                    age: formatRelativeTimeAgo(new Date(selectedMessage.timestamp), {
                      now,
                    }),
                  }),
                })
              : jsxProd_default_2(Fragment, {
                  children: [
                    jsxProd_default_2(Text, {
                      children: [
                        "Confirm you want to restore",
                        " ",
                        !diffStatsForRestore && "the conversation ",
                        "to the point before you sent this message:",
                      ],
                    }),
                    jsxProd_default_2(Box, {
                      flexDirection: "column",
                      paddingLeft: 1,
                      borderStyle: "single",
                      borderRight: false,
                      borderTop: false,
                      borderBottom: false,
                      borderLeft: true,
                      borderLeftDimColor: true,
                      children: [
                        jsxProd_default(UserMessageOption, {
                          userMessage: selectedMessage,
                          color: "text",
                          isCurrent: false,
                          isRedesign: false,
                        }),
                        jsxProd_default_2(Text, {
                          dimColor: true,
                          children: [
                            "(",
                            formatRelativeTimeAgo(new Date(selectedMessage.timestamp), {
                              now,
                            }),
                            ")",
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
            isOneParagraph && canRestoreCode
              ? jsxProd_default_2(Box, {
                  flexDirection: "column",
                  children: [
                    description,
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: RESTORE_FILES_CAVEAT,
                    }),
                  ],
                })
              : description,
            isSummarizeOption(isRestoring)
              ? jsxProd_default_2(Box, {
                  flexDirection: "row",
                  gap: 1,
                  children: [
                    jsxProd_default(Spinner, {}),
                    jsxProd_default(Text, {
                      children: "Summarizing\u2026",
                    }),
                  ],
                })
              : isRestoring_2 && restoreWait !== undefined
                ? jsxProd_default(PromptDialog, {
                    message: restoreWait.message,
                    onCancel: restoreWait.onStopWaiting,
                    escAction: "stop waiting",
                  })
                : jsxProd_default(ModelSelector, {
                    isDisabled: isRestoring_2,
                    options: getRestoreOptions(!!canRestoreCode),
                    defaultFocusValue: canRestoreCode ? "both" : "conversation",
                    onFocus: (value) => setSelectedRestoreOption(value),
                    onChange: (value) => onSelectRestoreOption(value),
                    onCancel: () => (preselectedMessage ? onClose() : setSelectedMessage(undefined)),
                  }),
            canRestoreCode &&
              !isOneParagraph &&
              jsxProd_default(Box, {
                marginBottom: 1,
                children: jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [figures_default.warning, " ", RESTORE_FILES_CAVEAT],
                }),
              }),
          ],
        }),
      showPickList &&
        jsxProd_default_2(Fragment, {
          children: [
            !isOneParagraph &&
              jsxProd_default(Text, {
                children: pickPrompt,
              }),
            jsxProd_default(merged, {
              visibleCount: max * rowsPerItem + 2,
              defaultFocusIndex: focusedIndex ?? allMessages.length - 1,
              onFocus: setFocusedIndex,
              isDisabled: isRestoring_2,
              scrollBar: false,
              onSelect: (value_0) => {
                let message = allMessages[value_0];
                if (message) handleSelect(message);
              },
              children: allMessages.map((msg, visibleOptionIndex) =>
                jsxProd_default(
                  merged.Item,
                  {
                    lines: rowsPerItem,
                    children: jsxProd_default(computeDiffStatsBetweenMessages, {
                      message: msg,
                      isCurrent: msg.uuid === currentUUID,
                      isPreClear: msg.uuid === messageOptions,
                      parentSessionId,
                      metadataLoaded: isFileHistoryEnabled && visibleOptionIndex in fileHistoryMetadata,
                      metadata: fileHistoryMetadata[visibleOptionIndex],
                      isRedesign: isOneParagraph,
                    }),
                  },
                  msg.uuid,
                ),
              ),
            }),
          ],
        }),
    ],
  });
}
//@ chunk-czq1j3j2.js:329812-329943 layout
function logConversationRestoreError(error) {
  if (error instanceof ConversationRestoreError) {
    logForDebugging(`MessageSelector: conversation restore not done: ${error.message}`, {
      level: "error",
    });
    return;
  }
  logError(error);
}
//@ chunk-czq1j3j2.js:329943-330376 fingerprint (2.1.88 match: getRestoreOptionConversationText, 0.939)
function getRestoreOptionConversationText(option) {
  switch (option) {
    case "summarize":
      return "Messages after this point will be summarized.";
    case "summarize_up_to":
      return "Preceding messages will be summarized. This and subsequent messages will remain unchanged \u2014 you will stay at the end of the conversation.";
    case "both":
    case "conversation":
      return "This message and everything after it will be removed.";
    case "code":
    case "nevermind":
      return "The conversation will be unchanged.";
  }
}
//@ chunk-czq1j3j2.js:330376-331247 fingerprint (2.1.88 match: RestoreOptionDescription, 0.784)
function RestoreOptionDescription(props) {
  let $ = useMemoCache(17);
  let { selectedRestoreOption, canRestoreCode, diffStatsForRestore, isOneParagraph } = props;
  let showCodeRestore =
    canRestoreCode && (selectedRestoreOption === "both" || selectedRestoreOption === "code");
  let children;
  if ($[0] !== selectedRestoreOption) {
    children = getRestoreOptionConversationText(selectedRestoreOption);
    $[0] = selectedRestoreOption;
    $[1] = children;
  } else children = $[1];
  let conversationTextElement;
  if ($[2] !== children) {
    conversationTextElement = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[2] = children;
    $[3] = conversationTextElement;
  } else conversationTextElement = $[3];
  let conversationTextText = conversationTextElement;
  let codeRestoreElement;
  if ($[4] !== diffStatsForRestore || $[5] !== selectedRestoreOption || $[6] !== showCodeRestore) {
    codeRestoreElement =
      !isSummarizeOption(selectedRestoreOption) &&
      (showCodeRestore
        ? jsxProd_default(RestoreCodeConfirmation, {
            diffStatsForRestore,
          })
        : jsxProd_default(Text, {
            dimColor: true,
            children: "The code will be unchanged.",
          }));
    $[4] = diffStatsForRestore;
    $[5] = selectedRestoreOption;
    $[6] = showCodeRestore;
    $[7] = codeRestoreElement;
  } else codeRestoreElement = $[7];
  let codeRestoreSection = codeRestoreElement;
  if (isOneParagraph) {
    let spacerElement;
    if ($[8] !== codeRestoreSection) {
      spacerElement =
        codeRestoreSection &&
        jsxProd_default(Text, {
          children: " ",
        });
      $[8] = codeRestoreSection;
      $[9] = spacerElement;
    } else spacerElement = $[9];
    let oneLineSummary;
    if ($[10] !== codeRestoreSection || $[11] !== conversationTextText || $[12] !== spacerElement) {
      oneLineSummary = jsxProd_default_2(Text, {
        children: [conversationTextText, spacerElement, codeRestoreSection],
      });
      $[10] = codeRestoreSection;
      $[11] = conversationTextText;
      $[12] = spacerElement;
      $[13] = oneLineSummary;
    } else oneLineSummary = $[13];
    return oneLineSummary;
  }
  let stackedSummary;
  if ($[14] !== codeRestoreSection || $[15] !== conversationTextText) {
    stackedSummary = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [conversationTextText, codeRestoreSection],
    });
    $[14] = codeRestoreSection;
    $[15] = conversationTextText;
    $[16] = stackedSummary;
  } else stackedSummary = $[16];
  return stackedSummary;
}
//@ chunk-czq1j3j2.js:331247-332382 fingerprint (2.1.88 match: RestoreCodeConfirmation, 0.498)
function RestoreCodeConfirmation(props) {
  let $ = useMemoCache(15);
  let { diffStatsForRestore } = props;
  if (diffStatsForRestore === undefined) {
    return;
  }
  if (!diffStatsForRestore.filesChanged || !diffStatsForRestore.filesChanged[0]) {
    let t1;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      t1 = jsxProd_default(Text, {
        dimColor: true,
        children: "The code has not changed (nothing will be restored).",
      });
      $[0] = t1;
    } else t1 = $[0];
    return t1;
  }
  let numFilesChanged = diffStatsForRestore.filesChanged.length;
  let fileLabel;
  if (numFilesChanged === 1) {
    const firstPath = diffStatsForRestore.filesChanged[0] || "";
    let firstLabel;
    if ($[1] !== firstPath) {
      firstLabel = pathModule.basename(firstPath);
      $[1] = firstPath;
      $[2] = firstLabel;
    } else firstLabel = $[2];
    fileLabel = firstLabel;
  } else if (numFilesChanged === 2) {
    const firstPath = diffStatsForRestore.filesChanged[0] || "";
    let firstLabel;
    if ($[3] !== firstPath) {
      firstLabel = pathModule.basename(firstPath);
      $[3] = firstPath;
      $[4] = firstLabel;
    } else firstLabel = $[4];
    let firstFileLabel = firstLabel;
    const secondPath = diffStatsForRestore.filesChanged[1] || "";
    let t2;
    if ($[5] !== secondPath) {
      t2 = pathModule.basename(secondPath);
      $[5] = secondPath;
      $[6] = t2;
    } else t2 = $[6];
    let file2 = t2;
    fileLabel = `${firstFileLabel} and ${file2}`;
  } else {
    const firstPath = diffStatsForRestore.filesChanged[0] || "";
    let firstLabel;
    if ($[7] !== firstPath) {
      firstLabel = pathModule.basename(firstPath);
      $[7] = firstPath;
      $[8] = firstLabel;
    } else firstLabel = $[8];
    fileLabel = `${firstLabel} and ${diffStatsForRestore.filesChanged.length - 1} other files`;
  }
  let diffCountsElement;
  if ($[9] !== diffStatsForRestore.deletions || $[10] !== diffStatsForRestore.insertions) {
    diffCountsElement = jsxProd_default(DiffStatCounts, {
      added: diffStatsForRestore.insertions,
      removed: diffStatsForRestore.deletions,
    });
    $[9] = diffStatsForRestore.deletions;
    $[10] = diffStatsForRestore.insertions;
    $[11] = diffCountsElement;
  } else diffCountsElement = $[11];
  let t2;
  if ($[12] !== fileLabel || $[13] !== diffCountsElement) {
    t2 = jsxProd_default(Fragment, {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: ["The code will be restored", " ", diffCountsElement, " ", "in ", fileLabel, "."],
      }),
    });
    $[12] = fileLabel;
    $[13] = diffCountsElement;
    $[14] = t2;
  } else t2 = $[14];
  return t2;
}
//@ chunk-czq1j3j2.js:332382-333664 file-local
function computeDiffStatsBetweenMessages(props) {
  let $ = useMemoCache(16);
  let { message, isCurrent, isPreClear, parentSessionId, metadataLoaded, metadata, isRedesign } = props;
  let menuOpen = isMenuOpen();
  let filesChangedCount = metadata?.filesChanged && metadata.filesChanged.length;
  let messageLabelElement;
  if (
    $[0] !== isCurrent ||
    $[1] !== isPreClear ||
    $[2] !== isRedesign ||
    $[3] !== menuOpen ||
    $[4] !== message ||
    $[5] !== parentSessionId
  ) {
    messageLabelElement = jsxProd_default(Box, {
      flexShrink: 1,
      height: 1,
      overflow: "hidden",
      children: isPreClear
        ? jsxProd_default(Box, {
            width: "100%",
            children: jsxProd_default_2(Text, {
              color: menuOpen ? "suggestion" : undefined,
              children: ["/resume ", parentSessionId, " (previous session)"],
            }),
          })
        : jsxProd_default(UserMessageOption, {
            userMessage: message,
            color: menuOpen ? "suggestion" : undefined,
            isCurrent,
            isRedesign,
            paddingRight: 10,
          }),
    });
    $[0] = isCurrent;
    $[1] = isPreClear;
    $[2] = isRedesign;
    $[3] = menuOpen;
    $[4] = message;
    $[5] = parentSessionId;
    $[6] = messageLabelElement;
  } else messageLabelElement = $[6];
  let diffSummaryElement;
  if (
    $[7] !== isRedesign ||
    $[8] !== menuOpen ||
    $[9] !== metadata ||
    $[10] !== metadataLoaded ||
    $[11] !== filesChangedCount
  ) {
    diffSummaryElement =
      metadataLoaded &&
      jsxProd_default(Box, {
        height: 1,
        flexDirection: "row",
        children: metadata
          ? jsxProd_default(Text, {
              dimColor: !menuOpen,
              color: "inactive",
              children: filesChangedCount
                ? jsxProd_default_2(Fragment, {
                    children: [
                      filesChangedCount === 1 && metadata.filesChanged[0]
                        ? `${pathModule.basename(metadata.filesChanged[0])} `
                        : `${filesChangedCount} files changed `,
                      jsxProd_default(DiffStatCounts, {
                        added: metadata.insertions,
                        removed: metadata.deletions,
                      }),
                    ],
                  })
                : jsxProd_default(Fragment, {
                    children: "No code changes",
                  }),
            })
          : jsxProd_default(Text, {
              dimColor: true,
              color: isRedesign ? undefined : "warning",
              children: isRedesign ? "No code restore" : `${figures_default.warning} No code restore`,
            }),
      });
    $[7] = isRedesign;
    $[8] = menuOpen;
    $[9] = metadata;
    $[10] = metadataLoaded;
    $[11] = filesChangedCount;
    $[12] = diffSummaryElement;
  } else diffSummaryElement = $[12];
  let rowElement;
  if ($[13] !== messageLabelElement || $[14] !== diffSummaryElement) {
    rowElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [messageLabelElement, diffSummaryElement],
    });
    $[13] = messageLabelElement;
    $[14] = diffSummaryElement;
    $[15] = rowElement;
  } else rowElement = $[15];
  return rowElement;
}
//@ chunk-czq1j3j2.js:333664-336869 fingerprint (2.1.88 match: UserMessageOption, 0.463)
function UserMessageOption(props) {
  let $ = useMemoCache(62);
  let { userMessage, color, dimColor, isCurrent, isRedesign, paddingRight, age } = props;
  let { columns } = useTerminalSize();
  let text;
  if ($[0] !== userMessage) {
    text = textOrReminderWrapped(getUserMessageText(userMessage)?.trim() || "(no prompt)");
    $[0] = userMessage;
    $[1] = text;
  } else text = $[1];
  let text_2 = text;
  if (isCurrent) {
    const children = isRedesign ? CURRENT_ITEM_LABEL : "(current)";
    let currentBox;
    if ($[2] !== color || $[3] !== dimColor || $[4] !== children) {
      currentBox = jsxProd_default(Box, {
        width: "100%",
        children: jsxProd_default(Text, {
          italic: true,
          color,
          dimColor,
          children,
        }),
      });
      $[2] = color;
      $[3] = dimColor;
      $[4] = children;
      $[5] = currentBox;
    } else currentBox = $[5];
    return currentBox;
  }
  if (isEmptyMessageText(text_2)) {
    let emptyText;
    if ($[6] !== color || $[7] !== dimColor) {
      emptyText = jsxProd_default(Text, {
        italic: true,
        color,
        dimColor,
        children: "((empty message))",
      });
      $[6] = color;
      $[7] = dimColor;
      $[8] = emptyText;
    } else emptyText = $[8];
    let ageSuffix;
    if ($[9] !== age) {
      ageSuffix = jsxProd_default(MessageAgeSuffix, {
        age,
      });
      $[9] = age;
      $[10] = ageSuffix;
    } else ageSuffix = $[10];
    let emptyBox;
    if ($[11] !== emptyText || $[12] !== ageSuffix) {
      emptyBox = jsxProd_default_2(Box, {
        flexDirection: "row",
        width: "100%",
        children: [emptyText, ageSuffix],
      });
      $[11] = emptyText;
      $[12] = ageSuffix;
      $[13] = emptyBox;
    } else emptyBox = $[13];
    return emptyBox;
  }
  let commandMessage;
  let isUsableCommand;
  if ($[14] !== userMessage.message.content) {
    commandMessage = findLastCommandMessage(userMessage.message.content);
    isUsableCommand = commandMessage && isUsableCommandMessage(commandMessage);
    $[14] = userMessage.message.content;
    $[15] = commandMessage;
    $[16] = isUsableCommand;
  } else {
    commandMessage = $[15];
    isUsableCommand = $[16];
  }
  if (isUsableCommand) {
    let { message, args, isSkillFormat } = commandMessage;
    if (message) {
      if (isSkillFormat) {
        let ageSuffix;
        if ($[17] !== age) {
          ageSuffix = jsxProd_default(MessageAgeSuffix, {
            age,
          });
          $[17] = age;
          $[18] = ageSuffix;
        } else ageSuffix = $[18];
        let skillBox;
        if ($[19] !== color || $[20] !== message || $[21] !== dimColor || $[22] !== ageSuffix) {
          skillBox = jsxProd_default(Box, {
            flexDirection: "row",
            width: "100%",
            children: jsxProd_default_2(Text, {
              color,
              dimColor,
              children: ["Skill(", message, ")", ageSuffix],
            }),
          });
          $[19] = color;
          $[20] = message;
          $[21] = dimColor;
          $[22] = ageSuffix;
          $[23] = skillBox;
        } else skillBox = $[23];
        return skillBox;
      } else {
        const commandLine = userMessage.stackedOriginalInput ?? `/${message}${args ? ` ${args}` : ""}`;
        let ageSuffix;
        if ($[24] !== age) {
          ageSuffix = jsxProd_default(MessageAgeSuffix, {
            age,
          });
          $[24] = age;
          $[25] = ageSuffix;
        } else ageSuffix = $[25];
        let commandBox;
        if ($[26] !== color || $[27] !== dimColor || $[28] !== commandLine || $[29] !== ageSuffix) {
          commandBox = jsxProd_default(Box, {
            flexDirection: "row",
            width: "100%",
            children: jsxProd_default_2(Text, {
              color,
              dimColor,
              children: [commandLine, ageSuffix],
            }),
          });
          $[26] = color;
          $[27] = dimColor;
          $[28] = commandLine;
          $[29] = ageSuffix;
          $[30] = commandBox;
        } else commandBox = $[30];
        return commandBox;
      }
    }
  }
  let bashInput;
  if ($[31] !== commandMessage || $[32] !== userMessage.message.content) {
    bashInput = commandMessage ? null : extractBashInput(userMessage.message.content);
    $[31] = commandMessage;
    $[32] = userMessage.message.content;
    $[33] = bashInput;
  } else bashInput = $[33];
  let bashInput_2 = bashInput;
  if (bashInput_2) {
    let bashBang;
    if ($[34] === MEMO_CACHE_SENTINEL) {
      bashBang = jsxProd_default(Text, {
        color: "bashBorder",
        children: "!",
      });
      $[34] = bashBang;
    } else bashBang = $[34];
    let ageSuffix;
    if ($[35] !== age) {
      ageSuffix = jsxProd_default(MessageAgeSuffix, {
        age,
      });
      $[35] = age;
      $[36] = ageSuffix;
    } else ageSuffix = $[36];
    let bashBox;
    if ($[37] !== bashInput_2 || $[38] !== color || $[39] !== dimColor || $[40] !== ageSuffix) {
      bashBox = jsxProd_default_2(Box, {
        flexDirection: "row",
        width: "100%",
        children: [
          bashBang,
          jsxProd_default_2(Text, {
            color,
            dimColor,
            children: [" ", bashInput_2, ageSuffix],
          }),
        ],
      });
      $[37] = bashInput_2;
      $[38] = color;
      $[39] = dimColor;
      $[40] = ageSuffix;
      $[41] = bashBox;
    } else bashBox = $[41];
    return bashBox;
  }
  let truncated;
  let earlyReturn;
  if (
    $[42] !== age ||
    $[43] !== color ||
    $[44] !== columns ||
    $[45] !== dimColor ||
    $[46] !== text_2 ||
    $[47] !== paddingRight
  ) {
    earlyReturn = EARLY_RETURN_SENTINEL;
    no: {
      truncated = paddingRight
        ? truncate(text_2, columns - paddingRight, true)
        : truncateToLength(text_2, 500)
            .split(
              `
`,
            )
            .slice(0, 4).join(`
`);
      if (
        age !== undefined &&
        truncated.includes(`
`)
      ) {
        const commandMessage = jsxProd_default(Text, {
          color,
          dimColor,
          children: truncated.trimEnd(),
        });
        let ageText;
        if ($[50] !== age) {
          ageText = jsxProd_default(Text, {
            dimColor: true,
            children: age,
          });
          $[50] = age;
          $[51] = ageText;
        } else ageText = $[51];
        let stackedBox;
        if ($[52] !== commandMessage || $[53] !== ageText) {
          stackedBox = jsxProd_default_2(Box, {
            flexDirection: "column",
            width: "100%",
            children: [commandMessage, ageText],
          });
          $[52] = commandMessage;
          $[53] = ageText;
          $[54] = stackedBox;
        } else stackedBox = $[54];
        earlyReturn = stackedBox;
        break no;
      }
    }
    $[42] = age;
    $[43] = color;
    $[44] = columns;
    $[45] = dimColor;
    $[46] = text_2;
    $[47] = paddingRight;
    $[48] = truncated;
    $[49] = earlyReturn;
  } else {
    truncated = $[48];
    earlyReturn = $[49];
  }
  if (earlyReturn !== EARLY_RETURN_SENTINEL) return earlyReturn;
  let ageSuffix;
  if ($[55] !== age) {
    ageSuffix = jsxProd_default(MessageAgeSuffix, {
      age,
    });
    $[55] = age;
    $[56] = ageSuffix;
  } else ageSuffix = $[56];
  let plainBox;
  if ($[57] !== color || $[58] !== dimColor || $[59] !== truncated || $[60] !== ageSuffix) {
    plainBox = jsxProd_default(Box, {
      flexDirection: "row",
      width: "100%",
      children: jsxProd_default_2(Text, {
        color,
        dimColor,
        children: [truncated, ageSuffix],
      }),
    });
    $[57] = color;
    $[58] = dimColor;
    $[59] = truncated;
    $[60] = ageSuffix;
    $[61] = plainBox;
  } else plainBox = $[61];
  return plainBox;
}
//@ chunk-czq1j3j2.js:336869-337013 layout
function MessageAgeSuffix(props) {
  let $ = useMemoCache(2);
  let { age } = props;
  let ageSuffix;
  if ($[0] !== age) {
    ageSuffix =
      age === undefined
        ? null
        : jsxProd_default_2(Text, {
            dimColor: true,
            children: [" \xB7 ", age],
          });
    $[0] = age;
    $[1] = ageSuffix;
  } else ageSuffix = $[1];
  return ageSuffix;
}
//@ chunk-czq1j3j2.js:337013-337506 fingerprint (2.1.88 match: messagesAfterAreOnlySynthetic, 0.856)
function messagesAfterAreOnlySynthetic(messages, fromIndex) {
  for (let i = fromIndex + 1; i < messages.length; i++) {
    let msg = messages[i];
    if (!msg) continue;
    if (isSyntheticMessage(msg)) continue;
    if (isToolUseResultMessage(msg)) continue;
    if (msg.type === "progress") continue;
    if (msg.type === "system") continue;
    if (msg.type === "attachment") continue;
    if (msg.type === "user" && msg.isMeta) continue;
    if (msg.type === "user" && msg.stackedExpansion) continue;
    if (msg.type === "assistant") {
      let content = msg.message.content;
      if (Array.isArray(content)) {
        if (
          content.some((block) => (block.type === "text" && block.text?.trim()) || block.type === "tool_use")
        )
          return false;
      }
      continue;
    }
    if (msg.type === "user") return false;
  }
  return true;
}
//@ chunk-czq1j3j2.js:454793-455365 placement
/**
 * 把消息列表中以 queued_command 附件形式存在的人类 prompt 还原为普通用户消息（跳过 meta、已存在 uuid、cron 触发和非对象内容），让 Rewind 选择器能选中它们；无变化时返回原数组。
 */
function expandQueuedPromptAttachments(messages) {
  let existingUserUuids = new Set();
  for (let message of messages) if (message.type === "user") existingUserUuids.add(message.uuid);
  let didExpand = false;
  let mapped = messages.map((message, index) => {
    if (
      message.type !== "attachment" ||
      message.attachment.type !== "queued_command" ||
      message.attachment.commandMode !== "prompt" ||
      !isHumanTurn(message)
    )
      return message;
    let queuedCommandAttachment = parseQueuedCommandAttachment(message.attachment, message.uuid);
    if (
      queuedCommandAttachment === undefined ||
      queuedCommandAttachment.isMeta ||
      existingUserUuids.has(queuedCommandAttachment.uuid) ||
      hasCronToolUse(messages, index) ||
      (Array.isArray(queuedCommandAttachment.content) &&
        queuedCommandAttachment.content.some((part) => typeof part !== "object" || part === null))
    )
      return message;
    existingUserUuids.add(queuedCommandAttachment.uuid);
    didExpand = true;
    return createUserMessage({
      content: queuedCommandAttachment.content,
      uuid: queuedCommandAttachment.uuid,
      timestamp: message.timestamp,
      imagePasteIds: message.attachment.imagePasteIds,
      origin: queuedCommandAttachment.origin,
    });
  });
  return didExpand ? mapped : messages;
}
//@ chunk-czq1j3j2.js:455365-455606 placement
function openRewindSelector({ localJsx, turn, sessionController }) {
  if (localJsx.size > 0) return null;
  let localJsxOptions = {
    commandName: "rewind",
    immediate: false,
    hidesPrompt: true,
    retireAtTurnBoundary: false,
  };
  let rewindDialog = localJsx.show(
    jsxProd_default(RewindMessageSelector, {
      turn,
      sessionController,
      onClose: () => rewindDialog.close(),
    }),
    localJsxOptions,
  );
  return rewindDialog;
}
//@ chunk-czq1j3j2.js:455606-456403 placement
function RewindMessageSelector({ turn, sessionController, onClose }) {
  let { storageV5 } = useTheme_2();
  let appStoreDirect = useAppStoreDirect();
  let setAppState = useSetAppState();
  let session = useSession();
  let { messages } = transcriptMessagesStore(mainAgentId());
  let messages_2 = useMemo(() => expandQueuedPromptAttachments(messages), [messages]);
  return jsxProd_default(MessageSelector, {
    messages: messages_2,
    onPreRestore: turn.cancel,
    onRestoreCode: async (message) => {
      try {
        return await fileHistoryRewind(() => appStoreDirect.getState().fileHistory, message.uuid);
      } finally {
        setAppState((appState) => {
          let nextFileHistory = reduceFileHistoryState(
            appState.fileHistory,
            {
              kind: "touch",
            },
            storageV5,
          );
          if (nextFileHistory === appState.fileHistory) return appState;
          return {
            ...appState,
            fileHistory: nextFileHistory,
          };
        });
      }
    },
    onSummarize:
      sessionController.runsNoModelTurn || isEnvTruthy(process.env.DISABLE_COMPACT)
        ? undefined
        : sessionController.handleSummarize,
    onRestoreMessage: (message) => sessionController.handleRestoreMessage(message, "message_selector"),
    onClose,
    parentSessionId: getParentSessionId(),
    onResumePreviousSession:
      getParentSessionId() && getParentSessionId() !== session.id
        ? async () => {
            try {
              let parentSessionId = getParentSessionId();
              if (!parentSessionId || parentSessionId === session.id) return;
              let lastSessionLog = await getLastSessionLog(parentSessionId, undefined, storageV5);
              if (lastSessionLog)
                await sessionController.resume(parentSessionId, lastSessionLog, "rewind_pre_clear");
            } catch (error) {
              logError(error);
            }
          }
        : undefined,
  });
}
export { diffStat, openRewindSelector, messagesAfterAreOnlySynthetic };
