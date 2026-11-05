/**
 * components/SearchBox.tsx
 *
 * 通用搜索框组件（"Search…" 占位、聚焦边框色），用于各种选择器。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/SearchBox.tsx
 * pieces: chunk-18rrbwq1.js (3)
 * attribution: fingerprint 1, placement 2
 */
import { TELEPHONE_RECORDER } from "../constants/figures.js";
import { useRef, useMemo } from "../../vendor/react/cjs/react.production.js";
import { assignRef, useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { isFocusedIn, Input } from "../ink/components/Input.js";
import { measureText, offsetToPosition, positionToOffset } from "../utils/Cursor.js";
import { isNativeCursorEnabled } from "../ink/nativeCursor.js";
import { env } from "../utils/env.js";
import { useDeclaredCursor } from "../ink/hooks/use-declared-cursor.js";
import { getFocusManager } from "../ink/focus.js";
import {
  jsxProd_default_2,
  Fragment,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";

//@ chunk-18rrbwq1.js:49787-51733 fingerprint (2.1.88 match: SearchBox, 0.529)
function SearchBox({
  query,
  placeholder,
  isFocused,
  onKeyDown,
  onPaste,
  ref,
  autoFocus,
  isTerminalFocused,
  prefix = TELEPHONE_RECORDER,
  width,
  cursorOffset,
  borderless = false,
  isSearchLineUnpadded = false,
  highlights = [],
  dimRange,
  cursorChar,
  prefixDim = false,
  prefixColor,
  onCursorOffsetChange,
  onFocus,
  wrapColumns,
}) {
  let effectiveCursorOffset = cursorOffset ?? query.length;
  let hasKeyHandler = onKeyDown !== undefined;
  let inputRef = useRef(null);
  let ref_2 = (node) => {
    inputRef.current = node;
    assignRef(ref, node);
  };
  let isInputFocused = isFocusedIn(inputRef);
  let focused = isFocused ?? (hasKeyHandler && isInputFocused);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let bordered = !borderless && !isScreenReaderEnabled;
  let neverFlag = false;
  let isPermissionBorder = bordered && false;
  let showBorder = bordered && !isPermissionBorder;
  let placeholderText = placeholder ?? "Search\u2026";
  let visiblePrefix =
    isScreenReaderEnabled && prefix === TELEPHONE_RECORDER ? (query ? "Search:" : null) : prefix;
  let textInsetX = showBorder ? 2 : 0;
  let paddingY = isPermissionBorder && !isSearchLineUnpadded ? 1 : 0;
  let paddingTop = showBorder ? 1 : paddingY;
  let text = visiblePrefix === null ? query : `${visiblePrefix} ${query}`;
  let prefixLength = visiblePrefix === null ? 0 : visiblePrefix.length + 1;
  let measured = useMemo(() => measureText(text, wrapColumns ?? 0), [text, wrapColumns]);
  let nativeCursor = useMemo(isNativeCursorEnabled, []);
  let fullRepaint = env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT && env.CLAUDE_CODE_SESSION_KIND !== "bg";
  let cursorPosition = offsetToPosition(measured, prefixLength + effectiveCursorOffset);
  let visible = cursorChar === undefined && !fullRepaint;
  let ref_3 = useDeclaredCursor({
    line: paddingTop + cursorPosition.line,
    column: textInsetX + cursorPosition.column,
    active: focused && !hasKeyHandler,
    visible,
  });
  let cursorActive = isTerminalFocused && !(nativeCursor && !fullRepaint && cursorChar === undefined);
  let onClick =
    onCursorOffsetChange || onFocus || hasKeyHandler
      ? (event) => {
          if (!focused && event.isWindowActivation) {
            event.dropAsStray();
            return;
          }
          let node = inputRef.current;
          if (node && !onFocus) getFocusManager(node).focus(node);
          if (!focused) {
            onFocus?.();
            return;
          }
          if (!query || !onCursorOffsetChange) return;
          let localRow = event.localRow - paddingTop;
          if (localRow < 0) return;
          let max = Math.max(0, event.localCol - textInsetX);
          let offset = positionToOffset(measured, localRow, max);
          onCursorOffsetChange(Math.max(0, Math.min(query.length, offset - prefixLength)));
        }
      : undefined;
  let children = jsxProd_default_2(Text, {
    dimColor: !focused,
    children: [
      visiblePrefix !== null
        ? jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(Text, {
                dimColor: prefixDim,
                color: prefixColor ?? (isPermissionBorder && focused ? "permission" : undefined),
                children: visiblePrefix,
              }),
              " ",
            ],
          })
        : null,
      focused
        ? query
          ? EffortIndicatorSymbol(
              query,
              highlights,
              dimRange,
              cursorActive ? effectiveCursorOffset : -1,
              cursorChar,
            )
          : cursorActive
            ? jsxProd_default_2(Fragment, {
                children: [
                  cursorChar ??
                    jsxProd_default(Text, {
                      inverse: true,
                      children: placeholderText.charAt(0),
                    }),
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: cursorChar ? placeholderText : placeholderText.slice(1),
                  }),
                ],
              })
            : jsxProd_default(Text, {
                dimColor: true,
                children: placeholderText,
              })
        : query
          ? jsxProd_default(Text, {
              children: query,
            })
          : jsxProd_default(Text, {
              children: placeholderText,
            }),
    ],
  });
  if (hasKeyHandler)
    return jsxProd_default(Box, {
      flexShrink: 0,
      borderStyle: showBorder ? "round" : undefined,
      borderColor: focused ? "suggestion" : undefined,
      borderDimColor: !focused,
      paddingX: showBorder ? 1 : 0,
      paddingY,
      width,
      onClick,
      children: jsxProd_default(Input, {
        ref: ref_2,
        autoFocus,
        onKeyDown,
        onPaste,
        caret: focused
          ? {
              line: cursorPosition.line,
              column: cursorPosition.column,
              visible,
            }
          : undefined,
        flexGrow: 1,
        children,
      }),
    });
  return jsxProd_default(Box, {
    ref: ref_3,
    flexShrink: 0,
    borderStyle: showBorder ? "round" : undefined,
    borderColor: focused ? "suggestion" : undefined,
    borderDimColor: !focused,
    paddingX: showBorder ? 1 : 0,
    paddingY,
    width,
    onClick,
    children,
  });
}
//@ chunk-18rrbwq1.js:51733-52242 placement (2.1.88 match: EffortIndicatorSymbol, 0.752)
function EffortIndicatorSymbol(query, highlights, dimRange, cursorIndex, cursorChar) {
  let isHighlighted = (index) =>
    highlights.some(([rangeStart, rangeEnd]) => index >= rangeStart && index < rangeEnd);
  let isDimmed = (index) => !!dimRange && index >= dimRange[0] && index < dimRange[1];
  let boundaries = new Set([0, query.length]);
  for (let [start, end] of highlights) {
    boundaries.add(start);
    boundaries.add(end);
  }
  if (dimRange) {
    boundaries.add(dimRange[0]);
    boundaries.add(dimRange[1]);
  }
  if (cursorIndex >= 0) {
    boundaries.add(cursorIndex);
    boundaries.add(cursorIndex + 1);
  }
  let sorted = [...boundaries].sort((a, b) => a - b);
  let elements = [];
  for (let idx = 0; idx < sorted.length - 1; idx++) {
    let start = sorted[idx];
    let end = sorted[idx + 1];
    let segment = start < query.length ? query.slice(start, end) : " ";
    if (!segment) continue;
    let isCursor = start === cursorIndex;
    let isNewlineCursor =
      isCursor &&
      segment ===
        `
`;
    elements.push(
      isCursor && cursorChar
        ? jsxProd_default_2(
            Text,
            {
              children: [
                cursorChar,
                isNewlineCursor
                  ? `
`
                  : null,
              ],
            },
            start,
          )
        : jsxProd_default(
            Text,
            {
              color: isHighlighted(start) ? "suggestion" : undefined,
              dimColor: isDimmed(start),
              inverse: isCursor,
              children: isNewlineCursor
                ? ` 
`
                : segment,
            },
            start,
          ),
    );
  }
  return elements;
}
//@ chunk-18rrbwq1.js:52242-52300 placement
/**
 * 函数 neverEmbedded（恒返回 false 的嵌入模式判定）；位于「通用搜索框组件（"Search…" 占位、聚焦边框色），用于各种选择器」模块。
 */
function neverEmbedded({ presentation, rows, embedded }) {
  return false;
}
export { SearchBox, neverEmbedded };
