/**
 * utils/unaryLogging.ts
 *
 * tengu_unary_event 一元事件（接受/拒绝）上报。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/unaryLogging.ts
 * pieces: chunk-s4bxxzsw.js (1)
 * attribution: fingerprint 1
 */
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { ye } from "./startupMarks.js";
import { X4 } from "../services/analytics/metadata.js";

/**
 * 发 tengu_unary_event（接受/拒绝类一元事件，含 completion_type、language_name、message_id）。
 */
//@ chunk-s4bxxzsw.js:26748-27036 fingerprint = logUnaryEvent (1)
async function logUnaryEvent(event) {
  logEvent("tengu_unary_event", {
    event: fromEnum(event.event),
    completion_type: fromEnum(event.completion_type),
    language_name: await event.metadata.language_name,
    message_id: ye(event.metadata.message_id),
    platform: X4(event.metadata.platform),
    ...(event.metadata.hasFeedback !== void 0 && { hasFeedback: event.metadata.hasFeedback }),
  });
}

export { logUnaryEvent };
