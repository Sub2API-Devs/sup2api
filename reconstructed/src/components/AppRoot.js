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
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
function AppRoot(t0) {
  let $ = w(32),
    {
      session: session,
      host: host,
      project: project,
      storageV5: storageV5,
      messageQueue: messageQueue,
      store: store,
      initialState: initialState,
      onChangeAppState: onChangeAppState,
      fleetNudgeStore: fleetNudgeStore,
      sessionHooks: sessionHooks,
      writesExitHandoff: writesExitHandoff,
      getFpsMetrics: getFpsMetrics,
      stats: stats,
      keybindings: keybindings,
      children: children,
    } = t0,
    _ = keybindings === void 0 ? !0 : keybindings,
    x;
  if ($[0] !== storageV5) ((x = sessionServicesFor(storageV5)), ($[0] = storageV5), ($[1] = x));
  else x = $[1];
  let s = x,
    d;
  if ($[2] !== children || $[3] !== _)
    ((d = _ ? e(KeybindingRoot, { children: children }) : children),
      ($[2] = children),
      ($[3] = _),
      ($[4] = d));
  else d = $[4];
  let f;
  if ($[5] !== d)
    ((f = e(NotificationsProvider, {
      children: e(AutoModeDenialsProvider, { children: e(InputSelectionBridgeProvider, { children: d }) }),
    })),
      ($[5] = d),
      ($[6] = f));
  else f = $[6];
  let C;
  if (
    $[7] !== fleetNudgeStore ||
    $[8] !== initialState ||
    $[9] !== onChangeAppState ||
    $[10] !== sessionHooks ||
    $[11] !== store ||
    $[12] !== f ||
    $[13] !== writesExitHandoff
  )
    ((C = e(AppStateProvider, {
      store: store,
      initialState: initialState,
      onChangeAppState: onChangeAppState,
      fleetNudgeStore: fleetNudgeStore,
      sessionHooks: sessionHooks,
      writesExitHandoff: writesExitHandoff,
      children: f,
    })),
      ($[7] = fleetNudgeStore),
      ($[8] = initialState),
      ($[9] = onChangeAppState),
      ($[10] = sessionHooks),
      ($[11] = store),
      ($[12] = f),
      ($[13] = writesExitHandoff),
      ($[14] = C));
  else C = $[14];
  let g = C,
    h;
  if ($[15] !== g || $[16] !== host || $[17] !== project || $[18] !== session)
    ((h =
      session !== void 0
        ? e(SessionProvider, { session: session, children: g })
        : host !== void 0
          ? e(ProjectProvider, { host: host, project: project, children: g })
          : g),
      ($[15] = g),
      ($[16] = host),
      ($[17] = project),
      ($[18] = session),
      ($[19] = h));
  else h = $[19];
  let A;
  if ($[20] !== stats || $[21] !== h)
    ((A = e(StatsProvider, { store: stats, children: h })), ($[20] = stats), ($[21] = h), ($[22] = A));
  else A = $[22];
  let m;
  if ($[23] !== getFpsMetrics || $[24] !== A)
    ((m = e(FpsMetricsProvider, { getFpsMetrics: getFpsMetrics, children: A })),
      ($[23] = getFpsMetrics),
      ($[24] = A),
      ($[25] = m));
  else m = $[25];
  let H = m,
    V;
  if ($[26] !== messageQueue || $[27] !== H)
    ((V = messageQueue === void 0 ? H : e(QueueProvider, { queue: messageQueue, children: H })),
      ($[26] = messageQueue),
      ($[27] = H),
      ($[28] = V));
  else V = $[28];
  let k = V;
  if (storageV5 === void 0) {
    return k;
  }
  let v;
  if ($[29] !== k || $[30] !== s)
    ((v = e(StorageCredentialsProvider, { ...s, children: k })), ($[29] = k), ($[30] = s), ($[31] = v));
  else v = $[31];
  return v;
}

export { AppRoot };
