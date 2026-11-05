/**
 * components/Settings/CloudSessionsStatus.tsx
 *
 * 2.1.316 新增：设置页里的云会话状态
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-zpfg1kae.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { isConsumerSubscriber } from "../../utils/auth.js";
import { isWebSetupEnabled } from "../../services/cloudSessions/webSetup.js";
import { GITHUB_CONNECTION_STATUS_CACHE } from "../../commands/remote-setup/api.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-zpfg1kae.js:1505-1509 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-zpfg1kae.js:1505", () => {
  init_react_production();
});
//@ chunk-zpfg1kae.js:1509-1641 placement
function getCloudSessionsStatus(host, credentials, storageV5) {
  if (getAPIProvider() !== "firstParty" || !isConsumerSubscriber() || !isWebSetupEnabled()) return;
  let cache = GITHUB_CONNECTION_STATUS_CACHE.of(host);
  return {
    current: () => cache.peek(credentials, storageV5),
    settled: cache.read(credentials, storageV5),
  };
}
//@ chunk-zpfg1kae.js:1641-1881 placement
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
//@ chunk-zpfg1kae.js:1881-1919 placement
function selectMainLoopModel(state) {
  return state.mainLoopModel;
}
//@ chunk-zpfg1kae.js:1919-1947 placement
function selectMcp(state) {
  return state.mcp;
}
//@ chunk-zpfg1kae.js:1947-1998 placement
function selectPermissionMode(state) {
  return state.toolPermissionContext.mode;
}
//@ chunk-zpfg1kae.js:1998-2042 placement
function selectRemoteSessionName(state) {
  return state.remoteSessionName;
}
//@ chunk-zpfg1kae.js:2042-2071 placement
function selectSessionId(state) {
  return state.id;
}
//@ chunk-zpfg1kae.js:2071-2105 placement
function selectCwd(state) {
  return getSessionProject(state).cwd;
}
//@ chunk-zpfg1kae.js:2105-2140 placement
function hasItems(items) {
  return items.length > 0;
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
