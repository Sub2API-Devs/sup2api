/**
 * components/FeedbackSurvey/OrgSurveyDialog.tsx
 *
 * 2.1.316 新增。组织调查问卷对话框。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (17)
 * attribution: placement 17
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useInputClock } from "../../ink/components/Input.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useRef, useState } from "../../../vendor/react/cjs/react.production.js";
import {
  isWithinRecentInput,
  RECENT_INPUT_GUARD_MS as RECENT_INPUT_GUARD_MS_3,
} from "../../hooks/useRecentInputGuard.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { usePreDispatchKeyHandler } from "../../keybindings/useActionHandlers.js";
import { collectQuestionAnswers } from "../../entrypoints/sdk/coreSchemas.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Divider } from "../design-system/Divider.js";
import { Box, Text } from "../../ink/components/Text.js";
import { TagTabs } from "../TagTabs.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useRecentInputWithin, useRefusalTracker } from "../CustomSelect/selectTypeahead.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../CustomSelect/select.js";
import { SelectMultiAccessible } from "../CustomSelect/SelectMulti.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { collapseToSingleLine, clampTextEdit } from "./SurveyFollowup.js";
import { DEFAULT_HEADLINE_DELAY_MS } from "../../services/orgSurvey/orgSurvey.js";
import { TextInput } from "../TextInput.js";
import { BulletRow } from "../design-system/BulletRow.js";
import { StatusRow } from "../Settings/Status.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1091830-1091863 placement
function getSurveyOpenedAtMs() {
  return Date.now();
}
//@ chunk-czq1j3j2.js:1091863-1091897 placement
function isNotNull(value) {
  return value !== null;
}
//@ chunk-czq1j3j2.js:1091897-1091952 placement
function toSingleSelectOption(option) {
  return {
    label: option.label,
    value: option.value,
  };
}
//@ chunk-czq1j3j2.js:1091952-1092007 placement
function toMultiSelectOption(option) {
  return {
    label: option.label,
    value: option.value,
  };
}
//@ chunk-czq1j3j2.js:1092007-1092023 placement
function noopCancel() {}
//@ chunk-czq1j3j2.js:1092023-1092052 placement
function incrementByOne(value) {
  return value + 1;
}
//@ chunk-czq1j3j2.js:1092052-1092080 placement
var RECENT_INPUT_GUARD_MS = 400;
var SURVEY_INPUT_GUARD_MS = 700;
var CARET_GUARD_MS = 100;
//@ chunk-czq1j3j2.js:1092080-1092409 placement
/**
 * 组织问卷的误触保护：记录打开/最近按键时间，返回判断"是否仍在近期输入窗口内"的函数。
 */
function useRecentInputGuard(windowMs) {
  let $ = useMemoCache(4);
  let inputClock = useInputClock();
  let now;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    now = Date.now();
    $[0] = now;
  } else now = $[0];
  let lastInputAtRef = useRef(now);
  let lastEventAtRef = useRef(Number.NEGATIVE_INFINITY);
  let check;
  if ($[1] !== inputClock || $[2] !== windowMs) {
    check = () => {
      let now = inputClock();
      if (now - lastEventAtRef.current < CARET_GUARD_MS)
        lastInputAtRef.current = Math.max(now, lastInputAtRef.current);
      lastEventAtRef.current = Math.max(now, lastEventAtRef.current);
      return isWithinRecentInput(inputClock, lastInputAtRef.current, windowMs);
    };
    $[1] = inputClock;
    $[2] = windowMs;
    $[3] = check;
  } else check = $[3];
  return check;
}
//@ chunk-czq1j3j2.js:1092409-1092477 placement
var LIST_FORMATTER; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1092409", () => {
  LIST_FORMATTER = new Intl.ListFormat("en", {
    style: "long",
    type: "conjunction",
  });
});
//@ chunk-czq1j3j2.js:1092477-1095322 placement
/**
 * OrgSurveyDialog：组织调查问卷对话框。
 */
