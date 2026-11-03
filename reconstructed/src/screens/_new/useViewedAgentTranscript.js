/**
 * screens/_new/useViewedAgentTranscript.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: sole-consumer-new 3
 */
import { useAppState } from "../../state/AppState.js";
import { viewedTaskId, getViewedTranscriptState } from "../../state/teammateViewHelpers.js";
import { ug } from "../repl/ReplEffects.js";
import { h2t } from "../../state/inProgressToolUses.js";
import { y, Q, j } from "../../../vendor/react/cjs/react.production.js";
import { tagCoordinatorOrigin } from "../../coordinator/coordinatorMode.js";

/**
 * 取正在查看的 agent 任务的转录（消息加协调者来源标记、进行中的工具调用），合成为主界面要显示的视图。
 */
//@ chunk-18hwfzwa.js:223340-223741 sole-consumer-new
function useViewedAgentTranscript({ mainIsBusy: mainIsBusy, mainConversationId: mainConversationId }) {
  let D = useAppState((Be) => (Be.viewingAgentTaskId ? Be.tasks[Be.viewingAgentTaskId] : void 0)),
    L = viewedTaskId(D),
    { messages: messages } = ug(L),
    ke = useAppState((Be) => Be.transcripts[L]?.inProgressToolUseIDs ?? h2t.inProgressToolUseIDs),
    [Re] = y(() => new WeakMap());
  return Q(
    () =>
      getViewedTranscriptState({
        viewedTask: D,
        transcript: { messages: tagCoordinatorOrigin(messages, D, Re), inProgressToolUseIDs: ke },
        mainIsBusy: mainIsBusy,
        mainConversationId: mainConversationId,
      }),
    [D, messages, ke, mainIsBusy, mainConversationId, Re],
  );
}
//@ chunk-18hwfzwa.js:223741-223745 sole-consumer-new
j();
//@ chunk-18hwfzwa.js:223745-223749 sole-consumer-new
j();

export { useViewedAgentTranscript };
