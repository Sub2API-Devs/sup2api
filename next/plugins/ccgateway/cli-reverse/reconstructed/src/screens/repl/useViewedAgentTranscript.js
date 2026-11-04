/**
 * screens/repl/useViewedAgentTranscript.ts
 *
 * 2.1.316 新增：取正在查看的 agent 任务的转录（加协调者来源标记、带进行中的工具调用），合成为主界面要显示的视图。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 3
 */
import { useAppState } from "../../state/AppState.js";
import { viewedTaskId, getViewedTranscriptState } from "../../state/teammateViewHelpers.js";
import { transcriptMessagesStore } from "./ReplEffects.js";
import { INITIAL_IN_PROGRESS_STATE } from "../../state/inProgressToolUses.js";
import { useState, useMemo, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { tagCoordinatorOrigin } from "../../coordinator/coordinatorMode.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:223340-223741 placement
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
//@ chunk-18hwfzwa.js:223741-223745 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:223741", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:223745-223749 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:223745", () => {
  init_react_production();
});
export { useViewedAgentTranscript };
