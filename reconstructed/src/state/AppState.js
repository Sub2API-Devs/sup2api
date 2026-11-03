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
import { init_react_production, qt, Se, Q, Oo, P, y, yt } from "../../vendor/react/cjs/react.production.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { mergeSlicePatch } from "./sliceHelpers.js";
import { settingsChangeDetector } from "../utils/settings/changeDetector.js";
import { getSettings_DEPRECATED } from "../utils/settings/settings.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { createStore } from "./store.js";
import { getDefaultAppState } from "./AppStateStore.js";
import { createSessionHooksRegistry } from "../services/plugins/accountSync/syncedPluginHooks.js";
import { useInputClock } from "../ink/components/Input.js";
import { createDialogStore, DialogStoreContext } from "./dialogQueue.js";
import {
  createSpinnerStatusStore,
  AutoModeDenialsProvider,
  statusOverrideSlot,
} from "../components/Spinner/spinnerStatus.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { useSessionOrUndefined } from "../context/session.js";
import { TasksV2Store, taskListSignal } from "../hooks/useTasksV2.js";
import { FleetNudgeStore, FleetNudgeStoreContext } from "../components/fleet/FleetNudgeStore.js";
import { hasPendingHandoff, markRunningTasksForHandoff } from "../tasks/exitHandoff.js";
import { registerCleanup } from "../utils/cleanupRegistry.js";
import { McpConnectionStore } from "../services/mcp/mcpConnectionStore.js";
import { PluginsStateStore } from "../utils/plugins/pluginLoadStatus.js";
import { ComputerUseStateCell, computerUseOwnerLock } from "../utils/computerUse/computerUseMcpState.js";
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
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { InputSelectionBridgeProvider } from "../ink/inputSelectionBridge.js";
import { MailboxProvider } from "../context/mailbox.js";
import { VoiceProvider } from "../context/voice.js";
import { useVoiceStateStore } from "../_unattributed/chunk-yj65zw1g/part-001.js";

//@ chunk-gq18jh8s.js:307-311 placement
init_react_production();
//@ chunk-gq18jh8s.js:311-353 placement
/**
 * AppStateProvider 提供的 store 上下文。
 */
var appStoreContext = qt(null);
var sessionContext = qt(null);
var mcpConnectionsContext = qt(null);
//@ chunk-gq18jh8s.js:353-491 placement
/**
 * 读取 AppState 中的 MCP 连接上下文，必须在 AppStateProvider 内使用。
 */
function useMcpConnections() {
  let e = Se(mcpConnectionsContext);
  if (!e) throw ReferenceError("useMcpConnections cannot be called outside of an <AppStateProvider />");
  return e;
}
//@ chunk-gq18jh8s.js:491-508 placement
/**
 * AppState 的活动插件上下文。
 */
var activePluginsContext = qt(null);
//@ chunk-gq18jh8s.js:508-644 placement
/**
 * 读取 AppState 中的活动插件上下文，必须在 AppStateProvider 内使用。
 */
function useActivePlugins() {
  let e = Se(activePluginsContext);
  if (!e) throw ReferenceError("useActivePlugins cannot be called outside of an <AppStateProvider />");
  return e;
}
//@ chunk-gq18jh8s.js:644-782 placement
/**
 * 读取 AppState 的会话上下文，必须在 AppStateProvider 内使用。
 */
function useAppStateSession() {
  let e = Se(sessionContext);
  if (!e) throw ReferenceError("useAppStateSession cannot be called outside of an <AppStateProvider />");
  return e;
}
//@ chunk-gq18jh8s.js:782-926 fingerprint = useAppStore (1)
/**
 * 取 AppStateProvider 提供的 store，不在 Provider 内时抛错。
 */
function useAppStore() {
  let store = Se(appStoreContext);
  if (!store)
    throw ReferenceError("useAppState/useSetAppState cannot be called outside of an <AppStateProvider />");
  return store;
}
//@ chunk-gq18jh8s.js:926-965 layout
/**
 * React hook：从 AppStateProvider 的 store 订阅 selector 选出的片段（useSyncExternalStore 语义），必须在 Provider 内调用。
 */
function useAppState(e) {
  let appStore = useAppStore();
  return useStoreSelector(appStore, e);
}
//@ chunk-gq18jh8s.js:965-999 callgraph-witnessed = useSetAppState (1)
/**
 * 返回 store.setState，供组件更新 AppState。
 */
function useSetAppState() {
  return useAppStore().setState;
}
//@ chunk-gq18jh8s.js:999-1058 placement
/**
 * 返回稳定的 setState 包装（memo 化）。
 */
