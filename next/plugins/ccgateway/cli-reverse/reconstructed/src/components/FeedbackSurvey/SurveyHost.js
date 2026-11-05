/**
 * components/FeedbackSurvey/SurveyHost.tsx
 *
 * 2.1.316 新增。统一挂载各类调查的宿主组件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (12)
 * attribution: placement 12
 */
import { init_react_production, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useStoreValue } from "../../screens/repl/storeHooks.js";
import { pickActiveSurvey, PluginSurveyQuestion } from "./PluginSurvey.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FeedbackSurvey } from "./FeedbackSurvey.js";
import { SurveyCard } from "./SurveyCard.js";
import { logForDebugging } from "../../utils/debug.js";
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { createSignal } from "../../utils/signal.js";
import { Text, Box } from "../../ink/components/Text.js";
import { logEvent } from "../../services/analytics/index.js";
import { env } from "../../utils/env.js";
import { logError } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { sumAssistantTokensSince } from "../../utils/tokens.js";
import { getDynamicConfig_BLOCKS_ON_INIT } from "../../services/analytics/growthbook.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { collectTrailingAssistantTexts } from "../../utils/messages.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1015203-1015207 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1015203", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1022746-1022750 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1022746", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1024777-1024781 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1024777", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1043922-1043938 placement
function noopSelect() {}
//@ chunk-czq1j3j2.js:1043938-1043954 placement
function noopUndo() {}
//@ chunk-czq1j3j2.js:1043954-1050068 placement
/**
 * SurveyHost：统一挂载反馈、长上下文、记忆、压缩后、插件、组织等各类调查，保证同一时间只显示一个。
 */
