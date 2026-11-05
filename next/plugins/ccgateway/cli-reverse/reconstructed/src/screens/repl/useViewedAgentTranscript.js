/**
 * screens/repl/useViewedAgentTranscript.ts
 *
 * 2.1.316 新增：取正在查看的 agent 任务的转录（加协调者来源标记、带进行中的工具调用），合成为主界面要显示的视图。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: placement 3
 */
import { useAppState } from "../../state/AppState.js";
import { viewedTaskId, getViewedTranscriptState } from "../../state/teammateViewHelpers.js";
import { transcriptMessagesStore } from "./ReplEffects.js";
import { INITIAL_IN_PROGRESS_STATE } from "../../state/inProgressToolUses.js";
import { useState, useMemo, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { tagCoordinatorOrigin } from "../../coordinator/coordinatorMode.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:228379-228780 placement
/**
 * 取正在查看的 agent 任务的转录（消息加协调者来源标记、进行中的工具调用），合成为主界面要显示的视图。
 */
function useViewedAgentTranscript({ mainIsBusy, mainConversationId }) {
  let viewedTask = useAppState((state) =>
    state.viewingAgentTaskId ? state.tasks[state.viewingAgentTaskId] : undefined,
  );
  let taskId = viewedTaskId(viewedTask);
  let { messages } = transcriptMessagesStore(taskId);
  let inProgress = useAppState(
    (state) =>
      state.transcripts[taskId]?.inProgressToolUseIDs ?? INITIAL_IN_PROGRESS_STATE.inProgressToolUseIDs,
  );
  let [cache] = useState(() => new WeakMap());
  return useMemo(
    () =>
      getViewedTranscriptState({
        viewedTask,
        transcript: {
          messages: tagCoordinatorOrigin(messages, viewedTask, cache),
          inProgressToolUseIDs: inProgress,
        },
        mainIsBusy,
        mainConversationId,
      }),
    [viewedTask, messages, inProgress, mainIsBusy, mainConversationId, cache],
  );
}
//@ chunk-czq1j3j2.js:228780-228784 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:228780", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:228784-228788 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:228784", () => {
  init_react_production();
});
export { useViewedAgentTranscript };
