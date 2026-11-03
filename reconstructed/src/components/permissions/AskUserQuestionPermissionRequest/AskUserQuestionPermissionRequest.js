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
import { init_react_production, Oo, y, R, P } from "../../../../vendor/react/cjs/react.production.js";
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
  hasNoVisibleText,
  safeLabel,
  hasVisibleText,
  hasSuspiciousText,
  displayText,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import { MAX_PREVIEW_LENGTH } from "./PreviewBox.js";
import { TIMEOUT_CHOICE_MS } from "../../../services/requestUserDialog.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useSettingsState } from "../../../hooks/useSettings.js";
import { getCliHighlightModule } from "../../../utils/cliHighlight.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { getAskUserQuestionTimeout } from "../../../utils/settings/settings.js";
import { actionKeysNamespace } from "../../pluginUi/render/actionKeys.js";
import { useMultipleChoiceState } from "./use-multiple-choice-state.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { AskUserQuestionTool } from "../../../tools/AskUserQuestionTool/AskUserQuestionTool.js";
import { logForDebugging } from "../../../utils/debug.js";
import { useTheme } from "../../design-system/ThemeProvider.js";
import { renderMarkdownToAnsi } from "../../../utils/markdown.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { useSetAppState, useAppState } from "../../../state/AppState.js";
import { mintPasteId, registerPasteCarrier } from "../../../history.js";
import { setSliceField } from "../../../state/sliceHelpers.js";
import { recordImagePath, storeImageAndRecord } from "../../../utils/imageStore.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../../../hooks/useMainLoopModel.js";
import { imageLimitsForModel } from "../../../utils/attachmentMedia.js";
import { getPlanFilePath } from "../../../utils/plans.js";
import { useRegisterOverlay } from "../../../context/overlayContext.js";
import { ownLookup } from "./QuestionNavigationBar.js";
import { logEvent } from "../../../services/analytics/index.js";
import { shortHash } from "../../../utils/shortHash.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { count } from "../../../utils/collections.js";
import { fromEnum } from "../../../services/analytics/safeMetadata.js";
import { formatSelectionList } from "../../../tools/AskUserQuestionTool/answerValidation.js";
import { MessageActionsKeybindings } from "../../messageActions.js";
import { isBgSession } from "../../../utils/concurrentSessions.js";
import { QuestionView } from "./QuestionView.js";
import { SubmitQuestionsView } from "./SubmitQuestionsView.js";
import { Ratchet } from "../../design-system/Ratchet.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { emptyToolHooksFirst } from "../../../plugins/functionHooks/toolCallHooks.js";
import { useStoreSelector } from "../../../hooks/useStoreSelector.js";
import { formatSourceLine } from "../../../utils/messages/nonUserMessages.js";
import { maybeResizeAndDownsampleImageBlock, weakSet } from "../../../utils/imageResizer.js";
import { Ph } from "../../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";

//@ chunk-18hwfzwa.js:1287178-1287222 fingerprint = _temp (1)
function hasOptionPreview(opt) {
  return opt.preview !== undefined;
}
//@ chunk-18hwfzwa.js:1295825-1295829 sole-consumer
init_react_production();
//@ chunk-18hwfzwa.js:1295829-1295851 sole-consumer
var AFK_TIMEOUT_MS = NOTIF_ACTIVE_THRESHOLD_MS;
var AFK_COUNTDOWN_MS = 20000;
//@ chunk-18hwfzwa.js:1295851-1296488 sole-consumer
/**
 * 无人值守自动继续计时：按最后交互时间与终端焦点计算剩余秒数，接近阈值时显示倒计时，到时调用 onTimeout（返回 false 则重新计时）；支持 CLAUDE_AFK_TIMEOUT_MS / CLAUDE_AFK_COUNTDOWN_MS。
 */
function useAfkTimeout({ enabled, timeoutMs, countdownThresholdMs, onTimeout }) {
  timeoutMs = env.CLAUDE_AFK_TIMEOUT_MS ?? timeoutMs ?? AFK_TIMEOUT_MS;
  countdownThresholdMs = Math.min(
    countdownThresholdMs ?? env.CLAUDE_AFK_COUNTDOWN_MS ?? AFK_COUNTDOWN_MS,
    timeoutMs,
  );
  let ee = Oo(onTimeout);
  let ke = Math.ceil(timeoutMs / 1000);
  let [Re, Be] = y(ke);
  let He = R(false);
  let We = R(Date.now());
  P(() => {
    if (!enabled) return;
    We.current = Date.now();
    He.current = false;
    Be(ke);
  }, [enabled, ke]);
  useInterval(
    () => {
      if (He.current) return;
      flushInteractionTime();
      let now = Date.now();
      if (getTerminalFocus() === true) We.current = now;
      let rt = now - Math.max(getLastInteractionTime(), We.current);
      let kt = rt >= timeoutMs - countdownThresholdMs ? Math.max(0, Math.ceil((timeoutMs - rt) / 1000)) : ke;
      Be(kt);
      if (rt >= timeoutMs) {
        He.current = true;
        if (ee(timeoutMs) === false) {
          He.current = false;
          We.current = now;
          Be(ke);
        }
      }
    },
    enabled ? 1000 : null,
  );
  let showCountdown = Re * 1000 <= countdownThresholdMs;
  return {
    remainingSeconds: Re,
    showCountdown,
    timeoutMs,
  };
}
//@ chunk-18hwfzwa.js:1296488-1296530 file-local
function ownValues(contents) {
  return Object.values(contents);
}
//@ chunk-18hwfzwa.js:1296530-1296572 layout = _temp (1)
function isImageBlock(c) {
  return c.type === "image";
}
//@ chunk-18hwfzwa.js:1296572-1296626 callgraph-fingerprint = _temp4 (1)
function selectToolPermissionContextMode_2(s) {
  return s.toolPermissionContext.mode;
}
//@ chunk-18hwfzwa.js:1296626-1296668 layout
function getQuestionTextInput(Iu) {
  return Iu.textInputValue;
}
//@ chunk-18hwfzwa.js:1296668-1296746 layout
function reportBuildResultFailure(Am) {
  logFeatureBad("ask_user_question_answer", "build_result_failed");
  throw Am;
}
//@ chunk-18hwfzwa.js:1296746-1296788 layout = _temp (1)
function isImageValue(c) {
  return c.type === "image";
}
//@ chunk-18hwfzwa.js:1296788-1296821 layout
function logErrorReturningFalse(nl) {
  logError(nl);
  return false;
}
//@ chunk-18hwfzwa.js:1296821-1296832 layout
var PREVIEW_MIN_COLUMNS = 40;
//@ chunk-18hwfzwa.js:1296832-1297492 layout
/**
 * 把 AskUserQuestion 的问题转换为显示模型：问题/标题/选项标签去重、描述与预览（过长或可疑内容只显示 withheld）。
 */
