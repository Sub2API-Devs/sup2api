/**
 * hooks/usePromptSuggestion.ts
 *
 * 输入框预测建议（tengu_prompt_suggestion）：显示/接受/忽略的状态与统计。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/usePromptSuggestion.ts
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: placement 3, fingerprint 1
 */
import { init_react_production, yt, R, ce } from "../../vendor/react/cjs/react.production.js";
import { onFastRejectedFallbackModelsChanged, isFastModeOnForModel } from "../utils/fastMode.js";
import { useAppState, useSetAppState } from "../state/AppState.js";
import { useTerminalFocus } from "../ink/hooks/use-terminal-focus.js";
import {
  isShownOrAcceptedSuggestion,
  suggestionTextOrNull,
} from "../services/PromptSuggestion/promptSuggestion.js";
import { logEvent } from "../services/analytics/index.js";
import { lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../utils/startupMarks.js";

//@ chunk-18hwfzwa.js:538827-538831 placement
init_react_production();
//@ chunk-18hwfzwa.js:538831-538877 placement
/**
 * 函数 useFastModeOnForModel（订阅并计算某模型的 fast mode 状态）；位于「输入框预测建议（tengu_prompt_suggestion）：显示/接受/忽略的状态与统计」模块。
 */
function useFastModeOnForModel(h, x) {
  return yt(onFastRejectedFallbackModelsChanged, () => isFastModeOnForModel(h, x));
}
//@ chunk-18hwfzwa.js:538877-538881 placement
init_react_production();
//@ chunk-18hwfzwa.js:538881-540532 fingerprint = usePromptSuggestion (0.817)
/**
 * 预测建议：tengu_prompt_suggestion 开启时显示模型生成的下一句建议，Tab/→ 接受，记录 shown/accepted/ignored。
 */
function usePromptSuggestion({ hasInput: inputValue, isAssistantResponding }) {
  let promptSuggestion = useAppState((Dt) => Dt.promptSuggestion);
  let setAppState = useSetAppState();
  let isTerminalFocused = useTerminalFocus();
  let isValidSuggestion = isShownOrAcceptedSuggestion(promptSuggestion);
  let Re = suggestionTextOrNull(promptSuggestion);
  let generationRequestId = promptSuggestion.status === "empty" ? null : promptSuggestion.generationRequestId;
  let shownAt = isValidSuggestion ? promptSuggestion.shownAt : 0;
  let acceptedAt = promptSuggestion.status === "accepted" ? promptSuggestion.acceptedAt : 0;
  let suggestion = isAssistantResponding || inputValue ? null : Re;
  let firstKeystrokeAt = R(0);
  let wasFocusedWhenShown = R(true);
  let prevShownAt = R(0);
  if (shownAt > 0 && shownAt !== prevShownAt.current) {
    prevShownAt.current = shownAt;
    wasFocusedWhenShown.current = isTerminalFocused;
    firstKeystrokeAt.current = 0;
  } else if (shownAt === 0) prevShownAt.current = 0;
  if (inputValue && firstKeystrokeAt.current === 0 && isValidSuggestion)
    firstKeystrokeAt.current = Date.now();
  let resetSuggestion = ce(() => {
    setAppState((prev) => ({
      ...prev,
      promptSuggestion: {
        status: "empty",
      },
    }));
  }, [setAppState]);
  let markAccepted = ce(() => {
    if (!isValidSuggestion) return;
    setAppState((prev) => {
      let promptSuggestion = prev.promptSuggestion;
      switch (promptSuggestion.status) {
        case "shown":
        case "accepted":
          return {
            ...prev,
            promptSuggestion: {
              status: "accepted",
              text: promptSuggestion.text,
              generationRequestId: promptSuggestion.generationRequestId,
              shownAt: promptSuggestion.shownAt,
              acceptedAt: Date.now(),
            },
          };
        case "empty":
        case "generated":
          return prev;
      }
    });
  }, [isValidSuggestion, setAppState]);
  let markShown = ce(() => {
    setAppState((prev) => {
      let promptSuggestion = prev.promptSuggestion;
      if (promptSuggestion.status !== "generated") return prev;
      return {
        ...prev,
        promptSuggestion: {
          status: "shown",
          text: promptSuggestion.text,
          generationRequestId: promptSuggestion.generationRequestId,
          shownAt: Date.now(),
        },
      };
    });
  }, [setAppState]);
  let logOutcomeAtSubmission = ce(
    (finalInput, opts) => {
      if (!isValidSuggestion) return null;
      let tabWasPressed = acceptedAt > shownAt;
      let wasAccepted = tabWasPressed || finalInput.toLowerCase() === Re?.toLowerCase();
      let timeMs = wasAccepted ? acceptedAt || Date.now() : Date.now();
      logEvent("tengu_prompt_suggestion", {
        source: lit_2("cli"),
        outcome: lit_2(wasAccepted ? "accepted" : "ignored"),
        prompt_id: lit_2("user_intent"),
        ...(generationRequestId && {
          generationRequestId: sanitizeMarkName(generationRequestId),
        }),
        ...(wasAccepted && {
          acceptMethod: lit_2(tabWasPressed ? "tab" : "enter"),
        }),
        ...(wasAccepted && {
          timeToAcceptMs: timeMs - shownAt,
        }),
        ...(!wasAccepted && {
          timeToIgnoreMs: timeMs - shownAt,
        }),
        ...(firstKeystrokeAt.current > 0 && {
          timeToFirstKeystrokeMs: firstKeystrokeAt.current - shownAt,
        }),
        wasFocusedWhenShown: wasFocusedWhenShown.current,
        similarity: Math.round((finalInput.length / (Re?.length || 1)) * 100) / 100,
      });
      if (!opts?.skipReset) resetSuggestion();
      return wasAccepted;
    },
    [isValidSuggestion, acceptedAt, shownAt, Re, generationRequestId, resetSuggestion],
  );
  return {
    suggestion,
    markAccepted,
    markShown,
    logOutcomeAtSubmission,
  };
}
export { usePromptSuggestion, useFastModeOnForModel };
