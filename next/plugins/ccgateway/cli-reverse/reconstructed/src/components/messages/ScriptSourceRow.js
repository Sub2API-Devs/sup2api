/**
 * components/messages/ScriptSourceRow.tsx
 *
 * transcript 里的脚本源码行组件：按 ctrl+e 展开/折叠、格式化不可见字符、渲染工具名与摘要（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ypwc94ke.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useContext } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { SuggestionSlot, withScriptPrefix, getCode } from "../Messages.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { expandContextSignal } from "./expandContext.js";
import { useShortcutDisplay } from "../../keybindings/useShortcutDisplay.js";
import { useFrozenValue } from "../FreezeWhenOffscreen.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { safeParseToolInput } from "../../Tool.js";
import { countCharInString, plural, escapeControlChars } from "../../utils/stringUtils.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { isMouseTrackingEnabled } from "../../utils/fullscreen.js";
import { Box, Text } from "../../ink/components/Text.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ToolUseLoader } from "../ToolUseLoader.js";
import { TagTabs } from "../TagTabs.js";
import { MessageResponse } from "../MessageResponse.js";
import { HighlightedCode } from "../HighlightedCode.js";

//@ chunk-ypwc94ke.js:6400-6404 placement
init_react_production();
//@ chunk-ypwc94ke.js:6404-6573 placement
var CODE_INDENT = 6;
var CRLF_PATTERN = /\r\n?/g;
var LINE_SEPARATOR_PATTERN = /[\u2028\u2029]/g;
var INVISIBLE_CHAR_PATTERN = /[\p{Cs}\p{Co}\p{Cn}\u2800\u{E0020}-\u{E007F}]|(?!\u0020)\p{Zs}/gu;
var JOINER_RUN_PATTERN = /[\uFE0E\uFE0F\u200D]{2,}/g;
var LEADING_JOINER_PATTERN = /^[\uFE0E\uFE0F]?\u200D?/;
//@ chunk-ypwc94ke.js:6573-9066 placement
/**
 * 脚本源码行组件：按 ctrl+e 展开/折叠，转义不可见字符并渲染工具名与摘要。
 */
