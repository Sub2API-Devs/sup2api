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
import { sniffImageMediaType } from "../../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { maybeResizeAndDownsampleImageBlock, weakSet } from "../../../utils/imageResizer.js";
import {
  init_react_production,
  useEffectEvent,
  useState,
  useRef,
  useEffect,
} from "../../../../vendor/react/cjs/react.production.js";
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
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-mvvq2nx1.js:18079-18303 fingerprint (2.1.88 match: convertImagesToBlocks, 0.466)
async function convertImagesToBlocks(block, limits, { timings } = {}) {
  let mediaType = sniffImageMediaType(block);
  if (mediaType === null) return null;
  try {
    let { block: block_2 } = await maybeResizeAndDownsampleImageBlock({
      data: block,
      mediaType,
      limits,
      timings,
      from: "file",
    });
    if (block_2.type !== "image") return null;
    weakSet.add(block_2);
    return block_2;
  } catch {
    return null;
  }
}
//@ chunk-18hwfzwa.js:1287178-1287222 fingerprint (2.1.88 match: _temp, 1)
function hasOptionPreview(opt) {
  return opt.preview !== undefined;
}
//@ chunk-18hwfzwa.js:1295825-1295829 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1295825", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1295829-1295851 sole-consumer
var AFK_TIMEOUT_MS; // deferred: uses NOTIF_ACTIVE_THRESHOLD_MS (../../../bootstrap/state.js) of its import cycle while loading; runs once the cycle is complete
var AFK_COUNTDOWN_MS;
deferInit("chunk-18hwfzwa.js:1295829", () => {
  AFK_TIMEOUT_MS = NOTIF_ACTIVE_THRESHOLD_MS;
  AFK_COUNTDOWN_MS = 20000;
});
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
  let fireTimeout = useEffectEvent(onTimeout);
  let initialSeconds = Math.ceil(timeoutMs / 1000);
  let [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  let didTimeOutRef = useRef(false);
  let lastFocusedAtRef = useRef(Date.now());
  useEffect(() => {
    if (!enabled) return;
    lastFocusedAtRef.current = Date.now();
    didTimeOutRef.current = false;
    setRemainingSeconds(initialSeconds);
  }, [enabled, initialSeconds]);
  useInterval(
    () => {
      if (didTimeOutRef.current) return;
      flushInteractionTime();
      let now = Date.now();
      if (getTerminalFocus() === true) lastFocusedAtRef.current = now;
      let idleMs = now - Math.max(getLastInteractionTime(), lastFocusedAtRef.current);
      let nextSeconds =
        idleMs >= timeoutMs - countdownThresholdMs
          ? Math.max(0, Math.ceil((timeoutMs - idleMs) / 1000))
          : initialSeconds;
      setRemainingSeconds(nextSeconds);
      if (idleMs >= timeoutMs) {
        didTimeOutRef.current = true;
        if (fireTimeout(timeoutMs) === false) {
          didTimeOutRef.current = false;
          lastFocusedAtRef.current = now;
          setRemainingSeconds(initialSeconds);
        }
      }
    },
    enabled ? 1000 : null,
  );
  let showCountdown = remainingSeconds * 1000 <= countdownThresholdMs;
  return {
    remainingSeconds,
    showCountdown,
    timeoutMs,
  };
}
//@ chunk-18hwfzwa.js:1296488-1296530 file-local
function ownValues(contents) {
  return Object.values(contents);
}
//@ chunk-18hwfzwa.js:1296530-1296572 layout (2.1.88 match: _temp, 1)
function isImageBlock(c) {
  return c.type === "image";
}
//@ chunk-18hwfzwa.js:1296572-1296626 callgraph-fingerprint (2.1.88 match: _temp4, 1)
function selectToolPermissionContextMode_2(s) {
  return s.toolPermissionContext.mode;
}
//@ chunk-18hwfzwa.js:1296626-1296668 layout
function getQuestionTextInput(questionState) {
  return questionState.textInputValue;
}
//@ chunk-18hwfzwa.js:1296668-1296746 layout
function reportBuildResultFailure(error) {
  logFeatureBad("ask_user_question_answer", "build_result_failed");
  throw error;
}
//@ chunk-18hwfzwa.js:1296746-1296788 layout (2.1.88 match: _temp, 1)
function isImageValue(c) {
  return c.type === "image";
}
//@ chunk-18hwfzwa.js:1296788-1296821 layout
function logErrorReturningFalse(error) {
  logError(error);
  return false;
}
//@ chunk-18hwfzwa.js:1296821-1296832 layout
var PREVIEW_MIN_COLUMNS = 40;
//@ chunk-18hwfzwa.js:1296832-1297492 layout
/**
 * 把 AskUserQuestion 的问题转换为显示模型：问题/标题/选项标签去重、描述与预览（过长或可疑内容只显示 withheld）。
 */
