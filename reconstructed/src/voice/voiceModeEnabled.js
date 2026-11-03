/**
 * voice/voiceModeEnabled.ts
 *
 * 语音模式组织开关 allow_voice_mode（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/voice/voiceModeEnabled.ts
 * pieces: chunk-s61vbvea.js (4)
 * attribution: placement 4
 */
import { isAnthropicAuthEnabled, hasStoredOAuthToken } from "../utils/auth.js";
import { isPolicyAllowed } from "../services/policyLimits/policyEvidence.js";

//@ chunk-s61vbvea.js:460923-460997 placement
/**
 * 设置里是否出现 voice 相关字段。
 */
function hasVoiceSettings(initialSettings) {
  return initialSettings.voice?.enabled !== undefined || initialSettings.voiceEnabled !== undefined;
}
//@ chunk-s61vbvea.js:460997-461062 placement
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
//@ chunk-s61vbvea.js:461062-461107 placement
function isVoiceModeAllowed() {
  return isPolicyAllowed("allow_voice_mode");
}
//@ chunk-s61vbvea.js:461107-461142 placement
/**
 * 语音模式是否可用（登录 + 组织允许）。
 */
function isVoiceModeAvailable() {
  return hasAnthropicOAuthToken() && isVoiceModeAllowed();
}
export { isVoiceModeAvailable, hasVoiceSettings, hasAnthropicOAuthToken, isVoiceModeAllowed };
