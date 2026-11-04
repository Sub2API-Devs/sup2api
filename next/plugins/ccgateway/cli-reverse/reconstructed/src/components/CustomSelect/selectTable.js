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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useScrollViewportSize } from "../ScrollViewportContext.js";
import {
  useContext,
  useRef,
  useState,
  childrenExport,
  isValidElement_default,
} from "../../../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-r68xwcze.js:19250-19296 placement
function labelWidth(item) {
  return bunStringWidth(cellText(item.props.label));
}
//@ chunk-r68xwcze.js:19296-19354 placement
function metaWidth(option) {
  return bunStringWidth(metaTexts(option.props.meta).join(" \xB7 "));
}
//@ chunk-r68xwcze.js:19354-19379 placement
var TABLE_ROW_CHROME_WIDTH = 2;
var TABLE_COLUMN_GAP = 3;
var MAX_LABEL_COLUMN_WIDTH = 50;
var NARROW_TABLE_WIDTH = 6;
//@ chunk-r68xwcze.js:19379-20797 placement
function SelectTable(props) {
  let $ = useMemoCache(30);
  let children;
  let restProps;
  if ($[0] !== props) {
    ({ children, ...restProps } = props);
    $[0] = props;
    $[1] = children;
    $[2] = restProps;
  } else {
    children = $[1];
    restProps = $[2];
  }
  let scrollViewportSize = useScrollViewportSize(
    useContext(TerminalSizeContext) ?? {
      rows: 0,
      columns: 0,
    },
  );
  let containerRef = useRef(null);
  let [sharedRowLines] = useState(newSet);
  let widthFn;
  if ($[3] !== sharedRowLines || $[4] !== scrollViewportSize) {
    widthFn = () => {
      let [sharedNode] = sharedRowLines;
      if (sharedNode) {
        return measureElement(sharedNode).width;
      }
      return (
        ((containerRef.current && measureElement(containerRef.current).width) || scrollViewportSize.columns) -
        TABLE_ROW_CHROME_WIDTH
      );
    };
    $[3] = sharedRowLines;
    $[4] = scrollViewportSize;
    $[5] = widthFn;
  } else widthFn = $[5];
  let measured = useMeasured(widthFn);
  let ListComponent;
  let BoxComponent;
  let listProps;
  let children_2;
  let ref;
  let flexDirection;
  if ($[6] !== children || $[7] !== restProps || $[8] !== sharedRowLines || $[9] !== measured) {
    let childArray = childrenExport.toArray(children);
    let filtered = childArray.filter(isOrderedListItem);
    let max = Math.max(0, ...childArray.map(cursorIndexFor));
    let filtered_2 = filtered.filter(getTextContent);
    let min = Math.min(MAX_LABEL_COLUMN_WIDTH, Math.max(0, ...filtered_2.map(labelWidth)));
    let max_2 = Math.max(0, ...filtered_2.map(metaWidth));
    let contentWidth = measured - (max > 0 ? max + 1 : 0) - TABLE_COLUMN_GAP;
    let factsBudget =
      contentWidth - Math.min(min, Math.max(Math.ceil(contentWidth / 2), contentWidth - max_2));
    let factsWidth =
      min + max_2 > contentWidth && contentWidth < 2 * NARROW_TABLE_WIDTH
        ? 0
        : Math.min(
            factsBudget,
            Math.max(
              0,
              ...filtered_2.map((item) =>
                bunStringWidth(fitBreadcrumb(metaTexts(item.props.meta), factsBudget)),
              ),
            ),
          );
    let nameWidth = Math.min(min, contentWidth - factsWidth);
    BoxComponent = Box;
    ref = containerRef;
    flexDirection = "column";
    ListComponent = merged;
    listProps = restProps;
    let renderItem;
    if ($[16] !== factsWidth || $[17] !== max || $[18] !== nameWidth || $[19] !== sharedRowLines) {
      renderItem = (child) =>
        isOrderedListItem(child)
          ? jsxProd_default(
              merged.Item,
              {
                lines: cellText(child.props.description) ? 2 : 1,
                children: jsxProd_default(SelectTableRow, {
                  item: child.props,
                  iconWidth: max,
                  nameWidth,
                  factsWidth,
                  rowLines: sharedRowLines,
                }),
              },
              child.key,
            )
          : child;
      $[16] = factsWidth;
      $[17] = max;
      $[18] = nameWidth;
      $[19] = sharedRowLines;
      $[20] = renderItem;
    } else renderItem = $[20];
    children_2 = childArray.map(renderItem);
    $[6] = children;
    $[7] = restProps;
    $[8] = sharedRowLines;
    $[9] = measured;
    $[10] = ListComponent;
    $[11] = BoxComponent;
    $[12] = listProps;
    $[13] = children_2;
    $[14] = ref;
    $[15] = flexDirection;
  } else {
    ListComponent = $[10];
    BoxComponent = $[11];
    listProps = $[12];
    children_2 = $[13];
    ref = $[14];
    flexDirection = $[15];
  }
  let children_3;
  if ($[21] !== ListComponent || $[22] !== listProps || $[23] !== children_2) {
    children_3 = jsxProd_default(ListComponent, {
      ...listProps,
      children: children_2,
    });
    $[21] = ListComponent;
    $[22] = listProps;
    $[23] = children_2;
    $[24] = children_3;
  } else children_3 = $[24];
  let tableElement;
  if ($[25] !== BoxComponent || $[26] !== ref || $[27] !== flexDirection || $[28] !== children_3) {
    tableElement = jsxProd_default(BoxComponent, {
      ref,
      flexDirection,
      children: children_3,
    });
    $[25] = BoxComponent;
    $[26] = ref;
    $[27] = flexDirection;
    $[28] = children_3;
    $[29] = tableElement;
  } else tableElement = $[29];
  return tableElement;
}
//@ chunk-r68xwcze.js:20797-22669 placement
function SelectTableRow(props) {
  let $ = useMemoCache(42);
  let { item, iconWidth, nameWidth, factsWidth, rowLines } = props;
  let { icon, meta, ...restItem } = item;
  let isMenuOpenFlag = isMenuOpen();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let labelText = cellText(restItem.label);
  let descriptionText = cellText(restItem.description);
  let factsTextCached;
  let readonlyResult;
  if (
    $[0] !== descriptionText ||
    $[1] !== factsWidth ||
    $[2] !== icon ||
    $[3] !== isScreenReaderEnabled ||
    $[4] !== labelText ||
    $[5] !== meta
  ) {
    readonlyResult = EARLY_RETURN_SENTINEL;
    G: {
      let factsList = metaTexts(meta);
      if (isScreenReaderEnabled) {
        const factsSuffix = factsList.length > 0 && `, ${factsList.join(" \xB7 ")}`;
        const descriptionSuffix = descriptionText && `. ${descriptionText}`;
        let srLabelElement;
        if ($[8] !== labelText || $[9] !== factsSuffix || $[10] !== descriptionSuffix) {
          srLabelElement = jsxProd_default_2(Text, {
            children: [labelText, factsSuffix, descriptionSuffix],
          });
          $[8] = labelText;
          $[9] = factsSuffix;
          $[10] = descriptionSuffix;
          $[11] = srLabelElement;
        } else srLabelElement = $[11];
        let srRowElement;
        if ($[12] !== icon || $[13] !== srLabelElement) {
          srRowElement = jsxProd_default_2(Box, {
            children: [icon, srLabelElement],
          });
          $[12] = icon;
          $[13] = srLabelElement;
          $[14] = srRowElement;
        } else srRowElement = $[14];
        readonlyResult = srRowElement;
        break G;
      }
      factsTextCached =
        factsWidth > 0 && factsList.length > 0 ? fitBreadcrumb(factsList, factsWidth) : undefined;
    }
    $[0] = descriptionText;
    $[1] = factsWidth;
    $[2] = icon;
    $[3] = isScreenReaderEnabled;
    $[4] = labelText;
    $[5] = meta;
    $[6] = factsTextCached;
    $[7] = readonlyResult;
  } else {
    factsTextCached = $[6];
    readonlyResult = $[7];
  }
  if (readonlyResult !== EARLY_RETURN_SENTINEL) return readonlyResult;
  let factsText = factsTextCached;
  let ref;
  if ($[15] !== rowLines) {
    ref = (node) => {
      if (!node) {
        return;
      }
      rowLines.add(node);
      return () => {
        rowLines.delete(node);
      };
    };
    $[15] = rowLines;
    $[16] = ref;
  } else ref = $[16];
  let iconElement;
  if ($[17] !== icon || $[18] !== iconWidth) {
    iconElement =
      iconWidth > 0 &&
      jsxProd_default(Box, {
        flexShrink: 0,
        width: iconWidth,
        marginRight: 1,
        children: icon,
      });
    $[17] = icon;
    $[18] = iconWidth;
    $[19] = iconElement;
  } else iconElement = $[19];
  const flexShrink = factsText === undefined ? 1 : 0;
  const width = factsText === undefined ? undefined : nameWidth;
  const marginRight = factsText === undefined ? 0 : TABLE_COLUMN_GAP;
  const color = isMenuOpenFlag ? "suggestion" : undefined;
  let children;
  if ($[20] !== labelText || $[21] !== color) {
    children = jsxProd_default(Text, {
      color,
      wrap: "truncate-end",
      children: labelText,
    });
    $[20] = labelText;
    $[21] = color;
    $[22] = children;
  } else children = $[22];
  let labelBox;
  if ($[23] !== children || $[24] !== flexShrink || $[25] !== width || $[26] !== marginRight) {
    labelBox = jsxProd_default(Box, {
      flexShrink,
      width,
      marginRight,
      children,
    });
    $[23] = children;
    $[24] = flexShrink;
    $[25] = width;
    $[26] = marginRight;
    $[27] = labelBox;
  } else labelBox = $[27];
  let factsBox;
  if ($[28] !== factsWidth || $[29] !== factsText) {
    factsBox =
      factsText !== undefined &&
      jsxProd_default(Box, {
        flexShrink: 1,
        maxWidth: factsWidth,
        children: jsxProd_default(Text, {
          dimColor: true,
          wrap: "truncate-end",
          children: factsText,
        }),
      });
    $[28] = factsWidth;
    $[29] = factsText;
    $[30] = factsBox;
  } else factsBox = $[30];
  let mainRow;
  if ($[31] !== labelBox || $[32] !== factsBox || $[33] !== ref || $[34] !== iconElement) {
    mainRow = jsxProd_default_2(Box, {
      ref,
      children: [iconElement, labelBox, factsBox],
    });
    $[31] = labelBox;
    $[32] = factsBox;
    $[33] = ref;
    $[34] = iconElement;
    $[35] = mainRow;
  } else mainRow = $[35];
  let descriptionLine;
  if ($[36] !== descriptionText || $[37] !== iconWidth) {
    descriptionLine =
      descriptionText &&
      jsxProd_default(Box, {
        paddingLeft: iconWidth > 0 ? iconWidth + 1 : 0,
        children: jsxProd_default(Text, {
          dimColor: true,
          wrap: "truncate-end",
          children: descriptionText,
        }),
      });
    $[36] = descriptionText;
    $[37] = iconWidth;
    $[38] = descriptionLine;
  } else descriptionLine = $[38];
  let rowElement;
  if ($[39] !== mainRow || $[40] !== descriptionLine) {
    rowElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      flexGrow: 1,
      flexShrink: 1,
      children: [mainRow, descriptionLine],
    });
    $[39] = mainRow;
    $[40] = descriptionLine;
    $[41] = rowElement;
  } else rowElement = $[41];
  return rowElement;
}
//@ chunk-r68xwcze.js:22669-22696 placement
function OrderedListItem(child) {
  return null;
}
//@ chunk-r68xwcze.js:22696-22737 placement
function isOrderedListItem(child) {
  return isValidElement_default(child) && child.type === OrderedListItem;
}
//@ chunk-r68xwcze.js:22737-22794 placement
function metaTexts(meta) {
  return (meta ?? []).map(cellText).filter((text) => text !== "");
}
//@ chunk-r68xwcze.js:22794-22899 placement
function fitBreadcrumb(segments, maxWidth) {
  return (
    segments
      .map((segment, includedCount) => segments.slice(0, includedCount + 1).join(" \xB7 "))
      .findLast((candidate, index) => index === 0 || bunStringWidth(candidate) <= maxWidth) ?? ""
  );
}
//@ chunk-r68xwcze.js:22899-23012 placement
function cellText(value) {
  if (typeof value === "string") return collapseWhitespace(value);
  return typeof value === "number" || typeof value === "boolean" ? String(value) : "";
}
//@ chunk-r68xwcze.js:23012-23047 placement
var OrderedListWithItem; // deferred: uses SelectTable of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-r68xwcze.js:23012", () => {
  OrderedListWithItem = Object.assign(SelectTable, {
    Item: OrderedListItem,
  });
});
export { OrderedListWithItem, cellText, isOrderedListItem, metaTexts };
