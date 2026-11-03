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
      return {
        ...state,
        currentQuestionIndex: state.currentQuestionIndex + 1,
        isInTextInput: false,
      };
    case "prev-question":
      return {
        ...state,
        currentQuestionIndex: Math.max(0, state.currentQuestionIndex - 1),
        isInTextInput: false,
      };
    case "update-question-state": {
      let existing = state.questionStates[action.questionText];
      let newState = {
        selectedValue:
          ("selectedValue" in action.updates ? action.updates.selectedValue : existing?.selectedValue) ??
          (action.isMultiSelect ? [] : undefined),
        textInputValue: action.updates.textInputValue ?? existing?.textInputValue ?? "",
      };
      return {
        ...state,
        questionStates: {
          ...state.questionStates,
          [action.questionText]: newState,
        },
      };
    }
    case "set-answer": {
      let newState = {
        ...state,
        answers: {
          ...state.answers,
          [action.questionText]: action.answer,
        },
      };
      if (action.shouldAdvance)
        return {
          ...newState,
          currentQuestionIndex: newState.currentQuestionIndex + 1,
          isInTextInput: false,
        };
      return newState;
    }
    case "set-text-input-mode":
      return {
        ...state,
        isInTextInput: action.isInInput,
      };
  }
}
//@ chunk-18hwfzwa.js:1274957-1275036 fingerprint = INITIAL_STATE (1)
var INITIAL_STATE = {
  currentQuestionIndex: 0,
  answers: {},
  questionStates: {},
  isInTextInput: false,
};
//@ chunk-18hwfzwa.js:1275036-1275630 fingerprint = useMultipleChoiceState (1)
function useMultipleChoiceState() {
  let [state, dispatch] = Uy(reducer, INITIAL_STATE);
  let nextQuestion = ce(() => {
    dispatch({
      type: "next-question",
    });
  }, []);
  let prevQuestion = ce(() => {
    dispatch({
      type: "prev-question",
    });
  }, []);
  let updateQuestionState = ce((questionText, updates, isMultiSelect) => {
    dispatch({
      type: "update-question-state",
      questionText,
      updates,
      isMultiSelect,
    });
  }, []);
  let setAnswer = ce((questionText, answer, shouldAdvance = true) => {
    dispatch({
      type: "set-answer",
      questionText,
      answer,
      shouldAdvance,
    });
  }, []);
  let setTextInputMode = ce((isInInput) => {
    dispatch({
      type: "set-text-input-mode",
      isInInput,
    });
  }, []);
  return {
    currentQuestionIndex: state.currentQuestionIndex,
    answers: state.answers,
    questionStates: state.questionStates,
    isInTextInput: state.isInTextInput,
    nextQuestion,
    prevQuestion,
    updateQuestionState,
    setAnswer,
    setTextInputMode,
  };
}
export { useMultipleChoiceState };
