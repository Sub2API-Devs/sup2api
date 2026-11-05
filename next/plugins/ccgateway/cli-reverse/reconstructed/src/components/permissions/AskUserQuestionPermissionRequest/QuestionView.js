/**
 * components/permissions/AskUserQuestionPermissionRequest/QuestionView.tsx
 *
 * 单问题视图：选项列表 + "Other / Type something" 自由输入。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/AskUserQuestionPermissionRequest/QuestionView.tsx
 * pieces: chunk-czq1j3j2.js (4)
 * attribution: callgraph-fingerprint 1, sole-consumer 1, fingerprint 2
 */
import { replaceLineBreaks } from "../../../utils/permissions/approvalPayloadSerialization.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../../state/AppState.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { useState, useRef } from "../../../../vendor/react/cjs/react.production.js";
import { useEditorMode } from "../../../utils/subagentStatusLine.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { resolveEditorCommand } from "../../../utils/editor.js";
import { toIDEDisplayName } from "../../../utils/ide.js";
import { useDeferredPasteForwarding, isForwardablePaste } from "../../CustomSelect/use-select-input.js";
import { normalizeFullWidthDigits_2 } from "../../../utils/stringUtils.js";
import { editPromptInEditor } from "../../../utils/promptEditor.js";
import { updateLastInteractionTime } from "../../../bootstrap/state.js";
import { hasOptionPreview } from "./AskUserQuestionPermissionRequest.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PreviewQuestionView } from "./PreviewQuestionView.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { Divider } from "../../design-system/Divider.js";
import { FilePathLink } from "../../FilePathLink.js";
import { QuestionNavigationBar } from "./QuestionNavigationBar.js";
import { PermissionRequestTitle } from "../PermissionRequestTitle.js";
import { PreviewBox } from "./PreviewBox.js";
import { Blockquote } from "../../Blockquote.js";
import { figures_default } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Byline } from "../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { SelectMultiAccessible } from "../../CustomSelect/SelectMulti.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../CustomSelect/select.js";

