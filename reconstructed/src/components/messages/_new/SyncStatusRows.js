/**
 * components/messages/_new/SyncStatusRows.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ah34pb7m.js (6)
 * attribution: sole-consumer-new 6
 */
import { j } from "../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { useAppState } from "../../../state/AppState.js";
import { a5 } from "../../FreezeWhenOffscreen.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import {
  e,
  r,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text, Link } from "../../../ink/components/Text.js";
import { BLACK_CIRCLE } from "../../../utils/permissions/autoModeRulesPrompt.js";
import { CLOUD_SESSION_BANNERS, CODE_HERE_OR_AT } from "../SystemTextMessage.js";
import {
  WAr,
  describeRepositoryTrust,
  SYNC_STATUS_HEADING,
  SYNC_ITEM_LABELS,
  cross,
} from "../../../cli/headlessCloud/syncStatus.js";
import { StatusIcon } from "../../design-system/StatusIcon.js";

//@ chunk-ah34pb7m.js:190237-190241 sole-consumer-new
j();
//@ chunk-ah34pb7m.js:190290-190294 sole-consumer-new
j();
//@ chunk-ah34pb7m.js:190294-190335 sole-consumer-new
function bB(z) {
  return z.cloudSessionSync;
}
/**
 * 系统消息：远程会话链接（仅当前远程会话 URL 匹配时显示），并附上同步状态行。
 */
//@ chunk-ah34pb7m.js:190335-191287 sole-consumer-new
function RemoteSessionLinkMessage(m) {
  let f = w(18),
    { message: message, addMargin: addMargin } = m,
    { columns: columns } = useTerminalSize(),
    h;
  if (f[0] !== message.url)
    ((h = (M) => M.remoteSessionUrl === message.url), (f[0] = message.url), (f[1] = h));
  else h = f[1];
  let T = useAppState(h),
    x = useAppState(bB),
    [k, b] = a5(x);
  if (!T) {
    return null;
  }
  const E = addMargin ? 1 : 0;
  let B;
  if (f[2] === MEMO_CACHE_SENTINEL)
    ((B = e(Box, {
      minWidth: 2,
      children: e(Text, { "aria-hidden": !0, color: "inactive", children: BLACK_CIRCLE }),
    })),
      (f[2] = B));
  else B = f[2];
  const L = columns - 10,
    N = CLOUD_SESSION_BANNERS[message.entry];
  let W;
  if (f[3] !== message.url)
    ((W = e(Link, { url: message.url, children: message.url })), (f[3] = message.url), (f[4] = W));
  else W = f[4];
  let U;
  if (f[5] !== N || f[6] !== W)
    ((U = r(Text, { color: "inactive", wrap: "wrap", children: [N, CODE_HERE_OR_AT, W] })),
      (f[5] = N),
      (f[6] = W),
      (f[7] = U));
  else U = f[7];
  let K;
  if (f[8] !== b) ((K = b !== void 0 && e(SyncStatusRows, { rows: b })), (f[8] = b), (f[9] = K));
  else K = f[9];
  let V;
  if (f[10] !== L || f[11] !== U || f[12] !== K)
    ((V = r(Box, { flexDirection: "column", width: L, children: [U, K] })),
      (f[10] = L),
      (f[11] = U),
      (f[12] = K),
      (f[13] = V));
  else V = f[13];
  let Y;
  if (f[14] !== k || f[15] !== E || f[16] !== V)
    ((Y = r(Box, { ref: k, flexDirection: "row", marginTop: E, width: "100%", children: [B, V] })),
      (f[14] = k),
      (f[15] = E),
      (f[16] = V),
      (f[17] = Y));
  else Y = f[17];
  return Y;
}
/**
 * 远程会话同步状态区块：项目文件、设置、插件、本地工具各一行，以及两行附加说明。
 */
