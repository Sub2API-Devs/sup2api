/**
 * components/permissions/AskUserQuestionPermissionRequest/QuestionView.tsx
 *
 * 单问题视图：选项列表 + "Other / Type something" 自由输入。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/AskUserQuestionPermissionRequest/QuestionView.tsx
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: callgraph-fingerprint 1, sole-consumer 1, fingerprint 2
 */
import { replaceLineBreaks } from "../../../utils/permissions/approvalPayloadSerialization.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../../state/AppState.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { y, R } from "../../../../vendor/react/cjs/react.production.js";
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

//@ chunk-18hwfzwa.js:1287012-1287066 callgraph-fingerprint = _temp (1)
function selectToolPermissionContextMode(s) {
  return s.toolPermissionContext.mode;
}
//@ chunk-18hwfzwa.js:1287066-1287178 sole-consumer
function toSelectOption(Hi) {
  return {
    type: "text",
    value: Hi.value,
    label: Hi.displayLabel,
    description: replaceLineBreaks(Hi.displayDescription),
  };
}
//@ chunk-18hwfzwa.js:1287222-1287263 fingerprint = _temp4 (1)
function isNotOtherOption(v) {
  return v !== "__other__";
}
//@ chunk-18hwfzwa.js:1287263-1293852 fingerprint = QuestionView (0.754)
function QuestionView(props) {
  let $ = w(76);
  let {
    wouldTakeAnswer,
    question,
    questions,
    currentQuestionIndex,
    answers,
    questionStates,
    hideSubmitTab,
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
  let so = useAppState(selectToolPermissionContextMode) === "plan";
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let [isFooterFocused, setIsFooterFocused] = y(false);
  let [bo, Ao] = y(false);
  let editorMode = useEditorMode();
  let [Ro, Ho] = y(null);
  let takesEscape = Ro?.takesEscape ?? false;
  let mn;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    let editor = resolveEditorCommand();
    mn = editor ? toIDEDisplayName(editor) : null;
    $[0] = mn;
  } else mn = $[0];
  let No = mn;
  let vo;
  if ($[1] !== onTextInputFocus) {
    vo = (value) => {
      let isOther = value === "__other__";
      Ao(isOther);
      onTextInputFocus(isOther);
    };
    $[1] = onTextInputFocus;
    $[2] = vo;
  } else vo = $[2];
  let handleFocus = vo;
  let bn;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    bn = () => {
      setIsFooterFocused(true);
    };
    $[3] = bn;
  } else bn = $[3];
  let handleDownFromLastItem = bn;
  let hn;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    hn = () => {
      setIsFooterFocused(false);
    };
    $[4] = hn;
  } else hn = $[4];
  let Mn = hn;
  let deferredPasteForwarding = useDeferredPasteForwarding(!isFooterFocused);
  let Sn;
  if ($[5] !== canPasteImage || $[6] !== deferredPasteForwarding || $[7] !== isFooterFocused) {
    Sn = (event) => {
      if (!isFooterFocused || !isForwardablePaste(event, canPasteImage)) {
        return;
      }
      event.preventDefault();
      deferredPasteForwarding(event);
      setIsFooterFocused(false);
    };
    $[5] = canPasteImage;
    $[6] = deferredPasteForwarding;
    $[7] = isFooterFocused;
    $[8] = Sn;
  } else Sn = $[8];
  let onPaste = Sn;
  let cn = question.options.length + 1 + 1;
  let Dn;
  if (
    $[9] !== cn ||
    $[10] !== isFooterFocused ||
    $[11] !== bo ||
    $[12] !== isScreenReaderEnabled ||
    $[13] !== onCancel ||
    $[14] !== onRespondToClaude
  ) {
    Dn = (e) => {
      if (!isFooterFocused) {
        if (!isScreenReaderEnabled && !bo && normalizeFullWidthDigits_2(e.key) === String(cn)) {
          e.preventDefault();
          onRespondToClaude();
        }
        return;
      }
      if (e.key === "up" || (e.ctrl && e.key === "p")) {
        e.preventDefault();
        Mn();
        return;
      }
      if (e.key === "return" || normalizeFullWidthDigits_2(e.key) === String(cn)) {
        e.preventDefault();
        onRespondToClaude();
        return;
      }
      if (e.key === "escape") {
        e.preventDefault();
        onCancel();
      }
    };
    $[9] = cn;
    $[10] = isFooterFocused;
    $[11] = bo;
    $[12] = isScreenReaderEnabled;
    $[13] = onCancel;
    $[14] = onRespondToClaude;
    $[15] = Dn;
  } else Dn = $[15];
  let onKeyDown = Dn;
  let textOptions = question.options.map(toSelectOption);
  let key = question.key;
  let questionState = questionStates[key];
  let Zn = R(null);
  let Un;
  if (
    $[16] !== onUpdateQuestionState ||
    $[17] !== question.multiSelect ||
    $[18] !== key ||
    $[19] !== wouldTakeAnswer
  ) {
    Un = async (currentValue, setValue) => {
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
    $[16] = onUpdateQuestionState;
    $[17] = question.multiSelect;
    $[18] = key;
    $[19] = wouldTakeAnswer;
    $[20] = Un;
  } else Un = $[20];
  let onOpenEditor = Un;
  const placeholder = question.multiSelect ? "Type something" : "Type something.";
  const initialValue = questionState?.textInputValue ?? "";
  let vimEditing;
  if ($[21] !== editorMode || $[22] !== takesEscape) {
    vimEditing = editorMode
      ? {
          takesEscape,
          onStateChange: Ho,
        }
      : undefined;
    $[21] = editorMode;
    $[22] = takesEscape;
    $[23] = vimEditing;
  } else vimEditing = $[23];
  let onChange;
  if (
    $[24] !== onUpdateQuestionState ||
    $[25] !== question.multiSelect ||
    $[26] !== key ||
    $[27] !== wouldTakeAnswer
  ) {
    onChange = (value) => {
      if (!wouldTakeAnswer()) {
        return false;
      }
      Zn.current = {
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
    $[24] = onUpdateQuestionState;
    $[25] = question.multiSelect;
    $[26] = key;
    $[27] = wouldTakeAnswer;
    $[28] = onChange;
  } else onChange = $[28];
  let Ur;
  if ($[29] !== initialValue || $[30] !== vimEditing || $[31] !== onChange || $[32] !== placeholder) {
    Ur = {
      type: "input",
      value: "__other__",
      label: "Other",
      placeholder,
      initialValue,
      takesPasteFromOtherRows: true,
      vimEditing,
      onChange,
    };
    $[29] = initialValue;
    $[30] = vimEditing;
    $[31] = onChange;
    $[32] = placeholder;
    $[33] = Ur;
  } else Ur = $[33];
  let Zr = Ur;
  let wr;
  if ($[34] !== isScreenReaderEnabled || $[35] !== question.multiSelect) {
    wr =
      isScreenReaderEnabled && !question.multiSelect
        ? [
            {
              type: "text",
              value: "__chat__",
              label: "Chat about this",
            },
          ]
        : [];
    $[34] = isScreenReaderEnabled;
    $[35] = question.multiSelect;
    $[36] = wr;
  } else wr = $[36];
  let zr = wr;
  let options = [...textOptions, Zr, ...zr];
  if (!question.multiSelect && question.options.some(hasOptionPreview) && !isScreenReaderEnabled) {
    let $r;
    if (
      $[37] !== answers ||
      $[38] !== currentQuestionIndex ||
      $[39] !== hideSubmitTab_2 ||
      $[40] !== minContentWidth ||
      $[41] !== onAnswer ||
      $[42] !== onCancel ||
      $[43] !== onRespondToClaude ||
      $[44] !== onTabNext ||
      $[45] !== onTabPrev ||
      $[46] !== onTextInputFocus ||
      $[47] !== onUpdateQuestionState ||
      $[48] !== question ||
      $[49] !== questionStates ||
      $[50] !== questions ||
      $[51] !== wouldTakeAnswer
    ) {
      $r = jsxProd_default(PreviewQuestionView, {
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
      $[37] = answers;
      $[38] = currentQuestionIndex;
      $[39] = hideSubmitTab_2;
      $[40] = minContentWidth;
      $[41] = onAnswer;
      $[42] = onCancel;
      $[43] = onRespondToClaude;
      $[44] = onTabNext;
      $[45] = onTabPrev;
      $[46] = onTextInputFocus;
      $[47] = onUpdateQuestionState;
      $[48] = question;
      $[49] = questionStates;
      $[50] = questions;
      $[51] = wouldTakeAnswer;
      $[52] = $r;
    } else $r = $[52];
    return $r;
  }
  let $r;
  if ($[53] !== so || $[54] !== planFilePath) {
    $r =
      so &&
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
    $[53] = so;
    $[54] = planFilePath;
    $[55] = $r;
  } else $r = $[55];
  let Yr;
  if ($[56] === MEMO_CACHE_SENTINEL) {
    Yr = jsxProd_default(Divider, {
      color: "inactive",
    });
    $[56] = Yr;
  } else Yr = $[56];
  let Er;
  if (
    $[57] !== answers ||
    $[58] !== currentQuestionIndex ||
    $[59] !== hideSubmitTab_2 ||
    $[60] !== questions
  ) {
    Er = jsxProd_default(QuestionNavigationBar, {
      questions,
      currentQuestionIndex,
      answers,
      hideSubmitTab: hideSubmitTab_2,
    });
    $[57] = answers;
    $[58] = currentQuestionIndex;
    $[59] = hideSubmitTab_2;
    $[60] = questions;
    $[61] = Er;
  } else Er = $[61];
  let children;
  if ($[62] !== question.displayBody || $[63] !== question.displayQuestion.text) {
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
    $[62] = question.displayBody;
    $[63] = question.displayQuestion.text;
    $[64] = children;
  } else children = $[64];
  let ms;
  if ($[65] !== question.displayQuestion.needsGutter || $[66] !== children) {
    ms = jsxProd_default(Blockquote, {
      multiline: question.displayQuestion.needsGutter,
      children,
    });
    $[65] = question.displayQuestion.needsGutter;
    $[66] = children;
    $[67] = ms;
  } else ms = $[67];
  let oi;
  if (
    $[68] !== cn ||
    $[69] !== isFooterFocused ||
    $[70] !== bo ||
    $[71] !== isScreenReaderEnabled ||
    $[72] !== Ro ||
    $[73] !== takesEscape ||
    $[74] !== questions
  ) {
    oi =
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
                    children: [cn, ". Chat about this"],
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
                  Ro &&
                    Ro.mode !== "NORMAL" &&
                    jsxProd_default_2(Text, {
                      children: ["-- ", Ro.mode, " --"],
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
                  bo &&
                    No &&
                    jsxProd_default(KeyboardShortcutHint, {
                      chord: "ctrl+g",
                      action: `edit in ${No}`,
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
    $[68] = cn;
    $[69] = isFooterFocused;
    $[70] = bo;
    $[71] = isScreenReaderEnabled;
    $[72] = Ro;
    $[73] = takesEscape;
    $[74] = questions;
    $[75] = oi;
  } else oi = $[75];
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    marginTop: 0,
    tabIndex: 0,
    autoFocus: true,
    onKeyDown,
    onPaste,
    children: [
      $r,
      Yr,
      jsxProd_default_2(Box, {
        flexDirection: "column",
        paddingTop: 0,
        children: [
          Er,
          ms,
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
                            ? Zn.current?.question === key
                              ? Zn.current.value
                              : questionStates[key]?.textInputValue
                            : undefined;
                          let finalValues = values
                            .filter(isNotOtherOption)
                            .concat(textInput ? [textInput] : []);
                          onAnswer(key, finalValues, undefined, false);
                        },
                        onFocus: handleFocus,
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
                        onOpenEditor,
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
                        onFocus: handleFocus,
                        onCancel,
                        onDownFromLastItem: handleDownFromLastItem,
                        isDisabled: isFooterFocused,
                        layout: "compact-vertical",
                        onOpenEditor,
                        canPasteImage,
                        onImagePaste,
                        pastedContents,
                        onRemoveImage,
                      },
                      question.key,
                    ),
              }),
              oi,
            ],
          }),
        ],
      }),
    ],
  });
}
export { QuestionView };
