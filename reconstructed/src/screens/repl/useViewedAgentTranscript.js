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
import { y, Q, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { tagCoordinatorOrigin } from "../../coordinator/coordinatorMode.js";

//@ chunk-18hwfzwa.js:223340-223741 placement
/**
 * 取正在查看的 agent 任务的转录（消息加协调者来源标记、进行中的工具调用），合成为主界面要显示的视图。
 */
function useViewedAgentTranscript({ mainIsBusy, mainConversationId }) {
  let task = useAppState((Be) => (Be.viewingAgentTaskId ? Be.tasks[Be.viewingAgentTaskId] : undefined));
  let L = viewedTaskId(task);
  let { messages } = transcriptMessagesStore(L);
  let ke = useAppState(
    (Be) => Be.transcripts[L]?.inProgressToolUseIDs ?? INITIAL_IN_PROGRESS_STATE.inProgressToolUseIDs,
  );
  let [cache] = y(() => new WeakMap());
  return Q(
    () =>
      getViewedTranscriptState({
        viewedTask: task,
        transcript: {
          messages: tagCoordinatorOrigin(messages, task, cache),
          inProgressToolUseIDs: ke,
        },
        mainIsBusy,
        mainConversationId,
      }),
    [task, messages, ke, mainIsBusy, mainConversationId, cache],
  );
}
//@ chunk-18hwfzwa.js:223741-223745 placement
init_react_production();
//@ chunk-18hwfzwa.js:223745-223749 placement
init_react_production();
export { useViewedAgentTranscript };
