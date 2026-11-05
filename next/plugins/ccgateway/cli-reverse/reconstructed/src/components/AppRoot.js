/**
 * components/AppRoot.tsx
 *
 * 2.1.316 新增：应用根组件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-swe0kb5q.js (1)
 * attribution: placement 1
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { sessionServicesFor } from "../utils/secureStorage/credentialsFileStore.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KeybindingRoot } from "../keybindings/KeybindingProviderSetup.js";
import { NotificationsProvider } from "../context/notifications.js";
import { AutoModeDenialsProvider } from "./Spinner/spinnerStatus.js";
import { InputSelectionBridgeProvider } from "../ink/inputSelectionBridge.js";
import { AppStateProvider } from "../state/AppState.js";
import { SessionProvider, ProjectProvider } from "../context/session.js";
import { StatsProvider } from "../context/stats.js";
import { FpsMetricsProvider } from "../context/fpsMetrics.js";
import { QueueProvider } from "../context/QueuedMessageContext.js";
import { StorageCredentialsProvider } from "./design-system/ThemeProvider.js";

//@ chunk-swe0kb5q.js:16737-18147 placement (2.1.88 match: App, 0.593)
function AppRoot(props) {
  let $ = useMemoCache(32);
  let {
    session,
    host,
    project,
    storageV5,
    messageQueue,
    store,
    initialState,
    onChangeAppState,
    fleetNudgeStore,
    sessionHooks,
    writesExitHandoff,
    getFpsMetrics,
    stats,
    keybindings,
    children,
  } = props;
  let showKeybindings = keybindings === undefined ? true : keybindings;
  let sessionServices;
  if ($[0] !== storageV5) {
    sessionServices = sessionServicesFor(storageV5);
    $[0] = storageV5;
    $[1] = sessionServices;
  } else sessionServices = $[1];
  let services = sessionServices;
  let children_2;
  if ($[2] !== children || $[3] !== showKeybindings) {
    children_2 = showKeybindings
      ? jsxProd_default(KeybindingRoot, {
          children,
        })
      : children;
    $[2] = children;
    $[3] = showKeybindings;
    $[4] = children_2;
  } else children_2 = $[4];
  let children_3;
  if ($[5] !== children_2) {
    children_3 = jsxProd_default(NotificationsProvider, {
      children: jsxProd_default(AutoModeDenialsProvider, {
        children: jsxProd_default(InputSelectionBridgeProvider, {
          children: children_2,
        }),
      }),
    });
    $[5] = children_2;
    $[6] = children_3;
  } else children_3 = $[6];
  let stateProvider;
  if (
    $[7] !== fleetNudgeStore ||
    $[8] !== initialState ||
    $[9] !== onChangeAppState ||
    $[10] !== sessionHooks ||
    $[11] !== store ||
    $[12] !== children_3 ||
    $[13] !== writesExitHandoff
  ) {
    stateProvider = jsxProd_default(AppStateProvider, {
      store,
      initialState,
      onChangeAppState,
      fleetNudgeStore,
      sessionHooks,
      writesExitHandoff,
      children: children_3,
    });
    $[7] = fleetNudgeStore;
    $[8] = initialState;
    $[9] = onChangeAppState;
    $[10] = sessionHooks;
    $[11] = store;
    $[12] = children_3;
    $[13] = writesExitHandoff;
    $[14] = stateProvider;
  } else stateProvider = $[14];
  let stateTree = stateProvider;
  let children_4;
  if ($[15] !== stateTree || $[16] !== host || $[17] !== project || $[18] !== session) {
    children_4 =
      session !== undefined
        ? jsxProd_default(SessionProvider, {
            session,
            children: stateTree,
          })
        : host !== undefined
          ? jsxProd_default(ProjectProvider, {
              host,
              project,
              children: stateTree,
            })
          : stateTree;
    $[15] = stateTree;
    $[16] = host;
    $[17] = project;
    $[18] = session;
    $[19] = children_4;
  } else children_4 = $[19];
  let children_5;
  if ($[20] !== stats || $[21] !== children_4) {
    children_5 = jsxProd_default(StatsProvider, {
      store: stats,
      children: children_4,
    });
    $[20] = stats;
    $[21] = children_4;
    $[22] = children_5;
  } else children_5 = $[22];
  let fpsTree;
  if ($[23] !== getFpsMetrics || $[24] !== children_5) {
    fpsTree = jsxProd_default(FpsMetricsProvider, {
      getFpsMetrics,
      children: children_5,
    });
    $[23] = getFpsMetrics;
    $[24] = children_5;
    $[25] = fpsTree;
  } else fpsTree = $[25];
  let fpsTree_ = fpsTree;
  let queueTree;
  if ($[26] !== messageQueue || $[27] !== fpsTree_) {
    queueTree =
      messageQueue === undefined
        ? fpsTree_
        : jsxProd_default(QueueProvider, {
            queue: messageQueue,
            children: fpsTree_,
          });
    $[26] = messageQueue;
    $[27] = fpsTree_;
    $[28] = queueTree;
  } else queueTree = $[28];
  let inner = queueTree;
  if (storageV5 === undefined) {
    return inner;
  }
  let storageTree;
  if ($[29] !== inner || $[30] !== services) {
    storageTree = jsxProd_default(StorageCredentialsProvider, {
      ...services,
      children: inner,
    });
    $[29] = inner;
    $[30] = services;
    $[31] = storageTree;
  } else storageTree = $[31];
  return storageTree;
}
export { AppRoot };