function buildQuestionDisplays(h, isEngineConfirm = false) {
  return h.map((D) => {
    let L = isEngineConfirm ? splitQuestionTitleBody(D.question) : undefined;
    let ee = displayField(D.question);
    let mapped = D.options.map((option) => option.label);
    let Re = uniqueLabels(mapped, (Be) =>
      replaceLineBreaks(displayField(Be).text).replace(/\s+/g, " ").trim(),
    );
    return {
      key: D.question,
      displayQuestion:
        L === undefined
          ? ee
          : {
              text: L.title,
              needsGutter: ee.needsGutter,
            },
      displayBody: L?.body ?? [],
      displayHeader: hasNoVisibleText(D.header) ? "" : safeLabel(D.header),
      multiSelect: D.multiSelect ?? false,
      options: D.options.map((option, He) => ({
        value: option.label,
        displayLabel: Re[He],
        displayDescription: displayField(option.description).text,
        preview:
          option.preview === undefined
            ? undefined
            : option.preview.length > MAX_PREVIEW_LENGTH
              ? {
                  kind: "withheld",
                }
              : !hasVisibleText(option.preview)
                ? undefined
                : hasSuspiciousText(option.preview)
                  ? {
                      kind: "withheld",
                    }
                  : {
                      kind: "full",
                      markdown: displayText(option.preview),
                    },
      })),
    };
  });
}
//@ chunk-18hwfzwa.js:1297492-1297567 layout
function optionDisplayLabel(h, x) {
  return h.options.find((option) => option.value === x)?.displayLabel ?? x;
}
//@ chunk-18hwfzwa.js:1297567-1297673 layout
function getAfkTimeoutMs(askUserQuestionTimeout) {
  switch (askUserQuestionTimeout) {
    case "60s":
    case "5m":
    case "10m":
      return TIMEOUT_CHOICE_MS[askUserQuestionTimeout];
    case "never":
    case undefined:
      return null;
  }
}
//@ chunk-18hwfzwa.js:1297673-1298701 callgraph-fingerprint = AskUserQuestionPermissionRequest (0.242)
/**
 * AskUserQuestion 对话框入口：校验/改写问题后渲染 AskUserQuestionPermissionRequestBody。
 */
function AskUserQuestionPermissionRequest(props) {
  let $ = w(12);
  let { payload, answer, wouldTakeAnswer } = props;
  let settings = useSettingsState();
  let Re;
  if ($[0] !== settings.syntaxHighlightingDisabled) {
    Re = settings.syntaxHighlightingDisabled ? null : getCliHighlightModule();
    $[0] = settings.syntaxHighlightingDisabled;
    $[1] = Re;
  } else Re = $[1];
  let highlight = Re;
  let He;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    He = getAfkTimeoutMs(getAskUserQuestionTimeout());
    $[2] = He;
  } else He = $[2];
  let afkTimeoutMs = He;
  let ze;
  let Xe;
  if ($[3] !== payload) {
    ze = () => ({
      requestId: payload.requestId,
      props: {
        tool: payload.toolName,
        questions: payload.questions,
        metadataSource: payload.metadataSource,
      },
    });
    Xe = [payload];
    $[3] = payload;
    $[4] = ze;
    $[5] = Xe;
  } else {
    ze = $[4];
    Xe = $[5];
  }
  let rt = actionKeysNamespace.useRenderInput("AskUserQuestion", ze, Xe);
  let multipleChoiceState = useMultipleChoiceState();
  let At = R(undefined);
  let It;
  if (
    $[6] !== answer ||
    $[7] !== highlight ||
    $[8] !== payload ||
    $[9] !== multipleChoiceState ||
    $[10] !== wouldTakeAnswer
  ) {
    It = (Ot) => {
      let drawnQuestions =
        At.current !== undefined && hasAnyAnswers(multipleChoiceState)
          ? At.current
          : resolveRenderedQuestions(Ot, payload.questions);
      At.current = drawnQuestions;
      return jsxProd_default(AskUserQuestionPermissionRequestBody, {
        payload: {
          ...payload,
          toolName: Ot.props.tool,
          questions: drawnQuestions,
          metadataSource: Ot.props.metadataSource,
        },
        asked: payload.questions,
        answer: (result) =>
          answer(remapAnswersToOriginalQuestions(result, drawnQuestions, payload.questions)),
        wouldTakeAnswer,
        highlight,
        afkTimeoutMs,
        state: multipleChoiceState,
      });
    };
    $[6] = answer;
    $[7] = highlight;
    $[8] = payload;
    $[9] = multipleChoiceState;
    $[10] = wouldTakeAnswer;
    $[11] = It;
  } else It = $[11];
  return actionKeysNamespace.useRenderHook(rt, It);
}
//@ chunk-18hwfzwa.js:1298701-1298796 layout
function hasAnyAnswers(multipleChoiceState) {
  return (
    Object.keys(multipleChoiceState.answers).length > 0 ||
    Object.keys(multipleChoiceState.questionStates).length > 0
  );
}
//@ chunk-18hwfzwa.js:1298796-1299345 layout
/**
 * 问题被插件改写后，把 allow 结果中的 answers/annotations 映射回原问题文本与原选项标签。
 */
