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
import { useEditorMode } from "../../utils/subagentStatusLine.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { TextInput } from "../TextInput.js";

//@ chunk-18hwfzwa.js:813854-813870 file-last-pair
function noop_4() {}
//@ chunk-18hwfzwa.js:813870-814630 fingerprint = HistorySearchInput (0.91)
function HistorySearchInput(props) {
  let $ = w(13);
  let { value, onChange, historyFailedMatch } = props;
  let editorMode = useEditorMode();
  const children = historyFailedMatch ? "no matching prompt:" : "search prompts:";
  let Be;
  if ($[0] !== children) {
    Be = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[0] = children;
    $[1] = Be;
  } else Be = $[1];
  const cursorOffset = value.length;
  const columns = bunStringWidth(value) + 1;
  let ze;
  if ($[2] !== onChange || $[3] !== columns || $[4] !== value) {
    ze = jsxProd_default(TextInput, {
      value,
      onChange,
      cursorOffset,
      onChangeCursorOffset: noop_4,
      columns,
      focus: true,
      showCursor: true,
      multiline: false,
      dimColor: true,
    });
    $[2] = onChange;
    $[3] = columns;
    $[4] = value;
    $[5] = ze;
  } else ze = $[5];
  let Xe;
  if ($[6] !== value || $[7] !== editorMode) {
    Xe =
      editorMode &&
      value === "" &&
      jsxProd_default(Text, {
        dimColor: true,
        children: "esc i / for slash commands",
      });
    $[6] = value;
    $[7] = editorMode;
    $[8] = Xe;
  } else Xe = $[8];
  let rt;
  if ($[9] !== Be || $[10] !== ze || $[11] !== Xe) {
    rt = jsxProd_default_2(Box, {
      gap: 1,
      children: [Be, ze, Xe],
    });
    $[9] = Be;
    $[10] = ze;
    $[11] = Xe;
    $[12] = rt;
  } else rt = $[12];
  return rt;
}
export { HistorySearchInput };
