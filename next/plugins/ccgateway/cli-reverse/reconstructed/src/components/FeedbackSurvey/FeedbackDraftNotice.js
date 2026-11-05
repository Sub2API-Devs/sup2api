/**
 * components/FeedbackSurvey/FeedbackDraftNotice.tsx
 *
 * 2.1.316 新增。未提交反馈草稿的提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (13)
 * attribution: placement 13
 */
import {
  init_react_production,
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { measureText } from "../../utils/Cursor.js";
import { plural } from "../../utils/stringUtils.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import {
  stripInvisibleCharsMultiLine,
  stripInvisibleChars as stripInvisibleChars_3,
} from "../../utils/invisibleChars.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { sequential } from "../../utils/sequential.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";
import { feedbackNoticeSignal, useSessionDraftCount } from "../PromptInput/PromptInputFooterLeftSide.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useHost } from "../../context/session.js";
import { useShortDraftValue } from "../../screens/repl/storeHooks.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useClock } from "../../ink/components/ClockContext.js";
import {
  isFeedbackDraftsEnabled,
  getFeedbackDraftsSetting,
  setFeedbackDraftsSetting,
} from "../../services/feedbackDrafts.js";
import {
  MAX_TITLE_PREVIEW_CHARS,
  dismissFeedbackNotice_2,
  markDraftNoticeLogged,
  dismissFeedbackNotice,
  listFeedbackDrafts,
  MAX_NOTICE_MODEL_CHARS,
} from "../../services/feedback/feedbackDrafts.js";
import { DIGIT_HOTKEY_HOLD_MS, DIGIT_HOTKEY_DELAY_MS, useDigitHotkeys } from "../pluginUi/digitHotkeys.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromNumber } from "../../services/analytics/safeMetadata.js";
import { submitFeedbackDraft } from "../../services/feedback/feedbackDraft.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { TEARDROP_ASTERISK } from "../../constants/figures.js";
import { ShutdownRequestDisplay } from "../messages/ShutdownMessage.js";
import { getEffortLevelIfSupported } from "../../utils/effort.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { useQueuedMessageText } from "../../context/QueuedMessageContext.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:954999-955003 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:954999", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:955223-955227 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:955223", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:955732-955736 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:955732", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1015207-1015217 placement
var MAX_DRAFT_TURN_OFF_DECLINES = 2;
//@ chunk-czq1j3j2.js:1015217-1015288 placement
function shouldShowTurnOffPrompt() {
  return (getGlobalConfig().feedbackDraftsTurnOffPromptDeclines ?? 0) < MAX_DRAFT_TURN_OFF_DECLINES;
}
//@ chunk-czq1j3j2.js:1015288-1015405 placement
function recordDraftTurnOffDecline(storageV5) {
  saveGlobalConfig(
    (config) => ({
      ...config,
      feedbackDraftsTurnOffPromptDeclines: (config.feedbackDraftsTurnOffPromptDeclines ?? 0) + 1,
    }),
    storageV5,
  );
}
//@ chunk-czq1j3j2.js:1015405-1015774 placement
function feedbackDraftPreviewLines(text, columns, preview = false) {
  if (text.trim() === "") return "Details empty.";
  let lines = text.split(`
`);
  let max = Math.max(1, columns - 6);
  let flattened = lines.flatMap((line) => measureText(line, max).lines.map((line) => line.text));
  return [
    preview
      ? `Draft preview, ${lines.length} ${plural(lines.length, "line")}:`
      : `${lines.length} ${plural(lines.length, "line")}:`,
    ...flattened.map((line) => `> ${line}`),
    preview ? "End of preview. Review the full draft with /feedback." : "End of details.",
  ].join(`
`);
}
//@ chunk-czq1j3j2.js:1015774-1016066 placement
function truncateToWrappedLines(text, width, maxRows) {
  let kept = [];
  let usedRows = 0;
  for (let line of text.split(`
`)) {
    let lines = measureText(line, Math.max(1, width)).lines;
    if (usedRows + lines.length <= maxRows) {
      kept.push(line);
      usedRows += lines.length;
      continue;
    }
    let remainingRows = maxRows - usedRows;
    if (remainingRows > 0) {
      let startOffset = lines[remainingRows]?.startOffset;
      kept.push(startOffset === undefined ? line : line.slice(0, startOffset).trimEnd());
    }
    kept.push("\u2026");
    return kept.join(`
`);
  }
  return text;
}
//@ chunk-czq1j3j2.js:1016066-1016749 placement
function WrappedTextBox(props) {
  let $ = useMemoCache(8);
  let { value, bold, dim, columns, maxRows, preview } = props;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let box;
  if (
    $[0] !== bold ||
    $[1] !== columns ||
    $[2] !== dim ||
    $[3] !== isScreenReaderEnabled ||
    $[4] !== maxRows ||
    $[5] !== preview ||
    $[6] !== value
  ) {
    let cleaned = stripInvisibleCharsMultiLine(value);
    let text =
      maxRows === undefined ? cleaned : truncateToWrappedLines(cleaned, Math.max(1, columns - 2), maxRows);
    box = jsxProd_default(Box, {
      borderStyle: isScreenReaderEnabled ? undefined : "single",
      borderLeft: true,
      borderTop: false,
      borderBottom: false,
      borderRight: false,
      borderDimColor: true,
      paddingLeft: isScreenReaderEnabled ? 0 : 1,
      flexDirection: "column",
      children: isScreenReaderEnabled
        ? jsxProd_default(Text, {
            bold,
            dimColor: dim,
            wrap: "wrap",
            children: feedbackDraftPreviewLines(text, columns, preview),
          })
        : sequential.level === 0
          ? jsxProd_default(Text, {
              bold,
              dimColor: dim,
              wrap: "wrap",
              children: text,
            })
          : jsxProd_default(MarkdownText_2, {
              promptMode: true,
              skipTokenCache: true,
              children: text,
            }),
    });
    $[0] = bold;
    $[1] = columns;
    $[2] = dim;
    $[3] = isScreenReaderEnabled;
    $[4] = maxRows;
    $[5] = preview;
    $[6] = value;
    $[7] = box;
  } else box = $[7];
  return box;
}
//@ chunk-czq1j3j2.js:1016749-1016864 placement
var FEEDBACK_KIND_LABELS = {
  bug: "Bug report",
  idea: "Product feedback",
  missing_capability: "Feature request",
};
var SENT_STATUS_RESET_MS = 1500;
var NOTICE_SHOW_DELAY_MS = 1000;
var OFF_CONFIRM_RESET_MS = 5000;
//@ chunk-czq1j3j2.js:1016864-1022746 placement
/**
 * FeedbackDraftNotice：提示存在未提交的反馈草稿并允许继续或丢弃。
 */
