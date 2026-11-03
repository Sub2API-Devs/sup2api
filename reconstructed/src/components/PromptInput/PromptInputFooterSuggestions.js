/**
 * components/PromptInput/PromptInputFooterSuggestions.tsx
 *
 * 输入建议列表（命令/文件/MCP 资源/agent/emoji 等）：按类型取图标、高亮匹配字符、滚动窗口与对齐。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/PromptInputFooterSuggestions.tsx
 * pieces: chunk-8jypjjdf.js (19)
 * attribution: placement 11, layout 5, fingerprint 3
 */
import { DIAMOND_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, Fragment, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Rh, Q, y } from "../../../vendor/react/cjs/react.production.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import {
  truncateStartToWidth,
  truncatePathMiddle,
  truncateToWidth,
  truncateToWidthNoEllipsis,
} from "../../utils/format.js";
import { useStrayClickGuard } from "../CustomSelect/strayClickGuard.js";
import { sLn, repeatString, Dr } from "../../utils/stringUtils.js";
import { HintText } from "../design-system/HintText.js";
import { TwoColumnRow } from "../CustomSelect/select.js";
import { getGraphemeSegmenter } from "../../utils/intl.js";

//@ chunk-8jypjjdf.js:1642-1656 placement
var xt = /\s+/g;
/**
 * 当前方向键选中的建议 id（与选中项一致时）。
 */
//@ chunk-8jypjjdf.js:1656-1767 placement
function getArrowedSuggestionId(o) {
  let arrowedSuggestionId = o.arrowedSuggestionId;
  return arrowedSuggestionId != null && o.suggestions[o.selectedSuggestion]?.id === arrowedSuggestionId
    ? arrowedSuggestionId
    : null;
}
/**
 * 计算建议列表的可见窗口：各项高度不一，在最大行数内从上次起点出发保证选中项可见，并尽量向上填满。
 */
