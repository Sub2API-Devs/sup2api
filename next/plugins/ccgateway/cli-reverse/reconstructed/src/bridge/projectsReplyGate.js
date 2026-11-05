/**
 * bridge/projectsReplyGate.ts
 *
 * Projects 回复门：记录 SDK 轮次错误（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4bb3gdsw.js (1)
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

//@ chunk-4bb3gdsw.js:13037-13266 placement
/**
 * Projects 回复门：对 SDK 轮次错误写记录（bridge_projects_reply_gate）
 */
function recordProjectsReplyTurnError(turn, surface, context) {
  try {
    if (
      !isErrorTerminalReason(turn.reason) ||
      surface !== "sdk" ||
      context.agentId ||
      !isProjectsReplyGateEnabled() ||
      !isProjectsReplyMountConnected(context.engineState()) ||
      !isUnansweredProjectsRun(context.messages)
    )
      return;
    logFeatureBad("bridge_projects_reply_gate", "turn_errored");
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "projects reply turn-error record failed"));
  }
}
export { recordProjectsReplyTurnError };
