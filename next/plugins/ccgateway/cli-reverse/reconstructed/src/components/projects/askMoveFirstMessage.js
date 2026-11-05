/**
 * components/projects/askMoveFirstMessage.tsx
 *
 * “把这次会话移到云端”对话框：输入下一条消息并确认（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-cn14725t.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useRef, useState } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Text, Box } from "../../ink/components/Text.js";
import { TextInput } from "../TextInput.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Dialog } from "../design-system/Dialog.js";
import { showSetupDialog } from "../../interactiveHelpers.js";

//@ chunk-cn14725t.js:20738-20742 placement
init_react_production();
//@ chunk-cn14725t.js:20742-22090 placement
/**
 * “把这次会话移到云端”对话框：输入下一条消息，Enter 提交、Esc 放弃。
 */
function MoveToCloudDialog(props) {
  let $ = useMemoCache(21);
  let { onDone } = props;
  let doneRef = useRef(false);
  let finishOnce;
  if ($[0] !== onDone) {
    finishOnce = (value) => {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone(value);
      }
    };
    $[0] = onDone;
    $[1] = finishOnce;
  } else finishOnce = $[1];
  let done = finishOnce;
  let [text, setText] = useState("");
  let [cursorOffset, setCursorOffset] = useState(0);
  let { columns } = useTerminalSize();
  let cancel;
  if ($[2] !== done) {
    cancel = () => done(undefined);
    $[2] = done;
    $[3] = cancel;
  } else cancel = $[3];
  let keybindingContext;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    keybindingContext = {
      context: "Settings",
    };
    $[4] = keybindingContext;
  } else keybindingContext = $[4];
  useKeybinding("confirm:no", cancel, keybindingContext);
  let onCancel;
  if ($[5] !== done) {
    onCancel = () => done(undefined);
    $[5] = done;
    $[6] = onCancel;
  } else onCancel = $[6];
  let inputGuide;
  let prompt;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "start the cloud session",
        }),
        jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "leave without moving it",
        }),
      ],
    });
    prompt = jsxProd_default(Text, {
      children: "What should Claude do next? The cloud session starts when you send this.",
    });
    $[7] = inputGuide;
    $[8] = prompt;
  } else {
    inputGuide = $[7];
    prompt = $[8];
  }
  let onSubmit;
  let onExit;
  if ($[9] !== done) {
    onSubmit = (submitted) => {
      if (submitted.trim() !== "") done(submitted.trim());
    };
    onExit = () => done(undefined);
    $[9] = done;
    $[10] = onSubmit;
    $[11] = onExit;
  } else {
    onSubmit = $[10];
    onExit = $[11];
  }
  const columns_2 = columns - 6;
  let input;
  if (
    $[12] !== cursorOffset ||
    $[13] !== onSubmit ||
    $[14] !== onExit ||
    $[15] !== columns_2 ||
    $[16] !== text
  ) {
    input = jsxProd_default(Box, {
      borderDimColor: true,
      borderStyle: "round",
      marginY: 1,
      paddingLeft: 1,
      children: jsxProd_default(TextInput, {
        showCursor: true,
        focus: true,
        value: text,
        onChange: setText,
        onSubmit,
        onExit,
        placeholder: `Your next message${figures_default.ellipsis}`,
        columns: columns_2,
        cursorOffset,
        onChangeCursorOffset: setCursorOffset,
      }),
    });
    $[12] = cursorOffset;
    $[13] = onSubmit;
    $[14] = onExit;
    $[15] = columns_2;
    $[16] = text;
    $[17] = input;
  } else input = $[17];
  let dialog;
  if ($[18] !== input || $[19] !== onCancel) {
    dialog = jsxProd_default_2(Dialog, {
      title: "Move this session to the cloud",
      onCancel,
      color: "permission",
      isCancelActive: false,
      inputGuide,
      children: [prompt, input],
    });
    $[18] = input;
    $[19] = onCancel;
    $[20] = dialog;
  } else dialog = $[20];
  return dialog;
}
//@ chunk-cn14725t.js:22090-22140 placement
/**
 * 以交互方式问用户云端会话要做的第一件事。
 */
function showMoveToCloudDialog(context) {
  return showSetupDialog(context, (onDone) =>
    jsxProd_default(MoveToCloudDialog, {
      onDone,
    }),
  );
}
export { showMoveToCloudDialog };
