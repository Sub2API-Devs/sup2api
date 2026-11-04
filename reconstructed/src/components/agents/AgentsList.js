/**
 * components/agents/AgentsList.tsx
 *
 * 子代理列表与表单字段（选择/必填校验）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/AgentsList.tsx
 * pieces: chunk-6rcbehen.js (5)
 * attribution: sole-consumer 3, affinity 1, callgraph-fingerprint 1
 */
import { init_react_production, useState } from "../../../vendor/react/cjs/react.production.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { useRegisterTabsNavigationOwner } from "../design-system/Tabs.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Text, Box } from "../../ink/components/Text.js";
import { ErrorText } from "../ErrorText.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { Dialog } from "../design-system/Dialog.js";
import { TextInput } from "../TextInput.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6rcbehen.js:701-705 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6rcbehen.js:701", () => {
  init_react_production();
});
//@ chunk-6rcbehen.js:705-741 sole-consumer
function labelWidth(item) {
  return bunStringWidth(item.label);
}
//@ chunk-6rcbehen.js:741-774 affinity
function isNotNull_2(value) {
  return value !== null;
}
//@ chunk-6rcbehen.js:774-5753 callgraph-fingerprint = AgentsList (0.176)
function AgentsList(props) {
  let $ = useMemoCache(107);
  let { title, subtitle, fields, values, onChange, onSubmit, onCancel, submitLabel } = props;
  let children = submitLabel === undefined ? "Save" : submitLabel;
  let submitIndex = fields.length + 1;
  let [focusedIndex, setFocusedIndex] = useState(0);
  let initialCursorCached;
  if ($[0] !== fields[0] || $[1] !== values) {
    initialCursorCached = () => {
      let firstField = fields[0];
      return firstField?.type === "text" ? (values[firstField.key] ?? "").length : 0;
    };
    $[0] = fields[0];
    $[1] = values;
    $[2] = initialCursorCached;
  } else initialCursorCached = $[2];
  let [cursor, setCursor] = useState(initialCursorCached);
  let currentField = focusedIndex < fields.length ? fields[focusedIndex] : null;
  let isTextField = currentField?.type === "text";
  let maxLabelWidthCached;
  if ($[3] !== fields) {
    maxLabelWidthCached = Math.max(...fields.map(labelWidth));
    $[3] = fields;
    $[4] = maxLabelWidthCached;
  } else maxLabelWidthCached = $[4];
  let labelWidth_2 = maxLabelWidthCached;
  let validateFieldCached;
  if ($[5] !== values) {
    validateFieldCached = function validateField(agent_0) {
      if (agent_0.type !== "text") {
        return null;
      }
      let value = values[agent_0.key] ?? "";
      if (agent_0.required && value.trim() === "") {
        return `${agent_0.label} is required`;
      }
      return agent_0.validate ? agent_0.validate(value, values) : null;
    };
    $[5] = values;
    $[6] = validateFieldCached;
  } else validateFieldCached = $[6];
  let firstValidation = validateFieldCached;
  let firstErrorCached;
  if ($[7] !== firstValidation || $[8] !== fields) {
    firstErrorCached = fields.map(firstValidation).find(isNotNull_2);
    $[7] = firstValidation;
    $[8] = fields;
    $[9] = firstErrorCached;
  } else firstErrorCached = $[9];
  let firstError = firstErrorCached;
  let focusIndexCached;
  if ($[10] !== fields || $[11] !== focusedIndex || $[12] !== submitIndex || $[13] !== values) {
    focusIndexCached = function focusField(nextIndex) {
      let max = Math.max(0, Math.min(submitIndex - 1, nextIndex));
      if (max === focusedIndex) {
        return;
      }
      setFocusedIndex(max);
      let field = fields[max];
      if (field?.type === "text") setCursor((values[field.key] ?? "").length);
    };
    $[10] = fields;
    $[11] = focusedIndex;
    $[12] = submitIndex;
    $[13] = values;
    $[14] = focusIndexCached;
  } else focusIndexCached = $[14];
  let focusFieldCached = focusIndexCached;
  let submitCached;
  if ($[15] !== firstError || $[16] !== onSubmit) {
    submitCached = function handleSubmit() {
      if (firstError) {
        return;
      }
      onSubmit();
    };
    $[15] = firstError;
    $[16] = onSubmit;
    $[17] = submitCached;
  } else submitCached = $[17];
  let submitForm = submitCached;
  let cycleOptionCached;
  if ($[18] !== currentField || $[19] !== onChange || $[20] !== values) {
    cycleOptionCached = function cycleOption(delta) {
      if (currentField?.type !== "select") {
        return;
      }
      let options = currentField.options;
      let selectedValue = values[currentField.key] ?? options[0]?.value ?? "";
      let index = options.findIndex((agent_1) => agent_1.value === selectedValue);
      let nextOption = options[(index + delta + options.length) % options.length];
      if (nextOption) onChange(currentField.key, nextOption.value);
    };
    $[18] = currentField;
    $[19] = onChange;
    $[20] = values;
    $[21] = cycleOptionCached;
  } else cycleOptionCached = $[21];
  let cycleSelect = cycleOptionCached;
  let focusNext;
  let focusPrevious;
  if ($[22] !== focusedIndex || $[23] !== focusFieldCached) {
    focusPrevious = () => focusFieldCached(focusedIndex - 1);
    focusNext = () => focusFieldCached(focusedIndex + 1);
    $[22] = focusedIndex;
    $[23] = focusFieldCached;
    $[24] = focusNext;
    $[25] = focusPrevious;
  } else {
    focusNext = $[24];
    focusPrevious = $[25];
  }
  let acceptOrAdvance;
  if ($[26] !== focusedIndex || $[27] !== focusFieldCached || $[28] !== submitIndex || $[29] !== submitForm) {
    acceptOrAdvance = () => {
      if (focusedIndex === submitIndex - 1) submitForm();
      else focusFieldCached(focusedIndex + 1);
    };
    $[26] = focusedIndex;
    $[27] = focusFieldCached;
    $[28] = submitIndex;
    $[29] = submitForm;
    $[30] = acceptOrAdvance;
  } else acceptOrAdvance = $[30];
  let selectBindings;
  if ($[31] !== onCancel || $[32] !== focusNext || $[33] !== acceptOrAdvance || $[34] !== focusPrevious) {
    selectBindings = {
      "select:previous": focusPrevious,
      "select:next": focusNext,
      "select:accept": acceptOrAdvance,
      "select:cancel": onCancel,
    };
    $[31] = onCancel;
    $[32] = focusNext;
    $[33] = acceptOrAdvance;
    $[34] = focusPrevious;
    $[35] = selectBindings;
  } else selectBindings = $[35];
  const isActive = !isTextField;
  let selectKeybindingOptions;
  if ($[36] !== isActive) {
    selectKeybindingOptions = {
      context: "Select",
      isActive,
    };
    $[36] = isActive;
    $[37] = selectKeybindingOptions;
  } else selectKeybindingOptions = $[37];
  MessageActionsKeybindings(selectBindings, selectKeybindingOptions);
  let settingsKeybindingOptions;
  if ($[38] === MEMO_CACHE_SENTINEL) {
    settingsKeybindingOptions = {
      context: "Settings",
    };
    $[38] = settingsKeybindingOptions;
  } else settingsKeybindingOptions = $[38];
  useKeybinding("confirm:no", onCancel, settingsKeybindingOptions);
  useRegisterTabsNavigationOwner();
  let tabBindings;
  if ($[39] !== cycleSelect) {
    tabBindings = {
      "tabs:previous": () => cycleSelect(-1),
      "tabs:next": () => cycleSelect(1),
    };
    $[39] = cycleSelect;
    $[40] = tabBindings;
  } else tabBindings = $[40];
  const isActive_2 = currentField?.type === "select";
  let tabKeybindingOptions;
  if ($[41] !== isActive_2) {
    tabKeybindingOptions = {
      context: "Tabs",
      isActive: isActive_2,
    };
    $[41] = isActive_2;
    $[42] = tabKeybindingOptions;
  } else tabKeybindingOptions = $[42];
  MessageActionsKeybindings(tabBindings, tabKeybindingOptions);
  let currentValue = currentField ? (values[currentField.key] ?? "") : "";
  let fieldError;
  if ($[43] !== currentField || $[44] !== currentValue || $[45] !== values) {
    fieldError =
      currentField?.type === "text" && currentField.validate
        ? currentField.validate(currentValue, values)
        : null;
    $[43] = currentField;
    $[44] = currentValue;
    $[45] = values;
    $[46] = fieldError;
  } else fieldError = $[46];
  let errorText = fieldError;
  let fieldHint;
  if ($[47] !== errorText || $[48] !== currentField || $[49] !== currentValue || $[50] !== values) {
    fieldHint = !errorText && currentField?.hint ? currentField.hint(currentValue, values) : undefined;
    $[47] = errorText;
    $[48] = currentField;
    $[49] = currentValue;
    $[50] = values;
    $[51] = fieldHint;
  } else fieldHint = $[51];
  let hintText = fieldHint;
  let fieldRows;
  if (
    $[52] !== cursor ||
    $[53] !== fields ||
    $[54] !== focusedIndex ||
    $[55] !== labelWidth_2 ||
    $[56] !== focusFieldCached ||
    $[57] !== onCancel ||
    $[58] !== onChange ||
    $[59] !== submitForm ||
    $[60] !== values
  ) {
    let renderField;
    if (
      $[62] !== cursor ||
      $[63] !== fields.length ||
      $[64] !== focusedIndex ||
      $[65] !== labelWidth_2 ||
      $[66] !== focusFieldCached ||
      $[67] !== onCancel ||
      $[68] !== onChange ||
      $[69] !== submitForm ||
      $[70] !== values
    ) {
      renderField = (field, index) => {
        let isFocused = index === focusedIndex;
        let value = values[field.key] ?? "";
        return jsxProd_default(
          AgentFormFieldRow,
          {
            field,
            value,
            isFocused,
            labelWidth: labelWidth_2,
            cursor,
            setCursor,
            onChange: (value) => onChange(field.key, value),
            onCancel,
            onUp: () => focusFieldCached(index - 1),
            onDown: () => focusFieldCached(index + 1),
            onEnter: () => {
              if (index === fields.length - 1) submitForm();
              else focusFieldCached(index + 1);
            },
          },
          field.key,
        );
      };
      $[62] = cursor;
      $[63] = fields.length;
      $[64] = focusedIndex;
      $[65] = labelWidth_2;
      $[66] = focusFieldCached;
      $[67] = onCancel;
      $[68] = onChange;
      $[69] = submitForm;
      $[70] = values;
      $[71] = renderField;
    } else renderField = $[71];
    fieldRows = fields.map(renderField);
    $[52] = cursor;
    $[53] = fields;
    $[54] = focusedIndex;
    $[55] = labelWidth_2;
    $[56] = focusFieldCached;
    $[57] = onCancel;
    $[58] = onChange;
    $[59] = submitForm;
    $[60] = values;
    $[61] = fieldRows;
  } else fieldRows = $[61];
  const color = focusedIndex === submitIndex - 1 ? "suggestion" : undefined;
  const pointer = focusedIndex === submitIndex - 1 ? figures_default.pointer : " ";
  let submitPointer;
  if ($[72] !== color || $[73] !== pointer) {
    submitPointer = jsxProd_default_2(Text, {
      color,
      children: [pointer, " "],
    });
    $[72] = color;
    $[73] = pointer;
    $[74] = submitPointer;
  } else submitPointer = $[74];
  const bold = focusedIndex === submitIndex - 1;
  const dimColor = !!firstError;
  let submitText;
  if ($[75] !== children || $[76] !== bold || $[77] !== dimColor) {
    submitText = jsxProd_default(Text, {
      bold,
      dimColor,
      children,
    });
    $[75] = children;
    $[76] = bold;
    $[77] = dimColor;
    $[78] = submitText;
  } else submitText = $[78];
  let submitError;
  if ($[79] !== firstError || $[80] !== focusedIndex || $[81] !== submitIndex) {
    submitError =
      firstError &&
      focusedIndex === submitIndex - 1 &&
      jsxProd_default_2(Text, {
        color: "error",
        children: [" \xB7 ", firstError],
      });
    $[79] = firstError;
    $[80] = focusedIndex;
    $[81] = submitIndex;
    $[82] = submitError;
  } else submitError = $[82];
  let submitRow;
  if ($[83] !== submitPointer || $[84] !== submitText || $[85] !== submitError) {
    submitRow = jsxProd_default_2(Box, {
      marginTop: 1,
      children: [submitPointer, submitText, submitError],
    });
    $[83] = submitPointer;
    $[84] = submitText;
    $[85] = submitError;
    $[86] = submitRow;
  } else submitRow = $[86];
  let messageRow;
  if ($[87] !== errorText || $[88] !== hintText) {
    messageRow = jsxProd_default(Box, {
      marginTop: 1,
      minHeight: 1,
      children: errorText
        ? jsxProd_default(ErrorText, {
            error: errorText,
          })
        : hintText
          ? jsxProd_default(Text, {
              dimColor: true,
              children: hintText,
            })
          : jsxProd_default(Text, {
              children: " ",
            }),
    });
    $[87] = errorText;
    $[88] = hintText;
    $[89] = messageRow;
  } else messageRow = $[89];
  let moveHint;
  if ($[90] === MEMO_CACHE_SENTINEL) {
    moveHint = jsxProd_default(KeyboardShortcutHint, {
      chord: ["up", "down"],
      action: "move",
    });
    $[90] = moveHint;
  } else moveHint = $[90];
  let changeHint;
  if ($[91] !== currentField?.type) {
    changeHint =
      currentField?.type === "select" &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: ["left", "right"],
        action: "change",
      });
    $[91] = currentField?.type;
    $[92] = changeHint;
  } else changeHint = $[92];
  let continueHint;
  let cancelHint;
  if ($[93] === MEMO_CACHE_SENTINEL) {
    continueHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "enter",
      action: "continue",
    });
    cancelHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "cancel",
    });
    $[93] = continueHint;
    $[94] = cancelHint;
  } else {
    continueHint = $[93];
    cancelHint = $[94];
  }
  let hintsRow;
  if ($[95] !== changeHint) {
    hintsRow = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: jsxProd_default_2(Byline, {
          children: [moveHint, changeHint, continueHint, cancelHint],
        }),
      }),
    });
    $[95] = changeHint;
    $[96] = hintsRow;
  } else hintsRow = $[96];
  let children_2;
  if ($[97] !== fieldRows || $[98] !== submitRow || $[99] !== messageRow || $[100] !== hintsRow) {
    children_2 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [fieldRows, submitRow, messageRow, hintsRow],
    });
    $[97] = fieldRows;
    $[98] = submitRow;
    $[99] = messageRow;
    $[100] = hintsRow;
    $[101] = children_2;
  } else children_2 = $[101];
  let dialogElement;
  if ($[102] !== onCancel || $[103] !== subtitle || $[104] !== children_2 || $[105] !== title) {
    dialogElement = jsxProd_default(Dialog, {
      title,
      subtitle,
      onCancel,
      hideInputGuide: true,
      isCancelActive: false,
      children: children_2,
    });
    $[102] = onCancel;
    $[103] = subtitle;
    $[104] = children_2;
    $[105] = title;
    $[106] = dialogElement;
  } else dialogElement = $[106];
  return dialogElement;
}
//@ chunk-6rcbehen.js:5753-7919 sole-consumer
/**
 * 代理表单中的一行字段：左侧对齐标签与必填星号，select 字段显示 ◀ 值 ▶ 并左右切换，text 字段显示可编辑输入框；处理上下移动、回车与取消。
 */
