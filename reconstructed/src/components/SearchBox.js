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
import { r, Fragment, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";

//@ chunk-tzghj6zv.js:49806-51767 fingerprint = SearchBox (0.529)
function SearchBox({
  query: query,
  placeholder: placeholder,
  isFocused: isFocused,
  onKeyDown: onKeyDown,
  onPaste: onPaste,
  ref: ref,
  autoFocus: autoFocus,
  isTerminalFocused: isTerminalFocused,
  prefix: prefix = TELEPHONE_RECORDER,
  width: width,
  cursorOffset: cursorOffset,
  borderless: borderless = !1,
  isSearchLineUnpadded: isSearchLineUnpadded = !1,
  highlights: highlights = [],
  dimRange: dimRange,
  cursorChar: cursorChar,
  prefixDim: prefixDim = !1,
  prefixColor: prefixColor,
  onCursorOffsetChange: onCursorOffsetChange,
  onFocus: onFocus,
  wrapColumns: wrapColumns,
}) {
  let Se = cursorOffset ?? query.length,
    te = onKeyDown !== void 0,
    ae = R(null),
    X = (He) => {
      ((ae.current = He), assignRef(ref, He));
    },
    F = useHasFocus(ae),
    re = isFocused ?? (te && F),
    H = useIsScreenReaderEnabled(),
    D = !borderless && !H,
    J = !1,
    K = D && !1,
    me = D && !K,
    se = placeholder ?? "Search\u2026",
    le = H && prefix === TELEPHONE_RECORDER ? (query ? "Search:" : null) : prefix,
    Ce = me ? 2 : 0,
    de = K && !isSearchLineUnpadded ? 1 : 0,
    _e = me ? 1 : de,
    Pe = le === null ? query : `${le} ${query}`,
    Ge = le === null ? 0 : le.length + 1,
    _ = Q(() => measureText(Pe, wrapColumns ?? 0), [Pe, wrapColumns]),
    ge = Q(isNativeCursorEnabled, []),
    ke = env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT && env.CLAUDE_CODE_SESSION_KIND !== "bg",
    q = offsetToPosition(_, Ge + Se),
    U = cursorChar === void 0 && !ke,
    xe = useDeclaredCursor({ line: _e + q.line, column: Ce + q.column, active: re && !te, visible: U }),
    Ee = isTerminalFocused && !(ge && !ke && cursorChar === void 0),
    qe =
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
            let max = Math.max(0, He.localCol - Ce),
              Ue = positionToOffset(_, Ne, max);
            onCursorOffsetChange(Math.max(0, Math.min(query.length, Ue - Ge)));
          }
        : void 0,
    ut = r(Text, {
      dimColor: !re,
      children: [
        le !== null
          ? r(Fragment, {
              children: [
                e(Text, {
                  dimColor: prefixDim,
                  color: prefixColor ?? (K && re ? "permission" : void 0),
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
              ? r(Fragment, {
                  children: [
                    cursorChar ?? e(Text, { inverse: !0, children: se.charAt(0) }),
                    e(Text, { dimColor: !0, children: cursorChar ? se : se.slice(1) }),
                  ],
                })
              : e(Text, { dimColor: !0, children: se })
          : query
            ? e(Text, { children: query })
            : e(Text, { children: se }),
      ],
    });
  if (te)
    return e(Box, {
      flexShrink: 0,
      borderStyle: me ? "round" : void 0,
      borderColor: re ? "suggestion" : void 0,
      borderDimColor: !re,
      paddingX: me ? 1 : 0,
      paddingY: de,
      width: width,
      onClick: qe,
      children: e(Input, {
        ref: X,
        autoFocus: autoFocus,
        onKeyDown: onKeyDown,
        onPaste: onPaste,
        caret: re ? { line: q.line, column: q.column, visible: U } : void 0,
        flexGrow: 1,
        children: ut,
      }),
    });
  return e(Box, {
    ref: xe,
    flexShrink: 0,
    borderStyle: me ? "round" : void 0,
    borderColor: re ? "suggestion" : void 0,
    borderDimColor: !re,
    paddingX: me ? 1 : 0,
    paddingY: de,
    width: width,
    onClick: qe,
    children: ut,
  });
}
//@ chunk-tzghj6zv.js:51767-52276 placement = EffortIndicatorSymbol (0.752)
function EffortIndicatorSymbol(d, h, x, C, A) {
  let M = (N) => h.some(([B, pe]) => N >= B && N < pe),
    O = (N) => !!x && N >= x[0] && N < x[1],
    I = new Set([0, d.length]);
  for (let [N, B] of h) (I.add(N), I.add(B));
  if (x) (I.add(x[0]), I.add(x[1]));
  if (C >= 0) (I.add(C), I.add(C + 1));
  let sorted = [...I].sort((N, B) => N - B),
    Y = [];
  for (let N = 0; N < sorted.length - 1; N++) {
    let B = sorted[N],
      pe = sorted[N + 1],
      oe = B < d.length ? d.slice(B, pe) : " ";
    if (!oe) continue;
    let ne = B === C,
      z =
        ne &&
        oe ===
          `
`;
    Y.push(
      ne && A
        ? r(
            Text,
            {
              children: [
                A,
                z
                  ? `
`
                  : null,
              ],
            },
            B,
          )
        : e(
            Text,
            {
              color: M(B) ? "suggestion" : void 0,
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
function tgo({ presentation: presentation, rows: rows, embedded: embedded }) {
  return !1;
}

export { SearchBox, tgo };
