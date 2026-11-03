/**
 * bridge/projectsReplyGate.ts
 *
 * Projects 回复门：记录 SDK 轮次错误（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cshk0jw3.js (1)
 * attribution: placement 1
 */
import { isErrorTerminalReason } from "../entrypoints/sdk/coreSchemas.js";
import {
  isProjectsReplyGateEnabled,
  isProjectsReplyMountConnected,
  isUnansweredProjectsRun,
} from "./projectsReplyEvaluation.js";
import { logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logError } from "../utils/log.js";
import { withTelemetryMessage, toError } from "../utils/errors.js";

//@ chunk-cshk0jw3.js:11889-12118 placement
/**
 * Projects 回复门：对 SDK 轮次错误写记录（bridge_projects_reply_gate）
 */
function recordProjectsReplyTurnError(r, t, e) {
  try {
    if (
      !isErrorTerminalReason(r.reason) ||
      t !== "sdk" ||
      e.agentId ||
      !isProjectsReplyGateEnabled() ||
      !isProjectsReplyMountConnected(e.engineState()) ||
      !isUnansweredProjectsRun(e.messages)
    )
      return;
    logFeatureBad("bridge_projects_reply_gate", "turn_errored");
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "projects reply turn-error record failed"));
  }
}
