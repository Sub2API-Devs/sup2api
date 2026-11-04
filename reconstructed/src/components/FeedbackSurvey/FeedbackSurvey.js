/**
 * components/FeedbackSurvey/FeedbackSurvey.tsx
 *
 * 会话质量调查（1-3 数字评分）及感谢/后续分享记录提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FeedbackSurvey/FeedbackSurvey.tsx
 * pieces: chunk-18hwfzwa.js (8)
 * attribution: sole-consumer 1, fingerprint 2, layout 3, placement 2
 */
import { isFeedbackAllowed } from "../../commands/feedback/feedbackPolicy.js";
import { DEFAULT_SURVEY_FOLLOWUP_CONFIG } from "./useFeedbackSurvey.js";
import {
  useRef,
  useEffect,
  useState,
  init_react_production,
} from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import {
  TranscriptShareStatus,
  isSelectableResponseKey,
  FeedbackRatingRow,
  FeedbackSurveyView,
  THANKS_FOR_FEEDBACK_TEXT,
} from "./FeedbackSurveyView.js";
import { SurveyFollowup, setPendingSurveyFeedbackSource } from "./SurveyFollowup.js";
import { isTranscriptShareKey } from "./TranscriptSharePrompt.js";
import { useDebouncedDigitInput } from "./useDebouncedDigitInput.js";
import { normalizeDigitKey, useDigitHotkeys } from "../pluginUi/digitHotkeys.js";
import { SkillImprovementSurvey } from "../SkillImprovementSurvey.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { usePreDispatchKeyHandler } from "../../keybindings/useActionHandlers.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { getCurrentEffortLevelTelemetry } from "./FeedbackDraftNotice.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2, fromEnumOpt, fromEnum } from "../../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:999590-999617 sole-consumer
function getIsFeedbackDisabled() {
  return !isFeedbackAllowed();
}
//@ chunk-18hwfzwa.js:999617-1001694 fingerprint = FeedbackSurvey (0.451)
function FeedbackSurvey({
  state,
  lastResponse,
  handleSelect,
  handleUndo,
  handleTranscriptSelect,
  handleFollowupResolve,
  followupAskConfig = DEFAULT_SURVEY_FOLLOWUP_CONFIG,
  followupArmActive = false,
  turnInProgress = false,
  submittingShare = true,
  thanksFromFollowup,
  inputValue,
  setInputValue,
  onRequestFeedback,
  appearanceId,
  surveyType,
  message,
  messageBold,
  memoryCitation,
  showNotSure = false,
  transcriptBundlePath,
  onAbandon,
  onTypedOver,
  typedOver = false,
  canUndo = true,
}) {
  let typedRef = useRef(false);
  let typedThisAppearanceRef = useRef(false);
  let abandonReportedRef = useRef(false);
  let appearanceIdRef = useRef(appearanceId);
  if (appearanceIdRef.current !== appearanceId) {
    appearanceIdRef.current = appearanceId;
    typedRef.current = false;
    typedThisAppearanceRef.current = false;
    abandonReportedRef.current = false;
  }
  let stateRef = useRef(state);
  if (stateRef.current !== state) {
    if (state === "open" && !onTypedOver) {
      typedRef.current = false;
      typedThisAppearanceRef.current = false;
      abandonReportedRef.current = false;
    }
    stateRef.current = state;
  }
  useEffect(() => {
    if (typedThisAppearanceRef.current && !abandonReportedRef.current && state === "open") {
      abandonReportedRef.current = true;
      if (onTypedOver) onTypedOver();
      else onAbandon?.();
    }
  });
  if (state === "closed") return null;
  if (state === "pending")
    return jsxProd_default(FeedbackResponseLine, {
      lastResponse,
      onUndo: handleUndo,
      canUndo,
    });
  if (state === "thanks")
    return jsxProd_default(FeedbackSurveyThanks, {
      lastResponse,
      inputValue,
      setInputValue,
      onRequestFeedback,
      appearanceId,
      surveyType,
      followupArmActive,
      thanksFromFollowup,
    });
  if (state === "submitted")
    return jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(TranscriptShareStatus, {
        state: "submitted",
        transcriptBundlePath: transcriptBundlePath ?? null,
      }),
    });
  if (state === "share_failed")
    return jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(TranscriptShareStatus, {
        state: "share_failed",
      }),
    });
  if (state === "submitting")
    return jsxProd_default(Box, {
      marginTop: 1,
      children: submittingShare
        ? jsxProd_default(TranscriptShareStatus, {
            state: "submitting",
          })
        : jsxProd_default_2(Text, {
            dimColor: true,
            children: ["Sending feedback", "\u2026"],
          }),
    });
  if (state === "followup_prompt") {
    if (!handleFollowupResolve) return null;
    return jsxProd_default(SurveyFollowup, {
      onResolve: handleFollowupResolve,
      question: FOLLOWUP_TITLES[lastResponse && lastResponse !== "dismissed" ? lastResponse : "bad"],
      maxChars: followupAskConfig.maxChars,
      autoDismissAfterMs: followupAskConfig.autoDismissAfterMs,
      turnInProgress,
    });
  }
  if (state === "transcript_prompt") {
    if (!handleTranscriptSelect) return null;
    if (inputValue && !isTranscriptShareKey(inputValue.toLowerCase())) return null;
    return jsxProd_default(useDebouncedDigitInput, {
      onSelect: handleTranscriptSelect,
      inputValue,
      setInputValue,
    });
  }
  let responseKey = inputValue.length === 1 ? normalizeDigitKey(inputValue) : inputValue;
  if (responseKey && !isSelectableResponseKey(responseKey, showNotSure)) {
    if (typedRef.current || onTypedOver) typedThisAppearanceRef.current = true;
    if (!onTypedOver) return null;
  }
  if (onTypedOver && (typedOver || typedThisAppearanceRef.current))
    return jsxProd_default(FeedbackRatingRow, {
      onSelect: handleSelect,
    });
  if (typedThisAppearanceRef.current) return null;
  typedRef.current = true;
  if (memoryCitation)
    return jsxProd_default(SkillImprovementSurvey, {
      citation: memoryCitation,
      onSelect: handleSelect,
      inputValue,
      setInputValue,
    });
  return jsxProd_default(FeedbackSurveyView, {
    onSelect: handleSelect,
    inputValue,
    setInputValue,
    message,
    messageBold,
    showNotSure,
  });
}
//@ chunk-18hwfzwa.js:1001694-1001756 layout
var RESPONSE_LABELS = {
  bad: "Bad",
  fine: "Fine",
  good: "Good",
  not_sure: "Unsure",
};
//@ chunk-18hwfzwa.js:1001756-1002399 layout
/**
 * 显示已选的反馈结果（Bad/Fine/Good/Unsure），可撤销时显示 Esc undo 并响应 Esc。
 */
