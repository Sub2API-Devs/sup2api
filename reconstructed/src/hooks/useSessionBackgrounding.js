/**
 * hooks/useSessionBackgrounding.ts
 *
 * 把当前会话转为后台运行的 hook（handleBackgroundSession）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useSessionBackgrounding.ts
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { ce } from "../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:1709261-1709347 fingerprint = useSessionBackgrounding (0.344)
function useSessionBackgrounding({ onBackgroundQuery }) {
  return {
    handleBackgroundSession: ce(() => {
      onBackgroundQuery();
    }, [onBackgroundQuery]),
  };
}
export { useSessionBackgrounding };
