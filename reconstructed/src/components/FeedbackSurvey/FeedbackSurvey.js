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
import { R, P, y, init_react_production } from "../../../vendor/react/cjs/react.production.js";
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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { usePreDispatchKeyHandler } from "../../keybindings/useActionHandlers.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { getCurrentEffortLevelTelemetry } from "./FeedbackDraftNotice.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2, fromEnumOpt, fromEnum } from "../../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

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
  let ao = R(false);
  let co = R(false);
  let bo = R(false);
  let appearanceIdRef = R(appearanceId);
  if (appearanceIdRef.current !== appearanceId) {
    appearanceIdRef.current = appearanceId;
    ao.current = false;
    co.current = false;
    bo.current = false;
  }
  let stateRef = R(state);
  if (stateRef.current !== state) {
    if (state === "open" && !onTypedOver) {
      ao.current = false;
      co.current = false;
      bo.current = false;
    }
    stateRef.current = state;
  }
  P(() => {
    if (co.current && !bo.current && state === "open") {
      bo.current = true;
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
  let Ro = inputValue.length === 1 ? normalizeDigitKey(inputValue) : inputValue;
  if (Ro && !isSelectableResponseKey(Ro, showNotSure)) {
    if (ao.current || onTypedOver) co.current = true;
    if (!onTypedOver) return null;
  }
  if (onTypedOver && (typedOver || co.current))
    return jsxProd_default(FeedbackRatingRow, {
      onSelect: handleSelect,
    });
  if (co.current) return null;
  ao.current = true;
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
  let $ = w(11);
  let { lastResponse, onUndo, canUndo } = props;
  let ke;
  if ($[0] !== onUndo) {
    ke = (input, key) => {
      if (key.escape) {
        onUndo();
        return true;
      }
    };
    $[0] = onUndo;
    $[1] = ke;
  } else ke = $[1];
  let He;
  if ($[2] !== canUndo) {
    He = {
      isActive: canUndo,
    };
    $[2] = canUndo;
    $[3] = He;
  } else He = $[3];
  usePreDispatchKeyHandler(ke, He);
  let children = lastResponse && lastResponse !== "dismissed" ? RESPONSE_LABELS[lastResponse] : "";
  let ze;
  if ($[4] !== children) {
    ze = jsxProd_default(Text, {
      color: "text",
      children,
    });
    $[4] = children;
    $[5] = ze;
  } else ze = $[5];
  let Xe;
  if ($[6] !== canUndo) {
    Xe =
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
    $[7] = Xe;
  } else Xe = $[7];
  let rt;
  if ($[8] !== ze || $[9] !== Xe) {
    rt = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Feedback: ", ze, Xe],
      }),
    });
    $[8] = ze;
    $[9] = Xe;
    $[10] = rt;
  } else rt = $[10];
  return rt;
}
//@ chunk-18hwfzwa.js:1002399-1002626 layout
var isShareKey = (h) => h === "1";
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
  let $ = w(24);
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
  let We = followupArmActive === undefined ? false : followupArmActive;
  let ze = thanksFromFollowup === undefined ? false : thanksFromFollowup;
  let Xe = lastResponse && lastResponse !== "dismissed" ? lastResponse : null;
  let rt = Xe ? "/feedback" : null;
  let [kt] = y(getIsFeedbackDisabled);
  let t1 = Boolean(onRequestFeedback && Xe && !(kt || (rt === "/feedback" && We && Xe !== null)));
  let currentEffortLevelTelemetry = getCurrentEffortLevelTelemetry();
  let Lt;
  if ($[0] !== ze) {
    Lt = ze
      ? {}
      : {
          mountDelayMs: 0,
        };
    $[0] = ze;
    $[1] = Lt;
  } else Lt = $[1];
  let onDigit;
  if (
    $[2] !== appearanceId ||
    $[3] !== currentEffortLevelTelemetry ||
    $[4] !== rt ||
    $[5] !== Xe ||
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
      if (Xe && rt === "/feedback" && appearanceId && surveyType)
        setPendingSurveyFeedbackSource({
          appearanceId,
          response: Xe,
          surveyType,
          setAt: Date.now(),
        });
      if (rt) onRequestFeedback?.(rt);
    };
    $[2] = appearanceId;
    $[3] = currentEffortLevelTelemetry;
    $[4] = rt;
    $[5] = Xe;
    $[6] = lastResponse;
    $[7] = onRequestFeedback;
    $[8] = setInputValue;
    $[9] = surveyType;
    $[10] = onDigit;
  } else onDigit = $[10];
  let Xt;
  if ($[11] !== inputValue || $[12] !== t1 || $[13] !== Lt || $[14] !== onDigit) {
    Xt = {
      inputValue,
      isValidDigit: isShareKey,
      enabled: t1,
      once: true,
      ...Lt,
      onDigit,
    };
    $[11] = inputValue;
    $[12] = t1;
    $[13] = Lt;
    $[14] = onDigit;
    $[15] = Xt;
  } else Xt = $[15];
  useDigitHotkeys(Xt);
  let io;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    io = jsxProd_default(Text, {
      color: "success",
      children: THANKS_FOR_FEEDBACK_TEXT,
    });
    $[16] = io;
  } else io = $[16];
  let so;
  if ($[17] !== kt || $[18] !== rt || $[19] !== Xe || $[20] !== t1) {
    so =
      t1 && Xe && rt
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
              FOLLOWUP_HINTS[Xe],
              " \xB7 ",
              rt,
            ],
          })
        : kt
          ? null
          : jsxProd_default(Text, {
              dimColor: true,
              children: "Use /feedback to share detailed feedback anytime.",
            });
    $[17] = kt;
    $[18] = rt;
    $[19] = Xe;
    $[20] = t1;
    $[21] = so;
  } else so = $[21];
  let po;
  if ($[22] !== so) {
    po = jsxProd_default_2(Box, {
      marginTop: 1,
      flexDirection: "column",
      children: [io, so],
    });
    $[22] = so;
    $[23] = po;
  } else po = $[23];
  return po;
}
//@ chunk-18hwfzwa.js:1004284-1004288 placement
init_react_production();
//@ chunk-18hwfzwa.js:1004288-1004326 placement
function hasSingleItem(kn) {
  return kn.length === 1;
}
export { hasSingleItem, FeedbackSurvey };
