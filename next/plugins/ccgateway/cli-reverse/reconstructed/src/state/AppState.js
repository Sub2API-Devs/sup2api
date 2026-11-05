/**
 * state/AppState.tsx
 *
 * AppState 的 React 接入：AppStateProvider 创建 store，useAppState(selector)/useSetAppState/useAppStore 钩子。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/state/AppState.tsx
 * pieces: chunk-77bb8s6j.js (1), chunk-swe0kb5q.js (8), chunk-t11pnrxp.js (12)
 * attribution: callgraph-witnessed 2, placement 16, fingerprint 2, layout 1
 */
import {
  init_react_production,
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  useEffectEvent,
  useEffect,
  useState,
} from "../../vendor/react/cjs/react.production.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { mergeSlicePatch } from "./sliceHelpers.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useVoiceStateStore, VoiceProvider } from "../context/voice.js";
import { settingsChangeDetector } from "../utils/settings/changeDetector.js";
import { getSettings_DEPRECATED } from "../utils/settings/settings.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-t11pnrxp.js:307-311 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-t11pnrxp.js:307", () => {
  init_react_production();
});
//@ chunk-t11pnrxp.js:311-353 placement
/**
 * AppStateProvider 提供的 store 上下文。
 */
var appStoreContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var sessionContext;
var mcpConnectionsContext;
deferInit("chunk-t11pnrxp.js:311", () => {
  appStoreContext = createContext(null);
  sessionContext = createContext(null);
  mcpConnectionsContext = createContext(null);
});
//@ chunk-t11pnrxp.js:353-491 placement
/**
 * 读取 AppState 中的 MCP 连接上下文，必须在 AppStateProvider 内使用。
 */
function useMcpConnections() {
  let value = useContext(mcpConnectionsContext);
  if (!value) throw ReferenceError("useMcpConnections cannot be called outside of an <AppStateProvider />");
  return value;
}
//@ chunk-t11pnrxp.js:491-508 placement
/**
 * AppState 的活动插件上下文。
 */
var activePluginsContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-t11pnrxp.js:491", () => {
  activePluginsContext = createContext(null);
});
//@ chunk-t11pnrxp.js:508-644 placement
/**
 * 读取 AppState 中的活动插件上下文，必须在 AppStateProvider 内使用。
 */
function useActivePlugins() {
  let value = useContext(activePluginsContext);
  if (!value) throw ReferenceError("useActivePlugins cannot be called outside of an <AppStateProvider />");
  return value;
}
//@ chunk-t11pnrxp.js:644-782 placement
/**
 * 读取 AppState 的会话上下文，必须在 AppStateProvider 内使用。
 */
function useAppStateSession() {
  let value = useContext(sessionContext);
  if (!value) throw ReferenceError("useAppStateSession cannot be called outside of an <AppStateProvider />");
  return value;
}
//@ chunk-t11pnrxp.js:782-926 fingerprint (2.1.88 match: useAppStore, 1)
/**
 * 取 AppStateProvider 提供的 store，不在 Provider 内时抛错。
 */
function useAppStore() {
  let store = useContext(appStoreContext);
  if (!store)
    throw ReferenceError("useAppState/useSetAppState cannot be called outside of an <AppStateProvider />");
  return store;
}
//@ chunk-t11pnrxp.js:926-965 layout
/**
 * React hook：从 AppStateProvider 的 store 订阅 selector 选出的片段（useSyncExternalStore 语义），必须在 Provider 内调用。
 */
function useAppState(selector) {
  let appStore = useAppStore();
  return useStoreSelector(appStore, selector);
}
//@ chunk-t11pnrxp.js:965-999 callgraph-witnessed (2.1.88 match: useSetAppState, 1)
/**
 * 返回 store.setState，供组件更新 AppState。
 */
function useSetAppState() {
  return useAppStore().setState;
}
//@ chunk-t11pnrxp.js:999-1058 placement
/**
 * 返回稳定的 setState 包装（memo 化）。
 */
function useSetAppStateFn() {
  let appStore = useAppStore();
  return useMemo(() => mergeSlicePatch(appStore.setState), [appStore]);
}
//@ chunk-t11pnrxp.js:1058-1083 placement
/**
 * 直接返回 AppState store。
 */
