/**
 * components/permissions/AskUserQuestionPermissionRequest/PreviewQuestionView.tsx
 *
 * 带预览的单问题视图：左右分栏显示选项与预览，支持外部编辑器与 Tab 切换。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/AskUserQuestionPermissionRequest/PreviewQuestionView.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { useState } from "../../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { resolveEditorCommand } from "../../../utils/editor.js";
import { toIDEDisplayName } from "../../../utils/ide.js";
import { editPromptInEditor } from "../../../utils/promptEditor.js";
import { updateLastInteractionTime } from "../../../bootstrap/state.js";
import { useKeybinding } from "../../../keybindings/useKeybinding.js";
import { MessageActionsKeybindings } from "../../messageActions.js";
import { NOTES_ONLY_ANSWER } from "../../../tools/AskUserQuestionTool/AskUserQuestionTool.js";
import { PREVIEW_WITHHELD_TEXT } from "./PreviewBox.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { useUnattendedNotice } from "../UnattendedAutoBlockNotice.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Divider } from "../../design-system/Divider.js";
import { QuestionNavigationBar } from "./QuestionNavigationBar.js";
import { PermissionRequestTitle } from "../PermissionRequestTitle.js";
import { Blockquote } from "../../Blockquote.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { figures_default } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Markdown } from "../../Markdown.js";
import { TextInput } from "../../TextInput.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { Byline } from "../../design-system/Byline.js";

//@ chunk-18hwfzwa.js:1278846-1287012 fingerprint (2.1.88 match: PreviewQuestionView, 0.787)
function PreviewQuestionView(props) {
  let $ = useMemoCache(122);
  let {
    wouldTakeAnswer,
    question,
    questions,
    currentQuestionIndex,
    answers,
    questionStates,
    hideSubmitTab,
    minContentWidth,
    onUpdateQuestionState,
    onAnswer,
    onTextInputFocus,
    onCancel,
    onTabPrev,
    onTabNext,
    onRespondToClaude,
  } = props;
  let hideSubmitTab_2 = hideSubmitTab === undefined ? false : hideSubmitTab;
  let [isRespondingFocused, setIsRespondingFocused] = useState(false);
  let [isTextInputActive, setTextInputActive] = useState(false);
  let [cursorOffset, setCursorOffset] = useState(0);
  let editorCommand;
  let editorName;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    editorCommand = resolveEditorCommand();
    editorName = editorCommand ? toIDEDisplayName(editorCommand) : null;
    $[0] = editorCommand;
    $[1] = editorName;
  } else {
    editorCommand = $[0];
    editorName = $[1];
  }
  let editorDisplayName = editorName;
  let key = question.key;
  let questionState = questionStates[key];
  let allOptions = question.options;
  let [focusedOptionIndex, setFocusedOptionIndex] = useState(0);
  let [forceSelectFocus, setForceSelectFocus] = useState(false);
  let [lastQuestionKey, setLastQuestionKey] = useState(key);
  if (lastQuestionKey !== key) {
    setLastQuestionKey(key);
    let selected = questionState?.selectedValue;
    let idx = selected ? allOptions.findIndex((opt) => opt.value === selected) : -1;
    setFocusedOptionIndex(idx >= 0 ? idx : 0);
    setForceSelectFocus(false);
  }
  let focusedOption = allOptions[focusedOptionIndex];
  let selectedValue = questionState?.selectedValue;
  let textInputValue = questionState?.textInputValue || "";
  let chooseOption;
  if (
    $[2] !== allOptions ||
    $[3] !== onAnswer ||
    $[4] !== onUpdateQuestionState ||
    $[5] !== key ||
    $[6] !== wouldTakeAnswer
  ) {
    chooseOption = (index) => {
      let option = allOptions[index];
      if (!option) {
        return;
      }
      setFocusedOptionIndex(index);
      if (!wouldTakeAnswer()) {
        return;
      }
      onUpdateQuestionState(
        key,
        {
          selectedValue: option.value,
        },
        false,
      );
      onAnswer(key, option.value);
    };
    $[2] = allOptions;
    $[3] = onAnswer;
    $[4] = onUpdateQuestionState;
    $[5] = key;
    $[6] = wouldTakeAnswer;
    $[7] = chooseOption;
  } else chooseOption = $[7];
  let chooseOptionStable = chooseOption;
  let moveFocus;
  if (
    $[8] !== allOptions.length ||
    $[9] !== focusedOptionIndex ||
    $[10] !== isTextInputActive ||
    $[11] !== wouldTakeAnswer
  ) {
    moveFocus = (direction) => {
      if (isTextInputActive) {
        return;
      }
      let newIndex;
      if (typeof direction === "number") newIndex = direction;
      else if (direction === "up")
        newIndex = focusedOptionIndex > 0 ? focusedOptionIndex - 1 : focusedOptionIndex;
      else
        newIndex = focusedOptionIndex < allOptions.length - 1 ? focusedOptionIndex + 1 : focusedOptionIndex;
      if (newIndex >= 0 && newIndex < allOptions.length) {
        if (!wouldTakeAnswer()) {
          return;
        }
        setFocusedOptionIndex(newIndex);
        if (newIndex !== focusedOptionIndex) setForceSelectFocus(true);
      }
    };
    $[8] = allOptions.length;
    $[9] = focusedOptionIndex;
    $[10] = isTextInputActive;
    $[11] = wouldTakeAnswer;
    $[12] = moveFocus;
  } else moveFocus = $[12];
  let moveFocusStable = moveFocus;
  let openEditor;
  if (
    $[13] !== onUpdateQuestionState ||
    $[14] !== questionState?.textInputValue ||
    $[15] !== key ||
    $[16] !== wouldTakeAnswer
  ) {
    openEditor = async () => {
      if (!wouldTakeAnswer()) {
        return;
      }
      let currentValue = questionState?.textInputValue || "";
      let result = await editPromptInEditor(currentValue);
      updateLastInteractionTime(true);
      if (result.content !== null && result.content !== currentValue) {
        if (!wouldTakeAnswer()) {
          return;
        }
        onUpdateQuestionState(
          key,
          {
            textInputValue: result.content,
          },
          false,
        );
      }
    };
    $[13] = onUpdateQuestionState;
    $[14] = questionState?.textInputValue;
    $[15] = key;
    $[16] = wouldTakeAnswer;
    $[17] = openEditor;
  } else openEditor = $[17];
  const isActive = isTextInputActive && !!editorCommand;
  let editorKeyArgs;
  if ($[18] !== isActive) {
    editorKeyArgs = {
      context: "Chat",
      isActive,
    };
    $[18] = isActive;
    $[19] = editorKeyArgs;
  } else editorKeyArgs = $[19];
  useKeybinding("chat:externalEditor", openEditor, editorKeyArgs);
  let tabsKeybindings;
  if ($[20] !== onTabNext || $[21] !== onTabPrev) {
    tabsKeybindings = {
      "tabs:previous": onTabPrev,
      "tabs:next": onTabNext,
    };
    $[20] = onTabNext;
    $[21] = onTabPrev;
    $[22] = tabsKeybindings;
  } else tabsKeybindings = $[22];
  const isActive_2 = !isTextInputActive && !isRespondingFocused;
  let tabsKeyArgs;
  if ($[23] !== isActive_2) {
    tabsKeyArgs = {
      context: "Tabs",
      isActive: isActive_2,
    };
    $[23] = isActive_2;
    $[24] = tabsKeyArgs;
  } else tabsKeyArgs = $[24];
  MessageActionsKeybindings(tabsKeybindings, tabsKeyArgs);
  let onExitTextInput;
  if ($[25] !== onTextInputFocus) {
    onExitTextInput = () => {
      setTextInputActive(false);
      onTextInputFocus(false);
    };
    $[25] = onTextInputFocus;
    $[26] = onExitTextInput;
  } else onExitTextInput = $[26];
  let onExitTextInputStable = onExitTextInput;
  let submitAnswer;
  if (
    $[27] !== focusedOptionIndex ||
    $[28] !== onExitTextInputStable ||
    $[29] !== chooseOptionStable ||
    $[30] !== forceSelectFocus ||
    $[31] !== textInputValue ||
    $[32] !== onAnswer ||
    $[33] !== key ||
    $[34] !== selectedValue ||
    $[35] !== wouldTakeAnswer
  ) {
    submitAnswer = () => {
      onExitTextInputStable();
      if (!wouldTakeAnswer()) {
        return;
      }
      if (textInputValue.trim() && forceSelectFocus) chooseOptionStable(focusedOptionIndex);
      else if (selectedValue) onAnswer(key, selectedValue);
      else if (textInputValue.trim()) onAnswer(key, NOTES_ONLY_ANSWER);
    };
    $[27] = focusedOptionIndex;
    $[28] = onExitTextInputStable;
    $[29] = chooseOptionStable;
    $[30] = forceSelectFocus;
    $[31] = textInputValue;
    $[32] = onAnswer;
    $[33] = key;
    $[34] = selectedValue;
    $[35] = wouldTakeAnswer;
    $[36] = submitAnswer;
  } else submitAnswer = $[36];
  let onSubmit = submitAnswer;
  let showResponding;
  if ($[37] === MEMO_CACHE_SENTINEL) {
    showResponding = () => {
      setIsRespondingFocused(true);
    };
    $[37] = showResponding;
  } else showResponding = $[37];
  let showRespondingStable = showResponding;
  let hideResponding;
  if ($[38] === MEMO_CACHE_SENTINEL) {
    hideResponding = () => {
      setIsRespondingFocused(false);
    };
    $[38] = hideResponding;
  } else hideResponding = $[38];
  let hideRespondingStable = hideResponding;
  let onKeyDown;
  if (
    $[39] !== allOptions.length ||
    $[40] !== focusedOptionIndex ||
    $[41] !== moveFocusStable ||
    $[42] !== onExitTextInputStable ||
    $[43] !== chooseOptionStable ||
    $[44] !== isRespondingFocused ||
    $[45] !== isTextInputActive ||
    $[46] !== onCancel ||
    $[47] !== onRespondToClaude ||
    $[48] !== onTextInputFocus
  ) {
    onKeyDown = (e) => {
      if (isRespondingFocused) {
        if (e.key === "up" || (e.ctrl && e.key === "p")) {
          e.preventDefault();
          hideRespondingStable();
          return;
        }
        if (e.key === "return") {
          e.preventDefault();
          onRespondToClaude();
          return;
        }
        if (e.key === "escape") {
          e.preventDefault();
          onCancel();
        }
        return;
      }
      if (isTextInputActive) {
        if (e.key === "escape") {
          e.preventDefault();
          onExitTextInputStable();
        }
        return;
      }
      if (e.key === "up" || (e.ctrl && e.key === "p")) {
        e.preventDefault();
        if (focusedOptionIndex > 0) moveFocusStable("up");
      } else if (e.key === "down" || (e.ctrl && e.key === "n")) {
        e.preventDefault();
        if (focusedOptionIndex === allOptions.length - 1) showRespondingStable();
        else moveFocusStable("down");
      } else if (e.key === "return") {
        e.preventDefault();
        chooseOptionStable(focusedOptionIndex);
      } else if (e.key === "n" && !e.ctrl && !e.meta) {
        e.preventDefault();
        setTextInputActive(true);
        onTextInputFocus(true);
      } else if (e.key === "escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key.length === 1 && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        let idx = parseInt(e.key, 10) - 1;
        if (idx < allOptions.length) moveFocusStable(idx);
      }
    };
    $[39] = allOptions.length;
    $[40] = focusedOptionIndex;
    $[41] = moveFocusStable;
    $[42] = onExitTextInputStable;
    $[43] = chooseOptionStable;
    $[44] = isRespondingFocused;
    $[45] = isTextInputActive;
    $[46] = onCancel;
    $[47] = onRespondToClaude;
    $[48] = onTextInputFocus;
    $[49] = onKeyDown;
  } else onKeyDown = $[49];
  let onKeyDown_2 = onKeyDown;
  let previewMarkdown =
    focusedOption?.preview === undefined
      ? null
      : focusedOption.preview.kind === "full"
        ? focusedOption.preview.markdown
        : PREVIEW_WITHHELD_TEXT;
  let { columns, rows } = useTerminalSize();
  let previewWidth = columns - 30 - 4;
  let columns_2 = Math.max(1, previewWidth - bunStringWidth("Notes:") - 1);
  let unattendedNotice = useUnattendedNotice();
  let maxLines = Math.max(1, rows - 26 - unattendedNotice);
  let topDivider;
  if ($[50] === MEMO_CACHE_SENTINEL) {
    topDivider = jsxProd_default(Divider, {
      color: "inactive",
    });
    $[50] = topDivider;
  } else topDivider = $[50];
  let navBar;
  if (
    $[51] !== answers ||
    $[52] !== currentQuestionIndex ||
    $[53] !== hideSubmitTab_2 ||
    $[54] !== questions
  ) {
    navBar = jsxProd_default(QuestionNavigationBar, {
      questions,
      currentQuestionIndex,
      answers,
      hideSubmitTab: hideSubmitTab_2,
    });
    $[51] = answers;
    $[52] = currentQuestionIndex;
    $[53] = hideSubmitTab_2;
    $[54] = questions;
    $[55] = navBar;
  } else navBar = $[55];
  let children;
  if ($[56] !== question.displayQuestion.text) {
    children = jsxProd_default(PermissionRequestTitle, {
      title: question.displayQuestion.text,
      color: "text",
    });
    $[56] = question.displayQuestion.text;
    $[57] = children;
  } else children = $[57];
  let questionBlock;
  if ($[58] !== question.displayQuestion.needsGutter || $[59] !== children) {
    questionBlock = jsxProd_default(Blockquote, {
      multiline: question.displayQuestion.needsGutter,
      children,
    });
    $[58] = question.displayQuestion.needsGutter;
    $[59] = children;
    $[60] = questionBlock;
  } else questionBlock = $[60];
  let children_2;
  if ($[61] !== allOptions || $[62] !== focusedOptionIndex || $[63] !== selectedValue) {
    let renderOption;
    if ($[65] !== focusedOptionIndex || $[66] !== selectedValue) {
      renderOption = (option, index) => {
        let isFocused = focusedOptionIndex === index;
        let isSelected = selectedValue === option.value;
        return jsxProd_default_2(
          Box,
          {
            flexDirection: "row",
            children: [
              isFocused
                ? jsxProd_default(Text, {
                    color: "suggestion",
                    children: figures_default.pointer,
                  })
                : jsxProd_default(Text, {
                    children: " ",
                  }),
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [" ", index + 1, "."],
              }),
              jsxProd_default_2(Text, {
                color: isSelected ? "success" : isFocused ? "suggestion" : undefined,
                bold: isFocused,
                children: [" ", option.displayLabel],
              }),
              isSelected &&
                jsxProd_default_2(Text, {
                  color: "success",
                  children: [" ", figures_default.tick],
                }),
            ],
          },
          option.value,
        );
      };
      $[65] = focusedOptionIndex;
      $[66] = selectedValue;
      $[67] = renderOption;
    } else renderOption = $[67];
    children_2 = allOptions.map(renderOption);
    $[61] = allOptions;
    $[62] = focusedOptionIndex;
    $[63] = selectedValue;
    $[64] = children_2;
  } else children_2 = $[64];
  let optionsBox;
  if ($[68] !== children_2) {
    optionsBox = jsxProd_default(Box, {
      flexDirection: "column",
      width: 30,
      children: children_2,
    });
    $[68] = children_2;
    $[69] = optionsBox;
  } else optionsBox = $[69];
  const content = previewMarkdown || "No preview available";
  let previewView;
  if ($[70] !== minContentWidth || $[71] !== maxLines || $[72] !== previewWidth || $[73] !== content) {
    previewView = jsxProd_default(Markdown, {
      content,
      maxLines,
      minWidth: minContentWidth,
      maxWidth: previewWidth,
    });
    $[70] = minContentWidth;
    $[71] = maxLines;
    $[72] = previewWidth;
    $[73] = content;
    $[74] = previewView;
  } else previewView = $[74];
  let notesLabel;
  if ($[75] === MEMO_CACHE_SENTINEL) {
    notesLabel = jsxProd_default(Box, {
      flexShrink: 0,
      children: jsxProd_default(Text, {
        color: "suggestion",
        children: "Notes:",
      }),
    });
    $[75] = notesLabel;
  } else notesLabel = $[75];
  let notesBox;
  if (
    $[76] !== cursorOffset ||
    $[77] !== onExitTextInputStable ||
    $[78] !== onSubmit ||
    $[79] !== isTextInputActive ||
    $[80] !== columns_2 ||
    $[81] !== textInputValue ||
    $[82] !== onUpdateQuestionState ||
    $[83] !== key ||
    $[84] !== wouldTakeAnswer
  ) {
    notesBox = jsxProd_default_2(Box, {
      marginTop: 1,
      flexDirection: "row",
      gap: 1,
      children: [
        notesLabel,
        isTextInputActive
          ? jsxProd_default(TextInput, {
              value: textInputValue,
              placeholder: "Add notes on this design\u2026",
              onChange: (value) => {
                if (!wouldTakeAnswer()) {
                  return;
                }
                onUpdateQuestionState(
                  key,
                  {
                    textInputValue: value,
                  },
                  false,
                );
              },
              onSubmit,
              onExit: onExitTextInputStable,
              focus: true,
              showCursor: true,
              columns: columns_2,
              maxVisibleLines: 5,
              cursorOffset,
              onChangeCursorOffset: setCursorOffset,
              disableEscapeDoublePress: true,
            })
          : jsxProd_default(Text, {
              dimColor: true,
              italic: true,
              children: textInputValue || "press n to add notes",
            }),
      ],
    });
    $[76] = cursorOffset;
    $[77] = onExitTextInputStable;
    $[78] = onSubmit;
    $[79] = isTextInputActive;
    $[80] = columns_2;
    $[81] = textInputValue;
    $[82] = onUpdateQuestionState;
    $[83] = key;
    $[84] = wouldTakeAnswer;
    $[85] = notesBox;
  } else notesBox = $[85];
  let previewColumn;
  if ($[86] !== previewView || $[87] !== notesBox) {
    previewColumn = jsxProd_default_2(Box, {
      flexDirection: "column",
      flexGrow: 1,
      children: [previewView, notesBox],
    });
    $[86] = previewView;
    $[87] = notesBox;
    $[88] = previewColumn;
  } else previewColumn = $[88];
  let mainRow;
  if ($[89] !== optionsBox || $[90] !== previewColumn) {
    mainRow = jsxProd_default_2(Box, {
      marginTop: 1,
      flexDirection: "row",
      gap: 4,
      children: [optionsBox, previewColumn],
    });
    $[89] = optionsBox;
    $[90] = previewColumn;
    $[91] = mainRow;
  } else mainRow = $[91];
  let bottomDivider;
  if ($[92] === MEMO_CACHE_SENTINEL) {
    bottomDivider = jsxProd_default(Divider, {
      color: "inactive",
    });
    $[92] = bottomDivider;
  } else bottomDivider = $[92];
  let chatPointer;
  if ($[93] !== isRespondingFocused) {
    chatPointer = isRespondingFocused
      ? jsxProd_default(Text, {
          color: "suggestion",
          children: figures_default.pointer,
        })
      : jsxProd_default(Text, {
          children: " ",
        });
    $[93] = isRespondingFocused;
    $[94] = chatPointer;
  } else chatPointer = $[94];
  const color = isRespondingFocused ? "suggestion" : undefined;
  let chatLabel;
  if ($[95] !== color) {
    chatLabel = jsxProd_default(Text, {
      color,
      children: "Chat about this",
    });
    $[95] = color;
    $[96] = chatLabel;
  } else chatLabel = $[96];
  let chatBox;
  if ($[97] !== chatPointer || $[98] !== chatLabel) {
    chatBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [
        bottomDivider,
        jsxProd_default_2(Box, {
          flexDirection: "row",
          gap: 1,
          children: [chatPointer, chatLabel],
        }),
      ],
    });
    $[97] = chatPointer;
    $[98] = chatLabel;
    $[99] = chatBox;
  } else chatBox = $[99];
  let selectHint;
  if ($[100] === MEMO_CACHE_SENTINEL) {
    selectHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "enter",
      action: "select",
    });
    $[100] = selectHint;
  } else selectHint = $[100];
  let navigateHint;
  let notesHint;
  if ($[101] === MEMO_CACHE_SENTINEL) {
    navigateHint = jsxProd_default(KeyboardShortcutHint, {
      chord: ["up", "down"],
      action: "navigate",
    });
    notesHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "n",
      action: "add notes",
    });
    $[101] = navigateHint;
    $[102] = notesHint;
  } else {
    navigateHint = $[101];
    notesHint = $[102];
  }
  let switchHint;
  if ($[103] !== questions.length) {
    switchHint =
      questions.length > 1 &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "tab",
        action: "switch questions",
      });
    $[103] = questions.length;
    $[104] = switchHint;
  } else switchHint = $[104];
  let editorHint;
  if ($[105] !== isTextInputActive) {
    editorHint =
      isTextInputActive &&
      editorDisplayName &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "ctrl+g",
        action: `edit in ${editorDisplayName}`,
      });
    $[105] = isTextInputActive;
    $[106] = editorHint;
  } else editorHint = $[106];
  let cancelHint;
  if ($[107] === MEMO_CACHE_SENTINEL) {
    cancelHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "cancel",
    });
    $[107] = cancelHint;
  } else cancelHint = $[107];
  let hintsBox;
  if ($[108] !== switchHint || $[109] !== editorHint) {
    hintsBox = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        color: "inactive",
        dimColor: true,
        children: jsxProd_default_2(Byline, {
          children: [selectHint, navigateHint, notesHint, switchHint, editorHint, cancelHint],
        }),
      }),
    });
    $[108] = switchHint;
    $[109] = editorHint;
    $[110] = hintsBox;
  } else hintsBox = $[110];
  let contentBox;
  if ($[111] !== mainRow || $[112] !== chatBox || $[113] !== hintsBox) {
    contentBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [mainRow, chatBox, hintsBox],
    });
    $[111] = mainRow;
    $[112] = chatBox;
    $[113] = hintsBox;
    $[114] = contentBox;
  } else contentBox = $[114];
  let bodyBox;
  if ($[115] !== navBar || $[116] !== questionBlock || $[117] !== contentBox) {
    bodyBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingTop: 0,
      children: [navBar, questionBlock, contentBox],
    });
    $[115] = navBar;
    $[116] = questionBlock;
    $[117] = contentBox;
    $[118] = bodyBox;
  } else bodyBox = $[118];
  let container;
  if ($[119] !== onKeyDown_2 || $[120] !== bodyBox) {
    container = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      tabIndex: 0,
      autoFocus: true,
      onKeyDown: onKeyDown_2,
      children: [topDivider, bodyBox],
    });
    $[119] = onKeyDown_2;
    $[120] = bodyBox;
    $[121] = container;
  } else container = $[121];
  return container;
}
export { PreviewQuestionView };
