/**
 * utils/telemetry/userPromptEvent.ts
 *
 * 2.1.316 新增：用户提示 OTel 事件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b5rfb1p7.js (1)
 * attribution: placement 1
 */
import { logOTelEvent, redactIfDisabled_2 } from "./events.js";

//@ chunk-b5rfb1p7.js:303-402 placement
function logUserPromptEvent(event, content) {
  logOTelEvent("user_prompt", {
    prompt_length: String(content?.length ?? 0),
    ...redactIfDisabled_2(content),
    ...event.attributes,
  });
}
export { logUserPromptEvent };
