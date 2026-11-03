/**
 * components/MessageSelector.tsx
 *
 * 回退（Rewind）消息选择器：列出可选用户消息，提供"恢复代码和对话/仅对话/仅代码/从此处总结"等选项及 diff 统计。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/MessageSelector.tsx
 * pieces: chunk-18hwfzwa.js (15), chunk-wyqg6m3h.js (1)
 * attribution: affinity 1, fingerprint 8, layout 3, file-local 1, placement 3
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
import { y, Q, P, ce, R } from "../../vendor/react/cjs/react.production.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import {
  createUserMessage,
  isRealUserPromptMessage,
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
import { REWIND_UNSAFE_PATH_REASON, RESTORE_FILES_CAVEAT } from "../constants/messages.js";
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
import { w } from "../../vendor/react/compiler-runtime.js";
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

//@ chunk-18hwfzwa.js:415610-415635 affinity
class ConversationRestoreError extends Error {}
//@ chunk-18hwfzwa.js:415635-415696 fingerprint = isSummarizeOption (1)
function isSummarizeOption(option) {
  return option === "summarize" || option === "summarize_up_to";
}
//@ chunk-18hwfzwa.js:415696-415729 layout
var REWIND = "Rewind";
var CURRENT_ITEM_LABEL = "(current)";
//@ chunk-18hwfzwa.js:415729-422268 fingerprint = MessageSelector (0.642)
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
  let fileHistory = useAppState((ur) => ur.fileHistory);
  let [error, setError] = y(undefined);
  let [It, Ot] = y(false);
  let isFileHistoryEnabled = fileHistoryEnabled();
  let { rows } = useTerminalSize();
  let Lt = useIsFullscreen() ? Math.floor(rows / 2) : rows;
  let oo = isFileHistoryEnabled ? 3 : 2;
  let Xt = 12;
  let max = Math.max(2, Math.floor((Lt - 12) / oo));
  let currentUUID = Q(randomUUID, []);
  let messageOptions = Q(randomUUID, []);
  let ao = !!onResumePreviousSession;
  let co = Q(
    () => [
      ...(ao
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
    [messages, currentUUID, messageOptions, ao],
  );
  let bo = co.length > 1;
  let [Ao, Bo] = y(undefined);
  let [Ro, Ho] = y(preselectedMessage);
  let [Io, Wo] = y(() => new Date());
  let [diffStatsForRestore, setDiffStatsForRestore] = y(undefined);
  P(() => {
    if (!preselectedMessage || !isFileHistoryEnabled) return;
    let cancelled = false;
    fileHistoryGetDiffStats(fileHistory, preselectedMessage.uuid).then((stats) => {
      if (!cancelled) setDiffStatsForRestore(stats);
    });
    return () => {
      cancelled = true;
    };
  }, [preselectedMessage, isFileHistoryEnabled, fileHistory]);
  let [isRestoring, setIsRestoring] = y(null);
  let Yo = isRestoring !== null;
  let [selectedRestoreOption, setSelectedRestoreOption] = y("both");
  let [summarizeFromFeedback, setSummarizeFromFeedback] = y("");
  let [summarizeUpToFeedback, setSummarizeUpToFeedback] = y("");
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
  P(() => {
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
      Wo(new Date());
      Ho(message);
      return;
    }
    let diffStats = await fileHistoryGetDiffStats(fileHistory, message.uuid);
    Wo(new Date());
    Ho(message);
    setDiffStatsForRestore(diffStats);
  }
  async function onSelectRestoreOption(option) {
    logEvent("tengu_message_selector_restore_option_selected", {
      option: fromEnum(option),
    });
    if (!Ro) {
      setError("Message not found.");
      return;
    }
    if (option === "nevermind") {
      if (preselectedMessage) onClose();
      else Ho(undefined);
      return;
    }
    if (isSummarizeOption(option) && onSummarize) {
      onPreRestore();
      setIsRestoring(option);
      setError(undefined);
      Ot(false);
      try {
        let direction = option === "summarize_up_to" ? "up_to" : "from";
        let feedback =
          (direction === "up_to" ? summarizeUpToFeedback : summarizeFromFeedback).trim() || undefined;
        await onSummarize(Ro, feedback, direction);
        setIsRestoring(null);
        Ho(undefined);
        onClose();
      } catch (error) {
        if (!(error instanceof CompactionError)) logError(error);
        setIsRestoring(null);
        Ho(undefined);
        setError(`Failed to summarize:
${errorMessage(error)}`);
      }
      return;
    }
    onPreRestore();
    setIsRestoring(option);
    setError(undefined);
    Ot(false);
    let codeError = null;
    let conversationError = null;
    let ts = 0;
    if (option === "code" || option === "both")
      try {
        ts = (await onRestoreCode(Ro))?.skippedLinks ?? 0;
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
        await onRestoreMessage(Ro);
      } catch (error) {
        conversationError = error;
        logConversationRestoreError(conversationError);
      }
    setIsRestoring(null);
    Ho(undefined);
    let Gn =
      ts > 0
        ? `Restored the code, but skipped ${ts} ${ts === 1 ? "file" : "files"}: ${REWIND_UNSAFE_PATH_REASON}. Skipped files were left untouched \u2014 run with --debug for the paths.`
        : undefined;
    if (conversationError && codeError)
      setError(`Failed to restore the conversation and code:
${errorMessage(conversationError)}
${errorMessage(codeError)}`);
    else if (codeError)
      setError(`Failed to restore the code:
${errorMessage(codeError)}`);
    else if (conversationError || Gn) {
      Ot(!conversationError);
      setError(
        [
          conversationError
            ? `Failed to restore the conversation:
${errorMessage(conversationError)}`
            : undefined,
          Gn,
        ].filter(Boolean).join(`

`),
      );
    } else onClose();
  }
  let handleEscape = ce(() => {
    if (Ro && !preselectedMessage) {
      Ho(undefined);
      return;
    }
    logEvent("tengu_message_selector_cancelled", {});
    onClose();
  }, [onClose, Ro, preselectedMessage]);
  let cn = useGlobalExitKeybindings(
    undefined,
    () => {
      if (!Yo || restoreWait === undefined) return false;
      restoreWait.onStopWaiting();
      return true;
    },
    !!Ro,
  );
  useRegisterKeybindingContext("MessageSelector", !Yo && !error && !Ro && bo);
  let [fileHistoryMetadata, setFileHistoryMetadata] = y({});
  let mr = R(new Map());
  P(() => {
    if (!isFileHistoryEnabled || preselectedMessage) return;
    let abortController = new AbortController();
    async function Ir() {
      let Pr = {};
      let ts = {
        pairCounts: mr.current,
        countUntil: performance.now() + rowCountingMs,
        signal: abortController.signal,
      };
      for (let idx = co.length - 1; idx >= 0; idx--) {
        let Ur = co[idx];
        if (Ur.uuid === currentUUID || Ur.uuid === messageOptions) continue;
        if (!fileHistoryCanRestore(fileHistory, Ur.uuid)) {
          Pr[idx] = undefined;
          continue;
        }
        let Zr = idx + 1;
        while (Zr < co.length - 1 && !fileHistoryCanRestore(fileHistory, co[Zr].uuid)) Zr++;
        let nextUserMessage = co.at(Zr);
        Pr[idx] = await fileHistoryGetTurnDiffStats(
          fileHistory,
          Ur.uuid,
          nextUserMessage?.uuid !== currentUUID ? nextUserMessage?.uuid : undefined,
          ts,
        );
        if (abortController.signal.aborted) return;
      }
      setFileHistoryMetadata(Pr);
    }
    Ir().catch(logError);
    return () => {
      abortController.abort();
    };
  }, [co, currentUUID, messageOptions, fileHistory, isFileHistoryEnabled, preselectedMessage, rowCountingMs]);
  let canRestoreCode =
    isFileHistoryEnabled && diffStatsForRestore?.filesChanged && diffStatsForRestore.filesChanged.length > 0;
  let showPickList = !error && !Ro && !preselectedMessage && bo;
  let Fr = !error && !!Ro && bo;
  let Zn = isFileHistoryEnabled
    ? "Restore the code and/or conversation to the point before\u2026"
    : "Restore the conversation to the point before\u2026";
  let Un = false;
  let dr = stableEmptyObject(Un);
  let or =
    confirmDescription !== undefined && !isSummarizeOption(selectedRestoreOption)
      ? jsxProd_default(Text, {
          dimColor: true,
          children:
            selectedRestoreOption === "nevermind"
              ? "The conversation will be unchanged."
              : confirmDescription,
        })
      : jsxProd_default(RestoreOptionDescription, {
          selectedRestoreOption,
          canRestoreCode: !!canRestoreCode,
          diffStatsForRestore,
          isOneParagraph: Un,
        });
  let pr = !!Ro && bo;
  let Qn = jsxProd_default_2(Byline, {
    children: [
      !error &&
        bo &&
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: Un && Fr ? "confirm" : "continue",
          ...dr,
        }),
      jsxProd_default(KeyboardShortcutHint, {
        chord: "escape",
        action: "cancel",
        ...dr,
      }),
    ],
  });
  return jsxProd_default_2(Dialog, {
    title: Un && Fr ? REWIND : "Rewind",
    subtitle: Un && showPickList ? Zn : undefined,
    color: Un && error && !It ? "error" : "suggestion",
    onCancel: handleEscape,
    isCancelActive: !Ro || !bo,
    hideInputGuide: pr && !Un,
    inputGuide: Un
      ? (prev_1) => {
          if (!pr) return prev_1.pending ? `Press ${prev_1.keyName} again to cancel` : Qn;
          if (Yo) return " ";
          return cn.pending ? `Press ${cn.keyName} again to exit` : Qn;
        }
      : Qn,
    children: [
      Un && error
        ? jsxProd_default(Text, {
            children: error,
          })
        : jsxProd_default(ErrorText, {
            error,
          }),
      !bo &&
        jsxProd_default(HintText, {
          children: "Nothing to rewind to yet.",
        }),
      Fr &&
        jsxProd_default_2(Fragment, {
          children: [
            Un
              ? jsxProd_default(Box, {
                  paddingLeft: 2,
                  children: jsxProd_default(UserMessageOption, {
                    userMessage: Ro,
                    color: "text",
                    isCurrent: false,
                    isRedesign: true,
                    age: formatRelativeTimeAgo(new Date(Ro.timestamp), {
                      now: Io,
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
                          userMessage: Ro,
                          color: "text",
                          isCurrent: false,
                          isRedesign: false,
                        }),
                        jsxProd_default_2(Text, {
                          dimColor: true,
                          children: [
                            "(",
                            formatRelativeTimeAgo(new Date(Ro.timestamp), {
                              now: Io,
                            }),
                            ")",
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
            Un && canRestoreCode
              ? jsxProd_default_2(Box, {
                  flexDirection: "column",
                  children: [
                    or,
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: RESTORE_FILES_CAVEAT,
                    }),
                  ],
                })
              : or,
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
              : Yo && restoreWait !== undefined
                ? jsxProd_default(PromptDialog, {
                    message: restoreWait.message,
                    onCancel: restoreWait.onStopWaiting,
                    escAction: "stop waiting",
                  })
                : jsxProd_default(ModelSelector, {
                    isDisabled: Yo,
                    options: getRestoreOptions(!!canRestoreCode),
                    defaultFocusValue: canRestoreCode ? "both" : "conversation",
                    onFocus: (value) => setSelectedRestoreOption(value),
                    onChange: (value) => onSelectRestoreOption(value),
                    onCancel: () => (preselectedMessage ? onClose() : Ho(undefined)),
                  }),
            canRestoreCode &&
              !Un &&
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
            !Un &&
              jsxProd_default(Text, {
                children: Zn,
              }),
            jsxProd_default(merged, {
              visibleCount: max * oo + 2,
              defaultFocusIndex: Ao ?? co.length - 1,
              onFocus: Bo,
              isDisabled: Yo,
              scrollBar: false,
              onSelect: (value_0) => {
                let Ir = co[value_0];
                if (Ir) handleSelect(Ir);
              },
              children: co.map((msg, visibleOptionIndex) =>
                jsxProd_default(
                  merged.Item,
                  {
                    lines: oo,
                    children: jsxProd_default(computeDiffStatsBetweenMessages, {
                      message: msg,
                      isCurrent: msg.uuid === currentUUID,
                      isPreClear: msg.uuid === messageOptions,
                      parentSessionId,
                      metadataLoaded: isFileHistoryEnabled && visibleOptionIndex in fileHistoryMetadata,
                      metadata: fileHistoryMetadata[visibleOptionIndex],
                      isRedesign: Un,
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
//@ chunk-18hwfzwa.js:422268-422399 layout
function logConversationRestoreError(h) {
  if (h instanceof ConversationRestoreError) {
    logForDebugging(`MessageSelector: conversation restore not done: ${h.message}`, {
      level: "error",
    });
    return;
  }
  logError(h);
}
//@ chunk-18hwfzwa.js:422399-422832 fingerprint = getRestoreOptionConversationText (0.939)
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
//@ chunk-18hwfzwa.js:422832-423703 fingerprint = RestoreOptionDescription (0.785)
function RestoreOptionDescription(props) {
  let $ = w(17);
  let { selectedRestoreOption, canRestoreCode, diffStatsForRestore, isOneParagraph } = props;
  let showCodeRestore =
    canRestoreCode && (selectedRestoreOption === "both" || selectedRestoreOption === "code");
  let children;
  if ($[0] !== selectedRestoreOption) {
    children = getRestoreOptionConversationText(selectedRestoreOption);
    $[0] = selectedRestoreOption;
    $[1] = children;
  } else children = $[1];
  let He;
  if ($[2] !== children) {
    He = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[2] = children;
    $[3] = He;
  } else He = $[3];
  let We = He;
  let ze;
  if ($[4] !== diffStatsForRestore || $[5] !== selectedRestoreOption || $[6] !== showCodeRestore) {
    ze =
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
    $[7] = ze;
  } else ze = $[7];
  let Xe = ze;
  if (isOneParagraph) {
    let rt;
    if ($[8] !== Xe) {
      rt =
        Xe &&
        jsxProd_default(Text, {
          children: " ",
        });
      $[8] = Xe;
      $[9] = rt;
    } else rt = $[9];
    let kt;
    if ($[10] !== Xe || $[11] !== We || $[12] !== rt) {
      kt = jsxProd_default_2(Text, {
        children: [We, rt, Xe],
      });
      $[10] = Xe;
      $[11] = We;
      $[12] = rt;
      $[13] = kt;
    } else kt = $[13];
    return kt;
  }
  let rt;
  if ($[14] !== Xe || $[15] !== We) {
    rt = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [We, Xe],
    });
    $[14] = Xe;
    $[15] = We;
    $[16] = rt;
  } else rt = $[16];
  return rt;
}
//@ chunk-18hwfzwa.js:423703-424837 fingerprint = RestoreCodeConfirmation (0.498)
function RestoreCodeConfirmation(props) {
  let $ = w(15);
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
    const L = diffStatsForRestore.filesChanged[0] || "";
    let Re;
    if ($[1] !== L) {
      Re = pathModule.basename(L);
      $[1] = L;
      $[2] = Re;
    } else Re = $[2];
    fileLabel = Re;
  } else if (numFilesChanged === 2) {
    const L = diffStatsForRestore.filesChanged[0] || "";
    let Re;
    if ($[3] !== L) {
      Re = pathModule.basename(L);
      $[3] = L;
      $[4] = Re;
    } else Re = $[4];
    let Be = Re;
    const He = diffStatsForRestore.filesChanged[1] || "";
    let t2;
    if ($[5] !== He) {
      t2 = pathModule.basename(He);
      $[5] = He;
      $[6] = t2;
    } else t2 = $[6];
    let file2 = t2;
    fileLabel = `${Be} and ${file2}`;
  } else {
    const L = diffStatsForRestore.filesChanged[0] || "";
    let Re;
    if ($[7] !== L) {
      Re = pathModule.basename(L);
      $[7] = L;
      $[8] = Re;
    } else Re = $[8];
    fileLabel = `${Re} and ${diffStatsForRestore.filesChanged.length - 1} other files`;
  }
  let L;
  if ($[9] !== diffStatsForRestore.deletions || $[10] !== diffStatsForRestore.insertions) {
    L = jsxProd_default(DiffStatCounts, {
      added: diffStatsForRestore.insertions,
      removed: diffStatsForRestore.deletions,
    });
    $[9] = diffStatsForRestore.deletions;
    $[10] = diffStatsForRestore.insertions;
    $[11] = L;
  } else L = $[11];
  let t2;
  if ($[12] !== fileLabel || $[13] !== L) {
    t2 = jsxProd_default(Fragment, {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: ["The code will be restored", " ", L, " ", "in ", fileLabel, "."],
      }),
    });
    $[12] = fileLabel;
    $[13] = L;
    $[14] = t2;
  } else t2 = $[14];
  return t2;
}
//@ chunk-18hwfzwa.js:424837-426117 file-local
function computeDiffStatsBetweenMessages(props) {
  let $ = w(16);
  let { message, isCurrent, isPreClear, parentSessionId, metadataLoaded, metadata, isRedesign } = props;
  let He = isMenuOpen();
  let We = metadata?.filesChanged && metadata.filesChanged.length;
  let Xe;
  if (
    $[0] !== isCurrent ||
    $[1] !== isPreClear ||
    $[2] !== isRedesign ||
    $[3] !== He ||
    $[4] !== message ||
    $[5] !== parentSessionId
  ) {
    Xe = jsxProd_default(Box, {
      flexShrink: 1,
      height: 1,
      overflow: "hidden",
      children: isPreClear
        ? jsxProd_default(Box, {
            width: "100%",
            children: jsxProd_default_2(Text, {
              color: He ? "suggestion" : undefined,
              children: ["/resume ", parentSessionId, " (previous session)"],
            }),
          })
        : jsxProd_default(UserMessageOption, {
            userMessage: message,
            color: He ? "suggestion" : undefined,
            isCurrent,
            isRedesign,
            paddingRight: 10,
          }),
    });
    $[0] = isCurrent;
    $[1] = isPreClear;
    $[2] = isRedesign;
    $[3] = He;
    $[4] = message;
    $[5] = parentSessionId;
    $[6] = Xe;
  } else Xe = $[6];
  let rt;
  if ($[7] !== isRedesign || $[8] !== He || $[9] !== metadata || $[10] !== metadataLoaded || $[11] !== We) {
    rt =
      metadataLoaded &&
      jsxProd_default(Box, {
        height: 1,
        flexDirection: "row",
        children: metadata
          ? jsxProd_default(Text, {
              dimColor: !He,
              color: "inactive",
              children: We
                ? jsxProd_default_2(Fragment, {
                    children: [
                      We === 1 && metadata.filesChanged[0]
                        ? `${pathModule.basename(metadata.filesChanged[0])} `
                        : `${We} files changed `,
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
    $[8] = He;
    $[9] = metadata;
    $[10] = metadataLoaded;
    $[11] = We;
    $[12] = rt;
  } else rt = $[12];
  let kt;
  if ($[13] !== Xe || $[14] !== rt) {
    kt = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [Xe, rt],
    });
    $[13] = Xe;
    $[14] = rt;
    $[15] = kt;
  } else kt = $[15];
  return kt;
}
//@ chunk-18hwfzwa.js:426117-429323 fingerprint = UserMessageOption (0.462)
function UserMessageOption(props) {
  let $ = w(62);
  let { userMessage, color, dimColor, isCurrent, isRedesign, paddingRight, age } = props;
  let { columns } = useTerminalSize();
  let ze;
  if ($[0] !== userMessage) {
    ze = textOrReminderWrapped(getUserMessageText(userMessage)?.trim() || "(no prompt)");
    $[0] = userMessage;
    $[1] = ze;
  } else ze = $[1];
  let text = ze;
  if (isCurrent) {
    const children = isRedesign ? CURRENT_ITEM_LABEL : "(current)";
    let kt;
    if ($[2] !== color || $[3] !== dimColor || $[4] !== children) {
      kt = jsxProd_default(Box, {
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
      $[5] = kt;
    } else kt = $[5];
    return kt;
  }
  if (isEmptyMessageText(text)) {
    let rt;
    if ($[6] !== color || $[7] !== dimColor) {
      rt = jsxProd_default(Text, {
        italic: true,
        color,
        dimColor,
        children: "((empty message))",
      });
      $[6] = color;
      $[7] = dimColor;
      $[8] = rt;
    } else rt = $[8];
    let kt;
    if ($[9] !== age) {
      kt = jsxProd_default(MessageAgeSuffix, {
        age,
      });
      $[9] = age;
      $[10] = kt;
    } else kt = $[10];
    let At;
    if ($[11] !== rt || $[12] !== kt) {
      At = jsxProd_default_2(Box, {
        flexDirection: "row",
        width: "100%",
        children: [rt, kt],
      });
      $[11] = rt;
      $[12] = kt;
      $[13] = At;
    } else At = $[13];
    return At;
  }
  let It;
  let rt;
  if ($[14] !== userMessage.message.content) {
    It = findLastCommandMessage(userMessage.message.content);
    rt = It && isUsableCommandMessage(It);
    $[14] = userMessage.message.content;
    $[15] = It;
    $[16] = rt;
  } else {
    It = $[15];
    rt = $[16];
  }
  if (rt) {
    let { message, args, isSkillFormat } = It;
    if (message) {
      if (isSkillFormat) {
        let kt;
        if ($[17] !== age) {
          kt = jsxProd_default(MessageAgeSuffix, {
            age,
          });
          $[17] = age;
          $[18] = kt;
        } else kt = $[18];
        let At;
        if ($[19] !== color || $[20] !== message || $[21] !== dimColor || $[22] !== kt) {
          At = jsxProd_default(Box, {
            flexDirection: "row",
            width: "100%",
            children: jsxProd_default_2(Text, {
              color,
              dimColor,
              children: ["Skill(", message, ")", kt],
            }),
          });
          $[19] = color;
          $[20] = message;
          $[21] = dimColor;
          $[22] = kt;
          $[23] = At;
        } else At = $[23];
        return At;
      } else {
        const kt = userMessage.stackedOriginalInput ?? `/${message}${args ? ` ${args}` : ""}`;
        let At;
        if ($[24] !== age) {
          At = jsxProd_default(MessageAgeSuffix, {
            age,
          });
          $[24] = age;
          $[25] = At;
        } else At = $[25];
        let Lt;
        if ($[26] !== color || $[27] !== dimColor || $[28] !== kt || $[29] !== At) {
          Lt = jsxProd_default(Box, {
            flexDirection: "row",
            width: "100%",
            children: jsxProd_default_2(Text, {
              color,
              dimColor,
              children: [kt, At],
            }),
          });
          $[26] = color;
          $[27] = dimColor;
          $[28] = kt;
          $[29] = At;
          $[30] = Lt;
        } else Lt = $[30];
        return Lt;
      }
    }
  }
  let kt;
  if ($[31] !== It || $[32] !== userMessage.message.content) {
    kt = It ? null : extractBashInput(userMessage.message.content);
    $[31] = It;
    $[32] = userMessage.message.content;
    $[33] = kt;
  } else kt = $[33];
  let oo = kt;
  if (oo) {
    let At;
    if ($[34] === MEMO_CACHE_SENTINEL) {
      At = jsxProd_default(Text, {
        color: "bashBorder",
        children: "!",
      });
      $[34] = At;
    } else At = $[34];
    let Lt;
    if ($[35] !== age) {
      Lt = jsxProd_default(MessageAgeSuffix, {
        age,
      });
      $[35] = age;
      $[36] = Lt;
    } else Lt = $[36];
    let Xt;
    if ($[37] !== oo || $[38] !== color || $[39] !== dimColor || $[40] !== Lt) {
      Xt = jsxProd_default_2(Box, {
        flexDirection: "row",
        width: "100%",
        children: [
          At,
          jsxProd_default_2(Text, {
            color,
            dimColor,
            children: [" ", oo, Lt],
          }),
        ],
      });
      $[37] = oo;
      $[38] = color;
      $[39] = dimColor;
      $[40] = Lt;
      $[41] = Xt;
    } else Xt = $[41];
    return Xt;
  }
  let io;
  let At;
  if (
    $[42] !== age ||
    $[43] !== color ||
    $[44] !== columns ||
    $[45] !== dimColor ||
    $[46] !== text ||
    $[47] !== paddingRight
  ) {
    At = EARLY_RETURN_SENTINEL;
    po: {
      io = paddingRight
        ? truncate(text, columns - paddingRight, true)
        : truncateToLength(text, 500)
            .split(
              `
`,
            )
            .slice(0, 4).join(`
`);
      if (
        age !== undefined &&
        io.includes(`
`)
      ) {
        const commandMessage = jsxProd_default(Text, {
          color,
          dimColor,
          children: io.trimEnd(),
        });
        let Xt;
        if ($[50] !== age) {
          Xt = jsxProd_default(Text, {
            dimColor: true,
            children: age,
          });
          $[50] = age;
          $[51] = Xt;
        } else Xt = $[51];
        let so;
        if ($[52] !== commandMessage || $[53] !== Xt) {
          so = jsxProd_default_2(Box, {
            flexDirection: "column",
            width: "100%",
            children: [commandMessage, Xt],
          });
          $[52] = commandMessage;
          $[53] = Xt;
          $[54] = so;
        } else so = $[54];
        At = so;
        break po;
      }
    }
    $[42] = age;
    $[43] = color;
    $[44] = columns;
    $[45] = dimColor;
    $[46] = text;
    $[47] = paddingRight;
    $[48] = io;
    $[49] = At;
  } else {
    io = $[48];
    At = $[49];
  }
  if (At !== EARLY_RETURN_SENTINEL) return At;
  let Lt;
  if ($[55] !== age) {
    Lt = jsxProd_default(MessageAgeSuffix, {
      age,
    });
    $[55] = age;
    $[56] = Lt;
  } else Lt = $[56];
  let Xt;
  if ($[57] !== color || $[58] !== dimColor || $[59] !== io || $[60] !== Lt) {
    Xt = jsxProd_default(Box, {
      flexDirection: "row",
      width: "100%",
      children: jsxProd_default_2(Text, {
        color,
        dimColor,
        children: [io, Lt],
      }),
    });
    $[57] = color;
    $[58] = dimColor;
    $[59] = io;
    $[60] = Lt;
    $[61] = Xt;
  } else Xt = $[61];
  return Xt;
}
//@ chunk-18hwfzwa.js:429323-429467 layout
function MessageAgeSuffix(props) {
  let $ = w(2);
  let { age } = props;
  let L;
  if ($[0] !== age) {
    L =
      age === undefined
        ? null
        : jsxProd_default_2(Text, {
            dimColor: true,
            children: [" \xB7 ", age],
          });
    $[0] = age;
    $[1] = L;
  } else L = $[1];
  return L;
}
//@ chunk-18hwfzwa.js:429467-429960 fingerprint = messagesAfterAreOnlySynthetic (0.891)
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
//@ chunk-18hwfzwa.js:429960-430532 placement
/**
 * 把消息列表中以 queued_command 附件形式存在的人类 prompt 还原为普通用户消息（跳过 meta、已存在 uuid、cron 触发和非对象内容），让 Rewind 选择器能选中它们；无变化时返回原数组。
 */
