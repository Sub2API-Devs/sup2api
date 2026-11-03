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
import { w } from "../../vendor/react/compiler-runtime.js";
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
  let $ = w(20);
  let { state, isFocused, notice } = props;
  let v;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    v = jsxProd_default(Text, {
      bold: true,
      children: DEV_BAR_TOOL_CALLING_TITLE,
    });
    $[0] = v;
  } else v = $[0];
  let b;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    b = jsxProd_default(Text, {
      dimColor: true,
      children: " \xB7 ",
    });
    $[1] = b;
  } else b = $[1];
  const color = state.choice === "accepted" ? "success" : undefined;
  const dimColor = state.choice !== "accepted";
  const children = UNATTENDED_CONSENT_LABELS[state.choice];
  let u;
  if ($[2] !== color || $[3] !== dimColor || $[4] !== children) {
    u = jsxProd_default(Text, {
      color,
      dimColor,
      children,
    });
    $[2] = color;
    $[3] = dimColor;
    $[4] = children;
    $[5] = u;
  } else u = $[5];
  let children_2;
  if ($[6] !== isFocused || $[7] !== u) {
    children_2 = jsxProd_default_2(Text, {
      bold: isFocused,
      wrap: "truncate-end",
      children: ["Unattended commands from cloud sessions", b, u],
    });
    $[6] = isFocused;
    $[7] = u;
    $[8] = children_2;
  } else children_2 = $[8];
  let p;
  if ($[9] !== isFocused || $[10] !== children_2) {
    p = jsxProd_default(ListItem, {
      isFocused,
      styled: false,
      children: children_2,
    });
    $[9] = isFocused;
    $[10] = children_2;
    $[11] = p;
  } else p = $[11];
  let M;
  if ($[12] !== state.lockReason) {
    M =
      state.lockReason !== undefined &&
      jsxProd_default(IndentedInactiveText, {
        children: state.lockReason,
      });
    $[12] = state.lockReason;
    $[13] = M;
  } else M = $[13];
  let m;
  if ($[14] !== notice) {
    m =
      notice !== null &&
      jsxProd_default(IndentedInactiveText, {
        children: notice,
      });
    $[14] = notice;
    $[15] = m;
  } else m = $[15];
  let D;
  if ($[16] !== m || $[17] !== p || $[18] !== M) {
    D = jsxProd_default_2(Box, {
      marginTop: 1,
      flexDirection: "column",
      children: [v, p, M, m],
    });
    $[16] = m;
    $[17] = p;
    $[18] = M;
    $[19] = D;
  } else D = $[19];
  return D;
}
//@ chunk-b7gstm5r.js:21639-21796 placement = _temp (0.798)
/**
 * React Compiler 产物：缩进 2 的灰色文本行组件（DevBar 使用），与 AskUserQuestion 无关。
 */
function IndentedInactiveText(props) {
  let o = w(2);
  let { children } = props;
  let f;
  if (o[0] !== children) {
    f = jsxProd_default(Box, {
      paddingLeft: 2,
      children: jsxProd_default(Text, {
        color: "inactive",
        children,
      }),
    });
    o[0] = children;
    o[1] = f;
  } else f = o[1];
  return f;
}
//@ chunk-18hwfzwa.js:514449-514523 fingerprint = _temp (1)
function formatOperationTiming(op) {
  return `${op.operation} (${Math.round(op.durationMs)}ms)`;
}
export { DevBar };
