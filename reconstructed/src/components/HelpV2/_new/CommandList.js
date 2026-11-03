/**
 * components/HelpV2/_new/CommandList.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yxcx2jtr.js (8)
 * attribution: sole-consumer-new 8
 */
import { j } from "../../../../vendor/react/cjs/react.production.js";
import {
  r,
  e,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { OrderedListWithItem } from "../../CustomSelect/selectTable.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { HintText } from "../../design-system/HintText.js";
import { useTabHeaderFocus } from "../../design-system/Tabs.js";
import { formatDescriptionWithSource, getHumanFacingDescription } from "../../../commands.js";

//@ chunk-yxcx2jtr.js:14074-14078 sole-consumer-new
j();
//@ chunk-yxcx2jtr.js:14078-14082 sole-consumer-new
j();
//@ chunk-yxcx2jtr.js:14082-14173 sole-consumer-new
function Le(R, x) {
  return r(Text, { children: [x + 1, ". ", R.label, " \u2014 ", R.description] }, R.name);
}
//@ chunk-yxcx2jtr.js:14173-14255 sole-consumer-new
function qe(M) {
  return e(OrderedListWithItem.Item, { label: M.label, description: M.description }, M.name);
}
//@ chunk-yxcx2jtr.js:14255-14336 sole-consumer-new
function go(ls) {
  return e(OrderedListWithItem.Item, { label: ls.label, meta: [ls.description] }, ls.name);
}
/**
 * /help 的命令标签页：无命令时显示空提示，否则显示标题与命令列表。
 */
//@ chunk-yxcx2jtr.js:14336-14731 sole-consumer-new
function CommandsTab(p) {
  let o = w(6),
    { commands: commands, maxHeight: maxHeight, title: title, emptyMessage: emptyMessage } = p;
  useIsScreenReaderEnabled();
  let m = commands.length === 0 && emptyMessage !== void 0,
    l;
  if (o[0] !== commands || o[1] !== emptyMessage || o[2] !== m || o[3] !== maxHeight || o[4] !== title)
    ((l = e(Box, {
      flexDirection: "column",
      paddingY: 1,
      children: m
        ? e(HintText, { children: emptyMessage })
        : r(Fragment, {
            children: [
              e(Text, { children: title }),
              e(Box, {
                marginTop: 1,
                children: e(CommandList, { commands: commands, maxHeight: maxHeight }),
              }),
            ],
          }),
    })),
      (o[0] = commands),
      (o[1] = emptyMessage),
      (o[2] = m),
      (o[3] = maxHeight),
      (o[4] = title),
      (o[5] = l));
  else l = o[5];
  return l;
}
/**
 * 命令列表：去重排序后渲染；读屏模式下为纯列表，否则为可滚动的有序列表（向上可回到标签头）。
 */
//@ chunk-yxcx2jtr.js:14731-15314 sole-consumer-new
function CommandList(props) {
  let $ = w(13),
    { commands: commands, maxHeight: maxHeight } = props,
    { headerFocused: headerFocused, focusHeader: focusHeader } = useTabHeaderFocus(),
    visibleCount = 2 * Math.max(1, Math.floor((maxHeight - 10) / 2)),
    screenReader = useIsScreenReaderEnabled(),
    itemsMemo;
  if ($[0] !== commands) ((itemsMemo = toCommandItems(commands)), ($[0] = commands), ($[1] = itemsMemo));
  else itemsMemo = $[1];
  let items = itemsMemo;
  if (screenReader) {
    let rows;
    if ($[2] !== items) ((rows = items.map(Le)), ($[2] = items), ($[3] = rows));
    else rows = $[3];
    let content;
    if ($[4] !== rows)
      ((content = e(Box, { flexDirection: "column", children: rows })), ($[4] = rows), ($[5] = content));
    else content = $[5];
    return content;
  }
  let c;
  if ($[6] !== items) ((c = items.map(qe)), ($[6] = items), ($[7] = c));
  else c = $[7];
  let h;
  if ($[8] !== focusHeader || $[9] !== headerFocused || $[10] !== c || $[11] !== visibleCount)
    ((h = e(OrderedListWithItem, {
      visibleCount: visibleCount,
      onUpFromFirstItem: focusHeader,
      isDisabled: headerFocused,
      children: c,
    })),
      ($[8] = focusHeader),
      ($[9] = headerFocused),
      ($[10] = c),
      ($[11] = visibleCount),
      ($[12] = h));
  else h = $[12];
  return h;
}
//@ chunk-yxcx2jtr.js:15314-15530 sole-consumer-new
function toCommandItems(p) {
  let a = new Set();
  return p
    .filter((t) => {
      if (a.has(t.name)) return !1;
      return (a.add(t.name), !0);
    })
    .sort((t, i) => t.name.localeCompare(i.name))
    .map((t) => ({
      name: t.name,
      label: `/${t.name}`,
      description: formatDescriptionWithSource(t, getHumanFacingDescription(t)),
    }));
}

export { CommandsTab };
