/**
 * state/AppState.tsx
 *
 * AppState 的 React 接入：AppStateProvider 创建 store，useAppState(selector)/useSetAppState/useAppStore 钩子。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/state/AppState.tsx
 * pieces: chunk-gq18jh8s.js (12), chunk-xe7zq1p4.js (8), chunk-yj65zw1g.js (1)
 * attribution: placement 16, fingerprint 2, layout 1, callgraph-witnessed 2
 */
import { j, qt, Se, Q, Oo, P, y, yt } from "../../vendor/react/cjs/react.production.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { gCn } from "./sliceHelpers.js";
import { settingsChangeDetector } from "../utils/settings/changeDetector.js";
import { getSettings_DEPRECATED } from "../utils/settings/settings.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { createStore } from "./store.js";
import { getDefaultAppState } from "./AppStateStore.js";
import { Spe } from "../services/plugins/accountSync/syncedPluginHooks.js";
import { useInputClock } from "../ink/components/Input.js";
import { createDialogStore, DialogStoreContext } from "./dialogQueue.js";
import {
  createSpinnerStatusStore,
  AutoModeDenialsProvider,
  Kmt,
} from "../components/Spinner/spinnerStatus.js";
import { Me } from "../components/design-system/ThemeProvider.js";
import { iP } from "../context/session.js";
import { TasksV2Store, fRr } from "../hooks/useTasksV2.js";
import { FleetNudgeStore, FleetNudgeStoreContext } from "../components/fleet/FleetNudgeStore.js";
import { hasPendingHandoff, markRunningTasksForHandoff } from "../tasks/exitHandoff.js";
import { registerCleanup } from "../utils/cleanupRegistry.js";
import { McpConnectionStore } from "../services/mcp/mcpConnectionStore.js";
import { PluginsStateStore } from "../utils/plugins/pluginLoadStatus.js";
import { ComputerUseStateCell, fNt } from "../utils/computerUse/computerUseMcpState.js";
import {
  acquireMcpClientsAccessor,
  acquireMcpServerToolsSwapper,
  getIsRemoteMode,
} from "../bootstrap/state.js";
import { resetRefusalFallbackOnSwitch } from "../utils/model/refusalFallback.js";
import { applySettingsChange } from "../utils/settings/applySettingsChange.js";
import { checkAutoModeInUse } from "../utils/permissions/autoModeTransition.js";
import { whenPolicyNotified } from "../utils/permissions/permissionContextRefresh.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { InputSelectionBridgeProvider } from "../ink/inputSelectionBridge.js";
import { MailboxProvider } from "../context/mailbox.js";
import { VoiceProvider, useVoiceStateStore } from "../context/voice.js";

//@ chunk-gq18jh8s.js:307-311 placement
j();
//@ chunk-gq18jh8s.js:311-353 placement
var gM = qt(null),
  DRr = qt(null),
  LRr = qt(null);
/**
 * 读取 AppState 中的 MCP 连接上下文，必须在 AppStateProvider 内使用。
 */
//@ chunk-gq18jh8s.js:353-491 placement
function useMcpConnections() {
  let e = Se(LRr);
  if (!e) throw ReferenceError("useMcpConnections cannot be called outside of an <AppStateProvider />");
  return e;
}
//@ chunk-gq18jh8s.js:491-508 placement
var HRr = qt(null);
/**
 * 读取 AppState 中的活动插件上下文，必须在 AppStateProvider 内使用。
 */
//@ chunk-gq18jh8s.js:508-644 placement
function useActivePlugins() {
  let e = Se(HRr);
  if (!e) throw ReferenceError("useActivePlugins cannot be called outside of an <AppStateProvider />");
  return e;
}
/**
 * 读取 AppState 的会话上下文，必须在 AppStateProvider 内使用。
 */
//@ chunk-gq18jh8s.js:644-782 placement
function useAppStateSession() {
  let e = Se(DRr);
  if (!e) throw ReferenceError("useAppStateSession cannot be called outside of an <AppStateProvider />");
  return e;
}
/**
 * 取 AppStateProvider 提供的 store，不在 Provider 内时抛错。
 */
