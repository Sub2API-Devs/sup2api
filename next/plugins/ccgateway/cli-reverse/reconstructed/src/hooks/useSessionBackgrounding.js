/**
 * hooks/useSessionBackgrounding.ts
 *
 * 把当前会话转为后台运行的 hook（handleBackgroundSession）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useSessionBackgrounding.ts
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useCallback } from "../../vendor/react/cjs/react.production.js";

//@ chunk-czq1j3j2.js:1755560-1755646 fingerprint (2.1.88 match: useSessionBackgrounding, 0.36)
function useSessionBackgrounding({ onBackgroundQuery }) {
  return {
    handleBackgroundSession: useCallback(() => {
      onBackgroundQuery();
    }, [onBackgroundQuery]),
  };
}
export { useSessionBackgrounding };