function useAppStoreDirect() {
  return useAppStore();
}
//@ chunk-t11pnrxp.js:1083-1118 placement
/**
 * 从 store 订阅 selector 选出的片段。
 */
function useAppStateSlice(selector) {
  return useStoreSelector(useContext(appStoreContext), selector);
}
//@ chunk-77bb8s6j.js:1055-1203 callgraph-witnessed (2.1.88 match: useAppState, 1)
function useAppState_2(selector) {
  let $ = useMemoCache(3);
  let store = useVoiceStateStore();
  let t0;
  if ($[0] !== selector || $[1] !== store) {
    t0 = () => selector(store.getState());
    $[0] = selector;
    $[1] = store;
    $[2] = t0;
  } else t0 = $[2];
  let get = t0;
  return useSyncExternalStore(store.subscribe, get, get);
}
//@ chunk-swe0kb5q.js:12485-12489 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-swe0kb5q.js:12485", () => {
  init_react_production();
});
//@ chunk-swe0kb5q.js:12489-12570 placement
/**
 * 设置变更时把设置同步进 AppState 的副作用。
 */
function useSettingsSyncEffect(apply) {
  let applyChange = useEffectEvent(apply);
  useEffect(
    () =>
      settingsChangeDetector.subscribe((change, previous) => {
        let settings_DEPRECATED = getSettings_DEPRECATED();
        applyChange(change, settings_DEPRECATED, previous);
      }),
    [],
  );
}
//@ chunk-swe0kb5q.js:12570-12574 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-swe0kb5q.js:12570", () => {
  init_react_production();
});
//@ chunk-swe0kb5q.js:12574-12590 placement
/**
 * 会话钩子注册表上下文。
 */
var sessionHooksRegistryContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-swe0kb5q.js:12574", () => {
  sessionHooksRegistryContext = createContext(null);
});
//@ chunk-swe0kb5q.js:12590-12733 placement
/**
 * 读取会话钩子注册表上下文，必须在 AppStateProvider 内使用。
 */
function useSessionHooksRegistry() {
  let value = useContext(sessionHooksRegistryContext);
  if (!value)
    throw ReferenceError("useSessionHooksRegistry cannot be called outside of an <AppStateProvider />");
  return value;
}
//@ chunk-swe0kb5q.js:12733-12813 placement (2.1.88 match: useTasksV2WithCollapseEffect, 1)
function useTasksV2WithCollapseEffect(state) {
  return state.expandedView === "tasks"
    ? {
        ...state,
        expandedView: "none",
      }
    : state;
}
//@ chunk-swe0kb5q.js:12813-12834 placement
/**
 * 惰性加载的 SessionRosterStore 构造器。
 */
var providerNestedFlag; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var sessionRosterStoreClass;
deferInit("chunk-swe0kb5q.js:12813", () => {
  providerNestedFlag = createContext(false);
  sessionRosterStoreClass = null;
});
//@ chunk-swe0kb5q.js:12834-16737 fingerprint (2.1.88 match: AppStateProvider, 0.4)
/**
 * 创建 AppState store（不可嵌套），监听设置变更并把设置同步进 AppState。
 */
