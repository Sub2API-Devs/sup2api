/**
 * components/SessionBackgroundHint.tsx
 *
 * 后台会话提示行：远程 worker 断开、前台远程任务、后台任务数量等提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/SessionBackgroundHint.tsx
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: sole-consumer 2, affinity 1, fingerprint 2, layout 2
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { Cr, useAppState } from "../state/AppState.js";
import { useSetVoiceState } from "../context/voice.js";
import { Me } from "./design-system/ThemeProvider.js";
import { useNotifications } from "../context/notifications.js";
import { y, R } from "../../vendor/react/cjs/react.production.js";
import { useDoublePress } from "../keybindings/useActionHandlers.js";
import { uf } from "../tools/AgentTool/backgroundGates.js";
import { Jn, ml } from "../remote/remoteMode.js";
import { hasForegroundTasks, backgroundAll } from "../tasks/LocalShellTask/LocalShellTask.js";
import { withOutcomeTelemetry, classifyControlRequestError } from "../remote/controlRequestErrors.js";
import { errorMessage } from "../utils/errors.js";
import { BACKGROUND_TASKS_DISABLED_MESSAGE } from "../bridge/controlRequests.js";
import { sanitizeDisplayText, MAX_TITLE_LENGTH } from "../utils/resultError.js";
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { BackgroundTaskHint } from "./ToolProgressHint.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../keybindings/useShortcutDisplay.js";
import { env } from "../utils/env.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";

//@ chunk-18hwfzwa.js:978630-978680 sole-consumer = _temp5 (1)
function selectRemoteConnectionStatus_2(s) {
  return s.remoteConnectionStatus;
}
//@ chunk-18hwfzwa.js:978680-978732 sole-consumer
function selectRemoteWorkerReportedGone(No) {
  return No.remoteWorkerReportedGone;
}
//@ chunk-18hwfzwa.js:978732-978748 affinity
function noop_5() {}
//@ chunk-18hwfzwa.js:978748-978833 fingerprint = _temp2 (1)
function tpo(c) {
  return c.hasUsedBackgroundTask ? c : { ...c, hasUsedBackgroundTask: !0 };
}
//@ chunk-18hwfzwa.js:978833-978881 layout
function selectRemoteForegroundTask(Yo) {
  return Yo.remoteForegroundTask;
}
//@ chunk-18hwfzwa.js:978881-978895 layout
var Net = 15000;
//@ chunk-18hwfzwa.js:978895-981168 fingerprint = SessionBackgroundHint (0.451)
function SessionBackgroundHint(t0) {
  let $ = w(23),
    { onBackgroundSession: onBackgroundSession, isLoading: isLoading } = t0,
    setAppState = Cr(),
    appStateStore = useSetVoiceState(),
    { storageV5: storageV5 } = Me(),
    { addNotification: addNotification } = useNotifications(),
    [Be, He] = y(!1),
    We = R(!1),
    [ze, Xe] = y(!1),
    remoteConnectionStatus = useAppState(selectRemoteConnectionStatus_2),
    remoteWorkerReportedGone = useAppState(selectRemoteWorkerReportedGone);
  if (ze && (remoteConnectionStatus !== "connected" || remoteWorkerReportedGone)) Xe(!1);
  let handleDoublePress = useDoublePress(He, onBackgroundSession, noop_5),
    Ot;
  if (
    $[0] !== addNotification ||
    $[1] !== setAppState ||
    $[2] !== handleDoublePress ||
    $[3] !== isLoading ||
    $[4] !== storageV5 ||
    $[5] !== appStateStore
  )
    ((Ot = () => {
      if (uf()) {
        return;
      }
      let state = setAppState.getState();
      let Dt = Jn();
      if (Dt === null ? hasForegroundTasks(state) : state.remoteForegroundTask !== "none") {
        if (Dt === null) backgroundAll(appStateStore);
        else if (!We.current)
          ((We.current = !0),
            withOutcomeTelemetry("remote_background_tasks", () =>
              Dt.sendControlRequest({ subtype: "background_tasks" }, { timeoutMs: Net }),
            )
              .catch((Lt) => {
                let oo = classifyControlRequestError(Lt);
                if (errorMessage(Lt) === BACKGROUND_TASKS_DISABLED_MESSAGE) Xe(!0);
                addNotification({
                  key: "remote-background-failed",
                  kind: "warning",
                  color: "warning",
                  priority: "high",
                  text:
                    oo === "timeout" || oo === "disconnected"
                      ? "The session didn't answer. This may still move to the background."
                      : oo === "server_error"
                        ? `Couldn't move this to the background: ${sanitizeDisplayText(errorMessage(Lt), { maxCodeUnits: MAX_TITLE_LENGTH })}`
                        : "Couldn't reach the session.",
                });
              })
              .finally(() => {
                We.current = !1;
              }));
        if (!getGlobalConfig().hasUsedBackgroundTask) saveGlobalConfig(tpo, storageV5);
      } else if (Dt === null && isEnvTruthy("false") && isLoading) handleDoublePress();
    }),
      ($[0] = addNotification),
      ($[1] = setAppState),
      ($[2] = handleDoublePress),
      ($[3] = isLoading),
      ($[4] = storageV5),
      ($[5] = appStateStore),
      ($[6] = Ot));
  else Ot = $[6];
  let Xt = Ot,
    hasForeground = useAppState(hasForegroundTasks),
    remoteForegroundTask = useAppState(selectRemoteForegroundTask),
    po;
  if ($[7] === MEMO_CACHE_SENTINEL) ((po = isEnvTruthy("false")), ($[7] = po));
  else po = $[7];
  let ao = po,
    co;
  if (
    $[8] !== hasForeground ||
    $[9] !== isLoading ||
    $[10] !== remoteForegroundTask ||
    $[11] !== remoteWorkerReportedGone ||
    $[12] !== ze
  )
    ((co =
      Jn() === null
        ? hasForeground || (ao && isLoading)
        : (remoteForegroundTask === "seeded" || (remoteForegroundTask === "in_turn" && isLoading)) &&
          !remoteWorkerReportedGone &&
          !ze &&
          ml() &&
          !uf()),
      ($[8] = hasForeground),
      ($[9] = isLoading),
      ($[10] = remoteForegroundTask),
      ($[11] = remoteWorkerReportedGone),
      ($[12] = ze),
      ($[13] = co));
  else co = $[13];
  let bo = co,
    Ao;
  if ($[14] !== bo || $[15] !== Xt)
    ((Ao = { handler: Xt, isActive: bo }), ($[14] = bo), ($[15] = Xt), ($[16] = Ao));
  else Ao = $[16];
  let { cohesionFixes: cohesionFixes, gateOnShortcut: gateOnShortcut } = BackgroundTaskHint(Ao),
    baseShortcut = useShortcutDisplay_2("task:background", "Task", "ctrl+b"),
    shortcut = cohesionFixes
      ? gateOnShortcut
      : env.terminal === "tmux" && baseShortcut === "ctrl+b"
        ? "ctrl+b ctrl+b"
        : baseShortcut;
  if (Jn() !== null && bo && shortcut !== "") {
    let Wo;
    if ($[17] === MEMO_CACHE_SENTINEL) ((Wo = { keyCase: "lower" }), ($[17] = Wo));
    else Wo = $[17];
    let mn;
    if ($[18] !== shortcut)
      ((mn = e(Box, {
        paddingLeft: 2,
        children: e(Text, {
          dimColor: !0,
          children: e(KeyboardShortcutHint, { chord: shortcut, action: "run in background", format: Wo }),
        }),
      })),
        ($[18] = shortcut),
        ($[19] = mn));
    else mn = $[19];
    return mn;
  }
  if (!isLoading || !Be || (cohesionFixes && shortcut === "")) {
    return null;
  }
  let Wo;
  if ($[20] === MEMO_CACHE_SENTINEL) ((Wo = { keyCase: "lower" }), ($[20] = Wo));
  else Wo = $[20];
  let mn;
  if ($[21] !== shortcut)
    ((mn = e(Box, {
      paddingLeft: 2,
      children: e(Text, {
        dimColor: !0,
        children: e(KeyboardShortcutHint, { chord: shortcut, action: "background", format: Wo }),
      }),
    })),
      ($[21] = shortcut),
      ($[22] = mn));
  else mn = $[22];
  return mn;
}

export { SessionBackgroundHint };