function OrgSurveyDialog(props) {
  let $ = useMemoCache(54);
  let { survey, initialDraft, onDraftChange, onSubmit, onClose } = props;
  let inputClock = useInputClock();
  let [openedAt] = useState(getSurveyOpenedAtMs);
  let [draft, setDraft] = useState(initialDraft);
  let [currentIndex, setCurrentIndex] = useState(0);
  let [isSending, setIsSending] = useState(false);
  let submittingRef = useRef(false);
  let [submitFailed, setSubmitFailed] = useState(false);
  let questions = survey.questions;
  let questionCount = questions.length;
  let currentQuestion = currentIndex < questionCount ? questions[currentIndex] : undefined;
  let inOpenGraceCached;
  if ($[0] !== inputClock || $[1] !== openedAt) {
    inOpenGraceCached = () => isWithinRecentInput(inputClock, openedAt, RECENT_INPUT_GUARD_MS);
    $[0] = inputClock;
    $[1] = openedAt;
    $[2] = inOpenGraceCached;
  } else inOpenGraceCached = $[2];
  let inOpenGrace = inOpenGraceCached;
  let setAnswerCached;
  if ($[3] !== draft || $[4] !== onDraftChange) {
    setAnswerCached = function setAnswer(questionId, value) {
      let nextDraft = {
        ...draft,
        [questionId]: value,
      };
      setDraft(nextDraft);
      onDraftChange(nextDraft);
    };
    $[3] = draft;
    $[4] = onDraftChange;
    $[5] = setAnswerCached;
  } else setAnswerCached = $[5];
  let answerQuestion = setAnswerCached;
  let moveCached;
  if ($[6] !== questionCount) {
    moveCached = function moveBy(delta) {
      setCurrentIndex((previous) => Math.min(Math.max(previous + delta, 0), questionCount));
    };
    $[6] = questionCount;
    $[7] = moveCached;
  } else moveCached = $[7];
  let moveQuestion = moveCached;
  let tabBindings;
  if ($[8] !== moveQuestion) {
    tabBindings = {
      "tabs:previous": () => moveQuestion(-1),
      "tabs:next": () => moveQuestion(1),
    };
    $[8] = moveQuestion;
    $[9] = tabBindings;
  } else tabBindings = $[9];
  const isActive = !isSending && currentQuestion?.kind !== "text";
  let tabKeybindingOptions;
  if ($[10] !== isActive) {
    tabKeybindingOptions = {
      context: "Tabs",
      isActive,
    };
    $[10] = isActive;
    $[11] = tabKeybindingOptions;
  } else tabKeybindingOptions = $[11];
  MessageActionsKeybindings(tabBindings, tabKeybindingOptions);
  let tabKeyHandlerCached;
  if ($[12] !== moveQuestion) {
    tabKeyHandlerCached = (input, key) => {
      if (!key.tab) {
        return;
      }
      moveQuestion(key.shift ? -1 : 1);
      return true;
    };
    $[12] = moveQuestion;
    $[13] = tabKeyHandlerCached;
  } else tabKeyHandlerCached = $[13];
  const isActive_2 = !isSending && currentQuestion?.kind === "text";
  let textKeyOptions;
  if ($[14] !== isActive_2) {
    textKeyOptions = {
      isActive: isActive_2,
    };
    $[14] = isActive_2;
    $[15] = textKeyOptions;
  } else textKeyOptions = $[15];
  usePreDispatchKeyHandler(tabKeyHandlerCached, textKeyOptions);
  let escapeHandlerCached;
  if ($[16] !== inOpenGrace || $[17] !== onClose) {
    escapeHandlerCached = (input, key) => {
      if (!key.escape || inOpenGrace()) {
        return;
      }
      onClose();
      return true;
    };
    $[16] = inOpenGrace;
    $[17] = onClose;
    $[18] = escapeHandlerCached;
  } else escapeHandlerCached = $[18];
  const isActive_3 = !isSending;
  let escapeKeyOptions;
  if ($[19] !== isActive_3) {
    escapeKeyOptions = {
      isActive: isActive_3,
    };
    $[19] = isActive_3;
    $[20] = escapeKeyOptions;
  } else escapeKeyOptions = $[20];
  usePreDispatchKeyHandler(escapeHandlerCached, escapeKeyOptions);
  let missingRequiredCached;
  if ($[21] !== draft || $[22] !== questions) {
    let isUnanswered;
    if ($[24] !== draft) {
      isUnanswered = (question) => question.required && !hasAnswer(ownValue(draft, question.id));
      $[24] = draft;
      $[25] = isUnanswered;
    } else isUnanswered = $[25];
    missingRequiredCached = questions.filter(isUnanswered);
    $[21] = draft;
    $[22] = questions;
    $[23] = missingRequiredCached;
  } else missingRequiredCached = $[23];
  let missingRequired = missingRequiredCached;
  let submitCached;
  if ($[26] !== draft || $[27] !== missingRequired || $[28] !== onSubmit || $[29] !== questions) {
    submitCached = async function handleSubmit() {
      if (submittingRef.current) {
        return;
      }
      if (missingRequired.length > 0) {
        setCurrentIndex(questions.indexOf(missingRequired[0]));
        return;
      }
      submittingRef.current = true;
      setIsSending(true);
      setSubmitFailed(false);
      if ((await onSubmit(collectQuestionAnswers(questions, draft))) === "failed") {
        submittingRef.current = false;
        setIsSending(false);
        setSubmitFailed(true);
      }
    };
    $[26] = draft;
    $[27] = missingRequired;
    $[28] = onSubmit;
    $[29] = questions;
    $[30] = submitCached;
  } else submitCached = $[30];
  let submitSurvey = submitCached;
  let dividerElement;
  if ($[31] === MEMO_CACHE_SENTINEL) {
    dividerElement = jsxProd_default(Divider, {
      color: "inactive",
    });
    $[31] = dividerElement;
  } else dividerElement = $[31];
  let tabsElement;
  if ($[32] !== draft || $[33] !== currentIndex || $[34] !== questions) {
    tabsElement = jsxProd_default(OrgSurveyTabs, {
      questions,
      draft,
      currentIndex,
    });
    $[32] = draft;
    $[33] = currentIndex;
    $[34] = questions;
    $[35] = tabsElement;
  } else tabsElement = $[35];
  let bodyElement;
  if (
    $[36] !== draft ||
    $[37] !== inOpenGrace ||
    $[38] !== currentIndex ||
    $[39] !== missingRequired ||
    $[40] !== moveQuestion ||
    $[41] !== onClose ||
    $[42] !== currentQuestion ||
    $[43] !== questions ||
    $[44] !== questionCount ||
    $[45] !== isSending ||
    $[46] !== submitSurvey ||
    $[47] !== submitFailed ||
    $[48] !== survey.orgName ||
    $[49] !== answerQuestion
  ) {
    bodyElement = currentQuestion
      ? jsxProd_default(
          OrgSurveyQuestion,
          {
            question: currentQuestion,
            orgName: survey.orgName,
            isLast: currentIndex === questionCount - 1,
            value: ownValue(draft, currentQuestion.id),
            inOpenGrace,
            onChange: (value) => answerQuestion(currentQuestion.id, value),
            onNext: () => moveQuestion(1),
          },
          currentQuestion.id,
        )
      : jsxProd_default(OrgSurveyReview, {
          questions,
          draft,
          orgName: survey.orgName,
          missingRequired,
          sending: isSending,
          submitFailed,
          onSubmit: () => void submitSurvey(),
          onCancel: onClose,
        });
    $[36] = draft;
    $[37] = inOpenGrace;
    $[38] = currentIndex;
    $[39] = missingRequired;
    $[40] = moveQuestion;
    $[41] = onClose;
    $[42] = currentQuestion;
    $[43] = questions;
    $[44] = questionCount;
    $[45] = isSending;
    $[46] = submitSurvey;
    $[47] = submitFailed;
    $[48] = survey.orgName;
    $[49] = answerQuestion;
    $[50] = bodyElement;
  } else bodyElement = $[50];
  let dialogBody;
  if ($[51] !== tabsElement || $[52] !== bodyElement) {
    dialogBody = jsxProd_default_2(Box, {
      flexDirection: "column",
      tabIndex: 0,
      autoFocus: true,
      children: [dividerElement, tabsElement, bodyElement],
    });
    $[51] = tabsElement;
    $[52] = bodyElement;
    $[53] = dialogBody;
  } else dialogBody = $[53];
  return dialogBody;
}
//@ chunk-czq1j3j2.js:1095322-1096405 placement
function OrgSurveyTabs(props) {
  let $ = useMemoCache(19);
  let { questions, draft, currentIndex } = props;
  let questionCount = questions.length;
  const color = currentIndex === 0 ? "inactive" : undefined;
  let backArrow;
  if ($[0] !== color) {
    backArrow = jsxProd_default(Text, {
      color,
      children: "\u2190 ",
    });
    $[0] = color;
    $[1] = backArrow;
  } else backArrow = $[1];
  let questionTabs;
  if ($[2] !== currentIndex || $[3] !== draft || $[4] !== questions) {
    let renderTab;
    if ($[6] !== currentIndex || $[7] !== draft) {
      renderTab = (question, index) =>
        jsxProd_default(
          Box,
          {
            children: jsxProd_default_2(TagTabs, {
              color: index === currentIndex ? "permission" : undefined,
              padded: true,
              children: [
                hasAnswer(ownValue(draft, question.id))
                  ? figures_default.checkboxOn
                  : figures_default.checkboxOff,
                " ",
                index + 1,
              ],
            }),
          },
          question.id,
        );
      $[6] = currentIndex;
      $[7] = draft;
      $[8] = renderTab;
    } else renderTab = $[8];
    questionTabs = questions.map(renderTab);
    $[2] = currentIndex;
    $[3] = draft;
    $[4] = questions;
    $[5] = questionTabs;
  } else questionTabs = $[5];
  const color_2 = currentIndex === questionCount ? "permission" : undefined;
  let checkIcon;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    checkIcon = jsxProd_default(StatusIcon, {
      status: "success",
    });
    $[9] = checkIcon;
  } else checkIcon = $[9];
  let submitTab;
  if ($[10] !== color_2) {
    submitTab = jsxProd_default_2(TagTabs, {
      color: color_2,
      padded: true,
      children: [checkIcon, " Submit"],
    });
    $[10] = color_2;
    $[11] = submitTab;
  } else submitTab = $[11];
  const color_3 = currentIndex === questionCount ? "inactive" : undefined;
  let forwardArrow;
  if ($[12] !== color_3) {
    forwardArrow = jsxProd_default_2(Text, {
      color: color_3,
      children: [" ", "\u2192"],
    });
    $[12] = color_3;
    $[13] = forwardArrow;
  } else forwardArrow = $[13];
  let tabsRow;
  if ($[14] !== backArrow || $[15] !== questionTabs || $[16] !== submitTab || $[17] !== forwardArrow) {
    tabsRow = jsxProd_default_2(Box, {
      flexDirection: "row",
      marginBottom: 1,
      children: [backArrow, questionTabs, submitTab, forwardArrow],
    });
    $[14] = backArrow;
    $[15] = questionTabs;
    $[16] = submitTab;
    $[17] = forwardArrow;
    $[18] = tabsRow;
  } else tabsRow = $[18];
  return tabsRow;
}
//@ chunk-czq1j3j2.js:1096405-1099743 placement
/**
 * 组织调查中的单个问题。
 */
