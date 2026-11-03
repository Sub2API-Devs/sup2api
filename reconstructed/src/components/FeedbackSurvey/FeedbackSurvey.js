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
import { R, P, y, j } from "../../../vendor/react/cjs/react.production.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import {
  TranscriptShareStatus,
  e4,
  FeedbackRatingRow,
  FeedbackSurveyView,
  S$,
} from "./FeedbackSurveyView.js";
import { SurveyFollowup, Xke } from "./SurveyFollowup.js";
import { isTranscriptShareKey } from "./TranscriptSharePrompt.js";
import { useDebouncedDigitInput } from "./useDebouncedDigitInput.js";
import { fT, useDigitHotkeys } from "../pluginUi/digitHotkeys.js";
import { SkillImprovementSurvey } from "../SkillImprovementSurvey.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { usePreDispatchKeyHandler } from "../../keybindings/useActionHandlers.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Qke } from "./FeedbackDraftNotice.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2, fromEnumOpt, fromEnum } from "../../services/analytics/safeMetadata.js";
import { ye } from "../../utils/startupMarks.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-18hwfzwa.js:999590-999617 sole-consumer
function _fo() {
  return !isFeedbackAllowed();
}
//@ chunk-18hwfzwa.js:999617-1001694 fingerprint = FeedbackSurvey (0.451)
function FeedbackSurvey({
  state: state,
  lastResponse: lastResponse,
  handleSelect: handleSelect,
  handleUndo: handleUndo,
  handleTranscriptSelect: handleTranscriptSelect,
  handleFollowupResolve: handleFollowupResolve,
  followupAskConfig: followupAskConfig = DEFAULT_SURVEY_FOLLOWUP_CONFIG,
  followupArmActive: followupArmActive = !1,
  turnInProgress: turnInProgress = !1,
  submittingShare: submittingShare = !0,
  thanksFromFollowup: thanksFromFollowup,
  inputValue: inputValue,
  setInputValue: setInputValue,
  onRequestFeedback: onRequestFeedback,
  appearanceId: appearanceId,
  surveyType: surveyType,
  message: message,
  messageBold: messageBold,
  memoryCitation: memoryCitation,
  showNotSure: showNotSure = !1,
  transcriptBundlePath: transcriptBundlePath,
  onAbandon: onAbandon,
  onTypedOver: onTypedOver,
  typedOver: typedOver = !1,
  canUndo: canUndo = !0,
}) {
  let ao = R(!1),
    co = R(!1),
    bo = R(!1),
    Ao = R(appearanceId);
  if (Ao.current !== appearanceId)
    ((Ao.current = appearanceId), (ao.current = !1), (co.current = !1), (bo.current = !1));
  let Bo = R(state);
  if (Bo.current !== state) {
    if (state === "open" && !onTypedOver) ((ao.current = !1), (co.current = !1), (bo.current = !1));
    Bo.current = state;
  }
  if (
    (P(() => {
      if (co.current && !bo.current && state === "open")
        if (((bo.current = !0), onTypedOver)) onTypedOver();
        else onAbandon?.();
    }),
    state === "closed")
  )
    return null;
  if (state === "pending")
    return e(FeedbackResponseLine, { lastResponse: lastResponse, onUndo: handleUndo, canUndo: canUndo });
  if (state === "thanks")
    return e(FeedbackSurveyThanks, {
      lastResponse: lastResponse,
      inputValue: inputValue,
      setInputValue: setInputValue,
      onRequestFeedback: onRequestFeedback,
      appearanceId: appearanceId,
      surveyType: surveyType,
      followupArmActive: followupArmActive,
      thanksFromFollowup: thanksFromFollowup,
    });
  if (state === "submitted")
    return e(Box, {
      marginTop: 1,
      children: e(TranscriptShareStatus, {
        state: "submitted",
        transcriptBundlePath: transcriptBundlePath ?? null,
      }),
    });
  if (state === "share_failed")
    return e(Box, { marginTop: 1, children: e(TranscriptShareStatus, { state: "share_failed" }) });
  if (state === "submitting")
    return e(Box, {
      marginTop: 1,
      children: submittingShare
        ? e(TranscriptShareStatus, { state: "submitting" })
        : r(Text, { dimColor: !0, children: ["Sending feedback", "\u2026"] }),
    });
  if (state === "followup_prompt") {
    if (!handleFollowupResolve) return null;
    return e(SurveyFollowup, {
      onResolve: handleFollowupResolve,
      question: FOLLOWUP_TITLES[lastResponse && lastResponse !== "dismissed" ? lastResponse : "bad"],
      maxChars: followupAskConfig.maxChars,
      autoDismissAfterMs: followupAskConfig.autoDismissAfterMs,
      turnInProgress: turnInProgress,
    });
  }
  if (state === "transcript_prompt") {
    if (!handleTranscriptSelect) return null;
    if (inputValue && !isTranscriptShareKey(inputValue.toLowerCase())) return null;
    return e(useDebouncedDigitInput, {
      onSelect: handleTranscriptSelect,
      inputValue: inputValue,
      setInputValue: setInputValue,
    });
  }
  let Ro = inputValue.length === 1 ? fT(inputValue) : inputValue;
  if (Ro && !e4(Ro, showNotSure)) {
    if (ao.current || onTypedOver) co.current = !0;
    if (!onTypedOver) return null;
  }
  if (onTypedOver && (typedOver || co.current)) return e(FeedbackRatingRow, { onSelect: handleSelect });
  if (co.current) return null;
  if (((ao.current = !0), memoryCitation))
    return e(SkillImprovementSurvey, {
      citation: memoryCitation,
      onSelect: handleSelect,
      inputValue: inputValue,
      setInputValue: setInputValue,
    });
  return e(FeedbackSurveyView, {
    onSelect: handleSelect,
    inputValue: inputValue,
    setInputValue: setInputValue,
    message: message,
    messageBold: messageBold,
    showNotSure: showNotSure,
  });
}
//@ chunk-18hwfzwa.js:1001694-1001756 layout
var Ntt = { bad: "Bad", fine: "Fine", good: "Good", not_sure: "Unsure" };
/**
 * 显示已选的反馈结果（Bad/Fine/Good/Unsure），可撤销时显示 Esc undo 并响应 Esc。
 */
