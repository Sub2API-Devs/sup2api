/**
 * hooks/usePromptSuggestion.ts
 *
 * 输入框预测建议（tengu_prompt_suggestion）：显示/接受/忽略的状态与统计。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/usePromptSuggestion.ts
 * pieces: chunk-czq1j3j2.js (4)
 * attribution: placement 3, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useSyncExternalStore,
  useRef,
  useCallback,
} from "../../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:541005-541009 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:541005", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:541009-541013 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:541009", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:559538-559584 placement
/**
 * 函数 useFastModeOnForModel（订阅并计算某模型的 fast mode 状态）；位于「输入框预测建议（tengu_prompt_suggestion）：显示/接受/忽略的状态与统计」模块。
 */
function useFastModeOnForModel(model, fallbackModel) {
  return useSyncExternalStore(onFastRejectedFallbackModelsChanged, () =>
    isFastModeOnForModel(model, fallbackModel),
  );
}
//@ chunk-czq1j3j2.js:559588-561218 fingerprint (2.1.88 match: usePromptSuggestion, 0.797)
/**
 * 预测建议：tengu_prompt_suggestion 开启时显示模型生成的下一句建议，Tab/→ 接受，记录 shown/accepted/ignored。
 */
function usePromptSuggestion({ hasInput: inputValue, isAssistantResponding }) {
  let promptSuggestion = useAppState((state) => state.promptSuggestion);
  let setAppState = useSetAppState();
  let isTerminalFocused = useTerminalFocus();
  let isValidSuggestion = isShownOrAcceptedSuggestion(promptSuggestion);
  let suggestionText = suggestionTextOrNull(promptSuggestion);
  let generationRequestId = promptSuggestion.status === "empty" ? null : promptSuggestion.generationRequestId;
  let shownAt = isValidSuggestion ? promptSuggestion.shownAt : 0;
  let acceptedAt = promptSuggestion.status === "accepted" ? promptSuggestion.acceptedAt : 0;
  let suggestion = isAssistantResponding || inputValue ? null : suggestionText;
  let firstKeystrokeAt = useRef(0);
  let wasFocusedWhenShown = useRef(true);
  let prevShownAt = useRef(0);
  if (shownAt > 0 && shownAt !== prevShownAt.current) {
    prevShownAt.current = shownAt;
    wasFocusedWhenShown.current = isTerminalFocused;
    firstKeystrokeAt.current = 0;
  } else if (shownAt === 0) prevShownAt.current = 0;
  if (inputValue && firstKeystrokeAt.current === 0 && isValidSuggestion)
    firstKeystrokeAt.current = Date.now();
  let resetSuggestion = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      promptSuggestion: {
        status: "empty",
      },
    }));
  }, [setAppState]);
  let markAccepted = useCallback(() => {
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
  let markShown = useCallback(() => {
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
  let logOutcomeAtSubmission = useCallback(
    (finalInput) => {
      if (!isValidSuggestion) return null;
      let tabWasPressed = acceptedAt > shownAt;
      let wasAccepted = tabWasPressed || finalInput.toLowerCase() === suggestionText?.toLowerCase();
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
        similarity: Math.round((finalInput.length / (suggestionText?.length || 1)) * 100) / 100,
      });
      resetSuggestion();
      return wasAccepted;
    },
    [isValidSuggestion, acceptedAt, shownAt, suggestionText, generationRequestId, resetSuggestion],
  );
  return {
    suggestion,
    markAccepted,
    markShown,
    logOutcomeAtSubmission,
  };
}
export { useFastModeOnForModel, usePromptSuggestion };