//@ chunk-czq1j3j2.js:1312804-1312858 callgraph-fingerprint (2.1.88 match: _temp, 1)
function selectToolPermissionContextMode(s) {
  return s.toolPermissionContext.mode;
}
//@ chunk-czq1j3j2.js:1312858-1312970 sole-consumer
function toSelectOption(option) {
  return {
    type: "text",
    value: option.value,
    label: option.displayLabel,
    description: replaceLineBreaks(option.displayDescription),
  };
}
//@ chunk-czq1j3j2.js:1313014-1313055 fingerprint (2.1.88 match: _temp4, 1)
function isNotOtherOption(v) {
  return v !== "__other__";
}
//@ chunk-czq1j3j2.js:1313055-1319811 fingerprint (2.1.88 match: QuestionView, 0.749)
function QuestionView(props) {
  let $ = useMemoCache(80);
  let {
    wouldTakeAnswer,
    question,
    questions,
    currentQuestionIndex,
    answers,
    questionStates,
    hideSubmitTab,
    hideOtherRow,
    planFilePath,
    minContentWidth,
    onUpdateQuestionState,
    onAnswer,
    onTextInputFocus,
    onCancel,
    onSubmit,
    onTabPrev,
    onTabNext,
    onRespondToClaude,
    canPasteImage,
    onImagePaste,
    pastedContents,
    onRemoveImage,
  } = props;
  let hideSubmitTab_2 = hideSubmitTab === undefined ? false : hideSubmitTab;
  let hideOther = hideOtherRow === undefined ? false : hideOtherRow;
  let isPlanMode = useAppState(selectToolPermissionContextMode) === "plan";
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let [isFooterFocused, setIsFooterFocused] = useState(false);
  let [isEditorValue, setEditorValue] = useState(false);
  let editorMode = useEditorMode();
  let [vimState, setVimState] = useState(null);
  let takesEscape = vimState?.takesEscape ?? false;
  let editorName;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    let editor = resolveEditorCommand();
    editorName = editor ? toIDEDisplayName(editor) : null;
    $[0] = editorName;
  } else editorName = $[0];
  let editorName_2 = editorName;
  let handleFocus;
  if ($[1] !== onTextInputFocus) {
    handleFocus = (value) => {
      let isOther = value === "__other__";
      setEditorValue(isOther);
      onTextInputFocus(isOther);
    };
    $[1] = onTextInputFocus;
    $[2] = handleFocus;
  } else handleFocus = $[2];
  let handleFocus_2 = handleFocus;
  let focusFooter;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    focusFooter = () => {
      setIsFooterFocused(true);
    };
    $[3] = focusFooter;
  } else focusFooter = $[3];
  let handleDownFromLastItem = focusFooter;
  let blurFooter;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    blurFooter = () => {
      setIsFooterFocused(false);
    };
    $[4] = blurFooter;
  } else blurFooter = $[4];
  let blurFooterHandler = blurFooter;
  let deferredPasteForwarding = useDeferredPasteForwarding(!isFooterFocused);
  let onPaste;
  if (
    $[5] !== canPasteImage ||
    $[6] !== hideOther ||
    $[7] !== deferredPasteForwarding ||
    $[8] !== isFooterFocused
  ) {
    onPaste = (event) => {
      if (hideOther || !isFooterFocused || !isForwardablePaste(event, canPasteImage)) {
        return;
      }
      event.preventDefault();
      deferredPasteForwarding(event);
      setIsFooterFocused(false);
    };
    $[5] = canPasteImage;
    $[6] = hideOther;
    $[7] = deferredPasteForwarding;
    $[8] = isFooterFocused;
    $[9] = onPaste;
  } else onPaste = $[9];
  let onPaste_2 = onPaste;
  let chatRowNumber = question.options.length + (hideOther ? 1 : 2);
  let onKeyDown;
  if (
    $[10] !== chatRowNumber ||
    $[11] !== isFooterFocused ||
    $[12] !== isEditorValue ||
    $[13] !== isScreenReaderEnabled ||
    $[14] !== onCancel ||
    $[15] !== onRespondToClaude
  ) {
    onKeyDown = (e) => {
      if (!isFooterFocused) {
        if (
          !isScreenReaderEnabled &&
          !isEditorValue &&
          normalizeFullWidthDigits_2(e.key) === String(chatRowNumber)
        ) {
          e.preventDefault();
          onRespondToClaude();
        }
        return;
      }
      if (e.key === "up" || (e.ctrl && e.key === "p")) {
        e.preventDefault();
        blurFooterHandler();
        return;
      }
      if (e.key === "return" || normalizeFullWidthDigits_2(e.key) === String(chatRowNumber)) {
        e.preventDefault();
        onRespondToClaude();
        return;
      }
      if (e.key === "escape") {
        e.preventDefault();
        onCancel();
      }
    };
    $[10] = chatRowNumber;
    $[11] = isFooterFocused;
    $[12] = isEditorValue;
    $[13] = isScreenReaderEnabled;
    $[14] = onCancel;
    $[15] = onRespondToClaude;
    $[16] = onKeyDown;
  } else onKeyDown = $[16];
  let onKeyDown_2 = onKeyDown;
  let textOptions = question.options.map(toSelectOption);
  let key = question.key;
  let questionState = questionStates[key];
  let lastTypedRef = useRef(null);
  let onOpenEditor;
  if (
    $[17] !== onUpdateQuestionState ||
    $[18] !== question.multiSelect ||
    $[19] !== key ||
    $[20] !== wouldTakeAnswer
  ) {
    onOpenEditor = async (currentValue, setValue) => {
      if (!wouldTakeAnswer()) {
        return;
      }
      let result = await editPromptInEditor(currentValue);
      updateLastInteractionTime(true);
      if (result.content !== null && result.content !== currentValue) {
        if (!wouldTakeAnswer()) {
          return;
        }
        setValue(result.content);
        onUpdateQuestionState(
          key,
          {
            textInputValue: result.content,
          },
          question.multiSelect ?? false,
        );
      }
    };
    $[17] = onUpdateQuestionState;
    $[18] = question.multiSelect;
    $[19] = key;
    $[20] = wouldTakeAnswer;
    $[21] = onOpenEditor;
  } else onOpenEditor = $[21];
  let onOpenEditor_2 = onOpenEditor;
  const placeholder = question.multiSelect ? "Type something" : "Type something.";
  const initialValue = questionState?.textInputValue ?? "";
  let vimEditing;
  if ($[22] !== editorMode || $[23] !== takesEscape) {
    vimEditing = editorMode
      ? {
          takesEscape,
          onStateChange: setVimState,
        }
      : undefined;
    $[22] = editorMode;
    $[23] = takesEscape;
    $[24] = vimEditing;
  } else vimEditing = $[24];
  let onChange;
  if (
    $[25] !== onUpdateQuestionState ||
    $[26] !== question.multiSelect ||
    $[27] !== key ||
    $[28] !== wouldTakeAnswer
  ) {
    onChange = (value) => {
      if (!wouldTakeAnswer()) {
        return false;
      }
      lastTypedRef.current = {
        question: key,
        value,
      };
      onUpdateQuestionState(
        key,
        {
          textInputValue: value,
        },
        question.multiSelect ?? false,
      );
    };
    $[25] = onUpdateQuestionState;
    $[26] = question.multiSelect;
    $[27] = key;
    $[28] = wouldTakeAnswer;
    $[29] = onChange;
  } else onChange = $[29];
  let otherOption;
  if ($[30] !== placeholder || $[31] !== initialValue || $[32] !== vimEditing || $[33] !== onChange) {
    otherOption = {
      type: "input",
      value: "__other__",
      label: "Other",
      placeholder,
      initialValue,
      takesPasteFromOtherRows: true,
      vimEditing,
      onChange,
    };
    $[30] = placeholder;
    $[31] = initialValue;
    $[32] = vimEditing;
    $[33] = onChange;
    $[34] = otherOption;
  } else otherOption = $[34];
  let otherOptionElement = otherOption;
  let chatOption;
  if ($[35] !== isScreenReaderEnabled || $[36] !== question.multiSelect) {
    chatOption =
      isScreenReaderEnabled && !question.multiSelect
        ? [
            {
              type: "text",
              value: "__chat__",
              label: "Chat about this",
            },
          ]
        : [];
    $[35] = isScreenReaderEnabled;
    $[36] = question.multiSelect;
    $[37] = chatOption;
  } else chatOption = $[37];
  let chatOption_2 = chatOption;
  let otherOptions;
  if ($[38] !== hideOther || $[39] !== otherOptionElement) {
    otherOptions = hideOther ? [] : [otherOptionElement];
    $[38] = hideOther;
    $[39] = otherOptionElement;
    $[40] = otherOptions;
  } else otherOptions = $[40];
  let options = [...textOptions, ...otherOptions, ...chatOption_2];
  if (!question.multiSelect && question.options.some(hasOptionPreview) && !isScreenReaderEnabled) {
    let previewView;
    if (
      $[41] !== answers ||
      $[42] !== currentQuestionIndex ||
      $[43] !== hideSubmitTab_2 ||
      $[44] !== minContentWidth ||
      $[45] !== onAnswer ||
      $[46] !== onCancel ||
      $[47] !== onRespondToClaude ||
      $[48] !== onTabNext ||
      $[49] !== onTabPrev ||
      $[50] !== onTextInputFocus ||
      $[51] !== onUpdateQuestionState ||
      $[52] !== question ||
      $[53] !== questionStates ||
      $[54] !== questions ||
      $[55] !== wouldTakeAnswer
    ) {
      previewView = jsxProd_default(PreviewQuestionView, {
        wouldTakeAnswer,
        question,
        questions,
        currentQuestionIndex,
        answers,
        questionStates,
        hideSubmitTab: hideSubmitTab_2,
        minContentWidth,
        onUpdateQuestionState,
        onAnswer,
        onTextInputFocus,
        onCancel,
        onTabPrev,
        onTabNext,
        onRespondToClaude,
      });
      $[41] = answers;
      $[42] = currentQuestionIndex;
      $[43] = hideSubmitTab_2;
      $[44] = minContentWidth;
      $[45] = onAnswer;
      $[46] = onCancel;
      $[47] = onRespondToClaude;
      $[48] = onTabNext;
      $[49] = onTabPrev;
      $[50] = onTextInputFocus;
      $[51] = onUpdateQuestionState;
      $[52] = question;
      $[53] = questionStates;
      $[54] = questions;
      $[55] = wouldTakeAnswer;
      $[56] = previewView;
    } else previewView = $[56];
    return previewView;
  }
  let planBar;
  if ($[57] !== isPlanMode || $[58] !== planFilePath) {
    planBar =
      isPlanMode &&
      planFilePath &&
      jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 0,
        children: [
          jsxProd_default(Divider, {
            color: "inactive",
          }),
          jsxProd_default_2(Text, {
            color: "inactive",
            children: [
              "Planning: ",
              jsxProd_default(FilePathLink, {
                filePath: planFilePath,
              }),
            ],
          }),
        ],
      });
    $[57] = isPlanMode;
    $[58] = planFilePath;
    $[59] = planBar;
  } else planBar = $[59];
  let topDivider;
  if ($[60] === MEMO_CACHE_SENTINEL) {
    topDivider = jsxProd_default(Divider, {
      color: "inactive",
    });
    $[60] = topDivider;
  } else topDivider = $[60];
  let navBar;
  if (
    $[61] !== answers ||
    $[62] !== currentQuestionIndex ||
    $[63] !== hideSubmitTab_2 ||
    $[64] !== questions
  ) {
    navBar = jsxProd_default(QuestionNavigationBar, {
      questions,
      currentQuestionIndex,
      answers,
      hideSubmitTab: hideSubmitTab_2,
    });
    $[61] = answers;
    $[62] = currentQuestionIndex;
    $[63] = hideSubmitTab_2;
    $[64] = questions;
    $[65] = navBar;
  } else navBar = $[65];
  let children;
  if ($[66] !== question.displayBody || $[67] !== question.displayQuestion.text) {
    children =
      question.displayBody.length === 0
        ? jsxProd_default(PermissionRequestTitle, {
            title: question.displayQuestion.text,
            color: "text",
          })
        : jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default(PermissionRequestTitle, {
                title: question.displayQuestion.text,
                color: "text",
              }),
              jsxProd_default(PreviewBox, {
                runs: question.displayBody,
              }),
            ],
          });
    $[66] = question.displayBody;
    $[67] = question.displayQuestion.text;
    $[68] = children;
  } else children = $[68];
  let questionBlock;
  if ($[69] !== question.displayQuestion.needsGutter || $[70] !== children) {
    questionBlock = jsxProd_default(Blockquote, {
      multiline: question.displayQuestion.needsGutter,
      children,
    });
    $[69] = question.displayQuestion.needsGutter;
    $[70] = children;
    $[71] = questionBlock;
  } else questionBlock = $[71];
  let footerHints;
  if (
    $[72] !== chatRowNumber ||
    $[73] !== isFooterFocused ||
    $[74] !== isEditorValue ||
    $[75] !== isScreenReaderEnabled ||
    $[76] !== vimState ||
    $[77] !== takesEscape ||
    $[78] !== questions
  ) {
    footerHints =
      !isScreenReaderEnabled &&
      jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default(Divider, {
                color: "inactive",
              }),
              jsxProd_default_2(Box, {
                flexDirection: "row",
                gap: 1,
                children: [
                  isFooterFocused
                    ? jsxProd_default(Text, {
                        color: "suggestion",
                        children: figures_default.pointer,
                      })
                    : jsxProd_default(Text, {
                        children: " ",
                      }),
                  jsxProd_default_2(Text, {
                    color: isFooterFocused ? "suggestion" : undefined,
                    children: [chatRowNumber, ". Chat about this"],
                  }),
                ],
              }),
            ],
          }),
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(Text, {
              color: "inactive",
              dimColor: true,
              children: jsxProd_default_2(Byline, {
                children: [
                  vimState &&
                    vimState.mode !== "NORMAL" &&
                    jsxProd_default_2(Text, {
                      children: ["-- ", vimState.mode, " --"],
                    }),
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: "enter",
                    action: "select",
                  }),
                  questions.length === 1
                    ? jsxProd_default(KeyboardShortcutHint, {
                        chord: ["up", "down"],
                        action: "navigate",
                      })
                    : jsxProd_default(Text, {
                        children: "Tab/Arrow keys to navigate",
                      }),
                  isEditorValue &&
                    editorName_2 &&
                    jsxProd_default(KeyboardShortcutHint, {
                      chord: "ctrl+g",
                      action: `edit in ${editorName_2}`,
                    }),
                  !takesEscape &&
                    jsxProd_default(KeyboardShortcutHint, {
                      chord: "escape",
                      action: "cancel",
                    }),
                ],
              }),
            }),
          }),
        ],
      });
    $[72] = chatRowNumber;
    $[73] = isFooterFocused;
    $[74] = isEditorValue;
    $[75] = isScreenReaderEnabled;
    $[76] = vimState;
    $[77] = takesEscape;
    $[78] = questions;
    $[79] = footerHints;
  } else footerHints = $[79];
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    marginTop: 0,
    tabIndex: 0,
    autoFocus: true,
    onKeyDown: onKeyDown_2,
    onPaste: onPaste_2,
    children: [
      planBar,
      topDivider,
      jsxProd_default_2(Box, {
        flexDirection: "column",
        paddingTop: 0,
        children: [
          navBar,
          questionBlock,
          jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default(Box, {
                marginTop: 1,
                children: question.multiSelect
                  ? jsxProd_default(
                      SelectMultiAccessible,
                      {
                        options,
                        defaultValue: questionStates[question.key]?.selectedValue,
                        onChange: (values) => {
                          if (!wouldTakeAnswer()) {
                            return false;
                          }
                          onUpdateQuestionState(
                            key,
                            {
                              selectedValue: values,
                            },
                            true,
                          );
                          let textInput = values.includes("__other__")
                            ? lastTypedRef.current?.question === key
                              ? lastTypedRef.current.value
                              : questionStates[key]?.textInputValue
                            : undefined;
                          let finalValues = values
                            .filter(isNotOtherOption)
                            .concat(textInput ? [textInput] : []);
                          onAnswer(key, finalValues, undefined, false);
                        },
                        onFocus: handleFocus_2,
                        onCancel,
                        submitButtonText: currentQuestionIndex === questions.length - 1 ? "Submit" : "Next",
                        onSubmit: () => {
                          if (!wouldTakeAnswer()) {
                            return;
                          }
                          onSubmit();
                        },
                        onDownFromLastItem: handleDownFromLastItem,
                        isDisabled: isFooterFocused,
                        onOpenEditor: onOpenEditor_2,
                        canPasteImage,
                        onImagePaste,
                        pastedContents,
                        onRemoveImage,
                      },
                      question.key,
                    )
                  : jsxProd_default(
                      ModelSelector,
                      {
                        options,
                        selectedValue: questionStates[question.key]?.selectedValue ?? NO_COMMITTED_ROW,
                        onChange: (value) => {
                          if (!wouldTakeAnswer()) {
                            return false;
                          }
                          if (value === "__chat__") {
                            onRespondToClaude();
                            return;
                          }
                          onUpdateQuestionState(
                            key,
                            {
                              selectedValue: value,
                            },
                            false,
                          );
                          let textInput =
                            value === "__other__" ? questionStates[key]?.textInputValue : undefined;
                          onAnswer(key, value, textInput);
                        },
                        onFocus: handleFocus_2,
                        onCancel,
                        onDownFromLastItem: handleDownFromLastItem,
                        isDisabled: isFooterFocused,
                        layout: "compact-vertical",
                        onOpenEditor: onOpenEditor_2,
                        canPasteImage,
                        onImagePaste,
                        pastedContents,
                        onRemoveImage,
                      },
                      question.key,
                    ),
              }),
              footerHints,
            ],
          }),
        ],
      }),
    ],
  });
}
export { QuestionView };
