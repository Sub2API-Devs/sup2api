/**
 * utils/fileDescriptorCredentials.ts
 *
 * 2.1.316 新增。从文件描述符预读凭据（CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR 等），失败不致命。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2dh0g62b.js (1)
 * attribution: placement 1
 */
import { isBareMode } from "./envUtils.js";
import { env } from "./env.js";
import {
  openCredentialPathPolicy,
  getOAuthTokenFromFileDescriptor_2,
  getApiKeyFromFileDescriptor_2,
} from "./authFileDescriptor.js";
import { loadSessionIngressToken } from "./sessionIngressAuth.js";
import { logForDebugging } from "./debug.js";
import { errorMessage } from "./errors.js";

/**
 * 从文件描述符预读凭据（CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR 等），失败不致命。
 */
//@ chunk-2dh0g62b.js:414-652 placement
async function primeFileDescriptorCredentials(e, r = {}) {
  try {
    if (!isBareMode()) {
      if (!env.CLAUDE_CODE_OAUTH_TOKEN && r.bgAuthSnapshot !== "leave") await openCredentialPathPolicy(e);
      (await getOAuthTokenFromFileDescriptor_2(e), await getApiKeyFromFileDescriptor_2(e));
    }
    await loadSessionIngressToken(e);
  } catch (error) {
    logForDebugging(`Descriptor credential prime failed (non-fatal): ${errorMessage(error)}`, {
      level: "error",
    });
  }
}

export { primeFileDescriptorCredentials };
