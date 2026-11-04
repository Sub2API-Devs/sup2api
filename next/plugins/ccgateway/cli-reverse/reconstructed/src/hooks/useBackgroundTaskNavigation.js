/**
 * hooks/useBackgroundTaskNavigation.ts
 *
 * 后台任务/队友视图间的键盘导航（Esc 退出查看等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useBackgroundTaskNavigation.ts
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: fingerprint 2
 */
import { useAppStoreDirect, useAppState, useSetAppState } from "../state/AppState.js";
import { useSetVoiceState } from "../context/voice.js";
import { useSession } from "../context/session.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { isInProcessTeammateTask } from "../tasks/InProcessTeammateTask/types.js";
import { interruptTeammateWork } from "../utils/inProcessTeammateHelpers.js";
import { isLocalAgent, exitTeammateView } from "../state/teammateViewHelpers.js";
import {
  hasCompletedWithFindings,
  interruptBackgroundSubagent,
} from "../tasks/LocalAgentTask/LocalAgentTask.js";
import { isZincHarborOn } from "../plugins/functionHooks/inputHold.js";
import { stopTask } from "../components/tasks/stopTask.js";

//@ chunk-18hwfzwa.js:440816-440861 fingerprint = stepTeammateSelection (0.345)
function stepTeammateSelection(state) {
  return state.viewSelectionMode;
}
//@ chunk-18hwfzwa.js:1438068-1438659 fingerprint = useBackgroundTaskNavigation (0.49)
function useBackgroundTaskNavigation({ inputOwnsEscape, isTranscriptScreen, isPanelOpen }) {
  let appStoreDirect = useAppStoreDirect();
  let viewSelectionMode = useAppState((state) => state.viewSelectionMode);
  let viewingAgentTaskId = useAppState((state) => state.viewingAgentTaskId);
  let setAppState = useSetAppState();
  let taskRegistry = useSetVoiceState();
  let setAppState_2 = useSession();
  let { storageV5 } = useTheme_2();
  return {
    handleKeyDown: (event) => {
      if (isTranscriptScreen || isPanelOpen) return;
      if (event.name === "escape" && viewSelectionMode === "viewing-agent") {
        if (inputOwnsEscape) return;
        event.preventDefault();
        let viewingTaskId = viewingAgentTaskId;
        if (viewingTaskId) {
          let task = appStoreDirect.getState().tasks[viewingTaskId];
          if (isInProcessTeammateTask(task) && task.status === "running") {
            interruptTeammateWork(task);
            return;
          }
          if (isLocalAgent(task) && (task.status === "running" || hasCompletedWithFindings(task))) {
            if (interruptBackgroundSubagent(task.id, taskRegistry)) return;
            if (isZincHarborOn() && hasCompletedWithFindings(task)) {
              exitTeammateView(setAppState);
              return;
            }
            stopTask(task, taskRegistry, setAppState, {
              session: setAppState_2,
              storageV5,
            });
            return;
          }
        }
        exitTeammateView(setAppState);
      }
    },
    handleKeyDownCapture: () => {},
  };
}
export { stepTeammateSelection, useBackgroundTaskNavigation };
