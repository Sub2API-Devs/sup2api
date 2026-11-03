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

/**
 * 创建设置工具权限上下文的函数（值未变时不更新状态）。
 */
//@ chunk-mww7agq2.js:351-582 placement
function createPermissionContextSetters(t) {
  let e = (o) =>
    t((r) => {
      let i = typeof o === "function" ? o(r.toolPermissionContext) : o;
      return r.toolPermissionContext === i ? r : { ...r, toolPermissionContext: i };
    });
  return { setToolPermissionContext: e, setSessionToolPermissionContext: e };
}
//@ chunk-mww7agq2.js:582-676 placement
function KMr(t) {
  t((e) => (e.ultrareviewOverageConfirmed ? e : { ...e, ultrareviewOverageConfirmed: !0 }));
}
//@ chunk-mww7agq2.js:676-769 placement
function s(t) {
  return (e) => t((o) => ({ ...o, pendingMemoryUpdates: [...o.pendingMemoryUpdates, e] }));
}
//@ chunk-mww7agq2.js:769-849 placement
function n(t) {
  t((e) => (e.prResolvedThisSession ? e : { ...e, prResolvedThisSession: !0 }));
}
/**
 * 创建应用状态的访问与设置函数集合（PR、ultrareview、MCP、主动性、浏览器、Artifact、记忆更新、代理名等）。
 */
//@ chunk-mww7agq2.js:849-1405 placement
function createAppStateAccessors(getAppState, setAppState) {
  return {
    markPrResolvedThisSession: () => n(setAppState),
    isUltrareviewOverageConfirmed: () => getAppState().ultrareviewOverageConfirmed,
    markUltrareviewOverageConfirmed: () => KMr(setAppState),
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
    enqueuePendingMemoryUpdate: s(setAppState),
    agentLifecycle: createAgentNameRegistry(getAppState, setAppState),
  };
}

export { KMr, createAppStateAccessors, createPermissionContextSetters };