function AppStateProvider(props) {
  let $ = useMemoCache(86);
  let { children, store, initialState, onChangeAppState, fleetNudgeStore, writesExitHandoff, sessionHooks } =
    props;
  let writesHandoff = writesExitHandoff === undefined ? false : writesExitHandoff;
  if (useContext(providerNestedFlag)) {
    throw Error("AppStateProvider can not be nested within another AppStateProvider");
  }
  let storeInit;
  if ($[0] !== initialState || $[1] !== onChangeAppState || $[2] !== store) {
    storeInit = () => store ?? createStore(initialState ?? getDefaultAppState(), onChangeAppState);
    $[0] = initialState;
    $[1] = onChangeAppState;
    $[2] = store;
    $[3] = storeInit;
  } else storeInit = $[3];
  let [appStore] = useState(storeInit);
  let sessionHooksFactory;
  if ($[4] !== sessionHooks) {
    sessionHooksFactory = () => sessionHooks ?? createSessionHooksRegistry();
    $[4] = sessionHooks;
    $[5] = sessionHooksFactory;
  } else sessionHooksFactory = $[5];
  let [sessionHooksRegistry] = useState(sessionHooksFactory);
  let inputClock = useInputClock();
  let dialogStoreFactory;
  if ($[6] !== inputClock) {
    dialogStoreFactory = () => createDialogStore(inputClock);
    $[6] = inputClock;
    $[7] = dialogStoreFactory;
  } else dialogStoreFactory = $[7];
  let [dialogStore] = useState(dialogStoreFactory);
  let [spinnerStatusStore] = useState(createSpinnerStatusStore);
  let { storageV5 } = useTheme_2();
  let session = useSessionOrUndefined();
  let tasksStoreFactory;
  if ($[8] !== storageV5 || $[9] !== appStore) {
    tasksStoreFactory = () =>
      new TasksV2Store(storageV5, globalThis, () => appStore.setState(useTasksV2WithCollapseEffect));
    $[8] = storageV5;
    $[9] = appStore;
    $[10] = tasksStoreFactory;
  } else tasksStoreFactory = $[10];
  let [tasksStore] = useState(tasksStoreFactory);
  let nudgeStoreFactory;
  if ($[11] !== fleetNudgeStore || $[12] !== storageV5) {
    nudgeStoreFactory = () =>
      fleetNudgeStore ??
      new FleetNudgeStore({
        storageV5,
      });
    $[11] = fleetNudgeStore;
    $[12] = storageV5;
    $[13] = nudgeStoreFactory;
  } else nudgeStoreFactory = $[13];
  let [nudgeStore] = useState(nudgeStoreFactory);
  let rosterStoreFactory;
  if ($[14] !== storageV5) {
    rosterStoreFactory = () =>
      sessionRosterStoreClass
        ? new sessionRosterStoreClass.SessionRosterStore({
            storageV5,
          })
        : null;
    $[14] = storageV5;
    $[15] = rosterStoreFactory;
  } else rosterStoreFactory = $[15];
  let [rosterStore] = useState(rosterStoreFactory);
  let [handoffWriter] = useState(writesHandoff);
  let [storageMemo] = useState(storageV5);
  let handoffEffect;
  let handoffDeps;
  if ($[16] !== storageMemo || $[17] !== appStore || $[18] !== handoffWriter) {
    handoffEffect = () => {
      let handoffFn = handoffWriter
        ? () => hasPendingHandoff(appStore.getState().tasks, storageMemo)
        : () => markRunningTasksForHandoff(appStore.getState().tasks);
      let hasAppStateContext = registerCleanup(handoffFn);
      return () => {
        handoffFn();
        hasAppStateContext();
      };
    };
    handoffDeps = [appStore, handoffWriter, storageMemo];
    $[16] = storageMemo;
    $[17] = appStore;
    $[18] = handoffWriter;
    $[19] = handoffEffect;
    $[20] = handoffDeps;
  } else {
    handoffEffect = $[19];
    handoffDeps = $[20];
  }
  useEffect(handoffEffect, handoffDeps);
  let mcpOverFactory;
  if ($[21] !== appStore) {
    mcpOverFactory = () => McpConnectionStore.over(appStore);
    $[21] = appStore;
    $[22] = mcpOverFactory;
  } else mcpOverFactory = $[22];
  let [mcpStore] = useState(mcpOverFactory);
  let pluginsOverFactory;
  if ($[23] !== appStore) {
    pluginsOverFactory = () => PluginsStateStore.over(appStore);
    $[23] = appStore;
    $[24] = pluginsOverFactory;
  } else pluginsOverFactory = $[24];
  let [pluginsStore] = useState(pluginsOverFactory);
  let acquireConnections;
  if ($[25] !== mcpStore || $[26] !== session?.mcpSessionWiring) {
    acquireConnections = () => session?.mcpSessionWiring.acquireConnections(mcpStore);
    $[25] = mcpStore;
    $[26] = session?.mcpSessionWiring;
    $[27] = acquireConnections;
  } else acquireConnections = $[27];
  let mcpDeps;
  if ($[28] !== mcpStore || $[29] !== session) {
    mcpDeps = [session, mcpStore];
    $[28] = mcpStore;
    $[29] = session;
    $[30] = mcpDeps;
  } else mcpDeps = $[30];
  useEffect(acquireConnections, mcpDeps);
  let computerUseFactory;
  if ($[31] !== appStore) {
    computerUseFactory = () => ComputerUseStateCell.over(appStore);
    $[31] = appStore;
    $[32] = computerUseFactory;
  } else computerUseFactory = $[32];
  let [computerUseStore] = useState(computerUseFactory);
  let computerUseDeps;
  let computerUseFn;
  if ($[33] !== computerUseStore || $[34] !== session) {
    computerUseDeps = () => {
      if (session === undefined) {
        return;
      }
      return computerUseOwnerLock.of(session).acquire(computerUseStore);
    };
    computerUseFn = [session, computerUseStore];
    $[33] = computerUseStore;
    $[34] = session;
    $[35] = computerUseDeps;
    $[36] = computerUseFn;
  } else {
    computerUseDeps = $[35];
    computerUseFn = $[36];
  }
  useEffect(computerUseDeps, computerUseFn);
  let rosterContextComponent;
  let rosterDeps;
  if ($[37] !== mcpStore) {
    rosterContextComponent = () => acquireMcpClientsAccessor(() => mcpStore.get().clients);
    rosterDeps = [mcpStore];
    $[37] = mcpStore;
    $[38] = rosterContextComponent;
    $[39] = rosterDeps;
  } else {
    rosterContextComponent = $[38];
    rosterDeps = $[39];
  }
  useEffect(rosterContextComponent, rosterDeps);
  let settingsEffect;
  let settingsDep;
  if ($[40] !== mcpStore) {
    settingsEffect = () =>
      acquireMcpServerToolsSwapper((mcpToolsSwapper, swapperArgA, swapperArgB) =>
        mcpStore.swapServerTools(mcpToolsSwapper, swapperArgA, swapperArgB),
      );
    settingsDep = [mcpStore];
    $[40] = mcpStore;
    $[41] = settingsEffect;
    $[42] = settingsDep;
  } else {
    settingsEffect = $[41];
    settingsDep = $[42];
  }
  useEffect(settingsEffect, settingsDep);
  let swapperStore;
  if ($[43] !== appStore.setState) {
    swapperStore = () => resetRefusalFallbackOnSwitch(appStore.setState);
    $[43] = appStore.setState;
    $[44] = swapperStore;
  } else swapperStore = $[44];
  let swapperUnmount;
  if ($[45] !== appStore) {
    swapperUnmount = [appStore];
    $[45] = appStore;
    $[46] = swapperUnmount;
  } else swapperUnmount = $[46];
  useEffect(swapperStore, swapperUnmount);
  let onSettingsChange;
  if ($[47] !== session || $[48] !== storageV5 || $[49] !== appStore) {
    onSettingsChange = (onSettingsChangeFn, changeArg, prevArg) => {
      applySettingsChange(session, onSettingsChangeFn, appStore.setState, storageV5, prevArg);
      if (!getIsRemoteMode())
        checkAutoModeInUse(
          appStore.getState().toolPermissionContext,
          appStore.setState,
          appStore.getState().fastMode,
        );
    };
    $[47] = session;
    $[48] = storageV5;
    $[49] = appStore;
    $[50] = onSettingsChange;
  } else onSettingsChange = $[50];
  let onSettingsChange_2 = useEffectEvent(onSettingsChange);
  useSettingsSyncEffect(onSettingsChange_2);
  let settingsDeps;
  if ($[51] !== onSettingsChange_2) {
    settingsDeps = () => {
      whenPolicyNotified(() => onSettingsChange_2("policySettings"));
    };
    $[51] = onSettingsChange_2;
    $[52] = settingsDeps;
  } else settingsDeps = $[52];
  let settingsMemoDeps;
  if ($[53] === MEMO_CACHE_SENTINEL) {
    settingsMemoDeps = [];
    $[53] = settingsMemoDeps;
  } else settingsMemoDeps = $[53];
  useEffect(settingsDeps, settingsMemoDeps);
  const value = session ?? null;
  let children_2;
  if ($[54] !== children || $[55] !== rosterStore) {
    children_2 =
      sessionRosterStoreClass && rosterStore
        ? jsxProd_default(sessionRosterStoreClass.SessionRosterStoreContext.Provider, {
            value: rosterStore,
            children,
          })
        : children;
    $[54] = children;
    $[55] = rosterStore;
    $[56] = children_2;
  } else children_2 = $[56];
  let children_3;
  if ($[57] !== children_2) {
    children_3 = jsxProd_default(AutoModeDenialsProvider, {
      children: jsxProd_default(InputSelectionBridgeProvider, {
        children: children_2,
      }),
    });
    $[57] = children_2;
    $[58] = children_3;
  } else children_3 = $[58];
  let children_4;
  if ($[59] !== nudgeStore || $[60] !== children_3) {
    children_4 = jsxProd_default(FleetNudgeStoreContext.Provider, {
      value: nudgeStore,
      children: children_3,
    });
    $[59] = nudgeStore;
    $[60] = children_3;
    $[61] = children_4;
  } else children_4 = $[61];
  let children_5;
  if ($[62] !== children_4 || $[63] !== tasksStore) {
    children_5 = jsxProd_default(taskListSignal.Provider, {
      value: tasksStore,
      children: children_4,
    });
    $[62] = children_4;
    $[63] = tasksStore;
    $[64] = children_5;
  } else children_5 = $[64];
  let children_6;
  if ($[65] !== spinnerStatusStore || $[66] !== children_5) {
    children_6 = jsxProd_default(statusOverrideSlot.Provider, {
      value: spinnerStatusStore,
      children: children_5,
    });
    $[65] = spinnerStatusStore;
    $[66] = children_5;
    $[67] = children_6;
  } else children_6 = $[67];
  let children_7;
  if ($[68] !== dialogStore || $[69] !== children_6) {
    children_7 = jsxProd_default(MailboxProvider, {
      children: jsxProd_default(VoiceProvider, {
        children: jsxProd_default(DialogStoreContext.Provider, {
          value: dialogStore,
          children: children_6,
        }),
      }),
    });
    $[68] = dialogStore;
    $[69] = children_6;
    $[70] = children_7;
  } else children_7 = $[70];
  let children_8;
  if ($[71] !== sessionHooksRegistry || $[72] !== children_7) {
    children_8 = jsxProd_default(sessionHooksRegistryContext.Provider, {
      value: sessionHooksRegistry,
      children: children_7,
    });
    $[71] = sessionHooksRegistry;
    $[72] = children_7;
    $[73] = children_8;
  } else children_8 = $[73];
  let children_9;
  if ($[74] !== value || $[75] !== children_8) {
    children_9 = jsxProd_default(sessionContext.Provider, {
      value,
      children: children_8,
    });
    $[74] = value;
    $[75] = children_8;
    $[76] = children_9;
  } else children_9 = $[76];
  let children_10;
  if ($[77] !== pluginsStore || $[78] !== children_9) {
    children_10 = jsxProd_default(activePluginsContext.Provider, {
      value: pluginsStore,
      children: children_9,
    });
    $[77] = pluginsStore;
    $[78] = children_9;
    $[79] = children_10;
  } else children_10 = $[79];
  let children_11;
  if ($[80] !== mcpStore || $[81] !== children_10) {
    children_11 = jsxProd_default(mcpConnectionsContext.Provider, {
      value: mcpStore,
      children: children_10,
    });
    $[80] = mcpStore;
    $[81] = children_10;
    $[82] = children_11;
  } else children_11 = $[82];
  let tree;
  if ($[83] !== appStore || $[84] !== children_11) {
    tree = jsxProd_default(providerNestedFlag.Provider, {
      value: true,
      children: jsxProd_default(appStoreContext.Provider, {
        value: appStore,
        children: children_11,
      }),
    });
    $[83] = appStore;
    $[84] = children_11;
    $[85] = tree;
  } else tree = $[85];
  return tree;
}
export {
  useAppState,
  useSetAppState,
  useAppStoreDirect,
  useAppStateSession,
  useAppState_2,
  useActivePlugins,
  useMcpConnections,
  useAppStateSlice,
  appStoreContext,
  useSettingsSyncEffect,
  useSessionHooksRegistry,
  useSetAppStateFn,
  AppStateProvider,
};
