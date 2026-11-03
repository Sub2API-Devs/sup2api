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
import {
  jsxProd_default,
  Fragment,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Rh, Q, y } from "../../../vendor/react/cjs/react.production.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import {
  truncateStartToWidth,
  truncatePathMiddle,
  truncateToWidth,
  truncateToWidthNoEllipsis,
} from "../../utils/format.js";
import { useStrayClickGuard } from "../CustomSelect/strayClickGuard.js";
import { stripLineBreaks, repeatString, collapseWhitespace } from "../../utils/stringUtils.js";
import { HintText } from "../design-system/HintText.js";
import { TwoColumnRow } from "../CustomSelect/select.js";
import { getGraphemeSegmenter } from "../../utils/intl.js";

//@ chunk-8jypjjdf.js:1642-1656 placement
var WHITESPACE_RE = /\s+/g;
//@ chunk-8jypjjdf.js:1656-1767 placement
/**
 * 当前方向键选中的建议 id（与选中项一致时）。
 */
function getArrowedSuggestionId(o) {
  let arrowedSuggestionId = o.arrowedSuggestionId;
  return arrowedSuggestionId != null && o.suggestions[o.selectedSuggestion]?.id === arrowedSuggestionId
    ? arrowedSuggestionId
    : null;
}
//@ chunk-8jypjjdf.js:1767-2112 layout
/**
 * 计算建议列表的可见窗口：各项高度不一，在最大行数内从上次起点出发保证选中项可见，并尽量向上填满。
 */
