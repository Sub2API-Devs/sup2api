/**
 * components/SearchBox.tsx
 *
 * 通用搜索框组件（"Search…" 占位、聚焦边框色），用于各种选择器。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/SearchBox.tsx
 * pieces: chunk-tzghj6zv.js (3)
 * attribution: fingerprint 1, placement 2
 */
import { TELEPHONE_RECORDER } from "../utils/permissions/autoModeRulesPrompt.js";
import { R, Q } from "../../vendor/react/cjs/react.production.js";
import { assignRef, useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { useHasFocus, Input } from "../ink/components/Input.js";
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

//@ chunk-tzghj6zv.js:49806-51767 fingerprint = SearchBox (0.529)
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
  let Se = cursorOffset ?? query.length;
  let te = onKeyDown !== undefined;
  let ae = R(null);
  let ref_2 = (He) => {
    ae.current = He;
    assignRef(ref, He);
  };
  let hasFocus = useHasFocus(ae);
  let re = isFocused ?? (te && hasFocus);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let D = !borderless && !isScreenReaderEnabled;
  let J = false;
  let K = D && false;
  let me = D && !K;
  let se = placeholder ?? "Search\u2026";
  let le = isScreenReaderEnabled && prefix === TELEPHONE_RECORDER ? (query ? "Search:" : null) : prefix;
  let Ce = me ? 2 : 0;
  let de = K && !isSearchLineUnpadded ? 1 : 0;
  let _e = me ? 1 : de;
  let text = le === null ? query : `${le} ${query}`;
  let Ge = le === null ? 0 : le.length + 1;
  let _ = Q(() => measureText(text, wrapColumns ?? 0), [text, wrapColumns]);
  let ge = Q(isNativeCursorEnabled, []);
  let ke = env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT && env.CLAUDE_CODE_SESSION_KIND !== "bg";
  let q = offsetToPosition(_, Ge + Se);
  let visible = cursorChar === undefined && !ke;
  let ref_3 = useDeclaredCursor({
    line: _e + q.line,
    column: Ce + q.column,
    active: re && !te,
    visible,
  });
  let Ee = isTerminalFocused && !(ge && !ke && cursorChar === undefined);
  let onClick =
    onCursorOffsetChange || onFocus || te
      ? (He) => {
          if (!re && He.isWindowActivation) {
            He.dropAsStray();
            return;
          }
          let Xe = ae.current;
          if (Xe && !onFocus) getFocusManager(Xe).focus(Xe);
          if (!re) {
            onFocus?.();
            return;
          }
          if (!query || !onCursorOffsetChange) return;
          let Ne = He.localRow - _e;
          if (Ne < 0) return;
          let max = Math.max(0, He.localCol - Ce);
          let Ue = positionToOffset(_, Ne, max);
          onCursorOffsetChange(Math.max(0, Math.min(query.length, Ue - Ge)));
        }
      : undefined;
  let children = jsxProd_default_2(Text, {
    dimColor: !re,
    children: [
      le !== null
        ? jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(Text, {
                dimColor: prefixDim,
                color: prefixColor ?? (K && re ? "permission" : undefined),
                children: le,
              }),
              " ",
            ],
          })
        : null,
      re
        ? query
          ? EffortIndicatorSymbol(query, highlights, dimRange, Ee ? Se : -1, cursorChar)
          : Ee
            ? jsxProd_default_2(Fragment, {
                children: [
                  cursorChar ??
                    jsxProd_default(Text, {
                      inverse: true,
                      children: se.charAt(0),
                    }),
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: cursorChar ? se : se.slice(1),
                  }),
                ],
              })
            : jsxProd_default(Text, {
                dimColor: true,
                children: se,
              })
        : query
          ? jsxProd_default(Text, {
              children: query,
            })
          : jsxProd_default(Text, {
              children: se,
            }),
    ],
  });
  if (te)
    return jsxProd_default(Box, {
      flexShrink: 0,
      borderStyle: me ? "round" : undefined,
      borderColor: re ? "suggestion" : undefined,
      borderDimColor: !re,
      paddingX: me ? 1 : 0,
      paddingY: de,
      width,
      onClick,
      children: jsxProd_default(Input, {
        ref: ref_2,
        autoFocus,
        onKeyDown,
        onPaste,
        caret: re
          ? {
              line: q.line,
              column: q.column,
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
    borderStyle: me ? "round" : undefined,
    borderColor: re ? "suggestion" : undefined,
    borderDimColor: !re,
    paddingX: me ? 1 : 0,
    paddingY: de,
    width,
    onClick,
    children,
  });
}
//@ chunk-tzghj6zv.js:51767-52276 placement = EffortIndicatorSymbol (0.752)
function EffortIndicatorSymbol(query, highlights, dimRange, C, cursorChar) {
  let M = (N) => highlights.some(([B, pe]) => N >= B && N < pe);
  let O = (N) => !!dimRange && N >= dimRange[0] && N < dimRange[1];
  let I = new Set([0, query.length]);
  for (let [N, B] of highlights) {
    I.add(N);
    I.add(B);
  }
  if (dimRange) {
    I.add(dimRange[0]);
    I.add(dimRange[1]);
  }
  if (C >= 0) {
    I.add(C);
    I.add(C + 1);
  }
  let sorted = [...I].sort((N, B) => N - B);
  let Y = [];
  for (let idx = 0; idx < sorted.length - 1; idx++) {
    let B = sorted[idx];
    let pe = sorted[idx + 1];
    let oe = B < query.length ? query.slice(B, pe) : " ";
    if (!oe) continue;
    let ne = B === C;
    let z =
      ne &&
      oe ===
        `
`;
    Y.push(
      ne && cursorChar
        ? jsxProd_default_2(
            Text,
            {
              children: [
                cursorChar,
                z
                  ? `
`
                  : null,
              ],
            },
            B,
          )
        : jsxProd_default(
            Text,
            {
              color: M(B) ? "suggestion" : undefined,
              dimColor: O(B),
              inverse: ne,
              children: z
                ? ` 
`
                : oe,
            },
            B,
          ),
    );
  }
  return Y;
}
//@ chunk-tzghj6zv.js:52276-52334 placement
/**
 * 函数 neverEmbedded（恒返回 false 的嵌入模式判定）；位于「通用搜索框组件（"Search…" 占位、聚焦边框色），用于各种选择器」模块。
 */
function neverEmbedded({ presentation, rows, embedded }) {
  return false;
}
export { SearchBox, neverEmbedded };
