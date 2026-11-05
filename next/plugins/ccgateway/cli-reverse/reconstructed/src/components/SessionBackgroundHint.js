/**
 * components/SessionBackgroundHint.tsx
 *
 * 后台会话提示行：远程 worker 断开、前台远程任务、后台任务数量等提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/SessionBackgroundHint.tsx
 * pieces: chunk-czq1j3j2.js (6)
 * attribution: sole-consumer 1, affinity 1, fingerprint 2, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useAppStoreDirect, useAppState } from "../state/AppState.js";
import { useTaskFramework } from "../context/voice.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { useNotifications } from "../context/notifications.js";
import { useState, useRef } from "../../vendor/react/cjs/react.production.js";
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

//@ chunk-czq1j3j2.js:1012681-1012731 sole-consumer (2.1.88 match: _temp5, 1)
function selectRemoteConnectionStatus_2(s) {
  return s.remoteConnectionStatus;
}
//@ chunk-czq1j3j2.js:1012731-1012783 affinity
function selectRemoteWorkerReportedGone(state) {
  return state.remoteWorkerReportedGone;
}
//@ chunk-czq1j3j2.js:1012783-1012868 fingerprint (2.1.88 match: _temp2, 1)
function markBackgroundTaskHintSeen(c) {
  return c.hasUsedBackgroundTask
    ? c
    : {
        ...c,
        hasUsedBackgroundTask: true,
      };
}
//@ chunk-czq1j3j2.js:1012868-1012916 layout
function selectRemoteForegroundTask(state) {
  return state.remoteForegroundTask;
}
//@ chunk-czq1j3j2.js:1012916-1012930 layout
var BACKGROUND_TASKS_TIMEOUT_MS = 15000;
//@ chunk-czq1j3j2.js:1012930-1015199 fingerprint (2.1.88 match: SessionBackgroundHint, 0.451)
function SessionBackgroundHint(props) {
  let $ = useMemoCache(23);
  let { onBackgroundSession, isLoading } = props;
  let setAppState = useAppStoreDirect();
  let appStateStore = useTaskFramework();
  let { storageV5 } = useTheme_2();
  let { addNotification } = useNotifications();
  let [isDoublePressed, setIsDoublePressed] = useState(false);
  let inFlightRef = useRef(false);
  let [isTasksDisabled, setIsTasksDisabled] = useState(false);
  let remoteConnectionStatus = useAppState(selectRemoteConnectionStatus_2);
  let remoteWorkerReportedGone = useAppState(selectRemoteWorkerReportedGone);
  if (isTasksDisabled && (remoteConnectionStatus !== "connected" || remoteWorkerReportedGone))
    setIsTasksDisabled(false);
  let doublePress = useDoublePress(setIsDoublePressed, onBackgroundSession);
  let handleBackground;
  if (
    $[0] !== addNotification ||
    $[1] !== setAppState ||
    $[2] !== doublePress ||
    $[3] !== isLoading ||
    $[4] !== storageV5 ||
    $[5] !== appStateStore
  ) {
    handleBackground = () => {
      if (isBackgroundTasksOff()) {
        return;
      }
      let state = setAppState.getState();
      let remoteCaps = getRemoteCaps();
      if (remoteCaps === null ? hasForegroundTasks(state) : state.remoteForegroundTask !== "none") {
        if (remoteCaps === null) backgroundAll(appStateStore);
        else if (!inFlightRef.current) {
          inFlightRef.current = true;
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
              let failureKind = classifyControlRequestError(error);
              if (errorMessage(error) === BACKGROUND_TASKS_DISABLED_MESSAGE) setIsTasksDisabled(true);
              addNotification({
                key: "remote-background-failed",
                kind: "warning",
                color: "warning",
                priority: "high",
                text:
                  failureKind === "timeout" || failureKind === "disconnected"
                    ? "The session didn't answer. This may still move to the background."
                    : failureKind === "server_error"
                      ? `Couldn't move this to the background: ${sanitizeDisplayText(errorMessage(error), {
                          maxCodeUnits: MAX_TITLE_LENGTH,
                        })}`
                      : "Couldn't reach the session.",
              });
            })
            .finally(() => {
              inFlightRef.current = false;
            });
        }
        if (!getGlobalConfig().hasUsedBackgroundTask) saveGlobalConfig(markBackgroundTaskHintSeen, storageV5);
      } else if (remoteCaps === null && isEnvTruthy("false") && isLoading) doublePress();
    };
    $[0] = addNotification;
    $[1] = setAppState;
    $[2] = doublePress;
    $[3] = isLoading;
    $[4] = storageV5;
    $[5] = appStateStore;
    $[6] = handleBackground;
  } else handleBackground = $[6];
  let handler = handleBackground;
  let hasForeground = useAppState(hasForegroundTasks);
  let remoteForegroundTask = useAppState(selectRemoteForegroundTask);
  let debugFlag;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    debugFlag = isEnvTruthy("false");
    $[7] = debugFlag;
  } else debugFlag = $[7];
  let debugFlagMemo = debugFlag;
  let isActive;
  if (
    $[8] !== hasForeground ||
    $[9] !== isLoading ||
    $[10] !== remoteForegroundTask ||
    $[11] !== remoteWorkerReportedGone ||
    $[12] !== isTasksDisabled
  ) {
    isActive =
      getRemoteCaps() === null
        ? hasForeground || (debugFlagMemo && isLoading)
        : (remoteForegroundTask === "seeded" || (remoteForegroundTask === "in_turn" && isLoading)) &&
          !remoteWorkerReportedGone &&
          !isTasksDisabled &&
          isRemoteControlChannelAvailable() &&
          !isBackgroundTasksOff();
    $[8] = hasForeground;
    $[9] = isLoading;
    $[10] = remoteForegroundTask;
    $[11] = remoteWorkerReportedGone;
    $[12] = isTasksDisabled;
    $[13] = isActive;
  } else isActive = $[13];
  let isActiveMemo = isActive;
  let hintProps;
  if ($[14] !== isActiveMemo || $[15] !== handler) {
    hintProps = {
      handler,
      isActive: isActiveMemo,
    };
    $[14] = isActiveMemo;
    $[15] = handler;
    $[16] = hintProps;
  } else hintProps = $[16];
  let { cohesionFixes, gateOnShortcut } = BackgroundTaskHint(hintProps);
  let baseShortcut = useShortcutDisplay_2("task:background", "Task", "ctrl+b");
  let shortcut = cohesionFixes
    ? gateOnShortcut
    : env.terminal === "tmux" && baseShortcut === "ctrl+b"
      ? "ctrl+b ctrl+b"
      : baseShortcut;
  if (getRemoteCaps() !== null && isActiveMemo && shortcut !== "") {
    let format;
    if ($[17] === MEMO_CACHE_SENTINEL) {
      format = {
        keyCase: "lower",
      };
      $[17] = format;
    } else format = $[17];
    let hintBox;
    if ($[18] !== shortcut) {
      hintBox = jsxProd_default(Box, {
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
      $[19] = hintBox;
    } else hintBox = $[19];
    return hintBox;
  }
  if (!isLoading || !isDoublePressed || (cohesionFixes && shortcut === "")) {
    return null;
  }
  let format;
  if ($[20] === MEMO_CACHE_SENTINEL) {
    format = {
      keyCase: "lower",
    };
    $[20] = format;
  } else format = $[20];
  let hintBox;
  if ($[21] !== shortcut) {
    hintBox = jsxProd_default(Box, {
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
    $[22] = hintBox;
  } else hintBox = $[22];
  return hintBox;
}
export { SessionBackgroundHint };