//@ chunk-gq18jh8s.js:782-926 fingerprint = useAppStore (1)
function useAppStore() {
  let store = Se(gM);
  if (!store)
    throw ReferenceError("useAppState/useSetAppState cannot be called outside of an <AppStateProvider />");
  return store;
}
/**
 * React hook：从 AppStateProvider 的 store 订阅 selector 选出的片段（useSyncExternalStore 语义），必须在 Provider 内调用。
 */
//@ chunk-gq18jh8s.js:926-965 layout
function useAppState(e) {
  let n = useAppStore();
  return useStoreSelector(n, e);
}
/**
 * 返回 store.setState，供组件更新 AppState。
 */
//@ chunk-gq18jh8s.js:965-999 callgraph-witnessed = useSetAppState (1)
function useSetAppState() {
  return useAppStore().setState;
}
//@ chunk-gq18jh8s.js:999-1058 placement
function B_o() {
  let e = useAppStore();
  return Q(() => gCn(e.setState), [e]);
}
//@ chunk-gq18jh8s.js:1058-1083 placement
function Cr() {
  return useAppStore();
}
//@ chunk-gq18jh8s.js:1083-1118 placement
function rs(e) {
  return useStoreSelector(Se(gM), e);
}
//@ chunk-xe7zq1p4.js:12465-12469 placement
j();
//@ chunk-xe7zq1p4.js:12469-12550 placement
function kJe(n) {
  let r = Oo(n);
  P(
    () =>
      settingsChangeDetector.subscribe((i, o) => {
        let a = getSettings_DEPRECATED();
        r(i, a, o);
      }),
    [],
  );
}
//@ chunk-xe7zq1p4.js:12550-12554 placement
j();
//@ chunk-xe7zq1p4.js:12554-12570 placement
var he = qt(null);
/**
 * 读取会话钩子注册表上下文，必须在 AppStateProvider 内使用。
 */
//@ chunk-xe7zq1p4.js:12570-12713 placement
function useSessionHooksRegistry() {
  let n = Se(he);
  if (!n) throw ReferenceError("useSessionHooksRegistry cannot be called outside of an <AppStateProvider />");
  return n;
}
//@ chunk-xe7zq1p4.js:12713-12793 placement = useTasksV2WithCollapseEffect (1)
function useTasksV2WithCollapseEffect(Fe) {
  return Fe.expandedView === "tasks" ? { ...Fe, expandedView: "none" } : Fe;
}
//@ chunk-xe7zq1p4.js:12793-12814 placement
var ye = qt(!1),
  J = null;
/**
 * 创建 AppState store（不可嵌套），监听设置变更并把设置同步进 AppState。
 */