//@ chunk-8jypjjdf.js:1767-2112 layout
function suggestionWindow(o, a, t, l) {
  let c = (d) => o[d] ?? 1,
    m = (d) => {
      let f = d + 1,
        h = c(d);
      while (f < o.length && h + c(f) <= a) ((h += c(f)), f++);
      return { start: d, end: f, usedRows: h };
    },
    p = m(Math.max(0, Math.min(l, o.length - 1)));
  if (t >= p.end) p = m(t);
  else if (t < p.start) p = { start: t, end: t + 1, usedRows: c(t) };
  while (p.start > 0 && p.usedRows + c(p.start - 1) <= a) (p.start--, (p.usedRows += c(p.start)));
  return m(p.start);
}
//@ chunk-8jypjjdf.js:2112-2121 layout
var MAX_VISIBLE_SUGGESTIONS = 5;
//@ chunk-8jypjjdf.js:2121-2302 fingerprint = getIcon (0.839)
function getIcon(itemId) {
  if (itemId.startsWith("file-")) return "+";
  if (itemId.startsWith("mcp-resource-")) return DIAMOND_GLYPH;
  if (itemId.startsWith("mcp-template")) return DIAMOND_GLYPH;
  if (itemId.startsWith("agent-")) return "*";
  return "+";
}
//@ chunk-8jypjjdf.js:2302-2608 layout
function findContiguousMatch(o, a, t = !1) {
  let lower = o.toLowerCase();
  if (lower.length !== o.length) return [];
  let index = lower.indexOf(a);
  if (index !== -1) return snapRangesToGraphemes(o, [[index, index + a.length]]);
  if (t) return [];
  let m = [],
    p = 0;
  for (let d of a) {
    let index = lower.indexOf(d, p);
    if (index === -1) return [];
    let h = index + d.length,
      at = m.at(-1);
    if (at && at[1] === index) at[1] = h;
    else m.push([index, h]);
    p = h;
  }
  return snapRangesToGraphemes(o, m);
}
//@ chunk-8jypjjdf.js:2608-3288 layout
function HighlightedSuggestionText(o) {
  let $ = w(13),
    {
      text: text,
      query: query,
      color: color,
      isSelected: isSelected,
      bold: bold,
      contiguousOnly: contiguousOnly,
    } = o,
    f,
    h;
  if (
    $[0] !== bold ||
    $[1] !== color ||
    $[2] !== contiguousOnly ||
    $[3] !== isSelected ||
    $[4] !== query ||
    $[5] !== text
  ) {
    h = EARLY_RETURN_SENTINEL;
    g: {
      let u = query ? findContiguousMatch(text, query, contiguousOnly) : [];
      if (u.length === 0) {
        const b = !isSelected;
        let C;
        if ($[8] !== bold || $[9] !== color || $[10] !== b || $[11] !== text)
          ((C = e(Text, { color: color, dimColor: b, bold: bold, children: text })),
            ($[8] = bold),
            ($[9] = color),
            ($[10] = b),
            ($[11] = text),
            ($[12] = C));
        else C = $[12];
        h = C;
        break g;
      }
      let W = [];
      let M = (B, Y, H) => {
        if (B >= Y) {
          return;
        }
        W.push(
          e(
            Text,
            { color: color, dimColor: !H && !isSelected, bold: bold || H, children: text.slice(B, Y) },
            B,
          ),
        );
      };
      let I = 0;
      for (const [O, L] of u) (M(I, O, !1), M(O, L, !0), (I = L));
      M(I, text.length, !1);
      f = e(Fragment, { children: W });
    }
    (($[0] = bold),
      ($[1] = color),
      ($[2] = contiguousOnly),
      ($[3] = isSelected),
      ($[4] = query),
      ($[5] = text),
      ($[6] = f),
      ($[7] = h));
  } else ((f = $[6]), (h = $[7]));
  if (h !== EARLY_RETURN_SENTINEL) return h;
  return f;
}
//@ chunk-8jypjjdf.js:3288-3417 layout = getIcon (0.839)
function getIcon_2(itemId) {
  return (
    itemId.startsWith("file-") ||
    itemId.startsWith("mcp-resource-") ||
    itemId.startsWith("mcp-template") ||
    itemId.startsWith("agent-")
  );
}
//@ chunk-8jypjjdf.js:3417-8103 fingerprint = SuggestionItemRow (0.575)
var SuggestionItemRow = Rh(function (t0) {
  let $ = w(101),
    { item: item, maxColumnWidth: maxColumnWidth, isSelected: isSelected, allowWrap: allowWrap } = t0,
    p = allowWrap === void 0 ? !0 : allowWrap,
    columns = useTerminalSize().columns,
    f = useIsScreenReaderEnabled(),
    isUnified = getIcon_2(item.id),
    b;
  if ($[0] !== item.id) ((b = item.id.startsWith("emoji:")), ($[0] = item.id), ($[1] = b));
  else b = $[1];
  let C = b,
    g = f && !C ? "" : isSelected ? `${re.pointer} ` : "  ",
    W = bunStringWidth(g);
  if (isUnified) {
    let B;
    if ($[2] !== item.id) ((B = getIcon(item.id)), ($[2] = item.id), ($[3] = B));
    else B = $[3];
    let Y = B;
    let H = isSelected ? "suggestion" : void 0;
    let dimColor = !isSelected;
    let isFile = item.id.startsWith("file-");
    let isMcpResource = item.id.startsWith("mcp-resource-");
    let L;
    if ($[4] !== item.id) ((L = item.id.startsWith("mcp-template-value::")), ($[4] = item.id), ($[5] = L));
    else L = $[5];
    let q = L;
    let startsWith = item.id.startsWith("mcp-template::");
    let K = item.description ? 3 : 0;
    let k;
    if (isFile || startsWith || q) {
      let R;
      if ($[6] !== item.description)
        ((R = item.description ? Math.min(20, bunStringWidth(item.description)) : 0),
          ($[6] = item.description),
          ($[7] = R));
      else R = $[7];
      let v = R;
      let F = columns - W - 2 - 4 - K - v;
      let J;
      if ($[8] !== q || $[9] !== item.displayText || $[10] !== F)
        ((J = q ? truncateStartToWidth(item.displayText, F) : truncatePathMiddle(item.displayText, F)),
          ($[8] = q),
          ($[9] = item.displayText),
          ($[10] = F),
          ($[11] = J));
      else J = $[11];
      k = J;
    } else if (isMcpResource) {
      let R;
      if ($[12] !== item.displayText)
        ((R = truncateToWidth(item.displayText, 30)), ($[12] = item.displayText), ($[13] = R));
      else R = $[13];
      k = R;
    } else k = item.displayText;
    let ce = columns - W - 2 - bunStringWidth(k) - K - 4;
    let it;
    if (item.description) {
      let maxDescLength = Math.max(0, ce);
      let R;
      if ($[14] !== item.description || $[15] !== maxDescLength)
        ((R = truncateToWidth(item.description.replace(xt, " "), maxDescLength)),
          ($[14] = item.description),
          ($[15] = maxDescLength),
          ($[16] = R));
      else R = $[16];
      let de = R;
      it = `${g}${Y} ${k} \u2013 ${de}`;
    } else it = `${g}${Y} ${k}`;
    let R;
    if ($[17] !== dimColor || $[18] !== it || $[19] !== H)
      ((R = e(Text, { color: H, dimColor: dimColor, wrap: "truncate", children: it })),
        ($[17] = dimColor),
        ($[18] = it),
        ($[19] = H),
        ($[20] = R));
    else R = $[20];
    return R;
  }
  let T = item.description || item.tag || item.kind !== void 0 || item.sourceTag,
    U = maxColumnWidth ?? bunStringWidth(item.displayText) + 5,
    B;
  if ($[21] !== U || $[22] !== columns || $[23] !== T || $[24] !== f || $[25] !== item)
    ((B = T ? ee(item, columns, U, f) : Math.min(U, columns - 4)),
      ($[21] = U),
      ($[22] = columns),
      ($[23] = T),
      ($[24] = f),
      ($[25] = item),
      ($[26] = B));
  else B = $[26];
  let V = B,
    D = item.color || (isSelected ? "suggestion" : void 0),
    shouldDim = !isSelected,
    E = C && isSelected,
    Tt = V - 2 - (T && !C ? W : 0),
    displayText_0 = item.displayText;
  if (bunStringWidth(displayText_0) > Tt) {
    let L;
    if ($[27] !== displayText_0 || $[28] !== Tt)
      ((L =
        displayText_0.includes("/") || displayText_0.includes("\\")
          ? truncateStartToWidth(displayText_0, Tt)
          : truncateToWidth(displayText_0, Tt)),
        ($[27] = displayText_0),
        ($[28] = Tt),
        ($[29] = L));
    else L = $[29];
    displayText_0 = L;
  }
  let L;
  if ($[30] !== V || $[31] !== displayText_0 || $[32] !== W)
    ((L = " ".repeat(Math.max(0, V - bunStringWidth(displayText_0) - W))),
      ($[30] = V),
      ($[31] = displayText_0),
      ($[32] = W),
      ($[33] = L));
  else L = $[33];
  let St = L,
    lt = item.tag ? `[${item.tag}] ` : "",
    tagWidth = bunStringWidth(lt),
    at,
    et,
    ot,
    R,
    J;
  if ($[34] !== item) {
    let {
      kindLaneText: kindLaneText,
      kindLabel: kindLabel,
      sourceText: sourceText,
    } = suggestionKindLabels(item);
    et = kindLaneText;
    ot = sourceText;
    at = kindLabel === "skill" ? "skill" : kindLabel === "agent" ? "background" : void 0;
    R = bunStringWidth(et);
    J = bunStringWidth(ot);
    (($[34] = item), ($[35] = at), ($[36] = et), ($[37] = ot), ($[38] = R), ($[39] = J));
  } else ((at = $[35]), (et = $[36]), (ot = $[37]), (R = $[38]), (J = $[39]));
  let Ft = R + J,
    descriptionWidth = Math.max(0, columns - V - tagWidth - Ft - 4),
    Rt,
    Wt,
    Mt,
    Bt,
    kt;
  if (
    $[40] !== p ||
    $[41] !== E ||
    $[42] !== columns ||
    $[43] !== descriptionWidth ||
    $[44] !== V ||
    $[45] !== displayText_0 ||
    $[46] !== isSelected ||
    $[47] !== item.description ||
    $[48] !== item.query ||
    $[49] !== at ||
    $[50] !== et ||
    $[51] !== Ft ||
    $[52] !== St ||
    $[53] !== g ||
    $[54] !== shouldDim ||
    $[55] !== ot ||
    $[56] !== lt ||
    $[57] !== tagWidth ||
    $[58] !== D
  ) {
    kt = EARLY_RETURN_SENTINEL;
    Ln: {
      let co = item.description ? item.description.replace(xt, " ").trim() : "";
      let [nr, po] = p ? splitAtWordWidth(co, descriptionWidth) : [truncateToWidth(co, descriptionWidth), ""];
      Rt = isSelected ? "suggestion" : void 0;
      let ct;
      if ($[64] !== E || $[65] !== g || $[66] !== shouldDim || $[67] !== D)
        ((ct = g ? e(Text, { color: D, dimColor: shouldDim, bold: E, children: g }) : null),
          ($[64] = E),
          ($[65] = g),
          ($[66] = shouldDim),
          ($[67] = D),
          ($[68] = ct));
      else ct = $[68];
      let dt;
      if (
        $[69] !== E ||
        $[70] !== displayText_0 ||
        $[71] !== isSelected ||
        $[72] !== item.query ||
        $[73] !== D
      )
        ((dt = e(HighlightedSuggestionText, {
          text: displayText_0,
          query: item.query,
          color: D,
          isSelected: isSelected,
          bold: E,
        })),
          ($[69] = E),
          ($[70] = displayText_0),
          ($[71] = isSelected),
          ($[72] = item.query),
          ($[73] = D),
          ($[74] = dt));
      else dt = $[74];
      let pt;
      if ($[75] !== E || $[76] !== St || $[77] !== shouldDim || $[78] !== D)
        ((pt = e(Text, { color: D, dimColor: shouldDim, bold: E, children: St })),
          ($[75] = E),
          ($[76] = St),
          ($[77] = shouldDim),
          ($[78] = D),
          ($[79] = pt));
      else pt = $[79];
      let Lt;
      if ($[80] !== at || $[81] !== et)
        ((Lt = et ? e(Text, { color: at, dimColor: at === void 0, children: et }) : null),
          ($[80] = at),
          ($[81] = et),
          ($[82] = Lt));
      else Lt = $[82];
      let uo;
      if ($[83] !== lt)
        ((uo = lt ? e(Text, { dimColor: !0, children: lt }) : null), ($[83] = lt), ($[84] = uo));
      else uo = $[84];
      let mo;
      if ($[85] !== ot)
        ((mo = ot ? e(Text, { dimColor: !0, children: ot }) : null), ($[85] = ot), ($[86] = mo));
      else mo = $[86];
      Wt = r(Text, {
        wrap: "truncate",
        children: [
          ct,
          dt,
          pt,
          Lt,
          uo,
          mo,
          e(HighlightedSuggestionText, {
            text: nr,
            query: item.query,
            color: Rt,
            isSelected: isSelected,
            bold: E,
            contiguousOnly: !0,
          }),
        ],
      });
      if (!po) {
        kt = Wt;
        break Ln;
      }
      Mt = V + tagWidth + Ft;
      Bt = truncateToWidth(po, Math.max(0, columns - Mt - 4));
    }
    (($[40] = p),
      ($[41] = E),
      ($[42] = columns),
      ($[43] = descriptionWidth),
      ($[44] = V),
      ($[45] = displayText_0),
      ($[46] = isSelected),
      ($[47] = item.description),
      ($[48] = item.query),
      ($[49] = at),
      ($[50] = et),
      ($[51] = Ft),
      ($[52] = St),
      ($[53] = g),
      ($[54] = shouldDim),
      ($[55] = ot),
      ($[56] = lt),
      ($[57] = tagWidth),
      ($[58] = D),
      ($[59] = Rt),
      ($[60] = Wt),
      ($[61] = Mt),
      ($[62] = Bt),
      ($[63] = kt));
  } else ((Rt = $[59]), (Wt = $[60]), (Mt = $[61]), (Bt = $[62]), (kt = $[63]));
  if (kt !== EARLY_RETURN_SENTINEL) return kt;
  let pe = Bt,
    ct;
  if ($[87] !== Mt) ((ct = " ".repeat(Mt)), ($[87] = Mt), ($[88] = ct));
  else ct = $[88];
  let dt;
  if ($[89] !== E || $[90] !== Rt || $[91] !== pe || $[92] !== isSelected || $[93] !== item.query)
    ((dt = e(HighlightedSuggestionText, {
      text: pe,
      query: item.query,
      color: Rt,
      isSelected: isSelected,
      bold: E,
      contiguousOnly: !0,
    })),
      ($[89] = E),
      ($[90] = Rt),
      ($[91] = pe),
      ($[92] = isSelected),
      ($[93] = item.query),
      ($[94] = dt));
  else dt = $[94];
  let pt;
  if ($[95] !== dt || $[96] !== ct)
    ((pt = r(Text, { wrap: "truncate", children: [ct, dt] })), ($[95] = dt), ($[96] = ct), ($[97] = pt));
  else pt = $[97];
  let Lt;
  if ($[98] !== Wt || $[99] !== pt)
    ((Lt = r(Box, { flexDirection: "column", children: [Wt, pt] })),
      ($[98] = Wt),
      ($[99] = pt),
      ($[100] = Lt));
  else Lt = $[100];
  return Lt;
});
/**
 * 建议列表：根据终端宽高计算可见窗口，按类型（命令/文件/MCP/agent/emoji）渲染 SuggestionItemRow，选中项高亮。
 */