//@ chunk-18hwfzwa.js:1001756-1002399 layout
function FeedbackResponseLine(h) {
  let $ = w(11),
    { lastResponse: lastResponse, onUndo: onUndo, canUndo: canUndo } = h,
    ke;
  if ($[0] !== onUndo)
    ((ke = (Re, Be) => {
      if (Be.escape) {
        return (onUndo(), !0);
      }
    }),
      ($[0] = onUndo),
      ($[1] = ke));
  else ke = $[1];
  let He;
  if ($[2] !== canUndo) ((He = { isActive: canUndo }), ($[2] = canUndo), ($[3] = He));
  else He = $[3];
  usePreDispatchKeyHandler(ke, He);
  let We = lastResponse && lastResponse !== "dismissed" ? Ntt[lastResponse] : "",
    ze;
  if ($[4] !== We) ((ze = e(Text, { color: "text", children: We })), ($[4] = We), ($[5] = ze));
  else ze = $[5];
  let Xe;
  if ($[6] !== canUndo)
    ((Xe =
      canUndo &&
      r(Fragment, {
        children: [" ", "\xB7 ", e(KeyboardShortcutHint, { chord: "escape", action: "undo" })],
      })),
      ($[6] = canUndo),
      ($[7] = Xe));
  else Xe = $[7];
  let rt;
  if ($[8] !== ze || $[9] !== Xe)
    ((rt = e(Box, { marginTop: 1, children: r(Text, { dimColor: !0, children: ["Feedback: ", ze, Xe] }) })),
      ($[8] = ze),
      ($[9] = Xe),
      ($[10] = rt));
  else rt = $[10];
  return rt;
}
//@ chunk-18hwfzwa.js:1002399-1002626 layout
var isShareKey = (h) => h === "1",
  FOLLOWUP_HINTS = {
    good: "tell us what went well",
    bad: "tell us what went wrong",
    fine: "tell us more",
    not_sure: "tell us more",
  },
  FOLLOWUP_TITLES = {
    good: "What went well?",
    bad: "What went wrong?",
    fine: "Tell us more",
    not_sure: "Tell us more",
  };
