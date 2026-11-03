/**
 * components/permissions/AskUserQuestionPermissionRequest/AskUserQuestionPermissionRequest.tsx
 *
 * AskUserQuestion 工具的问答对话框：多问题导航、单选/多选/自由输入、图片附件与预览、提交生成答案结果。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/AskUserQuestionPermissionRequest/AskUserQuestionPermissionRequest.tsx
 * pieces: chunk-18hwfzwa.js (28), chunk-mvvq2nx1.js (1)
 * attribution: fingerprint 3, sole-consumer 3, file-local 1, layout 17, callgraph-fingerprint 2, placement 3
 */
import { j, Oo, y, R, P } from "../../../../vendor/react/cjs/react.production.js";
import {
  NOTIF_ACTIVE_THRESHOLD_MS,
  flushInteractionTime,
  getTerminalFocus,
  getLastInteractionTime,
} from "../../../bootstrap/state.js";
import { env } from "../../../utils/env.js";
import { useInterval } from "../../../ink/components/Input.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import { logError } from "../../../utils/log.js";
import { splitQuestionTitleBody } from "../permissionCardKinds.js";
import {
  displayField,
  uniqueLabels,
  replaceLineBreaks,
  $Rt,
  safeLabel,
  hasVisibleText,
  hasSuspiciousText,
  displayText,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import { MAX_PREVIEW_LENGTH } from "./PreviewBox.js";
import { AXo } from "../../../services/requestUserDialog.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { qd } from "../../../hooks/useSettings.js";
import { Sz } from "../../../utils/cliHighlight.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { getAskUserQuestionTimeout } from "../../../utils/settings/settings.js";
import { actionKeysNamespace } from "../../pluginUi/render/actionKeys.js";
import { useMultipleChoiceState } from "./use-multiple-choice-state.js";
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { AskUserQuestionTool } from "../../../tools/AskUserQuestionTool/AskUserQuestionTool.js";
import { logForDebugging } from "../../../utils/debug.js";
import { useTheme } from "../../design-system/ThemeProvider.js";
import { renderMarkdownToAnsi } from "../../../utils/markdown.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { useSetAppState, useAppState } from "../../../state/AppState.js";
import { ZR, zZ } from "../../../history.js";
import { BH } from "../../../state/sliceHelpers.js";
import { recordImagePath, cLe } from "../../../utils/imageStore.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../../../hooks/useMainLoopModel.js";
import { imageLimitsForModel } from "../../../utils/attachmentMedia.js";
import { getPlanFilePath } from "../../../utils/plans.js";
import { useRegisterOverlay } from "../../../context/overlayContext.js";
import { fp } from "./QuestionNavigationBar.js";
import { logEvent } from "../../../services/analytics/index.js";
import { gn } from "../../../utils/shortHash.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { count } from "../../../utils/collections.js";
import { fromEnum } from "../../../services/analytics/safeMetadata.js";
import { fBt } from "../../../tools/AskUserQuestionTool/answerValidation.js";
import { MessageActionsKeybindings } from "../../messageActions.js";
import { isBgSession } from "../../../utils/concurrentSessions.js";
import { QuestionView } from "./QuestionView.js";
import { SubmitQuestionsView } from "./SubmitQuestionsView.js";
import { Ratchet } from "../../design-system/Ratchet.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { B2e } from "../../../plugins/functionHooks/toolCallHooks.js";
import { useStoreSelector } from "../../../hooks/useStoreSelector.js";
import { qtt } from "../../../utils/messages/nonUserMessages.js";
import { maybeResizeAndDownsampleImageBlock, weakSet } from "../../../utils/imageResizer.js";
import { Ph } from "../../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";

//@ chunk-18hwfzwa.js:1287178-1287222 fingerprint = _temp (1)
function eEo(opt) {
  return opt.preview !== void 0;
}
//@ chunk-18hwfzwa.js:1295825-1295829 sole-consumer
j();
//@ chunk-18hwfzwa.js:1295829-1295851 sole-consumer
var mEo = NOTIF_ACTIVE_THRESHOLD_MS,
  pEo = 20000;
/**
 * 无人值守自动继续计时：按最后交互时间与终端焦点计算剩余秒数，接近阈值时显示倒计时，到时调用 onTimeout（返回 false 则重新计时）；支持 CLAUDE_AFK_TIMEOUT_MS / CLAUDE_AFK_COUNTDOWN_MS。
 */
//@ chunk-18hwfzwa.js:1295851-1296488 sole-consumer
function useAfkTimeout({
  enabled: enabled,
  timeoutMs: timeoutMs,
  countdownThresholdMs: countdownThresholdMs,
  onTimeout: onTimeout,
}) {
  ((timeoutMs = env.CLAUDE_AFK_TIMEOUT_MS ?? timeoutMs ?? mEo),
    (countdownThresholdMs = Math.min(countdownThresholdMs ?? env.CLAUDE_AFK_COUNTDOWN_MS ?? pEo, timeoutMs)));
  let ee = Oo(onTimeout),
    ceil = Math.ceil(timeoutMs / 1000),
    [Re, Be] = y(ceil),
    He = R(!1),
    We = R(Date.now());
  (P(() => {
    if (!enabled) return;
    ((We.current = Date.now()), (He.current = !1), Be(ceil));
  }, [enabled, ceil]),
    useInterval(
      () => {
        if (He.current) return;
        flushInteractionTime();
        let now = Date.now();
        if (getTerminalFocus() === !0) We.current = now;
        let rt = now - Math.max(getLastInteractionTime(), We.current),
          kt =
            rt >= timeoutMs - countdownThresholdMs ? Math.max(0, Math.ceil((timeoutMs - rt) / 1000)) : ceil;
        if ((Be(kt), rt >= timeoutMs)) {
          if (((He.current = !0), ee(timeoutMs) === !1)) ((He.current = !1), (We.current = now), Be(ceil));
        }
      },
      enabled ? 1000 : null,
    ));
  let ze = Re * 1000 <= countdownThresholdMs;
  return { remainingSeconds: Re, showCountdown: ze, timeoutMs: timeoutMs };
}
//@ chunk-18hwfzwa.js:1296488-1296530 file-local
function PDo(contents) {
  return Object.values(contents);
}
//@ chunk-18hwfzwa.js:1296530-1296572 layout = _temp (1)
function ADo(c) {
  return c.type === "image";
}
//@ chunk-18hwfzwa.js:1296572-1296626 callgraph-fingerprint = _temp4 (1)
function selectToolPermissionContextMode_2(s) {
  return s.toolPermissionContext.mode;
}
//@ chunk-18hwfzwa.js:1296626-1296668 layout
function IDo(Iu) {
  return Iu.textInputValue;
}
//@ chunk-18hwfzwa.js:1296668-1296746 layout
function EDo(Am) {
  throw (logFeatureBad("ask_user_question_answer", "build_result_failed"), Am);
}
//@ chunk-18hwfzwa.js:1296746-1296788 layout = _temp (1)
function DDo(c) {
  return c.type === "image";
}
//@ chunk-18hwfzwa.js:1296788-1296821 layout
function ODo(nl) {
  return (logError(nl), !1);
}
//@ chunk-18hwfzwa.js:1296821-1296832 layout
var Jmt = 40;
/**
 * 把 AskUserQuestion 的问题转换为显示模型：问题/标题/选项标签去重、描述与预览（过长或可疑内容只显示 withheld）。
 */
//@ chunk-18hwfzwa.js:1296832-1297492 layout
function buildQuestionDisplays(h, x = !1) {
  return h.map((D) => {
    let L = x ? splitQuestionTitleBody(D.question) : void 0,
      ee = displayField(D.question),
      mapped = D.options.map((option) => option.label),
      Re = uniqueLabels(mapped, (Be) => replaceLineBreaks(displayField(Be).text).replace(/\s+/g, " ").trim());
    return {
      key: D.question,
      displayQuestion: L === void 0 ? ee : { text: L.title, needsGutter: ee.needsGutter },
      displayBody: L?.body ?? [],
      displayHeader: $Rt(D.header) ? "" : safeLabel(D.header),
      multiSelect: D.multiSelect ?? !1,
      options: D.options.map((option, He) => ({
        value: option.label,
        displayLabel: Re[He],
        displayDescription: displayField(option.description).text,
        preview:
          option.preview === void 0
            ? void 0
            : option.preview.length > MAX_PREVIEW_LENGTH
              ? { kind: "withheld" }
              : !hasVisibleText(option.preview)
                ? void 0
                : hasSuspiciousText(option.preview)
                  ? { kind: "withheld" }
                  : { kind: "full", markdown: displayText(option.preview) },
      })),
    };
  });
}
//@ chunk-18hwfzwa.js:1297492-1297567 layout
function ept(h, x) {
  return h.options.find((option) => option.value === x)?.displayLabel ?? x;
}
//@ chunk-18hwfzwa.js:1297567-1297673 layout
function getAfkTimeoutMs(h) {
  switch (h) {
    case "60s":
    case "5m":
    case "10m":
      return AXo[h];
    case "never":
    case void 0:
      return null;
  }
}
/**
 * AskUserQuestion 对话框入口：校验/改写问题后渲染 AskUserQuestionPermissionRequestBody。
 */
//@ chunk-18hwfzwa.js:1297673-1298701 callgraph-fingerprint = AskUserQuestionPermissionRequest (0.242)
function AskUserQuestionPermissionRequest(props) {
  let $ = w(12),
    { payload: payload, answer: answer, wouldTakeAnswer: wouldTakeAnswer } = props,
    settings = qd(),
    Re;
  if ($[0] !== settings.syntaxHighlightingDisabled)
    ((Re = settings.syntaxHighlightingDisabled ? null : Sz()),
      ($[0] = settings.syntaxHighlightingDisabled),
      ($[1] = Re));
  else Re = $[1];
  let Be = Re,
    He;
  if ($[2] === MEMO_CACHE_SENTINEL) ((He = getAfkTimeoutMs(getAskUserQuestionTimeout())), ($[2] = He));
  else He = $[2];
  let We = He,
    ze,
    Xe;
  if ($[3] !== payload)
    ((ze = () => ({
      requestId: payload.requestId,
      props: { tool: payload.toolName, questions: payload.questions, metadataSource: payload.metadataSource },
    })),
      (Xe = [payload]),
      ($[3] = payload),
      ($[4] = ze),
      ($[5] = Xe));
  else ((ze = $[4]), (Xe = $[5]));
  let useRenderInput = actionKeysNamespace.useRenderInput("AskUserQuestion", ze, Xe),
    kt = useMultipleChoiceState(),
    At = R(void 0),
    It;
  if ($[6] !== answer || $[7] !== Be || $[8] !== payload || $[9] !== kt || $[10] !== wouldTakeAnswer)
    ((It = (Ot) => {
      let Et =
        At.current !== void 0 && npt(kt) ? At.current : resolveRenderedQuestions(Ot, payload.questions);
      return (
        (At.current = Et),
        e(AskUserQuestionPermissionRequestBody, {
          payload: {
            ...payload,
            toolName: Ot.props.tool,
            questions: Et,
            metadataSource: Ot.props.metadataSource,
          },
          asked: payload.questions,
          answer: (Dt) => answer(remapAnswersToOriginalQuestions(Dt, Et, payload.questions)),
          wouldTakeAnswer: wouldTakeAnswer,
          highlight: Be,
          afkTimeoutMs: We,
          state: kt,
        })
      );
    }),
      ($[6] = answer),
      ($[7] = Be),
      ($[8] = payload),
      ($[9] = kt),
      ($[10] = wouldTakeAnswer),
      ($[11] = It));
  else It = $[11];
  return actionKeysNamespace.useRenderHook(useRenderInput, It);
}
//@ chunk-18hwfzwa.js:1298701-1298796 layout
function npt(h) {
  return Object.keys(h.answers).length > 0 || Object.keys(h.questionStates).length > 0;
}
/**
 * 问题被插件改写后，把 allow 结果中的 answers/annotations 映射回原问题文本与原选项标签。
 */
//@ chunk-18hwfzwa.js:1298796-1299345 layout
function remapAnswersToOriginalQuestions(result, drawnQuestions, originalQuestions) {
  if (result.behavior !== "allow" || drawnQuestions === originalQuestions) return result;
  let L = (Be, He) => {
      if (Be === void 0) return Be;
      let We = {};
      for (let [ze, Xe] of Object.entries(Be)) {
        let index = drawnQuestions.findIndex((At) => At.question === ze),
          kt = index === -1 ? void 0 : originalQuestions[index];
        We[kt?.question ?? ze] = kt === void 0 ? Xe : He(Xe, index);
      }
      return We;
    },
    updatedInput = result.updatedInput,
    ke = L(updatedInput.answers, (Be, He) => {
      let We = drawnQuestions[He]?.options.findIndex((ze) => ze.label === Be) ?? -1;
      return We === -1 ? Be : (originalQuestions[He]?.options[We]?.label ?? Be);
    }),
    Re = L(updatedInput.annotations, (Be) => Be);
  return {
    ...result,
    updatedInput: {
      ...updatedInput,
      ...(ke !== void 0 && { answers: ke }),
      ...(Re !== void 0 && { annotations: Re }),
    },
  };
}
/**
 * 校验插件改写后的问题：须通过工具输入结构且只改文案（kEo 校验），否则记警告并沿用原问题。
 */
//@ chunk-18hwfzwa.js:1299345-1299858 layout
function resolveRenderedQuestions(h, x) {
  if (h.props.questions === x || jsonStringify(h.props.questions) === jsonStringify(x)) return x;
  let safeParse = AskUserQuestionTool.inputSchema.safeParse({ questions: h.props.questions });
  if (!safeParse.success)
    return (
      logForDebugging(
        `ui.render (AskUserQuestion): rewritten questions do not match the tool's input schema (${safeParse.error.message}); drawing the original`,
        { level: "warn" },
      ),
      x
    );
  let L = describeQuestionRewriteViolation(safeParse.data.questions, x);
  if (L !== void 0)
    return (
      logForDebugging(
        `ui.render (AskUserQuestion): a rewrite may relabel the questions but not ${L}; drawing the original`,
        { level: "warn" },
      ),
      x
    );
  return safeParse.data.questions;
}
/**
 * 比较改写前后的问题，返回不允许的改动描述（数量、多选、选项、预览、重复文本），合法时返回 undefined。
 */
//@ chunk-18hwfzwa.js:1299858-1300676 layout
function describeQuestionRewriteViolation(h, x) {
  if (h.length !== x.length)
    return `change how many questions there are (${x.length} asked, ${h.length} drawn)`;
  for (let [D, L] of x.entries()) {
    let ee = h[D];
    if (ee === void 0) return `leave question ${D + 1} out`;
    if ((ee.multiSelect ?? !1) !== (L.multiSelect ?? !1))
      return `change whether question ${D + 1} is multi-select`;
    let mapped = L.options.map((option) => option.label),
      mapped_2 = ee.options.map((option) => option.label);
    if (jsonStringify(mapped_2) !== jsonStringify(mapped))
      return `change question ${D + 1}'s options (asked ${jsonStringify(mapped)}, drawn ${jsonStringify(mapped_2)})`;
    let mapped_3 = L.options.map((option) => option.preview),
      mapped_4 = ee.options.map((option) => option.preview);
    if (jsonStringify(mapped_4) !== jsonStringify(mapped_3)) return `change question ${D + 1}'s previews`;
    let We = (Xe, rt) => rt !== D && Xe.question === ee.question,
      ze = jsonStringify(ee.question);
    if (h.some(We)) return `give two questions one text (${ze})`;
    if (x.some(We)) return `give question ${D + 1} another question's text (${ze})`;
  }
  return;
}
/**
 * 问答主体：多问题状态（useMultipleChoiceState）、导航条、单问题/预览视图、粘贴图片附件、提交页；提交时把答案（与图片）组装为工具结果。
 */
//@ chunk-18hwfzwa.js:1300676-1310202 fingerprint = AskUserQuestionPermissionRequestBody (0.68)
function AskUserQuestionPermissionRequestBody(t0) {
  let $ = w(144),
    {
      payload: payload,
      asked: asked,
      answer: answer,
      wouldTakeAnswer: wouldTakeAnswer,
      highlight: highlight,
      afkTimeoutMs: afkTimeoutMs,
      state: state,
    } = t0,
    metadataSource = payload.metadataSource,
    [We] = useTheme(),
    Xe;
  if ($[0] !== payload.isEngineConfirm || $[1] !== payload.questions)
    ((Xe = buildQuestionDisplays(payload.questions, payload.isEngineConfirm)),
      ($[0] = payload.isEngineConfirm),
      ($[1] = payload.questions),
      ($[2] = Xe));
  else Xe = $[2];
  let rt = Xe,
    kt;
  if ($[3] !== asked || $[4] !== payload.isEngineConfirm || $[5] !== payload.questions || $[6] !== rt)
    ((kt = asked === payload.questions ? rt : buildQuestionDisplays(asked, payload.isEngineConfirm)),
      ($[3] = asked),
      ($[4] = payload.isEngineConfirm),
      ($[5] = payload.questions),
      ($[6] = rt),
      ($[7] = kt));
  else kt = $[7];
  let At = kt,
    It;
  if ($[8] !== highlight || $[9] !== rt || $[10] !== We) {
    It = Jmt;
    for (const Ot of rt) {
      for (const opt_0 of Ot.options) {
        if (opt_0.preview?.kind !== "full") {
          continue;
        }
        let rendered = renderMarkdownToAnsi(opt_0.preview.markdown, We, highlight);
        for (const Lt of rendered.split(`
`))
          It = Math.max(It, bunStringWidth(Lt));
      }
    }
    (($[8] = highlight), ($[9] = rt), ($[10] = We), ($[11] = It));
  } else It = $[11];
  let oo = It,
    Xt;
  if ($[12] === MEMO_CACHE_SENTINEL) ((Xt = {}), ($[12] = Xt));
  else Xt = $[12];
  let [io, so] = y(Xt),
    po = useSetAppState(),
    ao;
  if ($[13] !== io || $[14] !== po || $[15] !== wouldTakeAnswer)
    ((ao = function Wo(co, bo, Ao) {
      if (!wouldTakeAnswer()) {
        return;
      }
      let Bo = ZR(void 0, io[co]);
      let newContent = {
        id: Bo,
        type: "image",
        content: bo,
        mediaType: Ao?.mediaType || "image/png",
        filename: Ao?.filename || "Pasted image",
        dimensions: Ao?.dimensions,
      };
      let Ho = BH(po, "storedImagePaths");
      (recordImagePath(newContent, Ho),
        cLe(newContent, Ho),
        so((prev) => ({ ...prev, [co]: { ...(prev[co] ?? {}), [Bo]: newContent } })));
    }),
      ($[13] = io),
      ($[14] = po),
      ($[15] = wouldTakeAnswer),
      ($[16] = ao));
  else ao = $[16];
  let Wo = ao,
    mn;
  if ($[17] !== wouldTakeAnswer)
    ((mn = (questionText_0, id) => {
      if (!wouldTakeAnswer()) {
        return !1;
      }
      so((prev_0) => {
        let questionContents = { ...(prev_0[questionText_0] ?? {}) };
        return (delete questionContents[id], { ...prev_0, [questionText_0]: questionContents });
      });
    }),
      ($[17] = wouldTakeAnswer),
      ($[18] = mn));
  else mn = $[18];
  let kn = mn,
    Fn;
  if ($[19] !== io) ((Fn = Object.values(io).flatMap(PDo).filter(ADo)), ($[19] = io), ($[20] = Fn));
  else Fn = $[20];
  let bn = Fn,
    toolPermissionContextMode = useAppState(selectToolPermissionContextMode_2),
    hn = useMainLoopModel_3(),
    Mn;
  if ($[21] !== hn) ((Mn = imageLimitsForModel(hn)), ($[21] = hn), ($[22] = Mn));
  else Mn = $[22];
  let Xo = Mn,
    Sn = toolPermissionContextMode === "plan",
    $n;
  if ($[23] !== Sn) (($n = Sn ? getPlanFilePath() : void 0), ($[23] = Sn), ($[24] = $n));
  else $n = $[24];
  let on = $n,
    {
      currentQuestionIndex: currentQuestionIndex,
      answers: answers,
      questionStates: questionStates,
      isInTextInput: isInTextInput,
      nextQuestion: nextQuestion,
      prevQuestion: prevQuestion,
      updateQuestionState: updateQuestionState,
      setAnswer: setAnswer,
      setTextInputMode: setTextInputMode,
    } = state,
    Un;
  if ($[25] !== questionStates)
    ((Un = () => Object.values(questionStates).map(IDo)), ($[25] = questionStates), ($[26] = Un));
  else Un = $[26];
  let dr = Oo(Un),
    or;
  if ($[27] !== dr) ((or = () => zZ(() => dr())), ($[27] = dr), ($[28] = or));
  else or = $[28];
  let pr;
  if ($[29] === MEMO_CACHE_SENTINEL) ((pr = []), ($[29] = pr));
  else pr = $[29];
  (P(or, pr), useRegisterOverlay("ask-user-question-text-input", isInTextInput));
  let Qn = currentQuestionIndex < (rt?.length || 0) ? rt?.[currentQuestionIndex] : null,
    ur = currentQuestionIndex === (rt?.length || 0),
    Ir;
  if ($[30] !== answers || $[31] !== rt)
    ((Ir = rt?.every((q_0) => !!fp(answers, q_0.key)) ?? !1), ($[30] = answers), ($[31] = rt), ($[32] = Ir));
  else Ir = $[32];
  let ts = Ir,
    hideSubmitTab = rt.length === 1 && !rt[0]?.multiSelect,
    Ur;
  if ($[33] !== answer || $[34] !== Sn || $[35] !== metadataSource || $[36] !== rt.length)
    ((Ur = () => {
      if (answer({ behavior: "deny" }) === !1) {
        return;
      }
      if (metadataSource)
        logEvent("tengu_ask_user_question_rejected", {
          source_hash: gn(metadataSource),
          questionCount: rt.length,
          isInPlanMode: Sn,
        });
    }),
      ($[33] = answer),
      ($[34] = Sn),
      ($[35] = metadataSource),
      ($[36] = rt.length),
      ($[37] = Ur));
  else Ur = $[37];
  let Zr = Ur,
    wr = useIsScreenReaderEnabled(),
    zr = R(!1),
    _r = R("user"),
    fr = R(null),
    $r;
  if ($[38] === MEMO_CACHE_SENTINEL)
    (($r = function Er(Yr) {
      if (zr.current && (Yr === "afk" || _r.current !== "afk")) {
        return !1;
      }
      return ((zr.current = !0), (_r.current = Yr), !0);
    }),
      ($[38] = $r));
  else $r = $[38];
  let Er = $r,
    Vr;
  if (
    $[39] !== bn ||
    $[40] !== answer ||
    $[41] !== answers ||
    $[42] !== At ||
    $[43] !== Xo ||
    $[44] !== Sn ||
    $[45] !== wr ||
    $[46] !== metadataSource ||
    $[47] !== questionStates ||
    $[48] !== rt ||
    $[49] !== wouldTakeAnswer
  )
    ((Vr = async () => {
      if (!wouldTakeAnswer()) {
        return;
      }
      if (!Er("user")) {
        return;
      }
      let Xs = await buildClarifyDenyResult({
        questions: rt,
        asked: At,
        answers: answers,
        questionStates: questionStates,
        imageAttachments: bn,
        imageLimits: Xo,
        isScreenReader: wr,
      }).catch((q_1) => {
        ((zr.current = !1), logFeatureBad("ask_user_question_answer", "respond_build_failed"), logError(q_1));
      });
      if (Xs === void 0) {
        return;
      }
      if (answer(Xs) === !1) {
        zr.current = !1;
        return;
      }
      if (metadataSource)
        logEvent("tengu_ask_user_question_respond_to_claude", {
          source_hash: gn(metadataSource),
          questionCount: rt.length,
          isInPlanMode: Sn,
        });
    }),
      ($[39] = bn),
      ($[40] = answer),
      ($[41] = answers),
      ($[42] = At),
      ($[43] = Xo),
      ($[44] = Sn),
      ($[45] = wr),
      ($[46] = metadataSource),
      ($[47] = questionStates),
      ($[48] = rt),
      ($[49] = wouldTakeAnswer),
      ($[50] = Vr));
  else Vr = $[50];
  let Ls = Vr,
    is;
  if ($[51] !== Sn || $[52] !== metadataSource || $[53] !== rt)
    ((is = (ws, Ci) => {
      let Oi = count(rt, (q_2) => !fp(ws, q_2.key));
      if (Oi === 0) {
        return;
      }
      logEvent("tengu_ask_user_question_skipped", {
        ...(metadataSource && { source_hash: gn(metadataSource) }),
        skippedCount: Oi,
        questionCount: rt.length,
        reason: fromEnum(Ci),
        isInPlanMode: Sn,
      });
    }),
      ($[51] = Sn),
      ($[52] = metadataSource),
      ($[53] = rt),
      ($[54] = is));
  else is = $[54];
  let Hi = is,
    Zi;
  if (
    $[55] !== bn ||
    $[56] !== answer ||
    $[57] !== Xo ||
    $[58] !== Sn ||
    $[59] !== wr ||
    $[60] !== Hi ||
    $[61] !== metadataSource ||
    $[62] !== payload.input ||
    $[63] !== questionStates ||
    $[64] !== rt
  )
    ((Zi = async (answersToSubmit) => {
      let qn = await buildAllowAnswerResult({
        questions: rt,
        answersToSubmit: answersToSubmit,
        questionStates: questionStates,
        input: payload.input,
        imageAttachments: bn,
        imageLimits: Xo,
        isScreenReader: wr,
      }).catch(EDo);
      if (answer(qn) === !1) {
        return !1;
      }
      if (metadataSource)
        logEvent("tengu_ask_user_question_accepted", {
          source_hash: gn(metadataSource),
          questionCount: rt.length,
          answerCount: Object.keys(answersToSubmit).length,
          isInPlanMode: Sn,
        });
      if ((Hi(answersToSubmit, "user_submit"), count(rt, (opt_1) => !fp(answersToSubmit, opt_1.key)) === 0))
        logFeatureOk("ask_user_question_answer", { questionCount: rt.length });
      else logFeatureSad("ask_user_question_answer", "user_skipped_questions", { questionCount: rt.length });
      return !0;
    }),
      ($[55] = bn),
      ($[56] = answer),
      ($[57] = Xo),
      ($[58] = Sn),
      ($[59] = wr),
      ($[60] = Hi),
      ($[61] = metadataSource),
      ($[62] = payload.input),
      ($[63] = questionStates),
      ($[64] = rt),
      ($[65] = Zi));
  else Zi = $[65];
  let xs = Zi,
    kr;
  if (
    $[66] !== answers ||
    $[67] !== io ||
    $[68] !== rt ||
    $[69] !== setAnswer ||
    $[70] !== xs ||
    $[71] !== updateQuestionState
  )
    ((kr = (questionText_1, label, textInput, t17) => {
      let es = t17 === void 0 ? !0 : t17;
      let isArray = Array.isArray(label);
      let any = Object.values(io[questionText_1] ?? {}).some(DDo);
      let found = rt.find((_s) => _s.key === questionText_1);
      let ua = (ii) => (found !== void 0 ? ept(found, ii) : ii);
      let La;
      if (isArray) La = fBt(label.map(ua));
      else if (textInput) La = any ? `${textInput} (Image attached)` : textInput;
      else if (label === "__other__") La = any ? "(Image attached)" : label;
      else La = ua(label);
      let Xa = rt.length === 1;
      if (!isArray && Xa && es) {
        let dl = { ...answers, [questionText_1]: La };
        if (!Er("user")) {
          let Vl = fr.current;
          if (Vl?.question !== questionText_1 || Vl.answer !== La)
            updateQuestionState(questionText_1, { selectedValue: void 0 }, !1);
          return;
        }
        ((fr.current = { question: questionText_1, answer: La }),
          xs(dl)
            .catch(ODo)
            .then((Hd) => {
              if (!Hd)
                ((zr.current = !1),
                  (fr.current = null),
                  updateQuestionState(questionText_1, { selectedValue: void 0 }, !1));
            })
            .catch(logError));
        return;
      }
      setAnswer(questionText_1, La, es);
    }),
      ($[66] = answers),
      ($[67] = io),
      ($[68] = rt),
      ($[69] = setAnswer),
      ($[70] = xs),
      ($[71] = updateQuestionState),
      ($[72] = kr));
  else kr = $[72];
  let Ss = kr,
    gs;
  if ($[73] !== answers || $[74] !== Zr || $[75] !== xs || $[76] !== wouldTakeAnswer)
    ((gs = function cl(value) {
      if (value === "cancel") {
        Zr();
        return;
      }
      if (value === "submit") {
        if (!wouldTakeAnswer()) {
          return;
        }
        if (!Er("user")) {
          return;
        }
        xs(answers)
          .then((Ws) => {
            if (!Ws) zr.current = !1;
          })
          .catch((za) => {
            (logError(za), (zr.current = !1));
          });
      }
    }),
      ($[73] = answers),
      ($[74] = Zr),
      ($[75] = xs),
      ($[76] = wouldTakeAnswer),
      ($[77] = gs));
  else gs = $[77];
  let cl = gs,
    Ol = hideSubmitTab ? (rt?.length || 1) - 1 : rt?.length || 0,
    as;
  if ($[78] !== currentQuestionIndex || $[79] !== prevQuestion || $[80] !== wouldTakeAnswer)
    ((as = () => {
      if (currentQuestionIndex > 0 && wouldTakeAnswer()) prevQuestion();
    }),
      ($[78] = currentQuestionIndex),
      ($[79] = prevQuestion),
      ($[80] = wouldTakeAnswer),
      ($[81] = as));
  else as = $[81];
  let pi = as,
    qa;
  if ($[82] !== currentQuestionIndex || $[83] !== Ol || $[84] !== nextQuestion || $[85] !== wouldTakeAnswer)
    ((qa = () => {
      if (currentQuestionIndex < Ol && wouldTakeAnswer()) nextQuestion();
    }),
      ($[82] = currentQuestionIndex),
      ($[83] = Ol),
      ($[84] = nextQuestion),
      ($[85] = wouldTakeAnswer),
      ($[86] = qa));
  else qa = $[86];
  let pd = qa,
    $l;
  if ($[87] !== pd || $[88] !== pi)
    (($l = { "tabs:previous": pi, "tabs:next": pd }), ($[87] = pd), ($[88] = pi), ($[89] = $l));
  else $l = $[89];
  const t21 = !(isInTextInput && !ur);
  let El;
  if ($[90] !== t21) ((El = { context: "Tabs", isActive: t21 }), ($[90] = t21), ($[91] = El));
  else El = $[91];
  MessageActionsKeybindings($l, El);
  let Ll;
  if ($[92] !== afkTimeoutMs || $[93] !== wr || $[94] !== payload.hasExternalRacer)
    ((Ll =
      !wr &&
      !payload.hasExternalRacer &&
      !isBgSession() &&
      (afkTimeoutMs !== null || env.CLAUDE_AFK_TIMEOUT_MS !== void 0)),
      ($[92] = afkTimeoutMs),
      ($[93] = wr),
      ($[94] = payload.hasExternalRacer),
      ($[95] = Ll));
  else Ll = $[95];
  let _c = Ll,
    mc;
  if (
    $[96] !== bn ||
    $[97] !== answer ||
    $[98] !== answers ||
    $[99] !== Xo ||
    $[100] !== Sn ||
    $[101] !== wr ||
    $[102] !== Hi ||
    $[103] !== metadataSource ||
    $[104] !== payload.input ||
    $[105] !== questionStates ||
    $[106] !== rt ||
    $[107] !== wouldTakeAnswer
  )
    ((mc = (Vd) => {
      if (!wouldTakeAnswer()) {
        return !1;
      }
      if (!Er("afk")) {
        return !1;
      }
      let now = Date.now();
      buildAllowAnswerResult({
        questions: rt,
        answersToSubmit: answers,
        questionStates: questionStates,
        input: payload.input,
        imageAttachments: bn,
        imageLimits: Xo,
        afkTimeoutMs: Vd,
        isScreenReader: wr,
      })
        .catch((Ka) => {
          if (_r.current === "afk") zr.current = !1;
          throw (logFeatureBad("ask_user_question_answer", "afk_build_failed"), Ka);
        })
        .then((pl) => {
          if (_r.current !== "afk") {
            return;
          }
          if ((flushInteractionTime(), getLastInteractionTime() >= now || getTerminalFocus() === !0)) {
            zr.current = !1;
            return;
          }
          if (answer(pl) === !1) {
            zr.current = !1;
            return;
          }
          (logEvent("tengu_ask_user_question_afk_auto_advance", {
            ...(metadataSource && { source_hash: gn(metadataSource) }),
            timeoutMs: Vd,
            questionCount: rt.length,
            hadPartialAnswers: Object.keys(answers).length > 0,
            isInPlanMode: Sn,
          }),
            Hi(answers, "afk_timeout"),
            logFeatureSad("ask_user_question_answer", "afk_timeout", {
              questionCount: rt.length,
              hadPartialAnswers: Object.keys(answers).length > 0,
            }));
        })
        .catch(logError);
    }),
      ($[96] = bn),
      ($[97] = answer),
      ($[98] = answers),
      ($[99] = Xo),
      ($[100] = Sn),
      ($[101] = wr),
      ($[102] = Hi),
      ($[103] = metadataSource),
      ($[104] = payload.input),
      ($[105] = questionStates),
      ($[106] = rt),
      ($[107] = wouldTakeAnswer),
      ($[108] = mc));
  else mc = $[108];
  let Gl = mc,
    gd;
  if (
    $[109] !== ts ||
    $[110] !== answers ||
    $[111] !== Qn ||
    $[112] !== currentQuestionIndex ||
    $[113] !== oo ||
    $[114] !== Zr ||
    $[115] !== cl ||
    $[116] !== Ss ||
    $[117] !== Ls ||
    $[118] !== pd ||
    $[119] !== pi ||
    $[120] !== hideSubmitTab ||
    $[121] !== ur ||
    $[122] !== nextQuestion ||
    $[123] !== Wo ||
    $[124] !== kn ||
    $[125] !== io ||
    $[126] !== payload.permissionResult ||
    $[127] !== on ||
    $[128] !== questionStates ||
    $[129] !== rt ||
    $[130] !== setTextInputMode ||
    $[131] !== updateQuestionState ||
    $[132] !== wouldTakeAnswer
  )
    ((gd = Qn
      ? e(QuestionView, {
          wouldTakeAnswer: wouldTakeAnswer,
          question: Qn,
          questions: rt,
          currentQuestionIndex: currentQuestionIndex,
          answers: answers,
          questionStates: questionStates,
          hideSubmitTab: hideSubmitTab,
          minContentWidth: oo,
          planFilePath: on,
          onUpdateQuestionState: updateQuestionState,
          onAnswer: Ss,
          onTextInputFocus: setTextInputMode,
          onCancel: Zr,
          onSubmit: nextQuestion,
          onTabPrev: pi,
          onTabNext: pd,
          onRespondToClaude: Ls,
          canPasteImage: wouldTakeAnswer,
          onImagePaste: (hd, bd) => Wo(Qn.key, hd, bd),
          pastedContents: io[Qn.key] ?? {},
          onRemoveImage: (id_0) => kn(Qn.key, id_0),
        })
      : ur
        ? e(SubmitQuestionsView, {
            questions: rt,
            currentQuestionIndex: currentQuestionIndex,
            answers: answers,
            allQuestionsAnswered: ts,
            permissionResult: payload.permissionResult,
            onFinalResponse: cl,
          })
        : null),
      ($[109] = ts),
      ($[110] = answers),
      ($[111] = Qn),
      ($[112] = currentQuestionIndex),
      ($[113] = oo),
      ($[114] = Zr),
      ($[115] = cl),
      ($[116] = Ss),
      ($[117] = Ls),
      ($[118] = pd),
      ($[119] = pi),
      ($[120] = hideSubmitTab),
      ($[121] = ur),
      ($[122] = nextQuestion),
      ($[123] = Wo),
      ($[124] = kn),
      ($[125] = io),
      ($[126] = payload.permissionResult),
      ($[127] = on),
      ($[128] = questionStates),
      ($[129] = rt),
      ($[130] = setTextInputMode),
      ($[131] = updateQuestionState),
      ($[132] = wouldTakeAnswer),
      ($[133] = gd));
  else gd = $[133];
  let pc;
  if ($[134] !== _c || $[135] !== afkTimeoutMs || $[136] !== Gl)
    ((pc = _c ? e(AfkCountdown, { enabled: !0, timeoutMs: afkTimeoutMs ?? void 0, onTimeout: Gl }) : null),
      ($[134] = _c),
      ($[135] = afkTimeoutMs),
      ($[136] = Gl),
      ($[137] = pc));
  else pc = $[137];
  let Kd;
  if ($[138] !== payload.requestId)
    ((Kd = e(PluginNoticeLine, { toolUseId: payload.requestId })),
      ($[138] = payload.requestId),
      ($[139] = Kd));
  else Kd = $[139];
  let ec;
  if ($[140] !== gd || $[141] !== pc || $[142] !== Kd)
    ((ec = r(Ratchet, { children: [gd, pc, Kd] })),
      ($[140] = gd),
      ($[141] = pc),
      ($[142] = Kd),
      ($[143] = ec));
  else ec = $[143];
  return ec;
}
/**
 * 显示 "auto-continue in Ns" 倒计时的行。
 */
//@ chunk-18hwfzwa.js:1310202-1310738 layout
function AfkCountdown(h) {
  let ee = w(9),
    { enabled: enabled, timeoutMs: timeoutMs, onTimeout: onTimeout } = h,
    ke;
  if (ee[0] !== enabled || ee[1] !== onTimeout || ee[2] !== timeoutMs)
    ((ke = { enabled: enabled, timeoutMs: timeoutMs, onTimeout: onTimeout }),
      (ee[0] = enabled),
      (ee[1] = onTimeout),
      (ee[2] = timeoutMs),
      (ee[3] = ke));
  else ke = ee[3];
  let { remainingSeconds: remainingSeconds, showCountdown: showCountdown } = useAfkTimeout(ke),
    He;
  if (ee[4] !== remainingSeconds || ee[5] !== showCountdown)
    ((He = showCountdown
      ? r(Text, {
          color: "inactive",
          dimColor: !0,
          children: ["auto-continue in ", remainingSeconds, "s \xB7 any key to stay"],
        })
      : null),
      (ee[4] = remainingSeconds),
      (ee[5] = showCountdown),
      (ee[6] = He));
  else He = ee[6];
  let We;
  if (ee[7] !== He)
    ((We = e(Box, { height: 1, justifyContent: "flex-end", children: He })), (ee[7] = He), (ee[8] = We));
  else We = ee[8];
  return We;
}
/**
 * 显示插件对该工具调用的提示文字的一行。
 */
//@ chunk-18hwfzwa.js:1310738-1311224 layout
function PluginNoticeLine(h) {
  let D = w(8),
    { toolUseId: toolUseId } = h,
    L;
  if (D[0] === MEMO_CACHE_SENTINEL) ((L = B2e.noticesStore()), (D[0] = L));
  else L = D[0];
  let ee;
  if (D[1] !== toolUseId) ((ee = (ke) => ke.get(toolUseId)), (D[1] = toolUseId), (D[2] = ee));
  else ee = D[2];
  let Re = useStoreSelector(L, ee);
  if (Re === void 0) {
    return null;
  }
  let Be;
  if (D[3] !== Re.plugin || D[4] !== Re.text)
    ((Be = qtt(Re.plugin, Re.text)), (D[3] = Re.plugin), (D[4] = Re.text), (D[5] = Be));
  else Be = D[5];
  let He;
  if (D[6] !== Be)
    ((He = e(Box, {
      height: 1,
      justifyContent: "flex-end",
      children: e(Text, { color: "inactive", dimColor: !0, children: Be }),
    })),
      (D[6] = Be),
      (D[7] = He));
  else He = D[7];
  return He;
}
/**
 * 生成 AskUserQuestion 的 allow 结果：answers + 每题的预览/备注注解、AFK 超时，并附上缩放后的图片块。
 */
//@ chunk-18hwfzwa.js:1311224-1311838 layout
async function buildAllowAnswerResult(h) {
  let {
      questions: questions,
      answersToSubmit: answersToSubmit,
      questionStates: questionStates,
      input: input,
    } = h,
    ke = {};
  for (let He of questions) {
    let We = fp(answersToSubmit, He.key),
      ze = !h.isScreenReader && lft(He),
      Xe = ze ? questionStates[He.key]?.textInputValue : void 0,
      rt = ze && We ? He.options.find((option) => option.displayLabel === We) : void 0,
      kt = rt?.preview?.kind === "full" ? rt.preview.markdown : void 0;
    if (kt || Xe?.trim())
      ke[He.key] = { ...(kt && { preview: kt }), ...(Xe?.trim() && { notes: Xe.trim() }) };
  }
  let Re = {
      ...input,
      answers: answersToSubmit,
      annotations: ke,
      ...(h.afkTimeoutMs && { afkTimeoutMs: h.afkTimeoutMs }),
    },
    Be = await resizeImageBlocks(h.imageAttachments, h.imageLimits);
  return { behavior: "allow", updatedInput: Re, ...(Be && Be.length > 0 && { contentBlocks: Be }) };
}
/**
 * 用户选择澄清时生成 deny 结果，反馈中列出已问问题与回答，并附图片。
 */
//@ chunk-18hwfzwa.js:1311838-1312370 layout
async function buildClarifyDenyResult(h) {
  let { questions: questions, asked: asked, answers: answers, questionStates: questionStates } = h,
    Re = `The user wants to clarify these questions.
    This means they may have additional information, context or questions for you.
    Take their response into account and then reformulate the questions if appropriate.
    Start by asking them what they would like to clarify.

    Questions asked:
${formatQuestionAnswers(questions, asked, answers, questionStates, h.isScreenReader)}`,
    Be = await resizeImageBlocks(h.imageAttachments, h.imageLimits);
  return { behavior: "deny", feedback: Re, ...(Be && Be.length > 0 && { contentBlocks: Be }) };
}
//@ chunk-18hwfzwa.js:1312370-1312666 placement = generateSectionReminders (0.324)
function formatQuestionAnswers(h, x, D, L, ee) {
  return h.map((ke, Re) => {
    let Be = fp(D, ke.key),
      He = !ee && lft(ke) ? L[ke.key]?.textInputValue?.trim() : void 0,
      ze = [`- "${(x[Re] ?? ke).displayQuestion.text}"`];
    if ((ze.push(Be ? `  Answer: ${Be}` : "  (No answer provided)"), He)) ze.push(`  User notes: ${He}`);
    return ze.join(`
`);
  }).join(`
`);
}
//@ chunk-18hwfzwa.js:1312666-1312744 placement
function lft(h) {
  return !h.multiSelect && h.options.some((option) => option.preview !== void 0);
}
/**
 * （切分错误）把一组图片按 limits 缩放成 image 块。
 */
//@ chunk-18hwfzwa.js:1312744-1312910 placement = parseDataUri (0.518)
async function resizeImageBlocks(h, x) {
  if (h.length === 0) return;
  return Promise.all(
    h.map(async (D) => {
      let { block: block } = await maybeResizeAndDownsampleImageBlock({
        data: D.content,
        mediaType: D.mediaType,
        limits: x,
      });
      return block;
    }),
  );
}
//@ chunk-mvvq2nx1.js:18079-18303 fingerprint = convertImagesToBlocks (0.466)
async function convertImagesToBlocks(e, n, { timings: r } = {}) {
  let o = Ph(e);
  if (o === null) return null;
  try {
    let { block: block } = await maybeResizeAndDownsampleImageBlock({
      data: e,
      mediaType: o,
      limits: n,
      timings: r,
      from: "file",
    });
    if (block.type !== "image") return null;
    return (weakSet.add(block), block);
  } catch {
    return null;
  }
}

export { eEo, AskUserQuestionPermissionRequest, convertImagesToBlocks };