//@ chunk-ah34pb7m.js:191287-192403 sole-consumer-new
function SyncStatusRows(m) {
  let c = w(24),
    { rows: rows } = m,
    g;
  if (c[0] !== rows) ((g = WAr(rows)), (c[0] = rows), (c[1] = g));
  else g = c[1];
  let f = g,
    h;
  if (c[2] !== rows) ((h = describeRepositoryTrust(rows)), (c[2] = rows), (c[3] = h));
  else h = c[3];
  let M = h,
    T;
  if (c[4] === MEMO_CACHE_SENTINEL)
    ((T = e(Text, { color: "inactive", children: SYNC_STATUS_HEADING })), (c[4] = T));
  else T = c[4];
  let x;
  if (c[5] !== rows.projectFiles)
    ((x =
      rows.projectFiles !== void 0 &&
      e(SyncStatusRow, { label: SYNC_ITEM_LABELS.projectFiles, row: rows.projectFiles })),
      (c[5] = rows.projectFiles),
      (c[6] = x));
  else x = c[6];
  let k;
  if (c[7] !== rows.settings)
    ((k = e(SyncStatusRow, { label: SYNC_ITEM_LABELS.settings, row: rows.settings })),
      (c[7] = rows.settings),
      (c[8] = k));
  else k = c[8];
  let b;
  if (c[9] !== rows.plugins)
    ((b = e(SyncStatusRow, { label: SYNC_ITEM_LABELS.plugins, row: rows.plugins })),
      (c[9] = rows.plugins),
      (c[10] = b));
  else b = c[10];
  let E;
  if (c[11] !== rows.localTools)
    ((E =
      rows.localTools !== void 0 &&
      e(SyncStatusRow, { label: SYNC_ITEM_LABELS.localTools, row: rows.localTools })),
      (c[11] = rows.localTools),
      (c[12] = E));
  else E = c[12];
  let B;
  if (c[13] !== f)
    ((B = f !== void 0 && e(Text, { dimColor: !0, wrap: "wrap", children: f })), (c[13] = f), (c[14] = B));
  else B = c[14];
  let L;
  if (c[15] !== M)
    ((L = M !== void 0 && e(Text, { dimColor: !0, wrap: "wrap", children: M })), (c[15] = M), (c[16] = L));
  else L = c[16];
  let N;
  if (c[17] !== x || c[18] !== k || c[19] !== b || c[20] !== E || c[21] !== B || c[22] !== L)
    ((N = r(Fragment, { children: [T, x, k, b, E, B, L] })),
      (c[17] = x),
      (c[18] = k),
      (c[19] = b),
      (c[20] = E),
      (c[21] = B),
      (c[22] = L),
      (c[23] = N));
  else N = c[23];
  return N;
}
/**
 * 同步状态行：synced 显示成功图标与备注，pending 显示加载，not_synced 显示叉号与原因。
 */
//@ chunk-ah34pb7m.js:192403-193319 sole-consumer-new
function SyncStatusRow(m) {
  let g = w(15),
    { label: label, row: row } = m;
  switch (row.mark) {
    case "synced": {
      let f;
      if (g[0] === MEMO_CACHE_SENTINEL)
        ((f = e(StatusIcon, { status: "success", withSpace: !0 })), (g[0] = f));
      else f = g[0];
      let h;
      if (g[1] !== row.note)
        ((h = row.note !== void 0 && r(Text, { dimColor: !0, children: [" (", row.note, ")"] })),
          (g[1] = row.note),
          (g[2] = h));
      else h = g[2];
      let M;
      if (g[3] !== label || g[4] !== h)
        ((M = r(Text, { color: "inactive", children: [f, label, h] })),
          (g[3] = label),
          (g[4] = h),
          (g[5] = M));
      else M = g[5];
      return M;
    }
    case "pending": {
      let f;
      if (g[6] === MEMO_CACHE_SENTINEL)
        ((f = e(StatusIcon, { status: "loading", withSpace: !0 })), (g[6] = f));
      else f = g[6];
      let h;
      if (g[7] !== label) ((h = r(Text, { dimColor: !0, children: [f, label] })), (g[7] = label), (g[8] = h));
      else h = g[8];
      return h;
    }
    case "not_synced": {
      let f;
      if (g[9] === MEMO_CACHE_SENTINEL)
        ((f = e(Text, { "aria-label": "not synced:", children: cross })), (g[9] = f));
      else f = g[9];
      let h;
      if (g[10] !== row.words)
        ((h = r(Text, { dimColor: !0, children: [" \u2014 ", row.words] })),
          (g[10] = row.words),
          (g[11] = h));
      else h = g[11];
      let M;
      if (g[12] !== label || g[13] !== h)
        ((M = r(Text, { color: "inactive", wrap: "wrap", children: [f, " ", label, h] })),
          (g[12] = label),
          (g[13] = h),
          (g[14] = M));
      else M = g[14];
      return M;
    }
  }
}

export { RemoteSessionLinkMessage };
