/**
 * hooks/useRefusableAnswer.ts
 *
 * 2.1.316 新增：可拒绝回答的 hook
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x35ttgf3.js (2)
 * attribution: placement 2
 */
import {
  init_react_production,
  useState,
  useCallback,
  useEffect,
} from "../../vendor/react/cjs/react.production.js";

//@ chunk-x35ttgf3.js:233-237 placement
init_react_production();
//@ chunk-x35ttgf3.js:237-557 placement
function useRefusableAnswer(isAnswerAccepted) {
  let [state, setState] = useState({
    attempts: 0,
    refused: null,
  });
  let refuse = useCallback((refused) => {
    setState((previous) => ({
      attempts: previous.attempts + 1,
      refused,
    }));
  }, []);
  let answer = useCallback(
    (value) => {
      if (isAnswerAccepted(value) === false) {
        refuse(value);
        return false;
      }
      return true;
    },
    [isAnswerAccepted, refuse],
  );
  useEffect(() => {
    if (state.refused !== null)
      setState((previous) => ({
        attempts: previous.attempts,
        refused: null,
      }));
  }, [state.refused]);
  return {
    answer,
    refuse,
    refused: state.refused,
    attempts: state.attempts,
  };
}
export { useRefusableAnswer };