function remapAnswersToOriginalQuestions(result, drawnQuestions, originalQuestions) {
  if (result.behavior !== "allow" || drawnQuestions === originalQuestions) return result;
  let L = (Be, He) => {
    if (Be === undefined) return Be;
    let We = {};
    for (let [key, value] of Object.entries(Be)) {
      let index = drawnQuestions.findIndex((drawnQuestion) => drawnQuestion.question === key);
      let kt = index === -1 ? undefined : originalQuestions[index];
      We[kt?.question ?? key] = kt === undefined ? value : He(value, index);
    }
    return We;
  };
  let updatedInput = result.updatedInput;
  let ke = L(updatedInput.answers, (Be, He) => {
    let We = drawnQuestions[He]?.options.findIndex((option) => option.label === Be) ?? -1;
    return We === -1 ? Be : (originalQuestions[He]?.options[We]?.label ?? Be);
  });
  let Re = L(updatedInput.annotations, (Be) => Be);
  return {
    ...result,
    updatedInput: {
      ...updatedInput,
      ...(ke !== undefined && {
        answers: ke,
      }),
      ...(Re !== undefined && {
        annotations: Re,
      }),
    },
  };
}
//@ chunk-18hwfzwa.js:1299345-1299858 layout
/**
 * 校验插件改写后的问题：须通过工具输入结构且只改文案（kEo 校验），否则记警告并沿用原问题。
 */
function resolveRenderedQuestions(h, questions) {
  if (h.props.questions === questions || jsonStringify(h.props.questions) === jsonStringify(questions))
    return questions;
  let D = AskUserQuestionTool.inputSchema.safeParse({
    questions: h.props.questions,
  });
  if (!D.success) {
    logForDebugging(
      `ui.render (AskUserQuestion): rewritten questions do not match the tool's input schema (${D.error.message}); drawing the original`,
      {
        level: "warn",
      },
    );
    return questions;
  }
  let L = describeQuestionRewriteViolation(D.data.questions, questions);
  if (L !== undefined) {
    logForDebugging(
      `ui.render (AskUserQuestion): a rewrite may relabel the questions but not ${L}; drawing the original`,
      {
        level: "warn",
      },
    );
    return questions;
  }
  return D.data.questions;
}
//@ chunk-18hwfzwa.js:1299858-1300676 layout
/**
 * 比较改写前后的问题，返回不允许的改动描述（数量、多选、选项、预览、重复文本），合法时返回 undefined。
 */
function describeQuestionRewriteViolation(questions, x) {
  if (questions.length !== x.length)
    return `change how many questions there are (${x.length} asked, ${questions.length} drawn)`;
  for (let [D, L] of x.entries()) {
    let ee = questions[D];
    if (ee === undefined) return `leave question ${D + 1} out`;
    if ((ee.multiSelect ?? false) !== (L.multiSelect ?? false))
      return `change whether question ${D + 1} is multi-select`;
    let mapped = L.options.map((option) => option.label);
    let mapped_2 = ee.options.map((option) => option.label);
    if (jsonStringify(mapped_2) !== jsonStringify(mapped))
      return `change question ${D + 1}'s options (asked ${jsonStringify(mapped)}, drawn ${jsonStringify(mapped_2)})`;
    let mapped_3 = L.options.map((option) => option.preview);
    let mapped_4 = ee.options.map((option) => option.preview);
    if (jsonStringify(mapped_4) !== jsonStringify(mapped_3)) return `change question ${D + 1}'s previews`;
    let We = (Xe, rt) => rt !== D && Xe.question === ee.question;
    let ze = jsonStringify(ee.question);
    if (questions.some(We)) return `give two questions one text (${ze})`;
    if (x.some(We)) return `give question ${D + 1} another question's text (${ze})`;
  }
  return;
}
//@ chunk-18hwfzwa.js:1300676-1310202 fingerprint = AskUserQuestionPermissionRequestBody (0.68)
/**
 * 问答主体：多问题状态（useMultipleChoiceState）、导航条、单问题/预览视图、粘贴图片附件、提交页；提交时把答案（与图片）组装为工具结果。
 */
