/**
 * state/appStateSetters.ts
 *
 * 2.1.316 新增：AppState setter。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mww7agq2.js (5)
 * attribution: placement 5
 */
import { makeSetWebBrowserSlice } from "./webBrowserSlice.js";
import {
  makeSetArtifactReadVersion,
  artifactReadObservationIn,
  makeSetArtifactContractTarget,
  makeGetArtifactContractTarget,
} from "../services/artifacts/readObservation.js";
import { createArtifactSessionStores } from "../services/artifacts/artifactReadConsent.js";
import { createAgentNameRegistry } from "../utils/agentNameRegistry.js";

//@ chunk-mww7agq2.js:351-582 placement
/**
 * 创建设置工具权限上下文的函数（值未变时不更新状态）。
 */
function createPermissionContextSetters(setAppState) {
  let e = (o) =>
    setAppState((r) => {
      let i = typeof o === "function" ? o(r.toolPermissionContext) : o;
      return r.toolPermissionContext === i
        ? r
        : {
            ...r,
            toolPermissionContext: i,
          };
    });
  return {
    setToolPermissionContext: e,
    setSessionToolPermissionContext: e,
  };
}
//@ chunk-mww7agq2.js:582-676 placement
/**
 * 把 ultrareview 超额确认标记写入应用状态。
 */
function confirmUltrareviewOverage(t) {
  t((e) =>
    e.ultrareviewOverageConfirmed
      ? e
      : {
          ...e,
          ultrareviewOverageConfirmed: true,
        },
  );
}
//@ chunk-mww7agq2.js:676-769 placement
/**
 * 生成一个把记忆更新追加到待处理列表的设置函数。
 */
function appendPendingMemoryUpdate(setAppState) {
  return (e) =>
    setAppState((o) => ({
      ...o,
      pendingMemoryUpdates: [...o.pendingMemoryUpdates, e],
    }));
}
//@ chunk-mww7agq2.js:769-849 placement
/**
 * 生成一个把「本会话已处理 PR」标记写入应用状态的设置函数。
 */
function markPrResolvedThisSession(setAppState) {
  setAppState((e) =>
    e.prResolvedThisSession
      ? e
      : {
          ...e,
          prResolvedThisSession: true,
        },
  );
}
//@ chunk-mww7agq2.js:849-1405 placement
/**
 * 创建应用状态的访问与设置函数集合（PR、ultrareview、MCP、主动性、浏览器、Artifact、记忆更新、代理名等）。
 */
function createAppStateAccessors(getAppState, setAppState) {
  return {
    markPrResolvedThisSession: () => markPrResolvedThisSession(setAppState),
    isUltrareviewOverageConfirmed: () => getAppState().ultrareviewOverageConfirmed,
    markUltrareviewOverageConfirmed: () => confirmUltrareviewOverage(setAppState),
    getAdvisorSetting: () => getAppState().advisorModel,
    getMcp: () => getAppState().mcp,
    getProactivityLevel: () => getAppState().proactivityLevel,
    getWebBrowser: () => getAppState().webBrowser,
    ...createPermissionContextSetters(setAppState),
    setWebBrowserSlice: makeSetWebBrowserSlice(setAppState),
    setArtifactReadVersion: makeSetArtifactReadVersion(setAppState),
    getArtifactReadObservation: artifactReadObservationIn(getAppState),
    artifactRegistries: createArtifactSessionStores(getAppState, setAppState),
    setArtifactContractTarget: makeSetArtifactContractTarget(setAppState),
    getArtifactContractTarget: makeGetArtifactContractTarget(getAppState),
    enqueuePendingMemoryUpdate: appendPendingMemoryUpdate(setAppState),
    agentLifecycle: createAgentNameRegistry(getAppState, setAppState),
  };
}
export { confirmUltrareviewOverage, createAppStateAccessors, createPermissionContextSetters };
