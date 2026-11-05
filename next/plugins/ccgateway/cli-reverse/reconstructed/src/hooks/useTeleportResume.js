/**
 * hooks/useTeleportResume.tsx
 *
 * teleport 恢复会话的 hook（tengu_teleport_resume_session）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useTeleportResume.tsx
 * pieces: chunk-1c4mt1y2.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-1c4mt1y2.js:1258-1902 fingerprint (2.1.88 match: useTeleportResume, 0.77)
function useTeleportResume(source) {
  let $ = useMemoCache(7);
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
  let exitKeybindings;
  if ($[2] !== error || $[3] !== isResuming || $[4] !== resumeSession || $[5] !== selectedSession) {
    exitKeybindings = {
      resumeSession,
      isResuming,
      error,
      selectedSession,
    };
    $[2] = error;
    $[3] = isResuming;
    $[4] = resumeSession;
    $[5] = selectedSession;
    $[6] = exitKeybindings;
  } else exitKeybindings = $[6];
  return exitKeybindings;
}
export { useTeleportResume };
