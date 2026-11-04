/**
 * components/pluginUi/render/elements.tsx
 *
 * 2.1.316 新增。插件 ui.render 的基础元素组件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bc20zedk.js (52)
 * attribution: placement 52
 */
import {
  init_react_production,
  useRef,
  useContext,
  useEffect,
  createContext,
  useState,
  createElement,
} from "../../../../vendor/react/cjs/react.production.js";
import { truncateToWidth } from "../../../utils/format.js";
import { drawnText, codeHunks } from "../../../plugins/functionHooks/ui/validateTree.js";
import { convertHunkLeadingTabs } from "../../../utils/diff.js";
import { computeGutterWidth } from "../../StructuredDiff.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { measureElement } from "../../../ink/hooks/useTerminalHooks.js";
import { useMeasured } from "../../../ink/components/Input.js";
import { BodyColumns, ClickedPress } from "./actionKeys.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { StructuredDiffList } from "../../StructuredDiffList.js";
import { HighlightedCode } from "../../HighlightedCode.js";
import { heldRenderInput } from "../../../plugins/functionHooks/ui/renderDispatch.js";
import { getPluginRegistry } from "../../../utils/plugins/pluginLoadState.js";
import { hoverScopeKey } from "../../../plugins/functionHooks/ui/elements.js";
import { useStoreSelector } from "../../../hooks/useStoreSelector.js";
import { paneColorOf } from "../../../plugins/functionHooks/panes.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { supportsShiftEnter } from "../../../commands/terminalSetup/terminalSetup.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { usePreDispatchKeyHandler } from "../../../keybindings/useActionHandlers.js";
import { needsShiftWorkaround } from "../../../hooks/useTextInput.js";
import { TextInput } from "../../TextInput.js";
import { checkAgentDescriptions } from "../../../utils/markdownHeadings.js";
import { TOTAL_BUDGET_BYTES } from "../../../utils/highlight/boundedHighlight.js";
import { canonicalLanguageName } from "../../../utils/highlight/pluginLanguages.js";
import { sequential } from "../../../utils/sequential.js";
import { formatTokenWindowed } from "../../../utils/markdown.js";
import { plural } from "../../../utils/stringUtils.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-bc20zedk.js:6145-6149 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:6145", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:6149-6176 placement
var rulerCut = (text, columns) => truncateToWidth(drawnText(text), columns);
//@ chunk-bc20zedk.js:6176-6303 placement
var clippedHunks = (hunks, columns) =>
  convertHunkLeadingTabs(hunks).map((hunk) => {
    let max = Math.max(1, columns - computeGutterWidth(hunk));
    return {
      ...hunk,
      lines: hunk.lines.map((line) => line.slice(0, 1) + rulerCut(line.slice(1), max)),
    };
  });
