/**
 * components/AppRoot.tsx
 *
 * 2.1.316 新增：应用根组件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xe7zq1p4.js (1)
 * attribution: placement 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
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

//@ chunk-xe7zq1p4.js:16717-18127 placement = App (0.592)
function AppRoot(props) {
  let $ = w(32);
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
  let _ = keybindings === undefined ? true : keybindings;
  let x;
  if ($[0] !== storageV5) {
    x = sessionServicesFor(storageV5);
    $[0] = storageV5;
    $[1] = x;
  } else x = $[1];
  let s = x;
  let children_2;
  if ($[2] !== children || $[3] !== _) {
    children_2 = _
      ? jsxProd_default(KeybindingRoot, {
          children,
        })
      : children;
    $[2] = children;
    $[3] = _;
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
  let C;
  if (
    $[7] !== fleetNudgeStore ||
    $[8] !== initialState ||
    $[9] !== onChangeAppState ||
    $[10] !== sessionHooks ||
    $[11] !== store ||
    $[12] !== children_3 ||
    $[13] !== writesExitHandoff
  ) {
    C = jsxProd_default(AppStateProvider, {
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
    $[14] = C;
  } else C = $[14];
  let g = C;
  let children_4;
  if ($[15] !== g || $[16] !== host || $[17] !== project || $[18] !== session) {
    children_4 =
      session !== undefined
        ? jsxProd_default(SessionProvider, {
            session,
            children: g,
          })
        : host !== undefined
          ? jsxProd_default(ProjectProvider, {
              host,
              project,
              children: g,
            })
          : g;
    $[15] = g;
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
  let m;
  if ($[23] !== getFpsMetrics || $[24] !== children_5) {
    m = jsxProd_default(FpsMetricsProvider, {
      getFpsMetrics,
      children: children_5,
    });
    $[23] = getFpsMetrics;
    $[24] = children_5;
    $[25] = m;
  } else m = $[25];
  let H = m;
  let V;
  if ($[26] !== messageQueue || $[27] !== H) {
    V =
      messageQueue === undefined
        ? H
        : jsxProd_default(QueueProvider, {
            queue: messageQueue,
            children: H,
          });
    $[26] = messageQueue;
    $[27] = H;
    $[28] = V;
  } else V = $[28];
  let k = V;
  if (storageV5 === undefined) {
    return k;
  }
  let v;
  if ($[29] !== k || $[30] !== s) {
    v = jsxProd_default(StorageCredentialsProvider, {
      ...s,
      children: k,
    });
    $[29] = k;
    $[30] = s;
    $[31] = v;
  } else v = $[31];
  return v;
}
export { AppRoot };
