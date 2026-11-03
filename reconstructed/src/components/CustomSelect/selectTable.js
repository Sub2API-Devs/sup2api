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
import { Se, R, y, Fy, isValidElement_default } from "../../../vendor/react/cjs/react.production.js";
import { TerminalSizeContext } from "../../ink/terminalModes.js";
import { newSet, cursorIndexFor, getTextContent, merged, isMenuOpen } from "./select.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { useMeasured } from "../../ink/components/Input.js";
import { Box, Text } from "../../ink/components/Text.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { collapseWhitespace } from "../../utils/stringUtils.js";

//@ chunk-r68xwcze.js:19250-19296 placement
function labelWidth(oe) {
  return bunStringWidth(cellText(oe.props.label));
}
//@ chunk-r68xwcze.js:19296-19354 placement
function metaWidth(d) {
  return bunStringWidth(metaTexts(d.props.meta).join(" \xB7 "));
}
//@ chunk-r68xwcze.js:19354-19379 placement
var TABLE_ROW_CHROME_WIDTH = 2;
var TABLE_COLUMN_GAP = 3;
var MAX_LABEL_COLUMN_WIDTH = 50;
var NARROW_TABLE_WIDTH = 6;
//@ chunk-r68xwcze.js:19379-20797 placement
function SelectTable(o) {
  let t = w(30);
  let i;
  let a;
  if (t[0] !== o) {
    ({ children: i, ...a } = o);
    t[0] = o;
    t[1] = i;
    t[2] = a;
  } else {
    i = t[1];
    a = t[2];
  }
  let scrollViewportSize = useScrollViewportSize(
    Se(TerminalSizeContext) ?? {
      rows: 0,
      columns: 0,
    },
  );
  let m = R(null);
  let [l] = y(newSet);
  let C;
  if (t[3] !== l || t[4] !== scrollViewportSize) {
    C = () => {
      let [h] = l;
      if (h) {
        return measureElement(h).width;
      }
      return (
        ((m.current && measureElement(m.current).width) || scrollViewportSize.columns) -
        TABLE_ROW_CHROME_WIDTH
      );
    };
    t[3] = l;
    t[4] = scrollViewportSize;
    t[5] = C;
  } else C = t[5];
  let measured = useMeasured(C);
  let T;
  let k;
  let M;
  let children;
  let ref;
  let flexDirection;
  if (t[6] !== i || t[7] !== a || t[8] !== l || t[9] !== measured) {
    let N = Fy.toArray(i);
    let filtered = N.filter(isOrderedListItem);
    let max = Math.max(0, ...N.map(cursorIndexFor));
    let filtered_2 = filtered.filter(getTextContent);
    let min = Math.min(MAX_LABEL_COLUMN_WIDTH, Math.max(0, ...filtered_2.map(labelWidth)));
    let max_2 = Math.max(0, ...filtered_2.map(metaWidth));
    let g = measured - (max > 0 ? max + 1 : 0) - TABLE_COLUMN_GAP;
    let x = g - Math.min(min, Math.max(Math.ceil(g / 2), g - max_2));
    let V =
      min + max_2 > g && g < 2 * NARROW_TABLE_WIDTH
        ? 0
        : Math.min(
            x,
            Math.max(0, ...filtered_2.map((I) => bunStringWidth(fitBreadcrumb(metaTexts(I.props.meta), x)))),
          );
    let nameWidth = Math.min(min, g - V);
    k = Box;
    ref = m;
    flexDirection = "column";
    T = merged;
    M = a;
    let b;
    if (t[16] !== V || t[17] !== max || t[18] !== nameWidth || t[19] !== l) {
      b = (K) =>
        isOrderedListItem(K)
          ? jsxProd_default(
              merged.Item,
              {
                lines: cellText(K.props.description) ? 2 : 1,
                children: jsxProd_default(SelectTableRow, {
                  item: K.props,
                  iconWidth: max,
                  nameWidth,
                  factsWidth: V,
                  rowLines: l,
                }),
              },
              K.key,
            )
          : K;
      t[16] = V;
      t[17] = max;
      t[18] = nameWidth;
      t[19] = l;
      t[20] = b;
    } else b = t[20];
    children = N.map(b);
    t[6] = i;
    t[7] = a;
    t[8] = l;
    t[9] = measured;
    t[10] = T;
    t[11] = k;
    t[12] = M;
    t[13] = children;
    t[14] = ref;
    t[15] = flexDirection;
  } else {
    T = t[10];
    k = t[11];
    M = t[12];
    children = t[13];
    ref = t[14];
    flexDirection = t[15];
  }
  let children_2;
  if (t[21] !== T || t[22] !== M || t[23] !== children) {
    children_2 = jsxProd_default(T, {
      ...M,
      children,
    });
    t[21] = T;
    t[22] = M;
    t[23] = children;
    t[24] = children_2;
  } else children_2 = t[24];
  let ee;
  if (t[25] !== k || t[26] !== ref || t[27] !== flexDirection || t[28] !== children_2) {
    ee = jsxProd_default(k, {
      ref,
      flexDirection,
      children: children_2,
    });
    t[25] = k;
    t[26] = ref;
    t[27] = flexDirection;
    t[28] = children_2;
    t[29] = ee;
  } else ee = t[29];
  return ee;
}
//@ chunk-r68xwcze.js:20797-22669 placement
function SelectTableRow(props) {
  let E = w(42);
  let { item, iconWidth, nameWidth, factsWidth, rowLines } = props;
  let { icon, meta, ...h } = item;
  let A = isMenuOpen();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let k = cellText(h.label);
  let M = cellText(h.description);
  let F;
  let B;
  if (
    E[0] !== M ||
    E[1] !== factsWidth ||
    E[2] !== icon ||
    E[3] !== isScreenReaderEnabled ||
    E[4] !== k ||
    E[5] !== meta
  ) {
    B = EARLY_RETURN_SENTINEL;
    G: {
      let N = metaTexts(meta);
      if (isScreenReaderEnabled) {
        const U = N.length > 0 && `, ${N.join(" \xB7 ")}`;
        const W = M && `. ${M}`;
        let L;
        if (E[8] !== k || E[9] !== U || E[10] !== W) {
          L = jsxProd_default_2(Text, {
            children: [k, U, W],
          });
          E[8] = k;
          E[9] = U;
          E[10] = W;
          E[11] = L;
        } else L = E[11];
        let H;
        if (E[12] !== icon || E[13] !== L) {
          H = jsxProd_default_2(Box, {
            children: [icon, L],
          });
          E[12] = icon;
          E[13] = L;
          E[14] = H;
        } else H = E[14];
        B = H;
        break G;
      }
      F = factsWidth > 0 && N.length > 0 ? fitBreadcrumb(N, factsWidth) : undefined;
    }
    E[0] = M;
    E[1] = factsWidth;
    E[2] = icon;
    E[3] = isScreenReaderEnabled;
    E[4] = k;
    E[5] = meta;
    E[6] = F;
    E[7] = B;
  } else {
    F = E[6];
    B = E[7];
  }
  if (B !== EARLY_RETURN_SENTINEL) return B;
  let g = F;
  let ref;
  if (E[15] !== rowLines) {
    ref = (x) => {
      if (!x) {
        return;
      }
      rowLines.add(x);
      return () => {
        rowLines.delete(x);
      };
    };
    E[15] = rowLines;
    E[16] = ref;
  } else ref = E[16];
  let W;
  if (E[17] !== icon || E[18] !== iconWidth) {
    W =
      iconWidth > 0 &&
      jsxProd_default(Box, {
        flexShrink: 0,
        width: iconWidth,
        marginRight: 1,
        children: icon,
      });
    E[17] = icon;
    E[18] = iconWidth;
    E[19] = W;
  } else W = E[19];
  const flexShrink = g === undefined ? 1 : 0;
  const width = g === undefined ? undefined : nameWidth;
  const marginRight = g === undefined ? 0 : TABLE_COLUMN_GAP;
  const color = A ? "suggestion" : undefined;
  let children;
  if (E[20] !== k || E[21] !== color) {
    children = jsxProd_default(Text, {
      color,
      wrap: "truncate-end",
      children: k,
    });
    E[20] = k;
    E[21] = color;
    E[22] = children;
  } else children = E[22];
  let b;
  if (E[23] !== children || E[24] !== flexShrink || E[25] !== width || E[26] !== marginRight) {
    b = jsxProd_default(Box, {
      flexShrink,
      width,
      marginRight,
      children,
    });
    E[23] = children;
    E[24] = flexShrink;
    E[25] = width;
    E[26] = marginRight;
    E[27] = b;
  } else b = E[27];
  let K;
  if (E[28] !== factsWidth || E[29] !== g) {
    K =
      g !== undefined &&
      jsxProd_default(Box, {
        flexShrink: 1,
        maxWidth: factsWidth,
        children: jsxProd_default(Text, {
          dimColor: true,
          wrap: "truncate-end",
          children: g,
        }),
      });
    E[28] = factsWidth;
    E[29] = g;
    E[30] = K;
  } else K = E[30];
  let ee;
  if (E[31] !== b || E[32] !== K || E[33] !== ref || E[34] !== W) {
    ee = jsxProd_default_2(Box, {
      ref,
      children: [W, b, K],
    });
    E[31] = b;
    E[32] = K;
    E[33] = ref;
    E[34] = W;
    E[35] = ee;
  } else ee = E[35];
  let q;
  if (E[36] !== M || E[37] !== iconWidth) {
    q =
      M &&
      jsxProd_default(Box, {
        paddingLeft: iconWidth > 0 ? iconWidth + 1 : 0,
        children: jsxProd_default(Text, {
          dimColor: true,
          wrap: "truncate-end",
          children: M,
        }),
      });
    E[36] = M;
    E[37] = iconWidth;
    E[38] = q;
  } else q = E[38];
  let D;
  if (E[39] !== ee || E[40] !== q) {
    D = jsxProd_default_2(Box, {
      flexDirection: "column",
      flexGrow: 1,
      flexShrink: 1,
      children: [ee, q],
    });
    E[39] = ee;
    E[40] = q;
    E[41] = D;
  } else D = E[41];
  return D;
}
//@ chunk-r68xwcze.js:22669-22696 placement
function OrderedListItem(o) {
  return null;
}
//@ chunk-r68xwcze.js:22696-22737 placement
function isOrderedListItem(o) {
  return isValidElement_default(o) && o.type === OrderedListItem;
}
//@ chunk-r68xwcze.js:22737-22794 placement
function metaTexts(meta) {
  return (meta ?? []).map(cellText).filter((t) => t !== "");
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
  if (typeof o === "string") return collapseWhitespace(o);
  return typeof o === "number" || typeof o === "boolean" ? String(o) : "";
}
//@ chunk-r68xwcze.js:23012-23047 placement
var OrderedListWithItem = Object.assign(SelectTable, {
  Item: OrderedListItem,
});
export { OrderedListWithItem, cellText, isOrderedListItem, metaTexts };