function suggestionWindow(o, a, t, l) {
  let c = (d) => o[d] ?? 1;
  let m = (d) => {
    let f = d + 1;
    let h = c(d);
    while (f < o.length && h + c(f) <= a) {
      h += c(f);
      f++;
    }
    return {
      start: d,
      end: f,
      usedRows: h,
    };
  };
  let p = m(Math.max(0, Math.min(l, o.length - 1)));
  if (t >= p.end) p = m(t);
  else if (t < p.start)
    p = {
      start: t,
      end: t + 1,
      usedRows: c(t),
    };
  while (p.start > 0 && p.usedRows + c(p.start - 1) <= a) {
    p.start--;
    p.usedRows += c(p.start);
  }
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
function findContiguousMatch(text, query, contiguousOnly = false) {
  let lower = text.toLowerCase();
  if (lower.length !== text.length) return [];
  let index = lower.indexOf(query);
  if (index !== -1) return snapRangesToGraphemes(text, [[index, index + query.length]]);
  if (contiguousOnly) return [];
  let m = [];
  let p = 0;
  for (let d of query) {
    let index = lower.indexOf(d, p);
    if (index === -1) return [];
    let h = index + d.length;
    let last = m.at(-1);
    if (last && last[1] === index) last[1] = h;
    else m.push([index, h]);
    p = h;
  }
  return snapRangesToGraphemes(text, m);
}
//@ chunk-8jypjjdf.js:2608-3288 layout
function HighlightedSuggestionText(props) {
  let $ = w(13);
  let { text, query, color, isSelected, bold, contiguousOnly } = props;
  let f;
  let h;
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
        const dimColor = !isSelected;
        let C;
        if ($[8] !== bold || $[9] !== color || $[10] !== dimColor || $[11] !== text) {
          C = jsxProd_default(Text, {
            color,
            dimColor,
            bold,
            children: text,
          });
          $[8] = bold;
          $[9] = color;
          $[10] = dimColor;
          $[11] = text;
          $[12] = C;
        } else C = $[12];
        h = C;
        break g;
      }
      let W = [];
      let M = (B, Y, H) => {
        if (B >= Y) {
          return;
        }
        W.push(
          jsxProd_default(
            Text,
            {
              color,
              dimColor: !H && !isSelected,
              bold: bold || H,
              children: text.slice(B, Y),
            },
            B,
          ),
        );
      };
      let I = 0;
      for (const [O, L] of u) {
        M(I, O, false);
        M(O, L, true);
        I = L;
      }
      M(I, text.length, false);
      f = jsxProd_default(Fragment, {
        children: W,
      });
    }
    $[0] = bold;
    $[1] = color;
    $[2] = contiguousOnly;
    $[3] = isSelected;
    $[4] = query;
    $[5] = text;
    $[6] = f;
    $[7] = h;
  } else {
    f = $[6];
    h = $[7];
  }
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
var SuggestionItemRow = Rh(function (props) {
  let $ = w(101);
  let { item, maxColumnWidth, isSelected, allowWrap } = props;
  let p = allowWrap === undefined ? true : allowWrap;
  let columns = useTerminalSize().columns;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let isUnified = getIcon_2(item.id);
  let b;
  if ($[0] !== item.id) {
    b = item.id.startsWith("emoji:");
    $[0] = item.id;
    $[1] = b;
  } else b = $[1];
  let C = b;
  let g = isScreenReaderEnabled && !C ? "" : isSelected ? `${figures_default.pointer} ` : "  ";
  let W = bunStringWidth(g);
  if (isUnified) {
    let B;
    if ($[2] !== item.id) {
      B = getIcon(item.id);
      $[2] = item.id;
      $[3] = B;
    } else B = $[3];
    let Y = B;
    let textColor = isSelected ? "suggestion" : undefined;
    let dimColor = !isSelected;
    let isFile = item.id.startsWith("file-");
    let isMcpResource = item.id.startsWith("mcp-resource-");
    let L;
    if ($[4] !== item.id) {
      L = item.id.startsWith("mcp-template-value::");
      $[4] = item.id;
      $[5] = L;
    } else L = $[5];
    let q = L;
    let A = item.id.startsWith("mcp-template::");
    let K = item.description ? 3 : 0;
    let displayText;
    if (isFile || A || q) {
      let R;
      if ($[6] !== item.description) {
        R = item.description ? Math.min(20, bunStringWidth(item.description)) : 0;
        $[6] = item.description;
        $[7] = R;
      } else R = $[7];
      let descReserve = R;
      let maxPathLength = columns - W - 2 - 4 - K - descReserve;
      let J;
      if ($[8] !== q || $[9] !== item.displayText || $[10] !== maxPathLength) {
        J = q
          ? truncateStartToWidth(item.displayText, maxPathLength)
          : truncatePathMiddle(item.displayText, maxPathLength);
        $[8] = q;
        $[9] = item.displayText;
        $[10] = maxPathLength;
        $[11] = J;
      } else J = $[11];
      displayText = J;
    } else if (isMcpResource) {
      let R;
      if ($[12] !== item.displayText) {
        R = truncateToWidth(item.displayText, 30);
        $[12] = item.displayText;
        $[13] = R;
      } else R = $[13];
      displayText = R;
    } else displayText = item.displayText;
    let availableWidth = columns - W - 2 - bunStringWidth(displayText) - K - 4;
    let lineContent;
    if (item.description) {
      let maxDescLength = Math.max(0, availableWidth);
      let R;
      if ($[14] !== item.description || $[15] !== maxDescLength) {
        R = truncateToWidth(item.description.replace(WHITESPACE_RE, " "), maxDescLength);
        $[14] = item.description;
        $[15] = maxDescLength;
        $[16] = R;
      } else R = $[16];
      let truncatedDesc = R;
      lineContent = `${g}${Y} ${displayText} \u2013 ${truncatedDesc}`;
    } else lineContent = `${g}${Y} ${displayText}`;
    let R;
    if ($[17] !== dimColor || $[18] !== lineContent || $[19] !== textColor) {
      R = jsxProd_default(Text, {
        color: textColor,
        dimColor,
        wrap: "truncate",
        children: lineContent,
      });
      $[17] = dimColor;
      $[18] = lineContent;
      $[19] = textColor;
      $[20] = R;
    } else R = $[20];
    return R;
  }
  let T = item.description || item.tag || item.kind !== undefined || item.sourceTag;
  let U = maxColumnWidth ?? bunStringWidth(item.displayText) + 5;
  let B;
  if ($[21] !== U || $[22] !== columns || $[23] !== T || $[24] !== isScreenReaderEnabled || $[25] !== item) {
    B = T ? fitSuggestionWidth(item, columns, U, isScreenReaderEnabled) : Math.min(U, columns - 4);
    $[21] = U;
    $[22] = columns;
    $[23] = T;
    $[24] = isScreenReaderEnabled;
    $[25] = item;
    $[26] = B;
  } else B = $[26];
  let V = B;
  let color = item.color || (isSelected ? "suggestion" : undefined);
  let shouldDim = !isSelected;
  let bold = C && isSelected;
  let Tt = V - 2 - (T && !C ? W : 0);
  let displayText_0 = item.displayText;
  if (bunStringWidth(displayText_0) > Tt) {
    let L;
    if ($[27] !== displayText_0 || $[28] !== Tt) {
      L =
        displayText_0.includes("/") || displayText_0.includes("\\")
          ? truncateStartToWidth(displayText_0, Tt)
          : truncateToWidth(displayText_0, Tt);
      $[27] = displayText_0;
      $[28] = Tt;
      $[29] = L;
    } else L = $[29];
    displayText_0 = L;
  }
  let L;
  if ($[30] !== V || $[31] !== displayText_0 || $[32] !== W) {
    L = " ".repeat(Math.max(0, V - bunStringWidth(displayText_0) - W));
    $[30] = V;
    $[31] = displayText_0;
    $[32] = W;
    $[33] = L;
  } else L = $[33];
  let children = L;
  let lt = item.tag ? `[${item.tag}] ` : "";
  let tagWidth = bunStringWidth(lt);
  let at;
  let et;
  let ot;
  let R;
  let J;
  if ($[34] !== item) {
    let { kindLaneText, kindLabel, sourceText } = suggestionKindLabels(item);
    et = kindLaneText;
    ot = sourceText;
    at = kindLabel === "skill" ? "skill" : kindLabel === "agent" ? "background" : undefined;
    R = bunStringWidth(et);
    J = bunStringWidth(ot);
    $[34] = item;
    $[35] = at;
    $[36] = et;
    $[37] = ot;
    $[38] = R;
    $[39] = J;
  } else {
    at = $[35];
    et = $[36];
    ot = $[37];
    R = $[38];
    J = $[39];
  }
  let Ft = R + J;
  let descriptionWidth = Math.max(0, columns - V - tagWidth - Ft - 4);
  let color_2;
  let Wt;
  let Mt;
  let Bt;
  let kt;
  if (
    $[40] !== p ||
    $[41] !== bold ||
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
    $[52] !== children ||
    $[53] !== g ||
    $[54] !== shouldDim ||
    $[55] !== ot ||
    $[56] !== lt ||
    $[57] !== tagWidth ||
    $[58] !== color
  ) {
    kt = EARLY_RETURN_SENTINEL;
    Ln: {
      let co = item.description ? item.description.replace(WHITESPACE_RE, " ").trim() : "";
      let [nr, po] = p ? splitAtWordWidth(co, descriptionWidth) : [truncateToWidth(co, descriptionWidth), ""];
      color_2 = isSelected ? "suggestion" : undefined;
      let ct;
      if ($[64] !== bold || $[65] !== g || $[66] !== shouldDim || $[67] !== color) {
        ct = g
          ? jsxProd_default(Text, {
              color,
              dimColor: shouldDim,
              bold,
              children: g,
            })
          : null;
        $[64] = bold;
        $[65] = g;
        $[66] = shouldDim;
        $[67] = color;
        $[68] = ct;
      } else ct = $[68];
      let dt;
      if (
        $[69] !== bold ||
        $[70] !== displayText_0 ||
        $[71] !== isSelected ||
        $[72] !== item.query ||
        $[73] !== color
      ) {
        dt = jsxProd_default(HighlightedSuggestionText, {
          text: displayText_0,
          query: item.query,
          color,
          isSelected,
          bold,
        });
        $[69] = bold;
        $[70] = displayText_0;
        $[71] = isSelected;
        $[72] = item.query;
        $[73] = color;
        $[74] = dt;
      } else dt = $[74];
      let pt;
      if ($[75] !== bold || $[76] !== children || $[77] !== shouldDim || $[78] !== color) {
        pt = jsxProd_default(Text, {
          color,
          dimColor: shouldDim,
          bold,
          children,
        });
        $[75] = bold;
        $[76] = children;
        $[77] = shouldDim;
        $[78] = color;
        $[79] = pt;
      } else pt = $[79];
      let Lt;
      if ($[80] !== at || $[81] !== et) {
        Lt = et
          ? jsxProd_default(Text, {
              color: at,
              dimColor: at === undefined,
              children: et,
            })
          : null;
        $[80] = at;
        $[81] = et;
        $[82] = Lt;
      } else Lt = $[82];
      let uo;
      if ($[83] !== lt) {
        uo = lt
          ? jsxProd_default(Text, {
              dimColor: true,
              children: lt,
            })
          : null;
        $[83] = lt;
        $[84] = uo;
      } else uo = $[84];
      let mo;
      if ($[85] !== ot) {
        mo = ot
          ? jsxProd_default(Text, {
              dimColor: true,
              children: ot,
            })
          : null;
        $[85] = ot;
        $[86] = mo;
      } else mo = $[86];
      Wt = jsxProd_default_2(Text, {
        wrap: "truncate",
        children: [
          ct,
          dt,
          pt,
          Lt,
          uo,
          mo,
          jsxProd_default(HighlightedSuggestionText, {
            text: nr,
            query: item.query,
            color: color_2,
            isSelected,
            bold,
            contiguousOnly: true,
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
    $[40] = p;
    $[41] = bold;
    $[42] = columns;
    $[43] = descriptionWidth;
    $[44] = V;
    $[45] = displayText_0;
    $[46] = isSelected;
    $[47] = item.description;
    $[48] = item.query;
    $[49] = at;
    $[50] = et;
    $[51] = Ft;
    $[52] = children;
    $[53] = g;
    $[54] = shouldDim;
    $[55] = ot;
    $[56] = lt;
    $[57] = tagWidth;
    $[58] = color;
    $[59] = color_2;
    $[60] = Wt;
    $[61] = Mt;
    $[62] = Bt;
    $[63] = kt;
  } else {
    color_2 = $[59];
    Wt = $[60];
    Mt = $[61];
    Bt = $[62];
    kt = $[63];
  }
  if (kt !== EARLY_RETURN_SENTINEL) return kt;
  let text = Bt;
  let ct;
  if ($[87] !== Mt) {
    ct = " ".repeat(Mt);
    $[87] = Mt;
    $[88] = ct;
  } else ct = $[88];
  let dt;
  if ($[89] !== bold || $[90] !== color_2 || $[91] !== text || $[92] !== isSelected || $[93] !== item.query) {
    dt = jsxProd_default(HighlightedSuggestionText, {
      text,
      query: item.query,
      color: color_2,
      isSelected,
      bold,
      contiguousOnly: true,
    });
    $[89] = bold;
    $[90] = color_2;
    $[91] = text;
    $[92] = isSelected;
    $[93] = item.query;
    $[94] = dt;
  } else dt = $[94];
  let pt;
  if ($[95] !== dt || $[96] !== ct) {
    pt = jsxProd_default_2(Text, {
      wrap: "truncate",
      children: [ct, dt],
    });
    $[95] = dt;
    $[96] = ct;
    $[97] = pt;
  } else pt = $[97];
  let Lt;
  if ($[98] !== Wt || $[99] !== pt) {
    Lt = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [Wt, pt],
    });
    $[98] = Wt;
    $[99] = pt;
    $[100] = Lt;
  } else Lt = $[100];
  return Lt;
});
//@ chunk-8jypjjdf.js:8103-9644 fingerprint = PromptInputFooterSuggestions (0.494)
/**
 * 建议列表：根据终端宽高计算可见窗口，按类型（命令/文件/MCP/agent/emoji）渲染 SuggestionItemRow，选中项高亮。
 */
function PromptInputFooterSuggestions({
  suggestions,
  selectedSuggestion,
  maxColumnWidth,
  emptyMessage,
  overlay,
  noPad,
  onSelect,
  hoveredId,
  onHoverChange,
  cursorRowId,
  keepWindow = false,
}) {
  let { rows, columns } = useTerminalSize();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let strayClickGuard = useStrayClickGuard();
  let B = Q(
    () =>
      maxColumnWidth ??
      suggestions.reduce(
        (acc, suggestion) => Math.max(acc, bunStringWidth(stripLineBreaks(suggestion.displayText))),
        0,
      ) + 5,
    [suggestions, maxColumnWidth],
  );
  let [Y, H] = y(null);
  let M = overlay
    ? MAX_VISIBLE_SUGGESTIONS
    : Math.max(1, Math.min(Math.max(6, Math.floor(rows / 2)), rows - 3));
  if (suggestions.length === 0) {
    if (!emptyMessage) return null;
    let T = noPad ? 0 : Math.max(0, M - 1);
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      justifyContent: overlay ? undefined : "flex-end",
      children: [
        jsxProd_default(HintText, {
          children: emptyMessage,
        }),
        Array.from(
          {
            length: T,
          },
          (U, V) =>
            jsxProd_default(
              Text,
              {
                children: " ",
              },
              `pad-${V}`,
            ),
        ),
      ],
    });
  }
  let max = Math.max(0, Math.min(selectedSuggestion, suggestions.length - 1));
  let max_2 = Math.max(0, max - M);
  let mapped = suggestions.slice(max_2, max + M + 1).map(sanitizeSuggestion);
  let q = M >= 2;
  let mapped_2 = mapped.map((T) => (q ? suggestionRowHeight(T, columns, B, isScreenReaderEnabled) : 1));
  let K = max - max_2;
  let maxColumnWidth_2 = K;
  let R = K + 1;
  let v = mapped_2[K] ?? 1;
  let F = 0;
  let floored = Math.floor(M / 2);
  while (maxColumnWidth_2 > 0 && v < M && F + (mapped_2[maxColumnWidth_2 - 1] ?? 1) <= floored) {
    maxColumnWidth_2--;
    F += mapped_2[maxColumnWidth_2] ?? 1;
  }
  v += F;
  while (R < mapped.length && v + (mapped_2[R] ?? 1) <= M) {
    v += mapped_2[R] ?? 1;
    R++;
  }
  while (maxColumnWidth_2 > 0 && v + (mapped_2[maxColumnWidth_2 - 1] ?? 1) <= M) {
    maxColumnWidth_2--;
    v += mapped_2[maxColumnWidth_2] ?? 1;
  }
  if (keepWindow) {
    let T = suggestionWindow(mapped_2, M, K, (Y ?? max_2 + maxColumnWidth_2) - max_2);
    maxColumnWidth_2 = T.start;
    R = T.end;
    v = T.usedRows;
    if (max_2 + maxColumnWidth_2 !== Y) H(max_2 + maxColumnWidth_2);
  }
  let visibleItems = mapped.slice(maxColumnWidth_2, R);
  let it = noPad ? 0 : Math.max(0, M - v);
  let id = suggestions[selectedSuggestion]?.id;
  let de =
    hoveredId != null && suggestions.some((suggestion) => suggestion.id === hoveredId)
      ? hoveredId
      : undefined;
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    justifyContent: overlay ? undefined : "flex-end",
    onMouseLeave: onSelect ? () => onHoverChange?.(null) : undefined,
    children: [
      visibleItems.map((visible, U) => {
        let V = max_2 + maxColumnWidth_2 + U;
        let D = jsxProd_default(
          SuggestionItemRow,
          {
            item: visible,
            maxColumnWidth: B,
            isSelected: visible.id === (de ?? id),
            allowWrap: q,
          },
          visible.id,
        );
        if (cursorRowId != null && visible.id === cursorRowId)
          return jsxProd_default(
            TwoColumnRow,
            {
              active: true,
              children: D,
            },
            visible.id,
          );
        if (!onSelect) return D;
        return jsxProd_default(
          Box,
          {
            onMouseEnter: () => onHoverChange?.(visible.id),
            onClick: (item_0) => {
              if (strayClickGuard(item_0)) return;
              onSelect(V, visible.id);
            },
            children: D,
          },
          visible.id,
        );
      }),
      Array.from(
        {
          length: it,
        },
        (T, U) =>
          jsxProd_default(
            Text,
            {
              children: " ",
            },
            `pad-${U}`,
          ),
      ),
    ],
  });
}
//@ chunk-8jypjjdf.js:9644-9660 placement
/**
 * 导出值：FooterSuggestionsMemo（memo 包装的建议列表）；位于「输入建议列表（命令/文件/MCP 资源/agent/emoji 等）：按类型取图标、高亮匹配字符、滚动窗口与对齐」模块。
 */
