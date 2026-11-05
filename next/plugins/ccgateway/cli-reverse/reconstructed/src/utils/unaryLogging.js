/**
 * utils/unaryLogging.ts
 *
 * tengu_unary_event 一元事件（接受/拒绝）上报。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/unaryLogging.ts
 * pieces: chunk-g4tsxwy3.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "./startupMarks.js";
import { platformOrOther } from "../services/analytics/metadata.js";

//@ chunk-g4tsxwy3.js:26920-27208 fingerprint (2.1.88 match: logUnaryEvent, 1)
/**
 * 发 tengu_unary_event（接受/拒绝类一元事件，含 completion_type、language_name、message_id）。
 */
async function logUnaryEvent(event) {
  logEvent("tengu_unary_event", {
    event: fromEnum(event.event),
    completion_type: fromEnum(event.completion_type),
    language_name: await event.metadata.language_name,
    message_id: sanitizeMarkName(event.metadata.message_id),
    platform: platformOrOther(event.metadata.platform),
    ...(event.metadata.hasFeedback !== undefined && {
      hasFeedback: event.metadata.hasFeedback,
    }),
  });
}
export { logUnaryEvent };