function SurveyHost(props) {
  let $ = useMemoCache(83);
  let {
    postCompactSurvey,
    longContextSurvey,
    pluginSurvey,
    memorySurvey,
    feedbackSurvey,
    frustrationDetection,
    orgSurvey,
    setInputValue,
    inputRowReplaced,
    handleSurveyRequestFeedback,
  } = props;
  let inputValue = useStoreValue();
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
      let postCompactElement;
      if (
        $[0] !== handleSurveyRequestFeedback ||
        $[1] !== inputValue ||
        $[2] !== postCompactSurvey.abandon ||
        $[3] !== postCompactSurvey.appearanceId ||
        $[4] !== postCompactSurvey.handleSelect ||
        $[5] !== postCompactSurvey.handleUndo ||
        $[6] !== postCompactSurvey.lastResponse ||
        $[7] !== postCompactSurvey.state ||
        $[8] !== setInputValue
      ) {
        postCompactElement = jsxProd_default(FeedbackSurvey, {
          state: postCompactSurvey.state,
          thanksFromFollowup: false,
          lastResponse: postCompactSurvey.lastResponse,
          handleSelect: postCompactSurvey.handleSelect,
          handleUndo: postCompactSurvey.handleUndo,
          onAbandon: postCompactSurvey.abandon,
          inputValue,
          setInputValue,
          onRequestFeedback: handleSurveyRequestFeedback,
          appearanceId: postCompactSurvey.appearanceId,
          surveyType: "post_compact",
        });
        $[0] = handleSurveyRequestFeedback;
        $[1] = inputValue;
        $[2] = postCompactSurvey.abandon;
        $[3] = postCompactSurvey.appearanceId;
        $[4] = postCompactSurvey.handleSelect;
        $[5] = postCompactSurvey.handleUndo;
        $[6] = postCompactSurvey.lastResponse;
        $[7] = postCompactSurvey.state;
        $[8] = setInputValue;
        $[9] = postCompactElement;
      } else postCompactElement = $[9];
      return postCompactElement;
    }
    case "longContext": {
      let longContextElement;
      if (
        $[10] !== handleSurveyRequestFeedback ||
        $[11] !== inputValue ||
        $[12] !== longContextSurvey.abandon ||
        $[13] !== longContextSurvey.appearanceId ||
        $[14] !== longContextSurvey.handleSelect ||
        $[15] !== longContextSurvey.handleUndo ||
        $[16] !== longContextSurvey.lastResponse ||
        $[17] !== longContextSurvey.question ||
        $[18] !== longContextSurvey.state ||
        $[19] !== setInputValue
      ) {
        longContextElement = jsxProd_default(FeedbackSurvey, {
          state: longContextSurvey.state,
          thanksFromFollowup: false,
          lastResponse: longContextSurvey.lastResponse,
          handleSelect: longContextSurvey.handleSelect,
          handleUndo: longContextSurvey.handleUndo,
          onAbandon: longContextSurvey.abandon,
          inputValue,
          setInputValue,
          onRequestFeedback: handleSurveyRequestFeedback,
          appearanceId: longContextSurvey.appearanceId,
          surveyType: "long_context",
          message: longContextSurvey.question,
        });
        $[10] = handleSurveyRequestFeedback;
        $[11] = inputValue;
        $[12] = longContextSurvey.abandon;
        $[13] = longContextSurvey.appearanceId;
        $[14] = longContextSurvey.handleSelect;
        $[15] = longContextSurvey.handleUndo;
        $[16] = longContextSurvey.lastResponse;
        $[17] = longContextSurvey.question;
        $[18] = longContextSurvey.state;
        $[19] = setInputValue;
        $[20] = longContextElement;
      } else longContextElement = $[20];
      return longContextElement;
    }
    case "plugin": {
      let message;
      if ($[21] !== pluginSurvey.subject) {
        message = jsxProd_default(PluginSurveyQuestion, {
          subject: pluginSurvey.subject,
        });
        $[21] = pluginSurvey.subject;
        $[22] = message;
      } else message = $[22];
      let pluginElement;
      if (
        $[23] !== handleSurveyRequestFeedback ||
        $[24] !== inputValue ||
        $[25] !== pluginSurvey.abandon ||
        $[26] !== pluginSurvey.handleSelect ||
        $[27] !== pluginSurvey.handleUndo ||
        $[28] !== pluginSurvey.lastResponse ||
        $[29] !== pluginSurvey.state ||
        $[30] !== setInputValue ||
        $[31] !== message
      ) {
        pluginElement = jsxProd_default(FeedbackSurvey, {
          state: pluginSurvey.state,
          thanksFromFollowup: false,
          lastResponse: pluginSurvey.lastResponse,
          handleSelect: pluginSurvey.handleSelect,
          handleUndo: pluginSurvey.handleUndo,
          onAbandon: pluginSurvey.abandon,
          inputValue,
          setInputValue,
          onRequestFeedback: handleSurveyRequestFeedback,
          message,
          messageBold: false,
          showNotSure: true,
        });
        $[23] = handleSurveyRequestFeedback;
        $[24] = inputValue;
        $[25] = pluginSurvey.abandon;
        $[26] = pluginSurvey.handleSelect;
        $[27] = pluginSurvey.handleUndo;
        $[28] = pluginSurvey.lastResponse;
        $[29] = pluginSurvey.state;
        $[30] = setInputValue;
        $[31] = message;
        $[32] = pluginElement;
      } else pluginElement = $[32];
      return pluginElement;
    }
    case "memory": {
      const memoryCitation = memorySurvey.citation ?? undefined;
      let memoryElement;
      if (
        $[33] !== handleSurveyRequestFeedback ||
        $[34] !== inputValue ||
        $[35] !== memorySurvey.abandon ||
        $[36] !== memorySurvey.appearanceId ||
        $[37] !== memorySurvey.handleSelect ||
        $[38] !== memorySurvey.handleTranscriptSelect ||
        $[39] !== memorySurvey.handleUndo ||
        $[40] !== memorySurvey.lastResponse ||
        $[41] !== memorySurvey.state ||
        $[42] !== setInputValue ||
        $[43] !== memoryCitation
      ) {
        memoryElement = jsxProd_default(FeedbackSurvey, {
          state: memorySurvey.state,
          thanksFromFollowup: false,
          lastResponse: memorySurvey.lastResponse,
          handleSelect: memorySurvey.handleSelect,
          handleUndo: memorySurvey.handleUndo,
          onAbandon: memorySurvey.abandon,
          handleTranscriptSelect: memorySurvey.handleTranscriptSelect,
          inputValue,
          setInputValue,
          onRequestFeedback: handleSurveyRequestFeedback,
          appearanceId: memorySurvey.appearanceId,
          surveyType: "memory",
          message: "How well did Claude use its memory? (optional)",
          memoryCitation,
          showNotSure: true,
        });
        $[33] = handleSurveyRequestFeedback;
        $[34] = inputValue;
        $[35] = memorySurvey.abandon;
        $[36] = memorySurvey.appearanceId;
        $[37] = memorySurvey.handleSelect;
        $[38] = memorySurvey.handleTranscriptSelect;
        $[39] = memorySurvey.handleUndo;
        $[40] = memorySurvey.lastResponse;
        $[41] = memorySurvey.state;
        $[42] = setInputValue;
        $[43] = memoryCitation;
        $[44] = memoryElement;
      } else memoryElement = $[44];
      return memoryElement;
    }
    case "feedback": {
      const canUndo = !feedbackSurvey.turnMovedOn;
      const onRequestFeedback = feedbackSurvey.typedOver ? undefined : handleSurveyRequestFeedback;
      let feedbackElement;
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
        $[61] !== inputValue ||
        $[62] !== setInputValue ||
        $[63] !== canUndo ||
        $[64] !== onRequestFeedback
      ) {
        feedbackElement = jsxProd_default(FeedbackSurvey, {
          state: feedbackSurvey.state,
          lastResponse: feedbackSurvey.lastResponse,
          handleSelect: feedbackSurvey.handleSelect,
          handleUndo: feedbackSurvey.handleUndo,
          onAbandon: feedbackSurvey.abandon,
          onTypedOver: feedbackSurvey.handleTypedOver,
          typedOver: feedbackSurvey.typedOver,
          canUndo,
          handleTranscriptSelect: feedbackSurvey.handleTranscriptSelect,
          handleFollowupResolve: feedbackSurvey.handleFollowupResolve,
          followupAskConfig: feedbackSurvey.followupAskConfig,
          followupArmActive: feedbackSurvey.followupArmActive,
          turnInProgress: feedbackSurvey.turnInProgress,
          submittingShare: feedbackSurvey.submittingShare,
          thanksFromFollowup: feedbackSurvey.thanksFromFollowup,
          transcriptBundlePath: feedbackSurvey.transcriptBundlePath,
          inputValue,
          setInputValue,
          onRequestFeedback,
          appearanceId: feedbackSurvey.appearanceId,
          surveyType: "session",
        });
        $[45] = feedbackSurvey.abandon;
        $[46] = feedbackSurvey.appearanceId;
        $[47] = feedbackSurvey.followupArmActive;
        $[48] = feedbackSurvey.followupAskConfig;
        $[49] = feedbackSurvey.handleFollowupResolve;
        $[50] = feedbackSurvey.handleSelect;
        $[51] = feedbackSurvey.handleTranscriptSelect;
        $[52] = feedbackSurvey.handleTypedOver;
        $[53] = feedbackSurvey.handleUndo;
        $[54] = feedbackSurvey.lastResponse;
        $[55] = feedbackSurvey.state;
        $[56] = feedbackSurvey.submittingShare;
        $[57] = feedbackSurvey.thanksFromFollowup;
        $[58] = feedbackSurvey.transcriptBundlePath;
        $[59] = feedbackSurvey.turnInProgress;
        $[60] = feedbackSurvey.typedOver;
        $[61] = inputValue;
        $[62] = setInputValue;
        $[63] = canUndo;
        $[64] = onRequestFeedback;
        $[65] = feedbackElement;
      } else feedbackElement = $[65];
      return feedbackElement;
    }
    case "orgSurvey": {
      let orgSurveyElement;
      if (
        $[66] !== inputRowReplaced ||
        $[67] !== inputValue ||
        $[68] !== orgSurvey.dismiss ||
        $[69] !== orgSurvey.ignore ||
        $[70] !== orgSurvey.onShown ||
        $[71] !== orgSurvey.start ||
        $[72] !== orgSurvey.starting ||
        $[73] !== orgSurvey.state ||
        $[74] !== orgSurvey.survey ||
        $[75] !== setInputValue
      ) {
        orgSurveyElement = jsxProd_default(SurveyCard, {
          state: orgSurvey.state,
          survey: orgSurvey.survey,
          starting: orgSurvey.starting,
          inputValue,
          setInputValue,
          inputRowReplaced,
          onShown: orgSurvey.onShown,
          onStart: orgSurvey.start,
          onDismiss: orgSurvey.dismiss,
          onIgnore: orgSurvey.ignore,
        });
        $[66] = inputRowReplaced;
        $[67] = inputValue;
        $[68] = orgSurvey.dismiss;
        $[69] = orgSurvey.ignore;
        $[70] = orgSurvey.onShown;
        $[71] = orgSurvey.start;
        $[72] = orgSurvey.starting;
        $[73] = orgSurvey.state;
        $[74] = orgSurvey.survey;
        $[75] = setInputValue;
        $[76] = orgSurveyElement;
      } else orgSurveyElement = $[76];
      return orgSurveyElement;
    }
    case "frustration": {
      let frustrationElement;
      if (
        $[77] !== frustrationDetection.handleTranscriptSelect ||
        $[78] !== frustrationDetection.state ||
        $[79] !== frustrationDetection.transcriptBundlePath ||
        $[80] !== inputValue ||
        $[81] !== setInputValue
      ) {
        frustrationElement = jsxProd_default(FeedbackSurvey, {
          state: frustrationDetection.state,
          thanksFromFollowup: false,
          lastResponse: null,
          handleSelect: noopSelect,
          handleUndo: noopUndo,
          handleTranscriptSelect: frustrationDetection.handleTranscriptSelect,
          transcriptBundlePath: frustrationDetection.transcriptBundlePath,
          inputValue,
          setInputValue,
        });
        $[77] = frustrationDetection.handleTranscriptSelect;
        $[78] = frustrationDetection.state;
        $[79] = frustrationDetection.transcriptBundlePath;
        $[80] = inputValue;
        $[81] = setInputValue;
        $[82] = frustrationElement;
      } else frustrationElement = $[82];
      return frustrationElement;
    }
    case null: {
      return null;
    }
    default: {
      return null;
    }
  }
}
//@ chunk-czq1j3j2.js:1050068-1050725 placement
/**
 * 订阅消息存储，增量统计助手消息 token 总数（只处理新增或变动的尾部消息），作为 useSyncExternalStore 的外部源。
 */
