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
import { Up } from "../../utils/messageQueueManager.js";
import { CC } from "../../utils/kbCohesionFixes.js";
import { Gfn } from "./promptFlags.js";
import { getGlobalConfig } from "../../utils/config.js";
import { getExampleCommandFromCache } from "../../utils/exampleCommands.js";
import { getSessionId } from "../../bootstrap/state.js";

//@ chunk-18hwfzwa.js:921233-921250 affinity
var _ao = 3,
  Tao = 20;
//@ chunk-18hwfzwa.js:921250-922094 fingerprint = usePromptInputPlaceholder (0.467)
function usePromptInputPlaceholder({
  isInputEmpty: isInputEmpty,
  submitCount: submitCount,
  hasMessages: hasMessages,
  viewingAgentName: viewingAgentName,
}) {
  let queuedCommands = useCommandQueue(),
    promptSuggestionEnabled = useAppState((He) => He.promptSuggestionEnabled),
    Re = useAppState((He) =>
      He.queueEditIndex === null ? "none" : He.queueEditIndex === 0 ? "oldest" : "newer",
    );
  return Q(() => {
    if (!isInputEmpty) return;
    if (viewingAgentName) return `Message @${truncate(viewingAgentName, Tao)}\u2026`;
    if (queuedCommands.some(Up)) {
      if (Re !== "none")
        return Re === "oldest"
          ? "Press Enter to edit the selected message, or up again for history"
          : "Press Enter to edit the selected message, or up again for an older one";
      let He = CC();
      if (Gfn())
        return He
          ? "Press up to select a queued message to edit, or Enter to send them now"
          : "Press up to edit queued messages, Enter to send them immediately";
      if ((getGlobalConfig().queuedCommandUpHintCount || 0) < _ao)
        return He
          ? "Press up to select a queued message, then Enter to edit it"
          : "Press up to edit queued messages";
    }
    if (submitCount < 1 && !hasMessages && promptSuggestionEnabled)
      return getExampleCommandFromCache(getSessionId());
  }, [isInputEmpty, queuedCommands, Re, submitCount, hasMessages, promptSuggestionEnabled, viewingAgentName]);
}

export { usePromptInputPlaceholder };
