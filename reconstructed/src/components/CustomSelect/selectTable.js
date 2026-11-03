/**
 * components/CustomSelect/selectTable.tsx
 *
 * 2.1.316 新增：带图标、名称与说明列的表格式选择列表（Select 表格变体）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-r68xwcze.js (11)
 * attribution: placement 11
 */
import { bunStringWidth } from "../../ink/stringWidth.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useScrollViewportSize } from "../ScrollViewportContext.js";
import { Se, R, y, Fy, dh } from "../../../vendor/react/cjs/react.production.js";
import { TerminalSizeContext } from "../../ink/terminalModes.js";
import { Ft, jt, getTextContent, merged, pM } from "./select.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { useMeasured } from "../../ink/components/Input.js";
import { Box, Text } from "../../ink/components/Text.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Dr } from "../../utils/stringUtils.js";

//@ chunk-r68xwcze.js:19250-19296 placement
function Kt(oe) {
  return bunStringWidth(cellText(oe.props.label));
}
//@ chunk-r68xwcze.js:19296-19354 placement
function _t(d) {
  return bunStringWidth(we(d.props.meta).join(" \xB7 "));
}
//@ chunk-r68xwcze.js:19354-19379 placement
var Bn = 2,
  ro = 3,
  Ln = 50,
  Tn = 6;