//@ chunk-xe7zq1p4.js:12814-16717 fingerprint = AppStateProvider (0.4)
function AppStateProvider(t0) {
  let u = w(86),
    {
      children: children,
      store: store,
      initialState: initialState,
      onChangeAppState: onChangeAppState,
      fleetNudgeStore: fleetNudgeStore,
      writesExitHandoff: writesExitHandoff,
      sessionHooks: sessionHooks,
    } = t0,
    T = writesExitHandoff === void 0 ? !1 : writesExitHandoff;
  if (Se(ye)) {
    throw Error("AppStateProvider can not be nested within another AppStateProvider");
  }
  let B;
  if (u[0] !== initialState || u[1] !== onChangeAppState || u[2] !== store)
    ((B = () => store ?? createStore(initialState ?? getDefaultAppState(), onChangeAppState)),
      (u[0] = initialState),
      (u[1] = onChangeAppState),
      (u[2] = store),
      (u[3] = B));
  else B = u[3];
  let [p] = y(B),
    U;
  if (u[4] !== sessionHooks) ((U = () => sessionHooks ?? Spe()), (u[4] = sessionHooks), (u[5] = U));
  else U = u[5];
  let [I] = y(U),
    G = useInputClock(),
    _;
  if (u[6] !== G) ((_ = () => createDialogStore(G)), (u[6] = G), (u[7] = _));
  else _ = u[7];
  let [N] = y(_),
    [x] = y(createSpinnerStatusStore),
    { storageV5: storageV5 } = Me(),
    d = iP(),
    f;
  if (u[8] !== storageV5 || u[9] !== p)
    ((f = () => new TasksV2Store(storageV5, globalThis, () => p.setState(useTasksV2WithCollapseEffect))),
      (u[8] = storageV5),
      (u[9] = p),
      (u[10] = f));
  else f = u[10];
  let [C] = y(f),
    g;
  if (u[11] !== fleetNudgeStore || u[12] !== storageV5)
    ((g = () => fleetNudgeStore ?? new FleetNudgeStore({ storageV5: storageV5 })),
      (u[11] = fleetNudgeStore),
      (u[12] = storageV5),
      (u[13] = g));
  else g = u[13];
  let [h] = y(g),
    A;
  if (u[14] !== storageV5)
    ((A = () => (J ? new J.SessionRosterStore({ storageV5: storageV5 }) : null)),
      (u[14] = storageV5),
      (u[15] = A));
  else A = u[15];
  let [m] = y(A),
    [H] = y(T),
    [V] = y(storageV5),
    k,
    v;
  if (u[16] !== V || u[17] !== p || u[18] !== H)
    ((k = () => {
      let O = H
        ? () => hasPendingHandoff(p.getState().tasks, V)
        : () => markRunningTasksForHandoff(p.getState().tasks);
      let hasAppStateContext = registerCleanup(O);
      return () => {
        (O(), hasAppStateContext());
      };
    }),
      (v = [p, H, V]),
      (u[16] = V),
      (u[17] = p),
      (u[18] = H),
      (u[19] = k),
      (u[20] = v));
  else ((k = u[19]), (v = u[20]));
  P(k, v);
  let q;
  if (u[21] !== p) ((q = () => McpConnectionStore.over(p)), (u[21] = p), (u[22] = q));
  else q = u[22];
  let [K] = y(q),
    ne;
  if (u[23] !== p) ((ne = () => PluginsStateStore.over(p)), (u[23] = p), (u[24] = ne));
  else ne = u[24];
  let [D] = y(ne),
    L;
  if (u[25] !== K || u[26] !== d?.mcpSessionWiring)
    ((L = () => d?.mcpSessionWiring.acquireConnections(K)),
      (u[25] = K),
      (u[26] = d?.mcpSessionWiring),
      (u[27] = L));
  else L = u[27];
  let z;
  if (u[28] !== K || u[29] !== d) ((z = [d, K]), (u[28] = K), (u[29] = d), (u[30] = z));
  else z = u[30];
  P(L, z);
  let re;
  if (u[31] !== p) ((re = () => ComputerUseStateCell.over(p)), (u[31] = p), (u[32] = re));
  else re = u[32];
  let [be] = y(re),
    vt,
    xt;
  if (u[33] !== be || u[34] !== d)
    ((vt = () => {
      if (d === void 0) {
        return;
      }
      return fNt.of(d).acquire(be);
    }),
      (xt = [d, be]),
      (u[33] = be),
      (u[34] = d),
      (u[35] = vt),
      (u[36] = xt));
  else ((vt = u[35]), (xt = u[36]));
  P(vt, xt);
  let Rt, Ct;
  if (u[37] !== K)
    ((Rt = () => acquireMcpClientsAccessor(() => K.get().clients)),
      (Ct = [K]),
      (u[37] = K),
      (u[38] = Rt),
      (u[39] = Ct));
  else ((Rt = u[38]), (Ct = u[39]));
  P(Rt, Ct);
  let Pt, wt;
  if (u[40] !== K)
    ((Pt = () => acquireMcpServerToolsSwapper((jn, Tn, Bn) => K.swapServerTools(jn, Tn, Bn))),
      (wt = [K]),
      (u[40] = K),
      (u[41] = Pt),
      (u[42] = wt));
  else ((Pt = u[41]), (wt = u[42]));
  P(Pt, wt);
  let kt;
  if (u[43] !== p.setState)
    ((kt = () => resetRefusalFallbackOnSwitch(p.setState)), (u[43] = p.setState), (u[44] = kt));
  else kt = u[44];
  let Kt;
  if (u[45] !== p) ((Kt = [p]), (u[45] = p), (u[46] = Kt));
  else Kt = u[46];
  P(kt, Kt);
  let Et;
  if (u[47] !== d || u[48] !== storageV5 || u[49] !== p)
    ((Et = (In, Ur, Vn) => {
      if ((applySettingsChange(d, In, p.setState, storageV5, Vn), !getIsRemoteMode()))
        checkAutoModeInUse(p.getState().toolPermissionContext, p.setState, p.getState().fastMode);
    }),
      (u[47] = d),
      (u[48] = storageV5),
      (u[49] = p),
      (u[50] = Et));
  else Et = u[50];
  let onSettingsChange = Oo(Et);
  kJe(onSettingsChange);
  let Mt;
  if (u[51] !== onSettingsChange)
    ((Mt = () => {
      whenPolicyNotified(() => onSettingsChange("policySettings"));
    }),
      (u[51] = onSettingsChange),
      (u[52] = Mt));
  else Mt = u[52];
  let Nt;
  if (u[53] === MEMO_CACHE_SENTINEL) ((Nt = []), (u[53] = Nt));
  else Nt = u[53];
  P(Mt, Nt);
  const Ve = d ?? null;
  let Re;
  if (u[54] !== children || u[55] !== m)
    ((Re = J && m ? e(J.SessionRosterStoreContext.Provider, { value: m, children: children }) : children),
      (u[54] = children),
      (u[55] = m),
      (u[56] = Re));
  else Re = u[56];
  let Ce;
  if (u[57] !== Re)
    ((Ce = e(AutoModeDenialsProvider, { children: e(InputSelectionBridgeProvider, { children: Re }) })),
      (u[57] = Re),
      (u[58] = Ce));
  else Ce = u[58];
  let Pe;
  if (u[59] !== h || u[60] !== Ce)
    ((Pe = e(FleetNudgeStoreContext.Provider, { value: h, children: Ce })),
      (u[59] = h),
      (u[60] = Ce),
      (u[61] = Pe));
  else Pe = u[61];
  let we;
  if (u[62] !== Pe || u[63] !== C)
    ((we = e(fRr.Provider, { value: C, children: Pe })), (u[62] = Pe), (u[63] = C), (u[64] = we));
  else we = u[64];
  let ke;
  if (u[65] !== x || u[66] !== we)
    ((ke = e(Kmt.Provider, { value: x, children: we })), (u[65] = x), (u[66] = we), (u[67] = ke));
  else ke = u[67];
  let Ke;
  if (u[68] !== N || u[69] !== ke)
    ((Ke = e(MailboxProvider, {
      children: e(VoiceProvider, { children: e(DialogStoreContext.Provider, { value: N, children: ke }) }),
    })),
      (u[68] = N),
      (u[69] = ke),
      (u[70] = Ke));
  else Ke = u[70];
  let Ee;
  if (u[71] !== I || u[72] !== Ke)
    ((Ee = e(he.Provider, { value: I, children: Ke })), (u[71] = I), (u[72] = Ke), (u[73] = Ee));
  else Ee = u[73];
  let Ne;
  if (u[74] !== Ve || u[75] !== Ee)
    ((Ne = e(DRr.Provider, { value: Ve, children: Ee })), (u[74] = Ve), (u[75] = Ee), (u[76] = Ne));
  else Ne = u[76];
  let Ae;
  if (u[77] !== D || u[78] !== Ne)
    ((Ae = e(HRr.Provider, { value: D, children: Ne })), (u[77] = D), (u[78] = Ne), (u[79] = Ae));
  else Ae = u[79];
  let He;
  if (u[80] !== K || u[81] !== Ae)
    ((He = e(LRr.Provider, { value: K, children: Ae })), (u[80] = K), (u[81] = Ae), (u[82] = He));
  else He = u[82];
  let At;
  if (u[83] !== p || u[84] !== He)
    ((At = e(ye.Provider, { value: !0, children: e(gM.Provider, { value: p, children: He }) })),
      (u[83] = p),
      (u[84] = He),
      (u[85] = At));
  else At = u[85];
  return At;
}
//@ chunk-yj65zw1g.js:1055-1203 callgraph-witnessed = useAppState (1)
function useAppState_2(selector) {
  let n = w(3),
    store = useVoiceStateStore(),
    t0;
  if (n[0] !== selector || n[1] !== store)
    ((t0 = () => selector(store.getState())), (n[0] = selector), (n[1] = store), (n[2] = t0));
  else t0 = n[2];
  let get = t0;
  return yt(store.subscribe, get, get);
}

export {
  useAppState,
  Cr,
  useSetAppState,
  rs,
  useAppStateSession,
  B_o,
  useActivePlugins,
  useSessionHooksRegistry,
  gM,
  useAppState_2,
  useMcpConnections,
  kJe,
  AppStateProvider,
};
