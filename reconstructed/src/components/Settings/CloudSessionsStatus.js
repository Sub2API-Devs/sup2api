/**
 * components/Settings/CloudSessionsStatus.tsx
 *
 * 2.1.316 新增：设置页里的云会话状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6p6y0k3t.js (10)
 * attribution: placement 10
 */
import { j } from "../../../vendor/react/cjs/react.production.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { isConsumerSubscriber } from "../../utils/auth.js";
import { isWebSetupEnabled } from "../../services/cloudSessions/webSetup.js";
import { ZV } from "../../commands/remote-setup/api.js";
import { xo } from "../../bootstrap/sessionSlices.js";

//@ chunk-6p6y0k3t.js:1500-1504 placement
j();
//@ chunk-6p6y0k3t.js:1504-1636 placement
function getCloudSessionsStatus(o, t, a) {
  if (getAPIProvider() !== "firstParty" || !isConsumerSubscriber() || !isWebSetupEnabled()) return;
  let of = ZV.of(o);
  return { current: () => of.peek(t, a), settled: of.read(t, a) };
}
/**
 * 把 GitHub 连接状态转成 /status 的"Cloud sessions"行：已连接、未设置（提示 /web-setup）；未知时不显示。
 */
//@ chunk-6p6y0k3t.js:1636-1876 placement
function getCloudSessionsStatusRows(o) {
  switch (o) {
    case "connected":
      return [{ label: "Cloud sessions", value: "GitHub connected" }];
    case "not_connected":
      return [{ label: "Cloud sessions", value: "Not set up \xB7 /web-setup to connect GitHub" }];
    case "unknown":
    case void 0:
      return [];
  }
}
//@ chunk-6p6y0k3t.js:1876-1914 placement
function Be(L) {
  return L.mainLoopModel;
}
//@ chunk-6p6y0k3t.js:1914-1942 placement
function We(W) {
  return W.mcp;
}
//@ chunk-6p6y0k3t.js:1942-1993 placement
function Ve(V) {
  return V.toolPermissionContext.mode;
}
//@ chunk-6p6y0k3t.js:1993-2037 placement
function Ye(Je) {
  return Je.remoteSessionName;
}
//@ chunk-6p6y0k3t.js:2037-2066 placement
function Xe(Qe) {
  return Qe.id;
}
//@ chunk-6p6y0k3t.js:2066-2100 placement
function Ke(Ze) {
  return xo(Ze).cwd;
}
//@ chunk-6p6y0k3t.js:2100-2135 placement
function qe(et) {
  return et.length > 0;
}

export { getCloudSessionsStatusRows, Be, We, Ve, Ye, Xe, Ke, qe, getCloudSessionsStatus };