//@ chunk-r68xwcze.js:19379-20797 placement
function SelectTable(o) {
  let t = w(30),
    i,
    a;
  if (t[0] !== o) (({ children: i, ...a } = o), (t[0] = o), (t[1] = i), (t[2] = a));
  else ((i = t[1]), (a = t[2]));
  let f = useScrollViewportSize(Se(TerminalSizeContext) ?? { rows: 0, columns: 0 }),
    m = R(null),
    [l] = y(Ft),
    C;
  if (t[3] !== l || t[4] !== f)
    ((C = () => {
      let [h] = l;
      if (h) {
        return measureElement(h).width;
      }
      return ((m.current && measureElement(m.current).width) || f.columns) - Bn;
    }),
      (t[3] = l),
      (t[4] = f),
      (t[5] = C));
  else C = t[5];
  let A = useMeasured(C),
    T,
    k,
    M,
    E,
    F,
    B;
  if (t[6] !== i || t[7] !== a || t[8] !== l || t[9] !== A) {
    let toArray = Fy.toArray(i);
    let filtered = toArray.filter(Te);
    let max = Math.max(0, ...toArray.map(jt));
    let filtered_2 = filtered.filter(getTextContent);
    let min = Math.min(Ln, Math.max(0, ...filtered_2.map(Kt)));
    let max_2 = Math.max(0, ...filtered_2.map(_t));
    let g = A - (max > 0 ? max + 1 : 0) - ro;
    let x = g - Math.min(min, Math.max(Math.ceil(g / 2), g - max_2));
    let V =
      min + max_2 > g && g < 2 * Tn
        ? 0
        : Math.min(
            x,
            Math.max(0, ...filtered_2.map((I) => bunStringWidth(fitBreadcrumb(we(I.props.meta), x)))),
          );
    let min_2 = Math.min(min, g - V);
    k = Box;
    F = m;
    B = "column";
    T = merged;
    M = a;
    let b;
    if (t[16] !== V || t[17] !== max || t[18] !== min_2 || t[19] !== l)
      ((b = (K) =>
        Te(K)
          ? e(
              merged.Item,
              {
                lines: cellText(K.props.description) ? 2 : 1,
                children: e(SelectTableRow, {
                  item: K.props,
                  iconWidth: max,
                  nameWidth: min_2,
                  factsWidth: V,
                  rowLines: l,
                }),
              },
              K.key,
            )
          : K),
        (t[16] = V),
        (t[17] = max),
        (t[18] = min_2),
        (t[19] = l),
        (t[20] = b));
    else b = t[20];
    E = toArray.map(b);
    ((t[6] = i),
      (t[7] = a),
      (t[8] = l),
      (t[9] = A),
      (t[10] = T),
      (t[11] = k),
      (t[12] = M),
      (t[13] = E),
      (t[14] = F),
      (t[15] = B));
  } else ((T = t[10]), (k = t[11]), (M = t[12]), (E = t[13]), (F = t[14]), (B = t[15]));
  let b;
  if (t[21] !== T || t[22] !== M || t[23] !== E)
    ((b = e(T, { ...M, children: E })), (t[21] = T), (t[22] = M), (t[23] = E), (t[24] = b));
  else b = t[24];
  let ee;
  if (t[25] !== k || t[26] !== F || t[27] !== B || t[28] !== b)
    ((ee = e(k, { ref: F, flexDirection: B, children: b })),
      (t[25] = k),
      (t[26] = F),
      (t[27] = B),
      (t[28] = b),
      (t[29] = ee));
  else ee = t[29];
  return ee;
}
//@ chunk-r68xwcze.js:20797-22669 placement
function SelectTableRow(o) {
  let E = w(42),
    {
      item: item,
      iconWidth: iconWidth,
      nameWidth: nameWidth,
      factsWidth: factsWidth,
      rowLines: rowLines,
    } = o,
    { icon: icon, meta: meta, ...h } = item,
    A = pM(),
    T = useIsScreenReaderEnabled(),
    k = cellText(h.label),
    M = cellText(h.description),
    F,
    B;
  if (E[0] !== M || E[1] !== factsWidth || E[2] !== icon || E[3] !== T || E[4] !== k || E[5] !== meta) {
    B = EARLY_RETURN_SENTINEL;
    G: {
      let N = we(meta);
      if (T) {
        const U = N.length > 0 && `, ${N.join(" \xB7 ")}`;
        const W = M && `. ${M}`;
        let L;
        if (E[8] !== k || E[9] !== U || E[10] !== W)
          ((L = r(Text, { children: [k, U, W] })), (E[8] = k), (E[9] = U), (E[10] = W), (E[11] = L));
        else L = E[11];
        let H;
        if (E[12] !== icon || E[13] !== L)
          ((H = r(Box, { children: [icon, L] })), (E[12] = icon), (E[13] = L), (E[14] = H));
        else H = E[14];
        B = H;
        break G;
      }
      F = factsWidth > 0 && N.length > 0 ? fitBreadcrumb(N, factsWidth) : void 0;
    }
    ((E[0] = M),
      (E[1] = factsWidth),
      (E[2] = icon),
      (E[3] = T),
      (E[4] = k),
      (E[5] = meta),
      (E[6] = F),
      (E[7] = B));
  } else ((F = E[6]), (B = E[7]));
  if (B !== EARLY_RETURN_SENTINEL) return B;
  let g = F,
    U;
  if (E[15] !== rowLines)
    ((U = (x) => {
      if (!x) {
        return;
      }
      return (
        rowLines.add(x),
        () => {
          rowLines.delete(x);
        }
      );
    }),
      (E[15] = rowLines),
      (E[16] = U));
  else U = E[16];
  let W;
  if (E[17] !== icon || E[18] !== iconWidth)
    ((W = iconWidth > 0 && e(Box, { flexShrink: 0, width: iconWidth, marginRight: 1, children: icon })),
      (E[17] = icon),
      (E[18] = iconWidth),
      (E[19] = W));
  else W = E[19];
  const L = g === void 0 ? 1 : 0,
    H = g === void 0 ? void 0 : nameWidth,
    I = g === void 0 ? 0 : ro,
    V = A ? "suggestion" : void 0;
  let p;
  if (E[20] !== k || E[21] !== V)
    ((p = e(Text, { color: V, wrap: "truncate-end", children: k })), (E[20] = k), (E[21] = V), (E[22] = p));
  else p = E[22];
  let b;
  if (E[23] !== p || E[24] !== L || E[25] !== H || E[26] !== I)
    ((b = e(Box, { flexShrink: L, width: H, marginRight: I, children: p })),
      (E[23] = p),
      (E[24] = L),
      (E[25] = H),
      (E[26] = I),
      (E[27] = b));
  else b = E[27];
  let K;
  if (E[28] !== factsWidth || E[29] !== g)
    ((K =
      g !== void 0 &&
      e(Box, {
        flexShrink: 1,
        maxWidth: factsWidth,
        children: e(Text, { dimColor: !0, wrap: "truncate-end", children: g }),
      })),
      (E[28] = factsWidth),
      (E[29] = g),
      (E[30] = K));
  else K = E[30];
  let ee;
  if (E[31] !== b || E[32] !== K || E[33] !== U || E[34] !== W)
    ((ee = r(Box, { ref: U, children: [W, b, K] })),
      (E[31] = b),
      (E[32] = K),
      (E[33] = U),
      (E[34] = W),
      (E[35] = ee));
  else ee = E[35];
  let q;
  if (E[36] !== M || E[37] !== iconWidth)
    ((q =
      M &&
      e(Box, {
        paddingLeft: iconWidth > 0 ? iconWidth + 1 : 0,
        children: e(Text, { dimColor: !0, wrap: "truncate-end", children: M }),
      })),
      (E[36] = M),
      (E[37] = iconWidth),
      (E[38] = q));
  else q = E[38];
  let D;
  if (E[39] !== ee || E[40] !== q)
    ((D = r(Box, { flexDirection: "column", flexGrow: 1, flexShrink: 1, children: [ee, q] })),
      (E[39] = ee),
      (E[40] = q),
      (E[41] = D));
  else D = E[41];
  return D;
}
//@ chunk-r68xwcze.js:22669-22696 placement
function _n(o) {
  return null;
}
//@ chunk-r68xwcze.js:22696-22737 placement
function Te(o) {
  return dh(o) && o.type === _n;
}
//@ chunk-r68xwcze.js:22737-22794 placement
function we(o) {
  return (o ?? []).map(cellText).filter((t) => t !== "");
}
//@ chunk-r68xwcze.js:22794-22899 placement
function fitBreadcrumb(o, t) {
  return (
    o.map((i, a) => o.slice(0, a + 1).join(" \xB7 ")).findLast((i, a) => a === 0 || bunStringWidth(i) <= t) ??
    ""
  );
}
//@ chunk-r68xwcze.js:22899-23012 placement
function cellText(o) {
  if (typeof o === "string") return Dr(o);
  return typeof o === "number" || typeof o === "boolean" ? String(o) : "";
}
//@ chunk-r68xwcze.js:23012-23047 placement
var OrderedListWithItem = Object.assign(SelectTable, { Item: _n });

export { OrderedListWithItem, cellText, Te, we };