function AgentFormFieldRow(props) {
  let $ = useMemoCache(44);
  let { field, value, isFocused, labelWidth, cursor, setCursor, onChange, onCancel, onUp, onDown, onEnter } =
    props;
  let labelPadCached;
  if ($[0] !== field.label || $[1] !== labelWidth) {
    labelPadCached = " ".repeat(Math.max(0, labelWidth - bunStringWidth(field.label)));
    $[0] = field.label;
    $[1] = labelWidth;
    $[2] = labelPadCached;
  } else labelPadCached = $[2];
  let labelPad = labelPadCached;
  let isMissingRequiredCached;
  if ($[3] !== field.required || $[4] !== field.type || $[5] !== value) {
    isMissingRequiredCached = field.type === "text" && field.required && value.trim() === "";
    $[3] = field.required;
    $[4] = field.type;
    $[5] = value;
    $[6] = isMissingRequiredCached;
  } else isMissingRequiredCached = $[6];
  let isMissingRequired = isMissingRequiredCached;
  const color = isFocused ? "suggestion" : undefined;
  const pointer = isFocused ? figures_default.pointer : " ";
  let pointerCached;
  if ($[7] !== color || $[8] !== pointer) {
    pointerCached = jsxProd_default_2(Text, {
      color,
      children: [pointer, " "],
    });
    $[7] = color;
    $[8] = pointer;
    $[9] = pointerCached;
  } else pointerCached = $[9];
  let pointerElement = pointerCached;
  const dimColor = !isFocused;
  let requiredMark;
  if ($[10] !== isMissingRequired) {
    requiredMark = isMissingRequired
      ? jsxProd_default(Text, {
          color: "error",
          children: "*",
        })
      : " ";
    $[10] = isMissingRequired;
    $[11] = requiredMark;
  } else requiredMark = $[11];
  let labelElementCached;
  if ($[12] !== field.label || $[13] !== labelPad || $[14] !== dimColor || $[15] !== requiredMark) {
    labelElementCached = jsxProd_default_2(Text, {
      dimColor,
      children: [field.label, requiredMark, labelPad, " "],
    });
    $[12] = field.label;
    $[13] = labelPad;
    $[14] = dimColor;
    $[15] = requiredMark;
    $[16] = labelElementCached;
  } else labelElementCached = $[16];
  let labelElement = labelElementCached;
  if (field.type === "select") {
    let selectedOptionCached;
    if ($[17] !== field.options || $[18] !== value) {
      selectedOptionCached = field.options.find((option) => option.value === value) ?? field.options[0];
      $[17] = field.options;
      $[18] = value;
      $[19] = selectedOptionCached;
    } else selectedOptionCached = $[19];
    let selectedOption = selectedOptionCached;
    let selectValueCached;
    if ($[20] !== isFocused || $[21] !== selectedOption?.label || $[22] !== value) {
      selectValueCached = isFocused
        ? jsxProd_default_2(Text, {
            children: [
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [figures_default.triangleLeft, " "],
              }),
              selectedOption?.label ?? value,
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [" ", figures_default.triangleRight],
              }),
            ],
          })
        : jsxProd_default(Text, {
            children: selectedOption?.label ?? value,
          });
      $[20] = isFocused;
      $[21] = selectedOption?.label;
      $[22] = value;
      $[23] = selectValueCached;
    } else selectValueCached = $[23];
    let selectRow;
    if ($[24] !== labelElement || $[25] !== pointerElement || $[26] !== selectValueCached) {
      selectRow = jsxProd_default_2(Box, {
        children: [pointerElement, labelElement, selectValueCached],
      });
      $[24] = labelElement;
      $[25] = pointerElement;
      $[26] = selectValueCached;
      $[27] = selectRow;
    } else selectRow = $[27];
    return selectRow;
  }
  let textElement;
  if (
    $[28] !== cursor ||
    $[29] !== field.mask ||
    $[30] !== field.placeholder ||
    $[31] !== isFocused ||
    $[32] !== onCancel ||
    $[33] !== onChange ||
    $[34] !== onDown ||
    $[35] !== onEnter ||
    $[36] !== onUp ||
    $[37] !== setCursor ||
    $[38] !== value
  ) {
    textElement = isFocused
      ? jsxProd_default(TextInput, {
          value,
          onChange,
          onSubmit: () => onEnter(),
          onExit: onCancel,
          onHistoryUp: onUp,
          onHistoryDown: onDown,
          placeholder: field.placeholder,
          mask: field.mask,
          columns: 60,
          cursorOffset: cursor,
          onChangeCursorOffset: setCursor,
          disableCursorMovementForUpDownKeys: true,
          disableEscapeDoublePress: true,
          focus: true,
          showCursor: true,
        })
      : value
        ? jsxProd_default(Text, {
            children: field.mask ? field.mask.repeat(Math.min(bunStringWidth(value), 60)) : value,
          })
        : jsxProd_default(Text, {
            dimColor: true,
            children: field.placeholder ?? "",
          });
    $[28] = cursor;
    $[29] = field.mask;
    $[30] = field.placeholder;
    $[31] = isFocused;
    $[32] = onCancel;
    $[33] = onChange;
    $[34] = onDown;
    $[35] = onEnter;
    $[36] = onUp;
    $[37] = setCursor;
    $[38] = value;
    $[39] = textElement;
  } else textElement = $[39];
  let textRow;
  if ($[40] !== labelElement || $[41] !== pointerElement || $[42] !== textElement) {
    textRow = jsxProd_default_2(Box, {
      children: [pointerElement, labelElement, textElement],
    });
    $[40] = labelElement;
    $[41] = pointerElement;
    $[42] = textElement;
    $[43] = textRow;
  } else textRow = $[43];
  return textRow;
}
export { AgentsList };
