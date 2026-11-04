/**
 * components/DevBar.tsx
 *
 * 开发者栏：显示 "Remote tool calling" 等远程工具调用状态与最近慢操作；本文件还混入了若干遥测 schema 常量（切分误归）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/DevBar.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-b7gstm5r.js (3)
 * attribution: fingerprint 2, affinity 1, placement 1
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { UNATTENDED_CONSENT_LABELS } from "../services/remoteTools/unattendedServingConsent.js";
import { ListItem } from "./design-system/ListItem.js";

//@ chunk-b7gstm5r.js:20584-20613 affinity
var DEV_BAR_TOOL_CALLING_TITLE = "Remote tool calling";
//@ chunk-b7gstm5r.js:20613-21639 fingerprint = DevBar (0.33)
function DevBar(props) {
  let $ = useMemoCache(20);
  let { state, isFocused, notice } = props;
  let titleText;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    titleText = jsxProd_default(Text, {
      bold: true,
      children: DEV_BAR_TOOL_CALLING_TITLE,
    });
    $[0] = titleText;
  } else titleText = $[0];
  let separator;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    separator = jsxProd_default(Text, {
      dimColor: true,
      children: " \xB7 ",
    });
    $[1] = separator;
  } else separator = $[1];
  const color = state.choice === "accepted" ? "success" : undefined;
  const dimColor = state.choice !== "accepted";
  const children = UNATTENDED_CONSENT_LABELS[state.choice];
  let choiceText;
  if ($[2] !== color || $[3] !== dimColor || $[4] !== children) {
    choiceText = jsxProd_default(Text, {
      color,
      dimColor,
      children,
    });
    $[2] = color;
    $[3] = dimColor;
    $[4] = children;
    $[5] = choiceText;
  } else choiceText = $[5];
  let children_2;
  if ($[6] !== isFocused || $[7] !== choiceText) {
    children_2 = jsxProd_default_2(Text, {
      bold: isFocused,
      wrap: "truncate-end",
      children: ["Unattended commands from cloud sessions", separator, choiceText],
    });
    $[6] = isFocused;
    $[7] = choiceText;
    $[8] = children_2;
  } else children_2 = $[8];
  let row;
  if ($[9] !== isFocused || $[10] !== children_2) {
    row = jsxProd_default(ListItem, {
      isFocused,
      styled: false,
      children: children_2,
    });
    $[9] = isFocused;
    $[10] = children_2;
    $[11] = row;
  } else row = $[11];
  let lockReasonText;
  if ($[12] !== state.lockReason) {
    lockReasonText =
      state.lockReason !== undefined &&
      jsxProd_default(IndentedInactiveText, {
        children: state.lockReason,
      });
    $[12] = state.lockReason;
    $[13] = lockReasonText;
  } else lockReasonText = $[13];
  let noticeText;
  if ($[14] !== notice) {
    noticeText =
      notice !== null &&
      jsxProd_default(IndentedInactiveText, {
        children: notice,
      });
    $[14] = notice;
    $[15] = noticeText;
  } else noticeText = $[15];
  let box;
  if ($[16] !== noticeText || $[17] !== row || $[18] !== lockReasonText) {
    box = jsxProd_default_2(Box, {
      marginTop: 1,
      flexDirection: "column",
      children: [titleText, row, lockReasonText, noticeText],
    });
    $[16] = noticeText;
    $[17] = row;
    $[18] = lockReasonText;
    $[19] = box;
  } else box = $[19];
  return box;
}
//@ chunk-b7gstm5r.js:21639-21796 placement = _temp (0.798)
/**
 * React Compiler 产物：缩进 2 的灰色文本行组件（DevBar 使用），与 AskUserQuestion 无关。
 */
function IndentedInactiveText(props) {
  let $ = useMemoCache(2);
  let { children } = props;
  let box;
  if ($[0] !== children) {
    box = jsxProd_default(Box, {
      paddingLeft: 2,
      children: jsxProd_default(Text, {
        color: "inactive",
        children,
      }),
    });
    $[0] = children;
    $[1] = box;
  } else box = $[1];
  return box;
}
//@ chunk-18hwfzwa.js:514449-514523 fingerprint = _temp (1)
function formatOperationTiming(op) {
  return `${op.operation} (${Math.round(op.durationMs)}ms)`;
}
export { DevBar };