function useSetAppStateFn() {
  let appStore = useAppStore();
  return Q(() => mergeSlicePatch(appStore.setState), [appStore]);
}
//@ chunk-gq18jh8s.js:1058-1083 placement
/**
 * 直接返回 AppState store。
 */
function useAppStoreDirect() {
  return useAppStore();
}
//@ chunk-gq18jh8s.js:1083-1118 placement
/**
 * 从 store 订阅 selector 选出的片段。
 */
function useAppStateSlice(e) {
  return useStoreSelector(Se(appStoreContext), e);
}
//@ chunk-xe7zq1p4.js:12465-12469 placement
init_react_production();
//@ chunk-xe7zq1p4.js:12469-12550 placement
/**
 * 设置变更时把设置同步进 AppState 的副作用。
 */
function useSettingsSyncEffect(n) {
  let r = Oo(n);
  P(
    () =>
      settingsChangeDetector.subscribe((i, o) => {
        let settings_DEPRECATED = getSettings_DEPRECATED();
        r(i, settings_DEPRECATED, o);
      }),
    [],
  );
}
//@ chunk-xe7zq1p4.js:12550-12554 placement
init_react_production();
//@ chunk-xe7zq1p4.js:12554-12570 placement
/**
 * 会话钩子注册表上下文。
 */
var sessionHooksRegistryContext = qt(null);
//@ chunk-xe7zq1p4.js:12570-12713 placement
/**
 * 读取会话钩子注册表上下文，必须在 AppStateProvider 内使用。
 */
function useSessionHooksRegistry() {
  let n = Se(sessionHooksRegistryContext);
  if (!n) throw ReferenceError("useSessionHooksRegistry cannot be called outside of an <AppStateProvider />");
  return n;
}
//@ chunk-xe7zq1p4.js:12713-12793 placement = useTasksV2WithCollapseEffect (1)
function useTasksV2WithCollapseEffect(Fe) {
  return Fe.expandedView === "tasks"
    ? {
        ...Fe,
        expandedView: "none",
      }
    : Fe;
}
//@ chunk-xe7zq1p4.js:12793-12814 placement
/**
 * 惰性加载的 SessionRosterStore 构造器。
 */
var providerNestedFlag = qt(false);
var sessionRosterStoreClass = null;
//@ chunk-xe7zq1p4.js:12814-16717 fingerprint = AppStateProvider (0.4)
/**
 * 创建 AppState store（不可嵌套），监听设置变更并把设置同步进 AppState。
 */
