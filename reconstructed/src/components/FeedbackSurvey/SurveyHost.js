/**
 * components/FeedbackSurvey/SurveyHost.tsx
 *
 * 2.1.316 新增。统一挂载各类调查的宿主组件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (12)
 * attribution: placement 12
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { ZD } from "../../screens/repl/storeHooks.js";
import { pickActiveSurvey, PluginSurveyQuestion } from "./PluginSurvey.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FeedbackSurvey } from "./FeedbackSurvey.js";
import { SurveyCard } from "./SurveyCard.js";
import { logForDebugging } from "../../utils/debug.js";
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
import { createSignal } from "../../utils/signal.js";
import { Text, Box } from "../../ink/components/Text.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../../services/analytics/index.js";
import { errorMessage } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { sumAssistantTokensSince } from "../../utils/tokens.js";
import { j, y, P } from "../../../vendor/react/cjs/react.production.js";
import { getDynamicConfig_BLOCKS_ON_INIT } from "../../services/analytics/growthbook.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { collectTrailingAssistantTexts } from "../../utils/messages.js";

//@ chunk-18hwfzwa.js:1009885-1009901 placement
function qfo() {}
//@ chunk-18hwfzwa.js:1009901-1009917 placement
function $fo() {}
/**
 * SurveyHost：统一挂载反馈、长上下文、记忆、压缩后、插件、组织等各类调查，保证同一时间只显示一个。
 */