//@ chunk-bc20zedk.js:6303-6457 placement
function clippedLines(source, columns, startLine) {
  let lines = source.replace(/\n$/, "").split(`
`);
  let max = Math.max(
    1,
    columns - (startLine !== undefined ? String(startLine + lines.length - 1).length + 2 : 0),
  );
  return lines.map((line) => rulerCut(line, max)).join(`
`);
}
//@ chunk-bc20zedk.js:6457-6461 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:6457", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:6461-6471 placement
var DEFAULT_COLUMNS = 80;
//@ chunk-bc20zedk.js:6471-6532 placement
var highlightPath = ({ language, path }) => (language === undefined ? (path ?? "") : `source.${language}`);
//@ chunk-bc20zedk.js:6532-7486 placement
function CodeBlock(props) {
  let $ = useMemoCache(21);
  let { source, startLine, format, wrap } = props;
  let containerRef = useRef(null);
  let measureWidth;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    measureWidth = () => (containerRef.current ? Math.floor(measureElement(containerRef.current).width) : 0);
    $[0] = measureWidth;
  } else measureWidth = $[0];
  let measured = useMeasured(measureWidth);
  let bodyColumns = useContext(BodyColumns) ?? 0;
  let columns = bodyColumns > 0 ? bodyColumns : DEFAULT_COLUMNS;
  let effectiveWidth = measured > 0 ? measured : columns;
  let filePath;
  if ($[1] !== props) {
    filePath = highlightPath(props);
    $[1] = props;
    $[2] = filePath;
  } else filePath = $[2];
  let filePath_2 = filePath;
  let isTruncateEnd = wrap === "truncate-end";
  let codeResult;
  if ($[3] !== format || $[4] !== source) {
    codeResult = codeHunks(source, format);
    $[3] = format;
    $[4] = source;
    $[5] = codeResult;
  } else codeResult = $[5];
  let codeResultValue = codeResult;
  let hunks = codeResultValue?.kind === "hunks" ? codeResultValue.hunks : undefined;
  let fittedHunks;
  if ($[6] !== effectiveWidth || $[7] !== isTruncateEnd || $[8] !== hunks) {
    fittedHunks =
      hunks && (isTruncateEnd ? clippedHunks(hunks, effectiveWidth) : convertHunkLeadingTabs(hunks));
    $[6] = effectiveWidth;
    $[7] = isTruncateEnd;
    $[8] = hunks;
    $[9] = fittedHunks;
  } else fittedHunks = $[9];
  let fittedHunkList = fittedHunks;
  let codeText;
  if ($[10] !== effectiveWidth || $[11] !== isTruncateEnd || $[12] !== source || $[13] !== startLine) {
    codeText = isTruncateEnd ? clippedLines(source, effectiveWidth, startLine) : source;
    $[10] = effectiveWidth;
    $[11] = isTruncateEnd;
    $[12] = source;
    $[13] = startLine;
    $[14] = codeText;
  } else codeText = $[14];
  let code = codeText;
  let boxElement;
  if (
    $[15] !== code ||
    $[16] !== effectiveWidth ||
    $[17] !== filePath_2 ||
    $[18] !== fittedHunkList ||
    $[19] !== startLine
  ) {
    boxElement = jsxProd_default(Box, {
      ref: containerRef,
      flexDirection: "column",
      flexGrow: 1,
      flexShrink: 1,
      children: fittedHunkList
        ? jsxProd_default(StructuredDiffList, {
            hunks: fittedHunkList,
            dim: false,
            width: effectiveWidth,
            filePath: filePath_2,
            firstLine: null,
          })
        : jsxProd_default(HighlightedCode, {
            code,
            filePath: filePath_2,
            width: effectiveWidth,
            startLine,
            lineNumbers: startLine !== undefined,
          }),
    });
    $[15] = code;
    $[16] = effectiveWidth;
    $[17] = filePath_2;
    $[18] = fittedHunkList;
    $[19] = startLine;
    $[20] = boxElement;
  } else boxElement = $[20];
  return boxElement;
}
//@ chunk-bc20zedk.js:7486-7569 placement
function heldFor(tree, renderTree, fallback) {
  let held = heldRenderInput(tree, renderTree);
  return held !== undefined && held.component === fallback.component ? held : fallback;
}
//@ chunk-bc20zedk.js:7569-7573 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:7569", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:7573-7601 placement
var hoverGroupsStore = () => getPluginRegistry().hoverGroups;
//@ chunk-bc20zedk.js:7601-7708 placement
var adjustHoverGroup = (scopeKey, delta) =>
  hoverGroupsStore().setState((groups) => {
    let nextCount = (groups.get(scopeKey) ?? 0) + delta;
    let next = new Map(groups);
    if (nextCount > 0) next.set(scopeKey, nextCount);
    else next.delete(scopeKey);
    return next;
  });
