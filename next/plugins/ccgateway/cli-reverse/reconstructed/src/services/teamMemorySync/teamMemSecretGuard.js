/**
 * services/teamMemorySync/teamMemSecretGuard.ts
 *
 * 写共享记忆前的密钥检查，命中即拒绝写入。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/teamMemorySync/teamMemSecretGuard.ts
 * pieces: chunk-b3a6nm9h.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { scanSecretsInVariants } from "../memoryStore/memoryKeys.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";

//@ chunk-b3a6nm9h.js:27001-27364 fingerprint (2.1.88 match: checkTeamMemSecrets, 0.518)
/**
 * 写团队/共享记忆前检查密钥，命中则拒绝（reason=secret），提示记忆存储不是放凭证的地方。
 */
function checkTeamMemSecrets(content) {
  let matches = scanSecretsInVariants(content);
  if (matches.length === 0) return null;
  return {
    outcome: "refused",
    reason: "secret",
    message: `Content contains potential secrets (${normalizeCaseForComparison_2(matches.map((match) => match.label)).join(", ")}) and cannot be written to memory. Memory stores are never a place for credentials, and project stores are shared with every collaborator. Remove the sensitive content and try again.`,
  };
}
export { checkTeamMemSecrets };
