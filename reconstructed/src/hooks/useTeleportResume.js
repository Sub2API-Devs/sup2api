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
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useState } from "../../vendor/react/cjs/react.production.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../utils/startupMarks.js";
import { withFeatureTelemetry } from "../services/analytics/featureTelemetry.js";
import { teleportResumeCodeSession } from "../utils/teleport.js";
import { setTeleportedSessionInfo } from "../bootstrap/state.js";
import { TeleportOperationError, errorMessage } from "../utils/errors.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";

//@ chunk-0bntfk7p.js:1257-1971 fingerprint = useTeleportResume (0.793)
function useTeleportResume(source) {
  let $ = useMemoCache(8);
  let [isResuming, setIsResuming] = useState(false);
  let [error, setError] = useState(null);
  let [selectedSession, setSelectedSession] = useState(null);
  let t0;
  if ($[0] !== source) {
    t0 = async (session) => {
      setIsResuming(true);
      setError(null);
      setSelectedSession(session);
      logEvent("tengu_teleport_resume_session", {
        source: fromEnum(source),
        session_id: sanitizeMarkName(session.id),
      });
      try {
        let result = await withFeatureTelemetry("teleport_resume", () =>
          teleportResumeCodeSession(session.id),
        );
        setTeleportedSessionInfo({
          sessionId: session.id,
        });
        setIsResuming(false);
        return result;
      } catch (error) {
        let err = error;
        let teleportError = {
          message: err instanceof TeleportOperationError ? err.message : errorMessage(err),
          formattedMessage: err instanceof TeleportOperationError ? err.formattedMessage : undefined,
          isOperationError: err instanceof TeleportOperationError,
        };
        setError(teleportError);
        setIsResuming(false);
        return null;
      }
    };
    $[0] = source;
    $[1] = t0;
  } else t0 = $[1];
  let resumeSession = t0;
  let t1;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t1 = () => {
      setError(null);
    };
    $[2] = t1;
  } else t1 = $[2];
  let clearError = t1;
  let t2;
  if ($[3] !== error || $[4] !== isResuming || $[5] !== resumeSession || $[6] !== selectedSession) {
    t2 = {
      resumeSession,
      isResuming,
      error,
      selectedSession,
      clearError,
    };
    $[3] = error;
    $[4] = isResuming;
    $[5] = resumeSession;
    $[6] = selectedSession;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}
export { useTeleportResume };
