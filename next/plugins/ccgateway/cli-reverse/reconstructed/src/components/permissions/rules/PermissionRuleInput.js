/**
 * components/permissions/rules/PermissionRuleInput.tsx
 *
 * 权限规则输入框（新增规则）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/rules/PermissionRuleInput.tsx
 * pieces: chunk-h5wy8vq5.js (2)
 * attribution: placement 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useState } from "../../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../../keybindings/useKeybinding.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { normalizeRuleString } from "../../../utils/permissions/legacyWildcardRules.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { Newline } from "../../../ink/components/Input.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { permissionRuleValueFromString } from "../../../utils/permissions/permissionRuleParser.js";
import { WebFetchTool } from "../../../tools/WebFetchTool/WebFetchTool.js";
import { BashTool } from "../../../tools/BashTool/BashTool.js";
import { TextInput } from "../../TextInput.js";
import { figures_default } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Dialog } from "../../design-system/Dialog.js";

//@ chunk-h5wy8vq5.js:25547-25551 placement
init_react_production();
//@ chunk-h5wy8vq5.js:25551-27043 fingerprint (2.1.88 match: PermissionRuleInput, 0.585)
function PermissionRuleInput(props) {
  let $ = useMemoCache(18);
  let { onCancel, onSubmit, ruleBehavior } = props;
  let [inputValue, setInputValue] = useState("");
  let [cursorOffset, setCursorOffset] = useState(0);
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = {
      context: "Settings",
    };
    $[0] = t1;
  } else t1 = $[0];
  useKeybinding("confirm:no", onCancel, t1);
  let { columns } = useTerminalSize();
  let textInputColumns = columns - 6;
  let t2;
  if ($[1] !== onSubmit || $[2] !== ruleBehavior) {
    t2 = (value) => {
      let trimmedValue = value.trim();
      if (trimmedValue.length === 0) {
        return;
      }
      let ruleValue = normalizeRuleString(trimmedValue, ruleBehavior);
      onSubmit(ruleValue, ruleBehavior);
    };
    $[1] = onSubmit;
    $[2] = ruleBehavior;
    $[3] = t2;
  } else t2 = $[3];
  let handleSubmit = t2;
  const title = `Add ${ruleBehavior} permission rule`;
  let inputGuide;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "submit",
        }),
        jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "cancel",
        }),
      ],
    });
    $[4] = inputGuide;
  } else inputGuide = $[4];
  let t4;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    t4 = jsxProd_default(Newline, {});
    $[5] = t4;
  } else t4 = $[5];
  let t5;
  let t6;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    t5 = jsxProd_default(Text, {
      bold: true,
      children: permissionRuleValueFromString({
        toolName: WebFetchTool.name,
      }),
    });
    t6 = jsxProd_default(Text, {
      bold: false,
      children: " or ",
    });
    $[6] = t5;
    $[7] = t6;
  } else {
    t5 = $[6];
    t6 = $[7];
  }
  let t7;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    t7 = jsxProd_default_2(Text, {
      children: [
        "Permission rules are a tool name, optionally followed by a specifier in parentheses.",
        t4,
        "e.g.,",
        " ",
        t5,
        t6,
        jsxProd_default(Text, {
          bold: true,
          children: permissionRuleValueFromString({
            toolName: BashTool.name,
            ruleContent: "ls *",
          }),
        }),
      ],
    });
    $[8] = t7;
  } else t7 = $[8];
  let children;
  if ($[9] !== cursorOffset || $[10] !== handleSubmit || $[11] !== inputValue || $[12] !== textInputColumns) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        t7,
        jsxProd_default(Box, {
          borderDimColor: true,
          borderStyle: "round",
          marginY: 1,
          paddingLeft: 1,
          children: jsxProd_default(TextInput, {
            showCursor: true,
            focus: true,
            value: inputValue,
            onChange: setInputValue,
            onSubmit: handleSubmit,
            placeholder: `Enter permission rule${figures_default.ellipsis}`,
            columns: textInputColumns,
            cursorOffset,
            onChangeCursorOffset: setCursorOffset,
          }),
        }),
      ],
    });
    $[9] = cursorOffset;
    $[10] = handleSubmit;
    $[11] = inputValue;
    $[12] = textInputColumns;
    $[13] = children;
  } else children = $[13];
  let dialogElement;
  if ($[14] !== onCancel || $[15] !== title || $[16] !== children) {
    dialogElement = jsxProd_default(Dialog, {
      title,
      onCancel,
      color: "permission",
      isCancelActive: false,
      inputGuide,
      children,
    });
    $[14] = onCancel;
    $[15] = title;
    $[16] = children;
    $[17] = dialogElement;
  } else dialogElement = $[17];
  return dialogElement;
}
export { PermissionRuleInput };
