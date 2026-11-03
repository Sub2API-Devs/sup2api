/**
 * components/permissions/AskUserQuestionPermissionRequest/use-multiple-choice-state.ts
 *
 * 问答对话框状态 reducer（当前问题、答案、文本输入模式）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/AskUserQuestionPermissionRequest/use-multiple-choice-state.ts
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: fingerprint 3
 */
import { Uy, ce } from "../../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:1274152-1274957 fingerprint = reducer (0.952)
function reducer(state, action) {
  switch (action.type) {
    case "next-question":
      return { ...state, currentQuestionIndex: state.currentQuestionIndex + 1, isInTextInput: !1 };
    case "prev-question":
      return {
        ...state,
        currentQuestionIndex: Math.max(0, state.currentQuestionIndex - 1),
        isInTextInput: !1,
      };
    case "update-question-state": {
      let existing = state.questionStates[action.questionText],
        newState = {
          selectedValue:
            ("selectedValue" in action.updates ? action.updates.selectedValue : existing?.selectedValue) ??
            (action.isMultiSelect ? [] : void 0),
          textInputValue: action.updates.textInputValue ?? existing?.textInputValue ?? "",
        };
      return { ...state, questionStates: { ...state.questionStates, [action.questionText]: newState } };
    }
    case "set-answer": {
      let newState = { ...state, answers: { ...state.answers, [action.questionText]: action.answer } };
      if (action.shouldAdvance)
        return { ...newState, currentQuestionIndex: newState.currentQuestionIndex + 1, isInTextInput: !1 };
      return newState;
    }
    case "set-text-input-mode":
      return { ...state, isInTextInput: action.isInInput };
  }
}
//@ chunk-18hwfzwa.js:1274957-1275036 fingerprint = INITIAL_STATE (1)
var INITIAL_STATE = { currentQuestionIndex: 0, answers: {}, questionStates: {}, isInTextInput: !1 };
//@ chunk-18hwfzwa.js:1275036-1275630 fingerprint = useMultipleChoiceState (1)
function useMultipleChoiceState() {
  let [h, x] = Uy(reducer, INITIAL_STATE),
    nextQuestion = ce(() => {
      x({ type: "next-question" });
    }, []),
    prevQuestion = ce(() => {
      x({ type: "prev-question" });
    }, []),
    updateQuestionState = ce((questionText, updates, isMultiSelect) => {
      x({
        type: "update-question-state",
        questionText: questionText,
        updates: updates,
        isMultiSelect: isMultiSelect,
      });
    }, []),
    setAnswer = ce((questionText, answer, We = !0) => {
      x({ type: "set-answer", questionText: questionText, answer: answer, shouldAdvance: We });
    }, []),
    setTextInputMode = ce((isInInput) => {
      x({ type: "set-text-input-mode", isInInput: isInInput });
    }, []);
  return {
    currentQuestionIndex: h.currentQuestionIndex,
    answers: h.answers,
    questionStates: h.questionStates,
    isInTextInput: h.isInTextInput,
    nextQuestion: nextQuestion,
    prevQuestion: prevQuestion,
    updateQuestionState: updateQuestionState,
    setAnswer: setAnswer,
    setTextInputMode: setTextInputMode,
  };
}

export { useMultipleChoiceState };
