/**
 * components/ThinkingToggle.tsx
 *
 * /thinking 开关对话框：启用/禁用本会话的扩展思考。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ThinkingToggle.tsx
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useState } from "../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { stableEmptyObject } from "../utils/stableEmptyObject.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { AgentNavigationFooter } from "./agents/AgentNavigationFooter.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { Pane } from "./design-system/Pane.js";

//@ chunk-18hwfzwa.js:676084-676166 affinity
var THINKING_TOGGLE_TITLE = "Toggle thinking mode";
var THINKING_TOGGLE_DESCRIPTION = "Enable or disable thinking for this session.";
//@ chunk-18hwfzwa.js:676166-678371 fingerprint (2.1.88 match: ThinkingToggle, 0.819)
function ThinkingToggle(props) {
  let $ = useMemoCache(24);
  let { currentValue, onSelect, onCancel, isMidConversation } = props;
  let [confirmationPending, setConfirmationPending] = useState(null);
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = [
      {
        value: "true",
        label: "Enabled",
        description: "Claude will think before responding",
      },
      {
        value: "false",
        label: "Disabled",
        description: "Claude will respond without extended thinking",
      },
    ];
    $[0] = t1;
  } else t1 = $[0];
  let options = t1;
  let t2;
  if ($[1] !== confirmationPending || $[2] !== onCancel) {
    t2 = () => {
      if (confirmationPending !== null) setConfirmationPending(null);
      else onCancel();
    };
    $[1] = confirmationPending;
    $[2] = onCancel;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    t3 = {
      context: "Confirmation",
    };
    $[4] = t3;
  } else t3 = $[4];
  useKeybinding("confirm:no", t2, t3);
  let t4;
  if ($[5] !== confirmationPending || $[6] !== onSelect) {
    t4 = () => {
      if (confirmationPending !== null) onSelect(confirmationPending);
    };
    $[5] = confirmationPending;
    $[6] = onSelect;
    $[7] = t4;
  } else t4 = $[7];
  const isActive = confirmationPending !== null;
  let t6;
  if ($[8] !== isActive) {
    t6 = {
      context: "Confirmation",
      isActive,
    };
    $[8] = isActive;
    $[9] = t6;
  } else t6 = $[9];
  useKeybinding("confirm:yes", t4, t6);
  let t7;
  if ($[10] !== currentValue || $[11] !== isMidConversation || $[12] !== onSelect) {
    t7 = function handleSelectChange(value) {
      let selected = value === "true";
      if (isMidConversation && selected !== currentValue) setConfirmationPending(selected);
      else onSelect(selected);
    };
    $[10] = currentValue;
    $[11] = isMidConversation;
    $[12] = onSelect;
    $[13] = t7;
  } else t7 = $[13];
  let handleSelectChange = t7;
  let t8;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    t8 = stableEmptyObject(false);
    $[14] = t8;
  } else t8 = $[14];
  let hintOptions = t8;
  let bodyElement;
  if (
    $[15] !== confirmationPending ||
    $[16] !== currentValue ||
    $[17] !== handleSelectChange ||
    $[18] !== onCancel
  ) {
    bodyElement =
      confirmationPending !== null
        ? jsxProd_default_2(Box, {
            flexDirection: "column",
            marginBottom: 1,
            gap: 1,
            children: [
              jsxProd_default(Text, {
                color: "warning",
                children:
                  "Changing thinking mode mid-conversation will increase latency and may reduce quality. For best results, set this at the start of a session.",
              }),
              jsxProd_default(Text, {
                color: "warning",
                children: "Do you want to proceed?",
              }),
            ],
          })
        : jsxProd_default(Box, {
            flexDirection: "column",
            marginBottom: 1,
            children: jsxProd_default(ModelSelector, {
              defaultValue: currentValue ? "true" : "false",
              defaultFocusValue: currentValue ? "true" : "false",
              options,
              onChange: handleSelectChange,
              onCancel,
              visibleOptionCount: 2,
            }),
          });
    $[15] = confirmationPending;
    $[16] = currentValue;
    $[17] = handleSelectChange;
    $[18] = onCancel;
    $[19] = bodyElement;
  } else bodyElement = $[19];
  let body_ = bodyElement;
  let footerElement;
  if ($[20] === MEMO_CACHE_SENTINEL) {
    footerElement = jsxProd_default(AgentNavigationFooter, {
      italic: false,
      children: jsxProd_default_2(Byline, {
        children: [
          jsxProd_default(KeyboardShortcutHint, {
            chord: "enter",
            action: "confirm",
            ...hintOptions,
          }),
          jsxProd_default(ConfigurableShortcutHint, {
            action: "confirm:no",
            context: "Confirmation",
            fallback: "Esc",
            description: "cancel",
            ...hintOptions,
          }),
        ],
      }),
    });
    $[20] = footerElement;
  } else footerElement = $[20];
  let footer_ = footerElement;
  let headerElement;
  if ($[21] === MEMO_CACHE_SENTINEL) {
    headerElement = jsxProd_default_2(Box, {
      marginBottom: 1,
      flexDirection: "column",
      children: [
        jsxProd_default(Text, {
          color: "remember",
          bold: true,
          children: THINKING_TOGGLE_TITLE,
        }),
        jsxProd_default(Text, {
          dimColor: true,
          children: THINKING_TOGGLE_DESCRIPTION,
        }),
      ],
    });
    $[21] = headerElement;
  } else headerElement = $[21];
  let t11;
  if ($[22] !== body_) {
    t11 = jsxProd_default_2(Pane, {
      color: "permission",
      children: [
        jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [headerElement, body_],
        }),
        footer_,
      ],
    });
    $[22] = body_;
    $[23] = t11;
  } else t11 = $[23];
  return t11;
}
export { ThinkingToggle };
