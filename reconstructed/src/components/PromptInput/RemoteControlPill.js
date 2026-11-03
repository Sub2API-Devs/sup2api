/**
 * components/PromptInput/RemoteControlPill.tsx
 *
 * 2.1.316 新增：输入框底部的 Remote Control 状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (12)
 * attribution: placement 12
 */
import { ao } from "../../bridge/bridgeHostState.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { getBridgeStatus } from "../../bridge/bridgeStatusUtil.js";
import { j, P } from "../../../vendor/react/cjs/react.production.js";
import { sequential } from "../../utils/sequential.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { Me } from "../design-system/ThemeProvider.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Link, Text } from "../../ink/components/Text.js";

//@ chunk-ag5x7vhf.js:46516-46546 placement
var RC_ACTIVE_BADGE_KEY = "rc-active-badge",
  CM = 5;
//@ chunk-ag5x7vhf.js:46546-46681 placement
function isVerboseRcActive() {
  let m = ao();
  if (m.verboseRcActive === void 0)
    m.verboseRcActive = (getGlobalConfig().seenNotifications?.[RC_ACTIVE_BADGE_KEY] ?? 0) < CM;
  return m.verboseRcActive;
}
//@ chunk-ag5x7vhf.js:46681-46735 placement
function rcPillLabel(m) {
  return m === "/rc active" && !isVerboseRcActive() ? "/rc" : m;
}
//@ chunk-ag5x7vhf.js:46735-46840 placement
function withFromCliParam(m) {
  try {
    let h = new URL(m);
    return (h.searchParams.set("from", "cli"), h.toString());
  } catch {
    return m;
  }
}
//@ chunk-ag5x7vhf.js:46840-46910 placement
function logRcPillClicked(m, h) {
  logEvent("tengu_rc_pill_clicked", { trigger: fromEnum(m), label: fromEnum(h) });
}
/**
 * 输入框底部的 Remote Control 状态胶囊（/rc active）：显示连接/错误状态，点击打开会话链接。
 */
//@ chunk-ag5x7vhf.js:46910-47101 placement
function RemoteControlPill(m) {
  let { label: label } = getBridgeStatus({
    error: m.replBridgeError,
    connected: m.replBridgeConnected,
    sessionActive: m.replBridgeSessionActive,
    reconnecting: m.replBridgeReconnecting,
  });
  logRcPillClicked("keyboard", rcPillLabel(label));
}
//@ chunk-ag5x7vhf.js:47101-47313 placement
function recordRcActiveImpression(m) {
  let h = ao();
  if (h.rcActiveImpressionRecorded) return;
  if (!isVerboseRcActive()) return;
  ((h.rcActiveImpressionRecorded = !0),
    saveGlobalConfig((x) => {
      let T = x.seenNotifications ?? {};
      return { ...x, seenNotifications: { ...T, [RC_ACTIVE_BADGE_KEY]: (T[RC_ACTIVE_BADGE_KEY] ?? 0) + 1 } };
    }, m));
}
//@ chunk-ag5x7vhf.js:47313-47317 placement
j();
//@ chunk-ag5x7vhf.js:47317-47364 placement = _temp4 (1)
function selectBridgeSessionUrl(s) {
  return s.replBridgeSessionUrl;
}
//@ chunk-ag5x7vhf.js:47788-47883 placement
function shortRcLabel(m) {
  return sequential.level === 0 && m.label !== "/rc active" ? m.label.replace(/^\/rc/, "rc") : "rc";
}
//@ chunk-ag5x7vhf.js:47883-48674 placement
function RemoteControlStatus(m) {
  let A = w(16),
    { status: status, highlighted: highlighted, compact: compact } = m,
    k = highlighted === void 0 ? !1 : highlighted,
    _ = useAppState(selectBridgeSessionUrl),
    { storageV5: storageV5 } = Me(),
    D = compact !== void 0,
    L,
    V;
  if (A[0] !== D || A[1] !== status.label || A[2] !== storageV5)
    ((L = () => {
      if (!D && status.label === "/rc active") recordRcActiveImpression(storageV5);
    }),
      (V = [D, status.label, storageV5]),
      (A[0] = D),
      (A[1] = status.label),
      (A[2] = storageV5),
      (A[3] = L),
      (A[4] = V));
  else ((L = A[3]), (V = A[4]));
  P(L, V);
  let W;
  if (A[5] !== compact?.label || A[6] !== status.label)
    ((W = compact?.label ?? rcPillLabel(status.label)),
      (A[5] = compact?.label),
      (A[6] = status.label),
      (A[7] = W));
  else W = A[7];
  let z = W,
    K = k ? "background" : void 0;
  const q = compact?.ink.color ?? K ?? status.color,
    Y = compact?.ink.bold,
    pe = compact?.ink.inverse ?? k;
  let xe;
  if (A[8] !== z || A[9] !== _)
    ((xe = _ ? e(Link, { url: withFromCliParam(_), children: z }) : z), (A[8] = z), (A[9] = _), (A[10] = xe));
  else xe = A[10];
  let ge;
  if (A[11] !== q || A[12] !== Y || A[13] !== pe || A[14] !== xe)
    ((ge = e(Text, { color: q, bold: Y, inverse: pe, wrap: "truncate", children: xe })),
      (A[11] = q),
      (A[12] = Y),
      (A[13] = pe),
      (A[14] = xe),
      (A[15] = ge));
  else ge = A[15];
  return ge;
}
//@ chunk-ag5x7vhf.js:48674-48678 placement
j();

export { RemoteControlPill, RemoteControlStatus, shortRcLabel, rcPillLabel, logRcPillClicked };