class AssistantTokenCounter {
  #e;
  #t = new Set();
  #o = createSignal();
  #n;
  #r = 0;
  #s = false;
  #l = false;
  #i = [];
  #a = [];
  constructor(transcript) {
    this.#e = transcript;
    this.#d();
    this.#n = transcript.subscribe(this.#c);
  }
  getSnapshot = () => this.#r;
  subscribe = (listener) => this.#o.subscribe(listener);
  dispose() {
    if (this.#l) return;
    this.#l = true;
    this.#n();
  }
  #c = () => {
    if (this.#s || this.#l) return;
    this.#s = true;
    queueMicrotask(() => {
      this.#s = false;
      if (this.#l) return;
      this.#d();
    });
  };
  #d() {
    let messages = this.#e.getSnapshot();
    let previousMessages = this.#i;
    let min = Math.min(previousMessages.length, messages.length);
    let unchangedCount = 0;
    while (unchangedCount < min && previousMessages[unchangedCount] === messages[unchangedCount])
      unchangedCount++;
    this.#i = messages;
    let pendingIndexes = this.#a;
    this.#a = [];
    let addedTokens = 0;
    for (let index of pendingIndexes) {
      if (index >= unchangedCount) continue;
      addedTokens += sumAssistantTokensSince([messages[index]], this.#t, 0, () => this.#a.push(index));
    }
    addedTokens += sumAssistantTokensSince(messages, this.#t, unchangedCount, (index) => this.#a.push(index));
    if (addedTokens > 0) {
      this.#r += addedTokens;
      this.#o.emit();
    }
  }
}
//@ chunk-czq1j3j2.js:1050733-1050804 placement
function useDynamicConfigValue(key, fallback) {
  let [value, setValue] = useState(fallback);
  useEffect(() => {
    getDynamicConfig_BLOCKS_ON_INIT(key, fallback).then(setValue);
  }, [key, fallback]);
  return value;
}
//@ chunk-czq1j3j2.js:1050808-1050821 placement
var DELAYED_FLAG_DEFAULT_MS = 2000;
//@ chunk-czq1j3j2.js:1050821-1050961 placement
/**
 * 条件 h 为假时，延迟 x 毫秒（默认 2000）后变为真；h 为真时立即复位为假。
 */
function useDelayedFlag(busy, delayMs = DELAYED_FLAG_DEFAULT_MS) {
  let clock = useClock();
  let [elapsed, setElapsed] = useState(!busy);
  useEffect(() => {
    if (busy) {
      setElapsed(false);
      return;
    }
    let timer = clock.setTimeout(() => setElapsed(true), delayMs);
    return () => timer();
  }, [busy, clock, delayMs]);
  return elapsed;
}
//@ chunk-czq1j3j2.js:1050961-1050996 placement
var NUMBERED_LINE_RE = /^[ \t]*\d{1,2}[.)][ \t]/m;
//@ chunk-czq1j3j2.js:1050996-1051067 placement
function endsWithNumberedList(messages) {
  let [last] = collectTrailingAssistantTexts(messages, 1).messages;
  return last !== undefined && NUMBERED_LINE_RE.test(last);
}
export { endsWithNumberedList, AssistantTokenCounter, SurveyHost, useDelayedFlag, useDynamicConfigValue };