function AskUserQuestionPermissionRequestBody(props) {
  let $ = w(144);
  let { payload, asked, answer, wouldTakeAnswer, highlight, afkTimeoutMs, state } = props;
  let metadataSource = payload.metadataSource;
  let [theme] = useTheme();
  let Xe;
  if ($[0] !== payload.isEngineConfirm || $[1] !== payload.questions) {
    Xe = buildQuestionDisplays(payload.questions, payload.isEngineConfirm);
    $[0] = payload.isEngineConfirm;
    $[1] = payload.questions;
    $[2] = Xe;
  } else Xe = $[2];
  let rt = Xe;
  let kt;
  if ($[3] !== asked || $[4] !== payload.isEngineConfirm || $[5] !== payload.questions || $[6] !== rt) {
    kt = asked === payload.questions ? rt : buildQuestionDisplays(asked, payload.isEngineConfirm);
    $[3] = asked;
    $[4] = payload.isEngineConfirm;
    $[5] = payload.questions;
    $[6] = rt;
    $[7] = kt;
  } else kt = $[7];
  let asked_2 = kt;
  let It;
  if ($[8] !== highlight || $[9] !== rt || $[10] !== theme) {
    It = PREVIEW_MIN_COLUMNS;
    for (const Ot of rt) {
      for (const opt of Ot.options) {
        if (opt.preview?.kind !== "full") {
          continue;
        }
        let rendered = renderMarkdownToAnsi(opt.preview.markdown, theme, highlight);
        for (const line of rendered.split(`
`))
          It = Math.max(It, bunStringWidth(line));
      }
    }
    $[8] = highlight;
    $[9] = rt;
    $[10] = theme;
    $[11] = It;
  } else It = $[11];
  let minContentWidth = It;
  let Xt;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    Xt = {};
    $[12] = Xt;
  } else Xt = $[12];
  let [io, so] = y(Xt);
  let setAppState = useSetAppState();
  let ao;
  if ($[13] !== io || $[14] !== setAppState || $[15] !== wouldTakeAnswer) {
    ao = function onImagePaste(questionText, base64Image, mediaType) {
      if (!wouldTakeAnswer()) {
        return;
      }
      let Bo = mintPasteId(undefined, io[questionText]);
      let newContent = {
        id: Bo,
        type: "image",
        content: base64Image,
        mediaType: mediaType?.mediaType || "image/png",
        filename: mediaType?.filename || "Pasted image",
        dimensions: mediaType?.dimensions,
      };
      let Ho = setSliceField(setAppState, "storedImagePaths");
      recordImagePath(newContent, Ho);
      storeImageAndRecord(newContent, Ho);
      so((prev) => ({
        ...prev,
        [questionText]: {
          ...(prev[questionText] ?? {}),
          [Bo]: newContent,
        },
      }));
    };
    $[13] = io;
    $[14] = setAppState;
    $[15] = wouldTakeAnswer;
    $[16] = ao;
  } else ao = $[16];
  let Wo = ao;
  let mn;
  if ($[17] !== wouldTakeAnswer) {
    mn = (questionText, id) => {
      if (!wouldTakeAnswer()) {
        return false;
      }
      so((prev) => {
        let questionContents = {
          ...(prev[questionText] ?? {}),
        };
        delete questionContents[id];
        return {
          ...prev,
          [questionText]: questionContents,
        };
      });
    };
    $[17] = wouldTakeAnswer;
    $[18] = mn;
  } else mn = $[18];
  let kn = mn;
  let Fn;
  if ($[19] !== io) {
    Fn = Object.values(io).flatMap(ownValues).filter(isImageBlock);
    $[19] = io;
    $[20] = Fn;
  } else Fn = $[20];
  let imageAttachments = Fn;
  let toolPermissionContextMode = useAppState(selectToolPermissionContextMode_2);
  let mainLoopModel = useMainLoopModel_3();
  let Mn;
  if ($[21] !== mainLoopModel) {
    Mn = imageLimitsForModel(mainLoopModel);
    $[21] = mainLoopModel;
    $[22] = Mn;
  } else Mn = $[22];
  let imageLimits = Mn;
  let Sn = toolPermissionContextMode === "plan";
  let $n;
  if ($[23] !== Sn) {
    $n = Sn ? getPlanFilePath() : undefined;
    $[23] = Sn;
    $[24] = $n;
  } else $n = $[24];
  let planFilePath = $n;
  let {
    currentQuestionIndex,
    answers,
    questionStates,
    isInTextInput,
    nextQuestion,
    prevQuestion,
    updateQuestionState,
    setAnswer,
    setTextInputMode,
  } = state;
  let Un;
  if ($[25] !== questionStates) {
    Un = () => Object.values(questionStates).map(getQuestionTextInput);
    $[25] = questionStates;
    $[26] = Un;
  } else Un = $[26];
  let dr = Oo(Un);
  let or;
  if ($[27] !== dr) {
    or = () => registerPasteCarrier(() => dr());
    $[27] = dr;
    $[28] = or;
  } else or = $[28];
  let pr;
  if ($[29] === MEMO_CACHE_SENTINEL) {
    pr = [];
    $[29] = pr;
  } else pr = $[29];
  P(or, pr);
  useRegisterOverlay("ask-user-question-text-input", isInTextInput);
  let Qn = currentQuestionIndex < (rt?.length || 0) ? rt?.[currentQuestionIndex] : null;
  let ur = currentQuestionIndex === (rt?.length || 0);
  let Ir;
  if ($[30] !== answers || $[31] !== rt) {
    Ir = rt?.every((q_0) => !!ownLookup(answers, q_0.key)) ?? false;
    $[30] = answers;
    $[31] = rt;
    $[32] = Ir;
  } else Ir = $[32];
  let allQuestionsAnswered = Ir;
  let hideSubmitTab = rt.length === 1 && !rt[0]?.multiSelect;
  let Ur;
  if ($[33] !== answer || $[34] !== Sn || $[35] !== metadataSource || $[36] !== rt.length) {
    Ur = () => {
      if (
        answer({
          behavior: "deny",
        }) === false
      ) {
        return;
      }
      if (metadataSource)
        logEvent("tengu_ask_user_question_rejected", {
          source_hash: shortHash(metadataSource),
          questionCount: rt.length,
          isInPlanMode: Sn,
        });
    };
    $[33] = answer;
    $[34] = Sn;
    $[35] = metadataSource;
    $[36] = rt.length;
    $[37] = Ur;
  } else Ur = $[37];
  let Zr = Ur;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let zr = R(false);
  let _r = R("user");
  let fr = R(null);
  let $r;
  if ($[38] === MEMO_CACHE_SENTINEL) {
    $r = function Er(Yr) {
      if (zr.current && (Yr === "afk" || _r.current !== "afk")) {
        return false;
      }
      zr.current = true;
      _r.current = Yr;
      return true;
    };
    $[38] = $r;
  } else $r = $[38];
  let Er = $r;
  let Vr;
  if (
    $[39] !== imageAttachments ||
    $[40] !== answer ||
    $[41] !== answers ||
    $[42] !== asked_2 ||
    $[43] !== imageLimits ||
    $[44] !== Sn ||
    $[45] !== isScreenReaderEnabled ||
    $[46] !== metadataSource ||
    $[47] !== questionStates ||
    $[48] !== rt ||
    $[49] !== wouldTakeAnswer
  ) {
    Vr = async () => {
      if (!wouldTakeAnswer()) {
        return;
      }
      if (!Er("user")) {
        return;
      }
      let Xs = await buildClarifyDenyResult({
        questions: rt,
        asked: asked_2,
        answers,
        questionStates,
        imageAttachments,
        imageLimits,
        isScreenReader: isScreenReaderEnabled,
      }).catch((q_1) => {
        zr.current = false;
        logFeatureBad("ask_user_question_answer", "respond_build_failed");
        logError(q_1);
      });
      if (Xs === undefined) {
        return;
      }
      if (answer(Xs) === false) {
        zr.current = false;
        return;
      }
      if (metadataSource)
        logEvent("tengu_ask_user_question_respond_to_claude", {
          source_hash: shortHash(metadataSource),
          questionCount: rt.length,
          isInPlanMode: Sn,
        });
    };
    $[39] = imageAttachments;
    $[40] = answer;
    $[41] = answers;
    $[42] = asked_2;
    $[43] = imageLimits;
    $[44] = Sn;
    $[45] = isScreenReaderEnabled;
    $[46] = metadataSource;
    $[47] = questionStates;
    $[48] = rt;
    $[49] = wouldTakeAnswer;
    $[50] = Vr;
  } else Vr = $[50];
  let onRespondToClaude = Vr;
  let is;
  if ($[51] !== Sn || $[52] !== metadataSource || $[53] !== rt) {
    is = (ws, Ci) => {
      let Oi = count(rt, (q_2) => !ownLookup(ws, q_2.key));
      if (Oi === 0) {
        return;
      }
      logEvent("tengu_ask_user_question_skipped", {
        ...(metadataSource && {
          source_hash: shortHash(metadataSource),
        }),
        skippedCount: Oi,
        questionCount: rt.length,
        reason: fromEnum(Ci),
        isInPlanMode: Sn,
      });
    };
    $[51] = Sn;
    $[52] = metadataSource;
    $[53] = rt;
    $[54] = is;
  } else is = $[54];
  let Hi = is;
  let Zi;
  if (
    $[55] !== imageAttachments ||
    $[56] !== answer ||
    $[57] !== imageLimits ||
    $[58] !== Sn ||
    $[59] !== isScreenReaderEnabled ||
    $[60] !== Hi ||
    $[61] !== metadataSource ||
    $[62] !== payload.input ||
    $[63] !== questionStates ||
    $[64] !== rt
  ) {
    Zi = async (answersToSubmit) => {
      let qn = await buildAllowAnswerResult({
        questions: rt,
        answersToSubmit,
        questionStates,
        input: payload.input,
        imageAttachments,
        imageLimits,
        isScreenReader: isScreenReaderEnabled,
      }).catch(reportBuildResultFailure);
      if (answer(qn) === false) {
        return false;
      }
      if (metadataSource)
        logEvent("tengu_ask_user_question_accepted", {
          source_hash: shortHash(metadataSource),
          questionCount: rt.length,
          answerCount: Object.keys(answersToSubmit).length,
          isInPlanMode: Sn,
        });
      Hi(answersToSubmit, "user_submit");
      if (count(rt, (opt_1) => !ownLookup(answersToSubmit, opt_1.key)) === 0)
        logFeatureOk("ask_user_question_answer", {
          questionCount: rt.length,
        });
      else
        logFeatureSad("ask_user_question_answer", "user_skipped_questions", {
          questionCount: rt.length,
        });
      return true;
    };
    $[55] = imageAttachments;
    $[56] = answer;
    $[57] = imageLimits;
    $[58] = Sn;
    $[59] = isScreenReaderEnabled;
    $[60] = Hi;
    $[61] = metadataSource;
    $[62] = payload.input;
    $[63] = questionStates;
    $[64] = rt;
    $[65] = Zi;
  } else Zi = $[65];
  let xs = Zi;
  let kr;
  if (
    $[66] !== answers ||
    $[67] !== io ||
    $[68] !== rt ||
    $[69] !== setAnswer ||
    $[70] !== xs ||
    $[71] !== updateQuestionState
  ) {
    kr = (questionText_1, label, textInput, t17) => {
      let shouldAdvance = t17 === undefined ? true : t17;
      let ds = Array.isArray(label);
      let questionImages = Object.values(io[questionText_1] ?? {}).some(isImageValue);
      let found = rt.find((_s) => _s.key === questionText_1);
      let ua = (label) => (found !== undefined ? optionDisplayLabel(found, label) : label);
      let La;
      if (ds) La = formatSelectionList(label.map(ua));
      else if (textInput) La = questionImages ? `${textInput} (Image attached)` : textInput;
      else if (label === "__other__") La = questionImages ? "(Image attached)" : label;
      else La = ua(label);
      let isSingleQuestion = rt.length === 1;
      if (!ds && isSingleQuestion && shouldAdvance) {
        let dl = {
          ...answers,
          [questionText_1]: La,
        };
        if (!Er("user")) {
          let Vl = fr.current;
          if (Vl?.question !== questionText_1 || Vl.answer !== La)
            updateQuestionState(
              questionText_1,
              {
                selectedValue: undefined,
              },
              false,
            );
          return;
        }
        fr.current = {
          question: questionText_1,
          answer: La,
        };
        xs(dl)
          .catch(logErrorReturningFalse)
          .then((Hd) => {
            if (!Hd) {
              zr.current = false;
              fr.current = null;
              updateQuestionState(
                questionText_1,
                {
                  selectedValue: undefined,
                },
                false,
              );
            }
          })
          .catch(logError);
        return;
      }
      setAnswer(questionText_1, La, shouldAdvance);
    };
    $[66] = answers;
    $[67] = io;
    $[68] = rt;
    $[69] = setAnswer;
    $[70] = xs;
    $[71] = updateQuestionState;
    $[72] = kr;
  } else kr = $[72];
  let onAnswer = kr;
  let gs;
  if ($[73] !== answers || $[74] !== Zr || $[75] !== xs || $[76] !== wouldTakeAnswer) {
    gs = function handleFinalResponse(value) {
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
            if (!Ws) zr.current = false;
          })
          .catch((error) => {
            logError(error);
            zr.current = false;
          });
      }
    };
    $[73] = answers;
    $[74] = Zr;
    $[75] = xs;
    $[76] = wouldTakeAnswer;
    $[77] = gs;
  } else gs = $[77];
  let onFinalResponse = gs;
  let Ol = hideSubmitTab ? (rt?.length || 1) - 1 : rt?.length || 0;
  let as;
  if ($[78] !== currentQuestionIndex || $[79] !== prevQuestion || $[80] !== wouldTakeAnswer) {
    as = () => {
      if (currentQuestionIndex > 0 && wouldTakeAnswer()) prevQuestion();
    };
    $[78] = currentQuestionIndex;
    $[79] = prevQuestion;
    $[80] = wouldTakeAnswer;
    $[81] = as;
  } else as = $[81];
  let pi = as;
  let qa;
  if ($[82] !== currentQuestionIndex || $[83] !== Ol || $[84] !== nextQuestion || $[85] !== wouldTakeAnswer) {
    qa = () => {
      if (currentQuestionIndex < Ol && wouldTakeAnswer()) nextQuestion();
    };
    $[82] = currentQuestionIndex;
    $[83] = Ol;
    $[84] = nextQuestion;
    $[85] = wouldTakeAnswer;
    $[86] = qa;
  } else qa = $[86];
  let pd = qa;
  let $l;
  if ($[87] !== pd || $[88] !== pi) {
    $l = {
      "tabs:previous": pi,
      "tabs:next": pd,
    };
    $[87] = pd;
    $[88] = pi;
    $[89] = $l;
  } else $l = $[89];
  const isActive = !(isInTextInput && !ur);
  let El;
  if ($[90] !== isActive) {
    El = {
      context: "Tabs",
      isActive,
    };
    $[90] = isActive;
    $[91] = El;
  } else El = $[91];
  MessageActionsKeybindings($l, El);
  let Ll;
  if ($[92] !== afkTimeoutMs || $[93] !== isScreenReaderEnabled || $[94] !== payload.hasExternalRacer) {
    Ll =
      !isScreenReaderEnabled &&
      !payload.hasExternalRacer &&
      !isBgSession() &&
      (afkTimeoutMs !== null || env.CLAUDE_AFK_TIMEOUT_MS !== undefined);
    $[92] = afkTimeoutMs;
    $[93] = isScreenReaderEnabled;
    $[94] = payload.hasExternalRacer;
    $[95] = Ll;
  } else Ll = $[95];
  let _c = Ll;
  let mc;
  if (
    $[96] !== imageAttachments ||
    $[97] !== answer ||
    $[98] !== answers ||
    $[99] !== imageLimits ||
    $[100] !== Sn ||
    $[101] !== isScreenReaderEnabled ||
    $[102] !== Hi ||
    $[103] !== metadataSource ||
    $[104] !== payload.input ||
    $[105] !== questionStates ||
    $[106] !== rt ||
    $[107] !== wouldTakeAnswer
  ) {
    mc = (Vd) => {
      if (!wouldTakeAnswer()) {
        return false;
      }
      if (!Er("afk")) {
        return false;
      }
      let now = Date.now();
      buildAllowAnswerResult({
        questions: rt,
        answersToSubmit: answers,
        questionStates,
        input: payload.input,
        imageAttachments,
        imageLimits,
        afkTimeoutMs: Vd,
        isScreenReader: isScreenReaderEnabled,
      })
        .catch((error) => {
          if (_r.current === "afk") zr.current = false;
          logFeatureBad("ask_user_question_answer", "afk_build_failed");
          throw error;
        })
        .then((pl) => {
          if (_r.current !== "afk") {
            return;
          }
          flushInteractionTime();
          if (getLastInteractionTime() >= now || getTerminalFocus() === true) {
            zr.current = false;
            return;
          }
          if (answer(pl) === false) {
            zr.current = false;
            return;
          }
          logEvent("tengu_ask_user_question_afk_auto_advance", {
            ...(metadataSource && {
              source_hash: shortHash(metadataSource),
            }),
            timeoutMs: Vd,
            questionCount: rt.length,
            hadPartialAnswers: Object.keys(answers).length > 0,
            isInPlanMode: Sn,
          });
          Hi(answers, "afk_timeout");
          logFeatureSad("ask_user_question_answer", "afk_timeout", {
            questionCount: rt.length,
            hadPartialAnswers: Object.keys(answers).length > 0,
          });
        })
        .catch(logError);
    };
    $[96] = imageAttachments;
    $[97] = answer;
    $[98] = answers;
    $[99] = imageLimits;
    $[100] = Sn;
    $[101] = isScreenReaderEnabled;
    $[102] = Hi;
    $[103] = metadataSource;
    $[104] = payload.input;
    $[105] = questionStates;
    $[106] = rt;
    $[107] = wouldTakeAnswer;
    $[108] = mc;
  } else mc = $[108];
  let onTimeout = mc;
  let gd;
  if (
    $[109] !== allQuestionsAnswered ||
    $[110] !== answers ||
    $[111] !== Qn ||
    $[112] !== currentQuestionIndex ||
    $[113] !== minContentWidth ||
    $[114] !== Zr ||
    $[115] !== onFinalResponse ||
    $[116] !== onAnswer ||
    $[117] !== onRespondToClaude ||
    $[118] !== pd ||
    $[119] !== pi ||
    $[120] !== hideSubmitTab ||
    $[121] !== ur ||
    $[122] !== nextQuestion ||
    $[123] !== Wo ||
    $[124] !== kn ||
    $[125] !== io ||
    $[126] !== payload.permissionResult ||
    $[127] !== planFilePath ||
    $[128] !== questionStates ||
    $[129] !== rt ||
    $[130] !== setTextInputMode ||
    $[131] !== updateQuestionState ||
    $[132] !== wouldTakeAnswer
  ) {
    gd = Qn
      ? jsxProd_default(QuestionView, {
          wouldTakeAnswer,
          question: Qn,
          questions: rt,
          currentQuestionIndex,
          answers,
          questionStates,
          hideSubmitTab,
          minContentWidth,
          planFilePath,
          onUpdateQuestionState: updateQuestionState,
          onAnswer,
          onTextInputFocus: setTextInputMode,
          onCancel: Zr,
          onSubmit: nextQuestion,
          onTabPrev: pi,
          onTabNext: pd,
          onRespondToClaude,
          canPasteImage: wouldTakeAnswer,
          onImagePaste: (hd, bd) => Wo(Qn.key, hd, bd),
          pastedContents: io[Qn.key] ?? {},
          onRemoveImage: (id_0) => kn(Qn.key, id_0),
        })
      : ur
        ? jsxProd_default(SubmitQuestionsView, {
            questions: rt,
            currentQuestionIndex,
            answers,
            allQuestionsAnswered,
            permissionResult: payload.permissionResult,
            onFinalResponse,
          })
        : null;
    $[109] = allQuestionsAnswered;
    $[110] = answers;
    $[111] = Qn;
    $[112] = currentQuestionIndex;
    $[113] = minContentWidth;
    $[114] = Zr;
    $[115] = onFinalResponse;
    $[116] = onAnswer;
    $[117] = onRespondToClaude;
    $[118] = pd;
    $[119] = pi;
    $[120] = hideSubmitTab;
    $[121] = ur;
    $[122] = nextQuestion;
    $[123] = Wo;
    $[124] = kn;
    $[125] = io;
    $[126] = payload.permissionResult;
    $[127] = planFilePath;
    $[128] = questionStates;
    $[129] = rt;
    $[130] = setTextInputMode;
    $[131] = updateQuestionState;
    $[132] = wouldTakeAnswer;
    $[133] = gd;
  } else gd = $[133];
  let pc;
  if ($[134] !== _c || $[135] !== afkTimeoutMs || $[136] !== onTimeout) {
    pc = _c
      ? jsxProd_default(AfkCountdown, {
          enabled: true,
          timeoutMs: afkTimeoutMs ?? undefined,
          onTimeout,
        })
      : null;
    $[134] = _c;
    $[135] = afkTimeoutMs;
    $[136] = onTimeout;
    $[137] = pc;
  } else pc = $[137];
  let Kd;
  if ($[138] !== payload.requestId) {
    Kd = jsxProd_default(PluginNoticeLine, {
      toolUseId: payload.requestId,
    });
    $[138] = payload.requestId;
    $[139] = Kd;
  } else Kd = $[139];
  let ec;
  if ($[140] !== gd || $[141] !== pc || $[142] !== Kd) {
    ec = jsxProd_default_2(Ratchet, {
      children: [gd, pc, Kd],
    });
    $[140] = gd;
    $[141] = pc;
    $[142] = Kd;
    $[143] = ec;
  } else ec = $[143];
  return ec;
}
//@ chunk-18hwfzwa.js:1310202-1310738 layout
/**
 * 显示 "auto-continue in Ns" 倒计时的行。
 */
