/**
 * hooks/useTeleportResume.tsx
 *
 * teleport 恢复会话的 hook（tengu_teleport_resume_session）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useTeleportResume.tsx
 * pieces: chunk-0bntfk7p.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { y } from "../../vendor/react/cjs/react.production.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { ye } from "../utils/startupMarks.js";
import { withFeatureTelemetry } from "../services/analytics/featureTelemetry.js";
import { teleportResumeCodeSession } from "../utils/teleport.js";
import { setTeleportedSessionInfo } from "../bootstrap/state.js";
import { TeleportOperationError, errorMessage } from "../utils/errors.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";

//@ chunk-0bntfk7p.js:1257-1971 fingerprint = useTeleportResume (0.793)
function useTeleportResume(source) {
  let $ = w(8),
    [i, R] = y(!1),
    [p, b] = y(null),
    [C, f] = y(null),
    T;
  if ($[0] !== source)
    ((T = async (session) => {
      (R(!0),
        b(null),
        f(session),
        logEvent("tengu_teleport_resume_session", { source: fromEnum(source), session_id: ye(session.id) }));
      try {
        let v = await withFeatureTelemetry("teleport_resume", () => teleportResumeCodeSession(session.id));
        return (setTeleportedSessionInfo({ sessionId: session.id }), R(!1), v);
      } catch (t1) {
        let l = t1;
        let teleportError = {
          message: l instanceof TeleportOperationError ? l.message : errorMessage(l),
          formattedMessage: l instanceof TeleportOperationError ? l.formattedMessage : void 0,
          isOperationError: l instanceof TeleportOperationError,
        };
        return (b(teleportError), R(!1), null);
      }
    }),
      ($[0] = source),
      ($[1] = T));
  else T = $[1];
  let M = T,
    m;
  if ($[2] === MEMO_CACHE_SENTINEL)
    ((m = () => {
      b(null);
    }),
      ($[2] = m));
  else m = $[2];
  let G = m,
    H;
  if ($[3] !== p || $[4] !== i || $[5] !== M || $[6] !== C)
    ((H = { resumeSession: M, isResuming: i, error: p, selectedSession: C, clearError: G }),
      ($[3] = p),
      ($[4] = i),
      ($[5] = M),
      ($[6] = C),
      ($[7] = H));
  else H = $[7];
  return H;
}

export { useTeleportResume };