//@ chunk-18hwfzwa.js:1002626-1004284 fingerprint = FeedbackSurveyThanks (0.626)
function FeedbackSurveyThanks(t0) {
  let $ = w(24),
    {
      lastResponse: lastResponse,
      inputValue: inputValue,
      setInputValue: setInputValue,
      onRequestFeedback: onRequestFeedback,
      appearanceId: appearanceId,
      surveyType: surveyType,
      followupArmActive: followupArmActive,
      thanksFromFollowup: thanksFromFollowup,
    } = t0,
    We = followupArmActive === void 0 ? !1 : followupArmActive,
    ze = thanksFromFollowup === void 0 ? !1 : thanksFromFollowup,
    Xe = lastResponse && lastResponse !== "dismissed" ? lastResponse : null,
    rt = Xe ? "/feedback" : null,
    [kt] = y(_fo),
    t1 = Boolean(onRequestFeedback && Xe && !(kt || (rt === "/feedback" && We && Xe !== null))),
    Et = Qke(),
    Lt;
  if ($[0] !== ze) ((Lt = ze ? {} : { mountDelayMs: 0 }), ($[0] = ze), ($[1] = Lt));
  else Lt = $[1];
  let oo;
  if (
    $[2] !== appearanceId ||
    $[3] !== Et ||
    $[4] !== rt ||
    $[5] !== Xe ||
    $[6] !== lastResponse ||
    $[7] !== onRequestFeedback ||
    $[8] !== setInputValue ||
    $[9] !== surveyType
  )
    ((oo = () => {
      if (
        (setInputValue(""),
        logEvent("tengu_feedback_survey_event", {
          ...Et,
          event_type: lit_2("followup_accepted"),
          response: fromEnumOpt(lastResponse),
          ...(appearanceId && { appearance_id: ye(appearanceId) }),
          ...(surveyType && { survey_type: fromEnum(surveyType) }),
        }),
        Xe && rt === "/feedback" && appearanceId && surveyType)
      )
        Xke({ appearanceId: appearanceId, response: Xe, surveyType: surveyType, setAt: Date.now() });
      if (rt) onRequestFeedback?.(rt);
    }),
      ($[2] = appearanceId),
      ($[3] = Et),
      ($[4] = rt),
      ($[5] = Xe),
      ($[6] = lastResponse),
      ($[7] = onRequestFeedback),
      ($[8] = setInputValue),
      ($[9] = surveyType),
      ($[10] = oo));
  else oo = $[10];
  let Xt;
  if ($[11] !== inputValue || $[12] !== t1 || $[13] !== Lt || $[14] !== oo)
    ((Xt = { inputValue: inputValue, isValidDigit: isShareKey, enabled: t1, once: !0, ...Lt, onDigit: oo }),
      ($[11] = inputValue),
      ($[12] = t1),
      ($[13] = Lt),
      ($[14] = oo),
      ($[15] = Xt));
  else Xt = $[15];
  useDigitHotkeys(Xt);
  let io;
  if ($[16] === MEMO_CACHE_SENTINEL) ((io = e(Text, { color: "success", children: S$ })), ($[16] = io));
  else io = $[16];
  let so;
  if ($[17] !== kt || $[18] !== rt || $[19] !== Xe || $[20] !== t1)
    ((so =
      t1 && Xe && rt
        ? r(Text, {
            dimColor: !0,
            children: [
              "(Optional) Press [",
              e(Text, { color: "ansi:cyan", children: "1" }),
              "] to",
              " ",
              FOLLOWUP_HINTS[Xe],
              " \xB7 ",
              rt,
            ],
          })
        : kt
          ? null
          : e(Text, { dimColor: !0, children: "Use /feedback to share detailed feedback anytime." })),
      ($[17] = kt),
      ($[18] = rt),
      ($[19] = Xe),
      ($[20] = t1),
      ($[21] = so));
  else so = $[21];
  let po;
  if ($[22] !== so)
    ((po = r(Box, { marginTop: 1, flexDirection: "column", children: [io, so] })),
      ($[22] = so),
      ($[23] = po));
  else po = $[23];
  return po;
}
//@ chunk-18hwfzwa.js:1004284-1004288 placement
j();
//@ chunk-18hwfzwa.js:1004288-1004326 placement
function Lfo(kn) {
  return kn.length === 1;
}

export { Lfo, FeedbackSurvey };