function buildQuestionDisplays(questions, isEngineConfirm = false) {
  return questions.map((question) => {
    let splitTitle = isEngineConfirm ? splitQuestionTitleBody(question.question) : undefined;
    let questionField = displayField(question.question);
    let mapped = question.options.map((option) => option.label);
    let displayLabels = uniqueLabels(mapped, (label) =>
      replaceLineBreaks(displayField(label).text).replace(/\s+/g, " ").trim(),
    );
    return {
      key: question.question,
      displayQuestion:
        splitTitle === undefined
          ? questionField
          : {
              text: splitTitle.title,
              needsGutter: questionField.needsGutter,
            },
      displayBody: splitTitle?.body ?? [],
      displayHeader: hasNoVisibleText(question.header) ? "" : safeLabel(question.header),
      multiSelect: question.multiSelect ?? false,
      options: question.options.map((option, optionIndex) => ({
        value: option.label,
        displayLabel: displayLabels[optionIndex],
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
function optionDisplayLabel(questionDisplay, optionValue) {
  return questionDisplay.options.find((option) => option.value === optionValue)?.displayLabel ?? optionValue;
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
//@ chunk-18hwfzwa.js:1297673-1298701 callgraph-fingerprint (2.1.88 match: AskUserQuestionPermissionRequest, 0.242)
/**
 * AskUserQuestion 对话框入口：校验/改写问题后渲染 AskUserQuestionPermissionRequestBody。
 */
function AskUserQuestionPermissionRequest(props) {
  let $ = useMemoCache(12);
  let { payload, answer, wouldTakeAnswer } = props;
  let settings = useSettingsState();
  let highlight;
  if ($[0] !== settings.syntaxHighlightingDisabled) {
    highlight = settings.syntaxHighlightingDisabled ? null : getCliHighlightModule();
    $[0] = settings.syntaxHighlightingDisabled;
    $[1] = highlight;
  } else highlight = $[1];
  let highlight_2 = highlight;
  let afkTimeoutMs;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    afkTimeoutMs = getAfkTimeoutMs(getAskUserQuestionTimeout());
    $[2] = afkTimeoutMs;
  } else afkTimeoutMs = $[2];
  let afkTimeoutMs_2 = afkTimeoutMs;
  let buildRenderInput;
  let renderInputDeps;
  if ($[3] !== payload) {
    buildRenderInput = () => ({
      requestId: payload.requestId,
      props: {
        tool: payload.toolName,
        questions: payload.questions,
        metadataSource: payload.metadataSource,
      },
    });
    renderInputDeps = [payload];
    $[3] = payload;
    $[4] = buildRenderInput;
    $[5] = renderInputDeps;
  } else {
    buildRenderInput = $[4];
    renderInputDeps = $[5];
  }
  let renderInputHandle = actionKeysNamespace.useRenderInput(
    "AskUserQuestion",
    buildRenderInput,
    renderInputDeps,
  );
  let multipleChoiceState = useMultipleChoiceState();
  let frozenQuestionsRef = useRef(undefined);
  let renderHook;
  if (
    $[6] !== answer ||
    $[7] !== highlight_2 ||
    $[8] !== payload ||
    $[9] !== multipleChoiceState ||
    $[10] !== wouldTakeAnswer
  ) {
    renderHook = (args) => {
      let drawnQuestions =
        frozenQuestionsRef.current !== undefined && hasAnyAnswers(multipleChoiceState)
          ? frozenQuestionsRef.current
          : resolveRenderedQuestions(args, payload.questions);
      frozenQuestionsRef.current = drawnQuestions;
      return jsxProd_default(AskUserQuestionPermissionRequestBody, {
        payload: {
          ...payload,
          toolName: args.props.tool,
          questions: drawnQuestions,
          metadataSource: args.props.metadataSource,
        },
        asked: payload.questions,
        answer: (result) =>
          answer(remapAnswersToOriginalQuestions(result, drawnQuestions, payload.questions)),
        wouldTakeAnswer,
        highlight: highlight_2,
        afkTimeoutMs: afkTimeoutMs_2,
        state: multipleChoiceState,
      });
    };
    $[6] = answer;
    $[7] = highlight_2;
    $[8] = payload;
    $[9] = multipleChoiceState;
    $[10] = wouldTakeAnswer;
    $[11] = renderHook;
  } else renderHook = $[11];
  return actionKeysNamespace.useRenderHook(renderInputHandle, renderHook);
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
  let remapRecord = (record, remapValue) => {
    if (record === undefined) return record;
    let remapped = {};
    for (let [key, value] of Object.entries(record)) {
      let index = drawnQuestions.findIndex((drawnQuestion) => drawnQuestion.question === key);
      let originalQuestion = index === -1 ? undefined : originalQuestions[index];
      remapped[originalQuestion?.question ?? key] =
        originalQuestion === undefined ? value : remapValue(value, index);
    }
    return remapped;
  };
  let updatedInput = result.updatedInput;
  let remappedAnswers = remapRecord(updatedInput.answers, (label, questionIndex) => {
    let optionIndex =
      drawnQuestions[questionIndex]?.options.findIndex((option) => option.label === label) ?? -1;
    return optionIndex === -1
      ? label
      : (originalQuestions[questionIndex]?.options[optionIndex]?.label ?? label);
  });
  let remappedAnnotations = remapRecord(updatedInput.annotations, (annotation) => annotation);
  return {
    ...result,
    updatedInput: {
      ...updatedInput,
      ...(remappedAnswers !== undefined && {
        answers: remappedAnswers,
      }),
      ...(remappedAnnotations !== undefined && {
        annotations: remappedAnnotations,
      }),
    },
  };
}
//@ chunk-18hwfzwa.js:1299345-1299858 layout
/**
 * 校验插件改写后的问题：须通过工具输入结构且只改文案（kEo 校验），否则记警告并沿用原问题。
 */
function resolveRenderedQuestions(args, drawnQuestions) {
  if (
    args.props.questions === drawnQuestions ||
    jsonStringify(args.props.questions) === jsonStringify(drawnQuestions)
  )
    return drawnQuestions;
  let parsedInput = AskUserQuestionTool.inputSchema.safeParse({
    questions: args.props.questions,
  });
  if (!parsedInput.success) {
    logForDebugging(
      `ui.render (AskUserQuestion): rewritten questions do not match the tool's input schema (${parsedInput.error.message}); drawing the original`,
      {
        level: "warn",
      },
    );
    return drawnQuestions;
  }
  let violation = describeQuestionRewriteViolation(parsedInput.data.questions, drawnQuestions);
  if (violation !== undefined) {
    logForDebugging(
      `ui.render (AskUserQuestion): a rewrite may relabel the questions but not ${violation}; drawing the original`,
      {
        level: "warn",
      },
    );
    return drawnQuestions;
  }
  return parsedInput.data.questions;
}
//@ chunk-18hwfzwa.js:1299858-1300676 layout
/**
 * 比较改写前后的问题，返回不允许的改动描述（数量、多选、选项、预览、重复文本），合法时返回 undefined。
 */
function describeQuestionRewriteViolation(questions, drawnQuestions) {
  if (questions.length !== drawnQuestions.length)
    return `change how many questions there are (${drawnQuestions.length} asked, ${questions.length} drawn)`;
  for (let [index, drawnQuestion] of drawnQuestions.entries()) {
    let rewrittenQuestion = questions[index];
    if (rewrittenQuestion === undefined) return `leave question ${index + 1} out`;
    if ((rewrittenQuestion.multiSelect ?? false) !== (drawnQuestion.multiSelect ?? false))
      return `change whether question ${index + 1} is multi-select`;
    let mapped = drawnQuestion.options.map((option) => option.label);
    let mapped_2 = rewrittenQuestion.options.map((option) => option.label);
    if (jsonStringify(mapped_2) !== jsonStringify(mapped))
      return `change question ${index + 1}'s options (asked ${jsonStringify(mapped)}, drawn ${jsonStringify(mapped_2)})`;
    let mapped_3 = drawnQuestion.options.map((option) => option.preview);
    let mapped_4 = rewrittenQuestion.options.map((option) => option.preview);
    if (jsonStringify(mapped_4) !== jsonStringify(mapped_3)) return `change question ${index + 1}'s previews`;
    let sharesQuestionText = (otherQuestion, otherIndex) =>
      otherIndex !== index && otherQuestion.question === rewrittenQuestion.question;
    let questionJson = jsonStringify(rewrittenQuestion.question);
    if (questions.some(sharesQuestionText)) return `give two questions one text (${questionJson})`;
    if (drawnQuestions.some(sharesQuestionText))
      return `give question ${index + 1} another question's text (${questionJson})`;
  }
  return;
}
//@ chunk-18hwfzwa.js:1300676-1310202 fingerprint (2.1.88 match: AskUserQuestionPermissionRequestBody, 0.68)
/**
 * 问答主体：多问题状态（useMultipleChoiceState）、导航条、单问题/预览视图、粘贴图片附件、提交页；提交时把答案（与图片）组装为工具结果。
 */
function AskUserQuestionPermissionRequestBody(props) {
  let $ = useMemoCache(144);
  let { payload, asked, answer, wouldTakeAnswer, highlight, afkTimeoutMs, state } = props;
  let metadataSource = payload.metadataSource;
  let [theme] = useTheme();
  let questionDisplays;
  if ($[0] !== payload.isEngineConfirm || $[1] !== payload.questions) {
    questionDisplays = buildQuestionDisplays(payload.questions, payload.isEngineConfirm);
    $[0] = payload.isEngineConfirm;
    $[1] = payload.questions;
    $[2] = questionDisplays;
  } else questionDisplays = $[2];
  let questionDisplays_2 = questionDisplays;
  let askedDisplays;
  if (
    $[3] !== asked ||
    $[4] !== payload.isEngineConfirm ||
    $[5] !== payload.questions ||
    $[6] !== questionDisplays_2
  ) {
    askedDisplays =
      asked === payload.questions
        ? questionDisplays_2
        : buildQuestionDisplays(asked, payload.isEngineConfirm);
    $[3] = asked;
    $[4] = payload.isEngineConfirm;
    $[5] = payload.questions;
    $[6] = questionDisplays_2;
    $[7] = askedDisplays;
  } else askedDisplays = $[7];
  let asked_2 = askedDisplays;
  let contentWidth;
  if ($[8] !== highlight || $[9] !== questionDisplays_2 || $[10] !== theme) {
    contentWidth = PREVIEW_MIN_COLUMNS;
    for (const display of questionDisplays_2) {
      for (const opt of display.options) {
        if (opt.preview?.kind !== "full") {
          continue;
        }
        let rendered = renderMarkdownToAnsi(opt.preview.markdown, theme, highlight);
        for (const line of rendered.split(`
`))
          contentWidth = Math.max(contentWidth, bunStringWidth(line));
      }
    }
    $[8] = highlight;
    $[9] = questionDisplays_2;
    $[10] = theme;
    $[11] = contentWidth;
  } else contentWidth = $[11];
  let minContentWidth = contentWidth;
  let emptyImages;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    emptyImages = {};
    $[12] = emptyImages;
  } else emptyImages = $[12];
  let [imagesByQuestion, setImagesByQuestion] = useState(emptyImages);
  let setAppState = useSetAppState();
  let onImagePaste;
  if ($[13] !== imagesByQuestion || $[14] !== setAppState || $[15] !== wouldTakeAnswer) {
    onImagePaste = function onImagePaste(questionText, base64Image, mediaType) {
      if (!wouldTakeAnswer()) {
        return;
      }
      let pasteId = mintPasteId(undefined, imagesByQuestion[questionText]);
      let newContent = {
        id: pasteId,
        type: "image",
        content: base64Image,
        mediaType: mediaType?.mediaType || "image/png",
        filename: mediaType?.filename || "Pasted image",
        dimensions: mediaType?.dimensions,
      };
      let recordStoredImagePath = setSliceField(setAppState, "storedImagePaths");
      recordImagePath(newContent, recordStoredImagePath);
      storeImageAndRecord(newContent, recordStoredImagePath);
      setImagesByQuestion((prev) => ({
        ...prev,
        [questionText]: {
          ...(prev[questionText] ?? {}),
          [pasteId]: newContent,
        },
      }));
    };
    $[13] = imagesByQuestion;
    $[14] = setAppState;
    $[15] = wouldTakeAnswer;
    $[16] = onImagePaste;
  } else onImagePaste = $[16];
  let onImagePasteStable = onImagePaste;
  let removeImage;
  if ($[17] !== wouldTakeAnswer) {
    removeImage = (questionText, id) => {
      if (!wouldTakeAnswer()) {
        return false;
      }
      setImagesByQuestion((prev) => {
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
    $[18] = removeImage;
  } else removeImage = $[18];
  let onRemoveImage = removeImage;
  let imageAttachments;
  if ($[19] !== imagesByQuestion) {
    imageAttachments = Object.values(imagesByQuestion).flatMap(ownValues).filter(isImageBlock);
    $[19] = imagesByQuestion;
    $[20] = imageAttachments;
  } else imageAttachments = $[20];
  let imageAttachments_2 = imageAttachments;
  let toolPermissionContextMode = useAppState(selectToolPermissionContextMode_2);
  let mainLoopModel = useMainLoopModel_3();
  let imageLimits;
  if ($[21] !== mainLoopModel) {
    imageLimits = imageLimitsForModel(mainLoopModel);
    $[21] = mainLoopModel;
    $[22] = imageLimits;
  } else imageLimits = $[22];
  let imageLimits_2 = imageLimits;
  let isPlanMode = toolPermissionContextMode === "plan";
  let planFilePath;
  if ($[23] !== isPlanMode) {
    planFilePath = isPlanMode ? getPlanFilePath() : undefined;
    $[23] = isPlanMode;
    $[24] = planFilePath;
  } else planFilePath = $[24];
  let planFilePath_2 = planFilePath;
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
  let getTextInputs;
  if ($[25] !== questionStates) {
    getTextInputs = () => Object.values(questionStates).map(getQuestionTextInput);
    $[25] = questionStates;
    $[26] = getTextInputs;
  } else getTextInputs = $[26];
  let textInputs = useEffectEvent(getTextInputs);
  let registerPasteCarrierEffect;
  if ($[27] !== textInputs) {
    registerPasteCarrierEffect = () => registerPasteCarrier(() => textInputs());
    $[27] = textInputs;
    $[28] = registerPasteCarrierEffect;
  } else registerPasteCarrierEffect = $[28];
  let pasteCarrierDeps;
  if ($[29] === MEMO_CACHE_SENTINEL) {
    pasteCarrierDeps = [];
    $[29] = pasteCarrierDeps;
  } else pasteCarrierDeps = $[29];
  useEffect(registerPasteCarrierEffect, pasteCarrierDeps);
  useRegisterOverlay("ask-user-question-text-input", isInTextInput);
  let currentQuestion =
    currentQuestionIndex < (questionDisplays_2?.length || 0)
      ? questionDisplays_2?.[currentQuestionIndex]
      : null;
  let isSubmitTab = currentQuestionIndex === (questionDisplays_2?.length || 0);
  let allQuestionsAnswered;
  if ($[30] !== answers || $[31] !== questionDisplays_2) {
    allQuestionsAnswered = questionDisplays_2?.every((q_0) => !!ownLookup(answers, q_0.key)) ?? false;
    $[30] = answers;
    $[31] = questionDisplays_2;
    $[32] = allQuestionsAnswered;
  } else allQuestionsAnswered = $[32];
  let allQuestionsAnswered_2 = allQuestionsAnswered;
  let hideSubmitTab = questionDisplays_2.length === 1 && !questionDisplays_2[0]?.multiSelect;
  let onReject;
  if (
    $[33] !== answer ||
    $[34] !== isPlanMode ||
    $[35] !== metadataSource ||
    $[36] !== questionDisplays_2.length
  ) {
    onReject = () => {
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
          questionCount: questionDisplays_2.length,
          isInPlanMode: isPlanMode,
        });
    };
    $[33] = answer;
    $[34] = isPlanMode;
    $[35] = metadataSource;
    $[36] = questionDisplays_2.length;
    $[37] = onReject;
  } else onReject = $[37];
  let onRejectStable = onReject;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let hasAnsweredRef = useRef(false);
  let answerSourceRef = useRef("user");
  let lastAnswerRef = useRef(null);
  let claimAnswer;
  if ($[38] === MEMO_CACHE_SENTINEL) {
    claimAnswer = function claimAnswerImpl(source) {
      if (hasAnsweredRef.current && (source === "afk" || answerSourceRef.current !== "afk")) {
        return false;
      }
      hasAnsweredRef.current = true;
      answerSourceRef.current = source;
      return true;
    };
    $[38] = claimAnswer;
  } else claimAnswer = $[38];
  let claimAnswerStable = claimAnswer;
  let onRespondToClaude;
  if (
    $[39] !== imageAttachments_2 ||
    $[40] !== answer ||
    $[41] !== answers ||
    $[42] !== asked_2 ||
    $[43] !== imageLimits_2 ||
    $[44] !== isPlanMode ||
    $[45] !== isScreenReaderEnabled ||
    $[46] !== metadataSource ||
    $[47] !== questionStates ||
    $[48] !== questionDisplays_2 ||
    $[49] !== wouldTakeAnswer
  ) {
    onRespondToClaude = async () => {
      if (!wouldTakeAnswer()) {
        return;
      }
      if (!claimAnswerStable("user")) {
        return;
      }
      let denyResult = await buildClarifyDenyResult({
        questions: questionDisplays_2,
        asked: asked_2,
        answers,
        questionStates,
        imageAttachments: imageAttachments_2,
        imageLimits: imageLimits_2,
        isScreenReader: isScreenReaderEnabled,
      }).catch((q_1) => {
        hasAnsweredRef.current = false;
        logFeatureBad("ask_user_question_answer", "respond_build_failed");
        logError(q_1);
      });
      if (denyResult === undefined) {
        return;
      }
      if (answer(denyResult) === false) {
        hasAnsweredRef.current = false;
        return;
      }
      if (metadataSource)
        logEvent("tengu_ask_user_question_respond_to_claude", {
          source_hash: shortHash(metadataSource),
          questionCount: questionDisplays_2.length,
          isInPlanMode: isPlanMode,
        });
    };
    $[39] = imageAttachments_2;
    $[40] = answer;
    $[41] = answers;
    $[42] = asked_2;
    $[43] = imageLimits_2;
    $[44] = isPlanMode;
    $[45] = isScreenReaderEnabled;
    $[46] = metadataSource;
    $[47] = questionStates;
    $[48] = questionDisplays_2;
    $[49] = wouldTakeAnswer;
    $[50] = onRespondToClaude;
  } else onRespondToClaude = $[50];
  let onRespondToClaude_2 = onRespondToClaude;
  let logSkipped;
  if ($[51] !== isPlanMode || $[52] !== metadataSource || $[53] !== questionDisplays_2) {
    logSkipped = (answersToSubmit, reason) => {
      let skippedCount = count(questionDisplays_2, (q_2) => !ownLookup(answersToSubmit, q_2.key));
      if (skippedCount === 0) {
        return;
      }
      logEvent("tengu_ask_user_question_skipped", {
        ...(metadataSource && {
          source_hash: shortHash(metadataSource),
        }),
        skippedCount,
        questionCount: questionDisplays_2.length,
        reason: fromEnum(reason),
        isInPlanMode: isPlanMode,
      });
    };
    $[51] = isPlanMode;
    $[52] = metadataSource;
    $[53] = questionDisplays_2;
    $[54] = logSkipped;
  } else logSkipped = $[54];
  let logSkippedStable = logSkipped;
  let submitAnswers;
  if (
    $[55] !== imageAttachments_2 ||
    $[56] !== answer ||
    $[57] !== imageLimits_2 ||
    $[58] !== isPlanMode ||
    $[59] !== isScreenReaderEnabled ||
    $[60] !== logSkippedStable ||
    $[61] !== metadataSource ||
    $[62] !== payload.input ||
    $[63] !== questionStates ||
    $[64] !== questionDisplays_2
  ) {
    submitAnswers = async (answersToSubmit) => {
      let allowResult = await buildAllowAnswerResult({
        questions: questionDisplays_2,
        answersToSubmit,
        questionStates,
        input: payload.input,
        imageAttachments: imageAttachments_2,
        imageLimits: imageLimits_2,
        isScreenReader: isScreenReaderEnabled,
      }).catch(reportBuildResultFailure);
      if (answer(allowResult) === false) {
        return false;
      }
      if (metadataSource)
        logEvent("tengu_ask_user_question_accepted", {
          source_hash: shortHash(metadataSource),
          questionCount: questionDisplays_2.length,
          answerCount: Object.keys(answersToSubmit).length,
          isInPlanMode: isPlanMode,
        });
      logSkippedStable(answersToSubmit, "user_submit");
      if (count(questionDisplays_2, (opt_1) => !ownLookup(answersToSubmit, opt_1.key)) === 0)
        logFeatureOk("ask_user_question_answer", {
          questionCount: questionDisplays_2.length,
        });
      else
        logFeatureSad("ask_user_question_answer", "user_skipped_questions", {
          questionCount: questionDisplays_2.length,
        });
      return true;
    };
    $[55] = imageAttachments_2;
    $[56] = answer;
    $[57] = imageLimits_2;
    $[58] = isPlanMode;
    $[59] = isScreenReaderEnabled;
    $[60] = logSkippedStable;
    $[61] = metadataSource;
    $[62] = payload.input;
    $[63] = questionStates;
    $[64] = questionDisplays_2;
    $[65] = submitAnswers;
  } else submitAnswers = $[65];
  let submitAnswersStable = submitAnswers;
  let onAnswer;
  if (
    $[66] !== answers ||
    $[67] !== imagesByQuestion ||
    $[68] !== questionDisplays_2 ||
    $[69] !== setAnswer ||
    $[70] !== submitAnswersStable ||
    $[71] !== updateQuestionState
  ) {
    onAnswer = (questionText_1, label, textInput, t17) => {
      let shouldAdvance = t17 === undefined ? true : t17;
      let isArray = Array.isArray(label);
      let questionImages = Object.values(imagesByQuestion[questionText_1] ?? {}).some(isImageValue);
      let questionDisplay = questionDisplays_2.find((question) => question.key === questionText_1);
      let displayLabel = (optionValue) =>
        questionDisplay !== undefined ? optionDisplayLabel(questionDisplay, optionValue) : optionValue;
      let displayValue;
      if (isArray) displayValue = formatSelectionList(label.map(displayLabel));
      else if (textInput) displayValue = questionImages ? `${textInput} (Image attached)` : textInput;
      else if (label === "__other__") displayValue = questionImages ? "(Image attached)" : label;
      else displayValue = displayLabel(label);
      let isSingleQuestion = questionDisplays_2.length === 1;
      if (!isArray && isSingleQuestion && shouldAdvance) {
        let nextAnswers = {
          ...answers,
          [questionText_1]: displayValue,
        };
        if (!claimAnswerStable("user")) {
          let lastAnswer = lastAnswerRef.current;
          if (lastAnswer?.question !== questionText_1 || lastAnswer.answer !== displayValue)
            updateQuestionState(
              questionText_1,
              {
                selectedValue: undefined,
              },
              false,
            );
          return;
        }
        lastAnswerRef.current = {
          question: questionText_1,
          answer: displayValue,
        };
        submitAnswersStable(nextAnswers)
          .catch(logErrorReturningFalse)
          .then((didSubmit) => {
            if (!didSubmit) {
              hasAnsweredRef.current = false;
              lastAnswerRef.current = null;
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
      setAnswer(questionText_1, displayValue, shouldAdvance);
    };
    $[66] = answers;
    $[67] = imagesByQuestion;
    $[68] = questionDisplays_2;
    $[69] = setAnswer;
    $[70] = submitAnswersStable;
    $[71] = updateQuestionState;
    $[72] = onAnswer;
  } else onAnswer = $[72];
  let onAnswer_2 = onAnswer;
  let onFinalResponse;
  if (
    $[73] !== answers ||
    $[74] !== onRejectStable ||
    $[75] !== submitAnswersStable ||
    $[76] !== wouldTakeAnswer
  ) {
    onFinalResponse = function handleFinalResponse(value) {
      if (value === "cancel") {
        onRejectStable();
        return;
      }
      if (value === "submit") {
        if (!wouldTakeAnswer()) {
          return;
        }
        if (!claimAnswerStable("user")) {
          return;
        }
        submitAnswersStable(answers)
          .then((didSubmit) => {
            if (!didSubmit) hasAnsweredRef.current = false;
          })
          .catch((error) => {
            logError(error);
            hasAnsweredRef.current = false;
          });
      }
    };
    $[73] = answers;
    $[74] = onRejectStable;
    $[75] = submitAnswersStable;
    $[76] = wouldTakeAnswer;
    $[77] = onFinalResponse;
  } else onFinalResponse = $[77];
  let onFinalResponse_2 = onFinalResponse;
  let lastTabIndex = hideSubmitTab ? (questionDisplays_2?.length || 1) - 1 : questionDisplays_2?.length || 0;
  let onTabPrev;
  if ($[78] !== currentQuestionIndex || $[79] !== prevQuestion || $[80] !== wouldTakeAnswer) {
    onTabPrev = () => {
      if (currentQuestionIndex > 0 && wouldTakeAnswer()) prevQuestion();
    };
    $[78] = currentQuestionIndex;
    $[79] = prevQuestion;
    $[80] = wouldTakeAnswer;
    $[81] = onTabPrev;
  } else onTabPrev = $[81];
  let onTabPrevStable = onTabPrev;
  let onTabNext;
  if (
    $[82] !== currentQuestionIndex ||
    $[83] !== lastTabIndex ||
    $[84] !== nextQuestion ||
    $[85] !== wouldTakeAnswer
  ) {
    onTabNext = () => {
      if (currentQuestionIndex < lastTabIndex && wouldTakeAnswer()) nextQuestion();
    };
    $[82] = currentQuestionIndex;
    $[83] = lastTabIndex;
    $[84] = nextQuestion;
    $[85] = wouldTakeAnswer;
    $[86] = onTabNext;
  } else onTabNext = $[86];
  let onTabNextStable = onTabNext;
  let tabKeybindings;
  if ($[87] !== onTabNextStable || $[88] !== onTabPrevStable) {
    tabKeybindings = {
      "tabs:previous": onTabPrevStable,
      "tabs:next": onTabNextStable,
    };
    $[87] = onTabNextStable;
    $[88] = onTabPrevStable;
    $[89] = tabKeybindings;
  } else tabKeybindings = $[89];
  const isActive = !(isInTextInput && !isSubmitTab);
  let tabsKeyArgs;
  if ($[90] !== isActive) {
    tabsKeyArgs = {
      context: "Tabs",
      isActive,
    };
    $[90] = isActive;
    $[91] = tabsKeyArgs;
  } else tabsKeyArgs = $[91];
  MessageActionsKeybindings(tabKeybindings, tabsKeyArgs);
  let showAfkCountdown;
  if ($[92] !== afkTimeoutMs || $[93] !== isScreenReaderEnabled || $[94] !== payload.hasExternalRacer) {
    showAfkCountdown =
      !isScreenReaderEnabled &&
      !payload.hasExternalRacer &&
      !isBgSession() &&
      (afkTimeoutMs !== null || env.CLAUDE_AFK_TIMEOUT_MS !== undefined);
    $[92] = afkTimeoutMs;
    $[93] = isScreenReaderEnabled;
    $[94] = payload.hasExternalRacer;
    $[95] = showAfkCountdown;
  } else showAfkCountdown = $[95];
  let showAfkCountdown_2 = showAfkCountdown;
  let onTimeout;
  if (
    $[96] !== imageAttachments_2 ||
    $[97] !== answer ||
    $[98] !== answers ||
    $[99] !== imageLimits_2 ||
    $[100] !== isPlanMode ||
    $[101] !== isScreenReaderEnabled ||
    $[102] !== logSkippedStable ||
    $[103] !== metadataSource ||
    $[104] !== payload.input ||
    $[105] !== questionStates ||
    $[106] !== questionDisplays_2 ||
    $[107] !== wouldTakeAnswer
  ) {
    onTimeout = (timeoutMs) => {
      if (!wouldTakeAnswer()) {
        return false;
      }
      if (!claimAnswerStable("afk")) {
        return false;
      }
      let now = Date.now();
      buildAllowAnswerResult({
        questions: questionDisplays_2,
        answersToSubmit: answers,
        questionStates,
        input: payload.input,
        imageAttachments: imageAttachments_2,
        imageLimits: imageLimits_2,
        afkTimeoutMs: timeoutMs,
        isScreenReader: isScreenReaderEnabled,
      })
        .catch((error) => {
          if (answerSourceRef.current === "afk") hasAnsweredRef.current = false;
          logFeatureBad("ask_user_question_answer", "afk_build_failed");
          throw error;
        })
        .then((allowResult) => {
          if (answerSourceRef.current !== "afk") {
            return;
          }
          flushInteractionTime();
          if (getLastInteractionTime() >= now || getTerminalFocus() === true) {
            hasAnsweredRef.current = false;
            return;
          }
          if (answer(allowResult) === false) {
            hasAnsweredRef.current = false;
            return;
          }
          logEvent("tengu_ask_user_question_afk_auto_advance", {
            ...(metadataSource && {
              source_hash: shortHash(metadataSource),
            }),
            timeoutMs,
            questionCount: questionDisplays_2.length,
            hadPartialAnswers: Object.keys(answers).length > 0,
            isInPlanMode: isPlanMode,
          });
          logSkippedStable(answers, "afk_timeout");
          logFeatureSad("ask_user_question_answer", "afk_timeout", {
            questionCount: questionDisplays_2.length,
            hadPartialAnswers: Object.keys(answers).length > 0,
          });
        })
        .catch(logError);
    };
    $[96] = imageAttachments_2;
    $[97] = answer;
    $[98] = answers;
    $[99] = imageLimits_2;
    $[100] = isPlanMode;
    $[101] = isScreenReaderEnabled;
    $[102] = logSkippedStable;
    $[103] = metadataSource;
    $[104] = payload.input;
    $[105] = questionStates;
    $[106] = questionDisplays_2;
    $[107] = wouldTakeAnswer;
    $[108] = onTimeout;
  } else onTimeout = $[108];
  let onTimeout_2 = onTimeout;
  let viewElement;
  if (
    $[109] !== allQuestionsAnswered_2 ||
    $[110] !== answers ||
    $[111] !== currentQuestion ||
    $[112] !== currentQuestionIndex ||
    $[113] !== minContentWidth ||
    $[114] !== onRejectStable ||
    $[115] !== onFinalResponse_2 ||
    $[116] !== onAnswer_2 ||
    $[117] !== onRespondToClaude_2 ||
    $[118] !== onTabNextStable ||
    $[119] !== onTabPrevStable ||
    $[120] !== hideSubmitTab ||
    $[121] !== isSubmitTab ||
    $[122] !== nextQuestion ||
    $[123] !== onImagePasteStable ||
    $[124] !== onRemoveImage ||
    $[125] !== imagesByQuestion ||
    $[126] !== payload.permissionResult ||
    $[127] !== planFilePath_2 ||
    $[128] !== questionStates ||
    $[129] !== questionDisplays_2 ||
    $[130] !== setTextInputMode ||
    $[131] !== updateQuestionState ||
    $[132] !== wouldTakeAnswer
  ) {
    viewElement = currentQuestion
      ? jsxProd_default(QuestionView, {
          wouldTakeAnswer,
          question: currentQuestion,
          questions: questionDisplays_2,
          currentQuestionIndex,
          answers,
          questionStates,
          hideSubmitTab,
          minContentWidth,
          planFilePath: planFilePath_2,
          onUpdateQuestionState: updateQuestionState,
          onAnswer: onAnswer_2,
          onTextInputFocus: setTextInputMode,
          onCancel: onRejectStable,
          onSubmit: nextQuestion,
          onTabPrev: onTabPrevStable,
          onTabNext: onTabNextStable,
          onRespondToClaude: onRespondToClaude_2,
          canPasteImage: wouldTakeAnswer,
          onImagePaste: (text, meta) => onImagePasteStable(currentQuestion.key, text, meta),
          pastedContents: imagesByQuestion[currentQuestion.key] ?? {},
          onRemoveImage: (id_0) => onRemoveImage(currentQuestion.key, id_0),
        })
      : isSubmitTab
        ? jsxProd_default(SubmitQuestionsView, {
            questions: questionDisplays_2,
            currentQuestionIndex,
            answers,
            allQuestionsAnswered: allQuestionsAnswered_2,
            permissionResult: payload.permissionResult,
            onFinalResponse: onFinalResponse_2,
          })
        : null;
    $[109] = allQuestionsAnswered_2;
    $[110] = answers;
    $[111] = currentQuestion;
    $[112] = currentQuestionIndex;
    $[113] = minContentWidth;
    $[114] = onRejectStable;
    $[115] = onFinalResponse_2;
    $[116] = onAnswer_2;
    $[117] = onRespondToClaude_2;
    $[118] = onTabNextStable;
    $[119] = onTabPrevStable;
    $[120] = hideSubmitTab;
    $[121] = isSubmitTab;
    $[122] = nextQuestion;
    $[123] = onImagePasteStable;
    $[124] = onRemoveImage;
    $[125] = imagesByQuestion;
    $[126] = payload.permissionResult;
    $[127] = planFilePath_2;
    $[128] = questionStates;
    $[129] = questionDisplays_2;
    $[130] = setTextInputMode;
    $[131] = updateQuestionState;
    $[132] = wouldTakeAnswer;
    $[133] = viewElement;
  } else viewElement = $[133];
  let afkCountdown;
  if ($[134] !== showAfkCountdown_2 || $[135] !== afkTimeoutMs || $[136] !== onTimeout_2) {
    afkCountdown = showAfkCountdown_2
      ? jsxProd_default(AfkCountdown, {
          enabled: true,
          timeoutMs: afkTimeoutMs ?? undefined,
          onTimeout: onTimeout_2,
        })
      : null;
    $[134] = showAfkCountdown_2;
    $[135] = afkTimeoutMs;
    $[136] = onTimeout_2;
    $[137] = afkCountdown;
  } else afkCountdown = $[137];
  let pluginNotice;
  if ($[138] !== payload.requestId) {
    pluginNotice = jsxProd_default(PluginNoticeLine, {
      toolUseId: payload.requestId,
    });
    $[138] = payload.requestId;
    $[139] = pluginNotice;
  } else pluginNotice = $[139];
  let content;
  if ($[140] !== viewElement || $[141] !== afkCountdown || $[142] !== pluginNotice) {
    content = jsxProd_default_2(Ratchet, {
      children: [viewElement, afkCountdown, pluginNotice],
    });
    $[140] = viewElement;
    $[141] = afkCountdown;
    $[142] = pluginNotice;
    $[143] = content;
  } else content = $[143];
  return content;
}
//@ chunk-18hwfzwa.js:1310202-1310738 layout
/**
 * 显示 "auto-continue in Ns" 倒计时的行。
 */
function AfkCountdown(props) {
  let $ = useMemoCache(9);
  let { enabled, timeoutMs, onTimeout } = props;
  let timeoutOptions;
  if ($[0] !== enabled || $[1] !== onTimeout || $[2] !== timeoutMs) {
    timeoutOptions = {
      enabled,
      timeoutMs,
      onTimeout,
    };
    $[0] = enabled;
    $[1] = onTimeout;
    $[2] = timeoutMs;
    $[3] = timeoutOptions;
  } else timeoutOptions = $[3];
  let { remainingSeconds, showCountdown } = useAfkTimeout(timeoutOptions);
  let children;
  if ($[4] !== remainingSeconds || $[5] !== showCountdown) {
    children = showCountdown
      ? jsxProd_default_2(Text, {
          color: "inactive",
          dimColor: true,
          children: ["auto-continue in ", remainingSeconds, "s \xB7 any key to stay"],
        })
      : null;
    $[4] = remainingSeconds;
    $[5] = showCountdown;
    $[6] = children;
  } else children = $[6];
  let rowElement;
  if ($[7] !== children) {
    rowElement = jsxProd_default(Box, {
      height: 1,
      justifyContent: "flex-end",
      children,
    });
    $[7] = children;
    $[8] = rowElement;
  } else rowElement = $[8];
  return rowElement;
}
//@ chunk-18hwfzwa.js:1310738-1311224 layout
/**
 * 显示插件对该工具调用的提示文字的一行。
 */
function PluginNoticeLine(props) {
  let $ = useMemoCache(8);
  let { toolUseId } = props;
  let noticesStore;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    noticesStore = emptyToolHooksFirst.noticesStore();
    $[0] = noticesStore;
  } else noticesStore = $[0];
  let selectNotice;
  if ($[1] !== toolUseId) {
    selectNotice = (store) => store.get(toolUseId);
    $[1] = toolUseId;
    $[2] = selectNotice;
  } else selectNotice = $[2];
  let storeSelector = useStoreSelector(noticesStore, selectNotice);
  if (storeSelector === undefined) {
    return null;
  }
  let children;
  if ($[3] !== storeSelector.plugin || $[4] !== storeSelector.text) {
    children = formatSourceLine(storeSelector.plugin, storeSelector.text);
    $[3] = storeSelector.plugin;
    $[4] = storeSelector.text;
    $[5] = children;
  } else children = $[5];
  let noticeElement;
  if ($[6] !== children) {
    noticeElement = jsxProd_default(Box, {
      height: 1,
      justifyContent: "flex-end",
      children: jsxProd_default(Text, {
        color: "inactive",
        dimColor: true,
        children,
      }),
    });
    $[6] = children;
    $[7] = noticeElement;
  } else noticeElement = $[7];
  return noticeElement;
}
//@ chunk-18hwfzwa.js:1311224-1311838 layout
/**
 * 生成 AskUserQuestion 的 allow 结果：answers + 每题的预览/备注注解、AFK 超时，并附上缩放后的图片块。
 */
async function buildAllowAnswerResult(args) {
  let { questions, answersToSubmit, questionStates, input } = args;
  let annotations = {};
  for (let question of questions) {
    let answerLabel = ownLookup(answersToSubmit, question.key);
    let isPreviewCapable = !args.isScreenReader && isPreviewCapableQuestion(question);
    let textInputValue = isPreviewCapable ? questionStates[question.key]?.textInputValue : undefined;
    let selectedOption =
      isPreviewCapable && answerLabel
        ? question.options.find((option) => option.displayLabel === answerLabel)
        : undefined;
    let markdown = selectedOption?.preview?.kind === "full" ? selectedOption.preview.markdown : undefined;
    if (markdown || textInputValue?.trim())
      annotations[question.key] = {
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
    annotations,
    ...(args.afkTimeoutMs && {
      afkTimeoutMs: args.afkTimeoutMs,
    }),
  };
  let resizedImages = await resizeImageBlocks(args.imageAttachments, args.imageLimits);
  return {
    behavior: "allow",
    updatedInput,
    ...(resizedImages &&
      resizedImages.length > 0 && {
        contentBlocks: resizedImages,
      }),
  };
}
//@ chunk-18hwfzwa.js:1311838-1312370 layout
/**
 * 用户选择澄清时生成 deny 结果，反馈中列出已问问题与回答，并附图片。
 */
async function buildClarifyDenyResult(args) {
  let { questions, asked, answers, questionStates } = args;
  let feedback = `The user wants to clarify these questions.
    This means they may have additional information, context or questions for you.
    Take their response into account and then reformulate the questions if appropriate.
    Start by asking them what they would like to clarify.

    Questions asked:
${formatQuestionAnswers(questions, asked, answers, questionStates, args.isScreenReader)}`;
  let resizedImages = await resizeImageBlocks(args.imageAttachments, args.imageLimits);
  return {
    behavior: "deny",
    feedback,
    ...(resizedImages &&
      resizedImages.length > 0 && {
        contentBlocks: resizedImages,
      }),
  };
}
//@ chunk-18hwfzwa.js:1312370-1312666 placement (2.1.88 match: generateSectionReminders, 0.324)
function formatQuestionAnswers(questions, asked, answers, questionStates, isScreenReader) {
  return questions.map((question, index) => {
    let answer = ownLookup(answers, question.key);
    let userNotes =
      !isScreenReader && isPreviewCapableQuestion(question)
        ? questionStates[question.key]?.textInputValue?.trim()
        : undefined;
    let lines = [`- "${(asked[index] ?? question).displayQuestion.text}"`];
    lines.push(answer ? `  Answer: ${answer}` : "  (No answer provided)");
    if (userNotes) lines.push(`  User notes: ${userNotes}`);
    return lines.join(`
`);
  }).join(`
`);
}
//@ chunk-18hwfzwa.js:1312666-1312744 placement
function isPreviewCapableQuestion(question) {
  return !question.multiSelect && question.options.some((option) => option.preview !== undefined);
}
//@ chunk-18hwfzwa.js:1312744-1312910 placement (2.1.88 match: parseDataUri, 0.518)
/**
 * （切分错误）把一组图片按 limits 缩放成 image 块。
 */
async function resizeImageBlocks(imageAttachments, limits) {
  if (imageAttachments.length === 0) return;
  return Promise.all(
    imageAttachments.map(async (attachment) => {
      let { block } = await maybeResizeAndDownsampleImageBlock({
        data: attachment.content,
        mediaType: attachment.mediaType,
        limits,
      });
      return block;
    }),
  );
}
export { hasOptionPreview, AskUserQuestionPermissionRequest, convertImagesToBlocks };