function AfkCountdown(props) {
  let ee = w(9);
  let { enabled, timeoutMs, onTimeout } = props;
  let ke;
  if (ee[0] !== enabled || ee[1] !== onTimeout || ee[2] !== timeoutMs) {
    ke = {
      enabled,
      timeoutMs,
      onTimeout,
    };
    ee[0] = enabled;
    ee[1] = onTimeout;
    ee[2] = timeoutMs;
    ee[3] = ke;
  } else ke = ee[3];
  let { remainingSeconds, showCountdown } = useAfkTimeout(ke);
  let children;
  if (ee[4] !== remainingSeconds || ee[5] !== showCountdown) {
    children = showCountdown
      ? jsxProd_default_2(Text, {
          color: "inactive",
          dimColor: true,
          children: ["auto-continue in ", remainingSeconds, "s \xB7 any key to stay"],
        })
      : null;
    ee[4] = remainingSeconds;
    ee[5] = showCountdown;
    ee[6] = children;
  } else children = ee[6];
  let We;
  if (ee[7] !== children) {
    We = jsxProd_default(Box, {
      height: 1,
      justifyContent: "flex-end",
      children,
    });
    ee[7] = children;
    ee[8] = We;
  } else We = ee[8];
  return We;
}
//@ chunk-18hwfzwa.js:1310738-1311224 layout
/**
 * 显示插件对该工具调用的提示文字的一行。
 */