function ReplScriptToolUse(props) {
  let $ = useMemoCache(65);
  let { tool, toolUseId, input, toolLabel, output, shouldAnimate, isUnresolved, isError, addMargin } = props;
  let suggestions = useContext(SuggestionSlot);
  let { columns } = useTerminalSize();
  let expanded = useContext(expandContextSignal);
  let shortcutDisplay = useShortcutDisplay("transcript:toggleShowAll", "Transcript", "ctrl+e");
  let isShown;
  if ($[0] !== suggestions || $[1] !== toolUseId) {
    isShown = suggestions !== null && (suggestions.all || suggestions.keys.has(withScriptPrefix(toolUseId)));
    $[0] = suggestions;
    $[1] = toolUseId;
    $[2] = isShown;
  } else isShown = $[2];
  let [frozenShown, stableShown] = useFrozenValue(isShown);
  let TextComponent;
  let HeaderBox;
  let ContentBox;
  let hint;
  let lineCount;
  let scriptText;
  let earlyReturn;
  let summary;
  let flexDirection;
  let loader;
  let tag;
  let ref;
  let flexDirection_2;
  let marginTop;
  let width;
  if (
    $[3] !== addMargin ||
    $[4] !== suggestions ||
    $[5] !== frozenShown ||
    $[6] !== expanded ||
    $[7] !== input ||
    $[8] !== isError ||
    $[9] !== isUnresolved ||
    $[10] !== output ||
    $[11] !== shouldAnimate ||
    $[12] !== shortcutDisplay ||
    $[13] !== tool ||
    $[14] !== toolLabel
  ) {
    earlyReturn = EARLY_RETURN_SENTINEL;
    Qo: {
      let script = getCode(input);
      if (suggestions === null || script === undefined) {
        earlyReturn = null;
        break Qo;
      }
      let parsed = safeParseToolInput(tool, input);
      let parsedInput = parsed.success ? parsed.data : undefined;
      let useSummary = parsedInput === undefined ? null : (tool.getToolUseSummary?.(parsedInput) ?? null);
      scriptText = escapeInvisible(
        script
          .replace(
            CRLF_PATTERN,
            `
`,
          )
          .replace(
            LINE_SEPARATOR_PATTERN,
            `$&
`,
          ),
      ).trimEnd();
      lineCount =
        countCharInString(
          scriptText,
          `
`,
        ) + 1;
      let asyncDispatched;
      if ($[30] !== output) {
        asyncDispatched = isPlainObject(output) && output.asyncDispatched === true;
        $[30] = output;
        $[31] = asyncDispatched;
      } else asyncDispatched = $[31];
      let isLate = asyncDispatched;
      let expandHint;
      if ($[32] !== expanded || $[33] !== shortcutDisplay) {
        expandHint = !expanded
          ? shortcutDisplay && `${shortcutDisplay} to show`
          : isMouseTrackingEnabled() === "full"
            ? "click to show"
            : "[ to show";
        $[32] = expanded;
        $[33] = shortcutDisplay;
        $[34] = expandHint;
      } else expandHint = $[34];
      hint = expandHint;
      ContentBox = Box;
      ref = frozenShown;
      flexDirection_2 = "column";
      marginTop = addMargin ? 1 : 0;
      width = "100%";
      HeaderBox = Box;
      flexDirection = "row";
      const shouldAnimate_2 = shouldAnimate && !isLate;
      const isUnresolved_2 = isUnresolved || isLate;
      if ($[35] !== isError || $[36] !== shouldAnimate_2 || $[37] !== isUnresolved_2) {
        loader = jsxProd_default(ToolUseLoader, {
          shouldAnimate: shouldAnimate_2,
          isUnresolved: isUnresolved_2,
          isError,
        });
        $[35] = isError;
        $[36] = shouldAnimate_2;
        $[37] = isUnresolved_2;
        $[38] = loader;
      } else loader = $[38];
      tag = jsxProd_default(Box, {
        flexShrink: 0,
        children: jsxProd_default(TagTabs, {
          bold: true,
          wrap: "truncate-end",
          children: toolLabel ?? tool.userFacingName(parsedInput),
        }),
      });
      TextComponent = Text;
      summary = useSummary !== null && `(${escapeInvisible(useSummary)})`;
    }
    $[3] = addMargin;
    $[4] = suggestions;
    $[5] = frozenShown;
    $[6] = expanded;
    $[7] = input;
    $[8] = isError;
    $[9] = isUnresolved;
    $[10] = output;
    $[11] = shouldAnimate;
    $[12] = shortcutDisplay;
    $[13] = tool;
    $[14] = toolLabel;
    $[15] = TextComponent;
    $[16] = HeaderBox;
    $[17] = ContentBox;
    $[18] = hint;
    $[19] = lineCount;
    $[20] = scriptText;
    $[21] = earlyReturn;
    $[22] = summary;
    $[23] = flexDirection;
    $[24] = loader;
    $[25] = tag;
    $[26] = ref;
    $[27] = flexDirection_2;
    $[28] = marginTop;
    $[29] = width;
  } else {
    TextComponent = $[15];
    HeaderBox = $[16];
    ContentBox = $[17];
    hint = $[18];
    lineCount = $[19];
    scriptText = $[20];
    earlyReturn = $[21];
    summary = $[22];
    flexDirection = $[23];
    loader = $[24];
    tag = $[25];
    ref = $[26];
    flexDirection_2 = $[27];
    marginTop = $[28];
    width = $[29];
  }
  if (earlyReturn !== EARLY_RETURN_SENTINEL) return earlyReturn;
  let metaText;
  if ($[39] !== stableShown || $[40] !== hint || $[41] !== lineCount) {
    metaText =
      !stableShown &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [` \xB7 ${lineCount} ${plural(lineCount, "line")}`, hint && ` (${hint})`],
      });
    $[39] = stableShown;
    $[40] = hint;
    $[41] = lineCount;
    $[42] = metaText;
  } else metaText = $[42];
  let label;
  if ($[43] !== TextComponent || $[44] !== metaText || $[45] !== summary) {
    label = jsxProd_default_2(TextComponent, {
      children: [summary, metaText],
    });
    $[43] = TextComponent;
    $[44] = metaText;
    $[45] = summary;
    $[46] = label;
  } else label = $[46];
  let header;
  if (
    $[47] !== HeaderBox ||
    $[48] !== label ||
    $[49] !== flexDirection ||
    $[50] !== loader ||
    $[51] !== tag
  ) {
    header = jsxProd_default_2(HeaderBox, {
      flexDirection,
      children: [loader, tag, label],
    });
    $[47] = HeaderBox;
    $[48] = label;
    $[49] = flexDirection;
    $[50] = loader;
    $[51] = tag;
    $[52] = header;
  } else header = $[52];
  let code;
  if ($[53] !== columns || $[54] !== stableShown || $[55] !== scriptText) {
    code =
      stableShown &&
      jsxProd_default(MessageResponse, {
        children: jsxProd_default(HighlightedCode, {
          code: scriptText,
          filePath: "script.js",
          width: columns - CODE_INDENT,
          lineNumbers: false,
        }),
      });
    $[53] = columns;
    $[54] = stableShown;
    $[55] = scriptText;
    $[56] = code;
  } else code = $[56];
  let highlight;
  if (
    $[57] !== ContentBox ||
    $[58] !== header ||
    $[59] !== code ||
    $[60] !== ref ||
    $[61] !== flexDirection_2 ||
    $[62] !== marginTop ||
    $[63] !== width
  ) {
    highlight = jsxProd_default_2(ContentBox, {
      ref,
      flexDirection: flexDirection_2,
      marginTop,
      width,
      children: [header, code],
    });
    $[57] = ContentBox;
    $[58] = header;
    $[59] = code;
    $[60] = ref;
    $[61] = flexDirection_2;
    $[62] = marginTop;
    $[63] = width;
    $[64] = highlight;
  } else highlight = $[64];
  return highlight;
}
//@ chunk-ypwc94ke.js:9066-9123 placement
function escapeInvisible(text) {
  return escapeControlChars(text)
    .replace(INVISIBLE_CHAR_PATTERN, escapeCodePoint)
    .replace(JOINER_RUN_PATTERN, escapeJoinerRun);
}
//@ chunk-ypwc94ke.js:9123-9221 placement
function escapeJoinerRun(text) {
  let prefix = LEADING_JOINER_PATTERN.exec(text)?.[0] ?? "";
  return `${prefix}${Array.from(text.slice(prefix.length), escapeCodePoint).join("")}`;
}
//@ chunk-ypwc94ke.js:9221-9301 placement
function escapeCodePoint(codePoint) {
  return `\\u{${(codePoint.codePointAt(0) ?? 0).toString(16).toUpperCase()}}`;
}
export { ReplScriptToolUse };
