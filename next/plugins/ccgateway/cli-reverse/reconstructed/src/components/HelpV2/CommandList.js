/**
 * components/HelpV2/CommandList.tsx
 *
 * 2.1.316 新增：/help 的命令标签页：空提示或标题加去重排序后的可滚动命令列表（读屏模式下为纯列表）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ahfwxte3.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { HintText } from "../design-system/HintText.js";
import { useTabHeaderFocus } from "../design-system/Tabs.js";
import { formatDescriptionWithSource, getHumanFacingDescription } from "../../commands.js";

//@ chunk-ahfwxte3.js:15251-15255 placement
init_react_production();
//@ chunk-ahfwxte3.js:15255-15259 placement
init_react_production();
//@ chunk-ahfwxte3.js:15259-15350 placement
function renderNumberedCommand(command, index) {
  return jsxProd_default_2(
    Text,
    {
      children: [index + 1, ". ", command.label, " \u2014 ", command.description],
    },
    command.name,
  );
}
//@ chunk-ahfwxte3.js:15350-15432 placement
function renderCommandItem(item) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: item.label,
      description: item.description,
    },
    item.name,
  );
}
//@ chunk-ahfwxte3.js:15432-15513 placement
function renderCommandItemCompact(item) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: item.label,
      meta: [item.description],
    },
    item.name,
  );
}
//@ chunk-ahfwxte3.js:15513-15909 placement
/**
 * /help 的命令标签页：无命令时显示空提示，否则显示标题与命令列表。
 */
function CommandsTab(props) {
  let $ = useMemoCache(6);
  let { commands, maxHeight, title, emptyMessage } = props;
  useIsScreenReaderEnabled();
  let isEmpty = commands.length === 0 && emptyMessage !== undefined;
  let content;
  if (
    $[0] !== commands ||
    $[1] !== emptyMessage ||
    $[2] !== isEmpty ||
    $[3] !== maxHeight ||
    $[4] !== title
  ) {
    content = jsxProd_default(Box, {
      flexDirection: "column",
      paddingY: 1,
      children: isEmpty
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
    $[0] = commands;
    $[1] = emptyMessage;
    $[2] = isEmpty;
    $[3] = maxHeight;
    $[4] = title;
    $[5] = content;
  } else content = $[5];
  return content;
}
//@ chunk-ahfwxte3.js:15909-16492 placement
/**
 * 命令列表：去重排序后渲染；读屏模式下为纯列表，否则为可滚动的有序列表（向上可回到标签头）。
 */
function CommandList(props) {
  let $ = useMemoCache(13);
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
  let list;
  if ($[8] !== focusHeader || $[9] !== headerFocused || $[10] !== children || $[11] !== visibleCount) {
    list = jsxProd_default(OrderedListWithItem, {
      visibleCount,
      onUpFromFirstItem: focusHeader,
      isDisabled: headerFocused,
      children,
    });
    $[8] = focusHeader;
    $[9] = headerFocused;
    $[10] = children;
    $[11] = visibleCount;
    $[12] = list;
  } else list = $[12];
  return list;
}
//@ chunk-ahfwxte3.js:16492-16708 placement
function toCommandItems(commands) {
  let seenNames = new Set();
  return commands
    .filter((command) => {
      if (seenNames.has(command.name)) return false;
      seenNames.add(command.name);
      return true;
    })
    .sort((commandA, commandB) => commandA.name.localeCompare(commandB.name))
    .map((command) => ({
      name: command.name,
      label: `/${command.name}`,
      description: formatDescriptionWithSource(command, getHumanFacingDescription(command)),
    }));
}
export { CommandsTab };
