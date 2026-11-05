/**
 * screens/repl/copySessionDialog.tsx
 *
 * “把会话复制到新账号”的确认对话框：说明会共享历史与读过的文件，给出继续/返回（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useState } from "../../../vendor/react/cjs/react.production.js";
import { useRecentInputWithin } from "../../components/CustomSelect/selectTypeahead.js";
import { RECENT_INPUT_GUARD_MS as RECENT_INPUT_GUARD_MS_3 } from "../../hooks/useRecentInputGuard.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { ConfirmSelect, CONFIRM_ARM_DELAY_MS } from "../../components/design-system/ConfirmSelect.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";

//@ chunk-czq1j3j2.js:350725-353377 placement
/**
 * “把会话复制到新账号”对话框：确认、说明会共享历史与读过的文件、给出继续/返回按钮。
 */
function SessionOwnerDialog(props) {
  let $ = useMemoCache(39);
  let { started, now, onChoice } = props;
  let [isCopied, setCopied] = useState(false);
  let refuseInput = useRecentInputWithin(RECENT_INPUT_GUARD_MS_3);
  let onChange;
  if ($[0] !== refuseInput || $[1] !== onChoice) {
    onChange = function handleChoice(choice) {
      if (refuseInput()) {
        return;
      }
      if (choice === "copy") {
        setCopied(true);
        return;
      }
      onChoice(choice);
    };
    $[0] = refuseInput;
    $[1] = onChoice;
    $[2] = onChange;
  } else onChange = $[2];
  let onChangeStable = onChange;
  if (isCopied) {
    const title = `Copy this session to ${now}?`;
    let onCancel;
    if ($[3] === MEMO_CACHE_SENTINEL) {
      onCancel = () => setCopied(false);
      $[3] = onCancel;
    } else onCancel = $[3];
    let copiedText;
    if ($[4] === MEMO_CACHE_SENTINEL) {
      copiedText = jsxProd_default(Text, {
        wrap: "wrap",
        children:
          "Continuing this conversation in a new account shares its history, including the files that Claude read, with that account.",
      });
      $[4] = copiedText;
    } else copiedText = $[4];
    let onConfirm;
    if ($[5] !== onChoice) {
      onConfirm = () => onChoice("copy");
      $[5] = onChoice;
      $[6] = onConfirm;
    } else onConfirm = $[6];
    let onCancel_2;
    if ($[7] === MEMO_CACHE_SENTINEL) {
      onCancel_2 = () => setCopied(false);
      $[7] = onCancel_2;
    } else onCancel_2 = $[7];
    let children;
    if ($[8] !== onConfirm) {
      children = jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        marginBottom: 1,
        children: [
          copiedText,
          jsxProd_default(ConfirmSelect, {
            confirmLabel: "Continue",
            cancelLabel: "Go Back",
            focus: "cancel",
            hideIndexes: true,
            disablePrintableKeybindings: true,
            armAfterMs: CONFIRM_ARM_DELAY_MS,
            onConfirm,
            onCancel: onCancel_2,
          }),
        ],
      });
      $[8] = onConfirm;
      $[9] = children;
    } else children = $[9];
    let copiedDialog;
    if ($[10] !== title || $[11] !== children) {
      copiedDialog = jsxProd_default(Dialog, {
        title,
        color: "warning",
        onCancel,
        children,
      });
      $[10] = title;
      $[11] = children;
      $[12] = copiedDialog;
    } else copiedDialog = $[12];
    return copiedDialog;
  }
  let onCancel;
  if ($[13] !== onChangeStable) {
    onCancel = () => onChangeStable("exit");
    $[13] = onChangeStable;
    $[14] = onCancel;
  } else onCancel = $[14];
  let inputGuide;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "confirm",
        }),
        jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "exit",
        }),
      ],
    });
    $[15] = inputGuide;
  } else inputGuide = $[15];
  let startedLabel;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    startedLabel = jsxProd_default(Text, {
      dimColor: true,
      children: "Started as    ",
    });
    $[16] = startedLabel;
  } else startedLabel = $[16];
  const startedAccount = started ?? "another account";
  let startedRow;
  if ($[17] !== startedAccount) {
    startedRow = jsxProd_default_2(Text, {
      children: [startedLabel, startedAccount],
    });
    $[17] = startedAccount;
    $[18] = startedRow;
  } else startedRow = $[18];
  let loggedInLabel;
  if ($[19] === MEMO_CACHE_SENTINEL) {
    loggedInLabel = jsxProd_default(Text, {
      dimColor: true,
      children: "Logged in as  ",
    });
    $[19] = loggedInLabel;
  } else loggedInLabel = $[19];
  let loggedInRow;
  if ($[20] !== now) {
    loggedInRow = jsxProd_default_2(Text, {
      children: [loggedInLabel, now],
    });
    $[20] = now;
    $[21] = loggedInRow;
  } else loggedInRow = $[21];
  let accountsBox;
  if ($[22] !== startedRow || $[23] !== loggedInRow) {
    accountsBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [startedRow, loggedInRow],
    });
    $[22] = startedRow;
    $[23] = loggedInRow;
    $[24] = accountsBox;
  } else accountsBox = $[24];
  let exitOption;
  let loginOption;
  if ($[25] === MEMO_CACHE_SENTINEL) {
    exitOption = {
      label: "Exit Claude Code",
      value: "exit",
    };
    loginOption = {
      label: "Change login",
      value: "login",
    };
    $[25] = exitOption;
    $[26] = loginOption;
  } else {
    exitOption = $[25];
    loginOption = $[26];
  }
  const label = `Copy to ${now} and continue`;
  let options;
  if ($[27] !== label) {
    options = [
      exitOption,
      loginOption,
      {
        label,
        value: "copy",
      },
    ];
    $[27] = label;
    $[28] = options;
  } else options = $[28];
  let selector;
  if ($[29] !== onChangeStable || $[30] !== refuseInput || $[31] !== options) {
    selector = jsxProd_default(ModelSelector, {
      options,
      onChange: onChangeStable,
      refuseInput,
    });
    $[29] = onChangeStable;
    $[30] = refuseInput;
    $[31] = options;
    $[32] = selector;
  } else selector = $[32];
  let children;
  if ($[33] !== selector || $[34] !== accountsBox) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      marginBottom: 1,
      children: [accountsBox, selector],
    });
    $[33] = selector;
    $[34] = accountsBox;
    $[35] = children;
  } else children = $[35];
  let dialog;
  if ($[36] !== children || $[37] !== onCancel) {
    dialog = jsxProd_default(Dialog, {
      title: "This session belongs to another account",
      color: "warning",
      onCancel,
      inputGuide,
      children,
    });
    $[36] = children;
    $[37] = onCancel;
    $[38] = dialog;
  } else dialog = $[38];
  return dialog;
}
export { SessionOwnerDialog };