//@ chunk-bc20zedk.js:7708-7902 placement
function groupMember() {
  let scopeKey;
  function enter(key) {
    if (key !== undefined && scopeKey === undefined) {
      scopeKey = key;
      adjustHoverGroup(key, 1);
    }
  }
  function leave() {
    let current = scopeKey;
    if (current !== undefined) {
      scopeKey = undefined;
      adjustHoverGroup(current, -1);
    }
  }
  return {
    enter,
    leave,
    regroup: (nextKey) => {
      if (scopeKey !== undefined && scopeKey !== nextKey) {
        leave();
        enter(nextKey);
      }
    },
  };
}
//@ chunk-bc20zedk.js:7902-7990 placement
function groupOf(plugin, hover) {
  let scope = hover?.scope;
  return plugin !== undefined && scope !== undefined
    ? {
        plugin,
        scope,
      }
    : undefined;
}
//@ chunk-bc20zedk.js:7990-8034 placement
function hoverOverridesOf(overrides) {
  let { scope, ...rest } = overrides;
  return rest;
}
//@ chunk-bc20zedk.js:8034-8038 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:8034", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:8038-8293 placement
function useHoverGroup(scope, options) {
  let scopeKey = scope && hoverScopeKey(scope);
  let isHot =
    useStoreSelector(
      scopeKey === undefined ? null : hoverGroupsStore(),
      (groups) => scopeKey !== undefined && (groups.get(scopeKey) ?? 0) > 0,
    ) ?? false;
  let memberRef = useRef(null);
  memberRef.current ??= groupMember();
  let member = memberRef.current;
  useEffect(() => {
    member.regroup(scopeKey);
  }, [member, scopeKey]);
  useEffect(() => member.leave, [member, options]);
  return {
    isHot,
    onMouseEnter: () => member.enter(scopeKey),
    onMouseLeave: member.leave,
  };
}
//@ chunk-bc20zedk.js:8293-8297 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:8293", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:8297-8346 placement
var HEX_COLOR_PROPS = ["color", "backgroundColor", "borderColor"];
//@ chunk-bc20zedk.js:8346-8486 placement
function withHexColors(style) {
  if (!style) return null;
  let resolved = {
    ...style,
  };
  for (let key of HEX_COLOR_PROPS) {
    let value = resolved[key];
    let paneColor = typeof value === "string" ? paneColorOf(value) : undefined;
    if (paneColor !== undefined) resolved[key] = paneColor;
  }
  return resolved;
}
//@ chunk-bc20zedk.js:8486-8490 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:8486", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:8490-8504 placement
var ScopeHovered; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:8490", () => {
  ScopeHovered = createContext(false);
});
//@ chunk-bc20zedk.js:8504-8719 placement
function useHoverLit(group, overrides, elementKind) {
  let scopeHovered = useContext(ScopeHovered);
  let hoverGroup = useHoverGroup(group, elementKind);
  let overrides_2 =
    (group ? hoverGroup.isHot : scopeHovered) && overrides
      ? (withHexColors(hoverOverridesOf(overrides)) ?? {})
      : {};
  return group
    ? {
        overrides: overrides_2,
        handlers: {
          onMouseEnter: hoverGroup.onMouseEnter,
          onMouseLeave: hoverGroup.onMouseLeave,
          hoverFollowsPaint: true,
        },
      }
    : {
        overrides: overrides_2,
        handlers: {},
      };
}
//@ chunk-bc20zedk.js:8719-9047 placement
function HoverScope({ isLive, elementKey, layout, hover, group, children }) {
  let [isHovered, setIsHovered] = useState(false);
  let hoverGroup = useHoverGroup(group, "Box");
  let isScopeHovered = isLive && isHovered;
  let boxLayout =
    hover !== undefined && (group ? hoverGroup.isHot : isScopeHovered)
      ? {
          ...layout,
          ...hoverOverridesOf(hover),
        }
      : layout;
  return createElement(
    ScopeHovered.Provider,
    {
      value: isScopeHovered,
    },
    createElement(
      Box,
      {
        ...withHexColors(boxLayout),
        elementKey,
        hoverFollowsPaint: true,
        onMouseEnter: () => {
          setIsHovered(true);
          hoverGroup.onMouseEnter();
        },
        onMouseLeave: () => {
          setIsHovered(false);
          hoverGroup.onMouseLeave();
        },
      },
      ...children,
    ),
  );
}
//@ chunk-bc20zedk.js:9047-9051 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:9047", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:9051-9211 placement
function HoverStyled({ isInline, props, hover, group, children }) {
  let elementKind = isInline ? "Text" : "Box";
  let { overrides, handlers } = useHoverLit(group, hover, elementKind);
  return createElement(
    isInline ? Text : Box,
    {
      ...withHexColors(props),
      ...overrides,
      ...handlers,
    },
    ...children,
  );
}
//@ chunk-bc20zedk.js:9211-9221 placement
var FIELD_MIN_COLUMNS = 12;
//@ chunk-bc20zedk.js:9221-9225 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:9221", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:9225-9229 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:9225", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:9229-9246 placement
var InputFields; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:9229", () => {
  InputFields = createContext(null);
});
//@ chunk-bc20zedk.js:9246-9250 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:9246", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:9250-9267 placement
var SiteColumns; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:9250", () => {
  SiteColumns = createContext(null);
});
//@ chunk-bc20zedk.js:9267-9271 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:9267", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:9271-9288 placement
var SiteRows; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:9271", () => {
  SiteRows = createContext(null);
});
//@ chunk-bc20zedk.js:9288-9292 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:9288", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:9292-9411 placement
var focusClick = (press) => (event) => {
  let isSuppressedClick = event.isWindowActivation || event.droppedAsStray;
  if (event.hyperlinkUrl !== undefined) event.allowDefault();
  if (!isSuppressedClick) press();
};
//@ chunk-bc20zedk.js:9411-9415 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:9411", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:9415-9432 placement
var FocusedNode; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:9415", () => {
  FocusedNode = createContext(null);
});
//@ chunk-bc20zedk.js:9432-9436 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:9432", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:9436-9453 placement
var FocusedPress; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:9436", () => {
  FocusedPress = createContext(null);
});
//@ chunk-bc20zedk.js:9453-9661 placement
function useSiteFocus(props) {
  let { plugin, handle } = props;
  let focusedPress = useContext(FocusedPress);
  let focusedNode = useContext(FocusedNode);
  let clickedPress = useContext(ClickedPress);
  let hasKeyboardFocus =
    focusedPress !== null && focusedPress.plugin === plugin && focusedPress.handle === handle;
  return {
    hasKeyboardFocus,
    ref: hasKeyboardFocus ? (focusedNode ?? undefined) : undefined,
    onClick: clickedPress
      ? focusClick(() =>
          clickedPress({
            plugin,
            handle,
          }),
        )
      : undefined,
  };
}
//@ chunk-bc20zedk.js:9661-11053 placement
function InputField(props) {
  let { plugin, handle, element, placeholder } = props;
  let siteFocus = useSiteFocus({
    plugin,
    handle,
  });
  let inputFields = useContext(InputFields);
  let terminalSize = useTerminalSize();
  let siteColumns = useContext(SiteColumns) ?? terminalSize.columns;
  let fieldText = inputFields?.textOf(plugin, element) ?? props.value ?? "";
  let [cursorOffset, setCursorOffset] = useState(fieldText.length);
  let min = Math.min(props.rows ?? 1, useContext(SiteRows) ?? terminalSize.rows);
  let isMultiline = min > 1;
  let labelPrefix = props.label === undefined ? "" : `${props.label}: `;
  let hasKeyboardFocus = inputFields !== null && siteFocus.hasKeyboardFocus;
  let submitHint = ` \u23CE ${props.submitLabel ?? "submit"}`;
  let fullHint =
    isMultiline && hasKeyboardFocus
      ? `${submitHint} \xB7 ${supportsShiftEnter() ? "shift+\u23CE" : "\\\u23CE"} new line`
      : submitHint;
  let inputColumns = siteColumns - bunStringWidth(labelPrefix);
  let hint = inputColumns - bunStringWidth(fullHint) >= siteColumns / 2 ? fullHint : submitHint;
  let min_2 = Math.min(cursorOffset, fieldText.length);
  useEffect(() => {
    if (hasKeyboardFocus) setCursorOffset(Number.MAX_SAFE_INTEGER);
  }, [hasKeyboardFocus]);
  usePreDispatchKeyHandler(
    (input, key) => {
      let isBackslashContinuation = fieldText[min_2 - 1] === "\\";
      let isNewlineKey =
        key.return &&
        !key.shift &&
        !key.meta &&
        !key.ctrl &&
        (isBackslashContinuation || needsShiftWorkaround());
      if (isNewlineKey) {
        let sliced = fieldText.slice(0, isBackslashContinuation ? min_2 - 1 : min_2);
        inputFields?.edit(
          {
            plugin,
            handle,
            element,
          },
          `${sliced}
${fieldText.slice(min_2)}`,
        );
        setCursorOffset(sliced.length + 1);
      }
      return isNewlineKey;
    },
    {
      isActive: hasKeyboardFocus && isMultiline,
    },
  );
  return jsxProd_default_2(Box, {
    ref: siteFocus.ref,
    flexDirection: "row",
    flexShrink: 0,
    height: isMultiline ? min : undefined,
    overflow: isMultiline ? "hidden" : undefined,
    elementKey: element,
    elementPlugin: plugin,
    onClick: siteFocus.onClick,
    children: [
      labelPrefix !== "" &&
        jsxProd_default(Text, {
          bold: hasKeyboardFocus,
          children: labelPrefix,
        }),
      hasKeyboardFocus
        ? jsxProd_default(TextInput, {
            value: fieldText,
            onChange: (value) =>
              inputFields.edit(
                {
                  plugin,
                  handle,
                  element,
                },
                value,
              ),
            placeholder,
            columns: Math.max(FIELD_MIN_COLUMNS, inputColumns - bunStringWidth(hint)),
            cursorOffset: min_2,
            onChangeCursorOffset: setCursorOffset,
            onHistoryUp: () => inputFields.step("previous"),
            onHistoryDown: () => inputFields.step("next"),
            inputFilter: isMultiline
              ? (state) =>
                  state.replace(
                    /\r\n?/g,
                    `
`,
                  )
              : undefined,
            maxVisibleLines: isMultiline ? min : undefined,
            focus: true,
            showCursor: true,
            multiline: isMultiline,
            disableBackslashReturn: true,
            disableEscapeDoublePress: true,
          })
        : jsxProd_default(Text, {
            dimColor: fieldText === "",
            wrap: isMultiline ? "wrap" : "truncate-end",
            children: fieldText === "" ? (placeholder ?? "") : fieldText,
          }),
      hasKeyboardFocus &&
        jsxProd_default(Text, {
          dimColor: true,
          children: hint,
        }),
    ],
  });
}
//@ chunk-bc20zedk.js:11053-11057 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:11053", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:11057-11116 placement = isConnectionError (1)
var collectCodeSegments = (err) =>
  err.flatMap((block) =>
    block.type === "code" ? [block] : collectCodeSegments(checkAgentDescriptions(block)),
  );
