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
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { isConsumerSubscriber } from "../../utils/auth.js";
import { isWebSetupEnabled } from "../../services/cloudSessions/webSetup.js";
import { GITHUB_CONNECTION_STATUS_CACHE } from "../../commands/remote-setup/api.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";

//@ chunk-6p6y0k3t.js:1500-1504 placement
init_react_production();
//@ chunk-6p6y0k3t.js:1504-1636 placement
function getCloudSessionsStatus(host, credentials, storageV5) {
  if (getAPIProvider() !== "firstParty" || !isConsumerSubscriber() || !isWebSetupEnabled()) return;
  let l = GITHUB_CONNECTION_STATUS_CACHE.of(host);
  return {
    current: () => l.peek(credentials, storageV5),
    settled: l.read(credentials, storageV5),
  };
}
//@ chunk-6p6y0k3t.js:1636-1876 placement
/**
 * 把 GitHub 连接状态转成 /status 的"Cloud sessions"行：已连接、未设置（提示 /web-setup）；未知时不显示。
 */
function getCloudSessionsStatusRows(webSetupStatus) {
  switch (webSetupStatus) {
    case "connected":
      return [
        {
          label: "Cloud sessions",
          value: "GitHub connected",
        },
      ];
    case "not_connected":
      return [
        {
          label: "Cloud sessions",
          value: "Not set up \xB7 /web-setup to connect GitHub",
        },
      ];
    case "unknown":
    case undefined:
      return [];
  }
}
//@ chunk-6p6y0k3t.js:1876-1914 placement
function selectMainLoopModel(L) {
  return L.mainLoopModel;
}
//@ chunk-6p6y0k3t.js:1914-1942 placement
function selectMcp(W) {
  return W.mcp;
}
//@ chunk-6p6y0k3t.js:1942-1993 placement
function selectPermissionMode(V) {
  return V.toolPermissionContext.mode;
}
//@ chunk-6p6y0k3t.js:1993-2037 placement
function selectRemoteSessionName(Je) {
  return Je.remoteSessionName;
}
//@ chunk-6p6y0k3t.js:2037-2066 placement
function selectSessionId(Qe) {
  return Qe.id;
}
//@ chunk-6p6y0k3t.js:2066-2100 placement
function selectCwd(Ze) {
  return getSessionProject(Ze).cwd;
}
//@ chunk-6p6y0k3t.js:2100-2135 placement
function hasItems(et) {
  return et.length > 0;
}
export {
  getCloudSessionsStatusRows,
  selectMainLoopModel,
  selectMcp,
  selectPermissionMode,
  selectRemoteSessionName,
  selectSessionId,
  selectCwd,
  hasItems,
  getCloudSessionsStatus,
};