function expandQueuedPromptAttachments(messages) {
  let x = new Set();
  for (let message of messages) if (message.type === "user") x.add(message.uuid);
  let D = false;
  let mapped = messages.map((message, ke) => {
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
      x.has(queuedCommandAttachment.uuid) ||
      hasCronToolUse(messages, ke) ||
      (Array.isArray(queuedCommandAttachment.content) &&
        queuedCommandAttachment.content.some((Be) => typeof Be !== "object" || Be === null))
    )
      return message;
    x.add(queuedCommandAttachment.uuid);
    D = true;
    return createUserMessage({
      content: queuedCommandAttachment.content,
      uuid: queuedCommandAttachment.uuid,
      timestamp: message.timestamp,
      imagePasteIds: message.attachment.imagePasteIds,
      origin: queuedCommandAttachment.origin,
    });
  });
  return D ? mapped : messages;
}
//@ chunk-18hwfzwa.js:430532-430773 placement
function openRewindSelector({ localJsx, turn, sessionController }) {
  if (localJsx.size > 0) return null;
  let L = {
    commandName: "rewind",
    immediate: false,
    hidesPrompt: true,
    retireAtTurnBoundary: false,
  };
  let ee = localJsx.show(
    jsxProd_default(RewindMessageSelector, {
      turn,
      sessionController,
      onClose: () => ee.close(),
    }),
    L,
  );
  return ee;
}
//@ chunk-18hwfzwa.js:430773-431571 placement
function RewindMessageSelector({ turn, sessionController, onClose }) {
  let { storageV5 } = useTheme_2();
  let appStoreDirect = useAppStoreDirect();
  let setAppState = useSetAppState();
  let session = useSession();
  let { messages } = transcriptMessagesStore(mainAgentId());
  let messages_2 = Q(() => expandQueuedPromptAttachments(messages), [messages]);
  return jsxProd_default(MessageSelector, {
    messages: messages_2,
    onPreRestore: turn.cancel,
    onRestoreCode: async (We) => {
      try {
        return await fileHistoryRewind(() => appStoreDirect.getState().fileHistory, We.uuid);
      } finally {
        setAppState((ze) => {
          let Xe = reduceFileHistoryState(
            ze.fileHistory,
            {
              kind: "touch",
            },
            storageV5,
          );
          if (Xe === ze.fileHistory) return ze;
          return {
            ...ze,
            fileHistory: Xe,
          };
        });
      }
    },
    onSummarize:
      sessionController.runsNoModelTurn || isEnvTruthy(process.env.DISABLE_COMPACT)
        ? undefined
        : sessionController.handleSummarize,
    onRestoreMessage: (We) => sessionController.handleRestoreMessage(We, "message_selector"),
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
//@ chunk-wyqg6m3h.js:36692-36855 fingerprint = DiffStatsText (0.64)
function diffStat(e, o, r) {
  let { Text } = e.ui;
  let n = o > 0 && r > 0;
  return h(
    Text,
    null,
    o > 0
      ? h(
          Text,
          {
            color: "diffAddedWord",
          },
          `+${o}`,
        )
      : "",
    n ? " " : "",
    r > 0
      ? h(
          Text,
          {
            color: "diffRemovedWord",
          },
          `-${r}`,
        )
      : "",
  );
}
export { openRewindSelector, messagesAfterAreOnlySynthetic, diffStat };
