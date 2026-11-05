/**
 * utils/telemetry/userPromptEvent.ts
 *
 * 2.1.316 新增：用户提示 OTel 事件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qr15drgp.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logOTelEvent, redactIfDisabled_2 } from "./events.js";

//@ chunk-qr15drgp.js:303-402 placement
function logUserPromptEvent(event, content) {
  logOTelEvent("user_prompt", {
    prompt_length: String(content?.length ?? 0),
    ...redactIfDisabled_2(content),
    ...event.attributes,
  });
}
export { logUserPromptEvent };