//@ chunk-18hwfzwa.js:1009917-1016030 placement
function SurveyHost(h) {
  let $ = w(83),
    {
      postCompactSurvey: postCompactSurvey,
      longContextSurvey: longContextSurvey,
      pluginSurvey: pluginSurvey,
      memorySurvey: memorySurvey,
      feedbackSurvey: feedbackSurvey,
      frustrationDetection: frustrationDetection,
      orgSurvey: orgSurvey,
      setInputValue: setInputValue,
      inputRowReplaced: inputRowReplaced,
      handleSurveyRequestFeedback: handleSurveyRequestFeedback,
    } = h,
    Xe = ZD();
  switch (
    pickActiveSurvey({
      postCompact: postCompactSurvey.state,
      longContext: longContextSurvey.state,
      plugin: pluginSurvey.state,
      memory: memorySurvey.state,
      feedback: feedbackSurvey.state,
      orgSurvey: orgSurvey.state,
      frustration: frustrationDetection.state,
    })
  ) {
    case "postCompact": {
      let At;
      if (
        $[0] !== handleSurveyRequestFeedback ||
        $[1] !== Xe ||
        $[2] !== postCompactSurvey.abandon ||
        $[3] !== postCompactSurvey.appearanceId ||
        $[4] !== postCompactSurvey.handleSelect ||
        $[5] !== postCompactSurvey.handleUndo ||
        $[6] !== postCompactSurvey.lastResponse ||
        $[7] !== postCompactSurvey.state ||
        $[8] !== setInputValue
      )
        ((At = e(FeedbackSurvey, {
          state: postCompactSurvey.state,
          thanksFromFollowup: !1,
          lastResponse: postCompactSurvey.lastResponse,
          handleSelect: postCompactSurvey.handleSelect,
          handleUndo: postCompactSurvey.handleUndo,
          onAbandon: postCompactSurvey.abandon,
          inputValue: Xe,
          setInputValue: setInputValue,
          onRequestFeedback: handleSurveyRequestFeedback,
          appearanceId: postCompactSurvey.appearanceId,
          surveyType: "post_compact",
        })),
          ($[0] = handleSurveyRequestFeedback),
          ($[1] = Xe),
          ($[2] = postCompactSurvey.abandon),
          ($[3] = postCompactSurvey.appearanceId),
          ($[4] = postCompactSurvey.handleSelect),
          ($[5] = postCompactSurvey.handleUndo),
          ($[6] = postCompactSurvey.lastResponse),
          ($[7] = postCompactSurvey.state),
          ($[8] = setInputValue),
          ($[9] = At));
      else At = $[9];
      return At;
    }
    case "longContext": {
      let At;
      if (
        $[10] !== handleSurveyRequestFeedback ||
        $[11] !== Xe ||
        $[12] !== longContextSurvey.abandon ||
        $[13] !== longContextSurvey.appearanceId ||
        $[14] !== longContextSurvey.handleSelect ||
        $[15] !== longContextSurvey.handleUndo ||
        $[16] !== longContextSurvey.lastResponse ||
        $[17] !== longContextSurvey.question ||
        $[18] !== longContextSurvey.state ||
        $[19] !== setInputValue
      )
        ((At = e(FeedbackSurvey, {
          state: longContextSurvey.state,
          thanksFromFollowup: !1,
          lastResponse: longContextSurvey.lastResponse,
          handleSelect: longContextSurvey.handleSelect,
          handleUndo: longContextSurvey.handleUndo,
          onAbandon: longContextSurvey.abandon,
          inputValue: Xe,
          setInputValue: setInputValue,
          onRequestFeedback: handleSurveyRequestFeedback,
          appearanceId: longContextSurvey.appearanceId,
          surveyType: "long_context",
          message: longContextSurvey.question,
        })),
          ($[10] = handleSurveyRequestFeedback),
          ($[11] = Xe),
          ($[12] = longContextSurvey.abandon),
          ($[13] = longContextSurvey.appearanceId),
          ($[14] = longContextSurvey.handleSelect),
          ($[15] = longContextSurvey.handleUndo),
          ($[16] = longContextSurvey.lastResponse),
          ($[17] = longContextSurvey.question),
          ($[18] = longContextSurvey.state),
          ($[19] = setInputValue),
          ($[20] = At));
      else At = $[20];
      return At;
    }
    case "plugin": {
      let At;
      if ($[21] !== pluginSurvey.subject)
        ((At = e(PluginSurveyQuestion, { subject: pluginSurvey.subject })),
          ($[21] = pluginSurvey.subject),
          ($[22] = At));
      else At = $[22];
      let It;
      if (
        $[23] !== handleSurveyRequestFeedback ||
        $[24] !== Xe ||
        $[25] !== pluginSurvey.abandon ||
        $[26] !== pluginSurvey.handleSelect ||
        $[27] !== pluginSurvey.handleUndo ||
        $[28] !== pluginSurvey.lastResponse ||
        $[29] !== pluginSurvey.state ||
        $[30] !== setInputValue ||
        $[31] !== At
      )
        ((It = e(FeedbackSurvey, {
          state: pluginSurvey.state,
          thanksFromFollowup: !1,
          lastResponse: pluginSurvey.lastResponse,
          handleSelect: pluginSurvey.handleSelect,
          handleUndo: pluginSurvey.handleUndo,
          onAbandon: pluginSurvey.abandon,
          inputValue: Xe,
          setInputValue: setInputValue,
          onRequestFeedback: handleSurveyRequestFeedback,
          message: At,
          messageBold: !1,
          showNotSure: !0,
        })),
          ($[23] = handleSurveyRequestFeedback),
          ($[24] = Xe),
          ($[25] = pluginSurvey.abandon),
          ($[26] = pluginSurvey.handleSelect),
          ($[27] = pluginSurvey.handleUndo),
          ($[28] = pluginSurvey.lastResponse),
          ($[29] = pluginSurvey.state),
          ($[30] = setInputValue),
          ($[31] = At),
          ($[32] = It));
      else It = $[32];
      return It;
    }
    case "memory": {
      const At = memorySurvey.citation ?? void 0;
      let It;
      if (
        $[33] !== handleSurveyRequestFeedback ||
        $[34] !== Xe ||
        $[35] !== memorySurvey.abandon ||
        $[36] !== memorySurvey.appearanceId ||
        $[37] !== memorySurvey.handleSelect ||
        $[38] !== memorySurvey.handleTranscriptSelect ||
        $[39] !== memorySurvey.handleUndo ||
        $[40] !== memorySurvey.lastResponse ||
        $[41] !== memorySurvey.state ||
        $[42] !== setInputValue ||
        $[43] !== At
      )
        ((It = e(FeedbackSurvey, {
          state: memorySurvey.state,
          thanksFromFollowup: !1,
          lastResponse: memorySurvey.lastResponse,
          handleSelect: memorySurvey.handleSelect,
          handleUndo: memorySurvey.handleUndo,
          onAbandon: memorySurvey.abandon,
          handleTranscriptSelect: memorySurvey.handleTranscriptSelect,
          inputValue: Xe,
          setInputValue: setInputValue,
          onRequestFeedback: handleSurveyRequestFeedback,
          appearanceId: memorySurvey.appearanceId,
          surveyType: "memory",
          message: "How well did Claude use its memory? (optional)",
          memoryCitation: At,
          showNotSure: !0,
        })),
          ($[33] = handleSurveyRequestFeedback),
          ($[34] = Xe),
          ($[35] = memorySurvey.abandon),
          ($[36] = memorySurvey.appearanceId),
          ($[37] = memorySurvey.handleSelect),
          ($[38] = memorySurvey.handleTranscriptSelect),
          ($[39] = memorySurvey.handleUndo),
          ($[40] = memorySurvey.lastResponse),
          ($[41] = memorySurvey.state),
          ($[42] = setInputValue),
          ($[43] = At),
          ($[44] = It));
      else It = $[44];
      return It;
    }
    case "feedback": {
      const At = !feedbackSurvey.turnMovedOn;
      const It = feedbackSurvey.typedOver ? void 0 : handleSurveyRequestFeedback;
      let Ot;
      if (
        $[45] !== feedbackSurvey.abandon ||
        $[46] !== feedbackSurvey.appearanceId ||
        $[47] !== feedbackSurvey.followupArmActive ||
        $[48] !== feedbackSurvey.followupAskConfig ||
        $[49] !== feedbackSurvey.handleFollowupResolve ||
        $[50] !== feedbackSurvey.handleSelect ||
        $[51] !== feedbackSurvey.handleTranscriptSelect ||
        $[52] !== feedbackSurvey.handleTypedOver ||
        $[53] !== feedbackSurvey.handleUndo ||
        $[54] !== feedbackSurvey.lastResponse ||
        $[55] !== feedbackSurvey.state ||
        $[56] !== feedbackSurvey.submittingShare ||
        $[57] !== feedbackSurvey.thanksFromFollowup ||
        $[58] !== feedbackSurvey.transcriptBundlePath ||
        $[59] !== feedbackSurvey.turnInProgress ||
        $[60] !== feedbackSurvey.typedOver ||
        $[61] !== Xe ||
        $[62] !== setInputValue ||
        $[63] !== At ||
        $[64] !== It
      )
        ((Ot = e(FeedbackSurvey, {
          state: feedbackSurvey.state,
          lastResponse: feedbackSurvey.lastResponse,
          handleSelect: feedbackSurvey.handleSelect,
          handleUndo: feedbackSurvey.handleUndo,
          onAbandon: feedbackSurvey.abandon,
          onTypedOver: feedbackSurvey.handleTypedOver,
          typedOver: feedbackSurvey.typedOver,
          canUndo: At,
          handleTranscriptSelect: feedbackSurvey.handleTranscriptSelect,
          handleFollowupResolve: feedbackSurvey.handleFollowupResolve,
          followupAskConfig: feedbackSurvey.followupAskConfig,
          followupArmActive: feedbackSurvey.followupArmActive,
          turnInProgress: feedbackSurvey.turnInProgress,
          submittingShare: feedbackSurvey.submittingShare,
          thanksFromFollowup: feedbackSurvey.thanksFromFollowup,
          transcriptBundlePath: feedbackSurvey.transcriptBundlePath,
          inputValue: Xe,
          setInputValue: setInputValue,
          onRequestFeedback: It,
          appearanceId: feedbackSurvey.appearanceId,
          surveyType: "session",
        })),
          ($[45] = feedbackSurvey.abandon),
          ($[46] = feedbackSurvey.appearanceId),
          ($[47] = feedbackSurvey.followupArmActive),
          ($[48] = feedbackSurvey.followupAskConfig),
          ($[49] = feedbackSurvey.handleFollowupResolve),
          ($[50] = feedbackSurvey.handleSelect),
          ($[51] = feedbackSurvey.handleTranscriptSelect),
          ($[52] = feedbackSurvey.handleTypedOver),
          ($[53] = feedbackSurvey.handleUndo),
          ($[54] = feedbackSurvey.lastResponse),
          ($[55] = feedbackSurvey.state),
          ($[56] = feedbackSurvey.submittingShare),
          ($[57] = feedbackSurvey.thanksFromFollowup),
          ($[58] = feedbackSurvey.transcriptBundlePath),
          ($[59] = feedbackSurvey.turnInProgress),
          ($[60] = feedbackSurvey.typedOver),
          ($[61] = Xe),
          ($[62] = setInputValue),
          ($[63] = At),
          ($[64] = It),
          ($[65] = Ot));
      else Ot = $[65];
      return Ot;
    }
    case "orgSurvey": {
      let At;
      if (
        $[66] !== inputRowReplaced ||
        $[67] !== Xe ||
        $[68] !== orgSurvey.dismiss ||
        $[69] !== orgSurvey.ignore ||
        $[70] !== orgSurvey.onShown ||
        $[71] !== orgSurvey.start ||
        $[72] !== orgSurvey.starting ||
        $[73] !== orgSurvey.state ||
        $[74] !== orgSurvey.survey ||
        $[75] !== setInputValue
      )
        ((At = e(SurveyCard, {
          state: orgSurvey.state,
          survey: orgSurvey.survey,
          starting: orgSurvey.starting,
          inputValue: Xe,
          setInputValue: setInputValue,
          inputRowReplaced: inputRowReplaced,
          onShown: orgSurvey.onShown,
          onStart: orgSurvey.start,
          onDismiss: orgSurvey.dismiss,
          onIgnore: orgSurvey.ignore,
        })),
          ($[66] = inputRowReplaced),
          ($[67] = Xe),
          ($[68] = orgSurvey.dismiss),
          ($[69] = orgSurvey.ignore),
          ($[70] = orgSurvey.onShown),
          ($[71] = orgSurvey.start),
          ($[72] = orgSurvey.starting),
          ($[73] = orgSurvey.state),
          ($[74] = orgSurvey.survey),
          ($[75] = setInputValue),
          ($[76] = At));
      else At = $[76];
      return At;
    }
    case "frustration": {
      let At;
      if (
        $[77] !== frustrationDetection.handleTranscriptSelect ||
        $[78] !== frustrationDetection.state ||
        $[79] !== frustrationDetection.transcriptBundlePath ||
        $[80] !== Xe ||
        $[81] !== setInputValue
      )
        ((At = e(FeedbackSurvey, {
          state: frustrationDetection.state,
          thanksFromFollowup: !1,
          lastResponse: null,
          handleSelect: qfo,
          handleUndo: $fo,
          handleTranscriptSelect: frustrationDetection.handleTranscriptSelect,
          transcriptBundlePath: frustrationDetection.transcriptBundlePath,
          inputValue: Xe,
          setInputValue: setInputValue,
        })),
          ($[77] = frustrationDetection.handleTranscriptSelect),
          ($[78] = frustrationDetection.state),
          ($[79] = frustrationDetection.transcriptBundlePath),
          ($[80] = Xe),
          ($[81] = setInputValue),
          ($[82] = At));
      else At = $[82];
      return At;
    }
    case null: {
      return null;
    }
    default: {
      return null;
    }
  }
}
/**
 * 订阅消息存储，增量统计助手消息 token 总数（只处理新增或变动的尾部消息），作为 useSyncExternalStore 的外部源。
 */
