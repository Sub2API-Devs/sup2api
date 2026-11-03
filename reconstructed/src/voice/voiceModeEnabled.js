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
function Kti(e) {
  return e.voice?.enabled !== void 0 || e.voiceEnabled !== void 0;
}
//@ chunk-s61vbvea.js:460997-461062 placement
function G4r() {
  try {
    if (!isAnthropicAuthEnabled()) return !1;
    return hasStoredOAuthToken();
  } catch {
    return !1;
  }
}
//@ chunk-s61vbvea.js:461062-461107 placement
function isVoiceModeAllowed() {
  return isPolicyAllowed("allow_voice_mode");
}
//@ chunk-s61vbvea.js:461107-461142 placement
function Vvt() {
  return G4r() && isVoiceModeAllowed();
}

export { Vvt, Kti, G4r, isVoiceModeAllowed };