function FeedbackDraftNotice({ isLoading, surveyActive, setInputValue, onOpenFeedback, onHoldsBandChange }) {
  let { notice } = feedbackNoticeSignal();
  let sessionDraftCount = useSessionDraftCount();
  let { storageV5, credentials } = useTheme_2();
  let host = useHost();
  let shortDraftValue = useShortDraftValue();
  let { rows, columns } = useTerminalSize();
  let clock = useClock();
  let [mode, setMode] = useState("idle");
  let [errorText, setErrorText] = useState(null);
  let [isOrgRefusal, setIsOrgRefusal] = useState(false);
  let sendingRef = useRef(false);
  let draftIdRef = useRef(notice?.draftId ?? null);
  let sentTimerRef = useRef(null);
  let offConfirmTimerRef = useRef(null);
  let declinedTurnOffRef = useRef(false);
  let dismissPromptAtRef = useRef(null);
  let draftsEnabled = isFeedbackDraftsEnabled();
  let isQuietMode = getFeedbackDraftsSetting() === "quiet" || rows < MAX_TITLE_PREVIEW_CHARS;
  let hasNotice = draftsEnabled && notice !== null;
  let isSuppressed = isLoading || surveyActive;
  let isPromptMode = mode === "dismissPrompt" || mode === "offConfirm";
  let holdsBand = isPromptMode || (hasNotice && !isQuietMode);
  useLayoutEffect(() => {
    onHoldsBandChange?.(holdsBand);
    return () => onHoldsBandChange?.(false);
  }, [holdsBand, onHoldsBandChange]);
  let [isVisible, setIsVisible] = useState(!isSuppressed && !isQuietMode);
  useEffect(() => {
    if (isSuppressed || isQuietMode || isPromptMode) {
      setIsVisible(false);
      return;
    }
    if (isVisible) return;
    return clock.setTimeout(() => setIsVisible(true), NOTICE_SHOW_DELAY_MS);
  }, [isSuppressed, isQuietMode, isPromptMode, isVisible, clock]);
  function clearSentTimer() {
    if (sentTimerRef.current !== null) {
      sentTimerRef.current();
      sentTimerRef.current = null;
    }
  }
  function clearOffConfirmTimer() {
    if (offConfirmTimerRef.current !== null) {
      offConfirmTimerRef.current();
      offConfirmTimerRef.current = null;
    }
  }
  if (notice !== null && notice.draftId !== draftIdRef.current) {
    draftIdRef.current = notice.draftId;
    clearSentTimer();
    if (mode !== "idle" && mode !== "dismissPrompt" && mode !== "offConfirm") {
      setMode("idle");
      setErrorText(null);
      setIsOrgRefusal(false);
      sendingRef.current = false;
    }
  }
  useEffect(() => {
    if (
      (isLoading || surveyActive || isQuietMode) &&
      (mode === "confirmSend" || mode === "dismissPrompt" || mode === "offConfirm")
    ) {
      clearOffConfirmTimer();
      setMode("idle");
    }
  }, [isLoading, surveyActive, isQuietMode, mode]);
  useEffect(() => {
    if (mode === "dismissPrompt" && shortDraftValue !== "" && shortDraftValue.normalize("NFKC") !== "0") {
      if (
        !(
          dismissPromptAtRef.current !== null &&
          clock.now() - dismissPromptAtRef.current < DIGIT_HOTKEY_HOLD_MS
        ) &&
        !declinedTurnOffRef.current
      ) {
        declinedTurnOffRef.current = true;
        recordDraftTurnOffDecline(storageV5);
        logEvent("tengu_feedback_turnoff_prompt_declined", {});
      }
      setMode("idle");
    }
  }, [mode, shortDraftValue, storageV5, clock]);
  useEffect(() => {
    if (!hasNotice || notice === null) return;
    if (isSuppressed || isQuietMode) return;
    if (isPromptMode) return;
    if (!isVisible) return;
    logNoticeShown(notice);
  }, [hasNotice, isQuietMode, isSuppressed, isVisible, isPromptMode, notice]);
  useEffect(
    () => () => {
      if (sentTimerRef.current !== null && draftIdRef.current !== null) {
        clearSentTimer();
        dismissFeedbackNotice_2(draftIdRef.current);
      }
      clearOffConfirmTimer();
    },
    [],
  );
  function logNoticeShown(notice) {
    if (markDraftNoticeLogged(notice.draftId))
      logEvent("tengu_feedback_notice_shown", {
        type: fromEnum(notice.type),
      });
  }
  function ensureNoticeLogged() {
    if (notice === null) return;
    logNoticeShown(notice);
  }
  function finishNotice(via) {
    clearSentTimer();
    clearOffConfirmTimer();
    if (via !== "sent")
      logEvent(via === "dismiss" ? "tengu_feedback_notice_dismissed" : "tengu_feedback_notice_opened", {
        type: fromEnum(notice?.type ?? "bug"),
        via: fromEnum(via),
      });
    sendingRef.current = false;
    setMode("idle");
    setErrorText(null);
    setIsOrgRefusal(false);
    dismissFeedbackNotice();
  }
  function dismissNotice() {
    finishNotice("dismiss");
    if (shouldShowTurnOffPrompt()) {
      dismissPromptAtRef.current = clock.now();
      declinedTurnOffRef.current = false;
      logEvent("tengu_feedback_turnoff_prompt_shown", {});
      setMode("dismissPrompt");
    }
  }
  function isWithinDigitHold() {
    return (
      dismissPromptAtRef.current !== null && clock.now() - dismissPromptAtRef.current < DIGIT_HOTKEY_HOLD_MS
    );
  }
  function isWithinDigitDoubleHold() {
    return (
      dismissPromptAtRef.current !== null &&
      clock.now() - dismissPromptAtRef.current < DIGIT_HOTKEY_HOLD_MS + DIGIT_HOTKEY_DELAY_MS
    );
  }
  function declineTurnOff() {
    if (!isWithinDigitHold() && !declinedTurnOffRef.current) {
      declinedTurnOffRef.current = true;
      recordDraftTurnOffDecline(storageV5);
      logEvent("tengu_feedback_turnoff_prompt_declined", {});
    }
    setMode("idle");
  }
  function turnOffDrafts() {
    setFeedbackDraftsSetting("off", {
      storageV5,
      via: "card",
    });
    dismissFeedbackNotice();
    clearOffConfirmTimer();
    setMode("offConfirm");
    offConfirmTimerRef.current = clock.setTimeout(() => {
      offConfirmTimerRef.current = null;
      setMode("idle");
    }, OFF_CONFIRM_RESET_MS);
  }
  async function sendDraft(draftId) {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setMode("sending");
    setErrorText(null);
    setIsOrgRefusal(false);
    let submitResult;
    try {
      let { queued } = await listFeedbackDrafts(undefined, storageV5);
      let found = queued.find((draft) => draft.draft_id === draftId);
      if (!found) {
        sendingRef.current = false;
        dismissFeedbackNotice_2(draftId);
        if (draftIdRef.current === draftId) setMode("idle");
        return;
      }
      submitResult = await submitFeedbackDraft({
        draft: found,
        includeTranscript: false,
        currentSessionMessages: [],
        via: "card_send_as_is",
        storageV5,
        host,
        credentials,
      });
    } catch {
      submitResult = {
        success: false,
        error: "Couldn't send feedback.",
      };
    }
    logEvent("tengu_feedback_card_send", {
      type: fromEnum(notice?.type ?? "bug"),
      success: fromNumber(submitResult.success ? 1 : 0),
    });
    if (draftIdRef.current !== draftId) return;
    if (!submitResult.success) {
      sendingRef.current = false;
      setErrorText(submitResult.error);
      setIsOrgRefusal(submitResult.orgRefusalReason !== undefined);
      setMode("error");
      return;
    }
    setMode("sent");
    sentTimerRef.current = clock.setTimeout(() => finishNotice("sent"), SENT_STATUS_RESET_MS);
  }
  useDigitHotkeys({
    inputValue: shortDraftValue,
    enterConfirms: false,
    isValidDigit: (digit) =>
      mode === "dismissPrompt"
        ? digit === "0"
        : digit === "0" || digit === "1" || (digit === "2" && mode !== "error"),
    enabled:
      !isQuietMode &&
      !isSuppressed &&
      ((hasNotice && (mode === "idle" || mode === "confirmSend" || mode === "error")) ||
        mode === "dismissPrompt"),
    onDigit: (digit) => {
      setInputValue("");
      if (mode === "dismissPrompt") {
        if (!isWithinDigitDoubleHold()) turnOffDrafts();
        return;
      }
      if (notice === null) return;
      ensureNoticeLogged();
      if (digit === "1") {
        finishNotice("review");
        onOpenFeedback();
      } else if (digit === "0") {
        if (mode === "confirmSend") setMode("idle");
        else dismissNotice();
      } else if (mode === "idle") setMode("confirmSend");
      else if (mode === "confirmSend") sendDraft(notice.draftId);
    },
  });
  let shownAtRef = useRef(isSuppressed ? null : clock.now());
  useEffect(() => {
    if (!isSuppressed) shownAtRef.current = clock.now();
  }, [isSuppressed, clock]);
  let previousPromptModeRef = useRef(isPromptMode);
  useEffect(() => {
    let wasPromptMode = previousPromptModeRef.current;
    previousPromptModeRef.current = isPromptMode;
    if (wasPromptMode && !isPromptMode) shownAtRef.current = clock.now();
  }, [isPromptMode, clock]);
  useKeybinding(
    "chat:cancel",
    () => {
      if (shownAtRef.current !== null && clock.now() - shownAtRef.current < DIGIT_HOTKEY_HOLD_MS) return;
      if (mode === "dismissPrompt") {
        declineTurnOff();
        return;
      }
      ensureNoticeLogged();
      if (mode === "confirmSend") {
        setMode("idle");
        return;
      }
      dismissNotice();
    },
    {
      context: "Chat",
      isActive:
        !isQuietMode &&
        !isSuppressed &&
        shortDraftValue === "" &&
        (mode === "dismissPrompt" ||
          (hasNotice && mode !== "sending" && mode !== "sent" && mode !== "offConfirm")),
    },
  );
  if (mode === "dismissPrompt")
    return jsxProd_default(Box, {
      marginTop: 1,
      marginBottom: 1,
      children: jsxProd_default_2(Text, {
        children: [
          "Turn off Claude-drafted feedback?",
          " ",
          jsxProd_default(Text, {
            dimColor: true,
            children: jsxProd_default_2(Byline, {
              children: [
                jsxProd_default(KeyboardShortcutHint, {
                  chord: "0",
                  action: "turn off",
                }),
                jsxProd_default(KeyboardShortcutHint, {
                  chord: "escape",
                  action: "keep",
                }),
              ],
            }),
          }),
        ],
      }),
    });
  if (mode === "offConfirm")
    return jsxProd_default(Box, {
      marginTop: 1,
      marginBottom: 1,
      children: jsxProd_default_2(Text, {
        children: [
          jsxProd_default(StatusIcon, {
            status: "success",
            withSpace: true,
          }),
          "Claude-drafted feedback is off. Turn back on in /config",
        ],
      }),
    });
  if (!hasNotice || isQuietMode || notice === null) return null;
  let max = Math.max(0, sessionDraftCount - 1);
  let isDigitAnswerAllowed =
    shortDraftValue === "" ||
    (mode === "error" ? /^[01]$/ : /^[012]$/).test(shortDraftValue.normalize("NFKC"));
  let kindLabel = FEEDBACK_KIND_LABELS[notice.type] ?? "Feedback";
  let children = stripInvisibleChars_3(notice.title);
  let statusText =
    mode === "confirmSend"
      ? jsxProd_default_2(Text, {
          children: [
            "Send without reviewing",
            " ",
            jsxProd_default(Text, {
              dimColor: true,
              children: "(full draft + env, no transcript)",
            }),
            "?",
            " ",
            jsxProd_default(Text, {
              dimColor: true,
              children: jsxProd_default_2(Byline, {
                children: [
                  isDigitAnswerAllowed &&
                    jsxProd_default(KeyboardShortcutHint, {
                      chord: "2",
                      action: "send",
                    }),
                  isDigitAnswerAllowed &&
                    jsxProd_default(KeyboardShortcutHint, {
                      chord: "escape",
                      action: "back",
                    }),
                  !isDigitAnswerAllowed && "clear text to answer it",
                ],
              }),
            }),
          ],
        })
      : mode === "sending"
        ? jsxProd_default(Text, {
            dimColor: true,
            children: "Sending\u2026",
          })
        : mode === "sent"
          ? jsxProd_default_2(Text, {
              children: [
                jsxProd_default(StatusIcon, {
                  status: "success",
                  withSpace: true,
                }),
                "Sent",
              ],
            })
          : mode === "error"
            ? jsxProd_default_2(Text, {
                children: [
                  jsxProd_default(StatusIcon, {
                    status: "error",
                    withSpace: true,
                  }),
                  jsxProd_default(Text, {
                    color: "error",
                    children: errorText,
                  }),
                  " ",
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: jsxProd_default_2(Byline, {
                      children: [
                        isDigitAnswerAllowed &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "1",
                            action: isOrgRefusal ? "review or discard" : "review & retry",
                          }),
                        isDigitAnswerAllowed &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "escape",
                            action: "dismiss",
                          }),
                        !isDigitAnswerAllowed &&
                          (isOrgRefusal
                            ? "clear text to open review or to dismiss"
                            : "clear text to open review or dismiss"),
                      ],
                    }),
                  }),
                ],
              })
            : jsxProd_default(Text, {
                dimColor: true,
                children: jsxProd_default_2(Byline, {
                  children: [
                    isDigitAnswerAllowed &&
                      jsxProd_default(KeyboardShortcutHint, {
                        chord: "1",
                        action: "review",
                      }),
                    isDigitAnswerAllowed &&
                      jsxProd_default(KeyboardShortcutHint, {
                        chord: "2",
                        action: "send",
                      }),
                    isDigitAnswerAllowed &&
                      jsxProd_default(KeyboardShortcutHint, {
                        chord: "0",
                        action: "dismiss",
                      }),
                    !isDigitAnswerAllowed && "clear text to review, send, or dismiss",
                    max > 0 && `+${max} more queued`,
                  ],
                }),
              });
  let noticeElement = jsxProd_default(Box, {
    flexShrink: 1,
    children: jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [
        jsxProd_default_2(Text, {
          color: "claude",
          "aria-hidden": true,
          children: [TEARDROP_ASTERISK, " "],
        }),
        kindLabel,
        " drafted: ",
        jsxProd_default(Text, {
          bold: true,
          children,
        }),
      ],
    }),
  });
  if (isSuppressed) return null;
  return jsxProd_default(Box, {
    marginTop: 1,
    marginBottom: 1,
    children: jsxProd_default_2(ShutdownRequestDisplay, {
      children: [
        noticeElement,
        jsxProd_default(WrappedTextBox, {
          value: notice.detailsPreview,
          dim: true,
          columns: Math.max(1, columns - 4),
          maxRows: MAX_NOTICE_MODEL_CHARS,
          preview: true,
        }),
        statusText,
      ],
    }),
  });
}
//@ chunk-czq1j3j2.js:1022750-1022815 placement
function buildEffortLevelTelemetry(level) {
  let effortLevelIfSupported = getEffortLevelIfSupported(getMainLoopModel(), level);
  return effortLevelIfSupported
    ? {
        effort_level: fromEnum(effortLevelIfSupported),
      }
    : {};
}
//@ chunk-czq1j3j2.js:1022815-1022847 placement
function getCurrentEffortLevelTelemetry() {
  return buildEffortLevelTelemetry(useQueuedMessageText());
}
export { FeedbackDraftNotice, getCurrentEffortLevelTelemetry, buildEffortLevelTelemetry, WrappedTextBox };