//@ chunk-18hwfzwa.js:1016030-1016687 placement
class AssistantTokenCounter {
  #e;
  #t = new Set();
  #o = createSignal();
  #n;
  #s = 0;
  #r = !1;
  #c = !1;
  #i = [];
  #a = [];
  constructor(h) {
    ((this.#e = h), this.#d(), (this.#n = h.subscribe(this.#l)));
  }
  getSnapshot = () => this.#s;
  subscribe = (h) => this.#o.subscribe(h);
  dispose() {
    if (this.#c) return;
    ((this.#c = !0), this.#n());
  }
  #l = () => {
    if (this.#r || this.#c) return;
    ((this.#r = !0),
      queueMicrotask(() => {
        if (((this.#r = !1), this.#c)) return;
        this.#d();
      }));
  };
  #d() {
    let snapshot = this.#e.getSnapshot(),
      x = this.#i,
      min = Math.min(x.length, snapshot.length),
      L = 0;
    while (L < min && x[L] === snapshot[L]) L++;
    this.#i = snapshot;
    let ee = this.#a;
    this.#a = [];
    let ke = 0;
    for (let Re of ee) {
      if (Re >= L) continue;
      ke += sumAssistantTokensSince([snapshot[Re]], this.#t, 0, () => this.#a.push(Re));
    }
    if (((ke += sumAssistantTokensSince(snapshot, this.#t, L, (Re) => this.#a.push(Re))), ke > 0))
      ((this.#s += ke), this.#o.emit());
  }
}
//@ chunk-18hwfzwa.js:1016687-1016691 placement
j();
//@ chunk-18hwfzwa.js:1016691-1016695 placement
j();
//@ chunk-18hwfzwa.js:1016695-1016766 placement
function YM(h, x) {
  let [D, L] = y(x);
  return (
    P(() => {
      getDynamicConfig_BLOCKS_ON_INIT(h, x).then(L);
    }, [h, x]),
    D
  );
}
//@ chunk-18hwfzwa.js:1016766-1016770 placement
j();
//@ chunk-18hwfzwa.js:1016770-1016783 placement
var Vfo = 2000;
/**
 * 条件 h 为假时，延迟 x 毫秒（默认 2000）后变为真；h 为真时立即复位为假。
 */
//@ chunk-18hwfzwa.js:1016783-1016923 placement
function useDelayedFlag(h, x = Vfo) {
  let D = useClock(),
    [L, ee] = y(!h);
  return (
    P(() => {
      if (h) {
        ee(!1);
        return;
      }
      let ke = D.setTimeout(() => ee(!0), x);
      return () => ke();
    }, [h, D, x]),
    L
  );
}
//@ chunk-18hwfzwa.js:1016923-1016958 placement
var Kfo = /^[ \t]*\d{1,2}[.)][ \t]/m;
//@ chunk-18hwfzwa.js:1016958-1017029 placement
function JM(h) {
  let [x] = collectTrailingAssistantTexts(h, 1).messages;
  return x !== void 0 && Kfo.test(x);
}

export { JM, YM, useDelayedFlag, AssistantTokenCounter, SurveyHost };
