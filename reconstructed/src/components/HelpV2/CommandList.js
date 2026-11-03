/**
 * components/HelpV2/CommandList.tsx
 *
 * 2.1.316 新增：/help 的命令标签页：空提示或标题加去重排序后的可滚动命令列表（读屏模式下为纯列表）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yxcx2jtr.js (8)
 * attribution: placement 8
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { HintText } from "../design-system/HintText.js";
import { useTabHeaderFocus } from "../design-system/Tabs.js";
import { formatDescriptionWithSource, getHumanFacingDescription } from "../../commands.js";

//@ chunk-yxcx2jtr.js:14074-14078 placement
init_react_production();
//@ chunk-yxcx2jtr.js:14078-14082 placement
init_react_production();
//@ chunk-yxcx2jtr.js:14082-14173 placement
function renderNumberedCommand(R, x) {
  return jsxProd_default_2(
    Text,
    {
      children: [x + 1, ". ", R.label, " \u2014 ", R.description],
    },
    R.name,
  );
}
//@ chunk-yxcx2jtr.js:14173-14255 placement
function renderCommandItem(M) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: M.label,
      description: M.description,
    },
    M.name,
  );
}
//@ chunk-yxcx2jtr.js:14255-14336 placement
function renderCommandItemCompact(ls) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: ls.label,
      meta: [ls.description],
    },
    ls.name,
  );
}
//@ chunk-yxcx2jtr.js:14336-14731 placement
/**
 * /help 的命令标签页：无命令时显示空提示，否则显示标题与命令列表。
 */
function CommandsTab(props) {
  let o = w(6);
  let { commands, maxHeight, title, emptyMessage } = props;
  useIsScreenReaderEnabled();
  let m = commands.length === 0 && emptyMessage !== undefined;
  let l;
  if (o[0] !== commands || o[1] !== emptyMessage || o[2] !== m || o[3] !== maxHeight || o[4] !== title) {
    l = jsxProd_default(Box, {
      flexDirection: "column",
      paddingY: 1,
      children: m
        ? jsxProd_default(HintText, {
            children: emptyMessage,
          })
        : jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(Text, {
                children: title,
              }),
              jsxProd_default(Box, {
                marginTop: 1,
                children: jsxProd_default(CommandList, {
                  commands,
                  maxHeight,
                }),
              }),
            ],
          }),
    });
    o[0] = commands;
    o[1] = emptyMessage;
    o[2] = m;
    o[3] = maxHeight;
    o[4] = title;
    o[5] = l;
  } else l = o[5];
  return l;
}
//@ chunk-yxcx2jtr.js:14731-15314 placement
/**
 * 命令列表：去重排序后渲染；读屏模式下为纯列表，否则为可滚动的有序列表（向上可回到标签头）。
 */
function CommandList(props) {
  let $ = w(13);
  let { commands, maxHeight } = props;
  let { headerFocused, focusHeader } = useTabHeaderFocus();
  let visibleCount = 2 * Math.max(1, Math.floor((maxHeight - 10) / 2));
  let screenReader = useIsScreenReaderEnabled();
  let itemsMemo;
  if ($[0] !== commands) {
    itemsMemo = toCommandItems(commands);
    $[0] = commands;
    $[1] = itemsMemo;
  } else itemsMemo = $[1];
  let items = itemsMemo;
  if (screenReader) {
    let rows;
    if ($[2] !== items) {
      rows = items.map(renderNumberedCommand);
      $[2] = items;
      $[3] = rows;
    } else rows = $[3];
    let content;
    if ($[4] !== rows) {
      content = jsxProd_default(Box, {
        flexDirection: "column",
        children: rows,
      });
      $[4] = rows;
      $[5] = content;
    } else content = $[5];
    return content;
  }
  let children;
  if ($[6] !== items) {
    children = items.map(renderCommandItem);
    $[6] = items;
    $[7] = children;
  } else children = $[7];
  let h;
  if ($[8] !== focusHeader || $[9] !== headerFocused || $[10] !== children || $[11] !== visibleCount) {
    h = jsxProd_default(OrderedListWithItem, {
      visibleCount,
      onUpFromFirstItem: focusHeader,
      isDisabled: headerFocused,
      children,
    });
    $[8] = focusHeader;
    $[9] = headerFocused;
    $[10] = children;
    $[11] = visibleCount;
    $[12] = h;
  } else h = $[12];
  return h;
}
//@ chunk-yxcx2jtr.js:15314-15530 placement
function toCommandItems(commands) {
  let a = new Set();
  return commands
    .filter((t) => {
      if (a.has(t.name)) return false;
      a.add(t.name);
      return true;
    })
    .sort((t, i) => t.name.localeCompare(i.name))
    .map((t) => ({
      name: t.name,
      label: `/${t.name}`,
      description: formatDescriptionWithSource(t, getHumanFacingDescription(t)),
    }));
}
export { CommandsTab };