function PluginNoticeLine(props) {
  let D = w(8);
  let { toolUseId } = props;
  let L;
  if (D[0] === MEMO_CACHE_SENTINEL) {
    L = emptyToolHooksFirst.noticesStore();
    D[0] = L;
  } else L = D[0];
  let ee;
  if (D[1] !== toolUseId) {
    ee = (ke) => ke.get(toolUseId);
    D[1] = toolUseId;
    D[2] = ee;
  } else ee = D[2];
  let storeSelector = useStoreSelector(L, ee);
  if (storeSelector === undefined) {
    return null;
  }
  let children;
  if (D[3] !== storeSelector.plugin || D[4] !== storeSelector.text) {
    children = formatSourceLine(storeSelector.plugin, storeSelector.text);
    D[3] = storeSelector.plugin;
    D[4] = storeSelector.text;
    D[5] = children;
  } else children = D[5];
  let He;
  if (D[6] !== children) {
    He = jsxProd_default(Box, {
      height: 1,
      justifyContent: "flex-end",
      children: jsxProd_default(Text, {
        color: "inactive",
        dimColor: true,
        children,
      }),
    });
    D[6] = children;
    D[7] = He;
  } else He = D[7];
  return He;
}
//@ chunk-18hwfzwa.js:1311224-1311838 layout
/**
 * 生成 AskUserQuestion 的 allow 结果：answers + 每题的预览/备注注解、AFK 超时，并附上缩放后的图片块。
 */