function AppStateProvider(props) {
  let u = w(86);
  let { children, store, initialState, onChangeAppState, fleetNudgeStore, writesExitHandoff, sessionHooks } =
    props;
  let T = writesExitHandoff === undefined ? false : writesExitHandoff;
  if (Se(providerNestedFlag)) {
    throw Error("AppStateProvider can not be nested within another AppStateProvider");
  }
  let B;
  if (u[0] !== initialState || u[1] !== onChangeAppState || u[2] !== store) {
    B = () => store ?? createStore(initialState ?? getDefaultAppState(), onChangeAppState);
    u[0] = initialState;
    u[1] = onChangeAppState;
    u[2] = store;
    u[3] = B;
  } else B = u[3];
  let [p] = y(B);
  let U;
  if (u[4] !== sessionHooks) {
    U = () => sessionHooks ?? createSessionHooksRegistry();
    u[4] = sessionHooks;
    u[5] = U;
  } else U = u[5];
  let [I] = y(U);
  let inputClock = useInputClock();
  let _;
  if (u[6] !== inputClock) {
    _ = () => createDialogStore(inputClock);
    u[6] = inputClock;
    u[7] = _;
  } else _ = u[7];
  let [N] = y(_);
  let [x] = y(createSpinnerStatusStore);
  let { storageV5 } = useTheme_2();
  let sessionOrUndefined = useSessionOrUndefined();
  let f;
  if (u[8] !== storageV5 || u[9] !== p) {
    f = () => new TasksV2Store(storageV5, globalThis, () => p.setState(useTasksV2WithCollapseEffect));
    u[8] = storageV5;
    u[9] = p;
    u[10] = f;
  } else f = u[10];
  let [C] = y(f);
  let g;
  if (u[11] !== fleetNudgeStore || u[12] !== storageV5) {
    g = () =>
      fleetNudgeStore ??
      new FleetNudgeStore({
        storageV5,
      });
    u[11] = fleetNudgeStore;
    u[12] = storageV5;
    u[13] = g;
  } else g = u[13];
  let [h] = y(g);
  let A;
  if (u[14] !== storageV5) {
    A = () =>
      sessionRosterStoreClass
        ? new sessionRosterStoreClass.SessionRosterStore({
            storageV5,
          })
        : null;
    u[14] = storageV5;
    u[15] = A;
  } else A = u[15];
  let [m] = y(A);
  let [H] = y(T);
  let [V] = y(storageV5);
  let k;
  let v;
  if (u[16] !== V || u[17] !== p || u[18] !== H) {
    k = () => {
      let O = H
        ? () => hasPendingHandoff(p.getState().tasks, V)
        : () => markRunningTasksForHandoff(p.getState().tasks);
      let hasAppStateContext = registerCleanup(O);
      return () => {
        O();
        hasAppStateContext();
      };
    };
    v = [p, H, V];
    u[16] = V;
    u[17] = p;
    u[18] = H;
    u[19] = k;
    u[20] = v;
  } else {
    k = u[19];
    v = u[20];
  }
  P(k, v);
  let q;
  if (u[21] !== p) {
    q = () => McpConnectionStore.over(p);
    u[21] = p;
    u[22] = q;
  } else q = u[22];
  let [K] = y(q);
  let ne;
  if (u[23] !== p) {
    ne = () => PluginsStateStore.over(p);
    u[23] = p;
    u[24] = ne;
  } else ne = u[24];
  let [D] = y(ne);
  let L;
  if (u[25] !== K || u[26] !== sessionOrUndefined?.mcpSessionWiring) {
    L = () => sessionOrUndefined?.mcpSessionWiring.acquireConnections(K);
    u[25] = K;
    u[26] = sessionOrUndefined?.mcpSessionWiring;
    u[27] = L;
  } else L = u[27];
  let z;
  if (u[28] !== K || u[29] !== sessionOrUndefined) {
    z = [sessionOrUndefined, K];
    u[28] = K;
    u[29] = sessionOrUndefined;
    u[30] = z;
  } else z = u[30];
  P(L, z);
  let re;
  if (u[31] !== p) {
    re = () => ComputerUseStateCell.over(p);
    u[31] = p;
    u[32] = re;
  } else re = u[32];
  let [be] = y(re);
  let vt;
  let xt;
  if (u[33] !== be || u[34] !== sessionOrUndefined) {
    vt = () => {
      if (sessionOrUndefined === undefined) {
        return;
      }
      return computerUseOwnerLock.of(sessionOrUndefined).acquire(be);
    };
    xt = [sessionOrUndefined, be];
    u[33] = be;
    u[34] = sessionOrUndefined;
    u[35] = vt;
    u[36] = xt;
  } else {
    vt = u[35];
    xt = u[36];
  }
  P(vt, xt);
  let Rt;
  let Ct;
  if (u[37] !== K) {
    Rt = () => acquireMcpClientsAccessor(() => K.get().clients);
    Ct = [K];
    u[37] = K;
    u[38] = Rt;
    u[39] = Ct;
  } else {
    Rt = u[38];
    Ct = u[39];
  }
  P(Rt, Ct);
  let Pt;
  let wt;
  if (u[40] !== K) {
    Pt = () => acquireMcpServerToolsSwapper((jn, Tn, Bn) => K.swapServerTools(jn, Tn, Bn));
    wt = [K];
    u[40] = K;
    u[41] = Pt;
    u[42] = wt;
  } else {
    Pt = u[41];
    wt = u[42];
  }
  P(Pt, wt);
  let kt;
  if (u[43] !== p.setState) {
    kt = () => resetRefusalFallbackOnSwitch(p.setState);
    u[43] = p.setState;
    u[44] = kt;
  } else kt = u[44];
  let Kt;
  if (u[45] !== p) {
    Kt = [p];
    u[45] = p;
    u[46] = Kt;
  } else Kt = u[46];
  P(kt, Kt);
  let Et;
  if (u[47] !== sessionOrUndefined || u[48] !== storageV5 || u[49] !== p) {
    Et = (In, Ur, Vn) => {
      applySettingsChange(sessionOrUndefined, In, p.setState, storageV5, Vn);
      if (!getIsRemoteMode())
        checkAutoModeInUse(p.getState().toolPermissionContext, p.setState, p.getState().fastMode);
    };
    u[47] = sessionOrUndefined;
    u[48] = storageV5;
    u[49] = p;
    u[50] = Et;
  } else Et = u[50];
  let onSettingsChange = Oo(Et);
  useSettingsSyncEffect(onSettingsChange);
  let Mt;
  if (u[51] !== onSettingsChange) {
    Mt = () => {
      whenPolicyNotified(() => onSettingsChange("policySettings"));
    };
    u[51] = onSettingsChange;
    u[52] = Mt;
  } else Mt = u[52];
  let Nt;
  if (u[53] === MEMO_CACHE_SENTINEL) {
    Nt = [];
    u[53] = Nt;
  } else Nt = u[53];
  P(Mt, Nt);
  const value = sessionOrUndefined ?? null;
  let children_2;
  if (u[54] !== children || u[55] !== m) {
    children_2 =
      sessionRosterStoreClass && m
        ? jsxProd_default(sessionRosterStoreClass.SessionRosterStoreContext.Provider, {
            value: m,
            children,
          })
        : children;
    u[54] = children;
    u[55] = m;
    u[56] = children_2;
  } else children_2 = u[56];
  let children_3;
  if (u[57] !== children_2) {
    children_3 = jsxProd_default(AutoModeDenialsProvider, {
      children: jsxProd_default(InputSelectionBridgeProvider, {
        children: children_2,
      }),
    });
    u[57] = children_2;
    u[58] = children_3;
  } else children_3 = u[58];
  let children_4;
  if (u[59] !== h || u[60] !== children_3) {
    children_4 = jsxProd_default(FleetNudgeStoreContext.Provider, {
      value: h,
      children: children_3,
    });
    u[59] = h;
    u[60] = children_3;
    u[61] = children_4;
  } else children_4 = u[61];
  let children_5;
  if (u[62] !== children_4 || u[63] !== C) {
    children_5 = jsxProd_default(taskListSignal.Provider, {
      value: C,
      children: children_4,
    });
    u[62] = children_4;
    u[63] = C;
    u[64] = children_5;
  } else children_5 = u[64];
  let children_6;
  if (u[65] !== x || u[66] !== children_5) {
    children_6 = jsxProd_default(statusOverrideSlot.Provider, {
      value: x,
      children: children_5,
    });
    u[65] = x;
    u[66] = children_5;
    u[67] = children_6;
  } else children_6 = u[67];
  let children_7;
  if (u[68] !== N || u[69] !== children_6) {
    children_7 = jsxProd_default(MailboxProvider, {
      children: jsxProd_default(VoiceProvider, {
        children: jsxProd_default(DialogStoreContext.Provider, {
          value: N,
          children: children_6,
        }),
      }),
    });
    u[68] = N;
    u[69] = children_6;
    u[70] = children_7;
  } else children_7 = u[70];
  let children_8;
  if (u[71] !== I || u[72] !== children_7) {
    children_8 = jsxProd_default(sessionHooksRegistryContext.Provider, {
      value: I,
      children: children_7,
    });
    u[71] = I;
    u[72] = children_7;
    u[73] = children_8;
  } else children_8 = u[73];
  let children_9;
  if (u[74] !== value || u[75] !== children_8) {
    children_9 = jsxProd_default(sessionContext.Provider, {
      value,
      children: children_8,
    });
    u[74] = value;
    u[75] = children_8;
    u[76] = children_9;
  } else children_9 = u[76];
  let children_10;
  if (u[77] !== D || u[78] !== children_9) {
    children_10 = jsxProd_default(activePluginsContext.Provider, {
      value: D,
      children: children_9,
    });
    u[77] = D;
    u[78] = children_9;
    u[79] = children_10;
  } else children_10 = u[79];
  let children_11;
  if (u[80] !== K || u[81] !== children_10) {
    children_11 = jsxProd_default(mcpConnectionsContext.Provider, {
      value: K,
      children: children_10,
    });
    u[80] = K;
    u[81] = children_10;
    u[82] = children_11;
  } else children_11 = u[82];
  let At;
  if (u[83] !== p || u[84] !== children_11) {
    At = jsxProd_default(providerNestedFlag.Provider, {
      value: true,
      children: jsxProd_default(appStoreContext.Provider, {
        value: p,
        children: children_11,
      }),
    });
    u[83] = p;
    u[84] = children_11;
    u[85] = At;
  } else At = u[85];
  return At;
}
//@ chunk-yj65zw1g.js:1055-1203 callgraph-witnessed = useAppState (1)
function useAppState_2(selector) {
  let $ = w(3);
  let store = useVoiceStateStore();
  let t0;
  if ($[0] !== selector || $[1] !== store) {
    t0 = () => selector(store.getState());
    $[0] = selector;
    $[1] = store;
    $[2] = t0;
  } else t0 = $[2];
  let get = t0;
  return yt(store.subscribe, get, get);
}
export {
  useAppState,
  useAppStoreDirect,
  useSetAppState,
  useAppStateSlice,
  useAppStateSession,
  useSetAppStateFn,
  useActivePlugins,
  useSessionHooksRegistry,
  appStoreContext,
  useAppState_2,
  useMcpConnections,
  useSettingsSyncEffect,
  AppStateProvider,
};