function FeedbackResponseLine(props) {
  let $ = useMemoCache(11);
  let { lastResponse, onUndo, canUndo } = props;
  let escapeHandler;
  if ($[0] !== onUndo) {
    escapeHandler = (input, key) => {
      if (key.escape) {
        onUndo();
        return true;
      }
    };
    $[0] = onUndo;
    $[1] = escapeHandler;
  } else escapeHandler = $[1];
  let handlerOptions;
  if ($[2] !== canUndo) {
    handlerOptions = {
      isActive: canUndo,
    };
    $[2] = canUndo;
    $[3] = handlerOptions;
  } else handlerOptions = $[3];
  usePreDispatchKeyHandler(escapeHandler, handlerOptions);
  let children = lastResponse && lastResponse !== "dismissed" ? RESPONSE_LABELS[lastResponse] : "";
  let responseText;
  if ($[4] !== children) {
    responseText = jsxProd_default(Text, {
      color: "text",
      children,
    });
    $[4] = children;
    $[5] = responseText;
  } else responseText = $[5];
  let undoHint;
  if ($[6] !== canUndo) {
    undoHint =
      canUndo &&
      jsxProd_default_2(Fragment, {
        children: [
          " ",
          "\xB7 ",
          jsxProd_default(KeyboardShortcutHint, {
            chord: "escape",
            action: "undo",
          }),
        ],
      });
    $[6] = canUndo;
    $[7] = undoHint;
  } else undoHint = $[7];
  let line;
  if ($[8] !== responseText || $[9] !== undoHint) {
    line = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Feedback: ", responseText, undoHint],
      }),
    });
    $[8] = responseText;
    $[9] = undoHint;
    $[10] = line;
  } else line = $[10];
  return line;
}
//@ chunk-18hwfzwa.js:1002399-1002626 layout
var isShareKey = (key) => key === "1";
var FOLLOWUP_HINTS = {
  good: "tell us what went well",
  bad: "tell us what went wrong",
  fine: "tell us more",
  not_sure: "tell us more",
};
var FOLLOWUP_TITLES = {
  good: "What went well?",
  bad: "What went wrong?",
  fine: "Tell us more",
  not_sure: "Tell us more",
};
//@ chunk-18hwfzwa.js:1002626-1004284 fingerprint = FeedbackSurveyThanks (0.626)
function FeedbackSurveyThanks(props) {
  let $ = useMemoCache(24);
  let {
    lastResponse,
    inputValue,
    setInputValue,
    onRequestFeedback,
    appearanceId,
    surveyType,
    followupArmActive,
    thanksFromFollowup,
  } = props;
  let followupArmed = followupArmActive === undefined ? false : followupArmActive;
  let fromFollowup = thanksFromFollowup === undefined ? false : thanksFromFollowup;
  let response = lastResponse && lastResponse !== "dismissed" ? lastResponse : null;
  let feedbackCommand = response ? "/feedback" : null;
  let [isFeedbackDisabled] = useState(getIsFeedbackDisabled);
  let t1 = Boolean(
    onRequestFeedback &&
    response &&
    !(isFeedbackDisabled || (feedbackCommand === "/feedback" && followupArmed && response !== null)),
  );
  let currentEffortLevelTelemetry = getCurrentEffortLevelTelemetry();
  let digitHotkeyExtras;
  if ($[0] !== fromFollowup) {
    digitHotkeyExtras = fromFollowup
      ? {}
      : {
          mountDelayMs: 0,
        };
    $[0] = fromFollowup;
    $[1] = digitHotkeyExtras;
  } else digitHotkeyExtras = $[1];
  let onDigit;
  if (
    $[2] !== appearanceId ||
    $[3] !== currentEffortLevelTelemetry ||
    $[4] !== feedbackCommand ||
    $[5] !== response ||
    $[6] !== lastResponse ||
    $[7] !== onRequestFeedback ||
    $[8] !== setInputValue ||
    $[9] !== surveyType
  ) {
    onDigit = () => {
      setInputValue("");
      logEvent("tengu_feedback_survey_event", {
        ...currentEffortLevelTelemetry,
        event_type: lit_2("followup_accepted"),
        response: fromEnumOpt(lastResponse),
        ...(appearanceId && {
          appearance_id: sanitizeMarkName(appearanceId),
        }),
        ...(surveyType && {
          survey_type: fromEnum(surveyType),
        }),
      });
      if (response && feedbackCommand === "/feedback" && appearanceId && surveyType)
        setPendingSurveyFeedbackSource({
          appearanceId,
          response,
          surveyType,
          setAt: Date.now(),
        });
      if (feedbackCommand) onRequestFeedback?.(feedbackCommand);
    };
    $[2] = appearanceId;
    $[3] = currentEffortLevelTelemetry;
    $[4] = feedbackCommand;
    $[5] = response;
    $[6] = lastResponse;
    $[7] = onRequestFeedback;
    $[8] = setInputValue;
    $[9] = surveyType;
    $[10] = onDigit;
  } else onDigit = $[10];
  let digitHotkeyOptions;
  if ($[11] !== inputValue || $[12] !== t1 || $[13] !== digitHotkeyExtras || $[14] !== onDigit) {
    digitHotkeyOptions = {
      inputValue,
      isValidDigit: isShareKey,
      enabled: t1,
      once: true,
      ...digitHotkeyExtras,
      onDigit,
    };
    $[11] = inputValue;
    $[12] = t1;
    $[13] = digitHotkeyExtras;
    $[14] = onDigit;
    $[15] = digitHotkeyOptions;
  } else digitHotkeyOptions = $[15];
  useDigitHotkeys(digitHotkeyOptions);
  let thanksText;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    thanksText = jsxProd_default(Text, {
      color: "success",
      children: THANKS_FOR_FEEDBACK_TEXT,
    });
    $[16] = thanksText;
  } else thanksText = $[16];
  let followupHint;
  if ($[17] !== isFeedbackDisabled || $[18] !== feedbackCommand || $[19] !== response || $[20] !== t1) {
    followupHint =
      t1 && response && feedbackCommand
        ? jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "(Optional) Press [",
              jsxProd_default(Text, {
                color: "ansi:cyan",
                children: "1",
              }),
              "] to",
              " ",
              FOLLOWUP_HINTS[response],
              " \xB7 ",
              feedbackCommand,
            ],
          })
        : isFeedbackDisabled
          ? null
          : jsxProd_default(Text, {
              dimColor: true,
              children: "Use /feedback to share detailed feedback anytime.",
            });
    $[17] = isFeedbackDisabled;
    $[18] = feedbackCommand;
    $[19] = response;
    $[20] = t1;
    $[21] = followupHint;
  } else followupHint = $[21];
  let thanksElement;
  if ($[22] !== followupHint) {
    thanksElement = jsxProd_default_2(Box, {
      marginTop: 1,
      flexDirection: "column",
      children: [thanksText, followupHint],
    });
    $[22] = followupHint;
    $[23] = thanksElement;
  } else thanksElement = $[23];
  return thanksElement;
}
//@ chunk-18hwfzwa.js:1004284-1004288 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1004284", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1004288-1004326 placement
function hasSingleItem(items) {
  return items.length === 1;
}
export { hasSingleItem, FeedbackSurvey };
