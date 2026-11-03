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
import { j, yt, R, ce } from "../../vendor/react/cjs/react.production.js";
import { onFastRejectedFallbackModelsChanged, isFastModeOnForModel } from "../utils/fastMode.js";
import { useAppState, useSetAppState } from "../state/AppState.js";
import { useTerminalFocus } from "../ink/hooks/use-terminal-focus.js";
import { nGe, jBn } from "../services/PromptSuggestion/promptSuggestion.js";
import { logEvent } from "../services/analytics/index.js";
import { lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { ye } from "../utils/startupMarks.js";

//@ chunk-18hwfzwa.js:538827-538831 placement
j();
//@ chunk-18hwfzwa.js:538831-538877 placement
function sDe(h, x) {
  return yt(onFastRejectedFallbackModelsChanged, () => isFastModeOnForModel(h, x));
}
//@ chunk-18hwfzwa.js:538877-538881 placement
j();
/**
 * 预测建议：tengu_prompt_suggestion 开启时显示模型生成的下一句建议，Tab/→ 接受，记录 shown/accepted/ignored。
 */
//@ chunk-18hwfzwa.js:538881-540532 fingerprint = usePromptSuggestion (0.817)
function usePromptSuggestion({ hasInput: hasInput, isAssistantResponding: isAssistantResponding }) {
  let promptSuggestion = useAppState((Dt) => Dt.promptSuggestion),
    setAppState = useSetAppState(),
    isTerminalFocused = useTerminalFocus(),
    ke = nGe(promptSuggestion),
    Re = jBn(promptSuggestion),
    Be = promptSuggestion.status === "empty" ? null : promptSuggestion.generationRequestId,
    He = ke ? promptSuggestion.shownAt : 0,
    We = promptSuggestion.status === "accepted" ? promptSuggestion.acceptedAt : 0,
    ze = isAssistantResponding || hasInput ? null : Re,
    firstKeystrokeAt = R(0),
    wasFocusedWhenShown = R(!0),
    prevShownAt = R(0);
  if (He > 0 && He !== prevShownAt.current)
    ((prevShownAt.current = He),
      (wasFocusedWhenShown.current = isTerminalFocused),
      (firstKeystrokeAt.current = 0));
  else if (He === 0) prevShownAt.current = 0;
  if (hasInput && firstKeystrokeAt.current === 0 && ke) firstKeystrokeAt.current = Date.now();
  let resetSuggestion = ce(() => {
      setAppState((prev) => ({ ...prev, promptSuggestion: { status: "empty" } }));
    }, [setAppState]),
    markAccepted = ce(() => {
      if (!ke) return;
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
    }, [ke, setAppState]),
    markShown = ce(() => {
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
    }, [setAppState]),
    logOutcomeAtSubmission = ce(
      (finalInput, opts) => {
        if (!ke) return null;
        let tabWasPressed = We > He,
          Xt = tabWasPressed || finalInput.toLowerCase() === Re?.toLowerCase(),
          io = Xt ? We || Date.now() : Date.now();
        if (
          (logEvent("tengu_prompt_suggestion", {
            source: lit_2("cli"),
            outcome: lit_2(Xt ? "accepted" : "ignored"),
            prompt_id: lit_2("user_intent"),
            ...(Be && { generationRequestId: ye(Be) }),
            ...(Xt && { acceptMethod: lit_2(tabWasPressed ? "tab" : "enter") }),
            ...(Xt && { timeToAcceptMs: io - He }),
            ...(!Xt && { timeToIgnoreMs: io - He }),
            ...(firstKeystrokeAt.current > 0 && { timeToFirstKeystrokeMs: firstKeystrokeAt.current - He }),
            wasFocusedWhenShown: wasFocusedWhenShown.current,
            similarity: Math.round((finalInput.length / (Re?.length || 1)) * 100) / 100,
          }),
          !opts?.skipReset)
        )
          resetSuggestion();
        return Xt;
      },
      [ke, We, He, Re, Be, resetSuggestion],
    );
  return {
    suggestion: ze,
    markAccepted: markAccepted,
    markShown: markShown,
    logOutcomeAtSubmission: logOutcomeAtSubmission,
  };
}

export { usePromptSuggestion, sDe };