var FooterSuggestionsMemo = Rh(PromptInputFooterSuggestions);
//@ chunk-8jypjjdf.js:9660-9875 placement
function suggestionKindLabels(o) {
  let t = o.kind === undefined || o.kind === "action" ? "" : o.kind === "info" ? "config" : o.kind;
  let kindLaneText = o.kind === undefined ? "" : t + repeatString(" ", 7 - bunStringWidth(t));
  let sourceText = o.sourceTag ? `[${o.sourceTag}] ` : "";
  return {
    kindLaneText,
    kindLabel: t,
    sourceText,
  };
}
//@ chunk-8jypjjdf.js:9875-9945 placement
function fitSuggestionWidth(o, a, t, l) {
  let floored = Math.floor(a * 0.4);
  return t > floored ? floored + suggestionIndentWidth(o, a, l) : t;
}
//@ chunk-8jypjjdf.js:9945-10181 placement
function suggestionIndentWidth(o, a, t) {
  if (t || o.id.startsWith("emoji:")) return 0;
  let l = o.tag ? bunStringWidth(`[${o.tag}] `) : 0;
  let { kindLaneText, sourceText } = suggestionKindLabels(o);
  let p =
    a -
    Math.floor(a * 0.4) -
    l -
    bunStringWidth(kindLaneText) -
    bunStringWidth(sourceText) -
    4 -
    (o.description ? 1 : 0);
  let d = bunStringWidth(`${figures_default.pointer} `);
  return p < 0 ? d : Math.min(d, p);
}
//@ chunk-8jypjjdf.js:10181-10434 placement
function suggestionRowHeight(o, columns, t, isScreenReaderEnabled) {
  if (getIcon_2(o.id) || !o.description) return 1;
  let c = fitSuggestionWidth(o, columns, t, isScreenReaderEnabled);
  let m = o.tag ? bunStringWidth(`[${o.tag}] `) : 0;
  let { kindLaneText, sourceText } = suggestionKindLabels(o);
  let max = Math.max(0, columns - c - m - bunStringWidth(kindLaneText) - bunStringWidth(sourceText) - 4);
  if (max <= 0) return 1;
  let trimmed = o.description.replace(WHITESPACE_RE, " ").trim();
  return bunStringWidth(trimmed) > max ? 2 : 1;
}
//@ chunk-8jypjjdf.js:10434-10695 placement
function sanitizeSuggestion(o) {
  let a = stripLineBreaks(o.displayText);
  let t = o.description && collapseWhitespace(o.description);
  let l = o.tag && collapseWhitespace(o.tag);
  let c = o.sourceTag && collapseWhitespace(o.sourceTag);
  if (a === o.displayText && t === o.description && l === o.tag && c === o.sourceTag) return o;
  return {
    ...o,
    displayText: a,
    description: t,
    tag: l,
    sourceTag: c,
  };
}
//@ chunk-8jypjjdf.js:10695-10900 placement
function splitAtWordWidth(o, descriptionWidth) {
  if (descriptionWidth <= 0 || bunStringWidth(o) <= descriptionWidth) return [o, ""];
  let t = truncateToWidthNoEllipsis(o, descriptionWidth);
  let sliced = o.slice(t.length);
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
  for (let { index } of getGraphemeSegmenter().segment(o)) t.add(index);
  let graphemes = [];
  for (let [c, m] of a) {
    let p = c;
    while (p > 0 && !t.has(p)) p--;
    let d = m;
    while (d < o.length && !t.has(d)) d++;
    let last = graphemes.at(-1);
    if (last && p <= last[1]) last[1] = Math.max(last[1], d);
    else graphemes.push([p, d]);
  }
  return graphemes;
}
export { getArrowedSuggestionId, PromptInputFooterSuggestions, FooterSuggestionsMemo };