//@ chunk-8jypjjdf.js:8103-9644 fingerprint = PromptInputFooterSuggestions (0.494)
function PromptInputFooterSuggestions({
  suggestions: suggestions,
  selectedSuggestion: selectedSuggestion,
  maxColumnWidth: maxColumnWidth,
  emptyMessage: emptyMessage,
  overlay: overlay,
  noPad: noPad,
  onSelect: onSelect,
  hoveredId: hoveredId,
  onHoverChange: onHoverChange,
  cursorRowId: cursorRowId,
  keepWindow: keepWindow = !1,
}) {
  let { rows: rows, columns: columns } = useTerminalSize(),
    g = useIsScreenReaderEnabled(),
    W = useStrayClickGuard(),
    B = Q(
      () =>
        maxColumnWidth ??
        suggestions.reduce((T, U) => Math.max(T, bunStringWidth(sLn(U.displayText))), 0) + 5,
      [suggestions, maxColumnWidth],
    ),
    [Y, H] = y(null),
    M = overlay
      ? MAX_VISIBLE_SUGGESTIONS
      : Math.max(1, Math.min(Math.max(6, Math.floor(rows / 2)), rows - 3));
  if (suggestions.length === 0) {
    if (!emptyMessage) return null;
    let T = noPad ? 0 : Math.max(0, M - 1);
    return r(Box, {
      flexDirection: "column",
      justifyContent: overlay ? void 0 : "flex-end",
      children: [
        e(HintText, { children: emptyMessage }),
        Array.from({ length: T }, (U, V) => e(Text, { children: " " }, `pad-${V}`)),
      ],
    });
  }
  let max = Math.max(0, Math.min(selectedSuggestion, suggestions.length - 1)),
    max_2 = Math.max(0, max - M),
    mapped = suggestions.slice(max_2, max + M + 1).map(sanitizeSuggestion),
    q = M >= 2,
    mapped_2 = mapped.map((T) => (q ? suggestionRowHeight(T, columns, B, g) : 1)),
    K = max - max_2,
    maxColumnWidth_2 = K,
    R = K + 1,
    v = mapped_2[K] ?? 1,
    F = 0,
    floored = Math.floor(M / 2);
  while (maxColumnWidth_2 > 0 && v < M && F + (mapped_2[maxColumnWidth_2 - 1] ?? 1) <= floored)
    (maxColumnWidth_2--, (F += mapped_2[maxColumnWidth_2] ?? 1));
  v += F;
  while (R < mapped.length && v + (mapped_2[R] ?? 1) <= M) ((v += mapped_2[R] ?? 1), R++);
  while (maxColumnWidth_2 > 0 && v + (mapped_2[maxColumnWidth_2 - 1] ?? 1) <= M)
    (maxColumnWidth_2--, (v += mapped_2[maxColumnWidth_2] ?? 1));
  if (keepWindow) {
    let T = suggestionWindow(mapped_2, M, K, (Y ?? max_2 + maxColumnWidth_2) - max_2);
    if (((maxColumnWidth_2 = T.start), (R = T.end), (v = T.usedRows), max_2 + maxColumnWidth_2 !== Y))
      H(max_2 + maxColumnWidth_2);
  }
  let visibleItems = mapped.slice(maxColumnWidth_2, R),
    it = noPad ? 0 : Math.max(0, M - v),
    Ct = suggestions[selectedSuggestion]?.id,
    de = hoveredId != null && suggestions.some((T) => T.id === hoveredId) ? hoveredId : void 0;
  return r(Box, {
    flexDirection: "column",
    justifyContent: overlay ? void 0 : "flex-end",
    onMouseLeave: onSelect ? () => onHoverChange?.(null) : void 0,
    children: [
      visibleItems.map((T, U) => {
        let V = max_2 + maxColumnWidth_2 + U,
          D = e(
            SuggestionItemRow,
            { item: T, maxColumnWidth: B, isSelected: T.id === (de ?? Ct), allowWrap: q },
            T.id,
          );
        if (cursorRowId != null && T.id === cursorRowId)
          return e(TwoColumnRow, { active: !0, children: D }, T.id);
        if (!onSelect) return D;
        return e(
          Box,
          {
            onMouseEnter: () => onHoverChange?.(T.id),
            onClick: (item_0) => {
              if (W(item_0)) return;
              onSelect(V, T.id);
            },
            children: D,
          },
          T.id,
        );
      }),
      Array.from({ length: it }, (T, U) => e(Text, { children: " " }, `pad-${U}`)),
    ],
  });
}
//@ chunk-8jypjjdf.js:9644-9660 placement
var Ryo = Rh(PromptInputFooterSuggestions);
//@ chunk-8jypjjdf.js:9660-9875 placement
function suggestionKindLabels(o) {
  let t = o.kind === void 0 || o.kind === "action" ? "" : o.kind === "info" ? "config" : o.kind,
    l = o.kind === void 0 ? "" : t + repeatString(" ", 7 - bunStringWidth(t)),
    c = o.sourceTag ? `[${o.sourceTag}] ` : "";
  return { kindLaneText: l, kindLabel: t, sourceText: c };
}
//@ chunk-8jypjjdf.js:9875-9945 placement
function ee(o, a, t, l) {
  let floored = Math.floor(a * 0.4);
  return t > floored ? floored + suggestionIndentWidth(o, a, l) : t;
}
//@ chunk-8jypjjdf.js:9945-10181 placement
function suggestionIndentWidth(o, a, t) {
  if (t || o.id.startsWith("emoji:")) return 0;
  let l = o.tag ? bunStringWidth(`[${o.tag}] `) : 0,
    { kindLaneText: kindLaneText, sourceText: sourceText } = suggestionKindLabels(o),
    p =
      a -
      Math.floor(a * 0.4) -
      l -
      bunStringWidth(kindLaneText) -
      bunStringWidth(sourceText) -
      4 -
      (o.description ? 1 : 0),
    d = bunStringWidth(`${re.pointer} `);
  return p < 0 ? d : Math.min(d, p);
}
//@ chunk-8jypjjdf.js:10181-10434 placement
function suggestionRowHeight(o, a, t, l) {
  if (getIcon_2(o.id) || !o.description) return 1;
  let c = ee(o, a, t, l),
    m = o.tag ? bunStringWidth(`[${o.tag}] `) : 0,
    { kindLaneText: kindLaneText, sourceText: sourceText } = suggestionKindLabels(o),
    max = Math.max(0, a - c - m - bunStringWidth(kindLaneText) - bunStringWidth(sourceText) - 4);
  if (max <= 0) return 1;
  let trimmed = o.description.replace(xt, " ").trim();
  return bunStringWidth(trimmed) > max ? 2 : 1;
}
//@ chunk-8jypjjdf.js:10434-10695 placement
function sanitizeSuggestion(o) {
  let a = sLn(o.displayText),
    t = o.description && Dr(o.description),
    l = o.tag && Dr(o.tag),
    c = o.sourceTag && Dr(o.sourceTag);
  if (a === o.displayText && t === o.description && l === o.tag && c === o.sourceTag) return o;
  return { ...o, displayText: a, description: t, tag: l, sourceTag: c };
}
//@ chunk-8jypjjdf.js:10695-10900 placement
function splitAtWordWidth(o, a) {
  if (a <= 0 || bunStringWidth(o) <= a) return [o, ""];
  let t = truncateToWidthNoEllipsis(o, a),
    sliced = o.slice(t.length);
  if (sliced.startsWith(" ")) return [t, sliced.trimStart()];
  let index = t.lastIndexOf(" ");
  if (index > 0) return [t.slice(0, index), o.slice(index + 1)];
  return [t, sliced];
}
//@ chunk-8jypjjdf.js:10900-10926 placement
var NON_LATIN_PATTERN = /[^\u0020-\u02ff]/;
//@ chunk-8jypjjdf.js:10926-11218 placement = findWordObject (1)
function snapRangesToGraphemes(o, a) {
  if (a.length === 0 || !NON_LATIN_PATTERN.test(o)) return a;
  let t = new Set();
  for (let { index: index } of getGraphemeSegmenter().segment(o)) t.add(index);
  let graphemes = [];
  for (let [c, m] of a) {
    let p = c;
    while (p > 0 && !t.has(p)) p--;
    let d = m;
    while (d < o.length && !t.has(d)) d++;
    let at = graphemes.at(-1);
    if (at && p <= at[1]) at[1] = Math.max(at[1], d);
    else graphemes.push([p, d]);
  }
  return graphemes;
}

export { getArrowedSuggestionId, PromptInputFooterSuggestions, Ryo };
