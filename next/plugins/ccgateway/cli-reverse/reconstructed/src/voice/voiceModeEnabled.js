/**
 * voice/voiceModeEnabled.ts
 *
 * 语音模式组织开关 allow_voice_mode（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/voice/voiceModeEnabled.ts
 * pieces: chunk-7jxyna5q.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAnthropicAuthEnabled, hasStoredOAuthToken } from "../utils/auth.js";
import { isPolicyAllowed } from "../services/policyLimits/policyEvidence.js";

//@ chunk-7jxyna5q.js:378349-378423 placement
/**
 * 设置里是否出现 voice 相关字段。
 */
function hasVoiceSettings(initialSettings) {
  return initialSettings.voice?.enabled !== undefined || initialSettings.voiceEnabled !== undefined;
}
//@ chunk-7jxyna5q.js:378423-378488 placement
/**
 * 是否 Anthropic 登录且存有 OAuth 令牌。
 */
function hasAnthropicOAuthToken() {
  try {
    if (!isAnthropicAuthEnabled()) return false;
    return hasStoredOAuthToken();
  } catch {
    return false;
  }
}
//@ chunk-7jxyna5q.js:378488-378533 placement
function isVoiceModeAllowed() {
  return isPolicyAllowed("allow_voice_mode");
}
//@ chunk-7jxyna5q.js:378533-378568 placement
/**
 * 语音模式是否可用（登录 + 组织允许）。
 */
function isVoiceModeAvailable() {
  return hasAnthropicOAuthToken() && isVoiceModeAllowed();
}
export { hasAnthropicOAuthToken, isVoiceModeAllowed, isVoiceModeAvailable, hasVoiceSettings };
