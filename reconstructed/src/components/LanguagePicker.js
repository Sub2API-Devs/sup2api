/**
 * components/LanguagePicker.tsx
 *
 * 回复/语音语言设置输入框（留空为默认英语）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LanguagePicker.tsx
 * pieces: chunk-9h8dr0qb.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { y } from "../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { re } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { TextInput } from "./TextInput.js";

//@ chunk-9h8dr0qb.js:10277-11300 fingerprint = LanguagePicker (0.822)
function LanguagePicker(t0) {
  let $ = w(13),
    { initialLanguage: initialLanguage, onComplete: onComplete, onCancel: onCancel } = t0,
    [D, E] = y(initialLanguage),
    [T, A] = y((initialLanguage ?? "").length),
    F;
  if ($[0] === MEMO_CACHE_SENTINEL) ((F = { context: "Settings" }), ($[0] = F));
  else F = $[0];
  useKeybinding("confirm:no", onCancel, F);
  let U;
  if ($[1] !== D || $[2] !== onComplete)
    ((U = function M() {
      let trimmed = D?.trim();
      onComplete(trimmed || void 0);
    }),
      ($[1] = D),
      ($[2] = onComplete),
      ($[3] = U));
  else U = $[3];
  let handleSubmit = U,
    B;
  if ($[4] === MEMO_CACHE_SENTINEL)
    ((B = e(Text, { children: "Enter your preferred response and voice language:" })), ($[4] = B));
  else B = $[4];
  let H;
  if ($[5] === MEMO_CACHE_SENTINEL) ((H = e(Text, { children: re.pointer })), ($[5] = H));
  else H = $[5];
  const t5 = D ?? "";
  let ee;
  if ($[6] !== T || $[7] !== handleSubmit || $[8] !== t5)
    ((ee = r(Box, {
      flexDirection: "row",
      gap: 1,
      children: [
        H,
        e(TextInput, {
          value: t5,
          onChange: E,
          onSubmit: handleSubmit,
          focus: !0,
          showCursor: !0,
          placeholder: `e.g., Japanese, \u65E5\u672C\u8A9E, Espa\xF1ol${re.ellipsis}`,
          columns: 60,
          cursorOffset: T,
          onChangeCursorOffset: A,
        }),
      ],
    })),
      ($[6] = T),
      ($[7] = handleSubmit),
      ($[8] = t5),
      ($[9] = ee));
  else ee = $[9];
  let ne;
  if ($[10] === MEMO_CACHE_SENTINEL)
    ((ne = e(Text, { dimColor: !0, children: "Leave empty for default (English)" })), ($[10] = ne));
  else ne = $[10];
  let V;
  if ($[11] !== ee)
    ((V = r(Box, { flexDirection: "column", gap: 1, children: [B, ee, ne] })), ($[11] = ee), ($[12] = V));
  else V = $[12];
  return V;
}

export { LanguagePicker };