async function buildAllowAnswerResult(h) {
  let { questions, answersToSubmit, questionStates, input } = h;
  let ke = {};
  for (let question of questions) {
    let We = ownLookup(answersToSubmit, question.key);
    let ze = !h.isScreenReader && isPreviewCapableQuestion(question);
    let textInputValue = ze ? questionStates[question.key]?.textInputValue : undefined;
    let rt = ze && We ? question.options.find((option) => option.displayLabel === We) : undefined;
    let markdown = rt?.preview?.kind === "full" ? rt.preview.markdown : undefined;
    if (markdown || textInputValue?.trim())
      ke[question.key] = {
        ...(markdown && {
          preview: markdown,
        }),
        ...(textInputValue?.trim() && {
          notes: textInputValue.trim(),
        }),
      };
  }
  let updatedInput = {
    ...input,
    answers: answersToSubmit,
    annotations: ke,
    ...(h.afkTimeoutMs && {
      afkTimeoutMs: h.afkTimeoutMs,
    }),
  };
  let Be = await resizeImageBlocks(h.imageAttachments, h.imageLimits);
  return {
    behavior: "allow",
    updatedInput,
    ...(Be &&
      Be.length > 0 && {
        contentBlocks: Be,
      }),
  };
}
//@ chunk-18hwfzwa.js:1311838-1312370 layout
/**
 * 用户选择澄清时生成 deny 结果，反馈中列出已问问题与回答，并附图片。
 */
