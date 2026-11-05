/**
 * utils/codeMode/remoteSessionId.ts
 *
 * 远端会话 id（会话标题状态为 ok 时才给）取值（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-zhnr3erp.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { resolveSdkUrl } from "../../cli/transports/sdkUrlValidation.js";
import { env } from "../env.js";

//@ chunk-zhnr3erp.js:8007-8086 placement
function _() {
  return resolveSdkUrl().status === "ok" ? env.CLAUDE_CODE_REMOTE_SESSION_ID : undefined;
}
export { _ };