//@ chunk-bc20zedk.js:11116-11213 placement
var SYNTAX_HIGHLIGHT_CUT_TEXT =
  "Syntax highlighting stops here. This message has more code than is highlighted at once.";
//@ chunk-bc20zedk.js:11213-11583 placement
/**
 * 带高亮预算的代码高亮器（超预算原样输出）。
 */
function createBudgetedHighlighter(highlight) {
  if (highlight === null) return null;
  let budget = {
    left: TOTAL_BUDGET_BYTES,
  };
  let weakMap = new WeakMap();
  let isExhausted = false;
  return {
    supportsLanguage: highlight.supportsLanguage,
    highlight(text, options) {
      let cached = options?.fence && weakMap.get(options.fence);
      let isPlaintext = canonicalLanguageName(options?.language ?? "") === "plaintext";
      if (cached !== undefined || isPlaintext) return cached ?? text;
      let isBudgetSpent = budget.left <= 0;
      let highlighted = isBudgetSpent
        ? text
        : highlight.highlight(text, {
            ...options,
            work: budget,
          });
      let result =
        isBudgetSpent && !isExhausted && sequential.level > 0
          ? `${sequential.dim(SYNTAX_HIGHLIGHT_CUT_TEXT)}
${text}`
          : highlighted;
      isExhausted ||= isBudgetSpent;
      if (options?.fence) weakMap.set(options.fence, result);
      return result;
    },
  };
}
//@ chunk-bc20zedk.js:11583-11689 placement
function prehighlightCodeSegments(highlight, err, theme) {
  let budgetedHighlighter = createBudgetedHighlighter(highlight);
  if (budgetedHighlighter !== null)
    collectCodeSegments(err).forEach((block) =>
      formatTokenWindowed(block, theme, {
        highlight: budgetedHighlighter,
        windowed: false,
      }),
    );
  return budgetedHighlighter;
}
//@ chunk-bc20zedk.js:11689-11693 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:11689", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:11693-11697 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:11693", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:11697-11728 placement
function trimEntryText(text) {
  return text.trim();
}
//@ chunk-bc20zedk.js:11728-11754 placement
var CODE_LIST_TAB_WIDTH = 4;
var LIST_LEVEL_INDENT = 3;
var BLOCK_QUOTE_INDENT = 4;
var MAX_RENDER_ROWS = 200;
//@ chunk-bc20zedk.js:11754-11835 placement
function moreRowsText(count) {
  return `\u2026 ${count.toLocaleString()} more ${plural(count, "row")} not shown`;
}
export {
  FocusedPress,
  FocusedNode,
  InputFields,
  focusClick,
  SiteColumns,
  SiteRows,
  CodeBlock,
  DEFAULT_COLUMNS,
  FIELD_MIN_COLUMNS,
  HEX_COLOR_PROPS,
  HoverScope,
  HoverStyled,
  InputField,
  ScopeHovered,
  adjustHoverGroup,
  clippedHunks,
  clippedLines,
  groupMember,
  groupOf,
  heldFor,
  highlightPath,
  hoverGroupsStore,
  hoverOverridesOf,
  rulerCut,
  useHoverGroup,
  useHoverLit,
  useSiteFocus,
  withHexColors,
  MAX_RENDER_ROWS,
  moreRowsText,
  LIST_LEVEL_INDENT,
  CODE_LIST_TAB_WIDTH,
  BLOCK_QUOTE_INDENT,
  trimEntryText,
  prehighlightCodeSegments,
};