async function buildClarifyDenyResult(h) {
  let { questions, asked, answers, questionStates } = h;
  let feedback = `The user wants to clarify these questions.
    This means they may have additional information, context or questions for you.
    Take their response into account and then reformulate the questions if appropriate.
    Start by asking them what they would like to clarify.

    Questions asked:
${formatQuestionAnswers(questions, asked, answers, questionStates, h.isScreenReader)}`;
  let Be = await resizeImageBlocks(h.imageAttachments, h.imageLimits);
  return {
    behavior: "deny",
    feedback,
    ...(Be &&
      Be.length > 0 && {
        contentBlocks: Be,
      }),
  };
}
//@ chunk-18hwfzwa.js:1312370-1312666 placement = generateSectionReminders (0.324)
function formatQuestionAnswers(questions, asked, answers, questionStates, isScreenReader) {
  return questions.map((ke, Re) => {
    let Be = ownLookup(answers, ke.key);
    let He =
      !isScreenReader && isPreviewCapableQuestion(ke)
        ? questionStates[ke.key]?.textInputValue?.trim()
        : undefined;
    let ze = [`- "${(asked[Re] ?? ke).displayQuestion.text}"`];
    ze.push(Be ? `  Answer: ${Be}` : "  (No answer provided)");
    if (He) ze.push(`  User notes: ${He}`);
    return ze.join(`
`);
  }).join(`
`);
}
//@ chunk-18hwfzwa.js:1312666-1312744 placement
function isPreviewCapableQuestion(h) {
  return !h.multiSelect && h.options.some((option) => option.preview !== undefined);
}
//@ chunk-18hwfzwa.js:1312744-1312910 placement = parseDataUri (0.518)
/**
 * （切分错误）把一组图片按 limits 缩放成 image 块。
 */
async function resizeImageBlocks(imageAttachments, limits) {
  if (imageAttachments.length === 0) return;
  return Promise.all(
    imageAttachments.map(async (D) => {
      let { block } = await maybeResizeAndDownsampleImageBlock({
        data: D.content,
        mediaType: D.mediaType,
        limits,
      });
      return block;
    }),
  );
}
//@ chunk-mvvq2nx1.js:18079-18303 fingerprint = convertImagesToBlocks (0.466)
async function convertImagesToBlocks(e, limits, { timings: r } = {}) {
  let o = Ph(e);
  if (o === null) return null;
  try {
    let { block } = await maybeResizeAndDownsampleImageBlock({
      data: e,
      mediaType: o,
      limits,
      timings: r,
      from: "file",
    });
    if (block.type !== "image") return null;
    weakSet.add(block);
    return block;
  } catch {
    return null;
  }
}
export { hasOptionPreview, AskUserQuestionPermissionRequest, convertImagesToBlocks };
