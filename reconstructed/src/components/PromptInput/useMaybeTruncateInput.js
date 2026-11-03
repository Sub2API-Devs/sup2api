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
import { y, P } from "../../../vendor/react/cjs/react.production.js";
import { maybeTruncateInput } from "./inputPaste.js";

//@ chunk-18hwfzwa.js:877127-877167 affinity
var TRUNCATE_EDIT_ATTRIBUTION = Object.freeze({ kind: "landing" });
//@ chunk-18hwfzwa.js:877167-877453 fingerprint = useMaybeTruncateInput (0.694)
function useMaybeTruncateInput(h, x) {
  let value = useStoreSelector(h, selectDraftValue),
    pastedContents = useStoreSelector(h, selectPastedContents),
    [ee, ke] = y(!1);
  (P(() => {
    if (ee) return;
    if (value.length <= 1e4) return;
    let { newInput: newInput, newPastedContents: newPastedContents } = maybeTruncateInput(
      value,
      pastedContents,
    );
    (h.attribute(TRUNCATE_EDIT_ATTRIBUTION, () => h.setValue(newInput)),
      h.setCursorOffset(x(newInput)),
      h.setPastedContents(newPastedContents),
      ke(!0));
  }, [value, ee, pastedContents, h, x]),
    P(() => {
      if (value === "") ke(!1);
    }, [value]));
}

export { useMaybeTruncateInput };
