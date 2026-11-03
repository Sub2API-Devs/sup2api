/**
 * components/PromptInput/HistorySearchInput.tsx
 *
 * 输入框内联的历史搜索行（"search prompts:" / "no matching prompt:"）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/HistorySearchInput.tsx
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: file-last-pair 1, fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Cg } from "../../utils/subagentStatusLine.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { TextInput } from "../TextInput.js";

//@ chunk-18hwfzwa.js:813854-813870 file-last-pair
function noop_4() {}
//@ chunk-18hwfzwa.js:813870-814630 fingerprint = HistorySearchInput (0.91)
function HistorySearchInput(t0) {
  let $ = w(13),
    { value: value, onChange: onChange, historyFailedMatch: historyFailedMatch } = t0,
    ee = Cg();
  const t1 = historyFailedMatch ? "no matching prompt:" : "search prompts:";
  let Be;
  if ($[0] !== t1) ((Be = e(Text, { dimColor: !0, children: t1 })), ($[0] = t1), ($[1] = Be));
  else Be = $[1];
  const He = value.length,
    t3 = bunStringWidth(value) + 1;
  let ze;
  if ($[2] !== onChange || $[3] !== t3 || $[4] !== value)
    ((ze = e(TextInput, {
      value: value,
      onChange: onChange,
      cursorOffset: He,
      onChangeCursorOffset: noop_4,
      columns: t3,
      focus: !0,
      showCursor: !0,
      multiline: !1,
      dimColor: !0,
    })),
      ($[2] = onChange),
      ($[3] = t3),
      ($[4] = value),
      ($[5] = ze));
  else ze = $[5];
  let Xe;
  if ($[6] !== value || $[7] !== ee)
    ((Xe = ee && value === "" && e(Text, { dimColor: !0, children: "esc i / for slash commands" })),
      ($[6] = value),
      ($[7] = ee),
      ($[8] = Xe));
  else Xe = $[8];
  let rt;
  if ($[9] !== Be || $[10] !== ze || $[11] !== Xe)
    ((rt = r(Box, { gap: 1, children: [Be, ze, Xe] })),
      ($[9] = Be),
      ($[10] = ze),
      ($[11] = Xe),
      ($[12] = rt));
  else rt = $[12];
  return rt;
}

export { HistorySearchInput };