function OrgSurveyQuestion(props) {
  let $ = useMemoCache(62);
  let { question, orgName, isLast, value, inOpenGrace, onChange, onNext } = props;
  let recentInputGuard = useRecentInputGuard(RECENT_INPUT_GUARD_MS_3);
  let shouldRefuseCached;
  if ($[0] !== inOpenGrace || $[1] !== recentInputGuard) {
    shouldRefuseCached = () => {
      let inGrace = inOpenGrace();
      let recentInput = recentInputGuard();
      return inGrace || recentInput;
    };
    $[0] = inOpenGrace;
    $[1] = recentInputGuard;
    $[2] = shouldRefuseCached;
  } else shouldRefuseCached = $[2];
  let shouldRefuse = shouldRefuseCached;
  let isScreenReader = useIsScreenReaderEnabled() ? true : false;
  let recentInput = useRecentInputWithin(RECENT_INPUT_GUARD_MS_3);
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let refuseInput;
  if ($[3] !== inOpenGrace || $[4] !== recentInput || $[5] !== noteRefused || $[6] !== refusedWithin) {
    refuseInput = () => {
      if (inOpenGrace() || recentInput() || refusedWithin(RECENT_INPUT_GUARD_MS_3)) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[3] = inOpenGrace;
    $[4] = recentInput;
    $[5] = noteRefused;
    $[6] = refusedWithin;
    $[7] = refuseInput;
  } else refuseInput = $[7];
  let refuseInput_2 = refuseInput;
  const multiSelectHint = question.kind === "multi_select" ? "(Select all that apply)" : null;
  const optionalHint = question.required ? null : "(optional)";
  let hintParts;
  if ($[8] !== multiSelectHint || $[9] !== optionalHint) {
    hintParts = [multiSelectHint, optionalHint].filter(isNotNull);
    $[8] = multiSelectHint;
    $[9] = optionalHint;
    $[10] = hintParts;
  } else hintParts = $[10];
  let joined = hintParts.join(" ");
  let orgLine;
  if ($[11] !== orgName) {
    orgLine = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Survey from ", orgName],
    });
    $[11] = orgName;
    $[12] = orgLine;
  } else orgLine = $[12];
  let hintText;
  if ($[13] !== joined) {
    hintText = joined
      ? jsxProd_default(Text, {
          bold: false,
          dimColor: true,
          children: ` ${joined}`,
        })
      : null;
    $[13] = joined;
    $[14] = hintText;
  } else hintText = $[14];
  let questionLine;
  if ($[15] !== question.text || $[16] !== hintText) {
    questionLine = jsxProd_default_2(Text, {
      bold: true,
      wrap: "wrap",
      children: [question.text, hintText],
    });
    $[15] = question.text;
    $[16] = hintText;
    $[17] = questionLine;
  } else questionLine = $[17];
  let helperLine;
  if ($[18] !== question.helperText) {
    helperLine =
      question.helperText !== null &&
      jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap",
        children: question.helperText,
      });
    $[18] = question.helperText;
    $[19] = helperLine;
  } else helperLine = $[19];
  let singleSelectElement;
  if (
    $[20] !== shouldRefuse ||
    $[21] !== onChange ||
    $[22] !== onNext ||
    $[23] !== question.kind ||
    $[24] !== question.options ||
    $[25] !== refuseInput_2 ||
    $[26] !== value
  ) {
    singleSelectElement =
      question.kind === "single_select" &&
      jsxProd_default(ModelSelector, {
        options: question.options.map(toSingleSelectOption),
        selectedValue: typeof value === "string" ? value : NO_COMMITTED_ROW,
        visibleOptionCount: 8,
        layout: "compact-vertical",
        refuseInput: refuseInput_2,
        onChange: (nextValue) => {
          if (shouldRefuse()) {
            return false;
          }
          onChange(nextValue);
          onNext();
        },
      });
    $[20] = shouldRefuse;
    $[21] = onChange;
    $[22] = onNext;
    $[23] = question.kind;
    $[24] = question.options;
    $[25] = refuseInput_2;
    $[26] = value;
    $[27] = singleSelectElement;
  } else singleSelectElement = $[27];
  let multiSelectElement;
  if (
    $[28] !== isScreenReader ||
    $[29] !== shouldRefuse ||
    $[30] !== isLast ||
    $[31] !== onChange ||
    $[32] !== onNext ||
    $[33] !== question.kind ||
    $[34] !== question.options ||
    $[35] !== refuseInput_2 ||
    $[36] !== value
  ) {
    multiSelectElement =
      question.kind === "multi_select" &&
      jsxProd_default(SelectMultiAccessible, {
        options: question.options.map(toMultiSelectOption),
        defaultValue: Array.isArray(value) ? [...value] : [],
        visibleOptionCount: 8,
        submitButtonText: isLast ? "Review" : "Next",
        refuseInput: refuseInput_2,
        onChange: (nextValues) => {
          if (shouldRefuse()) {
            return false;
          }
          onChange(nextValues);
        },
        onSubmit: () => {
          if (isScreenReader || !shouldRefuse()) onNext();
        },
        onCancel: noopCancel,
      });
    $[28] = isScreenReader;
    $[29] = shouldRefuse;
    $[30] = isLast;
    $[31] = onChange;
    $[32] = onNext;
    $[33] = question.kind;
    $[34] = question.options;
    $[35] = refuseInput_2;
    $[36] = value;
    $[37] = multiSelectElement;
  } else multiSelectElement = $[37];
  let textInputElement;
  if (
    $[38] !== shouldRefuse ||
    $[39] !== onChange ||
    $[40] !== onNext ||
    $[41] !== question.kind ||
    $[42] !== value
  ) {
    textInputElement =
      question.kind === "text" &&
      jsxProd_default(OrgSurveyTextInput, {
        value: typeof value === "string" ? value : "",
        inGrace: shouldRefuse,
        onChange,
        onSubmit: onNext,
      });
    $[38] = shouldRefuse;
    $[39] = onChange;
    $[40] = onNext;
    $[41] = question.kind;
    $[42] = value;
    $[43] = textInputElement;
  } else textInputElement = $[43];
  let answerElement;
  if ($[44] !== singleSelectElement || $[45] !== multiSelectElement || $[46] !== textInputElement) {
    answerElement = jsxProd_default_2(Box, {
      marginTop: 1,
      flexDirection: "column",
      children: [singleSelectElement, multiSelectElement, textInputElement],
    });
    $[44] = singleSelectElement;
    $[45] = multiSelectElement;
    $[46] = textInputElement;
    $[47] = answerElement;
  } else answerElement = $[47];
  const action = question.kind === "text" ? "continue" : "select";
  let enterHint;
  if ($[48] !== action) {
    enterHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "enter",
      action,
    });
    $[48] = action;
    $[49] = enterHint;
  } else enterHint = $[49];
  const tabHintText = question.kind === "text" ? "Tab" : "Tab/Arrow keys";
  let tabHint;
  if ($[50] !== tabHintText) {
    tabHint = jsxProd_default_2(Text, {
      children: [tabHintText, " to navigate"],
    });
    $[50] = tabHintText;
    $[51] = tabHint;
  } else tabHint = $[51];
  let escapeHint;
  if ($[52] === MEMO_CACHE_SENTINEL) {
    escapeHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "close",
    });
    $[52] = escapeHint;
  } else escapeHint = $[52];
  let hintsRow;
  if ($[53] !== enterHint || $[54] !== tabHint) {
    hintsRow = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: jsxProd_default_2(Byline, {
          children: [enterHint, tabHint, escapeHint],
        }),
      }),
    });
    $[53] = enterHint;
    $[54] = tabHint;
    $[55] = hintsRow;
  } else hintsRow = $[55];
  let questionElement;
  if (
    $[56] !== answerElement ||
    $[57] !== hintsRow ||
    $[58] !== orgLine ||
    $[59] !== questionLine ||
    $[60] !== helperLine
  ) {
    questionElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [orgLine, questionLine, helperLine, answerElement, hintsRow],
    });
    $[56] = answerElement;
    $[57] = hintsRow;
    $[58] = orgLine;
    $[59] = questionLine;
    $[60] = helperLine;
    $[61] = questionElement;
  } else questionElement = $[61];
  return questionElement;
}
//@ chunk-czq1j3j2.js:1099743-1101375 placement
function OrgSurveyTextInput(props) {
  let $ = useMemoCache(26);
  let { value, inGrace, onChange, onSubmit } = props;
  let { columns } = useTerminalSize();
  let [cursorOffset, setCursorOffset] = useState(value.length);
  let cursorOffsetRef = useRef(cursorOffset);
  let pendingCaretRef = useRef(null);
  let [, setTextVersion] = useState(0);
  let changeCached;
  if ($[0] !== onChange || $[1] !== value) {
    changeCached = function handleChange(nextText) {
      let singleLine = collapseToSingleLine(nextText);
      let edit = clampTextEdit(value, singleLine, DEFAULT_HEADLINE_DELAY_MS);
      pendingCaretRef.current =
        edit.caret === "pass" ? null : edit.caret === "keep" ? cursorOffsetRef.current : edit.caret;
      if (edit.caret !== "pass" || singleLine !== nextText) setTextVersion(incrementByOne);
      onChange(edit.text);
    };
    $[0] = onChange;
    $[1] = value;
    $[2] = changeCached;
  } else changeCached = $[2];
  let onChange_2 = changeCached;
  let chars;
  if ($[3] !== value) {
    chars = Array.from(value);
    $[3] = value;
    $[4] = chars;
  } else chars = $[4];
  let charCount = chars.length;
  let iconElement;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    iconElement = jsxProd_default_2(Text, {
      color: "suggestion",
      children: [figures_default.pointer, " "],
    });
    $[5] = iconElement;
  } else iconElement = $[5];
  let onSubmit_2;
  if ($[6] !== inGrace || $[7] !== onSubmit) {
    onSubmit_2 = () => {
      if (!inGrace()) onSubmit();
    };
    $[6] = inGrace;
    $[7] = onSubmit;
    $[8] = onSubmit_2;
  } else onSubmit_2 = $[8];
  const columns_2 = Math.min(Math.max(columns - 4, 20), 120);
  let onChangeCursorOffset;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    onChangeCursorOffset = (nextOffset) => {
      let caretOffset = pendingCaretRef.current ?? nextOffset;
      pendingCaretRef.current = null;
      cursorOffsetRef.current = caretOffset;
      setCursorOffset(caretOffset);
    };
    $[9] = onChangeCursorOffset;
  } else onChangeCursorOffset = $[9];
  let inputElement;
  if (
    $[10] !== cursorOffset ||
    $[11] !== onChange_2 ||
    $[12] !== onSubmit_2 ||
    $[13] !== columns_2 ||
    $[14] !== value
  ) {
    inputElement = jsxProd_default_2(Box, {
      children: [
        iconElement,
        jsxProd_default(TextInput, {
          value,
          onChange: onChange_2,
          onSubmit: onSubmit_2,
          columns: columns_2,
          cursorOffset,
          onChangeCursorOffset,
          focus: true,
          showCursor: true,
          multiline: false,
          inputFilter: collapseToSingleLine,
        }),
      ],
    });
    $[10] = cursorOffset;
    $[11] = onChange_2;
    $[12] = onSubmit_2;
    $[13] = columns_2;
    $[14] = value;
    $[15] = inputElement;
  } else inputElement = $[15];
  const dimColor = charCount < DEFAULT_HEADLINE_DELAY_MS;
  const color = charCount >= DEFAULT_HEADLINE_DELAY_MS ? "warning" : undefined;
  let countText;
  if ($[16] !== charCount) {
    countText = charCount.toLocaleString("en-US");
    $[16] = charCount;
    $[17] = countText;
  } else countText = $[17];
  let limitText;
  if ($[18] === MEMO_CACHE_SENTINEL) {
    limitText = DEFAULT_HEADLINE_DELAY_MS.toLocaleString("en-US");
    $[18] = limitText;
  } else limitText = $[18];
  let counterElement;
  if ($[19] !== countText || $[20] !== dimColor || $[21] !== color) {
    counterElement = jsxProd_default_2(Text, {
      dimColor,
      color,
      children: [countText, "/", limitText],
    });
    $[19] = countText;
    $[20] = dimColor;
    $[21] = color;
    $[22] = counterElement;
  } else counterElement = $[22];
  let fieldElement;
  if ($[23] !== counterElement || $[24] !== inputElement) {
    fieldElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [inputElement, counterElement],
    });
    $[23] = counterElement;
    $[24] = inputElement;
    $[25] = fieldElement;
  } else fieldElement = $[25];
  return fieldElement;
}
//@ chunk-czq1j3j2.js:1101375-1103392 placement
function OrgSurveyReview(props) {
  let $ = useMemoCache(28);
  let { questions, draft, orgName, missingRequired, sending, submitFailed, onSubmit, onCancel } = props;
  let recentInputGuard = useRecentInputGuard(SURVEY_INPUT_GUARD_MS);
  let titleText;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    titleText = jsxProd_default(Text, {
      bold: true,
      children: "Review your answers",
    });
    $[0] = titleText;
  } else titleText = $[0];
  let children;
  if ($[1] !== draft || $[2] !== questions) {
    let hasAnswerFilter;
    if ($[4] !== draft) {
      hasAnswerFilter = (question) => hasAnswer(ownValue(draft, question.id));
      $[4] = draft;
      $[5] = hasAnswerFilter;
    } else hasAnswerFilter = $[5];
    const filtered = questions.filter(hasAnswerFilter);
    let renderAnswerRow;
    if ($[6] !== draft) {
      renderAnswerRow = (question) =>
        jsxProd_default_2(
          Box,
          {
            flexDirection: "column",
            children: [
              jsxProd_default(BulletRow, {
                children: question.text,
              }),
              jsxProd_default(Box, {
                marginLeft: 2,
                children: jsxProd_default_2(Text, {
                  color: "success",
                  wrap: "wrap",
                  children: [
                    figures_default.arrowRight,
                    " ",
                    formatSurveyAnswer(question, ownValue(draft, question.id)),
                  ],
                }),
              }),
            ],
          },
          question.id,
        );
      $[6] = draft;
      $[7] = renderAnswerRow;
    } else renderAnswerRow = $[7];
    children = filtered.map(renderAnswerRow);
    $[1] = draft;
    $[2] = questions;
    $[3] = children;
  } else children = $[3];
  let answersElement;
  if ($[8] !== children) {
    answersElement = jsxProd_default(Box, {
      flexDirection: "column",
      marginTop: 1,
      marginLeft: 1,
      children,
    });
    $[8] = children;
    $[9] = answersElement;
  } else answersElement = $[9];
  let missingWarning;
  if ($[10] !== missingRequired || $[11] !== questions) {
    missingWarning =
      missingRequired.length > 0 &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default_2(StatusRow, {
          status: "warning",
          children: [
            "Answer ",
            missingRequired.length === 1 ? "question" : "questions",
            " ",
            LIST_FORMATTER.format(missingRequired.map((question) => String(questions.indexOf(question) + 1))),
            " ",
            "to submit.",
          ],
        }),
      });
    $[10] = missingRequired;
    $[11] = questions;
    $[12] = missingWarning;
  } else missingWarning = $[12];
  let disclaimerElement;
  if ($[13] !== orgName) {
    disclaimerElement = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        wrap: "wrap",
        children: [
          "This survey is from ",
          orgName,
          ". Answers won",
          "\u2019",
          "t be used to improve Anthropic",
          "\u2019",
          "s services.",
        ],
      }),
    });
    $[13] = orgName;
    $[14] = disclaimerElement;
  } else disclaimerElement = $[14];
  let failedElement;
  if ($[15] !== submitFailed) {
    failedElement =
      submitFailed &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default_2(StatusRow, {
          status: "error",
          children: ["Couldn", "\u2019", "t submit your answers. Try again."],
        }),
      });
    $[15] = submitFailed;
    $[16] = failedElement;
  } else failedElement = $[16];
  let actionsElement;
  if ($[17] !== recentInputGuard || $[18] !== onCancel || $[19] !== onSubmit || $[20] !== sending) {
    actionsElement = jsxProd_default(Box, {
      marginTop: 1,
      children: sending
        ? jsxProd_default_2(Text, {
            dimColor: true,
            children: ["Sending your answers", "\u2026"],
          })
        : jsxProd_default(ConfirmSelect, {
            confirmLabel: "Submit answers",
            cancelLabel: "Cancel",
            onConfirm: () => {
              if (!recentInputGuard()) onSubmit();
            },
            onCancel,
          }),
    });
    $[17] = recentInputGuard;
    $[18] = onCancel;
    $[19] = onSubmit;
    $[20] = sending;
    $[21] = actionsElement;
  } else actionsElement = $[21];
  let reviewElement;
  if (
    $[22] !== answersElement ||
    $[23] !== missingWarning ||
    $[24] !== disclaimerElement ||
    $[25] !== failedElement ||
    $[26] !== actionsElement
  ) {
    reviewElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [titleText, answersElement, missingWarning, disclaimerElement, failedElement, actionsElement],
    });
    $[22] = answersElement;
    $[23] = missingWarning;
    $[24] = disclaimerElement;
    $[25] = failedElement;
    $[26] = actionsElement;
    $[27] = reviewElement;
  } else reviewElement = $[27];
  return reviewElement;
}
//@ chunk-czq1j3j2.js:1103392-1103447 placement
function ownValue(draft, id) {
  return Object.hasOwn(draft, id) ? draft[id] : undefined;
}
//@ chunk-czq1j3j2.js:1103447-1103537 placement
function hasAnswer(answer) {
  if (answer === undefined) return false;
  return typeof answer === "string" ? answer.trim() !== "" : answer.length > 0;
}
//@ chunk-czq1j3j2.js:1103537-1103728 placement
function formatSurveyAnswer(question, answer) {
  if (question.kind === "text") return typeof answer === "string" ? answer.trim() : "";
  let values = typeof answer === "string" ? [answer] : (answer ?? []);
  return question.options
    .filter((option) => values.includes(option.value))
    .map((option) => option.label)
    .join(", ");
}
export { ownValue, hasAnswer, OrgSurveyDialog };
