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
import { useAppStoreDirect, useAppState } from "../state/AppState.js";
import { useSetVoiceState } from "../context/voice.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { useNotifications } from "../context/notifications.js";
import { y, R } from "../../vendor/react/cjs/react.production.js";
import { useDoublePress } from "../keybindings/useActionHandlers.js";
import { isBackgroundTasksOff } from "../tools/AgentTool/backgroundGates.js";
import { getRemoteCaps, isRemoteControlChannelAvailable } from "../remote/remoteMode.js";
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
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
function markBackgroundTaskHintSeen(c) {
  return c.hasUsedBackgroundTask
    ? c
    : {
        ...c,
        hasUsedBackgroundTask: true,
      };
}
//@ chunk-18hwfzwa.js:978833-978881 layout
function selectRemoteForegroundTask(Yo) {
  return Yo.remoteForegroundTask;
}
//@ chunk-18hwfzwa.js:978881-978895 layout
var BACKGROUND_TASKS_TIMEOUT_MS = 15000;
//@ chunk-18hwfzwa.js:978895-981168 fingerprint = SessionBackgroundHint (0.451)
function SessionBackgroundHint(props) {
  let $ = w(23);
  let { onBackgroundSession, isLoading } = props;
  let setAppState = useAppStoreDirect();
  let appStateStore = useSetVoiceState();
  let { storageV5 } = useTheme_2();
  let { addNotification } = useNotifications();
  let [Be, He] = y(false);
  let We = R(false);
  let [ze, Xe] = y(false);
  let remoteConnectionStatus = useAppState(selectRemoteConnectionStatus_2);
  let remoteWorkerReportedGone = useAppState(selectRemoteWorkerReportedGone);
  if (ze && (remoteConnectionStatus !== "connected" || remoteWorkerReportedGone)) Xe(false);
  let handleDoublePress = useDoublePress(He, onBackgroundSession, noop_5);
  let Ot;
  if (
    $[0] !== addNotification ||
    $[1] !== setAppState ||
    $[2] !== handleDoublePress ||
    $[3] !== isLoading ||
    $[4] !== storageV5 ||
    $[5] !== appStateStore
  ) {
    Ot = () => {
      if (isBackgroundTasksOff()) {
        return;
      }
      let state = setAppState.getState();
      let remoteCaps = getRemoteCaps();
      if (remoteCaps === null ? hasForegroundTasks(state) : state.remoteForegroundTask !== "none") {
        if (remoteCaps === null) backgroundAll(appStateStore);
        else if (!We.current) {
          We.current = true;
          withOutcomeTelemetry("remote_background_tasks", () =>
            remoteCaps.sendControlRequest(
              {
                subtype: "background_tasks",
              },
              {
                timeoutMs: BACKGROUND_TASKS_TIMEOUT_MS,
              },
            ),
          )
            .catch((error) => {
              let oo = classifyControlRequestError(error);
              if (errorMessage(error) === BACKGROUND_TASKS_DISABLED_MESSAGE) Xe(true);
              addNotification({
                key: "remote-background-failed",
                kind: "warning",
                color: "warning",
                priority: "high",
                text:
                  oo === "timeout" || oo === "disconnected"
                    ? "The session didn't answer. This may still move to the background."
                    : oo === "server_error"
                      ? `Couldn't move this to the background: ${sanitizeDisplayText(errorMessage(error), {
                          maxCodeUnits: MAX_TITLE_LENGTH,
                        })}`
                      : "Couldn't reach the session.",
              });
            })
            .finally(() => {
              We.current = false;
            });
        }
        if (!getGlobalConfig().hasUsedBackgroundTask) saveGlobalConfig(markBackgroundTaskHintSeen, storageV5);
      } else if (remoteCaps === null && isEnvTruthy("false") && isLoading) handleDoublePress();
    };
    $[0] = addNotification;
    $[1] = setAppState;
    $[2] = handleDoublePress;
    $[3] = isLoading;
    $[4] = storageV5;
    $[5] = appStateStore;
    $[6] = Ot;
  } else Ot = $[6];
  let handler = Ot;
  let hasForeground = useAppState(hasForegroundTasks);
  let remoteForegroundTask = useAppState(selectRemoteForegroundTask);
  let po;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    po = isEnvTruthy("false");
    $[7] = po;
  } else po = $[7];
  let ao = po;
  let co;
  if (
    $[8] !== hasForeground ||
    $[9] !== isLoading ||
    $[10] !== remoteForegroundTask ||
    $[11] !== remoteWorkerReportedGone ||
    $[12] !== ze
  ) {
    co =
      getRemoteCaps() === null
        ? hasForeground || (ao && isLoading)
        : (remoteForegroundTask === "seeded" || (remoteForegroundTask === "in_turn" && isLoading)) &&
          !remoteWorkerReportedGone &&
          !ze &&
          isRemoteControlChannelAvailable() &&
          !isBackgroundTasksOff();
    $[8] = hasForeground;
    $[9] = isLoading;
    $[10] = remoteForegroundTask;
    $[11] = remoteWorkerReportedGone;
    $[12] = ze;
    $[13] = co;
  } else co = $[13];
  let bo = co;
  let Ao;
  if ($[14] !== bo || $[15] !== handler) {
    Ao = {
      handler,
      isActive: bo,
    };
    $[14] = bo;
    $[15] = handler;
    $[16] = Ao;
  } else Ao = $[16];
  let { cohesionFixes, gateOnShortcut } = BackgroundTaskHint(Ao);
  let baseShortcut = useShortcutDisplay_2("task:background", "Task", "ctrl+b");
  let shortcut = cohesionFixes
    ? gateOnShortcut
    : env.terminal === "tmux" && baseShortcut === "ctrl+b"
      ? "ctrl+b ctrl+b"
      : baseShortcut;
  if (getRemoteCaps() !== null && bo && shortcut !== "") {
    let format;
    if ($[17] === MEMO_CACHE_SENTINEL) {
      format = {
        keyCase: "lower",
      };
      $[17] = format;
    } else format = $[17];
    let mn;
    if ($[18] !== shortcut) {
      mn = jsxProd_default(Box, {
        paddingLeft: 2,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: jsxProd_default(KeyboardShortcutHint, {
            chord: shortcut,
            action: "run in background",
            format,
          }),
        }),
      });
      $[18] = shortcut;
      $[19] = mn;
    } else mn = $[19];
    return mn;
  }
  if (!isLoading || !Be || (cohesionFixes && shortcut === "")) {
    return null;
  }
  let format;
  if ($[20] === MEMO_CACHE_SENTINEL) {
    format = {
      keyCase: "lower",
    };
    $[20] = format;
  } else format = $[20];
  let mn;
  if ($[21] !== shortcut) {
    mn = jsxProd_default(Box, {
      paddingLeft: 2,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: jsxProd_default(KeyboardShortcutHint, {
          chord: shortcut,
          action: "background",
          format,
        }),
      }),
    });
    $[21] = shortcut;
    $[22] = mn;
  } else mn = $[22];
  return mn;
}
export { SessionBackgroundHint };
