/**
 * components/PromptInput/usePromptInputPlaceholder.ts
 *
 * 输入框占位符：排队编辑提示、"Message @队友"、示例提示等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/usePromptInputPlaceholder.ts
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { useCommandQueue } from "../Messages.js";
import { useAppState } from "../../state/AppState.js";
import { Q } from "../../../vendor/react/cjs/react.production.js";
import { truncate } from "../../utils/format.js";
import { isRefillableInput } from "../../utils/messageQueueManager.js";
import { isKbCohesionFixesOn } from "../../utils/kbCohesionFixes.js";
import { isQueuedSendNowEnabled } from "./promptFlags.js";
import { getGlobalConfig } from "../../utils/config.js";
import { getExampleCommandFromCache } from "../../utils/exampleCommands.js";
import { getSessionId } from "../../bootstrap/state.js";

//@ chunk-18hwfzwa.js:921233-921250 affinity
var QUEUED_UP_HINT_COUNT = 3;
var AGENT_NAME_MAX_LENGTH = 20;
//@ chunk-18hwfzwa.js:921250-922094 fingerprint = usePromptInputPlaceholder (0.467)
function usePromptInputPlaceholder({ isInputEmpty, submitCount, hasMessages, viewingAgentName }) {
  let queuedCommands = useCommandQueue();
  let promptSuggestionEnabled = useAppState((He) => He.promptSuggestionEnabled);
  let Re = useAppState((He) =>
    He.queueEditIndex === null ? "none" : He.queueEditIndex === 0 ? "oldest" : "newer",
  );
  return Q(() => {
    if (!isInputEmpty) return;
    if (viewingAgentName) return `Message @${truncate(viewingAgentName, AGENT_NAME_MAX_LENGTH)}\u2026`;
    if (queuedCommands.some(isRefillableInput)) {
      if (Re !== "none")
        return Re === "oldest"
          ? "Press Enter to edit the selected message, or up again for history"
          : "Press Enter to edit the selected message, or up again for an older one";
      let He = isKbCohesionFixesOn();
      if (isQueuedSendNowEnabled())
        return He
          ? "Press up to select a queued message to edit, or Enter to send them now"
          : "Press up to edit queued messages, Enter to send them immediately";
      if ((getGlobalConfig().queuedCommandUpHintCount || 0) < QUEUED_UP_HINT_COUNT)
        return He
          ? "Press up to select a queued message, then Enter to edit it"
          : "Press up to edit queued messages";
    }
    if (submitCount < 1 && !hasMessages && promptSuggestionEnabled)
      return getExampleCommandFromCache(getSessionId());
  }, [isInputEmpty, queuedCommands, Re, submitCount, hasMessages, promptSuggestionEnabled, viewingAgentName]);
}
export { usePromptInputPlaceholder };
