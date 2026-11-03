/**
 * components/permissions/PermissionRequestTitle.tsx
 *
 * 权限对话框标题行（工具名、子标题、队友 WorkerBadge）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/PermissionRequestTitle.tsx
 * pieces: chunk-3v13eg2e.js (11)
 * attribution: placement 10, fingerprint 1
 */
import { j, qt, Se, yt, Oo, y, P } from "../../../vendor/react/cjs/react.production.js";
import { DialogStoreContext } from "../../state/dialogQueue.js";
import { logError } from "../../utils/log.js";
import { toApprovalLabel } from "../../utils/permissions/approvalPayloadSerialization.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";

//@ chunk-3v13eg2e.js:759-763 placement
j();
//@ chunk-3v13eg2e.js:763-767 placement
j();
//@ chunk-3v13eg2e.js:767-784 placement
var ODe = qt(null);
/**
 * 返回一个回调：调用时通知对话框存储中当前对话框已被认领（onClaimed）。
 */
//@ chunk-3v13eg2e.js:784-929 placement
function useNotifyDialogClaimed() {
  let i = Se(ODe),
    t = Se(DialogStoreContext);
  return () => {
    if (i === null || !t) return;
    try {
      t.getState()
        .open.find((o) => o.id === i)
        ?.onClaimed?.();
    } catch (error) {
      logError(error);
    }
  };
}
/**
 * 订阅并返回当前询问在本轮询问计数中的位置标签（如 2/3）。
 */
//@ chunk-3v13eg2e.js:929-1142 placement
function useAskPositionLabel() {
  let i = Se(ODe),
    t = Se(DialogStoreContext),
    o = i === null || !t ? void 0 : t.getState().open.find((d) => d.id === i)?.countedAsk,
    u = o === void 0 ? void 0 : t?.askTally;
  return yt(u?.subscribe ?? ke, () => (o === void 0 || !u ? null : u.positionLabel(o)));
}
/**
 * 对话框首次显示时执行一次回调（按对话框 id 与键去重；perReveal 时每次重新显示各算一次）。
 */
//@ chunk-3v13eg2e.js:1142-1375 placement
function useOnFirstReveal(i, t, { perReveal: o = !1 } = {}) {
  let u = Se(ODe),
    d = Se(DialogStoreContext),
    A = Oo(t),
    [a] = y(() => (o && u !== null && d ? (d.getState().open.find((p) => p.id === u)?.revealSeq ?? 0) : 0));
  P(() => {
    if (u !== null && d) {
      if (!d.firstReveal(u, o ? `${i}@${a}` : i)) return;
    }
    A();
  }, [u, d, i, o, a]);
}
//@ chunk-3v13eg2e.js:1375-1402 placement
function ke() {
  return () => {};
}
//@ chunk-3v13eg2e.js:1402-1461 placement
function V(i) {
  let t = toApprovalLabel(i);
  return t === null ? void 0 : String(t);
}
/**
 * 把权限请求来源（workflow-agent、subagent、remote-agent、plugin）转换为 "from the … agent" 之类的说明。
 */
//@ chunk-3v13eg2e.js:1461-1849 placement
function describeRequestSource(i) {
  switch (i?.type) {
    case "workflow-agent": {
      let t = V(i.workflowName);
      return t !== void 0 ? `from the "${t}" workflow` : "from a workflow";
    }
    case "subagent": {
      let t = V(i.agentName);
      return t !== void 0 ? `from the ${t} agent` : "from a subagent";
    }
    case "remote-agent":
      return "from a remote cloud agent";
    case "plugin": {
      let t = V(i.pluginName);
      return t === void 0 ? "from a plugin" : `from the ${t} plugin`;
    }
  }
  return;
}
//@ chunk-3v13eg2e.js:1849-1929 placement
function mCr(i, t, o) {
  let u = describeRequestSource(t);
  return bunStringWidth(i) + (u === void 0 ? 0 : 1 + bunStringWidth(`\xB7 ${u}`)) <= o;
}
/**
 * 权限对话框标题：工具名、副标题（截断）、队友徽章、读屏 aria-label。
 */
//@ chunk-3v13eg2e.js:1929-3158 fingerprint = PermissionRequestTitle (0.588)
function PermissionRequestTitle(t0) {
  let $ = w(25),
    {
      title: title,
      subtitle: subtitle,
      color: t1,
      requestSource: requestSource,
      srPrefix: srPrefix,
      aside: aside,
    } = t0,
    p = t1 === void 0 ? "permission" : t1,
    F;
  if ($[0] !== requestSource)
    ((F = describeRequestSource(requestSource)), ($[0] = requestSource), ($[1] = F));
  else F = $[1];
  let c = F;
  const R = srPrefix !== void 0 ? `${srPrefix} ${title}` : void 0;
  let f;
  if ($[2] !== p || $[3] !== R || $[4] !== title)
    ((f = e(Text, { "aria-label": R, bold: !0, color: p, children: title })),
      ($[2] = p),
      ($[3] = R),
      ($[4] = title),
      ($[5] = f));
  else f = $[5];
  let g;
  if ($[6] !== c)
    ((g = c !== void 0 && r(Text, { children: [e(Text, { dimColor: !0, children: "\xB7 " }), c] })),
      ($[6] = c),
      ($[7] = g));
  else g = $[7];
  let k;
  if ($[8] !== f || $[9] !== g)
    ((k = r(Box, { flexDirection: "row", gap: 1, children: [f, g] })), ($[8] = f), ($[9] = g), ($[10] = k));
  else k = $[10];
  let C = k,
    N;
  if ($[11] !== aside || $[12] !== requestSource || $[13] !== title)
    ((N = aside !== void 0 && mCr(title, requestSource, aside.rowColumns - 1 - bunStringWidth(aside.text))),
      ($[11] = aside),
      ($[12] = requestSource),
      ($[13] = title),
      ($[14] = N));
  else N = $[14];
  let L = N;
  const x = L ? 1 : void 0;
  let m;
  if ($[15] !== aside || $[16] !== L || $[17] !== C)
    ((m = L
      ? r(Box, {
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 1,
          children: [C, e(Text, { dimColor: !0, children: aside.text })],
        })
      : C),
      ($[15] = aside),
      ($[16] = L),
      ($[17] = C),
      ($[18] = m));
  else m = $[18];
  let b;
  if ($[19] !== subtitle)
    ((b =
      subtitle != null &&
      (typeof subtitle === "string"
        ? e(Text, { dimColor: !0, wrap: "truncate-start", children: subtitle })
        : subtitle)),
      ($[19] = subtitle),
      ($[20] = b));
  else b = $[20];
  let T;
  if ($[21] !== b || $[22] !== x || $[23] !== m)
    ((T = r(Box, { flexDirection: "column", flexGrow: x, children: [m, b] })),
      ($[21] = b),
      ($[22] = x),
      ($[23] = m),
      ($[24] = T));
  else T = $[24];
  return T;
}

export {
  useOnFirstReveal,
  useNotifyDialogClaimed,
  PermissionRequestTitle,
  mCr,
  ODe,
  useAskPositionLabel,
  describeRequestSource,
};
