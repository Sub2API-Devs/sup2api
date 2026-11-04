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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
  let $ = useMemoCache(13);
  let { value, onChange, historyFailedMatch } = props;
  let editorMode = useEditorMode();
  const children = historyFailedMatch ? "no matching prompt:" : "search prompts:";
  let labelElement;
  if ($[0] !== children) {
    labelElement = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[0] = children;
    $[1] = labelElement;
  } else labelElement = $[1];
  const cursorOffset = value.length;
  const columns = bunStringWidth(value) + 1;
  let searchInput;
  if ($[2] !== onChange || $[3] !== columns || $[4] !== value) {
    searchInput = jsxProd_default(TextInput, {
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
    $[5] = searchInput;
  } else searchInput = $[5];
  let editorHint;
  if ($[6] !== value || $[7] !== editorMode) {
    editorHint =
      editorMode &&
      value === "" &&
      jsxProd_default(Text, {
        dimColor: true,
        children: "esc i / for slash commands",
      });
    $[6] = value;
    $[7] = editorMode;
    $[8] = editorHint;
  } else editorHint = $[8];
  let rowElement;
  if ($[9] !== labelElement || $[10] !== searchInput || $[11] !== editorHint) {
    rowElement = jsxProd_default_2(Box, {
      gap: 1,
      children: [labelElement, searchInput, editorHint],
    });
    $[9] = labelElement;
    $[10] = searchInput;
    $[11] = editorHint;
    $[12] = rowElement;
  } else rowElement = $[12];
  return rowElement;
}
export { HistorySearchInput };
