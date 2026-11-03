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
import { Cr, useAppState, useSetAppState } from "../state/AppState.js";
import { useSetVoiceState } from "../context/voice.js";
import { useSession } from "../context/session.js";
import { Me } from "../components/design-system/ThemeProvider.js";
import { isInProcessTeammateTask } from "../tasks/InProcessTeammateTask/types.js";
import { interruptTeammateWork } from "../utils/inProcessTeammateHelpers.js";
import { isLocalAgent, exitTeammateView } from "../state/teammateViewHelpers.js";
import {
  hasCompletedWithFindings,
  interruptBackgroundSubagent,
} from "../tasks/LocalAgentTask/LocalAgentTask.js";
import { tH } from "../plugins/functionHooks/inputHold.js";
import { stopTask } from "../components/tasks/stopTask.js";

//@ chunk-18hwfzwa.js:440816-440861 fingerprint = stepTeammateSelection (0.345)
function stepTeammateSelection(No) {
  return No.viewSelectionMode;
}
//@ chunk-18hwfzwa.js:1438068-1438659 fingerprint = useBackgroundTaskNavigation (0.49)
function useBackgroundTaskNavigation({
  inputOwnsEscape: inputOwnsEscape,
  isTranscriptScreen: isTranscriptScreen,
  isPanelOpen: isPanelOpen,
}) {
  let L = Cr(),
    viewSelectionMode = useAppState((Xe) => Xe.viewSelectionMode),
    viewingAgentTaskId = useAppState((Xe) => Xe.viewingAgentTaskId),
    Re = useSetAppState(),
    Be = useSetVoiceState(),
    setAppState = useSession(),
    { storageV5: storageV5 } = Me();
  return {
    handleKeyDown: (Xe) => {
      if (isTranscriptScreen || isPanelOpen) return;
      if (Xe.name === "escape" && viewSelectionMode === "viewing-agent") {
        if (inputOwnsEscape) return;
        Xe.preventDefault();
        let rt = viewingAgentTaskId;
        if (rt) {
          let kt = L.getState().tasks[rt];
          if (isInProcessTeammateTask(kt) && kt.status === "running") {
            interruptTeammateWork(kt);
            return;
          }
          if (isLocalAgent(kt) && (kt.status === "running" || hasCompletedWithFindings(kt))) {
            if (interruptBackgroundSubagent(kt.id, Be)) return;
            if (tH() && hasCompletedWithFindings(kt)) {
              exitTeammateView(Re);
              return;
            }
            stopTask(kt, Be, Re, { session: setAppState, storageV5: storageV5 });
            return;
          }
        }
        exitTeammateView(Re);
      }
    },
    handleKeyDownCapture: () => {},
  };
}

export { stepTeammateSelection, useBackgroundTaskNavigation };
