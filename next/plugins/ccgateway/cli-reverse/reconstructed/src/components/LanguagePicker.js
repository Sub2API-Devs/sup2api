/**
 * components/LanguagePicker.tsx
 *
 * 回复/语音语言设置输入框（留空为默认英语）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LanguagePicker.tsx
 * pieces: chunk-j6tt9nsa.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useState } from "../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { TextInput } from "./TextInput.js";

//@ chunk-j6tt9nsa.js:10262-11278 fingerprint (2.1.88 match: LanguagePicker, 0.822)
function LanguagePicker(props) {
  let $ = useMemoCache(13);
  let { initialLanguage, onComplete, onCancel } = props;
  let [language, setLanguage] = useState(initialLanguage);
  let [cursorOffset, setCursorOffset] = useState((initialLanguage ?? "").length);
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = {
      context: "Settings",
    };
    $[0] = t1;
  } else t1 = $[0];
  useKeybinding("confirm:no", onCancel, t1);
  let t2;
  if ($[1] !== language || $[2] !== onComplete) {
    t2 = function handleSubmit() {
      let trimmed = language?.trim();
      onComplete(trimmed || undefined);
    };
    $[1] = language;
    $[2] = onComplete;
    $[3] = t2;
  } else t2 = $[3];
  let handleSubmit = t2;
  let t3;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    t3 = jsxProd_default(Text, {
      children: "Enter your preferred response and voice language:",
    });
    $[4] = t3;
  } else t3 = $[4];
  let t4;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    t4 = jsxProd_default(Text, {
      children: figures_default.pointer,
    });
    $[5] = t4;
  } else t4 = $[5];
  const value = language ?? "";
  let t6;
  if ($[6] !== cursorOffset || $[7] !== handleSubmit || $[8] !== value) {
    t6 = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 1,
      children: [
        t4,
        jsxProd_default(TextInput, {
          value,
          onChange: setLanguage,
          onSubmit: handleSubmit,
          focus: true,
          showCursor: true,
          placeholder: `e.g., Japanese, \u65E5\u672C\u8A9E, Espa\xF1ol${figures_default.ellipsis}`,
          columns: 60,
          cursorOffset,
          onChangeCursorOffset: setCursorOffset,
        }),
      ],
    });
    $[6] = cursorOffset;
    $[7] = handleSubmit;
    $[8] = value;
    $[9] = t6;
  } else t6 = $[9];
  let t7;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    t7 = jsxProd_default(Text, {
      dimColor: true,
      children: "Leave empty for default (English)",
    });
    $[10] = t7;
  } else t7 = $[10];
  let t8;
  if ($[11] !== t6) {
    t8 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [t3, t6, t7],
    });
    $[11] = t6;
    $[12] = t8;
  } else t8 = $[12];
  return t8;
}
export { LanguagePicker };
