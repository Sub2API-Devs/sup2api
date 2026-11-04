/**
 * components/PromptInput/useMaybeTruncateInput.ts
 *
 * 输入值超过 10000 字符时自动调用 maybeTruncateInput 折叠中段（每次清空后可再次触发）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/useMaybeTruncateInput.ts
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { selectDraftValue, selectPastedContents } from "../../screens/repl/PromptDraft.js";
import { useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { maybeTruncateInput } from "./inputPaste.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:877127-877167 affinity
var TRUNCATE_EDIT_ATTRIBUTION; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:877127", () => {
  TRUNCATE_EDIT_ATTRIBUTION = Object.freeze({
    kind: "landing",
  });
});
//@ chunk-18hwfzwa.js:877167-877453 fingerprint = useMaybeTruncateInput (0.694)
function useMaybeTruncateInput(draft, setCursorOffset) {
  let value = useStoreSelector(draft, selectDraftValue);
  let pastedContents = useStoreSelector(draft, selectPastedContents);
  let [hasAppliedTruncationToInput, setHasAppliedTruncationToInput] = useState(false);
  useEffect(() => {
    if (hasAppliedTruncationToInput) return;
    if (value.length <= 1e4) return;
    let { newInput, newPastedContents } = maybeTruncateInput(value, pastedContents);
    draft.attribute(TRUNCATE_EDIT_ATTRIBUTION, () => draft.setValue(newInput));
    draft.setCursorOffset(setCursorOffset(newInput));
    draft.setPastedContents(newPastedContents);
    setHasAppliedTruncationToInput(true);
  }, [value, hasAppliedTruncationToInput, pastedContents, draft, setCursorOffset]);
  useEffect(() => {
    if (value === "") setHasAppliedTruncationToInput(false);
  }, [value]);
}
export { useMaybeTruncateInput };
