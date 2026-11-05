/**
 * components/PromptInput/useMaybeTruncateInput.ts
 *
 * 输入值超过 10000 字符时自动调用 maybeTruncateInput 折叠中段（每次清空后可再次触发）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/useMaybeTruncateInput.ts
 * pieces: chunk-czq1j3j2.js (2)
 * attribution: affinity 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { selectDraftValue, selectPastedContents } from "../../screens/repl/PromptDraft.js";
import { useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { TRUNCATE_THRESHOLD_CHARS, maybeTruncateInput } from "./inputPaste.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:910000-910040 affinity
var TRUNCATE_EDIT_ATTRIBUTION; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:910000", () => {
  TRUNCATE_EDIT_ATTRIBUTION = Object.freeze({
    kind: "landing",
  });
});
//@ chunk-czq1j3j2.js:910040-910326 fingerprint (2.1.88 match: useMaybeTruncateInput, 0.694)
function useMaybeTruncateInput(draft, setCursorOffset) {
  let value = useStoreSelector(draft, selectDraftValue);
  let pastedContents = useStoreSelector(draft, selectPastedContents);
  let [hasAppliedTruncationToInput, setHasAppliedTruncationToInput] = useState(false);
  useEffect(() => {
    if (hasAppliedTruncationToInput) return;
    if (value.length <= TRUNCATE_THRESHOLD_CHARS) return;
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
